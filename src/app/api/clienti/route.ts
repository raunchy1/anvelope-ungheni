import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const q = (searchParams.get('q') || '').toLowerCase().trim();
        const supabase = await createServerSupabase();

        // Fetch clients with their cars
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

        // Enhanced search: by name, phone, car number, car brand/model
        const filtered = mapped.filter((c: any) => {
            // Search by client name
            if (c.nume.toLowerCase().includes(q)) return true;
            
            // Search by phone
            if (c.telefon && c.telefon.includes(q)) return true;
            
            // Search by vehicle data
            if (c.masini && c.masini.some((m: any) => {
                // By car number
                if (m.numar_masina && m.numar_masina.toLowerCase().includes(q)) return true;
                // By brand/model
                if (m.marca_model && m.marca_model.toLowerCase().includes(q)) return true;
                // By tire size
                if (m.dimensiune_anvelope && m.dimensiune_anvelope.toLowerCase().includes(q)) return true;
                return false;
            })) return true;
            
            return false;
        });

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

        // 1. Check if client exists (case insensitive)
        let { data: existingClient, error: clientErr } = await supabase
            .from('clienti')
            .select('*')
            .ilike('nume', client_nume)
            .single();

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

        // 2. Handle vehicle - check if this specific car exists for this client
        if (numar_masina) {
            const { data: existingCar, error: carErr } = await supabase
                .from('masini')
                .select('*')
                .eq('client_id', client.id)
                .ilike('numar_masina', numar_masina)
                .single();

            if (carErr || !existingCar) {
                // Add new vehicle for this client
                await supabase
                    .from('masini')
                    .insert([{
                        client_id: client.id,
                        numar_masina: numar_masina.toUpperCase().trim(),
                        marca_model: marca_model || '',
                        dimensiune_anvelope: dimensiune_anvelope || '',
                        last_km: km_bord || 0,
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
                if (km_bord && km_bord > (existingCar.last_km || 0)) {
                    updates.last_km = km_bord;
                }
                
                if (Object.keys(updates).length > 0) {
                    await supabase
                        .from('masini')
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
