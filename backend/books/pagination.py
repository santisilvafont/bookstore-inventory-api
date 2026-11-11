from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class BookPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        paginator = self.page.paginator
        return Response(
            {
                "count": paginator.count,
                "total_pages": paginator.num_pages,
                "page": self.page.number,
                "page_size": paginator.per_page,
                "next": self.get_next_link(),
                "previous": self.get_previous_link(),
                "results": data,
            }
        )

    def get_paginated_response_schema(self, schema):
        response_schema = super().get_paginated_response_schema(schema)
        response_schema["required"] = [
            *response_schema["required"],
            "total_pages",
            "page",
            "page_size",
        ]
        response_schema["properties"] |= {
            "total_pages": {"type": "integer", "example": 3},
            "page": {"type": "integer", "example": 1},
            "page_size": {"type": "integer", "example": self.page_size},
        }
        return response_schema
