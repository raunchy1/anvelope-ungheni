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

        const { error } = await supabase
            .from('service_records')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Delete Service Record Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
