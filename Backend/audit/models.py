from django.db import models


class AuditLog(models.Model):
	"""Audit Log model for tracking system actions (Journal d'audit)"""

	ACTION_CHOICES = (
		("create", "Create"),
		("update", "Update"),
		("delete", "Delete"),
		("read", "Read"),
	)

	id = models.AutoField(primary_key=True)
	user = models.ForeignKey("user.User", on_delete=models.SET_NULL, null=True, blank=True, related_name="audit_logs")
	action = models.CharField(max_length=20, choices=ACTION_CHOICES)
	enitity = models.CharField(max_length=255, help_text="Table name")
	object_id = models.IntegerField(null=True, blank=True)
	data_before = models.JSONField(null=True, blank=True)
	data_after = models.JSONField(null=True, blank=True)
	perform_at = models.DateField(auto_now_add=True)
	user_agent = models.CharField(max_length=512, blank=True, null=True)

	class Meta:
		db_table = "auditlog"
		verbose_name = "Audit Log"
		verbose_name_plural = "Audit Logs"
		ordering = ["-perform_at", "-id"]

	def __str__(self):
		return f"AuditLog: {self.action.upper()} on {self.enitity} (ID: {self.object_id})"
