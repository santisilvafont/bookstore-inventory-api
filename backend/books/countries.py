"""Supplier countries the inventory accepts and the local currency used to price their books."""

from typing import NamedTuple


class Country(NamedTuple):
    name: str
    currency: str


SUPPORTED_COUNTRIES = {
    "AR": Country("Argentina", "ARS"),
    "BR": Country("Brasil", "BRL"),
    "CA": Country("Canadá", "CAD"),
    "CL": Country("Chile", "CLP"),
    "CN": Country("China", "CNY"),
    "CO": Country("Colombia", "COP"),
    "DE": Country("Alemania", "EUR"),
    "ES": Country("España", "EUR"),
    "FR": Country("Francia", "EUR"),
    "GB": Country("Reino Unido", "GBP"),
    "IT": Country("Italia", "EUR"),
    "JP": Country("Japón", "JPY"),
    "MX": Country("México", "MXN"),
    "PE": Country("Perú", "PEN"),
    "PT": Country("Portugal", "EUR"),
    "US": Country("Estados Unidos", "USD"),
    "UY": Country("Uruguay", "UYU"),
    "VE": Country("Venezuela", "VES"),
}


def country_choices() -> list[tuple[str, str]]:
    return sorted(
        ((code, country.name) for code, country in SUPPORTED_COUNTRIES.items()),
        key=lambda choice: choice[1],
    )
