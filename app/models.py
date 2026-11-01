from sqlalchemy import Column, Integer, String, Float, DateTime, Date, ForeignKey, Enum, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    sku = Column(String(50), unique=True, nullable=False)
    description = Column(String(500))
    unit_price = Column(Float, nullable=False)
    reorder_level = Column(Integer, default=10)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    category = relationship("Category", back_populates="products")
    stock = relationship("Stock", back_populates="product", uselist=False, cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="product")
    batches = relationship("StockBatch", back_populates="product", cascade="all, delete-orphan")

class Stock(Base):
    __tablename__ = "stock"
    
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), unique=True, nullable=False)
    quantity_on_hand = Column(Integer, default=0)
    quantity_reserved = Column(Integer, default=0)
    last_counted_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    product = relationship("Product", back_populates="stock")

class TransactionType(str, enum.Enum):
    INBOUND = "inbound"
    OUTBOUND = "outbound"
    ADJUSTMENT = "adjustment"
    RETURN = "return"

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    transaction_type = Column(Enum(TransactionType), nullable=False)
    quantity = Column(Integer, nullable=False)
    reference_doc = Column(String(100))
    notes = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String(100))
    
    product = relationship("Product", back_populates="transactions")

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    VIEWER = "viewer"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.VIEWER)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Warehouse(Base):
    __tablename__ = "warehouses"

    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    code = Column(String(20), unique=True, nullable=False)
    city = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    batches = relationship("StockBatch", back_populates="warehouse", cascade="all, delete-orphan")


class StockBatch(Base):
    __tablename__ = "stock_batches"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    warehouse_id = Column(Integer, ForeignKey("warehouses.id"), nullable=False, index=True)
    batch_number = Column(String(50), nullable=False)
    quantity = Column(Integer, nullable=False, default=0)
    expiry_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="batches")
    warehouse = relationship("Warehouse", back_populates="batches")
