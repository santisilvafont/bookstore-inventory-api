from decimal import Decimal
from unittest.mock import Mock, patch

import requests
from django.core.cache import cache
from django.test import SimpleTestCase

from books import exchange_rates
from books.countries import SUPPORTED_COUNTRIES
from books.exchange_rates import ExchangeRateUnavailable, fetch_live_rates, resolve_rate


def api_response(payload, status_code=200):
    response = Mock(status_code=status_code)
    response.json.return_value = payload
    response.raise_for_status.side_effect = (
        requests.HTTPError(f"{status_code} error") if status_code >= 400 else None
    )
    return response


@patch("books.exchange_rates.requests.get")
class FetchLiveRatesTests(SimpleTestCase):
    def setUp(self):
        cache.clear()

    def test_returns_rates_from_api(self, mock_get):
        mock_get.return_value = api_response({"base": "USD", "rates": {"EUR": 0.85}})

        self.assertEqual(fetch_live_rates(), {"EUR": 0.85})
        self.assertIn("timeout", mock_get.call_args.kwargs)

    def test_caches_rates_between_calls(self, mock_get):
        mock_get.return_value = api_response({"rates": {"EUR": 0.85}})

        fetch_live_rates()
        fetch_live_rates()

        mock_get.assert_called_once()

    def test_returns_none_when_api_fails(self, mock_get):
        failures = {
            "connection error": requests.ConnectionError("down"),
            "timeout": requests.Timeout("slow"),
            "http error": api_response({}, status_code=500),
            "invalid json": api_response(None),
            "missing rates": api_response({"base": "USD"}),
            "rates not an object": api_response({"rates": [1, 2]}),
        }
        failures["invalid json"].json.side_effect = ValueError("not json")

        for name, outcome in failures.items():
            with self.subTest(name), self.assertLogs("books.exchange_rates", level="WARNING"):
                cache.clear()
                mock_get.side_effect = outcome if isinstance(outcome, Exception) else None
                mock_get.return_value = outcome
                self.assertIsNone(fetch_live_rates())

    def test_skips_the_api_for_a_while_after_a_failure(self, mock_get):
        mock_get.side_effect = requests.ConnectionError("down")
        with self.assertLogs("books.exchange_rates", level="WARNING"):
            fetch_live_rates()

        self.assertIsNone(fetch_live_rates())
        mock_get.assert_called_once()

    def test_retries_the_api_once_the_failure_expires(self, mock_get):
        mock_get.side_effect = requests.ConnectionError("down")
        with self.assertLogs("books.exchange_rates", level="WARNING"):
            fetch_live_rates()

        cache.delete(exchange_rates.UNAVAILABLE_CACHE_KEY)  # Simulates the retry delay expiring.
        mock_get.side_effect = None
        mock_get.return_value = api_response({"rates": {"EUR": 0.85}})
        self.assertEqual(fetch_live_rates(), {"EUR": 0.85})


class ResolveRateTests(SimpleTestCase):
    def test_uses_live_rate_when_available(self):
        rate = resolve_rate("EUR", {"EUR": 0.85})

        self.assertEqual(rate.value, Decimal("0.85"))
        self.assertEqual(rate.source, "live")

    def test_rounds_live_rate_to_six_decimals(self):
        rate = resolve_rate("MXN", {"MXN": 18.6123456789})

        self.assertEqual(rate.value, Decimal("18.612346"))

    def test_falls_back_to_default_when_api_failed(self):
        rate = resolve_rate("EUR", None)

        self.assertEqual(rate.value, exchange_rates.DEFAULT_RATES["EUR"])
        self.assertEqual(rate.source, "default")

    def test_falls_back_to_default_when_live_rate_is_unusable(self):
        for value in [None, 0, -1, "abc", "NaN", "Infinity", True, {"x": 1}]:
            with (
                self.subTest(value=value),
                self.assertLogs("books.exchange_rates", level="WARNING"),
            ):
                self.assertEqual(resolve_rate("EUR", {"EUR": value}).source, "default")

    def test_raises_when_no_rate_is_available(self):
        with (
            patch.dict(exchange_rates.DEFAULT_RATES, clear=True),
            self.assertRaises(ExchangeRateUnavailable),
        ):
            resolve_rate("EUR", None)

    def test_every_supported_currency_has_a_default_rate(self):
        currencies = {country.currency for country in SUPPORTED_COUNTRIES.values()}

        self.assertLessEqual(currencies, exchange_rates.DEFAULT_RATES.keys())
