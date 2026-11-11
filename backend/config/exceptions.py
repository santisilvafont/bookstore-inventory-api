"""Single JSON error format for the whole API, so clients handle every failure the same way."""

import logging

from django.http import JsonResponse
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)

SERVER_ERROR_BODY = {
    "status": status.HTTP_500_INTERNAL_SERVER_ERROR,
    "code": "server_error",
    "detail": "Error interno del servidor.",
}


def api_exception_handler(exc, context):
    """Render errors as {"status", "code", "detail"}, plus "errors" (field -> messages) on a 400."""
    response = exception_handler(exc, context)

    if response is None:
        logger.error("Unhandled API error", exc_info=exc)
        return Response(SERVER_ERROR_BODY, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    data = response.data
    if isinstance(exc, ValidationError):
        response.data = {
            "status": response.status_code,
            "code": "invalid",
            "detail": "Los datos enviados no son válidos.",
            "errors": data if isinstance(data, dict) else {"non_field_errors": data},
        }
    else:
        detail = data.get("detail", "") if isinstance(data, dict) else " ".join(map(str, data))
        response.data = {
            "status": response.status_code,
            "code": getattr(detail, "code", "error"),
            "detail": detail,
        }
    return response


# Django-level fallbacks (unknown URLs, errors outside DRF views), used when DEBUG is off.


def not_found_view(request, exception):
    return JsonResponse(
        {"status": 404, "code": "not_found", "detail": "Recurso no encontrado."}, status=404
    )


def server_error_view(request):
    return JsonResponse(SERVER_ERROR_BODY, status=500)
