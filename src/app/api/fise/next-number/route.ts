import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET() {
    try {
        const supabase = await createServerSupabase();

        // Get the true maximum service_number from the DB
        const { data, error } = await supabase
            .from('service_records')
            .select('service_number')
            .order('service_number', { ascending: false })
            .limit(50); // take top 50 to guard against non-numeric entries

        if (error) {
            console.error('[next-number] DB error:', error);
            return NextResponse.json({ next: '00000001' });
        }

        let maxNum = 0;
        for (const row of (data || [])) {
            const n = parseInt(row.service_number, 10);
            if (!isNaN(n) && n > maxNum) maxNum = n;
        }

        const next = String(maxNum + 1).padStart(8, '0');
        return NextResponse.json({ next });
    } catch (err: any) {
        console.error('[next-number] Fatal:', err);
        return NextResponse.json({ next: '00000001' });
    }
}
