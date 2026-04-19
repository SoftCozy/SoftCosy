from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.contenttypes.models import ContentType
from .models import AuditLog
from product.models import Product, Category, Variant
from sale.models import Sale, SaleLine
from stockmouvement.models import StockMovement

def log_action(instance, action, user=None):
    """Aide pour créer un log d'audit"""
    AuditLog.objects.create(
        user=user,
        action=action,
        enitity=instance._meta.db_table,
        object_id=instance.pk,
        # On pourrait ajouter data_before/after ici si on avait un mécanisme de suivi
    )

@receiver(post_save, sender=Product)
@receiver(post_save, sender=Category)
@receiver(post_save, sender=Variant)
@receiver(post_save, sender=Sale)
@receiver(post_save, sender=StockMovement)
def audit_post_save(sender, instance, created, **kwargs):
    action = "create" if created else "update"
    # Note: On n'a pas accès facilement au 'request.user' dans un signal
    # sans middleware spécifique, donc user sera souvent None ici
    log_action(instance, action)

@receiver(post_delete, sender=Product)
@receiver(post_delete, sender=Category)
@receiver(post_delete, sender=Variant)
@receiver(post_delete, sender=Sale)
@receiver(post_delete, sender=StockMovement)
def audit_post_delete(sender, instance, **kwargs):
    log_action(instance, "delete")
