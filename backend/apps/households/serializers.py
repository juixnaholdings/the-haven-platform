from rest_framework import serializers

from apps.households.models import Household, HouseholdMembership


class HouseholdListFilterSerializer(serializers.Serializer):
    search = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(required=False)


class HouseholdListSerializer(serializers.ModelSerializer):
    active_member_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Household
        fields = [
            "id",
            "name",
            "primary_phone",
            "city",
            "is_active",
            "active_member_count",
        ]


class HouseholdWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Household
        fields = [
            "name",
            "primary_phone",
            "address_line_1",
            "address_line_2",
            "city",
            "notes",
            "is_active",
        ]


class HouseholdMemberDetailSerializer(serializers.ModelSerializer):
    member_id = serializers.IntegerField(source="member.id", read_only=True)
    first_name = serializers.CharField(source="member.first_name", read_only=True)
    middle_name = serializers.CharField(source="member.middle_name", read_only=True)
    last_name = serializers.CharField(source="member.last_name", read_only=True)
    email = serializers.EmailField(source="member.email", read_only=True)
    phone_number = serializers.CharField(source="member.phone_number", read_only=True)

    class Meta:
        model = HouseholdMembership
        fields = [
            "id",
            "member_id",
            "first_name",
            "middle_name",
            "last_name",
            "email",
            "phone_number",
            "relationship_to_head",
            "is_head",
            "is_active",
            "joined_on",
            "left_on",
            "notes",
        ]


class HouseholdDetailSerializer(serializers.ModelSerializer):
    members = HouseholdMemberDetailSerializer(source="memberships", many=True, read_only=True)

    class Meta:
        model = Household
        fields = [
            "id",
            "name",
            "primary_phone",
            "address_line_1",
            "address_line_2",
            "city",
            "notes",
            "is_active",
            "members",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ("created_at", "updated_at")


class HouseholdMembershipCreateSerializer(serializers.Serializer):
    member_id = serializers.IntegerField()
    relationship_to_head = serializers.ChoiceField(
        choices=HouseholdMembership._meta.get_field("relationship_to_head").choices,
        default=HouseholdMembership._meta.get_field("relationship_to_head").default,
    )
    is_head = serializers.BooleanField(default=False)
    joined_on = serializers.DateField(required=False, allow_null=True)
    left_on = serializers.DateField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
