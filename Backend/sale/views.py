from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from .models import Customer, Sale, SaleLine
from .serializers import (
    CustomerSerializer,
    SaleListSerializer,
    SaleDetailSerializer,
    SaleCreateUpdateSerializer,
    SaleLineSerializer,
)


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    search_fields = ['name', 'phone']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class SaleLineViewSet(viewsets.ModelViewSet):
    queryset = SaleLine.objects.select_related('sale', 'product', 'variant')
    serializer_class = SaleLineSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filterset_fields = ['sale', 'product', 'variant']


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.select_related('customer', 'user').prefetch_related('lines')
    permission_classes = [IsAuthenticatedOrReadOnly]
    search_fields = ['invoice_number', 'customer__name']
    ordering_fields = ['-id', 'sold_at', 'total']
    ordering = ['-id']

    def get_serializer_class(self):
        if self.action == 'list':
            return SaleListSerializer
        if self.action == 'retrieve':
            return SaleDetailSerializer
        if self.action in ['create', 'update', 'partial_update']:
            return SaleCreateUpdateSerializer
        return super().get_serializer_class()