-- ====================================================================
-- E-Sevai SaaS Platform - Database Optimizations Migration Script
-- Version: 1.0.0
-- Description: Adds indexes, unique constraints, composite keys, and search indexes.
-- ====================================================================

-- 1. FOREIGN KEY INDEXES (Optimizes JOIN speeds across tables)
CREATE INDEX IF NOT EXISTS idx_center_staff_center_id ON center_staff(center_id);
CREATE INDEX IF NOT EXISTS idx_center_staff_user_id ON center_staff(user_id);
CREATE INDEX IF NOT EXISTS idx_center_invitations_center_id ON center_invitations(center_id);
CREATE INDEX IF NOT EXISTS idx_applications_center_id ON applications(center_id);
CREATE INDEX IF NOT EXISTS idx_applications_service_id ON applications(service_id);
CREATE INDEX IF NOT EXISTS idx_applications_assigned_staff_id ON applications(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_documents_application_id ON documents(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_application_id ON payments(application_id);
CREATE INDEX IF NOT EXISTS idx_payments_center_id ON payments(center_id);
CREATE INDEX IF NOT EXISTS idx_receipts_payment_id ON receipts(payment_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_report_exports_user_id ON report_exports(user_id);

-- 2. UNIQUE CONSTRAINTS (Enforces logical business uniqueness)
-- E.g. Unique center codes, application numbers, payment numbers, and receipt numbers
ALTER TABLE centers ADD CONSTRAINT uq_centers_center_code UNIQUE (center_code);
ALTER TABLE applications ADD CONSTRAINT uq_applications_application_number UNIQUE (application_number);
ALTER TABLE payments ADD CONSTRAINT uq_payments_payment_number UNIQUE (payment_number);
ALTER TABLE receipts ADD CONSTRAINT uq_receipts_receipt_number UNIQUE (receipt_number);

-- 3. COMPOSITE INDEXES (Optimizes analytics dashboards and filter aggregates)
CREATE INDEX IF NOT EXISTS idx_apps_center_status ON applications(center_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_center_status ON payments(center_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_docs_app_status ON documents(application_id, verification_status);

-- 4. FUZZY SEARCH INDEXES (Optimizes text searching)
-- Enable postgres extension for trigram matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_apps_search_trgm ON applications USING gin (
    application_number gin_trgm_ops,
    customer_name gin_trgm_ops,
    customer_phone gin_trgm_ops
);

CREATE INDEX IF NOT EXISTS idx_payments_search_trgm ON payments USING gin (
    payment_number gin_trgm_ops,
    customer_name gin_trgm_ops,
    transaction_reference gin_trgm_ops
);
