from django.core.exceptions import ValidationError
from django.test import SimpleTestCase

from books.isbn import normalize_isbn, validate_isbn


class NormalizeIsbnTests(SimpleTestCase):
    def test_removes_hyphens_and_spaces(self):
        self.assertEqual(normalize_isbn("978-84-376 0494-7"), "9788437604947")

    def test_removes_unicode_dashes(self):
        self.assertEqual(normalize_isbn("978‑84‑376–0494—7"), "9788437604947")

    def test_converts_isbn10_to_isbn13(self):
        self.assertEqual(normalize_isbn("0-306-40615-2"), "9780306406157")

    def test_converts_isbn10_with_lowercase_x_check_digit(self):
        self.assertEqual(normalize_isbn("0-8044-2957-x"), "9780804429573")

    def test_rejects_invalid_isbn(self):
        with self.assertRaises(ValidationError):
            normalize_isbn("978-84-376-0494-0")


class ValidateIsbnTests(SimpleTestCase):
    def assert_rejected(self, value, code):
        with self.assertRaises(ValidationError) as context:
            validate_isbn(value)
        self.assertEqual(context.exception.code, code)

    def test_accepts_valid_isbn13(self):
        validate_isbn("9788437604947")

    def test_accepts_valid_isbn10(self):
        validate_isbn("0306406152")

    def test_accepts_isbn10_with_x_check_digit(self):
        validate_isbn("080442957X")

    def test_rejects_wrong_length(self):
        for value in ["", "123456789", "12345678901", "978843760494"]:
            with self.subTest(value=value):
                self.assert_rejected(value, "invalid_isbn_format")

    def test_rejects_non_digit_characters(self):
        for value in ["97884376049A7", "X306406152", "９７８８４３７６０４９４７"]:
            with self.subTest(value=value):
                self.assert_rejected(value, "invalid_isbn_format")

    def test_rejects_isbn13_without_book_prefix(self):
        # Valid EAN-13 checksum, but not an ISBN.
        self.assert_rejected("4006381333931", "invalid_isbn_prefix")

    def test_rejects_wrong_isbn13_check_digit(self):
        self.assert_rejected("9788437604940", "invalid_isbn_checksum")

    def test_rejects_wrong_isbn10_check_digit(self):
        self.assert_rejected("0306406153", "invalid_isbn_checksum")
