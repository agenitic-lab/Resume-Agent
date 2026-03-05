-- Add is_read column to support_tickets table
ALTER TABLE support_tickets ADD COLUMN is_read BOOLEAN DEFAULT FALSE NOT NULL;
