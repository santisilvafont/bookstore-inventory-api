"""Suggested selling price: cost in USD, converted to the local currency, plus the profit margin."""

from dataclasses import dataclass
from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.utils import timezone

from . import exchange_rates
from .countries import SUPPORTED_COUNTRIES
from .models import Book

MARGIN_PERCENTAGE = 40
CENTS = Decimal("0.01")


@dataclass(frozen=True)
class PriceCalculation:
    book_id: int
    cost_usd: Decimal
    exchange_rate: Decimal
    cost_local: Decimal
    margin_percentage: int
    selling_price_local: Decimal
    currency: str
    rate_source: str
    calculation_timestamp: datetime


def calculate_selling_price(book_id: int) -> PriceCalculation:
    """Compute and store the selling price of a book.

    Raises Book.DoesNotExist if the book is deleted meanwhile, and
    exchange_rates.ExchangeRateUnavailable if no rate exists for its currency.
    """
    # The network call happens before locking the row, so a slow API never holds the lock.
    live_rates = exchange_rates.fetch_live_rates()

    with transaction.atomic():
        # Re-read under lock: cost or country may have changed while the rates were fetched.
        book = Book.objects.select_for_update().get(pk=book_id)
        currency = SUPPORTED_COUNTRIES[book.supplier_country].currency
        rate = exchange_rates.resolve_rate(currency, live_rates)

        # Rounding cost_local first keeps the breakdown consistent: cost_local x 1.40 = price.
        cost_local = _round_money(book.cost_usd * rate.value)
        selling_price = _round_money(cost_local * (1 + Decimal(MARGIN_PERCENTAGE) / 100))

        book.selling_price_local = selling_price
        book.save(update_fields=["selling_price_local", "updated_at"])

    return PriceCalculation(
        book_id=book.id,
        cost_usd=book.cost_usd,
        exchange_rate=rate.value,
        cost_local=cost_local,
        margin_percentage=MARGIN_PERCENTAGE,
        selling_price_local=selling_price,
        currency=currency,
        rate_source=rate.source,
        calculation_timestamp=timezone.now(),
    )


def _round_money(amount: Decimal) -> Decimal:
    return amount.quantize(CENTS, rounding=ROUND_HALF_UP)
