from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas import UserCreate, UserRead, Token
from app.services import AuthService
from app.auth import get_current_user

router = APIRouter(prefix="/auth")

@router.post("/register", response_model=UserRead)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    return await AuthService.register(db, user_data)

@router.post("/login", response_model=Token)
async def login(username: str, password: str, db: AsyncSession = Depends(get_db)):
    return await AuthService.login(db, username, password)

@router.get("/me", response_model=UserRead)
async def get_me(current_user = Depends(get_current_user)):
    return current_user
