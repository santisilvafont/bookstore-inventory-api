from decimal import Decimal
from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from books import exchange_rates
from books.models import Book

from .factories import create_book


def calculate_price_url(book_id):
    return reverse("book-calculate-price", args=[book_id])


@patch("books.pricing.exchange_rates.fetch_live_rates")
class CalculatePriceTests(APITestCase):
    def setUp(self):
        self.book = create_book(cost_usd=Decimal("15.99"), supplier_country="ES")

    def test_reproduces_the_specification_example(self, mock_rates):
        mock_rates.return_value = {"EUR": 0.85}

        response = self.client.post(calculate_price_url(self.book.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.json()
        self.assertEqual(body["book_id"], self.book.id)
        self.assertEqual(body["cost_usd"], 15.99)
        self.assertEqual(body["exchange_rate"], 0.85)
        self.assertEqual(body["cost_local"], 13.59)
        self.assertEqual(body["margin_percentage"], 40)
        self.assertEqual(body["selling_price_local"], 19.03)
        self.assertEqual(body["currency"], "EUR")
        self.assertEqual(body["rate_source"], "live")
        self.assertIn("calculation_timestamp", body)

    def test_stores_the_selling_price(self, mock_rates):
        mock_rates.return_value = {"EUR": 0.85}

        self.client.post(calculate_price_url(self.book.id))

        self.book.refresh_from_db()
        self.assertEqual(self.book.selling_price_local, Decimal("19.03"))

    def test_uses_the_currency_of_the_supplier_country(self, mock_rates):
        mock_rates.return_value = {"EUR": 0.85, "MXN": 18.5}
        Book.objects.filter(pk=self.book.pk).update(supplier_country="MX")

        body = self.client.post(calculate_price_url(self.book.id)).json()

        self.assertEqual(body["currency"], "MXN")
        self.assertEqual(body["cost_local"], 295.82)  # 15.99 x 18.5 = 295.815, rounded half up
        self.assertEqual(body["selling_price_local"], 414.15)  # 295.82 x 1.40 = 414.148

    def test_uses_default_rate_when_api_fails(self, mock_rates):
        mock_rates.return_value = None

        response = self.client.post(calculate_price_url(self.book.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["rate_source"], "default")
        self.assertEqual(response.data["exchange_rate"], exchange_rates.DEFAULT_RATES["EUR"])

    def test_returns_503_when_no_rate_is_available(self, mock_rates):
        mock_rates.return_value = None

        with patch.dict(exchange_rates.DEFAULT_RATES, clear=True):
            response = self.client.post(calculate_price_url(self.book.id))

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["code"], "exchange_rate_unavailable")
        self.book.refresh_from_db()
        self.assertIsNone(self.book.selling_price_local)

    def test_missing_book_returns_404(self, mock_rates):
        response = self.client.post(calculate_price_url(999))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        mock_rates.assert_not_called()

    def test_book_deleted_while_fetching_rates_returns_404(self, mock_rates):
        def delete_book_then_return_rates():
            Book.objects.filter(pk=self.book.pk).delete()
            return {"EUR": 0.85}

        mock_rates.side_effect = delete_book_then_return_rates

        response = self.client.post(calculate_price_url(self.book.id))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_uses_cost_updated_while_fetching_rates(self, mock_rates):
        def update_cost_then_return_rates():
            Book.objects.filter(pk=self.book.pk).update(cost_usd=Decimal("10.00"))
            return {"EUR": 0.85}

        mock_rates.side_effect = update_cost_then_return_rates

        body = self.client.post(calculate_price_url(self.book.id)).json()

        self.assertEqual(body["cost_usd"], 10.0)
        self.assertEqual(body["selling_price_local"], 11.9)  # 8.50 x 1.40
