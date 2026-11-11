from decimal import Decimal

from books.models import Book

VALID_ISBN = "9788437604947"
ANOTHER_VALID_ISBN = "9780306406157"


def build_book(**overrides) -> Book:
    fields = {
        "title": "El Quijote",
        "author": "Miguel de Cervantes",
        "isbn": VALID_ISBN,
        "cost_usd": Decimal("15.99"),
        "stock_quantity": 25,
        "category": "Literatura Clásica",
        "supplier_country": "ES",
    }
    return Book(**(fields | overrides))


def create_book(**overrides) -> Book:
    book = build_book(**overrides)
    book.save()
    return book
