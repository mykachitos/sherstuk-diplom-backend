from django.urls import path

from apps.catalog.views import (
    CategoryListAPIView,
    FavoriteDeleteAPIView,
    FavoriteListCreateAPIView,
    ProductDetailAPIView,
    ProductListAPIView,
)


urlpatterns = [
    path("categories/", CategoryListAPIView.as_view(), name="category-list"),
    path("products/", ProductListAPIView.as_view(), name="product-list"),
    path("products/<int:pk>/", ProductDetailAPIView.as_view(), name="product-detail"),
    path("favorites/", FavoriteListCreateAPIView.as_view(), name="favorite-list-create"),
    path("favorites/<int:product_id>/", FavoriteDeleteAPIView.as_view(), name="favorite-delete"),
]

