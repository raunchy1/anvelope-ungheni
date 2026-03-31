import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '100');
        
        const supabase = await createServerSupabase();

        // First, get the client details to know the name
        const { data: clientData, error: clientError } = await supabase
            .from('clienti')
            .select('nume, telefon')
            .eq('id', id)
            .single();

        if (clientError) {
            console.error('Client fetch error:', clientError);
        }

        // Get all service records for this client
        // Try by client_id first, then fall back to matching by name
        let { data: recordsById, error: errorById } = await supabase
            .from('service_records')
            .select('*')
            .eq('client_id', id)
            .order('data_intrarii', { ascending: false })
            .limit(limit);

        // If no records by ID or error, try by client name
        let records = recordsById || [];
        
        if (records.length === 0 && clientData?.nume) {
            const { data: recordsByName, error: errorByName } = await supabase
                .from('service_records')
                .select('*')
                .ilike('client_name', clientData.nume)
                .order('data_intrarii', { ascending: false })
                .limit(limit);
            
            if (!errorByName && recordsByName) {
                records = recordsByName;
            }
        }

        // Map the records to the expected format
        const mappedFise = (records || []).map(row => {
            const extra = typeof row.services === 'object' && row.services !== null ? row.services : {};
            return {
                id: row.id,
                numar_fisa: row.service_number,
                client_nume: row.client_name,
                client_telefon: row.phone,
                numar_masina: row.car_number,
                marca_model: row.car_details || extra.marca_model,
                km_bord: row.km_bord || extra.km_bord,
                dimensiune_anvelope: row.tire_size,
                created_at: row.created_at,
                updated_at: row.updated_at,
                servicii: extra.servicii || {},
                hotel_anvelope: extra.hotel_anvelope || {},
                mecanic: row.mecanic || extra.mecanic,
                observatii: row.observatii || extra.observatii,
                data_intrarii: row.data_intrarii || extra.data_intrarii,
            };
        });

        return NextResponse.json(mappedFise);
    } catch (err: any) {
        console.error('Fetch Client Fise Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
