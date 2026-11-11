from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from .countries import SUPPORTED_COUNTRIES, country_choices
from .isbn import validate_isbn


class BookQuerySet(models.QuerySet):
    def in_category(self, category):
        return self.filter(category__icontains=category)

    def low_stock(self, threshold):
        """Books with stock at or below the threshold, most urgent first."""
        return self.filter(stock_quantity__lte=threshold).order_by("stock_quantity", "id")


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
    # Wide enough for high-denomination currencies (COP, VES...) applied to expensive books.
    selling_price_local = models.DecimalField(
        max_digits=20, decimal_places=2, null=True, blank=True
    )
    stock_quantity = models.PositiveIntegerField(default=0)
    category = models.CharField(max_length=100)
    supplier_country = models.CharField(max_length=2, choices=country_choices)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = BookQuerySet.as_manager()

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

    def save(self, *args, **kwargs):
        # A selling price was computed from the cost and the currency it was stored with; if
        # either changes, the price no longer applies. Enforced here so every write path
        # (API, admin, shell) follows the rule.
        stored = getattr(self, "_stored_pricing_inputs", None)
        if stored is not None and stored != self._pricing_inputs():
            self.selling_price_local = None
            update_fields = kwargs.get("update_fields")
            if update_fields is not None:
                kwargs["update_fields"] = {*update_fields, "selling_price_local"}
        super().save(*args, **kwargs)
        self._stored_pricing_inputs = self._pricing_inputs()

    @classmethod
    def from_db(cls, db, field_names, values):
        book = super().from_db(db, field_names, values)
        book._stored_pricing_inputs = book._pricing_inputs()
        return book

    @property
    def currency(self) -> str:
        """Local currency the book is priced in, derived from its supplier country."""
        return SUPPORTED_COUNTRIES[self.supplier_country].currency

    def _pricing_inputs(self):
        return (self.cost_usd, self.supplier_country)
