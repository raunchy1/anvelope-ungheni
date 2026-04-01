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

        // Fetch stock sales for this service record
        const { data: stockMovements } = await supabase
            .from('stock_movements')
            .select(`
                id,
                anvelopa_id,
                cantitate,
                pret_vanzare,
                pret_achizitie,
                profit_total,
                stocuri!inner (brand, dimensiune, sezon, dot)
            `)
            .eq('reference_id', id)
            .eq('tip', 'iesire')
            .eq('motiv_iesire', 'vanzare');

        const stockSales = (stockMovements || []).map((sm: any) => ({
            id_stoc: sm.anvelopa_id,
            brand: sm.stocuri?.brand || 'Necunoscut',
            dimensiune: sm.stocuri?.dimensiune || '-',
            sezon: sm.stocuri?.sezon || '-',
            dot: sm.stocuri?.dot || '-',
            cantitate: sm.cantitate,
            pret_unitate: sm.pret_vanzare,
            pret_achizitie: sm.pret_achizitie,
            total_vanzare: (sm.pret_vanzare || 0) * sm.cantitate,
            profit_total: sm.profit_total
        }));

        const extra = typeof data.services === 'object' && data.services !== null ? data.services : {};

        // FIX m2: Safe deep access with optional chaining
        const mergedServices = {
            ...(extra?.servicii || {}),
            vulcanizare: {
                ...(extra?.servicii?.vulcanizare || {}),
                stoc_vanzare: stockSales,
                total_vanzare_stoc: stockSales.reduce((s, i) => s + i.total_vanzare, 0),
                total_profit_stoc: stockSales.reduce((s, i) => s + i.profit_total, 0),
                total_bucati_stoc: stockSales.reduce((s, i) => s + i.cantitate, 0)
            }
        };

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
            servicii: mergedServices,
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

        // FIX m3: Safe number parsing with NaN check
        const kmNum = Number(body.km_bord);
        const safeKm = !isNaN(kmNum) ? kmNum : undefined;

        const updateRecord: any = {
            client_name: body.client_nume,
            phone: body.client_telefon,
            car_number: body.numar_masina,
            car_details: body.marca_model,
            tire_size: body.dimensiune_anvelope,
            km_bord: safeKm,
            services: {
                ...body,
                servicii: body.servicii || {}
            },
            mecanic: body.mecanic,
            observatii: body.observatii,
            data_intrarii: body.data_intrarii,
            updated_at: new Date().toISOString()
        };

        // FIX m4: Proper NaN filtering using Number.isNaN
        const cleanUpdate = Object.fromEntries(
            Object.entries(updateRecord).filter(([_, v]) =>
                v !== undefined && v !== null && !Number.isNaN(v)
            )
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

        // FIX M12: Use RPC for atomic delete with rollback capability
        const { data, error } = await supabase.rpc('delete_service_with_restore', {
            p_service_id: id
        });

        if (error) {
            console.error('Delete RPC Error:', error);
            throw new Error(error.message);
        }

        return NextResponse.json({
            success: true,
            restored: data?.restored || [],
            errors: data?.errors || undefined
        });
    } catch (err: any) {
        console.error('Delete Service Record Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
