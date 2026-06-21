from rest_framework import generics, permissions

from apps.feedback.models import ContactRequest
from apps.feedback.serializers import ContactRequestSerializer


class ContactRequestCreateAPIView(generics.CreateAPIView):
    queryset = ContactRequest.objects.all()
    serializer_class = ContactRequestSerializer
    permission_classes = [permissions.AllowAny]

