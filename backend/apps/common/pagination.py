# apps/common/pagination.py

from rest_framework.pagination import PageNumberPagination

from apps.common.responses import CustomResponse


class StandardPageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


def _is_pagination_requested(request) -> bool:
    query_params = request.query_params
    return "page" in query_params or "page_size" in query_params


def get_optional_paginated_response(*, request, queryset, serializer_class, message: str):
    if not _is_pagination_requested(request):
        return None

    paginator = StandardPageNumberPagination()
    paginated_queryset = paginator.paginate_queryset(queryset, request)
    serializer = serializer_class(paginated_queryset, many=True)

    response_payload = {
        "count": paginator.page.paginator.count,
        "next": paginator.get_next_link(),
        "previous": paginator.get_previous_link(),
        "page": paginator.page.number,
        "page_size": paginator.get_page_size(request) or paginator.page_size,
        "results": serializer.data,
    }
    return CustomResponse(data=response_payload, message=message)
