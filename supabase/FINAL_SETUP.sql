
-- ============================================
-- FIXURI CRITICE - ANVELOPE UNGHENI
-- ============================================

-- Extensie pentru căutare fuzzy
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================
-- M2: Sequence pentru numere fișă atomice
-- ============================================
CREATE SEQUENCE IF NOT EXISTS service_number_seq START 181;

CREATE OR REPLACE FUNCTION get_next_service_number()
RETURNS TEXT AS $$
DECLARE
    next_num INTEGER;
BEGIN
    SELECT nextval('service_number_seq') INTO next_num;
    RETURN LPAD(next_num::TEXT, 8, '0');
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- C4, C5, M1, M7: Funcție atomică creare fișă
-- ============================================
CREATE OR REPLACE FUNCTION create_service_with_stock(
    p_service_data JSONB,
    p_stock_items JSONB
) RETURNS JSONB AS $$
DECLARE
    v_service_id UUID;
    v_client_id UUID;
    v_item JSONB;
    v_current_qty INTEGER;
    v_fingerprint TEXT;
    v_lock_acquired BOOLEAN;
    v_service_number TEXT;
    v_total_vanzare_stoc NUMERIC := 0;
    v_total_profit_stoc NUMERIC := 0;
    v_total_bucati_stoc INTEGER := 0;
BEGIN
    v_fingerprint := (p_service_data->>'client_nume') || '_' || (p_service_data->>'numar_masina');
    
    SELECT pg_try_advisory_xact_lock(hashtext('fisa_' || v_fingerprint)) INTO v_lock_acquired;
    
    IF NOT v_lock_acquired THEN
        RETURN jsonb_build_object('error', 'Request already processing');
    END IF;

    IF p_service_data->>'numar_fisa' IS NULL OR p_service_data->>'numar_fisa' = '' THEN
        v_service_number := get_next_service_number();
    ELSE
        v_service_number := p_service_data->>'numar_fisa';
    END IF;

    -- Find or create client
    SELECT id INTO v_client_id
    FROM clienti
    WHERE nume ILIKE (p_service_data->>'client_nume')
    LIMIT 1;

    IF v_client_id IS NULL THEN
        INSERT INTO clienti (nume, telefon, created_at)
        VALUES (
            p_service_data->>'client_nume',
            COALESCE(p_service_data->>'client_telefon', ''),
            NOW()
        )
        RETURNING id INTO v_client_id;
    END IF;

    -- Insert service record
    INSERT INTO service_records (
        service_number, client_id, client_name, phone,
        car_number, car_details, tire_size, km_bord,
        services, mecanic, observatii, data_intrarii, created_at
    ) VALUES (
        v_service_number, v_client_id,
        p_service_data->>'client_nume',
        COALESCE(p_service_data->>'client_telefon', ''),
        p_service_data->>'numar_masina',
        p_service_data->>'marca_model',
        p_service_data->>'dimensiune_anvelope',
        COALESCE((p_service_data->>'km_bord')::INTEGER, 0),
        p_service_data->'servicii',
        p_service_data->>'mecanic',
        p_service_data->>'observatii',
        COALESCE((p_service_data->>'data_intrarii')::DATE, CURRENT_DATE),
        NOW()
    ) RETURNING id INTO v_service_id;

    -- Process stock items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_stock_items)
    LOOP
        IF (v_item->>'id_stoc') IS NULL OR (v_item->>'cantitate') IS NULL THEN
            CONTINUE;
        END IF;

        SELECT cantitate INTO v_current_qty
        FROM stocuri
        WHERE id = (v_item->>'id_stoc')::INTEGER
        FOR UPDATE;
        
        IF v_current_qty IS NULL THEN
            RAISE EXCEPTION 'Produsul cu ID % nu exista', v_item->>'id_stoc';
        END IF;
        
        IF v_current_qty < COALESCE((v_item->>'cantitate')::INTEGER, 0) THEN
            RAISE EXCEPTION 'Stoc insuficient: disponibil %, necesar %', 
                v_current_qty, v_item->>'cantitate';
        END IF;
        
        UPDATE stocuri 
        SET cantitate = cantitate - (v_item->>'cantitate')::INTEGER,
            updated_at = NOW()
        WHERE id = (v_item->>'id_stoc')::INTEGER;
        
        INSERT INTO stock_movements (
            anvelopa_id, reference_id, tip, cantitate, data,
            motiv_iesire, pret_achizitie, pret_vanzare,
            profit_per_bucata, profit_total, created_at
        ) VALUES (
            (v_item->>'id_stoc')::INTEGER, v_service_id, 'iesire',
            (v_item->>'cantitate')::INTEGER,
            COALESCE((p_service_data->>'data_intrarii')::DATE, CURRENT_DATE),
            'vanzare',
            COALESCE((v_item->>'pret_achizitie')::NUMERIC, 0),
            COALESCE((v_item->>'pret_unitate')::NUMERIC, 0),
            COALESCE((v_item->>'pret_unitate')::NUMERIC, 0) - COALESCE((v_item->>'pret_achizitie')::NUMERIC, 0),
            (COALESCE((v_item->>'pret_unitate')::NUMERIC, 0) - COALESCE((v_item->>'pret_achizitie')::NUMERIC, 0)) * (v_item->>'cantitate')::INTEGER,
            NOW()
        );

        v_total_vanzare_stoc := v_total_vanzare_stoc + (COALESCE((v_item->>'pret_unitate')::NUMERIC, 0) * (v_item->>'cantitate')::INTEGER);
        v_total_profit_stoc := v_total_profit_stoc + ((COALESCE((v_item->>'pret_unitate')::NUMERIC, 0) - COALESCE((v_item->>'pret_achizitie')::NUMERIC, 0)) * (v_item->>'cantitate')::INTEGER);
        v_total_bucati_stoc := v_total_bucati_stoc + (v_item->>'cantitate')::INTEGER;
    END LOOP;

    UPDATE service_records
    SET services = jsonb_set(
        services,
        '{servicii,vulcanizare}',
        COALESCE(services->'servicii'->'vulcanizare', '{}'::jsonb) || jsonb_build_object(
            'total_vanzare_stoc', v_total_vanzare_stoc,
            'total_profit_stoc', v_total_profit_stoc,
            'total_bucati_stoc', v_total_bucati_stoc
        )
    )
    WHERE id = v_service_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'id', v_service_id,
        'client_id', v_client_id,
        'service_number', v_service_number,
        'stats', jsonb_build_object(
            'total_vanzare_stoc', v_total_vanzare_stoc,
            'total_profit_stoc', v_total_profit_stoc,
            'total_bucati_stoc', v_total_bucati_stoc
        )
    );
