import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

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

// New vulcanizare prices from official price board
const VULCANIZARE_NEW = [
    { diametru: 'R23', tip: 'SUV',      scos_roata: 75, montat_demontat: 100, echilibrat: 200, service_complet: 1500, pret_bucata: 375 },
    { diametru: 'R24', tip: 'SUV',      scos_roata: 75, montat_demontat: 100, echilibrat: 200, service_complet: 1500, pret_bucata: 375 },
    { diametru: 'R15C', tip: 'TABLA',   scos_roata: 30, montat_demontat: 30,  echilibrat: 40,  service_complet: 400,  pret_bucata: 100 },
    { diametru: 'R15C', tip: 'ALIAJ',   scos_roata: 30, montat_demontat: 30,  echilibrat: 50,  service_complet: 440,  pret_bucata: 110 },
    { diametru: 'R16C', tip: 'TABLA',   scos_roata: 30, montat_demontat: 30,  echilibrat: 50,  service_complet: 440,  pret_bucata: 110 },
    { diametru: 'R16C', tip: 'ALIAJ',   scos_roata: 35, montat_demontat: 35,  echilibrat: 55,  service_complet: 500,  pret_bucata: 125 },
    { diametru: 'R16C', tip: 'MICROBUS',scos_roata: 30, montat_demontat: 35,  echilibrat: 55,  service_complet: 480,  pret_bucata: 120 },
    { diametru: 'R15C', tip: 'MICROBUS',scos_roata: 30, montat_demontat: 30,  echilibrat: 40,  service_complet: 400,  pret_bucata: 100 },
];

export async function POST() {
    try {
        const supabase = await createServerSupabase();
        const results: any[] = [];

        // Upsert preturi_extra
        for (const entry of EXTRA_PRICES) {
            const { data: existing } = await supabase
                .from('preturi_extra')
                .select('id')
                .eq('serviciu', entry.serviciu)
                .maybeSingle();

            const result = existing
                ? await supabase.from('preturi_extra').update({ pret: entry.pret }).eq('serviciu', entry.serviciu)
                : await supabase.from('preturi_extra').insert([entry]);

            results.push({ table: 'extra', serviciu: entry.serviciu, action: existing ? 'updated' : 'inserted', error: result.error?.message });
        }

        // Upsert preturi_vulcanizare (new entries)
        for (const entry of VULCANIZARE_NEW) {
            const { data: existing } = await supabase
                .from('preturi_vulcanizare')
                .select('id')
                .eq('diametru', entry.diametru)
                .eq('tip', entry.tip)
                .maybeSingle();

            const result = existing
                ? await supabase.from('preturi_vulcanizare').update({
                    scos_roata: entry.scos_roata,
                    montat_demontat: entry.montat_demontat,
                    echilibrat: entry.echilibrat,
                    service_complet: entry.service_complet,
                    pret_bucata: entry.pret_bucata,
                  }).eq('id', existing.id)
                : await supabase.from('preturi_vulcanizare').insert([entry]);

            results.push({ table: 'vulcanizare', diametru: entry.diametru, tip: entry.tip, action: existing ? 'updated' : 'inserted', error: result.error?.message });
        }

        return NextResponse.json({ success: true, results });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
