import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

const PAGE_SIZE = 1000;
// Supabase/PostgREST enforces a hard max-rows cap per request (default 1000):
// requesting a larger .range() does NOT bypass it, so fetching "all" records
// requires looping in chunks and concatenating the results.
const CHUNK_SIZE = 1000;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const q = (searchParams.get('q') || '').toLowerCase().trim();
        const fetchAll = searchParams.get('all') === 'true';
        const limit = Math.min(parseInt(searchParams.get('limit') || String(PAGE_SIZE)), PAGE_SIZE);
        const offset = parseInt(searchParams.get('offset') || '0');

        const supabase = await createServerSupabase();

        // Try adding soft-delete filter (resilient - works even if column doesn't exist)
        const testResult = await supabase.from('clienti').select('deleted_at').limit(1);
        const hasDeletedAt = !testResult.error || !testResult.error.message?.includes('does not exist');

        const runRange = async (from: number, to: number) => {
            let query = supabase
                .from('clienti')
                .select('*, client_vehicles (*)', { count: 'exact' })
                .range(from, to);
            if (hasDeletedAt) query = query.is('deleted_at', null);
            if (q) query = query.or(`nume.ilike.%${q}%,telefon.ilike.%${q}%`);
            return await query;
        };

        let data: any[] = [];
        let count = 0;
        let error: any = null;

        if (fetchAll) {
            let from = 0;
            while (true) {
                const result = await runRange(from, from + CHUNK_SIZE - 1);
                if (result.error) { error = result.error; break; }
                const chunk = result.data || [];
                count = result.count || 0;
                data = data.concat(chunk);
                if (chunk.length < CHUNK_SIZE) break;
                from += CHUNK_SIZE;
                if (from > 100000) break; // safety cap
            }
        } else {
            const result = await runRange(offset, offset + limit - 1);
            data = result.data || [];
            count = result.count || 0;
            error = result.error;
        }

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
            pagination: fetchAll ? {
                total: count || 0,
                limit: mapped.length,
                offset: 0,
                hasMore: false
            } : {
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
