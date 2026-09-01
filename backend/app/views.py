from django.contrib.auth.decorators import login_not_required
from django.http import HttpResponse
from django.shortcuts import redirect, render


@login_not_required
def test(request):
    return render(request, "test.html")
