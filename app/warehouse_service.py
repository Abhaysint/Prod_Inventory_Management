from datetime import date, datetime, timedelta
from typing import List, Optional
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.models import Warehouse, StockBatch, Product, Stock, Transaction, TransactionType, Category
from app.schemas import (
    WarehouseCreate,
    StockBatchCreate,
    WarehouseStockSummary,
    StockBatchRead,
    SmartRouteRequest,
    SmartRouteResponse,
    RouteCandidate,
    FulfillDispatchRequest,
    FulfillDispatchResponse,
)
from app.routing_engine import rank_route_candidates
from app.email_service import send_low_stock_email


class WarehouseService:
    @staticmethod
    async def list_warehouses(db: AsyncSession) -> List[Warehouse]:
        """List all active warehouses ordered by id"""
        result = await db.execute(
            select(Warehouse).where(Warehouse.is_active == True).order_by(Warehouse.id)
        )
        return result.scalars().all()

    @staticmethod
    async def get_warehouse_by_id(db: AsyncSession, warehouse_id: int) -> Warehouse:
        """Get warehouse by ID"""
        result = await db.execute(select(Warehouse).where(Warehouse.id == warehouse_id))
        warehouse = result.scalar_one_or_none()
        if not warehouse:
            raise HTTPException(status_code=404, detail="Warehouse not found")
        return warehouse

    @staticmethod
    async def create_warehouse(db: AsyncSession, data: WarehouseCreate) -> Warehouse:
        """Create a new warehouse"""
        # Check duplicate name or code
        existing = await db.execute(
            select(Warehouse).where(
                (Warehouse.name == data.name) | (Warehouse.code == data.code)
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=409, detail="Warehouse with this name or code already exists"
            )

        warehouse = Warehouse(**data.dict())
        db.add(warehouse)
        await db.commit()
        await db.refresh(warehouse)
        return warehouse

    @staticmethod
    async def add_stock_batch(
        db: AsyncSession, data: StockBatchCreate, created_by: str = "system"
    ) -> StockBatch:
        """
        Receives a new stock batch into a specific warehouse.
        Also automatically synchronizes Product.stock.quantity_on_hand and creates an INBOUND transaction.
        """
        warehouse = await WarehouseService.get_warehouse_by_id(db, data.warehouse_id)

        # Check product exists
        product_res = await db.execute(
            select(Product).where(Product.id == data.product_id).options(selectinload(Product.stock))
        )
        product = product_res.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        # Create batch
        batch = StockBatch(**data.dict())
        db.add(batch)

        # Synchronize aggregate stock
        if product.stock:
            product.stock.quantity_on_hand += data.quantity
            product.stock.updated_at = func.now()

        # Log INBOUND transaction
        tx = Transaction(
            product_id=data.product_id,
            transaction_type=TransactionType.INBOUND,
            quantity=data.quantity,
            reference_doc=f"BATCH-{data.batch_number}",
            notes=f"Received batch {data.batch_number} ({data.quantity} units, exp {data.expiry_date}) into {warehouse.name}",
            created_by=created_by,
        )
        db.add(tx)

        await db.commit()
        await db.refresh(batch)
        return batch

    @staticmethod
    async def get_product_warehouse_summary(
        db: AsyncSession, product_id: int
    ) -> List[WarehouseStockSummary]:
        """
        Returns stock distribution across all active warehouses for a product,
        with batches sorted by expiry_date ASC (FEFO: First-Expired, First-Out).
        """
        warehouses = await WarehouseService.list_warehouses(db)

        # Fetch batches for this product
        batches_res = await db.execute(
            select(StockBatch)
            .where(StockBatch.product_id == product_id)
            .order_by(StockBatch.expiry_date.asc())
        )
        all_batches = batches_res.scalars().all()

        summaries: List[WarehouseStockSummary] = []
        for wh in warehouses:
            wh_batches = [b for b in all_batches if b.warehouse_id == wh.id]
            total_qty = sum(b.quantity for b in wh_batches)
            active_batches = [b for b in wh_batches if b.quantity > 0]
            nearest_expiry = active_batches[0].expiry_date if active_batches else None

            summaries.append(
                WarehouseStockSummary(
                    warehouse_id=wh.id,
                    warehouse_name=wh.name,
                    warehouse_code=wh.code,
                    city=wh.city,
                    total_quantity=total_qty,
                    nearest_expiry=nearest_expiry,
                    batches=[StockBatchRead.model_validate(b) for b in wh_batches],
                )
            )

        return summaries

    @staticmethod
    async def compute_smart_route(
        db: AsyncSession, req: SmartRouteRequest
    ) -> SmartRouteResponse:
        """
        Calculates optimal order routing from warehouses to destination
        considering physical travel distance, stock availability, and FEFO expiry urgency.
        """
        # Fetch product
        prod_res = await db.execute(
            select(Product).where(Product.id == req.product_id).options(selectinload(Product.stock))
        )
        product = prod_res.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")

        warehouses = await WarehouseService.list_warehouses(db)

        # Fetch batches for this product
        batches_res = await db.execute(
            select(StockBatch)
            .where(StockBatch.product_id == req.product_id)
            .order_by(StockBatch.expiry_date.asc())
        )
        batches = batches_res.scalars().all()

        # Build data payload for the routing engine
        warehouses_payload = []
        for wh in warehouses:
            wh_batches = [
                {
                    "id": b.id,
                    "batch_number": b.batch_number,
                    "quantity": b.quantity,
                    "expiry_date": b.expiry_date,
                }
                for b in batches
                if b.warehouse_id == wh.id
            ]
            warehouses_payload.append({
                "id": wh.id,
                "name": wh.name,
                "code": wh.code,
                "city": wh.city,
                "latitude": wh.latitude,
                "longitude": wh.longitude,
                "batches": wh_batches,
            })

        # Run ranking algorithm
        raw_candidates = rank_route_candidates(
            dest_name=req.destination_name,
            dest_lat=req.destination_lat,
            dest_lon=req.destination_lon,
            requested_qty=req.quantity,
            warehouses_data=warehouses_payload,
            prioritize_expiry=req.prioritize_expiry,
        )

        candidates = [RouteCandidate(**c) for c in raw_candidates]
        recommended_id = next(
            (c.warehouse_id for c in candidates if c.is_recommended), None
        )

        return SmartRouteResponse(
            product_id=product.id,
            product_name=product.name,
            sku=product.sku,
            requested_quantity=req.quantity,
            destination_name=req.destination_name,
            recommended_warehouse_id=recommended_id,
            candidates=candidates,
        )

    @staticmethod
    async def fulfill_dispatch(
        db: AsyncSession, req: FulfillDispatchRequest, username: str
    ) -> FulfillDispatchResponse:
        """
        Fulfills an order from a chosen warehouse using strict FEFO order:
        1. Deducts quantity from earliest expiring batches in that warehouse.
        2. Deducts aggregate Product.stock.quantity_on_hand.
        3. Creates an OUTBOUND transaction with audit reference.
        4. Triggers low-stock warning email if remaining total stock <= reorder_level.
        """
        warehouse = await WarehouseService.get_warehouse_by_id(db, req.warehouse_id)

        prod_res = await db.execute(
            select(Product).where(Product.id == req.product_id).options(selectinload(Product.stock))
        )
        product = prod_res.scalar_one_or_none()
        if not product or not product.stock:
            raise HTTPException(status_code=404, detail="Product or stock record not found")

        # Fetch active batches in this warehouse sorted by expiry_date ASC (FEFO)
        today = date.today()
        batches_res = await db.execute(
            select(StockBatch)
            .where(
                and_(
                    StockBatch.product_id == req.product_id,
                    StockBatch.warehouse_id == req.warehouse_id,
                    StockBatch.quantity > 0,
                    StockBatch.expiry_date >= today,
                )
            )
            .order_by(StockBatch.expiry_date.asc())
        )
        batches = batches_res.scalars().all()

        available_in_wh = sum(b.quantity for b in batches)
        if available_in_wh < req.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient non-expired stock in {warehouse.name}. Available: {available_in_wh}, Requested: {req.quantity}",
            )

        # Deduct requested quantity across batches in FEFO order
        remaining_to_deduct = req.quantity
        deducted_batches_info = []

        for b in batches:
            if remaining_to_deduct <= 0:
                break
            deduct_amount = min(b.quantity, remaining_to_deduct)
            b.quantity -= deduct_amount
            remaining_to_deduct -= deduct_amount
            deducted_batches_info.append(f"{b.batch_number} (-{deduct_amount})")

        # Update aggregate product stock
        product.stock.quantity_on_hand = max(0, product.stock.quantity_on_hand - req.quantity)
        product.stock.updated_at = func.now()

        # Create OUTBOUND transaction
        notes_str = f"Dispatched {req.quantity} units from {warehouse.name} to {req.destination_name} [Batches: {', '.join(deducted_batches_info)}]"
        if req.notes:
            notes_str += f" | Notes: {req.notes}"

        tx = Transaction(
            product_id=product.id,
            transaction_type=TransactionType.OUTBOUND,
            quantity=req.quantity,
            reference_doc=f"DISPATCH-{warehouse.code}",
            notes=notes_str,
            created_by=username,
        )
        db.add(tx)

        await db.commit()
        await db.refresh(tx)

        # Check low-stock condition
        remaining_stock = product.stock.quantity_on_hand
        is_low_stock = remaining_stock <= product.reorder_level
        email_sent = False
        alert_msg = None

        if is_low_stock:
            # Fetch fresh warehouse breakdown for the email
            summary = await WarehouseService.get_product_warehouse_summary(db, product.id)
            breakdown_dicts = [
                {
                    "warehouse_name": s.warehouse_name,
                    "total_quantity": s.total_quantity,
                    "nearest_expiry": str(s.nearest_expiry) if s.nearest_expiry else None,
                }
                for s in summary
            ]

            email_sent, alert_msg = send_low_stock_email(
                product_name=product.name,
                sku=product.sku,
                current_stock=remaining_stock,
                reorder_level=product.reorder_level,
                warehouse_breakdown=breakdown_dicts,
            )

        return FulfillDispatchResponse(
            transaction_id=tx.id,
            product_id=product.id,
            warehouse_id=warehouse.id,
            warehouse_name=warehouse.name,
            dispatched_quantity=req.quantity,
            remaining_product_stock=remaining_stock,
            reorder_level=product.reorder_level,
            is_low_stock_now=is_low_stock,
            low_stock_email_sent=email_sent,
            alert_message=alert_msg,
        )

    @staticmethod
    async def seed_demo_warehouses_and_batches(
        db: AsyncSession, username: str = "system"
    ) -> dict:
        """
        Idempotently seeds 3 strategic sample warehouses across major geographic regions
        and adds realistic demo batches for active products to showcase smart routing immediately.
        """
        default_warehouses = [
            {
                "name": "Warehouse A — East Coast Hub",
                "code": "WH-EAST",
                "city": "Newark, NJ",
                "latitude": 40.7357,
                "longitude": -74.1724,
            },
            {
                "name": "Warehouse B — Central Hub",
                "code": "WH-CENT",
                "city": "Dallas, TX",
                "latitude": 32.7767,
                "longitude": -96.7970,
            },
            {
                "name": "Warehouse C — West Coast Hub",
                "code": "WH-WEST",
                "city": "Fresno, CA",
                "latitude": 36.7378,
                "longitude": -119.7871,
            },
        ]

        wh_map = {}
        for wh_def in default_warehouses:
            res = await db.execute(select(Warehouse).where(Warehouse.code == wh_def["code"]))
            wh = res.scalar_one_or_none()
            if not wh:
                wh = Warehouse(**wh_def)
                db.add(wh)
                await db.flush()
            wh_map[wh.code] = wh

        # Fetch active products
        prod_res = await db.execute(
            select(Product).where(Product.is_active == True).options(selectinload(Product.stock))
        )
        products = list(prod_res.unique().scalars().all())

        # Ensure at least two perishable demo products exist so Smart Routing & Low-Stock Alerts work out-of-the-box
        sku_set = {p.sku for p in products}
        if "ALM-MILK-1L" not in sku_set or "CB-COFFEE-500" not in sku_set:
            cat_res = await db.execute(
                select(Category).where(Category.name == "Perishables & Cold Chain")
            )
            demo_cat = cat_res.scalar_one_or_none()
            if not demo_cat:
                demo_cat = Category(
                    name="Perishables & Cold Chain",
                    description="Temperature-sensitive goods with strict FEFO batch expiration tracking",
                )
                db.add(demo_cat)
                await db.flush()

            demo_products_spec = [
                {
                    "name": "Organic Almond Milk 1L",
                    "sku": "ALM-MILK-1L",
                    "description": "Barista-grade organic almond milk — requires FEFO dispatch",
                    "unit_price": 4.99,
                    "reorder_level": 48,
                },
                {
                    "name": "Cold-Brew Coffee Concentrate",
                    "sku": "CB-COFFEE-500",
                    "description": "Single-origin cold-brew bottle — shelf-life sensitive",
                    "unit_price": 12.50,
                    "reorder_level": 45,
                },
            ]
            for p_spec in demo_products_spec:
                if p_spec["sku"] not in sku_set:
                    new_prod = Product(
                        name=p_spec["name"],
                        sku=p_spec["sku"],
                        description=p_spec["description"],
                        category_id=demo_cat.id,
                        unit_price=p_spec["unit_price"],
                        reorder_level=p_spec["reorder_level"],
                        is_active=True,
                    )
                    db.add(new_prod)
                    await db.flush()
                    new_stock = Stock(product_id=new_prod.id, quantity_on_hand=0)
                    db.add(new_stock)
                    await db.flush()
                    # Reload with stock relationship
                    reloaded = await db.execute(
                        select(Product)
                        .where(Product.id == new_prod.id)
                        .options(selectinload(Product.stock))
                    )
                    products.append(reloaded.unique().scalar_one())

        batches_created = 0
        today = date.today()

        for p in products:
            # Check existing batches
            b_res = await db.execute(select(StockBatch).where(StockBatch.product_id == p.id))
            existing_batches = b_res.scalars().all()

            if not existing_batches:
                # Seed batches with varying expiry dates to demonstrate FEFO routing:
                # Batch 1 (Central Hub): Expiring soon (18 days) -> urgency priority
                # Batch 2 (East Coast Hub): Fresh stock (120 days)
                # Batch 3 (West Coast Hub): Standard stock (60 days)
                sample_batches = [
                    (wh_map["WH-CENT"].id, f"{p.sku}-B01-EXP18D", 15, today + timedelta(days=18)),
                    (wh_map["WH-EAST"].id, f"{p.sku}-B02-EXP120D", 25, today + timedelta(days=120)),
                    (wh_map["WH-WEST"].id, f"{p.sku}-B03-EXP60D", 20, today + timedelta(days=60)),
                ]

                total_added = 0
                for wh_id, batch_num, qty, exp_date in sample_batches:
                    batch = StockBatch(
                        product_id=p.id,
                        warehouse_id=wh_id,
                        batch_number=batch_num,
                        quantity=qty,
                        expiry_date=exp_date,
                    )
                    db.add(batch)
                    total_added += qty
                    batches_created += 1

                # Update product stock
                if p.stock:
                    p.stock.quantity_on_hand += total_added
                    p.stock.updated_at = func.now()

                # Log transaction
                tx = Transaction(
                    product_id=p.id,
                    transaction_type=TransactionType.INBOUND,
                    quantity=total_added,
                    reference_doc="DEMO-SEED-BATCHES",
                    notes=f"Seeded {total_added} units across 3 demo warehouses for smart routing",
                    created_by=username,
                )
                db.add(tx)

        await db.commit()

        return {
            "message": "Demo warehouses and inventory batches seeded successfully",
            "warehouses_count": len(wh_map),
            "batches_created": batches_created,
        }

