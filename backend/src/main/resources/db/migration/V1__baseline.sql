-- Credora baseline schema (PostgreSQL)

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    address TEXT,
    employment_status VARCHAR(100),
    monthly_income NUMERIC(12,2),
    id_passport_number VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    employer_name VARCHAR(255),
    bank_name VARCHAR(255),
    bank_account_number VARCHAR(50),
    email_verified BOOLEAN DEFAULT FALSE,
    terms_accepted_at TIMESTAMP,
    privacy_accepted_at TIMESTAMP,
    credit_consent_at TIMESTAMP,
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS institutions (
    id BIGSERIAL PRIMARY KEY,
    institution_name VARCHAR(255) NOT NULL,
    registration_license_number VARCHAR(255) NOT NULL UNIQUE,
    contact_person_name VARCHAR(255),
    business_address TEXT,
    institution_website VARCHAR(255),
    institution_email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    role VARCHAR(32) DEFAULT 'LOAN_OFFICER',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_applications (
    id BIGSERIAL PRIMARY KEY,
    reference_id VARCHAR(50) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id),
    loan_type VARCHAR(50),
    purpose VARCHAR(255),
    loan_amount NUMERIC(14,2),
    term_months INT,
    monthly_income NUMERIC(12,2),
    employment_status VARCHAR(100),
    existing_credit_score INT,
    mobile_money_avg NUMERIC(12,2),
    utility_payment_score INT,
    sector_details TEXT,
    existing_debt NUMERIC(12,2),
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    ai_credit_score INT,
    approval_probability DOUBLE PRECISION,
    recommended_amount NUMERIC(14,2),
    estimated_apr DOUBLE PRECISION,
    ai_summary TEXT,
    ai_recommendation VARCHAR(32),
    rejection_reason TEXT,
    assigned_officer_id BIGINT,
    officer_override_reason TEXT,
    submitted_date DATE,
    approval_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loans (
    id BIGSERIAL PRIMARY KEY,
    reference_id VARCHAR(50) NOT NULL UNIQUE,
    application_id BIGINT NOT NULL UNIQUE REFERENCES loan_applications(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    principal NUMERIC(14,2),
    interest_rate NUMERIC(5,2),
    term_months INT,
    months_paid INT DEFAULT 0,
    status VARCHAR(32) DEFAULT 'PENDING_DISBURSEMENT',
    disbursement_status VARCHAR(32) DEFAULT 'PENDING',
    monthly_payment NUMERIC(14,2),
    remaining_balance NUMERIC(14,2),
    start_date DATE,
    next_payment_date DATE,
    disbursed_at TIMESTAMP,
    auto_pay_enabled BOOLEAN,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loan_payments (
    id BIGSERIAL PRIMARY KEY,
    loan_id BIGINT NOT NULL REFERENCES loans(id),
    amount NUMERIC(14,2),
    principal_portion NUMERIC(14,2),
    interest_portion NUMERIC(14,2),
    reference_number VARCHAR(50),
    status VARCHAR(32) DEFAULT 'COMPLETED',
    payment_method VARCHAR(32) DEFAULT 'MANUAL',
    external_reference VARCHAR(100),
    payment_date TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS application_documents (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES loan_applications(id),
    document_type VARCHAR(100),
    file_name VARCHAR(255),
    content_type VARCHAR(100),
    content_base64 TEXT,
    storage_key VARCHAR(500),
    file_size BIGINT,
    sha256_hash VARCHAR(64),
    virus_scan_status VARCHAR(32) DEFAULT 'PENDING',
    status VARCHAR(32) DEFAULT 'PENDING_REVIEW',
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS otp_verifications (
    id BIGSERIAL PRIMARY KEY,
    phone_number VARCHAR(50) NOT NULL,
    code VARCHAR(10) NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_reminders (
    id BIGSERIAL PRIMARY KEY,
    loan_id BIGINT NOT NULL REFERENCES loans(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    due_date DATE NOT NULL,
    amount NUMERIC(14,2),
    channel VARCHAR(32),
    sent_at TIMESTAMP,
    status VARCHAR(32) DEFAULT 'PENDING',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_type VARCHAR(32),
    actor_id BIGINT,
    actor_email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id BIGINT,
    ip_address VARCHAR(45),
    details TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    token_hash VARCHAR(128) NOT NULL UNIQUE,
    token_type VARCHAR(32) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consent_records (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    consent_type VARCHAR(64) NOT NULL,
    version VARCHAR(20),
    ip_address VARCHAR(45),
    accepted_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS application_notes (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES loan_applications(id),
    officer_id BIGINT NOT NULL,
    officer_email VARCHAR(255),
    note_type VARCHAR(32) DEFAULT 'NOTE',
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    loan_id BIGINT REFERENCES loans(id),
    user_id BIGINT REFERENCES users(id),
    amount NUMERIC(14,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    provider VARCHAR(32) NOT NULL,
    transaction_type VARCHAR(32) NOT NULL,
    external_id VARCHAR(100),
    checkout_request_id VARCHAR(100),
    merchant_request_id VARCHAR(100),
    phone_number VARCHAR(50),
    status VARCHAR(32) DEFAULT 'PENDING',
    raw_callback TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS in_app_notifications (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category VARCHAR(50),
    read_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_tx_checkout ON payment_transactions(checkout_request_id);
CREATE INDEX IF NOT EXISTS idx_user_tokens_hash ON user_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON in_app_notifications(user_id, created_at DESC);
