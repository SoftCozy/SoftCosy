
import os
import django
from django.utils import timezone

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gestion_softcosy.settings')
django.setup()

from sale.models import Sale

sales_to_fix = Sale.objects.filter(sold_at__isnull=True)
count = sales_to_fix.count()
for sale in sales_to_fix:
    sale.sold_at = sale.created_at or timezone.now()
    sale.save()

print(f"Fixed {count} sales with null sold_at.")
