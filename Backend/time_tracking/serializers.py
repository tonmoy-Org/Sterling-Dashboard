from rest_framework import serializers
from .models import TimeTracking, TimeTrackingSeen
from accounts.models import User

class TimeTrackingSerializer(serializers.ModelSerializer):
    deleted_by_name = serializers.ReadOnlyField(source='deleted_by.name')
    deleted_by_email = serializers.ReadOnlyField(source='deleted_by.email')
    is_seen = serializers.SerializerMethodField()

    class Meta:
        model = TimeTracking
        fields = '__all__'

    def get_is_seen(self, obj):
        user = self.context.get('request').user
        if not user or user.is_anonymous:
            return False
        return TimeTrackingSeen.objects.filter(user=user, record=obj).exists()
