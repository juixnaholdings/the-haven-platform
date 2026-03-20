from drf_spectacular.utils import extend_schema
from rest_framework import permissions, views

from apps.common.responses import CustomResponse
from apps.common.selectors import get_health_status
from apps.common.serializers import HealthStatusSerializer


class HealthCheckPublicApi(views.APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=["Public - Ops"],
        summary="Health check",
        responses=HealthStatusSerializer,
    )
    def get(self, request):
        return CustomResponse(
            data=HealthStatusSerializer(get_health_status()).data,
            message="Health check completed successfully.",
        )
