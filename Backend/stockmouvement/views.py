from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from drf_spectacular.utils import extend_schema_view, extend_schema
from .models import Stock, StockMovement, Alert
from .serializers import StockSerializer, StockMovementSerializer, AlertSerializer


@extend_schema_view(
    list=extend_schema(tags=['stock'], summary='List stock levels'),
    create=extend_schema(tags=['stock'], summary='Create a stock record'),
    retrieve=extend_schema(tags=['stock'], summary='Get a stock record'),
    update=extend_schema(tags=['stock'], summary='Update a stock record'),
    partial_update=extend_schema(tags=['stock'], summary='Partially update a stock record'),
    destroy=extend_schema(tags=['stock'], summary='Delete a stock record'),
)
class StockViewSet(viewsets.ModelViewSet):
    queryset = Stock.objects.select_related('variant__product')
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['variant']
    search_fields = ['variant__sku', 'variant__product__name']
    ordering_fields = ['available_qty', 'on_hand_qty']
    ordering = ['-available_qty']


@extend_schema_view(
    list=extend_schema(tags=['stock'], summary='List stock movements'),
    create=extend_schema(tags=['stock'], summary='Record a stock movement'),
    retrieve=extend_schema(tags=['stock'], summary='Get a stock movement'),
    update=extend_schema(tags=['stock'], summary='Update a stock movement'),
    partial_update=extend_schema(tags=['stock'], summary='Partially update a stock movement'),
    destroy=extend_schema(tags=['stock'], summary='Delete a stock movement'),
)
class StockMovementViewSet(viewsets.ModelViewSet):
    queryset = StockMovement.objects.select_related('stock', 'sale_line', 'purchase_line')
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['movement_type', 'reason', 'stock', 'sale_line']
    ordering = ['-date']


@extend_schema_view(
    list=extend_schema(tags=['stock'], summary='List alerts'),
    create=extend_schema(tags=['stock'], summary='Create an alert'),
    retrieve=extend_schema(tags=['stock'], summary='Get an alert'),
    update=extend_schema(tags=['stock'], summary='Update an alert'),
    partial_update=extend_schema(tags=['stock'], summary='Partially update an alert'),
    destroy=extend_schema(tags=['stock'], summary='Delete an alert'),
)
class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.select_related('stock')
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['type', 'severite', 'estLue', 'estResolue', 'stock']
    ordering = ['-dateAlerte']
