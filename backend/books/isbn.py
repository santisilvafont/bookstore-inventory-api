"""ISBN validation and normalization, kept free of models so any input layer can reuse it."""

import re

from django.core.exceptions import ValidationError

# Includes the Unicode hyphens and dashes that often come along when copying from a web page or PDF.
ISBN_SEPARATORS = re.compile(r"[\s‐-―−-]")
ISBN_10_FORMAT = re.compile(r"[0-9]{9}[0-9X]")
ISBN_13_FORMAT = re.compile(r"[0-9]{13}")
ISBN_13_PREFIXES = ("978", "979")


def normalize_isbn(value: str) -> str:
    """Return the canonical ISBN-13 for any valid ISBN-10 or ISBN-13, with or without separators.

    Storing a single form lets the uniqueness rule catch the same book entered as
    '0-306-40615-2' and as '978-0-306-40615-7'.
    """
    isbn = ISBN_SEPARATORS.sub("", value).upper()
    validate_isbn(isbn)
    return _isbn10_to_isbn13(isbn) if len(isbn) == 10 else isbn


def validate_isbn(value: str) -> None:
    """Validate an ISBN-10 or ISBN-13 without separators, including its check digit."""
    if ISBN_10_FORMAT.fullmatch(value):
        is_valid = _isbn10_check_digit(value[:9]) == value[9]
    elif ISBN_13_FORMAT.fullmatch(value):
        if not value.startswith(ISBN_13_PREFIXES):
            raise ValidationError(
                "Un ISBN de 13 dígitos debe empezar por 978 o 979.", code="invalid_isbn_prefix"
            )
        is_valid = _isbn13_check_digit(value[:12]) == value[12]
    else:
        raise ValidationError("El ISBN debe tener 10 o 13 dígitos.", code="invalid_isbn_format")

    if not is_valid:
        raise ValidationError(
            "El dígito de control del ISBN no es válido.", code="invalid_isbn_checksum"
        )


def _isbn10_to_isbn13(isbn10: str) -> str:
    body = "978" + isbn10[:9]
    return body + _isbn13_check_digit(body)


def _isbn10_check_digit(first_nine: str) -> str:
    weights = range(10, 1, -1)
    total = sum(weight * int(char) for weight, char in zip(weights, first_nine, strict=True))
    check = (11 - total % 11) % 11
    return "X" if check == 10 else str(check)


def _isbn13_check_digit(first_twelve: str) -> str:
    total = sum(int(char) * (3 if index % 2 else 1) for index, char in enumerate(first_twelve))
    return str((10 - total % 10) % 10)
