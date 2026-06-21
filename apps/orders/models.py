import uuid

from django.conf import settings
from django.db import models

from apps.catalog.models import Product, TimeStampedModel


class Order(TimeStampedModel):
    class Status(models.TextChoices):
        NEW = "new", "Новый"
        COOKING = "cooking", "Готовится"
        DONE = "done", "Выполнен"
        CANCELED = "canceled", "Отменен"

    class DeliveryMethod(models.TextChoices):
        PICKUP = "pickup", "Самовывоз"
        DELIVERY = "delivery", "Доставка"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="orders")
    number = models.CharField(max_length=32, unique=True, editable=False)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.NEW)
    delivery_method = models.CharField(max_length=16, choices=DeliveryMethod.choices, default=DeliveryMethod.PICKUP)
    contact_name = models.CharField(max_length=255)
    phone = models.CharField(max_length=32)
    address = models.TextField(blank=True)
    comment = models.TextField(blank=True)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    personal_data_consent = models.BooleanField(default=False)

    class Meta:
        ordering = ("-created_at",)

    def save(self, *args, **kwargs):
        if not self.number:
            self.number = f"SW-{uuid.uuid4().hex[:10].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return self.number


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True, related_name="order_items")
    product_name = models.CharField(max_length=255)
    product_price = models.DecimalField(max_digits=10, decimal_places=2)
    product_weight = models.CharField(max_length=64, blank=True)
    product_image_url = models.URLField(blank=True)
    quantity = models.PositiveIntegerField(default=1)

    class Meta:
        ordering = ("id",)

    def __str__(self):
        return f"{self.product_name} x{self.quantity}"

