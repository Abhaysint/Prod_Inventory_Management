from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, func
from sqlalchemy.orm import selectinload
from app.models import Product, Stock, Transaction, Category, TransactionType
from app.schemas import (
    CategoryCreate, ProductCreate, ProductUpdate, 
    TransactionCreate, StockRead, StockAdjustment
)
from fastapi import HTTPException
from app.email_service import send_low_stock_email

# ============ CATEGORY SERVICE ============

class CategoryService:
    @staticmethod
    async def create_category(db: AsyncSession, category_data: CategoryCreate):
        """Create a new category"""
        db_category = Category(**category_data.dict())
        db.add(db_category)
        await db.commit()
        await db.refresh(db_category)
        return db_category
    
    @staticmethod
    async def get_all_categories(db: AsyncSession):
        """Get all categories"""
        result = await db.execute(select(Category))
        return result.scalars().all()
    
    @staticmethod
    async def get_category_by_id(db: AsyncSession, category_id: int):
        """Get category by ID"""
        result = await db.execute(select(Category).where(Category.id == category_id))
        category = result.scalar_one_or_none()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        return category
    
    @staticmethod
    async def get_categories_paginated(db: AsyncSession, page: int = 1, page_size: int = 10):
        offset = (page - 1) * page_size
        count_result = await db.execute(select(func.count()).select_from(Category))
        total = count_result.scalar()
        result = await db.execute(select(Category).offset(offset).limit(page_size))
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": result.scalars().all(),
        }


# ============ PRODUCT SERVICE ============

class ProductService:
    @staticmethod
    async def create_product(db: AsyncSession, product_data: ProductCreate):
        """Create a new product and auto-create stock"""
        # Verify category exists
        await CategoryService.get_category_by_id(db, product_data.category_id)
        
        # Create product
        db_product = Product(**product_data.dict())
        db.add(db_product)
        await db.flush()  # Get the ID without committing
        
        # Auto-create stock row
        db_stock = Stock(product_id=db_product.id, quantity_on_hand=0)
        db.add(db_stock)
        
        await db.commit()
        await db.refresh(db_product)
        return db_product
    
    @staticmethod
    async def get_all_products(db: AsyncSession):
        """Get all active products with their stock"""
        result = await db.execute(
            select(Product)
            .where(Product.is_active == True)
            .options(selectinload(Product.stock))
        )
        return result.unique().scalars().all()
    
    @staticmethod
    async def get_product_by_id(db: AsyncSession, product_id: int):
        """Get product by ID"""
        result = await db.execute(
            select(Product)
            .where(Product.id == product_id)
            .options(selectinload(Product.stock))
        )
        product = result.unique().scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        return product
    
    @staticmethod
    async def update_product(db: AsyncSession, product_id: int, update_data: ProductUpdate):
        """Update product details"""
        product = await ProductService.get_product_by_id(db, product_id)
        
        update_dict = update_data.dict(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(product, key, value)
        
        await db.commit()
        await db.refresh(product)
        return product
    
    @staticmethod
    async def get_products_paginated(db: AsyncSession, page: int = 1, page_size: int = 10):
        offset = (page - 1) * page_size
        count_result = await db.execute(
            select(func.count()).select_from(Product).where(Product.is_active == True)
        )
        total = count_result.scalar()
        result = await db.execute(
            select(Product)
            .where(Product.is_active == True)
            .options(selectinload(Product.stock))
            .order_by(Product.id)
            .offset(offset)
            .limit(page_size)
        )
        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "items": result.unique().scalars().all(),
        }

    @staticmethod
    async def search_products(
        db: AsyncSession,
        name: str | None = None,
        sku: str | None = None,
        category_id: int | None = None,
    ):
        query = (
            select(Product)
            .where(Product.is_active == True)
            .options(selectinload(Product.stock))
        )
        if name:
            query = query.where(Product.name.ilike(f"%{name}%"))
        if sku:
            query = query.where(Product.sku.ilike(f"%{sku}%"))
        if category_id:
            query = query.where(Product.category_id == category_id)

        result = await db.execute(query)
        return result.unique().scalars().all()

    @staticmethod
    async def get_low_stock_products(db: AsyncSession):
        result = await db.execute(
            select(Product)
            .join(Stock)
            .where(
                and_(
                    Product.is_active == True,
                    Stock.quantity_on_hand <= Product.reorder_level,
                )
            )
            .options(selectinload(Product.stock))
        )
        products = result.unique().scalars().all()

        return [
            {
                "product_id": p.id,
                "product_name": p.name,
                "sku": p.sku,
                "quantity_on_hand": p.stock.quantity_on_hand,
                "reorder_level": p.reorder_level,
                "shortage": p.reorder_level - p.stock.quantity_on_hand,
            }
            for p in products
        ]


# ============ STOCK SERVICE ============

