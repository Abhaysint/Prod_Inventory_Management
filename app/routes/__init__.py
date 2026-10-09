from fastapi import APIRouter
from app.routes.categories import router as categories_router
from app.routes.products import router as products_router
from app.routes.stock import router as stock_router
from app.routes.transactions import router as transactions_router

router = APIRouter()

router.include_router(categories_router, tags=["categories"])
router.include_router(products_router, tags=["products"])
router.include_router(stock_router, tags=["stock"])
router.include_router(transactions_router, tags=["transactions"])

__all__ = ["router"]
