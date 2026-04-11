from rest_framework import serializers
from .models import DispatcherBooked


class DispatcherBookedSerializer(serializers.ModelSerializer):

    class Meta:
        model = DispatcherBooked
        fields = "__all__"

    def create(self, validated_data):
        date = validated_data.get("date")

        instance = DispatcherBooked.objects.filter(date=date).first()

        if instance:
            # 👉 check if any value changed
            changed_fields = []
            for field, value in validated_data.items():
                if field == "date":
                    continue  # ← never update date
                if getattr(instance, field) != value:
                    changed_fields.append((field, value))

            if not changed_fields:
                instance._message = "Data already exists, no changes"
                return instance

            # 🔄 update only changed fields (date untouched)
            for field, value in changed_fields:
                setattr(instance, field, value)

            instance.save()
            instance._message = f"Data updated ({len(changed_fields)} field(s) changed)"
            return instance

        # ✅ create new record for today
        instance = super().create(validated_data)
        instance._message = "Data created"
        return instance