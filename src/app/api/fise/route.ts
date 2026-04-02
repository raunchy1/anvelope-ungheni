import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

const PAGE_SIZE = 50;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || String(PAGE_SIZE)), 1000);
        const offset = parseInt(searchParams.get('offset') || '0');

        const supabase = await createServerSupabase();

        // FIX C6: Add pagination with .range()
        const { data, error, count } = await supabase
            .from('service_records')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Fetch Service Records Error:', error);
            if (error.code === '42P01') return NextResponse.json([]);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        // FIX M7: Batch query for stock movements (only for fetched records)
        const serviceIds = data?.map(r => r.id) || [];
        let stockSalesMap: Record<string, any[]> = {};

        if (serviceIds.length > 0) {
            const { data: stockMovements } = await supabase
                .from('stock_movements')
                .select(`
                    id,
                    anvelopa_id,
                    reference_id,
                    cantitate,
                    pret_vanzare,
                    pret_achizitie,
                    profit_total,
                    stocuri!inner (brand, dimensiune, sezon, dot)
                `)
                .in('reference_id', serviceIds)
                .eq('tip', 'iesire')
                .eq('motiv_iesire', 'vanzare');

            // FIX m18: Manual grouping (could also use SQL aggregation)
            stockMovements?.forEach((sm: any) => {
                const serviceId = sm.reference_id;
                if (!stockSalesMap[serviceId]) {
                    stockSalesMap[serviceId] = [];
                }
                stockSalesMap[serviceId].push({
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
                });
            });
        }

        // FIX M13: Safe deep property access with optional chaining
        const mappedFise = (data || []).map(row => {
            const extra = typeof row.services === 'object' && row.services !== null ? row.services : {};
            const stockSales = stockSalesMap[row.id] || [];

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
                servicii: mergedServices,
                mecanic: row.mecanic || extra.mecanic,
                observatii: row.observatii || extra.observatii,
                data_intrarii: row.data_intrarii || extra.data_intrarii,
            };
        });

        return NextResponse.json({
            data: mappedFise,
            pagination: {
                total: count || 0,
                limit,
                offset,
                hasMore: (count || 0) > offset + limit
            }
        });
    } catch (err: any) {
        console.error('GET Fise Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const body = await req.json();

    console.log("[API FISE] New service sheet:", body.client_nume, "-", body.numar_masina);

    try {
        const supabase = await createServerSupabase();

        // Step 1: Find or create client
        let clientId = body.client_id;
        if ((!clientId || clientId === 'new') && body.client_nume) {
            const { data: existingClient } = await supabase
                .from('clienti')
                .select('id')
                .ilike('nume', body.client_nume)
                .maybeSingle();
            
            if (existingClient) {
                clientId = existingClient.id;
            } else {
                const { data: newClient, error: createErr } = await supabase
                    .from('clienti')
                    .insert([{
                        nume: body.client_nume,
                        telefon: body.client_telefon || '',
                        created_at: new Date().toISOString()
                    }])
                    .select('id')
                    .single();
                
                if (!createErr && newClient) {
                    clientId = newClient.id;
                }
            }
        }

        // Step 2: Calculate stock totals
        const stocVanzare = body.servicii?.vulcanizare?.stoc_vanzare || [];
        const totalVanzareStoc = stocVanzare.reduce((sum: number, item: any) => 
            sum + ((item.pret_unitate || 0) * (item.cantitate || 0)), 0);
        const totalProfitStoc = stocVanzare.reduce((sum: number, item: any) => 
            sum + (((item.pret_unitate || 0) - (item.pret_achizitie || 0)) * (item.cantitate || 0)), 0);
        const totalBucatiStoc = stocVanzare.reduce((sum: number, item: any) => sum + (item.cantitate || 0), 0);

        // Step 3: Validate and deduct stock
        const stockErrors: string[] = [];
        const validatedItems: any[] = [];
        
        if (Array.isArray(stocVanzare) && stocVanzare.length > 0) {
            for (const item of stocVanzare) {
                const { data: stockItem, error: stockError } = await supabase
                    .from('stocuri')
                    .select('id, cantitate, pret_achizitie')
                    .eq('id', item.id_stoc)
                    .single();

                if (stockError || !stockItem) {
                    stockErrors.push(`Produsul ${item.brand} nu a fost găsit`);
                    continue;
                }

                if (stockItem.cantitate < item.cantitate) {
                    stockErrors.push(`Stoc insuficient pentru ${item.brand}: disponibil ${stockItem.cantitate}, necesar ${item.cantitate}`);
                    continue;
                }

                validatedItems.push({ ...item, pret_achizitie: stockItem.pret_achizitie || 0 });
            }

            if (stockErrors.length > 0) {
                return NextResponse.json({ 
                    success: false, 
                    error: 'Stoc insuficient',
                    details: stockErrors 
                }, { status: 400 });
            }

            // Deduct stock
            for (const item of validatedItems) {
                const { data: currentStock } = await supabase
                    .from('stocuri')
                    .select('cantitate')
                    .eq('id', item.id_stoc)
                    .single();

                if (currentStock) {
                    await supabase
                        .from('stocuri')
                        .update({ 
                            cantitate: currentStock.cantitate - item.cantitate,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', item.id_stoc);
                }
            }
        }

        // Step 4: Create service record
        const enrichedStocVanzare = validatedItems.map(item => ({
            ...item,
            total_vanzare: (item.pret_unitate || 0) * (item.cantitate || 0),
            profit_total: ((item.pret_unitate || 0) - (item.pret_achizitie || 0)) * (item.cantitate || 0)
        }));

        const { data: serviceRecord, error: insertError } = await supabase
            .from('service_records')
            .insert([{
                service_number: body.numar_fisa || '',
                client_id: clientId,
                client_name: body.client_nume || 'Necunoscut',
                phone: body.client_telefon || '',
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
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (insertError || !serviceRecord) {
            // Restore stock on failure
            for (const item of validatedItems) {
                const { data: stock } = await supabase
                    .from('stocuri')
                    .select('cantitate')
                    .eq('id', item.id_stoc)
                    .single();
                if (stock) {
                    await supabase
                        .from('stocuri')
                        .update({ cantitate: stock.cantitate + item.cantitate })
                        .eq('id', item.id_stoc);
                }
            }
            throw insertError || new Error('Failed to create service record');
        }

        // Step 5: Create stock movements
        for (const item of validatedItems) {
            await supabase.from('stock_movements').insert([{
                anvelopa_id: item.id_stoc,
                reference_id: serviceRecord.id,
                tip: 'iesire',
                cantitate: item.cantitate,
                data: body.data_intrarii || new Date().toISOString().split('T')[0],
                motiv_iesire: 'vanzare',
                pret_achizitie: item.pret_achizitie,
                pret_vanzare: item.pret_unitate,
                profit_per_bucata: (item.pret_unitate || 0) - (item.pret_achizitie || 0),
                profit_total: ((item.pret_unitate || 0) - (item.pret_achizitie || 0)) * (item.cantitate || 0)
            }]);
        }

        // Step 6: Hotel registration
        if (body.hotel_anvelope?.activ) {
            try {
                await supabase.from('hotel_anvelope').insert([{
                    client_id: clientId,
                    service_record_id: serviceRecord.id,
                    dimensiune_anvelope: body.hotel_anvelope.dimensiune_anvelope,
                    marca_model: body.hotel_anvelope.marca_model,
                    status_observatii: body.hotel_anvelope.status_observatii,
                    saci: body.hotel_anvelope.saci || false,
                    status: 'Depozitate',
                    tip_depozit: body.hotel_anvelope.tip_depozit || 'Anvelope',
                    bucati: body.hotel_anvelope.bucati || 4,
                    pret_total: body.servicii?.vulcanizare?.pret_hotel || 0,
                }]);
            } catch (hotelError) {
                console.error('Hotel registration error:', hotelError);
            }
        }

        return NextResponse.json({
            success: true,
            id: serviceRecord.id,
            client_id: clientId,
            stats: {
                total_vanzare_stoc: totalVanzareStoc,
                total_profit_stoc: totalProfitStoc,
                total_bucati_stoc: totalBucatiStoc
            }
        });

    } catch (err: any) {
        console.error('Save Service Record Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
