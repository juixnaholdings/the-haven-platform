import re

from django.contrib.auth import authenticate, password_validation
from django.contrib.auth.models import Group, Permission
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenVerifySerializer

from apps.users import selectors, services
from apps.users.models import StaffInvite, StaffInviteStatus, User


def _password_strength_errors(password: str) -> list[str]:
    errors = []

    if len(password) < 8:
        errors.append("Password must contain at least 8 characters.")
    if not re.search(r"[A-Z]", password):
        errors.append("Password must include at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        errors.append("Password must include at least one lowercase letter.")
    if not re.search(r"[0-9]", password):
        errors.append("Password must include at least one number.")
    if not re.search(r"[^A-Za-z0-9]", password):
        errors.append("Password must include at least one symbol.")

    return errors


class JwtLoginSerializer(serializers.Serializer):
    identifier = serializers.CharField(
        required=False,
        help_text="Username or email address.",
    )
    username = serializers.CharField(
        required=False,
        write_only=True,
        help_text="Legacy username field. Use identifier instead.",
    )
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        identifier = attrs.get("identifier")
        legacy_username = attrs.get("username")
        password = attrs.get("password")

        raw_identifier = identifier if identifier is not None else legacy_username
        if not raw_identifier or not raw_identifier.strip():
            raise serializers.ValidationError(
                {"detail": ["Username or email is required."]}
            )

        normalized_identifier = raw_identifier.strip()
        username_user = User.objects.filter(username=normalized_identifier).first()
        email_user = User.objects.filter(email__iexact=normalized_identifier).first()
        if username_user and email_user and username_user.id != email_user.id:
            raise serializers.ValidationError({"detail": ["Invalid credentials."]})

        user = authenticate(username=normalized_identifier, password=password)
        if not user and email_user:
            user = authenticate(username=email_user.username, password=password)

        if not user:
            raise serializers.ValidationError({"detail": ["Invalid credentials."]})

        if not user.is_active:
            raise serializers.ValidationError({"detail": ["User account is inactive."]})

        attrs["user"] = user
        return attrs


class PublicSignupSerializer(serializers.Serializer):
    username = serializers.CharField(
        max_length=User._meta.get_field("username").max_length,
        validators=User._meta.get_field("username").validators,
    )
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_username(self, value):
        normalized_username = value.strip()
        if not normalized_username:
            raise serializers.ValidationError("Username is required.")

        if not selectors.is_username_available(username=normalized_username):
            raise serializers.ValidationError("A user with this username already exists.")

        return normalized_username

    def validate_email(self, value):
        normalized_email = services.normalize_email(value)
        if not selectors.is_email_available(email=normalized_email):
            raise serializers.ValidationError("A user with this email already exists.")

        return normalized_email

    def validate_password(self, value):
        errors = _password_strength_errors(value)

        try:
            password_validation.validate_password(value)
        except DjangoValidationError as exc:
            errors.extend(str(message) for message in exc.messages)

        unique_errors = list(dict.fromkeys(errors))
        if unique_errors:
            raise serializers.ValidationError(unique_errors)

        return value

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("confirm_password"):
            raise serializers.ValidationError(
                {"confirm_password": ["Password confirmation does not match."]}
            )

        return attrs


class UsernameAvailabilitySerializer(serializers.Serializer):
    username = serializers.CharField(
        max_length=User._meta.get_field("username").max_length,
        validators=User._meta.get_field("username").validators,
    )

    def validate_username(self, value):
        normalized_username = value.strip()
        if not normalized_username:
            raise serializers.ValidationError("Username is required.")
        return normalized_username


class UsernameAvailabilityResponseSerializer(serializers.Serializer):
    username = serializers.CharField()
    available = serializers.BooleanField()


class EmailAvailabilitySerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        return services.normalize_email(value)


class EmailAvailabilityResponseSerializer(serializers.Serializer):
    email = serializers.CharField()
    available = serializers.BooleanField()


class BasicUserListFilterSerializer(serializers.Serializer):
    search = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    unassigned_only = serializers.BooleanField(required=False, default=True)


class EmptyPayloadSerializer(serializers.Serializer):
    pass


class JwtVerifyRequestSerializer(TokenVerifySerializer):
    pass


class UserMeSerializer(serializers.ModelSerializer):
    role_names = serializers.SerializerMethodField()

    def get_role_names(self, obj):
        return selectors.get_user_role_names(user=obj)

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "email",
            "is_active",
            "is_staff",
            "is_superuser",
            "role_names",
        ]


class RoleReferenceSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()


class PublicSignupResponseSerializer(serializers.Serializer):
    user = UserMeSerializer()


class JwtLoginTokenSerializer(serializers.Serializer):
    access = serializers.CharField()


class JwtLoginResponseSerializer(serializers.Serializer):
    user = UserMeSerializer()
    tokens = JwtLoginTokenSerializer()


class JwtRefreshResponseSerializer(serializers.Serializer):
    access = serializers.CharField()


class StaffUserListSerializer(UserMeSerializer):
    full_name = serializers.SerializerMethodField()
    last_login = serializers.DateTimeField(read_only=True)
    date_joined = serializers.DateTimeField(read_only=True)
    roles = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_roles(self, obj):
        prefetched_groups = getattr(obj, "_prefetched_objects_cache", {}).get("groups")
        if prefetched_groups is not None:
            sorted_groups = sorted(prefetched_groups, key=lambda group: group.name)
            return [{"id": group.id, "name": group.name} for group in sorted_groups]

        return [
            {"id": group.id, "name": group.name}
            for group in obj.groups.all().order_by("name")
        ]

    class Meta(UserMeSerializer.Meta):
        model = User
        fields = [
            "id",
            "username",
            "first_name",
            "last_name",
            "full_name",
            "email",
            "is_active",
            "is_staff",
            "is_superuser",
            "role_names",
            "roles",
            "last_login",
            "date_joined",
        ]


class BasicUserListSerializer(StaffUserListSerializer):
    pass


class StaffUserCreateSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    is_active = serializers.BooleanField(required=False, default=True)
    role_ids = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.order_by("name"),
        many=True,
        required=False,
    )


class StaffUserUpdateSerializer(serializers.Serializer):
    email = serializers.EmailField(required=False)
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    is_active = serializers.BooleanField(required=False)
    role_ids = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.order_by("name"),
        many=True,
        required=False,
    )


class BasicUserElevationSerializer(serializers.Serializer):
    role_ids = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.order_by("name"),
        many=True,
        required=True,
    )
    is_active = serializers.BooleanField(required=False)

    def validate_role_ids(self, value):
        if not value:
            raise serializers.ValidationError("Assign at least one role before elevation.")
        return value


class StaffInviteListFilterSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=StaffInviteStatus.choices, required=False)
    search = serializers.CharField(required=False, allow_blank=True)
    include_expired = serializers.BooleanField(required=False, default=True)


class StaffInviteCreateSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role_ids = serializers.PrimaryKeyRelatedField(
        queryset=Group.objects.order_by("name"),
        many=True,
        required=True,
    )
    expires_in_days = serializers.IntegerField(required=False, min_value=1, max_value=30, default=7)

    def validate_email(self, value):
        return services.normalize_email(value)

    def validate_role_ids(self, value):
        if not value:
            raise serializers.ValidationError("Assign at least one role to create an invite.")
        return value


class AcceptedInviteUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email")


