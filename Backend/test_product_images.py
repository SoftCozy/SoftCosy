
import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gestion_softcosy.settings')
django.setup()

from product.views import ProductViewSet
from rest_framework.test import APIRequestFactory, force_authenticate
from user.models import User

user = User.objects.first()
factory = APIRequestFactory()
request = factory.get('/api/products/')
force_authenticate(request, user=user)

view = ProductViewSet.as_view({'get': 'list'})
response = view(request)
print("PRODUCT LIST RESPONSE (first item):")
if response.data['results']:
    print(json.dumps(response.data['results'][0], indent=2))
else:
    print("No products found.")
