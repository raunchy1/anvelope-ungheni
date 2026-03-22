import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createServerSupabase();

        const { data, error } = await supabase
            .from('service_records')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }

        const extra = typeof data.services === 'object' && data.services !== null ? data.services : {};
        const mapped = {
            ...extra,
            id: data.id,
            numar_fisa: data.service_number,
            client_nume: data.client_name,
            client_telefon: data.phone,
            numar_masina: data.car_number,
            marca_model: data.car_details || extra.marca_model,
            km_bord: data.km_bord || extra.km_bord,
            dimensiune_anvelope: data.tire_size,
            created_at: data.created_at,
            updated_at: data.updated_at,
            servicii: extra.servicii || {},
            mecanic: data.mecanic || extra.mecanic,
            observatii: data.observatii || extra.observatii,
            data_intrarii: data.data_intrarii || extra.data_intrarii,
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
        const supabase = await createServerSupabase();

        const updateRecord = {
            client_name: body.client_nume,
            phone: body.client_telefon,
            car_number: body.numar_masina,
            car_details: body.marca_model,
            tire_size: body.dimensiune_anvelope,
            km_bord: Number(body.km_bord),
            services: {
                ...body,
                servicii: body.servicii || {}
            },
            mecanic: body.mecanic,
            observatii: body.observatii,
            data_intrarii: body.data_intrarii,
            updated_at: new Date().toISOString()
        };

        // Filter out undefined values
        const cleanUpdate = Object.fromEntries(
            Object.entries(updateRecord).filter(([_, v]) => v !== undefined && v !== null && !Number.isNaN(v))
        );

        const { error } = await supabase
            .from('service_records')
            .update(cleanUpdate)
            .eq('id', id);

        if (error) throw new Error(error.message);

        return NextResponse.json({ success: true, id });
    } catch (err: any) {
        console.error('Update Service Record Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createServerSupabase();

        // 1. Get the service record first to find associated stock movements
        const { data: serviceRecord } = await supabase
            .from('service_records')
            .select('services')
            .eq('id', id)
            .single();

        const stocVanzare = (serviceRecord?.services as any)?.servicii?.vulcanizare?.stoc_vanzare;
        
        // Track restoration results
        const restored: Array<{id: number, qty: number}> = [];
        const errors: string[] = [];

        // 2. Restore stock for any tire sales from this service
        if (Array.isArray(stocVanzare) && stocVanzare.length > 0) {
            for (const item of stocVanzare) {
                const { id_stoc, cantitate, brand, dimensiune } = item;
                
                if (!id_stoc || !cantitate) {
                    errors.push(`Invalid stock item data for ${brand} ${dimensiune}`);
                    continue;
                }
                
                // Get current stock
                const { data: stocItem } = await supabase
                    .from('stocuri')
                    .select('id, cantitate, brand, dimensiune')
                    .eq('id', id_stoc)
                    .single();

                if (stocItem) {
                    // Restore stock
                    const newQty = stocItem.cantitate + cantitate;
                    const { error: updateError } = await supabase
                        .from('stocuri')
                        .update({ 
                            cantitate: newQty,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', id_stoc);

                    if (!updateError) {
                        restored.push({ id: id_stoc, qty: cantitate });
                    } else {
                        errors.push(`Failed to restore stock for ${stocItem.brand} ${stocItem.dimensiune}`);
                    }
                } else {
                    errors.push(`Stock item ${id_stoc} not found for restoration`);
                }
            }
        }

        // 3. Delete associated stock movements by reference_id
        const { error: movementDeleteError } = await supabase
            .from('stock_movements')
            .delete()
            .eq('reference_id', id);

        if (movementDeleteError) {
            errors.push(`Failed to delete stock movements: ${movementDeleteError.message}`);
        }

        // 4. Delete associated hotel records
        await supabase
            .from('hotel_anvelope')
            .delete()
            .eq('service_record_id', id);

        // 5. Delete the service record
        const { error } = await supabase
            .from('service_records')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);

        return NextResponse.json({ 
            success: true,
            restored,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (err: any) {
        console.error('Delete Service Record Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