class StaffInviteListSerializer(serializers.ModelSerializer):
    role_names = serializers.SerializerMethodField()
    roles = serializers.SerializerMethodField()
    invited_by_username = serializers.SerializerMethodField()
    accepted_user = AcceptedInviteUserSerializer(read_only=True)
    invite_path = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()

    class Meta:
        model = StaffInvite
        fields = [
            "id",
            "email",
            "status",
            "expires_at",
            "accepted_at",
            "created_at",
            "updated_at",
            "invited_by_username",
            "accepted_user",
            "role_names",
            "roles",
            "invite_path",
            "is_expired",
        ]

    def get_role_names(self, obj):
        prefetched_roles = getattr(obj, "_prefetched_objects_cache", {}).get("role_groups")
        if prefetched_roles is not None:
            return sorted(role.name for role in prefetched_roles)
        return list(obj.role_groups.order_by("name").values_list("name", flat=True))

    def get_roles(self, obj):
        prefetched_roles = getattr(obj, "_prefetched_objects_cache", {}).get("role_groups")
        if prefetched_roles is not None:
            sorted_roles = sorted(prefetched_roles, key=lambda role: role.name)
            return [{"id": role.id, "name": role.name} for role in sorted_roles]
        return [
            {"id": role.id, "name": role.name}
            for role in obj.role_groups.all().order_by("name")
        ]

    def get_invited_by_username(self, obj):
        return obj.created_by.username if obj.created_by else ""

    def get_invite_path(self, obj):
        if obj.status != StaffInviteStatus.PENDING:
            return ""
        if obj.expires_at < timezone.now():
            return ""
        return services.build_staff_invite_path(staff_invite=obj)

    def get_is_expired(self, obj):
        return bool(obj.expires_at < timezone.now())


class StaffInviteValidateQuerySerializer(serializers.Serializer):
    token = serializers.CharField()


class StaffInviteValidationResponseSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField()
    status = serializers.CharField()
    expires_at = serializers.DateTimeField()
    role_names = serializers.ListField(child=serializers.CharField())
    invite_is_active = serializers.BooleanField()


class StaffInviteAcceptSerializer(serializers.Serializer):
    token = serializers.CharField()
    username = serializers.CharField(
        max_length=User._meta.get_field("username").max_length,
        validators=User._meta.get_field("username").validators,
    )
    first_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    last_name = serializers.CharField(required=False, allow_blank=True, max_length=150)
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    def validate_username(self, value):
        normalized_username = services.normalize_username(value)
        if not normalized_username:
            raise serializers.ValidationError("Username is required.")

        if not selectors.is_username_available(username=normalized_username):
            raise serializers.ValidationError("A user with this username already exists.")

        return normalized_username

    def validate_password(self, value):
        errors = _password_strength_errors(value)

        try:
            password_validation.validate_password(value)
        except DjangoValidationError as exc:
            errors.extend(str(message) for message in exc.messages)

        unique_errors = list(dict.fromkeys(errors))
        if unique_errors:
            raise serializers.ValidationError(unique_errors)

        return value

    def validate(self, attrs):
        if attrs.get("password") != attrs.get("confirm_password"):
            raise serializers.ValidationError(
                {"confirm_password": ["Password confirmation does not match."]}
            )
        return attrs


class RolePermissionSummarySerializer(serializers.ModelSerializer):
    app_label = serializers.CharField(source="content_type.app_label", read_only=True)
    permission_code = serializers.SerializerMethodField()

    def get_permission_code(self, obj):
        return f"{obj.content_type.app_label}.{obj.codename}"

    class Meta:
        model = Permission
        fields = [
            "id",
            "app_label",
            "codename",
            "name",
            "permission_code",
        ]


class RoleSummarySerializer(serializers.ModelSerializer):
    permissions = RolePermissionSummarySerializer(many=True, read_only=True)
    user_count = serializers.SerializerMethodField()

    def get_user_count(self, obj):
        prefetched_users = getattr(obj, "_prefetched_objects_cache", {}).get("user_set")
        if prefetched_users is not None:
            return len(prefetched_users)
        return obj.user_set.count()

    class Meta:
        model = Group
        fields = [
            "id",
            "name",
            "user_count",
            "permissions",
        ]
