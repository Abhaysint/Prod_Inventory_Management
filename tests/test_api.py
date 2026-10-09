import pytest


@pytest.fixture
async def headers(admin_token, auth_headers):
    return auth_headers(admin_token)


@pytest.fixture
async def category_id(client, headers):
    resp = await client.post(
        "/categories", headers=headers, json={"name": "Electronics"}
    )
    return resp.json()["id"]


@pytest.fixture
async def product_id(client, headers, category_id):
    resp = await client.post(
        "/products",
        headers=headers,
        json={
            "name": "Laptop",
            "category_id": category_id,
            "sku": "LP-001",
            "unit_price": 999.99,
            "reorder_level": 5,
        },
    )
    return resp.json()["id"]


async def test_health_is_public(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_full_inventory_flow(client, headers, product_id):
    # Stock starts at zero
    resp = await client.get(f"/stock/{product_id}", headers=headers)
    assert resp.json()["quantity_on_hand"] == 0

    # Receive 50
    resp = await client.post(
        "/transactions",
        headers=headers,
        json={
            "product_id": product_id,
            "transaction_type": "inbound",
            "quantity": 50,
            "reference_doc": "PO-001",
        },
    )
    assert resp.status_code == 201

    # Ship 10
    await client.post(
        "/transactions",
        headers=headers,
        json={
            "product_id": product_id,
            "transaction_type": "outbound",
            "quantity": 10,
            "reference_doc": "INV-001",
        },
    )

    resp = await client.get(f"/stock/{product_id}", headers=headers)
    assert resp.json()["quantity_on_hand"] == 40

    # Transaction history records both
    resp = await client.get(f"/transactions/{product_id}", headers=headers)
    assert len(resp.json()) == 2


async def test_oversell_returns_400(client, headers, product_id):
    resp = await client.post(
        "/transactions",
        headers=headers,
        json={
            "product_id": product_id,
            "transaction_type": "outbound",
            "quantity": 999,
        },
    )
    assert resp.status_code == 400
    assert "Insufficient stock" in resp.json()["detail"]


async def test_stock_adjust_endpoint(client, headers, product_id):
    resp = await client.post(
        f"/stock/{product_id}/adjust",
        headers=headers,
        json={"new_quantity": 77, "notes": "Annual count"},
    )
    assert resp.status_code == 200

    resp = await client.get(f"/stock/{product_id}", headers=headers)
    assert resp.json()["quantity_on_hand"] == 77


async def test_low_stock_endpoint(client, headers, product_id):
    await client.post(
        "/transactions",
        headers=headers,
        json={
            "product_id": product_id,
            "transaction_type": "inbound",
            "quantity": 2,
        },
    )
    resp = await client.get("/products/low-stock", headers=headers)
    assert resp.status_code == 200
    assert any(item["product_id"] == product_id for item in resp.json())


async def test_search_endpoint_not_shadowed_by_id_route(client, headers, product_id):
    """Guards against /products/search being captured by /products/{product_id}."""
    resp = await client.get("/products/search?name=laptop", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_pagination_endpoint(client, headers, category_id):
    for i in range(12):
        await client.post(
            "/products",
            headers=headers,
            json={
                "name": f"Item {i}",
                "category_id": category_id,
                "sku": f"SKU-{i}",
                "unit_price": 1.5,
            },
        )
    resp = await client.get("/products?page=1&page_size=5", headers=headers)
    body = resp.json()
    assert body["total"] == 12
    assert len(body["items"]) == 5
    assert body["page"] == 1


async def test_invalid_page_size_rejected(client, headers):
    resp = await client.get("/products?page=1&page_size=500", headers=headers)
    assert resp.status_code == 422


async def test_missing_product_returns_404(client, headers):
    resp = await client.get("/products/99999", headers=headers)
    assert resp.status_code == 404


async def test_negative_price_rejected(client, headers, category_id):
    resp = await client.post(
        "/products",
        headers=headers,
        json={
            "name": "Bad",
            "category_id": category_id,
            "sku": "BAD-1",
            "unit_price": -5,
        },
    )
    assert resp.status_code == 422
