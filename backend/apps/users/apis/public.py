from drf_spectacular.utils import extend_schema
from rest_framework import permissions, status, views
from rest_framework.exceptions import NotFound

from apps.common.responses import CustomResponse
from apps.users import selectors, services
from apps.users.serializers import (
    EmailAvailabilityResponseSerializer,
    EmailAvailabilitySerializer,
    EmptyPayloadSerializer,
    JwtLoginResponseSerializer,
    JwtLoginSerializer,
    JwtRefreshResponseSerializer,
    PublicSignupResponseSerializer,
    PublicSignupSerializer,
    StaffInviteAcceptSerializer,
    StaffInviteValidateQuerySerializer,
    StaffInviteValidationResponseSerializer,
    UsernameAvailabilityResponseSerializer,
    UsernameAvailabilitySerializer,
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


class PublicSignupApi(views.APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_signup"

    @extend_schema(
        tags=["Public - Auth"],
        summary="Register a new basic user account",
        request=PublicSignupSerializer,
        responses=PublicSignupResponseSerializer,
    )
    def post(self, request):
        serializer = PublicSignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = services.create_public_user(
            username=serializer.validated_data["username"],
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
        )

        return CustomResponse(
            data={"user": UserMeSerializer(user).data},
            message="Account created successfully. Please sign in.",
            status_code=status.HTTP_201_CREATED,
        )


class PublicStaffInviteValidateApi(views.APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_signup"

    @extend_schema(
        tags=["Public - Auth"],
        summary="Validate a staff invite token",
        request=None,
        parameters=[StaffInviteValidateQuerySerializer],
        responses=StaffInviteValidationResponseSerializer,
    )
    def get(self, request, staff_invite_id: int):
        query_serializer = StaffInviteValidateQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)

        services.expire_pending_staff_invites()
        staff_invite = selectors.get_staff_invite_for_token(
            staff_invite_id=staff_invite_id,
            token=query_serializer.validated_data["token"],
        )
        if staff_invite is None:
            raise NotFound("Staff invite not found.")

        staff_invite = services.assert_staff_invite_is_actionable(staff_invite=staff_invite)

        return CustomResponse(
            data={
                "id": staff_invite.id,
                "email": staff_invite.email,
                "status": staff_invite.status,
                "expires_at": staff_invite.expires_at,
                "role_names": sorted(staff_invite.role_groups.values_list("name", flat=True)),
                "invite_is_active": True,
            },
            message="Staff invite validated successfully.",
            status_code=status.HTTP_200_OK,
        )


class PublicStaffInviteAcceptApi(views.APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_signup"

    @extend_schema(
        tags=["Public - Auth"],
        summary="Accept a staff invite and complete onboarding",
        request=StaffInviteAcceptSerializer,
        responses=PublicSignupResponseSerializer,
    )
    def post(self, request, staff_invite_id: int):
        serializer = StaffInviteAcceptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        services.expire_pending_staff_invites()
        staff_invite = selectors.get_staff_invite_for_token(
            staff_invite_id=staff_invite_id,
            token=serializer.validated_data["token"],
        )
        if staff_invite is None:
            raise NotFound("Staff invite not found.")

        staff_invite = services.assert_staff_invite_is_actionable(staff_invite=staff_invite)
        user = services.accept_staff_invite(staff_invite=staff_invite, data=serializer.validated_data)

        return CustomResponse(
            data={"user": UserMeSerializer(user).data},
            message="Staff onboarding completed successfully. Please sign in.",
            status_code=status.HTTP_201_CREATED,
        )


class PublicUsernameAvailabilityApi(views.APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_availability"

    @extend_schema(
        tags=["Public - Auth"],
        summary="Check username availability",
        request=None,
        responses=UsernameAvailabilityResponseSerializer,
    )
    def get(self, request):
        serializer = UsernameAvailabilitySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"]

        return CustomResponse(
            data={
                "username": username,
                "available": selectors.is_username_available(username=username),
            },
            message="Username availability fetched successfully.",
            status_code=status.HTTP_200_OK,
        )


class PublicEmailAvailabilityApi(views.APIView):
    permission_classes = [permissions.AllowAny]
    throttle_scope = "auth_availability"

    @extend_schema(
        tags=["Public - Auth"],
        summary="Check email availability",
        request=None,
        responses=EmailAvailabilityResponseSerializer,
    )
    def get(self, request):
        serializer = EmailAvailabilitySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        return CustomResponse(
            data={
                "email": email,
                "available": selectors.is_email_available(email=email),
            },
            message="Email availability fetched successfully.",
            status_code=status.HTTP_200_OK,
        )


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
