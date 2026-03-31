-- ═══════════════════════════════════════════════════════════
-- MIGRARE: Multi-Vehicle Client Support
-- Data: 2026-03-31
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- PART 1: Creare tabel client_vehicles
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS client_vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES clienti(id) ON DELETE CASCADE,
    numar_masina TEXT NOT NULL,
    marca_model TEXT,
    dimensiune_anvelope TEXT,
    km_bord INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pentru căutare rapidă
CREATE INDEX IF NOT EXISTS idx_client_vehicles_client_id ON client_vehicles(client_id);
CREATE INDEX IF NOT EXISTS idx_client_vehicles_nr_masina ON client_vehicles(numar_masina);

-- ═══════════════════════════════════════════════════════════
-- PART 2: Migrează datele existente din masini
-- ═══════════════════════════════════════════════════════════

-- Mută datele din tabelul masini în client_vehicles
INSERT INTO client_vehicles (id, client_id, numar_masina, marca_model, dimensiune_anvelope, km_bord, created_at)
SELECT 
    id,
    client_id,
    numar_masina,
    marca_model,
    dimensiune_anvelope,
    COALESCE(last_km, 0) as km_bord,
    created_at
FROM masini
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- PART 3: Adaugă vehicle_id în service_records
-- ═══════════════════════════════════════════════════════════

-- Adaugă coloana vehicle_id dacă nu există
ALTER TABLE service_records 
ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES client_vehicles(id) ON DELETE SET NULL;

-- Adaugă index pentru performanță
CREATE INDEX IF NOT EXISTS idx_service_records_vehicle_id ON service_records(vehicle_id);

-- ═══════════════════════════════════════════════════════════
-- PART 4: Link existing service records to vehicles
-- ═══════════════════════════════════════════════════════════

-- Update service_records să pointeze către vehicle_id pe baza car_number
UPDATE service_records sr
SET vehicle_id = cv.id
FROM client_vehicles cv
WHERE sr.vehicle_id IS NULL 
  AND sr.car_number IS NOT NULL
  AND LOWER(TRIM(sr.car_number)) = LOWER(TRIM(cv.numar_masina));

-- ═══════════════════════════════════════════════════════════
-- PART 5: View pentru client history cu multiple vehicles
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW client_vehicles_history AS
SELECT 
    c.id as client_id,
    c.nume as client_nume,
    c.telefon as client_telefon,
    cv.id as vehicle_id,
    cv.numar_masina,
    cv.marca_model,
    cv.dimensiune_anvelope,
    cv.km_bord as last_km,
    COUNT(DISTINCT sr.id) as total_fise,
    MAX(sr.data_intrarii) as ultima_vizita,
    COALESCE(SUM(
        COALESCE((sr.services->'servicii'->'vulcanizare'->>'pret_total')::NUMERIC, 0) +
        COALESCE((sr.services->'servicii'->'aer_conditionat'->>'pret_total')::NUMERIC, 0) +
        COALESCE((sr.services->'servicii'->'frana'->>'pret_total')::NUMERIC, 0) +
        COALESCE((sr.services->'servicii'->'vopsit_jante'->>'pret_total')::NUMERIC, 0)
    ), 0) as total_cheltuit
FROM clienti c
LEFT JOIN client_vehicles cv ON cv.client_id = c.id
LEFT JOIN service_records sr ON sr.vehicle_id = cv.id
GROUP BY c.id, c.nume, c.telefon, cv.id, cv.numar_masina, cv.marca_model, cv.dimensiune_anvelope, cv.km_bord;

-- ═══════════════════════════════════════════════════════════
-- PART 6: Funcție pentru a obține toate mașinile unui client
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_client_vehicles(p_client_id UUID)
RETURNS TABLE (
    vehicle_id UUID,
    numar_masina TEXT,
    marca_model TEXT,
    dimensiune_anvelope TEXT,
    km_bord INTEGER,
    total_fise BIGINT,
    ultima_vizita DATE,
    total_cheltuit NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cv.id as vehicle_id,
        cv.numar_masina,
        cv.marca_model,
        cv.dimensiune_anvelope,
        cv.km_bord,
        COUNT(DISTINCT sr.id) as total_fise,
        MAX(sr.data_intrarii) as ultima_vizita,
        COALESCE(SUM(
            COALESCE((sr.services->'servicii'->'vulcanizare'->>'pret_total')::NUMERIC, 0) +
            COALESCE((sr.services->'servicii'->'aer_conditionat'->>'pret_total')::NUMERIC, 0)
        ), 0) as total_cheltuit
    FROM client_vehicles cv
    LEFT JOIN service_records sr ON sr.vehicle_id = cv.id
    WHERE cv.client_id = p_client_id
    GROUP BY cv.id, cv.numar_masina, cv.marca_model, cv.dimensiune_anvelope, cv.km_bord
    ORDER BY MAX(sr.data_intrarii) DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- PART 7: Funcție pentru a obține fișele unei mașini
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_vehicle_service_history(p_vehicle_id UUID)
RETURNS TABLE (
    fisa_id UUID,
    numar_fisa TEXT,
    data_intrarii DATE,
    mecanic TEXT,
    km_bord INTEGER,
    servicii JSONB,
    total_servicii NUMERIC,
    observatii TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sr.id as fisa_id,
        sr.service_number as numar_fisa,
        sr.data_intrarii,
        sr.mecanic,
        sr.km_bord,
        sr.services as servicii,
        (
            COALESCE((sr.services->'servicii'->'vulcanizare'->>'pret_total')::NUMERIC, 0) +
            COALESCE((sr.services->'servicii'->'aer_conditionat'->>'pret_total')::NUMERIC, 0) +
            COALESCE((sr.services->'servicii'->'frana'->>'pret_total')::NUMERIC, 0) +
            COALESCE((sr.services->'servicii'->'vopsit_jante'->>'pret_total')::NUMERIC, 0)
        ) as total_servicii,
        sr.observatii
    FROM service_records sr
    WHERE sr.vehicle_id = p_vehicle_id
    ORDER BY sr.data_intrarii DESC, sr.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- PART 8: Trigger pentru updated_at
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_client_vehicles_updated_at ON client_vehicles;
CREATE TRIGGER update_client_vehicles_updated_at
    BEFORE UPDATE ON client_vehicles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════
-- MIGRARE COMPLETĂ
-- ═══════════════════════════════════════════════════════════

SELECT 'Multi-vehicle migration completed successfully!' as status;
