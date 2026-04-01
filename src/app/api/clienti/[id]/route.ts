import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createServerSupabase();

        // Get client with all their vehicles
        const { data: client, error: clientError } = await supabase
            .from('clienti')
            .select('*')
            .eq('id', id)
            .single();

        if (clientError || !client) {
            return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
        }

        // Get vehicles with their service history
        const { data: vehicles } = await supabase
            .from('client_vehicles')
            .select(`
                *,
                service_records (
                    id,
                    service_number,
                    data_intrarii,
                    mecanic,
                    km_bord,
                    services,
                    created_at
                )
            `)
            .eq('client_id', id)
            .order('created_at', { ascending: false });

        // Map vehicles with enriched data
        const mappedVehicles = (vehicles || []).map(v => {
            const fise = v.service_records || [];
            const totalCheltuit = fise.reduce((sum: number, f: any) => {
                const servicii = f.services?.servicii || {};
                const vulc = servicii.vulcanizare?.pret_total || 0;
                const ac = servicii.aer_conditionat?.pret_total || 0;
                const frana = servicii.frana?.pret_total || 0;
                const jante = servicii.vopsit_jante?.pret_total || 0;
                return sum + vulc + ac + frana + jante;
            }, 0);

            return {
                id: v.id,
                numar_masina: v.numar_masina,
                marca_model: v.marca_model,
                dimensiune_anvelope: v.dimensiune_anvelope,
                km_bord: v.km_bord,
                created_at: v.created_at,
                total_fise: fise.length,
                ultima_vizita: fise.length > 0 
                    ? fise.sort((a: any, b: any) => new Date(b.data_intrarii).getTime() - new Date(a.data_intrarii).getTime())[0].data_intrarii 
                    : null,
                total_cheltuit: totalCheltuit,
                fise: fise.sort((a: any, b: any) => new Date(b.data_intrarii).getTime() - new Date(a.data_intrarii).getTime())
            };
        });

        const mapped = {
            id: client.id,
            nume: client.nume,
            telefon: client.telefon,
            created_at: client.created_at,
            updated_at: client.updated_at,
            masini: mappedVehicles,
            total_masini: mappedVehicles.length,
            total_fise: mappedVehicles.reduce((sum, v) => sum + v.total_fise, 0),
            total_cheltuit: mappedVehicles.reduce((sum, v) => sum + v.total_cheltuit, 0)
        };

        return NextResponse.json(mapped);
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { nume, telefon } = body;
        const supabase = await createServerSupabase();

        // Update client basic info
        const { error: clientErr } = await supabase
            .from('clienti')
            .update({ nume, telefon, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (clientErr) throw new Error(clientErr.message);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Update Client Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// POST to add a new vehicle to existing client
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { numar_masina, marca_model, dimensiune_anvelope, km_bord } = body;
        const supabase = await createServerSupabase();

        if (!numar_masina) {
            return NextResponse.json({ error: 'Număr mașină obligatoriu' }, { status: 400 });
        }

        // Check if vehicle already exists for this client
        const { data: existingCar } = await supabase
            .from('client_vehicles')
            .select('*')
            .eq('client_id', id)
            .ilike('numar_masina', numar_masina)
            .single();

        if (existingCar) {
            // Update existing vehicle
            const { data, error } = await supabase
                .from('client_vehicles')
                .update({
                    marca_model: marca_model || existingCar.marca_model,
                    dimensiune_anvelope: dimensiune_anvelope || existingCar.dimensiune_anvelope,
                    km_bord: km_bord || existingCar.km_bord,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingCar.id)
                .select()
                .single();

            if (error) throw new Error(error.message);
            return NextResponse.json({ success: true, vehicle: data, updated: true });
        }

        // Create new vehicle
        const { data, error } = await supabase
            .from('client_vehicles')
            .insert([{
                client_id: id,
                numar_masina: numar_masina.toUpperCase().trim(),
                marca_model: marca_model || '',
                dimensiune_anvelope: dimensiune_anvelope || '',
                km_bord: km_bord || 0,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);

        return NextResponse.json({ success: true, vehicle: data, updated: false });
    } catch (err: any) {
        console.error('Add Vehicle Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

// DELETE client by ID
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createServerSupabase();

        // Delete client - related records will be handled by CASCADE or SET NULL
        const { error } = await supabase
            .from('clienti')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Delete Client Error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Delete Client Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
