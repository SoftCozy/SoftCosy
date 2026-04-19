from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from sale.models import SaleLine
from .models import Stock, StockMovement


@receiver(post_save, sender=SaleLine)
def handle_sale_line_creation(sender, instance, created, **kwargs):
    """
    When a sale line is created: decrease stock, record movement, email alert if low.
    """
    if not created:
        return

    variant = instance.variant
    if not variant:
        return

    stock, _ = Stock.objects.get_or_create(variant=variant)

    quantity_sold = instance.quantity

    stock.on_hand_qty -= quantity_sold
    stock.available_qty = stock.on_hand_qty - stock.reserved_qty
    stock.last_counted_at = timezone.now().date()
    stock.save()

    StockMovement.objects.create(
        stock=stock,
        sale_line=instance,
        user=instance.sale.user if instance.sale and instance.sale.user else None,
        movement_type="SORTIE",
        quantite=quantity_sold,
        reason="VENTE",
        notes=f"Vente #{instance.sale_id} - {instance.quantity} × {variant}"
    )

    if stock.available_qty <= 5:
        severite = "CRITICAL" if stock.available_qty <= 0 else "WARNING"
        subject = f"[SoftCosy] {severite} — Stock faible : {variant}"
        message = (
            f"Alerte stock — {severite}\n\n"
            f"Produit  : {variant}\n"
            f"Stock disponible : {stock.available_qty} unité(s)\n"
            f"Seuil   : 5 unités\n\n"
            f"Vente concernée : #{instance.sale_id}\n"
            f"Date            : {timezone.now().strftime('%Y-%m-%d %H:%M')} UTC\n\n"
            "Veuillez réapprovisionner ce produit dès que possible."
        )
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.ADMIN_NOTIFY_EMAIL],
            fail_silently=True,
        )


@receiver(pre_save, sender=Stock)
def ensure_available_qty(sender, instance, **kwargs):
    instance.available_qty = instance.on_hand_qty - instance.reserved_qty
