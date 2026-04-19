# audit/apps.py

from django.apps import AppConfig


class AuditConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'audit'

    def ready(self):
        import os
        from django.conf import settings

        # Avoid double-start in dev reloader
        if settings.DEBUG and os.environ.get('RUN_MAIN') != 'true':
            return

        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger
        from .management.commands.clean_old_audit_and_notify import Command as AuditCleanCommand
        from stockmouvement.management.commands.clean_old_stock_movements import Command as StockCleanCommand

        scheduler = BackgroundScheduler()

        # 04:00 — purge audit logs + email warning
        scheduler.add_job(
            AuditCleanCommand().handle,
            trigger=CronTrigger(hour=4, minute=0),
            kwargs={'retention_days': 90, 'warning_days': 7},
            id='purge_audit_logs',
            name='Purge audit logs + email warning',
            replace_existing=True,
        )

        # 04:10 — purge old stock movements
        scheduler.add_job(
            StockCleanCommand().handle,
            trigger=CronTrigger(hour=4, minute=10),
            id='purge_stock_movements',
            name='Purge old stock movements',
            replace_existing=True,
        )

        # 04:20 — delete resolved/old alerts from DB (keep last 30 days only)
        scheduler.add_job(
            _purge_old_alerts,
            trigger=CronTrigger(hour=4, minute=20),
            id='purge_old_alerts',
            name='Purge resolved alerts older than 30 days',
            replace_existing=True,
        )

        scheduler.start()
        print("APScheduler started: audit purge 04:00, stock movements 04:10, alerts 04:20")


def _purge_old_alerts():
    from django.utils import timezone
    from datetime import timedelta
    from stockmouvement.models import Alert

    cutoff = timezone.now() - timedelta(days=30)
    deleted, _ = Alert.objects.filter(
        estResolue=True,
        dateAlerte__lt=cutoff
    ).delete()
    if deleted:
        print(f"APScheduler: {deleted} resolved alerts deleted (older than 30 days)")
