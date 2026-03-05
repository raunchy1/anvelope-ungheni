import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const body = await req.json();
        const { nume, telefon, masini } = body;
        const supabase = await createServerSupabase();

        // 1. Update client
        const { error: clientErr } = await supabase
            .from('clienti')
            .update({ nume, telefon })
            .eq('id', id);

        if (clientErr) throw new Error(clientErr.message);

        // 2. Update cars if provided
        if (masini && Array.isArray(masini)) {
            for (const car of masini) {
                if (car.numar_masina) {
                    // Check if car exists for this client
                    const { data: existingCar } = await supabase
                        .from('masini')
                        .select('*')
                        .eq('client_id', id)
                        .eq('numar_masina', car.numar_masina)
                        .single();

                    if (existingCar) {
                        await supabase
                            .from('masini')
                            .update({
                                marca_model: car.marca_model,
                                dimensiune_anvelope: car.dimensiune_anvelope
                            })
                            .eq('id', existingCar.id);
                    } else {
                        await supabase
                            .from('masini')
                            .insert([{
                                client_id: id,
                                numar_masina: car.numar_masina,
                                marca_model: car.marca_model,
                                dimensiune_anvelope: car.dimensiune_anvelope
                            }]);
                    }
                }
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

        // Delete client (masini will be deleted by Cascade if configured, otherwise delete manual)
        // Let's delete related data just in case
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
