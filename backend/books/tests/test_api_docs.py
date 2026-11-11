from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class ApiDocsTests(APITestCase):
    def test_serves_openapi_schema(self):
        response = self.client.get(reverse("schema"), {"format": "json"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("/books/{id}/calculate-price", response.json()["paths"])

    def test_serves_swagger_ui(self):
        response = self.client.get(reverse("swagger-ui"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
