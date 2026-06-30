-- Align loan_payments with JPA entity (created_at + date payment_date)
ALTER TABLE loan_payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT NOW();
ALTER TABLE loan_payments ALTER COLUMN payment_date TYPE DATE USING payment_date::date;
