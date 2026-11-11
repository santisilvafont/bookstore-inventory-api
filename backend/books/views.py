from django.http import Http404
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import APIException, NotFound
from rest_framework.response import Response

from .exchange_rates import ExchangeRateUnavailable
from .models import Book
from .pagination import BookPagination
from .pricing import calculate_selling_price
from .serializers import (
    BookSerializer,
    CategorySearchSerializer,
    ErrorResponseSerializer,
    LowStockQuerySerializer,
    PriceCalculationSerializer,
)

BOOK_NOT_FOUND_MESSAGE = "No existe un libro con este ID."

ERROR_400 = {400: ErrorResponseSerializer}
ERROR_404 = {404: ErrorResponseSerializer}


class ExchangeRateServiceUnavailable(APIException):
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "No hay una tasa de cambio disponible. Inténtelo más tarde."
    default_code = "exchange_rate_unavailable"


@extend_schema_view(
    list=extend_schema(summary="Listar libros (paginado)"),
    create=extend_schema(summary="Crear un libro", responses={201: BookSerializer, **ERROR_400}),
    retrieve=extend_schema(
        summary="Obtener un libro", responses={200: BookSerializer, **ERROR_404}
    ),
    update=extend_schema(
        summary="Actualizar un libro",
        responses={200: BookSerializer, **ERROR_400, **ERROR_404},
    ),
    destroy=extend_schema(summary="Eliminar un libro", responses={204: None, **ERROR_404}),
)
class BookViewSet(viewsets.ModelViewSet):
    queryset = Book.objects.all()
    serializer_class = BookSerializer
    pagination_class = BookPagination
    http_method_names = ["get", "post", "put", "delete", "head", "options"]

    def get_object(self):
        try:
            return super().get_object()
        except Http404:
            raise NotFound(BOOK_NOT_FOUND_MESSAGE) from None

    @extend_schema(
        summary="Buscar libros por categoría",
        description="Coincidencia parcial y sin distinguir mayúsculas.",
        parameters=[CategorySearchSerializer],
        responses={200: BookSerializer(many=True), **ERROR_400},
    )
    @action(detail=False, methods=["get"])
    def search(self, request):
        params = self._validated_query_params(CategorySearchSerializer)
        return self._paginated_response(self.get_queryset().in_category(params["category"]))

    @extend_schema(
        summary="Libros con stock bajo",
        description="Libros con stock menor o igual al umbral, los más urgentes primero.",
        parameters=[LowStockQuerySerializer],
        responses={200: BookSerializer(many=True), **ERROR_400},
    )
    @action(detail=False, methods=["get"], url_path="low-stock")
    def low_stock(self, request):
        params = self._validated_query_params(LowStockQuerySerializer)
        return self._paginated_response(self.get_queryset().low_stock(params["threshold"]))

    @extend_schema(
        summary="Calcular el precio de venta sugerido",
        description=(
            "Convierte cost_usd a la moneda del país del proveedor con la tasa de cambio "
            "actual, aplica un margen del 40 % y guarda selling_price_local. Si la API de "
            'tasas falla se usa una tasa por defecto (rate_source = "default").'
        ),
        request=None,
        responses={
            200: PriceCalculationSerializer,
            **ERROR_404,
            503: ErrorResponseSerializer,
        },
    )
    @action(
        detail=True,
        methods=["post"],
        url_path="calculate-price",
        serializer_class=PriceCalculationSerializer,
    )
    def calculate_price(self, request, pk=None):
        book = self.get_object()
        try:
            calculation = calculate_selling_price(book.pk)
        except Book.DoesNotExist:
            raise NotFound(BOOK_NOT_FOUND_MESSAGE) from None
        except ExchangeRateUnavailable as error:
            raise ExchangeRateServiceUnavailable() from error
        return Response(PriceCalculationSerializer(calculation).data)

    def _validated_query_params(self, serializer_class):
        serializer = serializer_class(data=self.request.query_params)
        serializer.is_valid(raise_exception=True)
        return serializer.validated_data

    def _paginated_response(self, queryset):
        page = self.paginate_queryset(queryset)
        serializer = self.get_serializer(page, many=True)
        return self.get_paginated_response(serializer.data)
