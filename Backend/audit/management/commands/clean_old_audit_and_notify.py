# audit/management/commands/clean_old_audit_and_notify.py

from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from audit.models import AuditLog


class Command(BaseCommand):
    help = 'Purges old audit logs and emails admin when purge is approaching'

    def add_arguments(self, parser):
        parser.add_argument('--retention-days', type=int, default=90)
        parser.add_argument('--warning-days', type=int, default=7)

    def handle(self, *args, **options):
        retention = options['retention_days']
        warning = options['warning_days']

        today = timezone.now().date()
        warning_threshold = today - timedelta(days=retention - warning)
        purge_threshold = today - timedelta(days=retention)

        soon_to_expire = AuditLog.objects.filter(perform_at__lt=warning_threshold)
        count_soon = soon_to_expire.count()
        to_purge = AuditLog.objects.filter(perform_at__lt=purge_threshold)
        count_to_purge = to_purge.count()

        if count_soon > 0:
            purge_date = today + timedelta(days=warning)
            subject = f"[SoftCosy] Purge du journal d'audit dans {warning} jours"
            message = (
                f"Avertissement — purge automatique du journal d'audit\n\n"
                f"Date de purge prévue : {purge_date}\n"
                f"Entrées concernées   : {count_soon}\n"
                f"Seuil de rétention   : {retention} jours\n\n"
                "Connectez-vous en tant qu'administrateur pour consulter ou exporter "
                "ces logs avant leur suppression définitive.\n\n"
                f"(Ce message est envoyé automatiquement par SoftCosy le {today})"
            )
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[settings.ADMIN_NOTIFY_EMAIL],
                fail_silently=True,
            )
            self.stdout.write(self.style.WARNING(
                f"Email envoyé : purge prévue le {purge_date} ({count_soon} lignes)"
            ))

        if count_to_purge > 0:
            deleted_count, _ = to_purge.delete()
            self.stdout.write(self.style.SUCCESS(
                f"{deleted_count} lignes d'audit purgées (> {retention} jours)"
            ))
        else:
            self.stdout.write(self.style.SUCCESS("Aucune purge nécessaire aujourd'hui."))
