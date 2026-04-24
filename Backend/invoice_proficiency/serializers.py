from rest_framework import serializers
from .models import InvoiceProficiency, InvoiceProficiencySeen

class InvoiceProficiencySerializer(serializers.ModelSerializer):
    is_seen = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceProficiency
        fields = '__all__'

    def get_is_seen(self, obj):
        user = self.context.get('request').user if self.context.get('request') else None
        if user and user.is_authenticated:
            return InvoiceProficiencySeen.objects.filter(user=user, invoice_proficiency=obj).exists()
        return False

class InvoiceProficiencySeenSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceProficiencySeen
        fields = ['user', 'invoice_proficiency', 'seen_at']