EXCEPTION WHEN OTHERS THEN
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- M3, M12: Funcție ștergere cu restaurare
-- ============================================
CREATE OR REPLACE FUNCTION delete_service_with_restore(
    p_service_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_restored JSONB := '[]'::JSONB;
    v_errors TEXT[] := ARRAY[]::TEXT[];
    v_movement RECORD;
BEGIN
    FOR v_movement IN 
        SELECT anvelopa_id, cantitate, pret_vanzare, pret_achizitie, profit_total
        FROM stock_movements 
        WHERE reference_id = p_service_id AND tip = 'iesire'
    LOOP
        BEGIN
            UPDATE stocuri 
            SET cantitate = cantitate + v_movement.cantitate,
                updated_at = NOW()
            WHERE id = v_movement.anvelopa_id;
            
            v_restored := v_restored || jsonb_build_object(
                'id', v_movement.anvelopa_id,
                'qty', v_movement.cantitate
            );
        EXCEPTION WHEN OTHERS THEN
            v_errors := array_append(v_errors, 'Failed to restore stock for ID ' || v_movement.anvelopa_id::TEXT);
        END;
    END LOOP;
    
    DELETE FROM stock_movements WHERE reference_id = p_service_id;
    DELETE FROM hotel_anvelope WHERE service_record_id = p_service_id;
    DELETE FROM service_records WHERE id = p_service_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'restored', v_restored,
        'errors', CASE WHEN array_length(v_errors, 1) > 0 THEN v_errors ELSE NULL END
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- INDEXES pentru performanță
-- ============================================
CREATE INDEX IF NOT EXISTS idx_service_records_created_at ON service_records(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_records_client_id ON service_records(client_id);
CREATE INDEX IF NOT EXISTS idx_clienti_nume_gin ON clienti USING gin (nume gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_stocuri_brand_dimensiune ON stocuri(brand, dimensiune);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_id, tip);

SELECT 'Migrations applied successfully!' as status;
