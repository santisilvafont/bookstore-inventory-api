from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from .countries import country_choices
from .isbn import validate_isbn


class Book(models.Model):
    title = models.CharField(max_length=255)
    author = models.CharField(max_length=255)
    isbn = models.CharField(
        max_length=13,
        unique=True,
        validators=[validate_isbn],
        error_messages={"unique": "Ya existe un libro con este ISBN."},
    )
    cost_usd = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"), message="El costo debe ser mayor a 0.")],
    )
    selling_price_local = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True
    )
    stock_quantity = models.PositiveIntegerField(default=0)
    category = models.CharField(max_length=100)
    supplier_country = models.CharField(max_length=2, choices=country_choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        verbose_name = "libro"
        verbose_name_plural = "libros"
        constraints = [
            models.CheckConstraint(
                condition=Q(cost_usd__gt=0),
                name="book_cost_usd_positive",
            ),
            models.CheckConstraint(
                condition=Q(isbn__regex=r"^97[89][0-9]{10}$"),
                name="book_isbn_normalized",
            ),
        ]

    def __str__(self):
        return f"{self.title} ({self.isbn})"
