from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, views
from rest_framework_simplejwt.serializers import TokenVerifySerializer

from apps.common.responses import CustomResponse
from apps.users import selectors, services
from apps.users.serializers import (
    EmptyPayloadSerializer,
    JwtLoginResponseSerializer,
    JwtLoginSerializer,
    JwtRefreshResponseSerializer,
    JwtVerifyRequestSerializer,
    UserMeSerializer,
)


class PublicLoginJwtApi(views.APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_login"

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
        tokens = services.build_jwt_tokens_for_user(user=user)

        response = CustomResponse(
            data={
                "user": UserMeSerializer(user).data,
                "tokens": {
                    "access": tokens["access"],
                },
            },
            message="Login successful.",
            status_code=status.HTTP_200_OK,
        )

        services.set_refresh_cookie(
            response=response,
            refresh_token=tokens["refresh"],
        )

        return response


class PublicLogoutJwtApi(views.APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_logout"

    @extend_schema(
        tags=["Public - Auth"],
        summary="Logout and blacklist refresh token",
        request=None,
        responses=EmptyPayloadSerializer,
    )
    def post(self, request):
        raw_refresh = services.get_refresh_cookie_from_request(request=request)

        if raw_refresh:
            services.blacklist_refresh_token(refresh_token=raw_refresh)

        response = CustomResponse(
            data={},
            message="Logout successful.",
            status_code=status.HTTP_200_OK,
        )

        services.clear_refresh_cookie(response=response)
        return response


class PublicTokenRefreshApi(views.APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_refresh"

    @extend_schema(
        tags=["Public - Auth"],
        summary="Refresh access token from secure cookie",
        request=None,
        responses=JwtRefreshResponseSerializer,
    )
    def post(self, request):
        raw_refresh = services.get_refresh_cookie_from_request(request=request)
        if not raw_refresh:
            return CustomResponse(
                code=0,
                data={},
                message="Refresh token cookie is missing.",
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        token_data = services.refresh_access_from_cookie(raw_refresh_token=raw_refresh)

        response = CustomResponse(
            data={
                "access": token_data["access"],
            },
            message="Token refreshed successfully.",
            status_code=status.HTTP_200_OK,
        )

        rotated_refresh = token_data.get("refresh")
        if rotated_refresh:
            services.set_refresh_cookie(
                response=response,
                refresh_token=rotated_refresh,
            )

        return response


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
