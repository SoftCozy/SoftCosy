
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gestion_softcosy.settings')
django.setup()

from sale.models import Sale, SaleLine
from stockmouvement.models import StockMovement, Alert
from audit.models import AuditLog

print(f"Sales count: {Sale.objects.count()}")
print(f"SaleLines count: {SaleLine.objects.count()}")
print(f"StockMovements count: {StockMovement.objects.count()}")
print(f"AuditLogs count: {AuditLog.objects.count()}")
print(f"Alerts count: {Alert.objects.count()}")

if Sale.objects.exists():
    s = Sale.objects.first()
    print(f"First sale sold_at: {s.sold_at}")

if StockMovement.objects.exists():
    m = StockMovement.objects.first()
    print(f"First movement date: {m.date}")
