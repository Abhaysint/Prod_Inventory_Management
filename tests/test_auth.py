import pytest


async def test_register_user(client):
    resp = await client.post(
        "/auth/register",
        json={
            "email": "new@test.com",
            "username": "newuser",
            "password": "password123",
            "role": "viewer",
        },
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["username"] == "newuser"
    assert data["role"] == "viewer"
    assert "hashed_password" not in data
    assert "password" not in data


async def test_duplicate_username_rejected(client):
    payload = {
        "email": "dup1@test.com",
        "username": "dupuser",
        "password": "password123",
    }
    await client.post("/auth/register", json=payload)

    resp = await client.post(
        "/auth/register",
        json={**payload, "email": "dup2@test.com"},
    )
    assert resp.status_code == 409


async def test_short_password_rejected(client):
    resp = await client.post(
        "/auth/register",
        json={"email": "s@test.com", "username": "shortpw", "password": "abc"},
    )
    assert resp.status_code == 422


async def test_login_success(client, admin_token):
    assert admin_token
    assert len(admin_token.split(".")) == 3  # header.payload.signature


async def test_login_wrong_password(client, admin_token):
    resp = await client.post(
        "/auth/login", data={"username": "admin", "password": "wrongpass"}
    )
    assert resp.status_code == 401


async def test_me_endpoint(client, admin_token, auth_headers):
    resp = await client.get("/auth/me", headers=auth_headers(admin_token))
    assert resp.status_code == 200
    assert resp.json()["username"] == "admin"


async def test_protected_route_without_token(client):
    resp = await client.get("/products")
    assert resp.status_code == 401


async def test_invalid_token_rejected(client, auth_headers):
    resp = await client.get("/products", headers=auth_headers("not.a.realtoken"))
    assert resp.status_code == 401


async def test_viewer_cannot_create_product(client, viewer_token, auth_headers):
    resp = await client.post(
        "/products",
        headers=auth_headers(viewer_token),
        json={
            "name": "Blocked",
            "category_id": 1,
            "sku": "BLK-1",
            "unit_price": 10.0,
        },
    )
    assert resp.status_code == 403


async def test_viewer_can_read_products(client, viewer_token, auth_headers):
    resp = await client.get("/products", headers=auth_headers(viewer_token))
    assert resp.status_code == 200
