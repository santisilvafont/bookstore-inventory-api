from decimal import Decimal

from django.urls import reverse
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.test import APITestCase

from books.models import Book
from books.serializers import BookSerializer

from .factories import ANOTHER_VALID_ISBN, VALID_ISBN, create_book, create_books, make_isbn

LIST_URL = reverse("book-list")
SEARCH_URL = reverse("book-search")
LOW_STOCK_URL = reverse("book-low-stock")


def detail_url(book_id):
    return reverse("book-detail", args=[book_id])


def book_payload(**overrides):
    return {
        "title": "El Quijote",
        "author": "Miguel de Cervantes",
        "isbn": "978-84-376-0494-7",
        "cost_usd": 15.99,
        "stock_quantity": 25,
        "category": "Literatura Clásica",
        "supplier_country": "ES",
    } | overrides


class ErrorFormatMixin:
    def assert_validation_error(self, response, *fields):
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "invalid")
        self.assertEqual(response.data["status"], 400)
        for field in fields:
            self.assertIn(field, response.data["errors"])


class CreateBookTests(ErrorFormatMixin, APITestCase):
    def test_creates_book_and_returns_it(self):
        response = self.client.post(LIST_URL, book_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        body = response.json()
        self.assertEqual(body["isbn"], VALID_ISBN)
        self.assertEqual(body["cost_usd"], 15.99)  # A JSON number, as in the specification.
        self.assertIsNone(body["selling_price_local"])
        self.assertTrue(Book.objects.filter(isbn=VALID_ISBN).exists())

    def test_ignores_read_only_selling_price(self):
        response = self.client.post(LIST_URL, book_payload(selling_price_local=999), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["selling_price_local"])

    def test_requires_mandatory_fields(self):
        response = self.client.post(LIST_URL, {}, format="json")

        self.assert_validation_error(
            response, "title", "author", "isbn", "cost_usd", "category", "supplier_country"
        )

    def test_rejects_business_rule_violations(self):
        cases = {
            "cost_usd": {"cost_usd": 0},
            "stock_quantity": {"stock_quantity": -1},
            "isbn": {"isbn": "978-84-376-0494-0"},
            "supplier_country": {"supplier_country": "ZZ"},
        }
        for field, overrides in cases.items():
            with self.subTest(field=field):
                response = self.client.post(LIST_URL, book_payload(**overrides), format="json")
                self.assert_validation_error(response, field)

    def test_rejects_duplicate_isbn_in_any_notation(self):
        create_book(isbn=ANOTHER_VALID_ISBN)

        for isbn in ["9780306406157", "978-0-306-40615-7", "0-306-40615-2"]:
            with self.subTest(isbn=isbn):
                response = self.client.post(LIST_URL, book_payload(isbn=isbn), format="json")
                self.assert_validation_error(response, "isbn")

    def test_duplicate_isbn_race_returns_validation_error(self):
        serializer = BookSerializer(data=book_payload())
        self.assertTrue(serializer.is_valid(), serializer.errors)
        create_book(isbn=VALID_ISBN)  # Another request wins between validation and save.

        with self.assertRaises(ValidationError) as context:
            serializer.save()
        self.assertEqual(context.exception.detail["isbn"][0].code, "unique")

    def test_rejects_non_json_body(self):
        response = self.client.post(LIST_URL, {"title": "x"})  # multipart form data

        self.assertEqual(response.status_code, status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)


class ListBooksTests(APITestCase):
    def test_returns_paginated_results(self):
        create_books(12)

        response = self.client.get(LIST_URL)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 12)
        self.assertEqual(response.data["total_pages"], 2)
        self.assertEqual(response.data["page"], 1)
        self.assertEqual(len(response.data["results"]), 10)
        self.assertIsNotNone(response.data["next"])

    def test_accepts_custom_page_size_and_page(self):
        create_books(5)

        response = self.client.get(LIST_URL, {"page_size": 2, "page": 3})

        self.assertEqual(response.data["page_size"], 2)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertIsNone(response.data["next"])

    def test_out_of_range_page_returns_404(self):
        response = self.client.get(LIST_URL, {"page": 5})

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class RetrieveBookTests(APITestCase):
    def test_returns_book(self):
        book = create_book()

        response = self.client.get(detail_url(book.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], book.title)

    def test_missing_book_returns_404_in_error_format(self):
        response = self.client.get(detail_url(999))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            response.data,
            {"status": 404, "code": "not_found", "detail": "No existe un libro con este ID."},
        )


