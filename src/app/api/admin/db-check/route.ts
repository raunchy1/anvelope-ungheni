import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET() {
    const supabase = await createServerSupabase();

    // Check service_records
    const { data: oldest, count, error } = await supabase
        .from('service_records')
        .select('id, service_number, data_intrarii, created_at', { count: 'exact' })
        .order('created_at', { ascending: true })
        .limit(3);

    const { data: newest } = await supabase
        .from('service_records')
        .select('id, service_number, data_intrarii, created_at')
        .order('created_at', { ascending: false })
        .limit(3);

    // Check hotel_anvelope TABLE
    const { data: hotelTable, count: hotelCount, error: hotelErr } = await supabase
        .from('hotel_anvelope')
        .select('id, service_record_id, client_id, status, created_at', { count: 'exact' })
        .limit(5);

    // Check service_records with hotel in JSONB
    const { data: jsonbSample } = await supabase
        .from('service_records')
        .select('id, service_number, services')
        .not('services', 'is', null)
        .order('created_at', { ascending: false })
        .limit(20);

    const withHotelActiv = (jsonbSample || []).filter((r: any) =>
        r.services?.hotel_anvelope?.activ === true
    );

    const withHotelAny = (jsonbSample || []).filter((r: any) =>
        r.services?.hotel_anvelope != null
    );

    // Sample hotel JSONB data
    const sampleHotelJsonb = withHotelAny.slice(0, 3).map((r: any) => ({
        id: r.id,
        numar_fisa: r.service_number,
        hotel_data: r.services?.hotel_anvelope,
    }));

    return NextResponse.json({
        service_records_total: count,
        oldest_3: oldest,
        newest_3: newest,
        hotel_table: {
            error: hotelErr?.message || null,
            total: hotelCount,
            sample: hotelTable,
        },
        hotel_jsonb: {
            checked_last_20_records: jsonbSample?.length || 0,
            with_hotel_field: withHotelAny.length,
            with_hotel_activ_true: withHotelActiv.length,
            sample: sampleHotelJsonb,
        },
    });
}
