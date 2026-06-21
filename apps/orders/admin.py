from django.contrib import admin

from apps.orders.models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product_name", "product_price", "product_weight", "product_image_url", "quantity")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ("number", "user", "status", "delivery_method", "total", "created_at")
    list_filter = ("status", "delivery_method", "created_at")
    search_fields = ("number", "user__email", "contact_name", "phone")
    inlines = [OrderItemInline]

