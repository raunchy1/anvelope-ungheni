import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { nume, telefon, numar_masina, marca_model, dimensiune_anvelope } = body;
        const supabase = await createServerSupabase();

        // 1. Update client
        const { error: clientErr } = await supabase
            .from('clienti')
            .update({ nume, telefon })
            .eq('id', id);

        if (clientErr) throw new Error(clientErr.message);

        // 2. Update/Add car (main car)
        if (numar_masina) {
            // Check if this specific car exists for this client (by number)
            const { data: car, error: carErr } = await supabase
                .from('masini')
                .select('*')
                .eq('client_id', id)
                .limit(1)
                .single();

            if (carErr || !car) {
                // If no car found, insert new one
                await supabase
                    .from('masini')
                    .insert([{
                        client_id: id,
                        numar_masina: numar_masina,
                        marca_model: marca_model || '',
                        dimensiune_anvelope: dimensiune_anvelope || ''
                    }]);
            } else {
                // Update the existing car
                await supabase
                    .from('masini')
                    .update({
                        numar_masina: numar_masina,
                        marca_model: marca_model || car.marca_model,
                        dimensiune_anvelope: dimensiune_anvelope || car.dimensiune_anvelope
                    })
                    .eq('id', car.id);
            }
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Update Client Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createServerSupabase();

        // Cascade delete should handle masini if configured, but let's be sure
        await supabase.from('masini').delete().eq('client_id', id);
        await supabase.from('service_records').delete().eq('client_id', id);
        await supabase.from('hotel_anvelope').delete().eq('client_id', id);

        const { error } = await supabase
            .from('clienti')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Delete Client Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
