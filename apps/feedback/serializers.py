from rest_framework import serializers

from apps.feedback.models import ContactRequest


class ContactRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactRequest
        fields = ("id", "name", "email", "phone", "message", "personal_data_consent", "created_at")
        read_only_fields = ("id", "created_at")

    def validate_personal_data_consent(self, value):
        if not value:
            raise serializers.ValidationError("Нужно согласие на обработку персональных данных.")
        return value
