from django.contrib.auth import authenticate
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
