from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.test import TestCase

from books.models import Book

from .factories import ANOTHER_VALID_ISBN, build_book, create_book


class BookValidationTests(TestCase):
    def assert_invalid_field(self, field, **overrides):
        with self.assertRaises(ValidationError) as context:
            build_book(**overrides).full_clean()
        self.assertIn(field, context.exception.message_dict)

    def test_valid_book_passes_validation(self):
        build_book().full_clean()

    def test_selling_price_is_optional(self):
        book = build_book(selling_price_local=None)
        book.full_clean()

    def test_cost_must_be_greater_than_zero(self):
        for cost in [Decimal("0"), Decimal("-1.00")]:
            with self.subTest(cost=cost):
                self.assert_invalid_field("cost_usd", cost_usd=cost)

    def test_stock_cannot_be_negative(self):
        self.assert_invalid_field("stock_quantity", stock_quantity=-1)

    def test_isbn_must_be_valid(self):
        self.assert_invalid_field("isbn", isbn="1234567890123")

    def test_isbn_must_be_unique(self):
        create_book()
        self.assert_invalid_field("isbn")

    def test_supplier_country_must_be_supported(self):
        self.assert_invalid_field("supplier_country", supplier_country="ZZ")


class BookDatabaseConstraintTests(TestCase):
    """The database enforces the core rules even when model validation is bypassed."""

    def assert_rejected_by_database(self, **overrides):
        with self.assertRaises(IntegrityError), transaction.atomic():
            create_book(**overrides)

    def test_rejects_non_positive_cost(self):
        self.assert_rejected_by_database(cost_usd=Decimal("0"))

    def test_rejects_negative_stock(self):
        self.assert_rejected_by_database(stock_quantity=-1)

    def test_rejects_non_canonical_isbn(self):
        # Both fit in 13 characters, so only the check constraint can reject them.
        for isbn in ["0306406152", "0-306-40615-2"]:
            with self.subTest(isbn=isbn):
                self.assert_rejected_by_database(isbn=isbn)

    def test_rejects_duplicate_isbn(self):
        create_book()
        self.assert_rejected_by_database()


class BookSellingPriceInvalidationTests(TestCase):
    """The stored price belongs to a cost and a currency; it must not outlive either."""

    def setUp(self):
        create_book(selling_price_local=Decimal("19.03"))
        self.book = Book.objects.get()

    def assert_price(self, expected):
        self.book.refresh_from_db()
        self.assertEqual(self.book.selling_price_local, expected)

    def test_currency_follows_the_supplier_country(self):
        self.assertEqual(self.book.currency, "EUR")
        self.book.supplier_country = "MX"
        self.assertEqual(self.book.currency, "MXN")

    def test_clears_the_price_when_cost_or_country_change(self):
        for field, value in [("cost_usd", Decimal("20.00")), ("supplier_country", "MX")]:
            with self.subTest(field=field):
                Book.objects.update(selling_price_local=Decimal("19.03"))
                book = Book.objects.get()
                setattr(book, field, value)
                book.save()

                self.book = book
                self.assert_price(None)

    def test_clears_the_price_on_partial_saves_too(self):
        self.book.supplier_country = "MX"
        self.book.save(update_fields=["supplier_country"])

        self.assert_price(None)

    def test_keeps_the_price_when_other_fields_change(self):
        self.book.stock_quantity = 3
        self.book.cost_usd = Decimal("15.990")  # Same value, different representation.
        self.book.save()

        self.assert_price(Decimal("19.03"))


class BookOrderingTests(TestCase):
    def test_newest_books_come_first(self):
        older = create_book()
        newer = create_book(isbn=ANOTHER_VALID_ISBN)
        self.assertEqual(list(Book.objects.all()), [newer, older])
