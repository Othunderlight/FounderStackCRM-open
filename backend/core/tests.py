import pytest
from django.urls import reverse

@pytest.mark.django_db
def test_health_check(client):
    """
    Tests the health_check view.
    """
    url = reverse('health_check')
    response = client.get(url)
    assert response.status_code == 200
    assert response.content == b"healthy"
