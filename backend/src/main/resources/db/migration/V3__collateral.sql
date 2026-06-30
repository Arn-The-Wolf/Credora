-- Secured-loan collateral registry (mortgage property, auto vehicle, business assets)
CREATE TABLE IF NOT EXISTS collateral_assets (
    id BIGSERIAL PRIMARY KEY,
    application_id BIGINT NOT NULL REFERENCES loan_applications(id) ON DELETE CASCADE,
    collateral_type VARCHAR(50) NOT NULL,
    description VARCHAR(500),
    estimated_value DECIMAL(15, 2),
    identifier VARCHAR(120),
    lien_status VARCHAR(30) DEFAULT 'PENDING',
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_collateral_application ON collateral_assets(application_id);
