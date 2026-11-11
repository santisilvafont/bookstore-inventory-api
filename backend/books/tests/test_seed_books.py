import json
import tempfile
from io import StringIO
from pathlib import Path
from unittest.mock import patch

from django.core.management import CommandError, call_command
from django.test import TestCase

from books.management.commands import seed_books
from books.models import Book
from books.serializers import DEFAULT_LOW_STOCK_THRESHOLD

from .factories import VALID_ISBN, create_book

SAMPLE_COUNT = len(json.loads(seed_books.SAMPLE_BOOKS_PATH.read_text(encoding="utf-8")))


def run_seed(*args):
    call_command("seed_books", *args, stdout=StringIO())


class SeedBooksTests(TestCase):
    def test_loads_every_sample_book(self):
        run_seed()

        self.assertEqual(Book.objects.count(), SAMPLE_COUNT)

    def test_sample_data_covers_the_low_stock_filter(self):
        run_seed()

        self.assertTrue(Book.objects.low_stock(DEFAULT_LOW_STOCK_THRESHOLD).exists())

    def test_is_idempotent(self):
        run_seed()
        run_seed()

        self.assertEqual(Book.objects.count(), SAMPLE_COUNT)

    def test_skips_books_that_already_exist(self):
        create_book(isbn=VALID_ISBN, title="Mi edición")

        run_seed()

        self.assertEqual(Book.objects.count(), SAMPLE_COUNT)
        self.assertEqual(Book.objects.get(isbn=VALID_ISBN).title, "Mi edición")

    def test_if_empty_does_nothing_when_inventory_has_books(self):
        create_book()

        run_seed("--if-empty")

        self.assertEqual(Book.objects.count(), 1)

    def test_rejects_invalid_sample_data_without_partial_load(self):
        valid_book = {
            "title": "El Quijote",
            "author": "Miguel de Cervantes",
            "isbn": VALID_ISBN,
            "cost_usd": 15.99,
            "category": "Literatura clásica",
            "supplier_country": "ES",
        }
        books = [valid_book, {**valid_book, "title": "ISBN roto", "isbn": "123"}]

        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "books.json"
            path.write_text(json.dumps(books), encoding="utf-8")
            with (
                patch.object(seed_books, "SAMPLE_BOOKS_PATH", path),
                self.assertRaises(CommandError),
            ):
                run_seed()

        self.assertFalse(Book.objects.exists())
