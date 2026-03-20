from rest_framework import serializers

from apps.groups.models import Group, GroupMembership


class GroupListFilterSerializer(serializers.Serializer):
    search = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)


class GroupListSerializer(serializers.ModelSerializer):
    active_member_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Group
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "active_member_count",
        ]


class GroupWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = [
            "name",
            "description",
            "is_active",
        ]


class GroupMembershipDetailSerializer(serializers.ModelSerializer):
    member_id = serializers.IntegerField(source="member.id", read_only=True)
    first_name = serializers.CharField(source="member.first_name", read_only=True)
    middle_name = serializers.CharField(source="member.middle_name", read_only=True)
    last_name = serializers.CharField(source="member.last_name", read_only=True)
    email = serializers.EmailField(source="member.email", read_only=True)

    class Meta:
        model = GroupMembership
        fields = [
            "id",
            "member_id",
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "role_name",
            "started_on",
            "ended_on",
            "is_active",
            "notes",
        ]


class GroupDetailSerializer(serializers.ModelSerializer):
    memberships = GroupMembershipDetailSerializer(many=True, read_only=True)

    class Meta:
        model = Group
        fields = [
            "id",
            "name",
            "description",
            "is_active",
            "memberships",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("created_at", "updated_at")


class GroupMembershipCreateSerializer(serializers.Serializer):
    member_id = serializers.IntegerField()
    role_name = serializers.CharField(required=False, allow_blank=True)
    started_on = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class GroupMembershipUpdateSerializer(serializers.Serializer):
    role_name = serializers.CharField(required=False, allow_blank=True)
    started_on = serializers.DateField(required=False, allow_null=True)
    ended_on = serializers.DateField(required=False, allow_null=True)
    is_active = serializers.BooleanField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
