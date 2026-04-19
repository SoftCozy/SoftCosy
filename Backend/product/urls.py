from django.urls import path, include
from rest_framework.routers import SimpleRouter

from .views import CategoryViewSet, ProductViewSet, VariantViewSet

router = SimpleRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'products', ProductViewSet)
router.register(r'variants', VariantViewSet)

urlpatterns = [
    path('', include(router.urls)),
]