from django import forms
from django.contrib import admin

from .isbn import normalize_isbn
from .models import Book


class BookAdminForm(forms.ModelForm):
    # Wider than the model field so hyphenated input passes before normalization.
    isbn = forms.CharField(label="ISBN", max_length=20)

    class Meta:
        model = Book
        fields = [
            "title",
            "author",
            "isbn",
            "cost_usd",
            "stock_quantity",
            "category",
            "supplier_country",
        ]

    def clean_isbn(self):
        return normalize_isbn(self.cleaned_data["isbn"])


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    form = BookAdminForm
    list_display = [
        "title",
        "author",
        "isbn",
        "category",
        "supplier_country",
        "stock_quantity",
        "cost_usd",
        "selling_price_local",
    ]
    list_filter = ["category", "supplier_country"]
    search_fields = ["title", "author", "isbn"]
    readonly_fields = ["selling_price_local", "created_at", "updated_at"]
