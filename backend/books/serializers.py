from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from psycopg.errors import UniqueViolation
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from .isbn import normalize_isbn
from .models import Book

DUPLICATE_ISBN_MESSAGE = Book._meta.get_field("isbn").error_messages["unique"]
DEFAULT_LOW_STOCK_THRESHOLD = 10
# Long enough for an ISBN-13 written with separators; anything longer is rejected before parsing.
ISBN_INPUT_MAX_LENGTH = 32


class ISBNField(serializers.CharField):
    """Accepts any valid ISBN-10/13 notation and returns its canonical ISBN-13."""

    def to_internal_value(self, data):
        value = super().to_internal_value(data)
        try:
            return normalize_isbn(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError(error.messages, code=error.code) from error


class BookSerializer(serializers.ModelSerializer):
    isbn = ISBNField(
        max_length=ISBN_INPUT_MAX_LENGTH,
        validators=[UniqueValidator(queryset=Book.objects.all(), message=DUPLICATE_ISBN_MESSAGE)],
    )

    class Meta:
        model = Book
        fields = [
            "id",
            "title",
            "author",
            "isbn",
            "cost_usd",
            "selling_price_local",
            "stock_quantity",
            "category",
            "supplier_country",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["selling_price_local", "created_at", "updated_at"]
        extra_kwargs = {
            # DRF turns the model's MinValueValidator into its own generic message.
            "cost_usd": {"error_messages": {"min_value": "El costo debe ser mayor a 0."}},
            "stock_quantity": {
                "error_messages": {"min_value": "El stock no puede ser negativo."},
            },
        }

    def update(self, instance, validated_data):
        # The stored selling price came from the old cost and currency, so it no longer applies.
        pricing_changed = any(
            field in validated_data and validated_data[field] != getattr(instance, field)
            for field in ("cost_usd", "supplier_country")
        )
        if pricing_changed:
            validated_data["selling_price_local"] = None
        return super().update(instance, validated_data)

    def save(self, **kwargs):
        # UniqueValidator can lose a race against a concurrent request (e.g. a double submit);
        # the database constraint still catches it, and it should surface as a 400, not a 500.
        try:
            with transaction.atomic():
                return super().save(**kwargs)
        except IntegrityError as error:
            # The ISBN is the only unique column a client can set.
            if not isinstance(error.__cause__, UniqueViolation):
                raise
            raise serializers.ValidationError(
                {"isbn": [DUPLICATE_ISBN_MESSAGE]}, code="unique"
            ) from error


class PriceCalculationSerializer(serializers.Serializer):
    book_id = serializers.IntegerField(read_only=True)
    cost_usd = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    exchange_rate = serializers.DecimalField(max_digits=18, decimal_places=6, read_only=True)
    cost_local = serializers.DecimalField(max_digits=20, decimal_places=2, read_only=True)
    margin_percentage = serializers.IntegerField(read_only=True)
    selling_price_local = serializers.DecimalField(max_digits=20, decimal_places=2, read_only=True)
    currency = serializers.CharField(read_only=True)
    rate_source = serializers.CharField(read_only=True)
    calculation_timestamp = serializers.DateTimeField(read_only=True)


class CategorySearchSerializer(serializers.Serializer):
    category = serializers.CharField(max_length=100)


class LowStockQuerySerializer(serializers.Serializer):
    threshold = serializers.IntegerField(min_value=0, default=DEFAULT_LOW_STOCK_THRESHOLD)
