from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.utils import timezone
from sale.models import SaleLine
from product.models import Variant
from .models import Stock, StockMovement, Alert, SystemSettings

# Création automatique d'une entrée de stock quand une nouvelle variante de produit est ajoutée
@receiver(post_save, sender=Variant)
def create_stock_for_new_variant(sender, instance, created, **kwargs):
    if created:
        Stock.objects.get_or_create(variant=instance)


@receiver(post_save, sender=SaleLine)
def handle_sale_line_creation(sender, instance, created, **kwargs):
    """
    Quand une ligne de vente est créée → créer mouvement de stock (le signal de StockMovement s'occupera du reste)
    """
    if not created:
        return

    variant = instance.variant
    if not variant:
        return

    # Récupérer ou créer l'enregistrement stock
    stock, _ = Stock.objects.get_or_create(variant=variant)

    # On ne met plus à jour le stock ici, on laisse le signal StockMovement s'en charger
    StockMovement.objects.create(
        stock=stock,
        sale_line=instance,
        user=instance.sale.user if instance.sale and instance.sale.user else None,
        movement_type="SORTIE",
        quantite=instance.quantity,
        reason="VENTE",
        notes=f"Vente #{instance.sale_id} - {instance.quantity} × {variant}"
    )


from django.db.models.signals import pre_delete

@receiver(pre_delete, sender=SaleLine)
def cleanup_movements_on_line_delete(sender, instance, **kwargs):
    """
    Avant de supprimer une ligne de vente, on transforme ses mouvements de stock de "SORTIE" en "ENTREE" (Retour Client).
    Cela restaure le stock et permet de garder une trace pour les indicateurs (KPI) de remboursement.
    """
    movements = instance.stock_movements.all()
    for movement in movements:
        if movement.movement_type == "SORTIE":
            # On transforme en retour
            movement.movement_type = "ENTREE"
            movement.reason = "RETOUR_CLIENT"
            movement.sale_line = None # Detach since the line is being deleted
            movement.notes = f"RETOUR: Vente #{instance.sale_id} - {instance.product}"
            movement.save() # This triggers handle_movement_update which restores stock correctly
        else:
            # Si c'était déjà une entrée ou autre, on le détache simplement pour garder l'info
            movement.sale_line = None
            movement.save()


@receiver(post_save, sender=StockMovement)
def update_stock_on_movement_save(sender, instance, created, **kwargs):
    """
    Met à jour la quantité en stock quand un mouvement est créé.
    Les mouvements sans stock (produit-niveau) n'affectent pas directement un variant.
    """
    if not created or not instance.stock_id:
        return

    try:
        stock = instance.stock
    except Stock.DoesNotExist:
        return
    
    if instance.movement_type == "ENTREE" or instance.movement_type == "AJUSTEMENT":
        stock.on_hand_qty += instance.quantite
    elif instance.movement_type == "SORTIE":
        stock.on_hand_qty -= instance.quantite
    
    stock.save()

    # Vérifier seuil d'alerte dynamique depuis les réglages système
    settings, _ = SystemSettings.objects.get_or_create(id=1)
    
    if settings.notify_low_stock and stock.available_qty <= settings.low_stock_threshold:
        # Déterminer la sévérité selon le seuil critique
        is_critical = stock.available_qty <= settings.critical_stock_threshold
        
        Alert.objects.create(
            stock=stock,
            type="stock_bas",
            severite="critical" if is_critical else "warning",
            titre="Rupture de Stock" if stock.available_qty <= 0 else ("Stock Critique" if is_critical else "Stock Faible"),
            message=f"Le stock pour {stock.variant} est de {stock.available_qty} unités (Seuil: {settings.low_stock_threshold}).",
            user=instance.user
        )


@receiver(post_delete, sender=StockMovement)
def update_stock_on_movement_delete(sender, instance, **kwargs):
    """
    Annule l'effet d'un mouvement quand il est supprimé.
    Les mouvements produit-niveau (stock=None) n'ont pas d'effet sur le stock variant.
    """
    if not instance.stock_id:
        return

    try:
        stock = instance.stock
    except Stock.DoesNotExist:
        return
    
    # Vérifier si le stock existe toujours en base
    if not Stock.objects.filter(pk=stock.pk).exists():
        return

    if instance.movement_type == "ENTREE" or instance.movement_type == "AJUSTEMENT":
        stock.on_hand_qty -= instance.quantite
    elif instance.movement_type == "SORTIE":
        stock.on_hand_qty += instance.quantite
    
    stock.save()


# Trick pour gérer les updates: stocker l'ancienne valeur dans pre_save
@receiver(pre_save, sender=StockMovement)
def store_old_movement_values(sender, instance, **kwargs):
    if instance.pk:
        try:
            old_instance = StockMovement.objects.get(pk=instance.pk)
            instance._old_quantite = old_instance.quantite
            instance._old_type = old_instance.movement_type
        except StockMovement.DoesNotExist:
            instance._old_quantite = None
    else:
        instance._old_quantite = None

@receiver(post_save, sender=StockMovement)
def handle_movement_update(sender, instance, created, **kwargs):
    """
    Gère la mise à jour des stocks lors de la modification d'un mouvement.
    """
    if not created and hasattr(instance, '_old_quantite') and instance._old_quantite is not None and instance.stock_id:
        try:
            stock = instance.stock
        except Stock.DoesNotExist:
            return
        # Annuler l'ancien impact
        if instance._old_type == "ENTREE" or instance._old_type == "AJUSTEMENT":
            stock.on_hand_qty -= instance._old_quantite
        else:
            stock.on_hand_qty += instance._old_quantite
        
        # Appliquer le nouveau
        if instance.movement_type == "ENTREE" or instance.movement_type == "AJUSTEMENT":
            stock.on_hand_qty += instance.quantite
        else:
            stock.on_hand_qty -= instance.quantite
        
        stock.save()


# Recalcul available_qty à chaque sauvegarde de Stock
@receiver(pre_save, sender=Stock)
def ensure_available_qty(sender, instance, **kwargs):
    instance.available_qty = instance.on_hand_qty - instance.reserved_qty