from rest_framework import serializers

from apps.common.models import AuditEvent


class HealthStatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    database = serializers.CharField()


class PaginationQuerySerializer(serializers.Serializer):
    page = serializers.IntegerField(required=False, min_value=1)
    page_size = serializers.IntegerField(required=False, min_value=1, max_value=100)


class AuditEventActorSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    full_name = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class AuditEventListSerializer(serializers.ModelSerializer):
    actor = AuditEventActorSerializer(read_only=True)

    class Meta:
        model = AuditEvent
        fields = [
            "id",
            "event_type",
            "target_type",
            "target_id",
            "summary",
            "payload",
            "created_at",
            "actor",
        ]


class AuditEventFilterSerializer(PaginationQuerySerializer):
    search = serializers.CharField(required=False, allow_blank=True)
    event_type = serializers.CharField(required=False)
    target_type = serializers.CharField(required=False)
    target_id = serializers.IntegerField(required=False, min_value=1)
    actor_id = serializers.IntegerField(required=False, min_value=1)
    actor_username = serializers.CharField(required=False, allow_blank=True)
    start_date = serializers.DateField(required=False)
    end_date = serializers.DateField(required=False)

    def validate(self, attrs):
        start_date = attrs.get("start_date")
        end_date = attrs.get("end_date")

        if start_date and end_date and end_date < start_date:
            raise serializers.ValidationError(
                {"end_date": ["End date cannot be earlier than start date."]}
            )

        return attrs


class OpsNotificationSerializer(serializers.Serializer):
    id = serializers.CharField()
    kind = serializers.CharField()
    severity = serializers.ChoiceField(
        choices=(
            ("info", "Info"),
            ("success", "Success"),
            ("warning", "Warning"),
            ("danger", "Danger"),
        )
    )
    title = serializers.CharField()
    description = serializers.CharField()
    href = serializers.CharField()
    created_at = serializers.DateTimeField(required=False, allow_null=True)


class OpsNotificationFeedSerializer(serializers.Serializer):
    generated_at = serializers.DateTimeField()
    notification_count = serializers.IntegerField()
    unread_count = serializers.IntegerField()
    notifications = OpsNotificationSerializer(many=True)
