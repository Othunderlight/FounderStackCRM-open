from django.db import connections
from django.db.utils import OperationalError
from django.http import HttpResponse


def health_check(request):
    try:
        # Check database connectivity
        connections["default"].cursor()
        return HttpResponse("healthy", status=200)
    except OperationalError:
        return HttpResponse("unhealthy", status=503)
