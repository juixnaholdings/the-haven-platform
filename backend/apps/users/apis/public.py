from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, views
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.common.responses import CustomResponse
from apps.users import selectors
from apps.users.serializers import (
    JwtLoginSerializer,
    JwtLogoutSerializer,
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
        responses=None,
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
        responses=None,
    )
    def post(self, request):
        serializer = JwtLogoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        refresh_token = serializer.validated_data["refresh"]

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError:
            raise ValidationError({"refresh": ["Invalid or expired refresh token."]})

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
        responses=None,
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
        responses=None,
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