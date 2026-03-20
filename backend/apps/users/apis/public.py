from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, views

from apps.common.responses import CustomResponse
from apps.users import selectors, services
from apps.users.serializers import (
    EmptyPayloadSerializer,
    JwtLoginSerializer,
    JwtLoginResponseSerializer,
    JwtLogoutSerializer,
    JwtRefreshResponseSerializer,
    JwtRefreshRequestSerializer,
    JwtVerifyRequestSerializer,
    UserMeSerializer,
)


class PublicLoginJwtApi(views.APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=["Public - Auth"],
        summary="Login with JWT",
        request=JwtLoginSerializer,
        responses=JwtLoginResponseSerializer,
    )
    def post(self, request):
        serializer = JwtLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        tokens = serializer.validated_data["tokens"]

        return CustomResponse(
            data={
                "user": UserMeSerializer(user).data,
                "tokens": tokens,
            },
            message="Login successful.",
            status_code=status.HTTP_200_OK,
        )


class PublicLogoutJwtApi(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Public - Auth"],
        summary="Logout and blacklist refresh token",
        request=JwtLogoutSerializer,
        responses=EmptyPayloadSerializer,
    )
    def post(self, request):
        serializer = JwtLogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        services.blacklist_refresh_token(refresh_token=serializer.validated_data["refresh"])

        return CustomResponse(
            data={},
            message="Logout successful.",
            status_code=status.HTTP_200_OK,
        )


class PublicTokenRefreshApi(views.APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=["Public - Auth"],
        summary="Refresh access token",
        request=JwtRefreshRequestSerializer,
        responses=JwtRefreshResponseSerializer,
    )
    def post(self, request):
        serializer = JwtRefreshRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return CustomResponse(
            data=serializer.validated_data,
            message="Token refreshed successfully.",
            status_code=status.HTTP_200_OK,
        )


class PublicTokenVerifyApi(views.APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=["Public - Auth"],
        summary="Verify token",
        request=JwtVerifyRequestSerializer,
        responses=EmptyPayloadSerializer,
    )
    def post(self, request):
        serializer = JwtVerifyRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return CustomResponse(
            data={},
            message="Token is valid.",
            status_code=status.HTTP_200_OK,
        )


class PublicMeApi(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["Public - Auth"],
        summary="Current user",
        responses=UserMeSerializer,
    )
    def get(self, request):
        user = selectors.get_current_user(request.user)

        return CustomResponse(
            data=UserMeSerializer(user).data,
            message="Current user fetched successfully.",
            status_code=status.HTTP_200_OK,
        )
