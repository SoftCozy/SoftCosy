from django.db import models


class Supplier(models.Model):
	id = models.AutoField(primary_key=True)
	name = models.CharField(max_length=255)
	phone = models.CharField(max_length=32, blank=True, null=True)
	address = models.CharField(max_length=255, blank=True, null=True)
	created_at = models.DateField(blank=True, null=True)

	class Meta:
		db_table = "supplier"
		verbose_name = "Supplier"
		verbose_name_plural = "Suppliers"

	def __str__(self):
		return self.name or f"Supplier {self.id}"


class Purchase(models.Model):
	"""Purchase model (Purshase in ERD)"""

	id = models.AutoField(primary_key=True)
	reference = models.CharField(max_length=120, blank=True, null=True)
	sub_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	purchase_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	purchased_at = models.DateField(blank=True, null=True)
	status = models.CharField(max_length=32, blank=True, null=True)
	notes = models.TextField(blank=True, null=True)
	supplier = models.ForeignKey("purchase.Supplier", on_delete=models.SET_NULL, null=True, blank=True, related_name="purchases")
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		db_table = "purchase"
		verbose_name = "Purchase"
		verbose_name_plural = "Purchases"
		ordering = ["-id"]

	def __str__(self):
		return self.reference or f"Purchase {self.id}"


class PurchaseLine(models.Model):
	id = models.AutoField(primary_key=True)
	purchase = models.ForeignKey("purchase.Purchase", on_delete=models.CASCADE, related_name="lines")
	product = models.ForeignKey("product.Product", on_delete=models.PROTECT, related_name="purchase_lines")
	variant = models.ForeignKey("product.Variant", on_delete=models.PROTECT, null=True, blank=True, related_name="purchase_lines")
	quantity = models.IntegerField(default=0)
	unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	line_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
	note = models.CharField(max_length=255, blank=True, null=True)
	created_at = models.DateTimeField(auto_now_add=True)

	class Meta:
		db_table = "purchaseline"
		verbose_name = "Purchase Line"
		verbose_name_plural = "Purchase Lines"

	def __str__(self):
		return f"PurchaseLine {self.id} (Purchase {self.purchase_id})"

