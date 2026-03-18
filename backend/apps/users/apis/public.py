from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, views

from apps.common.responses import CustomResponse
from apps.users import selectors, services
from apps.users.serializers import LoginSerializer, UserMeSerializer


class PublicLoginApi(views.APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=["Public - Auth"],
        summary="Login",
        request=LoginSerializer,
        responses=UserMeSerializer,
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        services.login_user(request, user)

        return CustomResponse(
            data=UserMeSerializer(user).data,
            message="Login successful.",
            status_code=status.HTTP_200_OK,
        )


class PublicLogoutApi(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Public - Auth"],
        summary="Logout",
        responses=None,
    )
    def post(self, request):
        services.logout_user(request)

        return CustomResponse(
            data={},
            message="Logout successful.",
            status_code=status.HTTP_200_OK,
        )


class PublicMeApi(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Public - Auth"],
        summary="Current User",
        responses=UserMeSerializer,
    )
    def get(self, request):
        user = selectors.get_current_user(request.user)

        return CustomResponse(
            data=UserMeSerializer(user).data,
            message="Current user fetched successfully.",
            status_code=status.HTTP_200_OK,
        )