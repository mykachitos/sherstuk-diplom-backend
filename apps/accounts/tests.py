from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User


class AccountsApiTests(APITestCase):
    def test_register_login_and_profile(self):
        response = self.client.post(
            "/api/auth/register/",
            {
                "email": "user@example.com",
                "name": "Test User",
                "phone": "+79990000000",
                "password": "strongpass123",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("token", response.data)

        login_response = self.client.post(
            "/api/auth/login/",
            {"email": "user@example.com", "password": "strongpass123"},
            format="json",
        )
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)

        token = login_response.data["token"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {token}")

        me_response = self.client.get("/api/auth/me/")
        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["email"], "user@example.com")

        patch_response = self.client.patch("/api/auth/me/", {"name": "Updated Name"}, format="json")
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        self.assertEqual(User.objects.get(email="user@example.com").name, "Updated Name")

