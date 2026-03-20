from django.contrib.auth import authenticate
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenRefreshSerializer, TokenVerifySerializer

from apps.users import services
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

        attrs["user"] = user
        attrs["tokens"] = services.build_jwt_tokens_for_user(user=user)
        return attrs


class JwtLogoutSerializer(serializers.Serializer):
    refresh = serializers.CharField()


class JwtRefreshRequestSerializer(TokenRefreshSerializer):
    pass


class JwtVerifyRequestSerializer(TokenVerifySerializer):
    pass


class EmptyPayloadSerializer(serializers.Serializer):
    pass


class UserMeSerializer(serializers.ModelSerializer):
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
        ]


class JwtTokenPairSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField(required=False)


class JwtLoginResponseSerializer(serializers.Serializer):
    user = UserMeSerializer()
    tokens = JwtTokenPairSerializer()


class JwtRefreshResponseSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField(required=False)
