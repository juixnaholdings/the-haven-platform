from django.contrib.auth import authenticate
from django.contrib.auth.models import Group, Permission
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenVerifySerializer

from apps.users import selectors
from apps.users.models import User


class JwtLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")

        user = authenticate(username=username, password=password)
        if not user:
            raise serializers.ValidationError({"detail": ["Invalid credentials."]})

        if not user.is_active:
            raise serializers.ValidationError({"detail": ["User account is inactive."]})

        attrs["user"] = user
        return attrs


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

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

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
            "last_login",
            "date_joined",
        ]


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
