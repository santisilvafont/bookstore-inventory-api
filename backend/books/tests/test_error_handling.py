from unittest.mock import patch

from django.urls import reverse
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.test import APITestCase

from books.views import BookViewSet
from config.exceptions import api_exception_handler


class ErrorHandlingTests(APITestCase):
    def test_unexpected_error_returns_json_500(self):
        with (
            patch.object(BookViewSet, "list", side_effect=RuntimeError("boom")),
            self.assertLogs("config.exceptions", level="ERROR"),
        ):
            response = self.client.get(reverse("book-list"))

        self.assertEqual(response.status_code, status.HTTP_500_INTERNAL_SERVER_ERROR)
        self.assertEqual(response.data["code"], "server_error")

    def test_unknown_url_returns_json_404(self):
        response = self.client.get("/books/")  # The API routes have no trailing slash.

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.json()["code"], "not_found")

    def test_handles_exceptions_with_list_detail(self):
        response = api_exception_handler(PermissionDenied(["Sin acceso.", "Motivo."]), {})

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["detail"], "Sin acceso. Motivo.")
