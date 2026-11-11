from django.http import Http404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound

from .models import Book
from .pagination import BookPagination
from .serializers import BookSerializer, CategorySearchSerializer, LowStockQuerySerializer


class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    pagination_class = BookPagination
    http_method_names = ["get", "post", "put", "delete", "head", "options"]

    def get_object(self):
        try:
            return super().get_object()
        except Http404:
            raise NotFound("No existe un libro con este ID.") from None

    @action(detail=False, methods=["get"])
    def search(self, request):
        params = self._validated_query_params(CategorySearchSerializer)
        return self._paginated_response(self.get_queryset().in_category(params["category"]))

    @action(detail=False, methods=["get"], url_path="low-stock")
    def low_stock(self, request):
        params = self._validated_query_params(LowStockQuerySerializer)
        return self._paginated_response(self.get_queryset().low_stock(params["threshold"]))

    def _validated_query_params(self, serializer_class):
        serializer = serializer_class(data=self.request.query_params)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    def _paginated_response(self, queryset):
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
