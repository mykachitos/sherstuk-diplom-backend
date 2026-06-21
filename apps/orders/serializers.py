from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from apps.catalog.models import Product
from apps.orders.models import Order, OrderItem


class OrderItemReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product",
            "product_name",
            "product_price",
            "product_weight",
            "product_image_url",
            "quantity",
        )


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemReadSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            "id",
            "number",
            "status",
            "delivery_method",
            "contact_name",
            "phone",
            "address",
            "comment",
            "subtotal",
            "delivery_price",
            "total",
            "personal_data_consent",
            "created_at",
            "items",
        )


class OrderItemInputSerializer(serializers.Serializer):
    product_id = serializers.PrimaryKeyRelatedField(queryset=Product.objects.filter(is_active=True), source="product")
    quantity = serializers.IntegerField(min_value=1, default=1)


class OrderCreateSerializer(serializers.Serializer):
    contact_name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=32)
    delivery_method = serializers.ChoiceField(choices=Order.DeliveryMethod.choices)
    address = serializers.CharField(required=False, allow_blank=True)
    comment = serializers.CharField(required=False, allow_blank=True)
    personal_data_consent = serializers.BooleanField()
    items = OrderItemInputSerializer(many=True)

    def validate_personal_data_consent(self, value):
        if not value:
            raise serializers.ValidationError("Нужно согласие на обработку персональных данных.")
        return value

    def validate(self, attrs):
        if attrs["delivery_method"] == Order.DeliveryMethod.DELIVERY and not attrs.get("address"):
            raise serializers.ValidationError({"address": "Укажите адрес доставки."})
        if not attrs["items"]:
            raise serializers.ValidationError({"items": "Добавьте хотя бы один товар."})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        user = self.context["request"].user
        items_data = validated_data.pop("items")
        delivery_method = validated_data["delivery_method"]
        delivery_price = Decimal("300.00") if delivery_method == Order.DeliveryMethod.DELIVERY else Decimal("0.00")
        subtotal = sum(item["product"].price * item["quantity"] for item in items_data)

        order = Order.objects.create(
            user=user,
            subtotal=subtotal,
            delivery_price=delivery_price,
            total=subtotal + delivery_price,
            **validated_data,
        )

        order_items = [
          OrderItem(
              order=order,
              product=item["product"],
              product_name=item["product"].name,
              product_price=item["product"].price,
              product_weight=item["product"].weight,
              product_image_url=item["product"].image_url,
              quantity=item["quantity"],
          )
          for item in items_data
        ]
        OrderItem.objects.bulk_create(order_items)
        return order