class UpdateBookTests(ErrorFormatMixin, APITestCase):
    def setUp(self):
        self.book = create_book(selling_price_local=Decimal("19.03"))

    def test_replaces_book(self):
        response = self.client.put(
            detail_url(self.book.id), book_payload(title="Don Quijote"), format="json"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.book.refresh_from_db()
        self.assertEqual(self.book.title, "Don Quijote")

    def test_keeps_its_own_isbn_without_duplicate_error(self):
        response = self.client.put(detail_url(self.book.id), book_payload(), format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_keeps_selling_price_when_pricing_inputs_do_not_change(self):
        self.client.put(detail_url(self.book.id), book_payload(stock_quantity=3), format="json")

        self.book.refresh_from_db()
        self.assertEqual(self.book.selling_price_local, Decimal("19.03"))

    def test_clears_selling_price_when_pricing_inputs_change(self):
        for overrides in [{"cost_usd": 20}, {"supplier_country": "MX"}]:
            with self.subTest(overrides=overrides):
                Book.objects.filter(pk=self.book.pk).update(selling_price_local=Decimal("19.03"))
                self.client.put(detail_url(self.book.id), book_payload(**overrides), format="json")

                self.book.refresh_from_db()
                self.assertIsNone(self.book.selling_price_local)

    def test_validates_like_create(self):
        response = self.client.put(
            detail_url(self.book.id), book_payload(cost_usd=-5), format="json"
        )

        self.assert_validation_error(response, "cost_usd")

    def test_partial_update_is_not_allowed(self):
        response = self.client.patch(detail_url(self.book.id), {"title": "X"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)


class DeleteBookTests(APITestCase):
    def test_deletes_book(self):
        book = create_book()

        response = self.client.delete(detail_url(book.id))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Book.objects.filter(pk=book.id).exists())

    def test_missing_book_returns_404(self):
        response = self.client.delete(detail_url(999))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class SearchByCategoryTests(ErrorFormatMixin, APITestCase):
    def test_matches_partial_category_ignoring_case(self):
        create_book(category="Literatura Clásica")
        create_book(isbn=ANOTHER_VALID_ISBN, category="Ciencia")

        response = self.client.get(SEARCH_URL, {"category": "clásica"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["category"], "Literatura Clásica")

    def test_requires_category(self):
        for params in [{}, {"category": "  "}]:
            with self.subTest(params=params):
                self.assert_validation_error(self.client.get(SEARCH_URL, params), "category")


class LowStockTests(ErrorFormatMixin, APITestCase):
    def setUp(self):
        create_book(title="Agotado", stock_quantity=0)
        create_book(title="En el límite", isbn=ANOTHER_VALID_ISBN, stock_quantity=10)

    def test_uses_default_threshold_of_ten_inclusive(self):
        create_book(title="Suficiente", isbn=make_isbn(1), stock_quantity=11)

        response = self.client.get(LOW_STOCK_URL)

        titles = [book["title"] for book in response.data["results"]]
        self.assertEqual(titles, ["Agotado", "En el límite"])

    def test_accepts_custom_threshold(self):
        response = self.client.get(LOW_STOCK_URL, {"threshold": 5})

        self.assertEqual(response.data["count"], 1)

    def test_rejects_invalid_threshold(self):
        for threshold in ["-1", "abc"]:
            with self.subTest(threshold=threshold):
                response = self.client.get(LOW_STOCK_URL, {"threshold": threshold})
                self.assert_validation_error(response, "threshold")
