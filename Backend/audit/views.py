from django.shortcuts import render

# Create your views here.
# audit/views.py
from rest_framework import viewsets
from rest_framework.permissions import IsAdminUser
from drf_spectacular.utils import extend_schema_view, extend_schema
from .models import AuditLog
from .serializers import AuditLogSerializer


@extend_schema_view(
    list=extend_schema(tags=['audit'], summary='List audit logs (admin only)'),
    retrieve=extend_schema(tags=['audit'], summary='Get an audit log entry (admin only)'),
)
class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Consultation du journal d'audit - lecture seule - réservé aux admins
    """
    queryset = AuditLog.objects.select_related('user').order_by('-perform_at')
    serializer_class = AuditLogSerializer
    permission_classes = [IsAdminUser]
    filterset_fields = ['action', 'entity', 'user', 'perform_at__date']
    search_fields = ['user__email', 'entity', 'action']
    ordering_fields = ['perform_at']
    ordering = ['-perform_at']
