from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from app.database import get_db
from app.schemas import TransactionCreate, TransactionRead
from app.services import TransactionService
from app.auth import get_current_user, require_roles

router = APIRouter(prefix="/transactions")

@router.post("", response_model=TransactionRead)
async def create_transaction(
    data: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(require_roles("admin", "manager"))
):
    return await TransactionService.create_transaction(db, data)

@router.get("/{product_id}", response_model=List[TransactionRead])
async def get_transaction_history(
    product_id: int,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    return await TransactionService.get_transactions_by_product(db, product_id)
