from django.http import JsonResponse

def axes_lockout_json(request, credentials):
    """
    Custom lockout response for django-axes to return JSON instead of HTML/Plaintext.
    """
    return JsonResponse({
        "detail": "lockout",
        "message": "Trop de tentatives échouées, veuillez attendre 5 min pour vous reconnecter."
    }, status=403)
