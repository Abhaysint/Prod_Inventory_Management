import asyncio
import os

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import Base, get_db
from app.models import Category, Product, Stock, Transaction, User  # noqa: F401
from main import app

TEST_DATABASE_URL = os.getenv(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://user:password@db:5432/inventory_test_db",
)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def engine():
    eng = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await eng.dispose()


@pytest_asyncio.fixture
async def db_session(engine) -> AsyncSession:
    """Fresh, isolated session per test — rolled back afterwards."""
    connection = await engine.connect()
    transaction = await connection.begin()
    session_factory = async_sessionmaker(bind=connection, expire_on_commit=False)
    session = session_factory()

    yield session

    await session.close()
    await transaction.rollback()
    await connection.close()


@pytest_asyncio.fixture
async def client(db_session) -> AsyncClient:
    """Test client with the DB dependency overridden to the test session."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# ---------- auth helpers ----------

@pytest_asyncio.fixture
async def admin_token(client) -> str:
    await client.post(
        "/auth/register",
        json={
            "email": "admin@test.com",
            "username": "admin",
            "password": "adminpass123",
            "role": "admin",
        },
    )
    resp = await client.post(
        "/auth/login", data={"username": "admin", "password": "adminpass123"}
    )
    return resp.json()["access_token"]


@pytest_asyncio.fixture
async def viewer_token(client) -> str:
    await client.post(
        "/auth/register",
        json={
            "email": "viewer@test.com",
            "username": "viewer",
            "password": "viewerpass123",
            "role": "viewer",
        },
    )
    resp = await client.post(
        "/auth/login", data={"username": "viewer", "password": "viewerpass123"}
    )
    return resp.json()["access_token"]


@pytest.fixture
def auth_headers():
    return lambda token: {"Authorization": f"Bearer {token}"}
