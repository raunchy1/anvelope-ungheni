-- ═══════════════════════════════════════════════════════════
-- MIGRARE: Soft Delete + Protecție Date
-- Anvelope Ungheni Pro
-- Rulează în Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Adaugă coloana deleted_at pe tabelele principale
ALTER TABLE service_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE hotel_anvelope ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE stocuri ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Adaugă coloana deleted_by pentru audit trail
ALTER TABLE service_records ADD COLUMN IF NOT EXISTS deleted_by TEXT DEFAULT NULL;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS deleted_by TEXT DEFAULT NULL;

-- 3. Index-uri pentru performanță pe filtrarea soft-delete
CREATE INDEX IF NOT EXISTS idx_service_records_active ON service_records(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_clienti_active ON clienti(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_hotel_active ON hotel_anvelope(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_stocuri_active ON stocuri(deleted_at) WHERE deleted_at IS NULL;

-- 4. View pentru a vedea doar înregistrările active (neșterse)
CREATE OR REPLACE VIEW active_service_records AS
SELECT * FROM service_records WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW active_clienti AS
SELECT * FROM clienti WHERE deleted_at IS NULL;

-- 5. Funcție pentru a recupera date șterse (undelete)
CREATE OR REPLACE FUNCTION restore_deleted_record(
    p_table TEXT,
    p_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    EXECUTE format('UPDATE %I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1', p_table)
    USING p_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

SELECT 'Soft Delete migration completed successfully!' as status;
