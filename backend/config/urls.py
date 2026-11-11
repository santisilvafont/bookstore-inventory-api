from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("", include("books.urls")),
]

handler404 = "config.exceptions.not_found_view"
handler500 = "config.exceptions.server_error_view"
