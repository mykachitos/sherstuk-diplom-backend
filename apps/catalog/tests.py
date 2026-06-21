from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.catalog.models import Category, Favorite, Product


class CatalogApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="catalog_user",
            email="catalog@example.com",
            name="Catalog User",
            password="strongpass123",
        )
        self.token = Token.objects.create(user=self.user)
        self.category = Category.objects.create(name="Торты", slug="cakes", sort_order=1)
        self.product = Product.objects.create(
            category=self.category,
            name="Малиновый торт",
            slug="raspberry-cake",
            description="Нежный торт с кремом",
            price="2800.00",
            original_price="3200.00",
            weight="1.2 кг",
            image_url="https://example.com/cake.jpg",
            badge=Product.Badge.HIT,
            allergens="Молоко, яйца",
            is_month_pick=True,
        )

    def test_product_list(self):
        response = self.client.get("/api/catalog/products/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_discounted_filter(self):
        response = self.client.get("/api/catalog/products/?discounted=1")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["discount_percent"], 13)

    def test_favorites_flow(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")
        create_response = self.client.post(
            "/api/catalog/favorites/",
            {"product_id": self.product.id},
            format="json",
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Favorite.objects.filter(user=self.user, product=self.product).exists())

        delete_response = self.client.delete(f"/api/catalog/favorites/{self.product.id}/")
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
