from django.urls import path

from apps.feedback.views import ContactRequestCreateAPIView


urlpatterns = [
    path("", ContactRequestCreateAPIView.as_view(), name="contact-request-create"),
]

