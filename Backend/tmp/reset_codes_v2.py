import os
import sys
import django
import datetime

sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gestion_softcosy.settings')
django.setup()

from product.models import Product, Variant

print("Starting thorough reset of codes starting from 1...")

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

print("Done.")
