import pytest
from fastapi import HTTPException

from app.schemas import (
    CategoryCreate,
    ProductCreate,
    TransactionCreate,
    TransactionTypeEnum,
)
from app.services import (
    CategoryService,
    ProductService,
    StockService,
    TransactionService,
)


@pytest.fixture
async def category(db_session):
    return await CategoryService.create_category(
        db_session, CategoryCreate(name="Electronics", description="Devices")
    )


@pytest.fixture
async def product(db_session, category):
    return await ProductService.create_product(
        db_session,
        ProductCreate(
            name="Laptop",
            category_id=category.id,
            sku="LP-001",
            unit_price=999.99,
            reorder_level=5,
        ),
    )


async def test_create_category(db_session):
    cat = await CategoryService.create_category(
        db_session, CategoryCreate(name="Tools")
    )
    assert cat.id is not None
    assert cat.name == "Tools"


async def test_get_missing_category_raises_404(db_session):
    with pytest.raises(HTTPException) as exc:
        await CategoryService.get_category_by_id(db_session, 99999)
    assert exc.value.status_code == 404


async def test_create_product_auto_creates_stock(db_session, product):
    stock = await StockService.get_stock_by_product_id(db_session, product.id)
    assert stock.quantity_on_hand == 0
    assert stock.product_id == product.id


async def test_product_with_bad_category_raises_404(db_session):
    with pytest.raises(HTTPException) as exc:
        await ProductService.create_product(
            db_session,
            ProductCreate(
                name="Ghost", category_id=99999, sku="GH-1", unit_price=1.0
            ),
        )
    assert exc.value.status_code == 404


async def test_inbound_increases_stock(db_session, product):
    await TransactionService.create_transaction(
        db_session,
        TransactionCreate(
            product_id=product.id,
            transaction_type=TransactionTypeEnum.INBOUND,
            quantity=50,
        ),
    )
    stock = await StockService.get_stock_by_product_id(db_session, product.id)
    assert stock.quantity_on_hand == 50


async def test_outbound_decreases_stock(db_session, product):
    await TransactionService.create_transaction(
        db_session,
        TransactionCreate(
            product_id=product.id,
            transaction_type=TransactionTypeEnum.INBOUND,
            quantity=50,
        ),
    )
    await TransactionService.create_transaction(
        db_session,
        TransactionCreate(
            product_id=product.id,
            transaction_type=TransactionTypeEnum.OUTBOUND,
            quantity=10,
        ),
    )
    stock = await StockService.get_stock_by_product_id(db_session, product.id)
    assert stock.quantity_on_hand == 40


async def test_outbound_beyond_stock_rejected(db_session, product):
    await TransactionService.create_transaction(
        db_session,
        TransactionCreate(
            product_id=product.id,
            transaction_type=TransactionTypeEnum.INBOUND,
            quantity=5,
        ),
    )
    with pytest.raises(HTTPException) as exc:
        await TransactionService.create_transaction(
            db_session,
            TransactionCreate(
                product_id=product.id,
                transaction_type=TransactionTypeEnum.OUTBOUND,
                quantity=100,
            ),
        )
    assert exc.value.status_code == 400
    assert "Insufficient stock" in exc.value.detail

    # Stock must be unchanged after the failed transaction
    stock = await StockService.get_stock_by_product_id(db_session, product.id)
    assert stock.quantity_on_hand == 5


async def test_adjustment_sets_absolute_quantity(db_session, product):
    await TransactionService.create_transaction(
        db_session,
        TransactionCreate(
            product_id=product.id,
            transaction_type=TransactionTypeEnum.INBOUND,
            quantity=50,
        ),
    )
    await TransactionService.create_transaction(
        db_session,
        TransactionCreate(
            product_id=product.id,
            transaction_type=TransactionTypeEnum.ADJUSTMENT,
            quantity=33,
        ),
    )
    stock = await StockService.get_stock_by_product_id(db_session, product.id)
    assert stock.quantity_on_hand == 33


async def test_return_increases_stock(db_session, product):
    await TransactionService.create_transaction(
        db_session,
        TransactionCreate(
            product_id=product.id,
            transaction_type=TransactionTypeEnum.RETURN,
            quantity=7,
        ),
    )
    stock = await StockService.get_stock_by_product_id(db_session, product.id)
    assert stock.quantity_on_hand == 7


async def test_low_stock_detection(db_session, product):
    # reorder_level is 5; bring stock to 3
    await TransactionService.create_transaction(
        db_session,
        TransactionCreate(
            product_id=product.id,
            transaction_type=TransactionTypeEnum.INBOUND,
            quantity=3,
        ),
    )
    low = await ProductService.get_low_stock_products(db_session)
    assert any(item["product_id"] == product.id for item in low)
    entry = next(i for i in low if i["product_id"] == product.id)
    assert entry["shortage"] == 2


async def test_search_by_name(db_session, product):
    results = await ProductService.search_products(db_session, name="lap")
    assert len(results) == 1
    assert results[0].sku == "LP-001"


async def test_pagination_metadata(db_session, category):
    for i in range(7):
        await ProductService.create_product(
            db_session,
            ProductCreate(
                name=f"Item {i}",
                category_id=category.id,
                sku=f"SKU-{i}",
                unit_price=5.0,
            ),
        )
    page = await ProductService.get_products_paginated(db_session, page=1, page_size=5)
    assert page["total"] == 7
    assert len(page["items"]) == 5

    page2 = await ProductService.get_products_paginated(db_session, page=2, page_size=5)
    assert len(page2["items"]) == 2
