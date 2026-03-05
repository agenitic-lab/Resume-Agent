"""Add indexes to support_tickets table for better query performance."""
from alembic import op

def upgrade():
    """Create indexes on support_tickets table."""
    # Index on created_at (descending) for ordering by recent tickets
    op.execute(
        'CREATE INDEX IF NOT EXISTS idx_support_created_at ON support_tickets (created_at DESC)'
    )
    
    # Index on status for filtering by status
    op.execute(
        'CREATE INDEX IF NOT EXISTS idx_support_status ON support_tickets (status)'
    )
    
    # Combined index on status and created_at for common queries
    op.execute(
        'CREATE INDEX IF NOT EXISTS idx_support_status_created ON support_tickets (status, created_at DESC)'
    )

def downgrade():
    """Drop indexes from support_tickets table."""
    op.execute('DROP INDEX IF EXISTS idx_support_created_at')
    op.execute('DROP INDEX IF EXISTS idx_support_status')
    op.execute('DROP INDEX IF EXISTS idx_support_status_created')
