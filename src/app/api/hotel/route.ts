import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET() {
    try {
        const supabase = await createServerSupabase();

        // Query hotel_anvelope directly, joining both service_records and clienti
        // Works for both old records (client_id only) and new records (service_record_id)
        const { data, error } = await supabase
            .from('hotel_anvelope')
            .select(`
                *,
                service_records (
                    id,
                    client_name,
                    phone,
                    car_number,
                    car_details,
                    data_intrarii,
                    created_at
                ),
                clienti (
                    id,
                    nume,
                    telefon
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[API Hotel] Query error:', error);
            // Try without joins if column issue
            if (error.code === '42703' || error.code === '42P01') {
                const { data: fallback, error: fallbackErr } = await supabase
                    .from('hotel_anvelope')
                    .select('*')
                    .order('created_at', { ascending: false });
                if (fallbackErr) return NextResponse.json({ success: false, error: fallbackErr.message }, { status: 500 });
                return NextResponse.json({ data: mapHotelRecords(fallback || []) });
            }
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ data: mapHotelRecords(data || []) });
    } catch (err: any) {
        console.error('[API Hotel] Fatal error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

function mapHotelRecords(records: any[]) {
    return records.map((h: any) => {
        const sr = h.service_records;
        const cl = h.clienti;

        // Prefer service_record data, fall back to clienti data for old records
        const clientNume = sr?.client_name || cl?.nume || 'Necunoscut';
        const clientTelefon = sr?.phone || cl?.telefon || '';
        const numarMasina = sr?.car_number || '';
        const marcaModel = sr?.car_details || '';
        const dataIntrarii = sr?.data_intrarii || h.created_at?.split('T')[0] || '';

        // Determine status (active = shown in hotel, regardless of Depozitate/Ridicate)
        const isDeleted = h.deleted_at != null;
        if (isDeleted) return null;

        return {
            // Use service_record id for navigation (fise edit), fall back to hotel id
            id: h.service_record_id || h.id,
            hotel_id: h.id,
            client_nume: clientNume,
            client_telefon: clientTelefon,
            numar_masina: numarMasina,
            marca_model: marcaModel,
            data_intrarii: dataIntrarii,
            hotel_anvelope: {
                activ: true,
                status_hotel: h.status === 'Ridicate' ? 'Ridicate' : 'Depozitate',
                dimensiune_anvelope: h.dimensiune_anvelope || '',
                marca_model: h.marca_model || '',
                status_observatii: h.status_observatii || '',
                saci: h.saci || false,
                tip_depozit: h.tip_depozit || 'Anvelope',
                bucati: h.bucati || 4,
                data_depozitare: h.data_depozitare || h.created_at?.split('T')[0] || dataIntrarii,
            },
        };
    }).filter(Boolean);
}
