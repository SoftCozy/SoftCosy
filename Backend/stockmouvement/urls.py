from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import StockViewSet, StockMovementViewSet, AlertViewSet, SystemSettingsViewSet

router = SimpleRouter()
router.register(r'stocks', StockViewSet)
router.register(r'stock-movements', StockMovementViewSet)
router.register(r'alerts', AlertViewSet)
router.register(r'settings', SystemSettingsViewSet, basename='system-settings')

urlpatterns = [
    path('', include(router.urls)),
]