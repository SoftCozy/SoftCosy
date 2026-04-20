from rest_framework import serializers
from .models import Category, Product, Variant
from django.db import transaction


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = [
            'id',
            'name',
            'description',
            'image_url',
            'created_at',
        ]
        read_only_fields = ['created_at']


class VariantSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    selling_price = serializers.FloatField()
    stock = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Variant
        fields = [
            'id',
            'product',
            'sku',
            'barcode',
            'model',
            'size',
            'selling_price',
            'cost_price',
            'attributes',
            'is_active',
            'created_or_updated_at',
            'stock',
        ]
        read_only_fields = ['created_or_updated_at', 'product', 'stock']

    def get_stock(self, obj):
        # Somme des stocks on_hand_qty pour cette variante
        # On utilise le related_name 'stocks' défini dans stockmouvement.models.Stock
        return sum(s.on_hand_qty for s in obj.stocks.all())


class ProductListSerializer(serializers.ModelSerializer):
    """Version légère pour la liste"""
    category = CategorySerializer(read_only=True)   # nested → on voit la catégorie
    total_stock = serializers.SerializerMethodField()
    variants = VariantSerializer(many=True, read_only=True)
    
    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'description',
            'code_produit',
            'image_url',
            'image',
            'category',
            'total_stock',
            'variants',
        ]
    
    def get_total_stock(self, obj):
        # Récupérer tous les stocks liés à toutes les variantes du produit
        from stockmouvement.models import Stock
        from django.db.models import Sum
        return Stock.objects.filter(variant__product=obj).aggregate(Sum('on_hand_qty'))['on_hand_qty__sum'] or 0


class ProductDetailSerializer(serializers.ModelSerializer):
    """Version complète avec les variantes imbriquées"""
    category = CategorySerializer(read_only=True)
    variants = VariantSerializer(many=True, read_only=True)
    total_stock = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = [
            'id',
            'name',
            'description',
            'code_produit',
            'image_url',
            'image',
            'category',
            'variants',
            'total_stock',
        ]
    
    def get_total_stock(self, obj):
        from stockmouvement.models import Stock
        from django.db.models import Sum
        return Stock.objects.filter(variant__product=obj).aggregate(Sum('on_hand_qty'))['on_hand_qty__sum'] or 0
    
# ── Serializer principal pour CREATE / UPDATE complet (avec variantes writable)
class ProductFullSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)          # ← read-only pour l'affichage
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        write_only=True,
        required=False,
        allow_null=True
    )  # ← on accepte category_id en écriture

    variants = VariantSerializer(many=True, required=False)  # ← nested writable !

    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'code_produit', 'image_url', 'image',
            'category', 'category_id', 'variants'
        ]
        read_only_fields = ['id']

    def to_internal_value(self, data):
        # Si 'variants' est une chaîne (JSON envoyé via FormData), on la parse
        if 'variants' in data and isinstance(data['variants'], str):
            import json
            try:
                # Créer une copie mutable du dictionnaire si nécessaire
                if hasattr(data, 'dict'):
                    data = data.dict()
                data['variants'] = json.loads(data['variants'])
            except (ValueError, TypeError):
                pass
        return super().to_internal_value(data)

    @transaction.atomic
    def create(self, validated_data):
        # Extraire les données des variantes (liste)
        variants_data = validated_data.pop('variants', [])

        # Créer le produit
        product = Product.objects.create(**validated_data)

        # Créer chaque variante liée au produit
        for variant_data in variants_data:
            variant = Variant.objects.create(product=product, **variant_data)

        return product

    @transaction.atomic
    def update(self, instance, validated_data):
        from stockmouvement.models import Stock, StockMovement
        variants_data = validated_data.pop('variants', None)

        # Mise à jour des champs du produit
        instance.name = validated_data.get('name', instance.name)
        instance.description = validated_data.get('description', instance.description)
        instance.code_produit = validated_data.get('code_produit', instance.code_produit)
        instance.image_url = validated_data.get('image_url', instance.image_url)
        instance.image = validated_data.get('image', instance.image)
        instance.category = validated_data.get('category', instance.category)
        instance.save()

        # Si on envoie des variantes → on met à jour les variantes existantes intelligemment
        if variants_data is not None:
            existing_variants = {variant.id: variant for variant in instance.variants.all()}
            incoming_variant_ids = []

            for variant_data in variants_data:
                variant_id = variant_data.get('id')

                if variant_id and variant_id in existing_variants:
                    # Update variant existante
                    variant = existing_variants[variant_id]
                    for attr, value in variant_data.items():
                        setattr(variant, attr, value)
                    variant.save()
                    incoming_variant_ids.append(variant_id)
                else:
                    # Création de nouvelle variante
                    variant = Variant.objects.create(product=instance, **variant_data)
                    incoming_variant_ids.append(variant.id)

            # Supprimer les variantes qui ont été enlevées de la liste
            for variant_id, variant in existing_variants.items():
                if variant_id not in incoming_variant_ids:
                    variant.delete()

        return instance