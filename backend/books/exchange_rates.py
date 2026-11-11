"""USD exchange rates from the external API, cached, with per-currency defaults as a fallback."""

import logging
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Literal

import requests
from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)

RATES_CACHE_KEY = "exchange_rates:usd"
UNAVAILABLE_CACHE_KEY = "exchange_rates:usd:unavailable"
# After a failure, skip the API for a while instead of making every request wait for the timeout.
RETRY_AFTER_FAILURE_SECONDS = 60
RATE_PRECISION = Decimal("0.000001")

# Used when the API is unreachable or returns unusable data. Values published by the API
# for 2026-11-11 (its "date" field).
DEFAULT_RATES = {
    "ARS": Decimal("1545.40"),
    "BRL": Decimal("5.55"),
    "CAD": Decimal("1.42"),
    "CLP": Decimal("968.85"),
    "CNY": Decimal("6.69"),
    "COP": Decimal("3276.88"),
    "EUR": Decimal("0.894"),
    "GBP": Decimal("0.748"),
    "JPY": Decimal("158.56"),
    "MXN": Decimal("18.61"),
    "PEN": Decimal("3.42"),
    "USD": Decimal("1"),
    "UYU": Decimal("40.43"),
    "VES": Decimal("901.62"),
}


class ExchangeRateUnavailable(Exception):
    def __init__(self, currency: str):
        super().__init__(f"No exchange rate available for {currency}")
        self.currency = currency


@dataclass(frozen=True)
class ExchangeRate:
    currency: str
    value: Decimal
    source: Literal["live", "default"]


def fetch_live_rates() -> dict | None:
    """Return the latest USD rates (cached), or None if the API cannot provide them."""
    rates = cache.get(RATES_CACHE_KEY)
    if rates is not None:
        return rates
    if cache.get(UNAVAILABLE_CACHE_KEY):
        return None

    try:
        response = requests.get(
            settings.EXCHANGE_RATE_API_URL, timeout=settings.EXCHANGE_RATE_API_TIMEOUT
        )
        response.raise_for_status()
        rates = response.json()["rates"]
        if not isinstance(rates, dict):
            raise TypeError("'rates' is not an object")
    except (requests.RequestException, ValueError, KeyError, TypeError) as error:
        logger.warning("Exchange rate API unavailable, falling back to default rates: %s", error)
        cache.set(UNAVAILABLE_CACHE_KEY, True, RETRY_AFTER_FAILURE_SECONDS)
        return None

    cache.set(RATES_CACHE_KEY, rates, settings.EXCHANGE_RATE_CACHE_SECONDS)
    return rates


def resolve_rate(currency: str, live_rates: dict | None) -> ExchangeRate:
    """Pick the live rate for `currency` if it is usable, otherwise its default rate."""
    live_value = _parse_rate((live_rates or {}).get(currency))
    if live_value is not None:
        return ExchangeRate(currency, live_value, "live")

    if live_rates is not None:
        logger.warning("Exchange rate API returned no usable rate for %s", currency)
    if currency in DEFAULT_RATES:
        return ExchangeRate(currency, DEFAULT_RATES[currency], "default")
    raise ExchangeRateUnavailable(currency)


def _parse_rate(value) -> Decimal | None:
    if isinstance(value, bool) or not isinstance(value, int | float | str):
        return None
    try:
        rate = Decimal(str(value))
        if not rate.is_finite() or rate <= 0:
            return None
        # A fixed precision means the rate shown in the breakdown is exactly the one applied.
        return rate.quantize(RATE_PRECISION)
    except InvalidOperation:
        return None
