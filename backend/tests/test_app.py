import pytest
from app.main import create_app
from litestar.testing import TestClient

def test_app_starts(settings, fake_redis) -> None:
    app = create_app(settings=settings)
    app.dependencies["redis"].dependency = lambda: fake_redis
    with TestClient(app) as client:
        response = client.get("/meetings/analytics")
        assert response.status_code == 200

