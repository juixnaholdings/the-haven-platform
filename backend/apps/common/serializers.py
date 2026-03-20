from rest_framework import serializers


class HealthStatusSerializer(serializers.Serializer):
    status = serializers.CharField()
    database = serializers.CharField()
