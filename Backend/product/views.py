from django.shortcuts import render

from rest_framework import viewsets
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import AllowAny

from .models import Category, Product, Variant
from .serializers import (
    CategorySerializer,
    ProductListSerializer,
    ProductDetailSerializer,
    ProductFullSerializer,
    VariantSerializer,
)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class VariantViewSet(viewsets.ModelViewSet):
    queryset = Variant.objects.select_related('product')
    serializer_class = VariantSerializer
    permission_classes = [AllowAny]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['sku', 'barcode', 'model']


class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.select_related('category').prefetch_related('variants')
    permission_classes = [AllowAny]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['name', 'code_produit', 'variants__sku']
    ordering_fields = ['name']
    ordering = ['name']

    def get_queryset(self):
        queryset = super().get_queryset()
        category_id = self.request.query_params.get('category_id')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        return queryset.distinct()

    def get_serializer_class(self):
        if self.action == 'list':
            return ProductDetailSerializer
        if self.action == 'retrieve':
            return ProductDetailSerializer
        # Pour create, update, partial_update → on utilise le serializer FULL writable
        if self.action in ['create', 'update', 'partial_update']:
            return ProductFullSerializer
        return super().get_serializer_class()