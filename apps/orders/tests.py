from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from apps.accounts.models import User
from apps.catalog.models import Category, Product
from apps.orders.models import Order


class OrdersApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="orders_user",
            email="orders@example.com",
            name="Orders User",
            password="strongpass123",
        )
        self.token = Token.objects.create(user=self.user)
        category = Category.objects.create(name="Торты", slug="cakes", sort_order=1)
        self.product = Product.objects.create(
            category=category,
            name="Медовик",
            slug="medovik",
            description="Классический торт",
            price="2200.00",
            original_price="2500.00",
            weight="1 кг",
            image_url="https://example.com/medovik.jpg",
            allergens="Молоко, яйца",
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {self.token.key}")

    def test_create_order(self):
        response = self.client.post(
            "/api/orders/",
            {
                "contact_name": "Orders User",
                "phone": "+79991112233",
                "delivery_method": "delivery",
                "address": "Владивосток, ул. Пушкина, 14",
                "comment": "Позвонить заранее",
                "personal_data_consent": True,
                "items": [{"product_id": self.product.id, "quantity": 2}],
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        order = Order.objects.get()
        self.assertEqual(order.items.count(), 1)
        self.assertEqual(str(order.total), "4700.00")
