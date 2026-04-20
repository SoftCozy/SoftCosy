
import os
import django
import json
from datetime import date, datetime

def default(obj):
    if isinstance(obj, (date, datetime)):
        return obj.isoformat()
    raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gestion_softcosy.settings')
django.setup()

from dashboard.views import DashboardViewSet
from rest_framework.test import APIRequestFactory, force_authenticate
from user.models import User

user = User.objects.first()
factory = APIRequestFactory()

print("Testing Recent Data...")
request = factory.get('/api/dashboard/recent_data/')
force_authenticate(request, user=user)
view = DashboardViewSet.as_view({'get': 'recent_data'})
response = view(request)
print(json.dumps(response.data, indent=2, default=default))

print("\nTesting Charts...")
request_charts = factory.get('/api/dashboard/charts/')
force_authenticate(request_charts, user=user)
view_charts = DashboardViewSet.as_view({'get': 'charts'})
response_charts = view_charts(request_charts)
print(json.dumps(response_charts.data, indent=2, default=default))

print("\nTesting Summary...")
request_summary = factory.get('/api/dashboard/summary/')
force_authenticate(request_summary, user=user)
view_summary = DashboardViewSet.as_view({'get': 'summary'})
response_summary = view_summary(request_summary)
print(json.dumps(response_summary.data, indent=2, default=default))
