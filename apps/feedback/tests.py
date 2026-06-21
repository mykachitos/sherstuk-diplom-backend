from rest_framework import status
from rest_framework.test import APITestCase

from apps.feedback.models import ContactRequest


class FeedbackApiTests(APITestCase):
    def test_send_feedback(self):
        response = self.client.post(
            "/api/feedback/",
            {
                "name": "Анна",
                "email": "anna@example.com",
                "phone": "+79990000000",
                "message": "Хочу заказать торт на день рождения",
                "personal_data_consent": True,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ContactRequest.objects.count(), 1)
