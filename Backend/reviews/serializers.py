from rest_framework import serializers
from .models import Review, ReviewSeen

class ReviewSerializer(serializers.ModelSerializer):
    is_seen = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = '__all__'

    def get_is_seen(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return ReviewSeen.objects.filter(user=request.user, review=obj).exists()
        return False
