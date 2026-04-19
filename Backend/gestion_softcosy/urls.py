"""
URL configuration for gestion_softcosy project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from user.views import CustomObtainAuthToken
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),
    # API schema & interactive docs
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/', include('product.urls')),
    path('api/', include('user.urls')),
    path('api/', include('sale.urls')),
    path('api/', include('stockmouvement.urls')),
    path('api/', include('purchase.urls')),
    path('api/', include('inventorycount.urls')),
    path('api/', include('audit.urls')),
    path('api/token/', CustomObtainAuthToken.as_view(), name='api_token_auth'),
    path('__debug__/', include('debug_toolbar.urls')),
]