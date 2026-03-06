import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET() {
    try {
        const supabase = await createServerSupabase();
        const { data: vulcanizare, error: err1 } = await supabase.from('preturi_vulcanizare').select('*');
        const { data: extra, error: err2 } = await supabase.from('preturi_extra').select('*');
        const { data: hotel, error: err3 } = await supabase.from('preturi_hotel').select('*');

        if (err1 || err2 || err3) {
            throw new Error(err1?.message || err2?.message || err3?.message);
        }

        return NextResponse.json({
            vulcanizare: vulcanizare || [],
            extra: extra || [],
            hotel: hotel || []
        });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
