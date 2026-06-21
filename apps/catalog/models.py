from decimal import Decimal

from django.conf import settings
from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class Category(TimeStampedModel):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True)
    sort_order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("sort_order", "name")

    def __str__(self):
        return self.name


class Product(TimeStampedModel):
    class Badge(models.TextChoices):
        NONE = "", "None"
        HIT = "hit", "Hit"
        NEW = "new", "New"

    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    weight = models.CharField(max_length=64)
    image_url = models.URLField()
    badge = models.CharField(max_length=12, choices=Badge.choices, blank=True, default=Badge.NONE)
    allergens = models.CharField(max_length=255, blank=True)
    is_month_pick = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ("category__sort_order", "name")

    def __str__(self):
        return self.name

    @property
    def discount_percent(self):
        if not self.original_price or self.original_price <= self.price:
            return 0
        value = (self.original_price - self.price) / self.original_price * 100
        return int(value + Decimal("0.5"))


class Favorite(TimeStampedModel):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites")
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name="favorited_by")

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=("user", "product"), name="unique_user_product_favorite"),
        ]
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.user.email} -> {self.product.name}"
