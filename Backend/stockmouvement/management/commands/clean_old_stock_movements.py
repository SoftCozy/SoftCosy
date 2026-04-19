from django.core.management.base import BaseCommand
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from stockmouvement.models import StockMovement


class Command(BaseCommand):
    help = 'Deletes stock movements older than STOCK_MOVEMENT_RETENTION_DAYS'

    def handle(self, *args, **options):
        retention_days = getattr(settings, 'STOCK_MOVEMENT_RETENTION_DAYS', 180)
        cutoff = timezone.now().date() - timedelta(days=retention_days)

        to_delete = StockMovement.objects.filter(date__lt=cutoff)
        count = to_delete.count()

        if count > 0:
            to_delete.delete()
            self.stdout.write(self.style.SUCCESS(
                f"{count} stock movements deleted (older than {retention_days} days)"
            ))
        else:
            self.stdout.write(self.style.SUCCESS("No stock movements to delete."))
