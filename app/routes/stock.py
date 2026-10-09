from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas import StockRead, StockAdjustment, TransactionRead
from app.services import StockService
from app.auth import get_current_user, require_roles
from app.models import User

router = APIRouter(prefix="/stock", tags=["Stock"])


@router.get("/{product_id}", response_model=StockRead)
async def get_stock(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await StockService.get_stock_by_product_id(db, product_id)


@router.post("/{product_id}/adjust", response_model=TransactionRead)
async def adjust_stock(
    product_id: int,
    data: StockAdjustment,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles("admin", "manager")),
):
    data.adjusted_by = current_user.username
    return await StockService.adjust_stock(db, product_id, data)
