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


def make_isbn(number: int) -> str:
    """Build a distinct valid ISBN-13 from a sequence number."""
    body = f"978{number:09d}"
    total = sum(int(digit) * (3 if index % 2 else 1) for index, digit in enumerate(body))
    return f"{body}{(10 - total % 10) % 10}"


def create_books(count: int) -> list[Book]:
    return [create_book(title=f"Libro {n}", isbn=make_isbn(n)) for n in range(count)]
