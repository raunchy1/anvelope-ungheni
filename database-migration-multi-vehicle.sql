-- ═══════════════════════════════════════════════════════════
-- MIGRARE: Multi-Vehicle Support + Stock Sales in PDF
-- Anvelope Ungheni Pro
-- ═══════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════
-- PART 1: Ensure client_id and car_id exist in service_records
-- ═══════════════════════════════════════════════════════════

-- Add client_id column if not exists
ALTER TABLE service_records 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clienti(id) ON DELETE SET NULL;

-- Add vehicle_id column to link to masini table
ALTER TABLE service_records 
ADD COLUMN IF NOT EXISTS vehicle_id UUID REFERENCES masini(id) ON DELETE SET NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_service_records_client_id ON service_records(client_id);
CREATE INDEX IF NOT EXISTS idx_service_records_vehicle_id ON service_records(vehicle_id);

-- ═══════════════════════════════════════════════════════════
-- PART 2: Migrate existing data
-- This will match existing service records with clients and vehicles
-- ═══════════════════════════════════════════════════════════

-- Update service_records to link to existing clients by name
UPDATE service_records sr
SET client_id = c.id
FROM clienti c
WHERE sr.client_id IS NULL 
  AND sr.client_name IS NOT NULL
  AND LOWER(TRIM(sr.client_name)) = LOWER(TRIM(c.nume));

-- Update service_records to link to existing vehicles by car_number
UPDATE service_records sr
SET vehicle_id = m.id
FROM masini m
WHERE sr.vehicle_id IS NULL 
  AND sr.car_number IS NOT NULL
  AND sr.client_id = m.client_id
  AND LOWER(TRIM(sr.car_number)) = LOWER(TRIM(m.numar_masina));

-- ═══════════════════════════════════════════════════════════
-- PART 3: Create view for easier client-vehicle-fisa queries
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW client_service_history AS
SELECT 
    c.id as client_id,
    c.nume as client_nume,
    c.telefon as client_telefon,
    m.id as vehicle_id,
    m.numar_masina,
    m.marca_model,
    m.dimensiune_anvelope,
    sr.id as fisa_id,
    sr.service_number as numar_fisa,
    sr.data_intrarii,
    sr.km_bord,
    sr.mecanic,
    sr.services as servicii,
    sr.observatii,
    sr.created_at as fisa_created_at
FROM clienti c
LEFT JOIN masini m ON m.client_id = c.id
LEFT JOIN service_records sr ON sr.client_id = c.id 
    AND (sr.vehicle_id = m.id OR sr.car_number = m.numar_masina);

-- ═══════════════════════════════════════════════════════════
-- PART 4: Create function to get client statistics
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_client_statistics(p_client_id UUID)
RETURNS TABLE (
    total_vizite BIGINT,
    total_cheltuit NUMERIC,
    total_profit NUMERIC,
    total_anvelope_vandute BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT sr.id)::BIGINT as total_vizite,
        COALESCE(SUM((sr.services->>'pret_total')::NUMERIC), 0) as total_cheltuit,
        COALESCE(SUM((sr.services->'servicii'->'vulcanizare'->>'total_profit_stoc')::NUMERIC), 0) as total_profit,
        COALESCE(SUM((sr.services->'servicii'->'vulcanizare'->>'total_bucati_stoc')::BIGINT), 0) as total_anvelope_vandute
    FROM service_records sr
    WHERE sr.client_id = p_client_id;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- PART 5: Ensure stock_movements has proper reference linking
-- ═══════════════════════════════════════════════════════════

-- Add reference_type to distinguish between different types of references
ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS reference_type TEXT DEFAULT 'service_record';

-- Update existing records
UPDATE stock_movements 
SET reference_type = 'service_record' 
WHERE reference_type IS NULL AND reference_id IS NOT NULL;

-- Create index for reference lookups
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_full 
ON stock_movements(reference_id, reference_type);

-- ═══════════════════════════════════════════════════════════
-- PART 6: Backward compatibility - ensure old data still works
-- ═══════════════════════════════════════════════════════════

-- Create a function to get fisa with enriched stock data for PDF generation
CREATE OR REPLACE FUNCTION get_fisa_with_stock_sales(p_fisa_id UUID)
RETURNS TABLE (
    fisa_id UUID,
    service_number TEXT,
    client_name TEXT,
    phone TEXT,
    car_number TEXT,
    car_details TEXT,
    data_intrarii DATE,
    mecanic TEXT,
    observatii TEXT,
    services JSONB,
    stock_sales JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sr.id as fisa_id,
        sr.service_number,
        sr.client_name,
        sr.phone,
        sr.car_number,
        sr.car_details,
        sr.data_intrarii,
        sr.mecanic,
        sr.observatii,
        sr.services,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', sm.id,
                    'brand', s.brand,
                    'model', s.brand,
                    'dimensiune', s.dimensiune,
                    'dot', s.dot,
                    'cantitate', sm.cantitate,
                    'pret_vanzare', sm.pret_vanzare,
                    'pret_achizitie', sm.pret_achizitie,
                    'profit_total', sm.profit_total
                )
            )
            FROM stock_movements sm
            JOIN stocuri s ON s.id = sm.anvelopa_id
            WHERE sm.reference_id = sr.id
            AND sm.tip = 'iesire'
        ) as stock_sales
    FROM service_records sr
    WHERE sr.id = p_fisa_id;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════

SELECT 'Migration completed successfully!' as status;
