import os
import sys
import django
import datetime

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gestion_softcosy.settings')
django.setup()

from product.models import Product, Variant
from purchase.models import Purchase

print("Starting definitive reset of codes starting from 1...")

# Reset Products
products = Product.objects.all().order_by('id')
for i, p in enumerate(products, 1):
    new_code = f"PROD-{i:05d}"
    if p.code_produit != new_code:
        p.code_produit = new_code
        p.save(update_fields=['code_produit'])
print(f"Processed {len(products)} products.")

# Reset Variants
variants = Variant.objects.all().order_by('id')
for i, v in enumerate(variants, 1):
    new_sku = f"SKU-{i:05d}"
    if v.sku != new_sku:
        v.sku = new_sku
        v.save(update_fields=['sku'])
print(f"Processed {len(variants)} variants.")

# Reset Purchases
purchases = Purchase.objects.all().order_by('id')
for i, p in enumerate(purchases, 1):
    year = p.created_at.year if p.created_at else datetime.datetime.now().year
    new_ref = f"CMD-{year}-{i:04d}"
    if p.reference != new_ref:
        p.reference = new_ref
        p.save(update_fields=['reference'])
print(f"Processed {len(purchases)} purchases.")

print("All codes have been perfectly re-indexed.")
