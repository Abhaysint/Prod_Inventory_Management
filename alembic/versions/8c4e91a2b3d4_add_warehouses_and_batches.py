"""add warehouses and stock_batches tables

Revision ID: 8c4e91a2b3d4
Revises: 2bd086e87e6d
Create Date: 2026-11-01 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8c4e91a2b3d4'
down_revision: Union[str, Sequence[str], None] = '2bd086e87e6d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'warehouses',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('code', sa.String(length=20), nullable=False),
        sa.Column('city', sa.String(length=100), nullable=False),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
        sa.UniqueConstraint('code'),
    )
    op.create_table(
        'stock_batches',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('warehouse_id', sa.Integer(), nullable=False),
        sa.Column('batch_number', sa.String(length=50), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('expiry_date', sa.Date(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['products.id']),
        sa.ForeignKeyConstraint(['warehouse_id'], ['warehouses.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_stock_batches_product_id', 'stock_batches', ['product_id'], unique=False)
    op.create_index('ix_stock_batches_warehouse_id', 'stock_batches', ['warehouse_id'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_stock_batches_warehouse_id', table_name='stock_batches')
    op.drop_index('ix_stock_batches_product_id', table_name='stock_batches')
    op.drop_table('stock_batches')
    op.drop_table('warehouses')

