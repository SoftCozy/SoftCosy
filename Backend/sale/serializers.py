from rest_framework import serializers
from django.db import transaction
from .models import Customer, Sale, SaleLine
from product.models import Product, Variant  # ← import depuis product

from product.serializers import ProductListSerializer, VariantSerializer  # ← import depuis product

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            'id',
            'name',
            'phone',
            'address',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']


class SaleLineSerializer(serializers.ModelSerializer):
    product_detail = ProductListSerializer(source='product', read_only=True)
    variant_detail = VariantSerializer(source='variant', read_only=True)

    class Meta:
        model = SaleLine
        fields = [
            'id',
            'sale',           # read_only en pratique
            'product',
            'product_detail',
            'variant',
            'variant_detail',
            'quantity',
            'unit_price',
            'line_discount',
            'line_total',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'sale', 'line_total']

class SaleListSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(read_only=True)
    user = serializers.StringRelatedField()  # ou PrimaryKeyRelatedField selon tes besoins

    class Meta:
        model = Sale
        fields = [
            'id',
            'invoice_number',
            'user',
            'customer',
            'sold_at',
            'channel',
            'subtotal',
            'discount_amount',
            'total',
            'status',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'subtotal', 'total']  # calculés


class SaleDetailSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(read_only=True)
    user = serializers.StringRelatedField()
    lines = SaleLineSerializer(many=True, read_only=True)

    class Meta:
        model = Sale
        fields = [
            'id',
            'invoice_number',
            'user',
            'customer',
            'sold_at',
            'channel',
            'subtotal',
            'discount_amount',
            'total',
            'status',
            'notes',
            'created_at',
            'lines',
        ]
        read_only_fields = ['id', 'created_at', 'subtotal', 'total']


class SaleCreateUpdateSerializer(serializers.ModelSerializer):
    lines = SaleLineSerializer(many=True, required=False)

    class Meta:
        model = Sale
        fields = [
            'id',
            'invoice_number',
            'user',
            'customer',
            'sold_at',
            'channel',
            'discount_amount',
            'status',
            'notes',
            'lines',
        ]
        read_only_fields = ['id', 'subtotal', 'total']

    def calculate_line_total(self, line_data):
        """Calcule le total d'une ligne"""
        quantity = line_data.get('quantity', 0)
        unit_price = line_data.get('unit_price', 0)
        line_discount = line_data.get('line_discount', 0)
        
        return (quantity * unit_price) - line_discount

    @transaction.atomic
    def create(self, validated_data):
        lines_data = validated_data.pop('lines', [])
        
        # Création de la vente (sans subtotal/total pour l'instant)
        sale = Sale.objects.create(**validated_data)

        subtotal = 0
        
        for line_data in lines_data:
            # Calcul du total de la ligne AVANT création
            line_total = self.calculate_line_total(line_data)
            
            # On ajoute le total calculé dans les données
            line_data['line_total'] = line_total
            
            # Création de la ligne avec le total correct
            line = SaleLine.objects.create(sale=sale, **line_data)
            
            subtotal += line_total

        # Mise à jour de la vente avec les vrais totaux
        sale.subtotal = subtotal
        sale.total = subtotal - sale.discount_amount
        sale.save(update_fields=['subtotal', 'total'])

        return sale

    @transaction.atomic
    def update(self, instance, validated_data):
        lines_data = validated_data.pop('lines', None)

        # Mise à jour des champs simples de la vente
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if lines_data is not None:
            # Supprime les anciennes lignes
            instance.lines.all().delete()
            
            subtotal = 0
            
            for line_data in lines_data:
                line_total = self.calculate_line_total(line_data)
                line_data['line_total'] = line_total
                
                SaleLine.objects.create(sale=instance, **line_data)
                subtotal += line_total

            instance.subtotal = subtotal
            instance.total = subtotal - instance.discount_amount

        instance.save()
        return instance