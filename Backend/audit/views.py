from django.shortcuts import render

# Create your views here.
# audit/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser
from .models import AuditLog
from .serializers import AuditLogSerializer


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Consultation du journal d'audit – lecture seule – réservé aux admins
    """
    queryset = AuditLog.objects.select_related('user').order_by('-perform_at')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ['action', 'entity', 'user', 'perform_at__date']
    search_fields = ['user__email', 'entity', 'action']
    ordering_fields = ['perform_at']
    ordering = ['-perform_at']