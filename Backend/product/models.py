from django.db import models


class Product(models.Model):
	"""Produit model mapped from ERD"""

	id = models.AutoField(primary_key=True)
	name = models.CharField(max_length=255)
	description = models.TextField(blank=True, null=True)
	code_produit = models.CharField(max_length=100, blank=True, null=True)
	image_url = models.CharField(max_length=255, blank=True, null=True)
	image = models.ImageField(upload_to='products/images/', null=True, blank=True)

	category = models.ForeignKey("product.Category", on_delete=models.SET_NULL, null=True, blank=True, related_name="products")

	class Meta:
		db_table = "product"
		verbose_name = "Product"
		verbose_name_plural = "Products"
		ordering = ["name"]

	def save(self, *args, **kwargs):
		if not self.id and not self.code_produit:
			last_p = Product.objects.all().order_by('id').last()
			if last_p and last_p.code_produit and last_p.code_produit.startswith('PROD-'):
				try:
					last_num = int(last_p.code_produit.split('-')[1])
					self.code_produit = f"PROD-{last_num + 1:05d}"
				except:
					pass
			if not self.code_produit:
				self.code_produit = "PROD-00001"
		super().save(*args, **kwargs)

	def __str__(self):
		return self.name or f"Product {self.id}"


class Category(models.Model):
	id = models.AutoField(primary_key=True)
	name = models.CharField(max_length=255)
	description = models.TextField(blank=True, null=True)
	image_url = models.CharField(max_length=255, blank=True, null=True)
	created_at = models.DateTimeField(auto_now=True, null=False)

	class Meta:
		db_table = "category"
		verbose_name = "Category"
		verbose_name_plural = "Categories"

	def __str__(self):
		return self.name or f"Category {self.id}"


class Variant(models.Model):
	"""Product Variant model (variantes de produit) mapped from ERD"""

	id = models.AutoField(primary_key=True)
	product = models.ForeignKey("product.Product", on_delete=models.CASCADE, related_name="variants")
	sku = models.CharField(max_length=100, blank=True, null=True)
	barcode = models.CharField(max_length=100, blank=True, null=True)
	model = models.CharField(max_length=255, blank=True, null=True)
	size = models.CharField(max_length=100, blank=True, null=True)
	selling_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
	cost_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
	attributes = models.JSONField(null=True, blank=True)
	is_active = models.BooleanField(default=True)
	created_or_updated_at = models.DateField(auto_now=True, null=False)

	def save(self, *args, **kwargs):
		if not self.id and not self.sku:
			last_v = Variant.objects.all().order_by('id').last()
			if last_v and last_v.sku and last_v.sku.startswith('SKU-'):
				try:
					last_num = int(last_v.sku.split('-')[1])
					self.sku = f"SKU-{last_num + 1:05d}"
				except:
					pass
			if not self.sku:
				self.sku = "SKU-00001"
		super().save(*args, **kwargs)

	class Meta:
		db_table = "variant"
		verbose_name = "Product Variant"
		verbose_name_plural = "Product Variants"

	def __str__(self):
		return f"{self.product.name} - {self.sku}" if self.sku else f"{self.product.name} (Variant {self.id})"
