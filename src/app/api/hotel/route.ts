import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET() {
    try {
        const supabase = await createServerSupabase();

        // SOURCE 1: hotel_anvelope TABLE (new records, created after schema migration)
        const { data: tableRows, error: tableErr } = await supabase
            .from('hotel_anvelope')
            .select('*')
            .order('created_at', { ascending: false });

        if (tableErr && tableErr.code !== '42P01') {
            console.error('[API Hotel] hotel_anvelope table error:', tableErr);
        }

        const activeTableRows = (tableRows || []).filter((h: any) => h.deleted_at == null);

        // Track which service_record_ids are already covered by TABLE records
        const tableServiceIds = new Set(
            activeTableRows.map((h: any) => h.service_record_id).filter(Boolean)
        );

        // Batch fetch service_records info for TABLE rows
        const serviceIdsForTable = [...tableServiceIds];
        const serviceMapForTable: Record<string, any> = {};
        if (serviceIdsForTable.length > 0) {
            const { data: srRows } = await supabase
                .from('service_records')
                .select('id, client_name, phone, car_number, car_details, data_intrarii')
                .in('id', serviceIdsForTable);
            (srRows || []).forEach((sr: any) => { serviceMapForTable[sr.id] = sr; });
        }

        // Batch fetch clienti for TABLE rows without service_record_id
        const clientIdsForTable = [...new Set(
            activeTableRows.filter((h: any) => !h.service_record_id && h.client_id)
                .map((h: any) => h.client_id)
        )];
        const clientMapForTable: Record<string, any> = {};
        if (clientIdsForTable.length > 0) {
            const { data: clRows } = await supabase
                .from('clienti')
                .select('id, nume, telefon')
                .in('id', clientIdsForTable);
            (clRows || []).forEach((c: any) => { clientMapForTable[c.id] = c; });
        }

        const tableResults = activeTableRows.map((h: any) => {
            const sr = serviceMapForTable[h.service_record_id] || null;
            const cl = clientMapForTable[h.client_id] || null;
            return {
                id: h.service_record_id || h.id,
                hotel_id: h.id,
                client_nume: sr?.client_name || cl?.nume || 'Necunoscut',
                client_telefon: sr?.phone || cl?.telefon || '',
                numar_masina: sr?.car_number || '',
                marca_model: sr?.car_details || '',
                data_intrarii: sr?.data_intrarii || h.created_at?.split('T')[0] || '',
                hotel_anvelope: {
                    activ: true,
                    status_hotel: h.status === 'Ridicate' ? 'Ridicate' : 'Depozitate',
                    dimensiune_anvelope: h.dimensiune_anvelope || '',
                    marca_model: h.marca_model || '',
                    status_observatii: h.status_observatii || '',
                    saci: h.saci || false,
                    tip_depozit: h.tip_depozit || 'Anvelope',
                    bucati: h.bucati || 4,
                    data_depozitare: h.data_depozitare || h.created_at?.split('T')[0] || '',
                },
            };
        });

        // SOURCE 2: service_records JSONB (old records before hotel_anvelope table was used)
        const { data: srAllRows, error: srErr } = await supabase
            .from('service_records')
            .select('id, client_name, phone, car_number, car_details, data_intrarii, services, created_at')
            .not('services', 'is', null)
            .order('created_at', { ascending: false });

        if (srErr) {
            console.error('[API Hotel] service_records query error:', srErr);
        }

        // Filter: hotel activ in JSONB AND not already covered by TABLE
        const jsonbHotelRows = (srAllRows || []).filter((sr: any) => {
            if (tableServiceIds.has(sr.id)) return false;
            return sr.services?.hotel_anvelope?.activ === true;
        });

        const jsonbResults = jsonbHotelRows.map((sr: any) => {
            const h = sr.services.hotel_anvelope;
            return {
                id: sr.id,
                hotel_id: null,
                client_nume: sr.client_name || 'Necunoscut',
                client_telefon: sr.phone || '',
                numar_masina: sr.car_number || '',
                marca_model: sr.car_details || '',
                data_intrarii: sr.data_intrarii || sr.created_at?.split('T')[0] || '',
                hotel_anvelope: {
                    activ: true,
                    status_hotel: h.status_hotel || 'Depozitate',
                    dimensiune_anvelope: h.dimensiune_anvelope || '',
                    marca_model: h.marca_model || '',
                    status_observatii: h.status_observatii || '',
                    saci: h.saci || false,
                    tip_depozit: h.tip_depozit || 'Anvelope',
                    bucati: h.bucati || 4,
                    data_depozitare: h.data_depozitare || sr.data_intrarii || sr.created_at?.split('T')[0] || '',
                },
            };
        });

        // Combine both sources, sort newest first
        const combined = [...tableResults, ...jsonbResults].sort((a, b) => {
            const da = new Date(a.hotel_anvelope.data_depozitare || a.data_intrarii || 0).getTime();
            const db = new Date(b.hotel_anvelope.data_depozitare || b.data_intrarii || 0).getTime();
            return db - da;
        });

        return NextResponse.json({ data: combined });
    } catch (err: any) {
        console.error('[API Hotel] Fatal error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
