from rest_framework import serializers
from django.db import transaction
from .models import Supplier, Purchase, PurchaseLine
from product.serializers import ProductListSerializer, VariantSerializer   # ← à adapter selon ton app


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = ['id', 'name', 'phone', 'address', 'created_at']
        read_only_fields = ['id', 'created_at']


class PurchaseLineSerializer(serializers.ModelSerializer):
    # Si tu veux afficher les infos produit/variante en lecture
    product_detail = ProductListSerializer(source='product', read_only=True)
    variant_detail = VariantSerializer(source='variant', read_only=True, required=False)

    class Meta:
        model = PurchaseLine
        fields = [
            'id',
            'purchase',           # sera en read_only lors de la création nested
            'product',
            'variant',
            'quantity',
            'unit_cost',
            'line_cost',
            'note',
            'created_at',
            'product_detail',
            'variant_detail',
        ]
        read_only_fields = ['id', 'created_at', 'purchase', 'line_cost']


class PurchaseListSerializer(serializers.ModelSerializer):
    supplier = SupplierSerializer(read_only=True)

    class Meta:
        model = Purchase
        fields = [
            'id',
            'reference',
            'sub_total',
            'purchase_cost',
            'total',
            'purchased_at',
            'status',
            'notes',
            'supplier',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'sub_total', 'total']


class PurchaseDetailSerializer(serializers.ModelSerializer):
    supplier = SupplierSerializer(read_only=True)
    lines = PurchaseLineSerializer(many=True, read_only=True)

    class Meta:
        model = Purchase
        fields = [
            'id',
            'reference',
            'sub_total',
            'purchase_cost',
            'total',
            'purchased_at',
            'status',
            'notes',
            'supplier',
            'created_at',
            'lines',
        ]
        read_only_fields = ['id', 'created_at', 'sub_total', 'total']


class PurchaseCreateUpdateSerializer(serializers.ModelSerializer):
    lines = PurchaseLineSerializer(many=True, required=False)

    class Meta:
        model = Purchase
        fields = [
            'id',
            'reference',
            'purchased_at',
            'status',
            'notes',
            'supplier',
            'lines',
        ]
        read_only_fields = ['id', 'sub_total', 'purchase_cost', 'total']

    def validate_lines(self, value):
        if not value:
            raise serializers.ValidationError("Une commande doit contenir au moins une ligne.")
        return value

    def calculate_line_cost(self, line_data):
        qty = line_data.get('quantity', 0)
        unit_cost = line_data.get('unit_cost', 0)
        return qty * unit_cost

    @transaction.atomic
    def create(self, validated_data):
        lines_data = validated_data.pop('lines', [])

        purchase = Purchase.objects.create(**validated_data)

        sub_total = 0

        for line_data in lines_data:
            line_cost = self.calculate_line_cost(line_data)
            line_data['line_cost'] = line_cost

            PurchaseLine.objects.create(
                purchase=purchase,
                **line_data
            )
            sub_total += line_cost

        purchase.sub_total = sub_total
        purchase.purchase_cost = sub_total   # si pas de frais supplementaires
        purchase.total = sub_total           # idem
        purchase.save(update_fields=['sub_total', 'purchase_cost', 'total'])

        return purchase

    def _trigger_stock_reception(self, purchase, user=None):
        """
        Quand un achat passe au statut RECU, cree des mouvements de stock ENTREE
        pour chaque ligne.
        - Si la ligne a une variante: mouvement lie a la variante (Stock + StockMovement normal)
        - Si le produit n'a aucune variante: mouvement lie au produit directement (product-level)
          L'utilisateur pourra allouer ce stock aux variantes plus tard depuis la page Stocks.
        """
        from stockmouvement.models import Stock, StockMovement

        for line in purchase.lines.select_related('variant', 'product').all():
            target_variant = line.variant

            if not target_variant:
                # Chercher une variante existante pour ce produit
                target_variant = line.product.variants.first()

            if target_variant:
                # Mouvement normal lie a une variante specifique
                stock, _ = Stock.objects.get_or_create(variant=target_variant)
                StockMovement.objects.create(
                    stock=stock,
                    purchase_line=line,
                    user=user,
                    movement_type="ENTREE",
                    quantite=line.quantity,
                    reason="ACHAT_FOURNISSEUR",
                    notes=f"Reception achat {purchase.reference} - {line.quantity} x {target_variant}"
                )
            else:
                # Aucune variante: mouvement niveau produit (stock=None, product=...)
                # Le stock est enregistre au niveau produit et sera distribue aux variantes plus tard
                StockMovement.objects.create(
                    product=line.product,
                    stock=None,
                    purchase_line=line,
                    user=user,
                    movement_type="ENTREE",
                    quantite=line.quantity,
                    reason="ACHAT_FOURNISSEUR",
                    notes=f"Reception achat {purchase.reference} - {line.quantity} x {line.product.name} (sans variante)"
                )


    @transaction.atomic
    def update(self, instance, validated_data):
        lines_data = validated_data.pop('lines', None)

        # Capturer l'ancien statut avant de l'ecraser
        old_status = instance.status
        new_status = validated_data.get('status', old_status)

        # Mise a jour champs simples
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if lines_data is not None:
            # Approche simple : on supprime et recree les lignes
            instance.lines.all().delete()

            sub_total = 0

            for line_data in lines_data:
                line_cost = self.calculate_line_cost(line_data)
                line_data['line_cost'] = line_cost

                PurchaseLine.objects.create(
                    purchase=instance,
                    **line_data
                )
                sub_total += line_cost

            instance.sub_total = sub_total
            instance.purchase_cost = sub_total
            instance.total = sub_total

        # TOUJOURS sauvegarder pour persister le statut et les autres champs
        instance.save()

        # Si le statut vient de passer a RECU, declencher la reception du stock
        if new_status == 'RECU' and old_status != 'RECU':
            request = self.context.get('request')
            user = request.user if request else None
            self._trigger_stock_reception(instance, user=user)

        return instance