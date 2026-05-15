import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

// Correct prices from client's official price board
const EXTRA_PRICES = [
    { serviciu: 'Azot AUTO', pret: 150 },
    { serviciu: 'Azot SUV', pret: 200 },
    { serviciu: 'Valva', pret: 20 },
    { serviciu: 'Valva metal', pret: 50 },
    { serviciu: 'Cap senzor', pret: 100 },
    { serviciu: 'Montat senzor presiune', pret: 25 },
    { serviciu: 'Programat senzor + scanat', pret: 200 },
    { serviciu: 'UP3', pret: 15 },
    { serviciu: 'UP4', pret: 20 },
    { serviciu: 'TL110', pret: 100 },
    { serviciu: 'TL120', pret: 200 },
    { serviciu: 'Roluit janta tabla', pret: 150 },
    { serviciu: 'Indreptat janta aliaj', pret: 200 },
];

export async function POST() {
    try {
        const supabase = await createServerSupabase();
        const results: any[] = [];

        for (const entry of EXTRA_PRICES) {
            // Try update first, then insert if not found
            const { data: existing } = await supabase
                .from('preturi_extra')
                .select('id')
                .eq('serviciu', entry.serviciu)
                .maybeSingle();

            let result;
            if (existing) {
                result = await supabase
                    .from('preturi_extra')
                    .update({ pret: entry.pret })
                    .eq('serviciu', entry.serviciu);
                results.push({ serviciu: entry.serviciu, action: 'updated', pret: entry.pret });
            } else {
                result = await supabase
                    .from('preturi_extra')
                    .insert([entry]);
                results.push({ serviciu: entry.serviciu, action: 'inserted', pret: entry.pret });
            }

            if (result.error) {
                results.push({ serviciu: entry.serviciu, error: result.error.message });
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
