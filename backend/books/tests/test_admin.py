from django.test import TestCase

from books.admin import BookAdminForm

from .factories import ANOTHER_VALID_ISBN, VALID_ISBN, create_book


class BookAdminFormTests(TestCase):
    def form_data(self, **overrides):
        return {
            "title": "El Quijote",
            "author": "Miguel de Cervantes",
            "isbn": "978-84-376-0494-7",
            "cost_usd": "15.99",
            "stock_quantity": 25,
            "category": "Literatura Clásica",
            "supplier_country": "ES",
        } | overrides

    def test_stores_isbn_normalized(self):
        form = BookAdminForm(data=self.form_data())
        self.assertTrue(form.is_valid(), form.errors)
        self.assertEqual(form.save().isbn, VALID_ISBN)

    def test_stores_isbn10_as_isbn13(self):
        form = BookAdminForm(data=self.form_data(isbn="0-306-40615-2"))
        self.assertTrue(form.is_valid(), form.errors)
        self.assertEqual(form.save().isbn, ANOTHER_VALID_ISBN)

    def test_rejects_invalid_isbn(self):
        form = BookAdminForm(data=self.form_data(isbn="978-84-376-0494-0"))
        self.assertFalse(form.is_valid())
        self.assertIn("isbn", form.errors)

    def test_detects_duplicate_written_with_hyphens(self):
        create_book(isbn=VALID_ISBN)
        form = BookAdminForm(data=self.form_data())
        self.assertFalse(form.is_valid())
        self.assertIn("isbn", form.errors)

    def test_detects_duplicate_written_as_isbn10(self):
        create_book(isbn=ANOTHER_VALID_ISBN)
        form = BookAdminForm(data=self.form_data(isbn="0306406152"))
        self.assertFalse(form.is_valid())
        self.assertIn("isbn", form.errors)
