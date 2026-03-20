from rest_framework import serializers

from apps.members.models import Member


class MemberListFilterSerializer(serializers.Serializer):
    search = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)
    household_id = serializers.IntegerField(required=False, min_value=1)


class MemberListSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Member
        fields = [
            "id",
            "first_name",
            "middle_name",
            "last_name",
            "full_name",
            "email",
            "phone_number",
            "is_active",
        ]


class MemberDetailSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Member
        fields = [
            "id",
            "first_name",
            "middle_name",
            "last_name",
            "full_name",
            "email",
            "phone_number",
            "date_of_birth",
            "notes",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("created_at", "updated_at")


class MemberWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Member
        fields = [
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "phone_number",
            "date_of_birth",
            "notes",
            "is_active",
        ]
