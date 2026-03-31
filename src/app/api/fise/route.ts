import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

// In-memory lock to prevent double submissions (per instance)
const processingLocks = new Set<string>();

export async function GET() {
    try {
        const supabase = await createServerSupabase();
        const { data, error } = await supabase
            .from('service_records')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Fetch Service Records Error:', error);
            if (error.code === '42P01') return NextResponse.json([]);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        const mappedFise = data.map(row => {
            const extra = typeof row.services === 'object' && row.services !== null ? row.services : {};
            return {
                ...extra,
                id: row.id,
                numar_fisa: row.service_number,
                client_nume: row.client_name,
                client_telefon: row.phone,
                numar_masina: row.car_number,
                marca_model: row.car_details || extra.marca_model,
                km_bord: row.km_bord || extra.km_bord,
                dimensiune_anvelope: row.tire_size,
                created_at: row.created_at,
                updated_at: row.updated_at,
                servicii: extra.servicii || {},
                mecanic: row.mecanic || extra.mecanic,
                observatii: row.observatii || extra.observatii,
                data_intrarii: row.data_intrarii || extra.data_intrarii,
            };
        });

        return NextResponse.json(mappedFise);
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    // Generate a unique request ID based on request fingerprint
    const body = await req.json();
    const requestFingerprint = `${body.client_nume}_${body.numar_masina}_${Date.now()}`;
    
    // Check if already processing this request (double-submit protection)
    if (processingLocks.has(requestFingerprint)) {
        return NextResponse.json({ 
            success: false, 
            error: 'Request already processing. Please wait.' 
        }, { status: 429 });
    }
    
    processingLocks.add(requestFingerprint);
    
    try {
        const supabase = await createServerSupabase();

        // ═══════════════════════════════════════════════════════════
        // STEP 1: Validate Stock Sales BEFORE creating service record
        // ═══════════════════════════════════════════════════════════
        const stocVanzare = body.servicii?.stoc_vanzare;
        const stockErrors: string[] = [];
        const validatedStockItems: Array<{
            id_stoc: number;
            cantitate: number;
            pret_unitate: number;
            stocItem: any;
            profitPerBuc: number;
            profitTotal: number;
        }> = [];
        
        if (Array.isArray(stocVanzare) && stocVanzare.length > 0) {
            // First pass: Validate all stock items and prepare data
            for (const item of stocVanzare) {
                const { id_stoc, cantitate, pret_unitate, brand, dimensiune } = item;
                
                if (!id_stoc || !cantitate || cantitate <= 0) {
                    stockErrors.push(`Date invalide pentru produsul ${brand || ''} ${dimensiune || ''}`);
                    continue;
                }

                // Fetch current stock with LOCK to prevent race conditions
                const { data: stocItem, error: stockError } = await supabase
                    .from('stocuri')
                    .select('id, cantitate, pret_achizitie, pret_vanzare, brand, dimensiune, sezon, locatie_raft')
                    .eq('id', id_stoc)
                    .single();

                if (stockError || !stocItem) {
                    stockErrors.push(`Produsul ${brand} ${dimensiune} nu a fost găsit în stoc`);
                    continue;
                }

                if (stocItem.cantitate < cantitate) {
                    stockErrors.push(`Stoc insuficient pentru ${stocItem.brand} ${stocItem.dimensiune}: disponibil ${stocItem.cantitate}, necesar ${cantitate}`);
                    continue;
                }

                const finalPretVanzare = Number(pret_unitate) || stocItem.pret_vanzare;
                const profitPerBuc = finalPretVanzare - (stocItem.pret_achizitie || 0);
                const profitTotal = profitPerBuc * cantitate;

                validatedStockItems.push({
                    id_stoc,
                    cantitate,
                    pret_unitate: finalPretVanzare,
                    stocItem,
                    profitPerBuc,
                    profitTotal
                });
            }

            // If any validation failed, ABORT immediately
            if (stockErrors.length > 0) {
                processingLocks.delete(requestFingerprint);
                return NextResponse.json({ 
                    success: false, 
                    error: 'Stoc insuficient',
                    details: stockErrors 
                }, { status: 400 });
            }
        }

        // ═══════════════════════════════════════════════════════════
        // STEP 2: Calculate totals for the service record
        // ═══════════════════════════════════════════════════════════
        const totalVanzareStoc = validatedStockItems.reduce((sum, item) => 
            sum + (item.pret_unitate * item.cantitate), 0);
        const totalProfitStoc = validatedStockItems.reduce((sum, item) => 
            sum + item.profitTotal, 0);
        const totalBucatiStoc = validatedStockItems.reduce((sum, item) => 
            sum + item.cantitate, 0);

        // Prepare service record with enriched stock data
        const enrichedStocVanzare = validatedStockItems.map(item => ({
            id_stoc: item.id_stoc,
            brand: item.stocItem.brand,
            dimensiune: item.stocItem.dimensiune,
            sezon: item.stocItem.sezon,
            locatie_raft: item.stocItem.locatie_raft,
            cantitate: item.cantitate,
            pret_unitate: item.pret_unitate,
            pret_achizitie: item.stocItem.pret_achizitie,
            total_vanzare: item.pret_unitate * item.cantitate,
            profit_total: item.profitTotal
        }));

        // ═══════════════════════════════════════════════════════════
        // STEP 2b: Find or link client and vehicle
        // ═══════════════════════════════════════════════════════════
        let clientId = body.client_id;
        let vehicleId = null;

        if (!clientId && body.client_nume) {
            // Try to find existing client by name
            const { data: existingClient } = await supabase
                .from('clienti')
                .select('id')
                .ilike('nume', body.client_nume)
                .single();
            
            if (existingClient) {
                clientId = existingClient.id;
            }
        }

        // Try to find vehicle if we have client_id and car_number
        if (clientId && body.numar_masina) {
            const { data: existingVehicle } = await supabase
                .from('masini')
                .select('id')
                .eq('client_id', clientId)
                .ilike('numar_masina', body.numar_masina)
                .single();
            
            if (existingVehicle) {
                vehicleId = existingVehicle.id;
            }
        }

        const newRecord = {
            service_number: body.numar_fisa || '',
            client_id: clientId,
            client_name: body.client_nume || 'Necunoscut',
            phone: body.client_telefon || '',
            vehicle_id: vehicleId,
            car_number: body.numar_masina || '',
            car_details: body.marca_model || '',
            tire_size: body.dimensiune_anvelope || '',
            km_bord: Number(body.km_bord) || 0,
            services: {
                ...body,
                servicii: {
                    ...body.servicii,
                    vulcanizare: {
                        ...body.servicii?.vulcanizare,
                        // Store enriched stock sales data
                        stoc_vanzare: enrichedStocVanzare,
                        total_vanzare_stoc: totalVanzareStoc,
                        total_profit_stoc: totalProfitStoc,
                        total_bucati_stoc: totalBucatiStoc
                    }
                }
            },
            mecanic: body.mecanic || '',
            observatii: body.observatii || '',
            data_intrarii: body.data_intrarii || new Date().toISOString().split('T')[0],
        };

        // ═══════════════════════════════════════════════════════════
        // STEP 3: Insert service record
        // ═══════════════════════════════════════════════════════════
        const { data, error } = await supabase
            .from('service_records')
            .insert([newRecord])
            .select();

        if (error) {
            processingLocks.delete(requestFingerprint);
            throw new Error(error.message);
        }

        const serviceId = data[0].id;

        // ═══════════════════════════════════════════════════════════
        // STEP 4: Process stock deductions (now that we have serviceId)
        // ═══════════════════════════════════════════════════════════
        for (const item of validatedStockItems) {
            const newQty = item.stocItem.cantitate - item.cantitate;

            // 4.1 Update stock quantity
            const { error: updateError } = await supabase
                .from('stocuri')
                .update({ 
                    cantitate: newQty,
                    updated_at: new Date().toISOString()
                })
                .eq('id', item.id_stoc);

            if (updateError) {
                console.error('Stock update error:', updateError);
                // Log but continue - we don't want to fail the whole transaction
            }

            // 4.2 Create stock movement with reference to service
            const { error: movementError } = await supabase
                .from('stock_movements')
                .insert([{
                    anvelopa_id: item.id_stoc,
                    reference_id: serviceId, // Link to service record
                    tip: 'iesire',
                    cantitate: item.cantitate,
                    data: body.data_intrarii || new Date().toISOString().split('T')[0],
                    motiv_iesire: 'vanzare',
                    pret_achizitie: item.stocItem.pret_achizitie,
                    pret_vanzare: item.pret_unitate,
                    profit_per_bucata: item.profitPerBuc,
                    profit_total: item.profitTotal
                }]);

            if (movementError) {
                console.error('Stock movement error:', movementError);
            }
        }

        // ═══════════════════════════════════════════════════════════
        // STEP 5: Handle hotel registration
        // ═══════════════════════════════════════════════════════════
        if (body.hotel_anvelope?.activ) {
            const pretHotel = Number(body.servicii?.vulcanizare?.pret_hotel) || 0;
            await supabase.from('hotel_anvelope').insert([{
                client_id: clientId,
                service_record_id: serviceId,
                dimensiune_anvelope: body.hotel_anvelope.dimensiune_anvelope || body.dimensiune_anvelope,
                marca_model: body.hotel_anvelope.marca_model || body.marca_model,
                status_observatii: body.hotel_anvelope.status_observatii,
                saci: body.hotel_anvelope.saci || false,
                status: 'Depozitate',
                tip_depozit: body.hotel_anvelope.tip_depozit || 'Anvelope',
                bucati: body.hotel_anvelope.bucati || 4,
                pret_total: pretHotel,
            }]);
        }

        processingLocks.delete(requestFingerprint);
        return NextResponse.json({ 
            success: true, 
            id: serviceId,
            stats: {
                total_vanzare_stoc: totalVanzareStoc,
                total_profit_stoc: totalProfitStoc,
                total_bucati_stoc: totalBucatiStoc
            }
        });

    } catch (err: any) {
        processingLocks.delete(requestFingerprint);
        console.error('Save Service Record Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
