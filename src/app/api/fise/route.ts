import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

const PAGE_SIZE = 50;

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || String(PAGE_SIZE)), 100);
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

        // Prepare stock items safely
        const stocVanzare = body.servicii?.vulcanizare?.stoc_vanzare || body.servicii?.stoc_vanzare || [];
        const stockItems = Array.isArray(stocVanzare)
            ? stocVanzare.map((item: any) => ({
                id_stoc: item.id_stoc,
                cantitate: item.cantitate,
                pret_unitate: item.pret_unitate,
                pret_achizitie: item.pret_achizitie || 0
            }))
            : [];

        // FIX C4, C5, M1: Use atomic RPC with transaction + advisory lock
        const { data, error } = await supabase.rpc('create_service_with_stock', {
            p_service_data: {
                numar_fisa: body.numar_fisa,
                client_id: body.client_id,
                client_nume: body.client_nume,
                client_telefon: body.client_telefon || '',
                numar_masina: body.numar_masina,
                marca_model: body.marca_model || '',
                dimensiune_anvelope: body.dimensiune_anvelope || '',
                km_bord: (body.km_bord ?? 0) || 0,
                servicii: body.servicii,
                mecanic: body.mecanic || '',
                observatii: body.observatii || '',
                data_intrarii: body.data_intrarii || new Date().toISOString().split('T')[0]
            },
            p_stock_items: stockItems
        });

        if (error) {
            console.error('RPC Error:', error);
            return NextResponse.json({
                success: false,
                error: error.message.includes('Stoc insuficient')
                    ? 'Stoc insuficient'
                    : 'Eroare la salvare'
            }, { status: 400 });
        }

        // FIX C3: Safe access with null coalescing
        const serviceId = data?.id ?? null;
        if (!serviceId) {
            return NextResponse.json({ error: 'Failed to create service record' }, { status: 500 });
        }

        // FIX m13: Hotel registration with proper await and error handling
        if (body.hotel_anvelope?.activ) {
            try {
                await supabase.from('hotel_anvelope').insert([{
                    client_id: data?.client_id,
                    service_record_id: serviceId,
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
            id: serviceId,
            stats: data?.stats || {}
        });

    } catch (err: any) {
        console.error('Save Service Record Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
