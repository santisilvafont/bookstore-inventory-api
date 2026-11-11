import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from books.models import Book
from books.serializers import BookSerializer

SAMPLE_BOOKS_PATH = Path(__file__).resolve().parents[2] / "data" / "sample_books.json"


class Command(BaseCommand):
    help = "Load the sample book catalog. Books whose ISBN already exists are skipped."

    def add_arguments(self, parser):
        parser.add_argument(
            "--if-empty",
            action="store_true",
            help="Do nothing if the inventory already contains books.",
        )

    @transaction.atomic
    def handle(self, *args, if_empty=False, **options):
        if if_empty and Book.objects.exists():
            self.stdout.write("The inventory already has books; sample data not loaded.")
            return

        entries = json.loads(SAMPLE_BOOKS_PATH.read_text(encoding="utf-8"))
        created = 0
        for entry in entries:
            # Same validation as the API, so sample data can never break the business rules.
            serializer = BookSerializer(data=entry)
            if serializer.is_valid():
                serializer.save()
                created += 1
            elif not _only_duplicate_isbn(serializer.errors):
                title = entry.get("title", "<untitled>")
                raise CommandError(f"Invalid sample book {title!r}: {serializer.errors}")

        skipped = len(entries) - created
        self.stdout.write(
            self.style.SUCCESS(f"Created {created} books ({skipped} already existed).")
        )


def _only_duplicate_isbn(errors) -> bool:
    return list(errors) == ["isbn"] and all(error.code == "unique" for error in errors["isbn"])
