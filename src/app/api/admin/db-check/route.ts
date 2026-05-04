import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET() {
    const supabase = await createServerSupabase();

    const { data, count, error } = await supabase
        .from('service_records')
        .select('service_number, data_intrarii, created_at', { count: 'exact' })
        .order('created_at', { ascending: true })
        .limit(5);

    const { data: newest } = await supabase
        .from('service_records')
        .select('service_number, data_intrarii, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
        total_records: count,
        oldest_5: data,
        newest_5: newest,
    });
}
