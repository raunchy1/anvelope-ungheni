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

        return NextResponse.json({ success: true, id });
    } catch (err: any) {
        console.error('Update Service Record Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createServerSupabase();
    
    console.log(`[DELETE] Starting delete for service ID: ${id}`);

    try {
        // Step 1: Get stock movements
        const { data: movements, error: moveError } = await supabase
            .from('stock_movements')
            .select('anvelopa_id, cantitate')
            .eq('reference_id', id)
            .eq('tip', 'iesire');

        if (moveError) {
            console.error('[DELETE] Error fetching movements:', moveError);
        }

        console.log(`[DELETE] Found ${movements?.length || 0} stock movements`);

        // Step 2: Restore stock
        const restored: Array<{id: number, qty: number}> = [];
        
        if (movements && movements.length > 0) {
            for (const movement of movements) {
                console.log(`[DELETE] Processing movement: anvelopa_id=${movement.anvelopa_id}, qty=${movement.cantitate}`);
                
                // Get current stock
                const { data: stockItem, error: stockError } = await supabase
                    .from('stocuri')
                    .select('cantitate')
                    .eq('id', movement.anvelopa_id)
                    .single();
                
                if (stockError) {
                    console.error(`[DELETE] Error fetching stock ${movement.anvelopa_id}:`, stockError);
                    continue;
                }

                if (stockItem) {
                    const newQty = (stockItem.cantitate || 0) + movement.cantitate;
                    console.log(`[DELETE] Updating stock ${movement.anvelopa_id}: ${stockItem.cantitate} -> ${newQty}`);
                    
                    const { error: updateError } = await supabase
                        .from('stocuri')
                        .update({ 
                            cantitate: newQty,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', movement.anvelopa_id);
                    
                    if (updateError) {
                        console.error(`[DELETE] Error updating stock ${movement.anvelopa_id}:`, updateError);
                    } else {
                        restored.push({ id: movement.anvelopa_id, qty: movement.cantitate });
                    }
                }
            }
        }

        // Step 3: Delete stock movements
        console.log('[DELETE] Deleting stock movements...');
        const { error: delMoveError } = await supabase
            .from('stock_movements')
            .delete()
            .eq('reference_id', id);
        
        if (delMoveError) {
            console.error('[DELETE] Error deleting movements:', delMoveError);
        }

        // Step 4: Delete hotel records
        console.log('[DELETE] Deleting hotel records...');
        const { error: delHotelError } = await supabase
            .from('hotel_anvelope')
            .delete()
            .eq('service_record_id', id);
        
        if (delHotelError) {
            console.error('[DELETE] Error deleting hotel:', delHotelError);
        }

        // Step 5: Delete main record
        console.log('[DELETE] Deleting service record...');
        const { error: delError } = await supabase
            .from('service_records')
            .delete()
            .eq('id', id);

        if (delError) {
            console.error('[DELETE] Error deleting service record:', delError);
            throw delError;
        }

        console.log('[DELETE] Success!');
        return NextResponse.json({ 
            success: true,
            message: 'Fișa a fost ștearsă cu succes',
            restored
        });

    } catch (err: any) {
        console.error('[DELETE] Fatal error:', err);
        return NextResponse.json({ 
            success: false, 
            error: err.message || 'Eroare la ștergerea fișei' 
        }, { status: 500 });
    }
}
