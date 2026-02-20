from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import CustomerViewSet, SaleViewSet, SaleLineViewSet

router = DefaultRouter()
router.register(r'customers', CustomerViewSet)
router.register(r'sales', SaleViewSet)
router.register(r'sale-lines', SaleLineViewSet)

urlpatterns = [
    path('', include(router.urls)),
]