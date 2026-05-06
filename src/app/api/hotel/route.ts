import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET() {
    try {
        const supabase = await createServerSupabase();

        // Step 1: Fetch all hotel records (no joins — avoids PGRST200 relationship errors)
        const { data: hotelRows, error: hotelErr } = await supabase
            .from('hotel_anvelope')
            .select('*')
            .order('created_at', { ascending: false });

        if (hotelErr) {
            console.error('[API Hotel] hotel_anvelope query error:', hotelErr);
            if (hotelErr.code === '42P01') return NextResponse.json({ data: [] });
            return NextResponse.json({ success: false, error: hotelErr.message }, { status: 500 });
        }

        if (!hotelRows || hotelRows.length === 0) {
            return NextResponse.json({ data: [] });
        }

        // Filter out soft-deleted records (if deleted_at column exists)
        const activeRows = hotelRows.filter((h: any) => h.deleted_at == null);

        // Step 2: Batch fetch service_records for known service_record_ids
        const serviceIds = [...new Set(
            activeRows.map((h: any) => h.service_record_id).filter(Boolean)
        )];
        const serviceMap: Record<string, any> = {};

        if (serviceIds.length > 0) {
            const { data: serviceRows } = await supabase
                .from('service_records')
                .select('id, client_name, phone, car_number, car_details, data_intrarii, created_at')
                .in('id', serviceIds);
            (serviceRows || []).forEach((sr: any) => { serviceMap[sr.id] = sr; });
        }

        // Step 3: Batch fetch clienti for records without service_record_id
        const clientIds = [...new Set(
            activeRows
                .filter((h: any) => !h.service_record_id && h.client_id)
                .map((h: any) => h.client_id)
        )];
        const clientMap: Record<string, any> = {};

        if (clientIds.length > 0) {
            const { data: clientRows } = await supabase
                .from('clienti')
                .select('id, nume, telefon')
                .in('id', clientIds);
            (clientRows || []).forEach((c: any) => { clientMap[c.id] = c; });
        }

        // Step 4: Map to hotel page format
        const result = activeRows.map((h: any) => {
            const sr = serviceMap[h.service_record_id] || null;
            const cl = clientMap[h.client_id] || null;

            const clientNume = sr?.client_name || cl?.nume || 'Necunoscut';
            const clientTelefon = sr?.phone || cl?.telefon || '';
            const numarMasina = sr?.car_number || '';
            const marcaModel = sr?.car_details || '';
            const dataIntrarii = sr?.data_intrarii || h.created_at?.split('T')[0] || '';

            return {
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
        });

        return NextResponse.json({ data: result });
    } catch (err: any) {
        console.error('[API Hotel] Fatal error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
