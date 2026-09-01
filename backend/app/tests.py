import pytest
from django.urls import reverse

@pytest.mark.django_db
def test_test_view(client):
    """
    Tests the test view.
    """
    url = reverse('test')
    response = client.get(url)
    assert response.status_code == 200
    assert response.content == b"successful!"