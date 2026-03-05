-- ═══════════════════════════════════════════
-- ANVELOPE UNGHENI – Final Supabase SQL Schema
-- ═══════════════════════════════════════════

-- 1. CLIENTS (clienti)
CREATE TABLE IF NOT EXISTS clienti (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nume TEXT NOT NULL,
  telefon TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CARS (masini)
CREATE TABLE IF NOT EXISTS masini (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clienti(id) ON DELETE CASCADE,
  numar_masina TEXT NOT NULL,
  marca_model TEXT,
  dimensiune_anvelope TEXT,
  last_km INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. FIȘE SERVICE (service_records)
CREATE TABLE IF NOT EXISTS service_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  service_number TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES clienti(id),
  client_name TEXT NOT NULL,
  phone TEXT,
  car_number TEXT NOT NULL,
  car_details TEXT, -- brand/model
  tire_size TEXT,
  km_bord INTEGER,
  services JSONB NOT NULL DEFAULT '{}',
  hotel_id UUID, -- If separate hotel record is used
  mecanic TEXT,
  observatii TEXT,
  data_intrarii DATE DEFAULT CURRENT_DATE,
  created_by TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. HOTEL ANVELOPE (hotel_anvelope)
CREATE TABLE IF NOT EXISTS hotel_anvelope (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clienti(id),
  service_record_id UUID REFERENCES service_records(id),
  dimensiune_anvelope TEXT,
  marca_model TEXT,
  status_observatii TEXT,
  saci BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'Depozitate', -- Depozitate / Ridicate
  data_depozitare DATE DEFAULT CURRENT_DATE,
  data_ridicare DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. INVENTAR/STOCURI (stocuri)
CREATE TABLE IF NOT EXISTS stocuri (
  id SERIAL PRIMARY KEY,
  brand TEXT NOT NULL,
  dimensiune TEXT NOT NULL,
  sezon TEXT NOT NULL,
  cantitate INTEGER DEFAULT 0,
  pret_achizitie NUMERIC(10, 2) DEFAULT 0,
  pret_vanzare NUMERIC(10, 2) DEFAULT 0,
  locatie_raft TEXT,
  furnizor TEXT,
  tip_achizitie TEXT DEFAULT 'Cu factură',
  dot TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. MISCARI STOC (stock_movements)
CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  anvelopa_id INTEGER REFERENCES stocuri(id) ON DELETE CASCADE,
  tip TEXT NOT NULL, -- intrare / iesire
  cantitate INTEGER NOT NULL,
  data DATE DEFAULT CURRENT_DATE,
  motiv_iesire TEXT,
  pret_achizitie NUMERIC(10, 2),
  pret_vanzare NUMERIC(10, 2),
  profit_per_bucata NUMERIC(10, 2),
  profit_total NUMERIC(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════
-- TRIGGERS & POLICIES
-- ═══════════════════════════════════════════

-- Auto-number for service records
CREATE OR REPLACE FUNCTION generate_service_num()
RETURNS TRIGGER AS $$
DECLARE
  next_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(service_number AS INTEGER)), 0) + 1
  INTO next_num FROM service_records;
  NEW.service_number := LPAD(next_num::TEXT, 8, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Service Record Numbering
CREATE OR REPLACE TRIGGER trg_service_num
  BEFORE INSERT ON service_records
  FOR EACH ROW
  WHEN (NEW.service_number IS NULL OR NEW.service_number = '')
  EXECUTE FUNCTION generate_service_num();

-- Simple permissive policies
ALTER TABLE clienti ENABLE ROW LEVEL SECURITY;
ALTER TABLE masini ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_anvelope ENABLE ROW LEVEL SECURITY;
ALTER TABLE stocuri ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access for all" ON clienti FOR ALL USING (true);
CREATE POLICY "Full access for all" ON masini FOR ALL USING (true);
CREATE POLICY "Full access for all" ON service_records FOR ALL USING (true);
CREATE POLICY "Full access for all" ON hotel_anvelope FOR ALL USING (true);
CREATE POLICY "Full access for all" ON stocuri FOR ALL USING (true);
CREATE POLICY "Full access for all" ON stock_movements FOR ALL USING (true);
