import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        console.log('[API FISE/[id]] Fetching sheet with ID:', id);
        
        const supabase = await createServerSupabase();

        const { data, error } = await supabase
            .from('service_records')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (error) {
            console.error('[API FISE/[id]] Supabase error:', error);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        if (!data) {
            console.log('[API FISE/[id]] Sheet not found for ID:', id);
            return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
        }
        
        console.log('[API FISE/[id]] Found sheet:', data.service_number, '-', data.client_name);

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

        // Fetch hotel record
        const { data: hotelRecord } = await supabase
            .from('hotel_anvelope')
            .select('*')
            .eq('service_record_id', id)
            .maybeSingle();

        const extra = typeof data.services === 'object' && data.services !== null ? data.services : {};

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
            hotel_anvelope: hotelRecord ? {
                activ: true,
                dimensiune_anvelope: hotelRecord.dimensiune_anvelope,
                marca_model: hotelRecord.marca_model,
                status_observatii: hotelRecord.status_observatii,
                saci: hotelRecord.saci,
                status_hotel: hotelRecord.status === 'Ridicate' ? 'Ridicate' : 'Depozitate',
                tip_depozit: hotelRecord.tip_depozit || 'Anvelope',
                bucati: hotelRecord.bucati || 4,
                data_depozitare: hotelRecord.created_at ? hotelRecord.created_at.split('T')[0] : undefined
            } : (extra?.hotel_anvelope?.activ ? extra.hotel_anvelope : undefined),
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

        // Handle hotel_anvelope update
        if (body.hotel_anvelope) {
            const { data: existingHotel } = await supabase
                .from('hotel_anvelope')
                .select('id')
                .eq('service_record_id', id)
                .maybeSingle();

            const hotelData = {
                dimensiune_anvelope: body.hotel_anvelope.dimensiune_anvelope,
                marca_model: body.hotel_anvelope.marca_model,
                status_observatii: body.hotel_anvelope.status_observatii,
                saci: body.hotel_anvelope.saci || false,
                status: body.hotel_anvelope.status_hotel === 'Ridicate' ? 'Ridicate' : 'Depozitate',
                tip_depozit: body.hotel_anvelope.tip_depozit || 'Anvelope',
                bucati: body.hotel_anvelope.bucati || 4,
            };

            if (existingHotel) {
                // Update existing
                await supabase
                    .from('hotel_anvelope')
                    .update(hotelData)
                    .eq('service_record_id', id);
            } else if (body.hotel_anvelope.activ) {
                // Create new
                await supabase.from('hotel_anvelope').insert([{
                    service_record_id: id,
                    client_id: body.client_id,
                    ...hotelData
                }]);
            }
        }

        return NextResponse.json({ success: true, id });
    } catch (err: any) {
        console.error('Update Service Record Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createServerSupabase();
    
    // ═══ PIN PROTECTION ═══
    const pin = req.headers.get('x-admin-pin');
    const expectedPin = process.env.ADMIN_DELETE_PIN || '1234';
    
    if (!pin || pin !== expectedPin) {
        console.log(`[DELETE] Rejected - invalid PIN for service ID: ${id}`);
        return NextResponse.json({ 
            success: false, 
            error: 'PIN admin incorect. Ștergerea necesită autorizare.' 
        }, { status: 403 });
    }

    console.log(`[DELETE] PIN valid. Performing SOFT DELETE for service ID: ${id}`);

    try {
        // SOFT DELETE - mark as deleted, don't actually remove
        const { error: delError } = await supabase
            .from('service_records')
            .update({
                deleted_at: new Date().toISOString(),
                deleted_by: 'admin'
            })
            .eq('id', id);

        if (delError) {
            console.error('[DELETE] Error soft-deleting service record:', delError);
            if (delError.code === '42703') {
                return NextResponse.json({
                    success: false,
                    error: 'Funcția de ștergere necesită actualizarea bazei de date. Rulați soft-delete-migration.sql în Supabase SQL Editor.'
                }, { status: 503 });
            }
            throw delError;
        }

        // Also soft-delete associated hotel records
        await supabase
            .from('hotel_anvelope')
            .update({ deleted_at: new Date().toISOString() })
            .eq('service_record_id', id);

        console.log('[DELETE] Soft delete success!');
        return NextResponse.json({ 
            success: true,
            message: 'Fișa a fost marcată ca ștearsă (poate fi recuperată)',
            softDeleted: true
        });

    } catch (err: any) {
        console.error('[DELETE] Fatal error:', err);
        return NextResponse.json({ 
            success: false, 
            error: err.message || 'Eroare la ștergerea fișei' 
        }, { status: 500 });
    }
}

