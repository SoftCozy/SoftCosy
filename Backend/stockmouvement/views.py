from django.shortcuts import render

# Create your views here.
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Stock, StockMovement, Alert, SystemSettings
from .serializers import StockSerializer, StockMovementSerializer, AlertSerializer, SystemSettingsSerializer

# Vue pour gérer l'inventaire (Stocks) - Accès réservé aux utilisateurs authentifiés
class StockViewSet(viewsets.ModelViewSet):
    queryset = Stock.objects.select_related('variant__product')
    serializer_class = StockSerializer
    permission_classes = [IsAuthenticated] 
    filterset_fields = ['variant']
    search_fields = ['variant__sku', 'variant__product__name']
    ordering_fields = ['available_qty', 'on_hand_qty']
    ordering = ['-available_qty']


# Vue pour gérer les mouvements de stock - Accès réservé aux utilisateurs authentifiés
class StockMovementViewSet(viewsets.ModelViewSet):
    queryset = StockMovement.objects.select_related(
        'stock__variant__product',
        'product',
        'sale_line__product',
        'purchase_line__product',
        'user'
    )
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated] 
    filterset_fields = ['movement_type', 'reason', 'stock', 'sale_line', 'product']
    ordering = ['-date']


# Vue pour gérer les alertes - Accès réservé aux utilisateurs authentifiés
class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.select_related('stock')
    serializer_class = AlertSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['type', 'severite', 'estLue', 'estResolue', 'stock']
    ordering = ['-dateAlerte']


class SystemSettingsViewSet(viewsets.ModelViewSet):
    queryset = SystemSettings.objects.all()
    serializer_class = SystemSettingsSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get', 'patch'])
    def current(self, request):
        obj, _ = SystemSettings.objects.get_or_create(id=1)
        if request.method == 'PATCH':
            serializer = self.get_serializer(obj, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        
        serializer = self.get_serializer(obj)
        return Response(serializer.data)