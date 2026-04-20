from django.dispatch import receiver
from axes.signals import user_locked_out
from stockmouvement.models import Alert

@receiver(user_locked_out)
def axes_lockout_handler(sender, request, username, ip_address, **kwargs):
    """
    Crée une alerte système quand un utilisateur ou une IP est verrouillé par Axes.
    """
    Alert.objects.create(
        type="securite",
        severite="critical",
        titre="Tentative de Forçage (Brute Force)",
        message=f"L'adresse IP {ip_address} a été verrouillée après plusieurs tentatives infructueuses sur le compte '{username}'."
    )
