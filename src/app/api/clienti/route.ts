import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const q = (searchParams.get('q') || '').toLowerCase().trim();
        const supabase = await createServerSupabase();

        // Fetch clients with their cars (relation via masini table if it exists, or handle based on schema)
        // Note: The user requested 'clienti' table. 
        // In the SQL I created 'clienti' and 'masini'.

        const { data, error } = await supabase
            .from('clienti')
            .select('*, masini(*)');

        if (error) {
            console.error('Fetch Clients Error:', error);
            if (error.code === '42P01') return NextResponse.json([]);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const mapped = data.map((c: any) => ({
            id: c.id,
            nume: c.nume,
            telefon: c.telefon,
            masini: c.masini || [],
            created_at: c.created_at,
            updated_at: c.updated_at,
        }));

        if (!q) return NextResponse.json(mapped);

        const filtered = mapped.filter((c: any) =>
            c.nume.toLowerCase().includes(q) ||
            (c.telefon && c.telefon.includes(q)) ||
            (c.masini && c.masini.some((m: any) => m.numar_masina.toLowerCase().includes(q)))
        );

        return NextResponse.json(filtered);
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { client_nume, client_telefon, numar_masina, marca_model, dimensiune_anvelope, km_bord } = body;
        const supabase = await createServerSupabase();

        if (!client_nume) return NextResponse.json({ error: 'Nume client obligatoriu' }, { status: 400 });

        // 1. Check if client exists
        let { data: client, error: clientErr } = await supabase
            .from('clienti')
            .select('*')
            .ilike('nume', client_nume)
            .single();

        if (clientErr || !client) {
            const { data: newClient, error: insertErr } = await supabase
                .from('clienti')
                .insert([{ nume: client_nume, telefon: client_telefon || '' }])
                .select()
                .single();

            if (insertErr) throw new Error(insertErr.message);
            client = newClient;
        }

        // 2. Add/Update car
        if (numar_masina) {
            const { data: car, error: carErr } = await supabase
                .from('masini')
                .select('*')
                .eq('client_id', client.id)
                .eq('numar_masina', numar_masina)
                .single();

            if (carErr || !car) {
                await supabase
                    .from('masini')
                    .insert([{
                        client_id: client.id,
                        numar_masina: numar_masina,
                        marca_model: marca_model || '',
                        dimensiune_anvelope: dimensiune_anvelope || '',
                        last_km: km_bord || 0
                    }]);
            } else {
                await supabase
                    .from('masini')
                    .update({
                        marca_model: marca_model || car.marca_model,
                        dimensiune_anvelope: dimensiune_anvelope || car.dimensiune_anvelope,
                        last_km: km_bord || car.last_km
                    })
                    .eq('id', car.id);
            }
        }

        return NextResponse.json({ success: true, client });
    } catch (err: any) {
        console.error('Save Client Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