class StockService:
    @staticmethod
    async def get_stock_by_product_id(db: AsyncSession, product_id: int):
        """Get stock for a product"""
        product = await ProductService.get_product_by_id(db, product_id)
        if not product.stock:
            raise HTTPException(status_code=404, detail="Stock not found")
        return product.stock
    
    @staticmethod
    async def adjust_stock(db: AsyncSession, product_id: int, adjustment: StockAdjustment):
        """Adjust stock and create transaction record"""
        product = await ProductService.get_product_by_id(db, product_id)
        stock = product.stock
        if not stock:
            raise HTTPException(status_code=404, detail="Stock not found")

        old_quantity = stock.quantity_on_hand
        new_quantity = adjustment.new_quantity

        stock.quantity_on_hand = new_quantity
        stock.updated_at = func.now()

        transaction = Transaction(
            product_id=product_id,
            transaction_type=TransactionType.ADJUSTMENT,
            quantity=new_quantity,
            notes=adjustment.reason or f"Adjusted from {old_quantity} to {new_quantity}",
            created_by=adjustment.adjusted_by,
        )

        db.add(transaction)
        await db.commit()
        await db.refresh(transaction)

        # Trigger low stock email if new stock <= reorder level
        if new_quantity <= product.reorder_level:
            try:
                from app.warehouse_service import WarehouseService
                summary = await WarehouseService.get_product_warehouse_summary(db, product.id)
                breakdown = [
                    {"warehouse_name": s.warehouse_name, "total_quantity": s.total_quantity, "nearest_expiry": str(s.nearest_expiry) if s.nearest_expiry else None}
                    for s in summary
                ]
            except Exception:
                breakdown = []
            try:
                send_low_stock_email(
                    product_name=product.name,
                    sku=product.sku,
                    current_stock=new_quantity,
                    reorder_level=product.reorder_level,
                    warehouse_breakdown=breakdown,
                )
            except Exception as e:
                print(f"[StockService] Low stock alert notification skipped: {e}")

        return transaction


# ============ TRANSACTION SERVICE ============

class TransactionService:
    @staticmethod
    async def create_transaction(db: AsyncSession, transaction_data: TransactionCreate):
        """
        Create a transaction and update stock accordingly.
        
        Rules:
        - INBOUND: increase quantity_on_hand
        - OUTBOUND: decrease quantity_on_hand (fail if insufficient)
        - ADJUSTMENT: set quantity_on_hand
        - RETURN: increase quantity_on_hand
        """
        # Get product and stock
        product = await ProductService.get_product_by_id(db, transaction_data.product_id)
        stock = product.stock
        
        if not stock:
            raise HTTPException(status_code=400, detail="Stock record not found for product")
        
        # Process transaction type
        if transaction_data.transaction_type == TransactionType.INBOUND:
            stock.quantity_on_hand += transaction_data.quantity
        
        elif transaction_data.transaction_type == TransactionType.OUTBOUND:
            if stock.quantity_on_hand < transaction_data.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock. Available: {stock.quantity_on_hand}, Requested: {transaction_data.quantity}"
                )
            stock.quantity_on_hand -= transaction_data.quantity
        
        elif transaction_data.transaction_type == TransactionType.ADJUSTMENT:
            stock.quantity_on_hand = transaction_data.quantity
        
        elif transaction_data.transaction_type == TransactionType.RETURN:
            stock.quantity_on_hand += transaction_data.quantity
        
        # Create transaction record
        db_transaction = Transaction(**transaction_data.dict())
        db.add(db_transaction)
        
        await db.commit()
        await db.refresh(db_transaction)

        # Trigger low stock email if outbound drop leads to stock <= reorder_level
        if transaction_data.transaction_type == TransactionType.OUTBOUND and stock.quantity_on_hand <= product.reorder_level:
            try:
                from app.warehouse_service import WarehouseService
                summary = await WarehouseService.get_product_warehouse_summary(db, product.id)
                breakdown = [
                    {"warehouse_name": s.warehouse_name, "total_quantity": s.total_quantity, "nearest_expiry": str(s.nearest_expiry) if s.nearest_expiry else None}
                    for s in summary
                ]
            except Exception:
                breakdown = []
            try:
                send_low_stock_email(
                    product_name=product.name,
                    sku=product.sku,
                    current_stock=stock.quantity_on_hand,
                    reorder_level=product.reorder_level,
                    warehouse_breakdown=breakdown,
                )
            except Exception as e:
                print(f"[TransactionService] Low stock alert notification skipped: {e}")

        return db_transaction
    
    @staticmethod
    async def get_transactions_by_product(db: AsyncSession, product_id: int):
        """Get all transactions for a product"""
        await ProductService.get_product_by_id(db, product_id)
        
        result = await db.execute(
            select(Transaction).where(Transaction.product_id == product_id)
        )
        return result.scalars().all()
