from django.urls import path

from apps.orders.views import OrderDetailAPIView, OrderListCreateAPIView


urlpatterns = [
    path("", OrderListCreateAPIView.as_view(), name="order-list-create"),
    path("<int:pk>/", OrderDetailAPIView.as_view(), name="order-detail"),
]

