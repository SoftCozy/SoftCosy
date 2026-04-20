import os
import sys
import django
import datetime

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gestion_softcosy.settings')
django.setup()

from product.models import Variant
from purchase.models import Purchase

print("Starting reset of SKUs and References...")

# Reset Variants
variants = Variant.objects.all().order_by('id')
count_v = 0
for v in variants:
    new_sku = f"SKU-{v.id:05d}"
    if v.sku != new_sku:
        v.sku = new_sku
        v.save(update_fields=['sku'])
        count_v += 1

print(f"Updated {count_v} variants.")

# Reset Purchases
purchases = Purchase.objects.all().order_by('id')
count_p = 0
for p in purchases:
    year = p.created_at.year if p.created_at else datetime.datetime.now().year
    new_ref = f"CMD-{year}-{p.id:04d}"
    if p.reference != new_ref:
        p.reference = new_ref
        p.save(update_fields=['reference'])
        count_p += 1

print(f"Updated {count_p} purchases.")
print("Done.")
