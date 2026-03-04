-- 1. Change the default value of the status column
ALTER TABLE support_tickets ALTER COLUMN status SET DEFAULT 'unread';
