import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

const PAGE_SIZE = 1000;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const q = (searchParams.get('q') || '').toLowerCase().trim();
        const fetchAll = searchParams.get('all') === 'true';
        const limit = fetchAll ? 10000 : Math.min(parseInt(searchParams.get('limit') || String(PAGE_SIZE)), PAGE_SIZE);
        const offset = parseInt(searchParams.get('offset') || '0');

        const supabase = await createServerSupabase();

        // FIX M8, M9: Server-side filtering with ILIKE and pagination + soft-delete filter
        let query = supabase
            .from('clienti')
            .select('*, client_vehicles (*)', { count: 'exact' })
            .is('deleted_at', null)
            .range(offset, offset + limit - 1);

        if (q) {
            // Use server-side ILIKE for search
            query = query.or(`nume.ilike.%${q}%,telefon.ilike.%${q}%`);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('Fetch Clients Error:', error);
            if (error.code === '42P01') return NextResponse.json([]);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const mapped = (data || []).map((c: any) => ({
            id: c.id,
            nume: c.nume,
            telefon: c.telefon,
            masini: c.client_vehicles || [],
            created_at: c.created_at,
            updated_at: c.updated_at,
        }));

        return NextResponse.json({
            data: mapped,
            pagination: {
                total: count || 0,
                limit,
                offset,
                hasMore: (count || 0) > offset + limit
            }
        });
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

        // FIX M4: Use maybeSingle() instead of .single() to handle duplicates gracefully
        let { data: existingClient, error: clientErr } = await supabase
            .from('clienti')
            .select('*')
            .ilike('nume', client_nume)
            .maybeSingle();

        let client;

        if (clientErr || !existingClient) {
            // Create new client
            const { data: newClient, error: insertErr } = await supabase
                .from('clienti')
                .insert([{ nume: client_nume, telefon: client_telefon || '' }])
                .select()
                .single();

            if (insertErr) throw new Error(insertErr.message);
            client = newClient;
        } else {
            client = existingClient;
            // Update phone if provided and different
            if (client_telefon && client_telefon !== client.telefon) {
                await supabase
                    .from('clienti')
                    .update({ telefon: client_telefon })
                    .eq('id', client.id);
            }
        }

        // FIX m5: Safe null comparison for km_bord
        if (numar_masina) {
            const { data: existingCar, error: carErr } = await supabase
                .from('client_vehicles')
                .select('*')
                .eq('client_id', client.id)
                .ilike('numar_masina', numar_masina)
                .maybeSingle();

            if (carErr || !existingCar) {
                // Add new vehicle for this client
                await supabase
                    .from('client_vehicles')
                    .insert([{
                        client_id: client.id,
                        numar_masina: numar_masina.toUpperCase().trim(),
                        marca_model: marca_model || '',
                        dimensiune_anvelope: dimensiune_anvelope || '',
                        km_bord: (km_bord ?? 0) || 0,
                        created_at: new Date().toISOString()
                    }]);
            } else {
                // Update existing vehicle with new info if provided
                const updates: any = {};
                if (marca_model && marca_model !== existingCar.marca_model) {
                    updates.marca_model = marca_model;
                }
                if (dimensiune_anvelope && dimensiune_anvelope !== existingCar.dimensiune_anvelope) {
                    updates.dimensiune_anvelope = dimensiune_anvelope;
                }
                // FIX m5: Safe comparison with null coalescing
                const newKm = Number(km_bord);
                if (!isNaN(newKm) && newKm > (existingCar.km_bord ?? 0)) {
                    updates.km_bord = newKm;
                }

                if (Object.keys(updates).length > 0) {
                    await supabase
                        .from('client_vehicles')
                        .update(updates)
                        .eq('id', existingCar.id);
                }
            }
        }

        return NextResponse.json({ success: true, client });
    } catch (err: any) {
        console.error('Save Client Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
