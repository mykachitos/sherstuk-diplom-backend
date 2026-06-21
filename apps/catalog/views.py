from django.db.models import Count, F
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Category, Favorite, Product
from apps.catalog.serializers import CategorySerializer, FavoriteSerializer, ProductSerializer


class CategoryListAPIView(generics.ListAPIView):
    queryset = Category.objects.annotate(product_count=Count("products")).all()
    serializer_class = CategorySerializer
    pagination_class = None


class ProductListAPIView(generics.ListAPIView):
    serializer_class = ProductSerializer
    pagination_class = None

    def get_queryset(self):
        queryset = Product.objects.filter(is_active=True).select_related("category")
        category_slug = self.request.query_params.get("category")
        featured = self.request.query_params.get("featured")
        discounted = self.request.query_params.get("discounted")
        month = self.request.query_params.get("month")
        search = self.request.query_params.get("search")
        sort = self.request.query_params.get("sort")

        if category_slug:
            queryset = queryset.filter(category__slug=category_slug)
        if featured in {"1", "true", "yes"}:
            queryset = queryset.exclude(badge="")
        if discounted in {"1", "true", "yes"}:
            queryset = queryset.filter(original_price__isnull=False, original_price__gt=F("price"))
        if month in {"1", "true", "yes"}:
            queryset = queryset.filter(is_month_pick=True)
        if search:
            queryset = queryset.filter(name__icontains=search)

        if sort == "price_asc":
            queryset = queryset.order_by("price", "name")
        elif sort == "price_desc":
            queryset = queryset.order_by("-price", "name")
        elif sort == "name":
            queryset = queryset.order_by("name")
        elif sort == "newest":
            queryset = queryset.order_by("-created_at", "name")
        elif sort == "month":
            queryset = queryset.order_by("-is_month_pick", "name")
        elif discounted in {"1", "true", "yes"}:
            queryset = queryset.order_by("price", "name")

        return queryset


class ProductDetailAPIView(generics.RetrieveAPIView):
    queryset = Product.objects.filter(is_active=True).select_related("category")
    serializer_class = ProductSerializer


class FavoriteListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = FavoriteSerializer
    pagination_class = None

    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user).select_related("product", "product__category")


class FavoriteDeleteAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, product_id):
        deleted, _ = Favorite.objects.filter(user=request.user, product_id=product_id).delete()
        if not deleted:
            return Response({"detail": "Товар не найден в избранном."}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)
