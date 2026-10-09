from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import hash_password, verify_password
from app.models import User
from app.schemas import UserCreate


class UserService:
    @staticmethod
    async def create_user(db: AsyncSession, data: UserCreate) -> User:
        existing = await db.execute(
            select(User).where(
                (User.username == data.username) | (User.email == data.email)
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=409,
                detail="Username or email already registered"
            )

        user = User(
            email=data.email,
            username=data.username,
            hashed_password=hash_password(data.password),
            role=data.role.value,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def authenticate(db: AsyncSession, username: str, password: str) -> User:
        result = await db.execute(
            select(User).where(User.username == username)
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=401,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )

        if not user.is_active:
            raise HTTPException(
                status_code=403,
                detail="User account is disabled"
            )

        return user

    @staticmethod
    async def list_users(db: AsyncSession):
        result = await db.execute(select(User).order_by(User.id))
        return result.scalars().all()
