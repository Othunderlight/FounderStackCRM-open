from django.urls import path

from . import views

urlpatterns = [
    # Template views
    path("test/", views.test, name="test"),
]
