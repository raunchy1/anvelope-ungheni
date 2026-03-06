import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

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
    try {
        const body = await req.json();
        const supabase = await createServerSupabase();

        const newRecord = {
            service_number: body.numar_fisa || '',
            client_name: body.client_nume || 'Necunoscut',
            phone: body.client_telefon || '',
            car_number: body.numar_masina || '',
            car_details: body.marca_model || '',
            tire_size: body.dimensiune_anvelope || '',
            km_bord: Number(body.km_bord) || 0,
            services: {
                ...body,
                servicii: body.servicii || {}
            },
            mecanic: body.mecanic || '',
            observatii: body.observatii || '',
            data_intrarii: body.data_intrarii || new Date().toISOString().split('T')[0],
        };

        const { data, error } = await supabase
            .from('service_records')
            .insert([newRecord])
            .select();

        if (error) throw new Error(error.message);

        // Handle hotel registration
        if (body.hotel_anvelope?.activ) {
            await supabase.from('hotel_anvelope').insert([{
                service_record_id: data[0].id,
                dimensiune_anvelope: body.hotel_anvelope.dimensiune_anvelope || body.dimensiune_anvelope,
                marca_model: body.hotel_anvelope.marca_model || body.marca_model,
                status_observatii: body.hotel_anvelope.status_observatii,
                saci: body.hotel_anvelope.saci || false,
                status: 'Depozitate',
                tip_depozit: body.hotel_anvelope.tip_depozit || 'Anvelope',
                bucati: body.hotel_anvelope.bucati || 4
            }]);
        }

        // Handle Stock Deduction (Part 5)
        const stocVanzare = body.servicii?.stoc_vanzare;
        if (Array.isArray(stocVanzare) && stocVanzare.length > 0) {
            for (const item of stocVanzare) {
                const { id_stoc, cantitate, pret_unitate } = item;

                // 1. Fetch current stock to check availability
                const { data: stocItem } = await supabase
                    .from('stocuri')
                    .select('cantitate, pret_achizitie, pret_vanzare')
                    .eq('id', id_stoc)
                    .single();

                if (stocItem && stocItem.cantitate >= cantitate) {
                    const newQty = stocItem.cantitate - cantitate;
                    const profitPerBuc = (Number(pret_unitate) || stocItem.pret_vanzare) - stocItem.pret_achizitie;

                    // 2. Update stock
                    await supabase.from('stocuri').update({ cantitate: newQty }).eq('id', id_stoc);

                    // 3. Record movement
                    await supabase.from('stock_movements').insert([{
                        anvelopa_id: id_stoc,
                        tip: 'service',
                        cantitate: cantitate,
                        data: body.data_intrarii || new Date().toISOString().split('T')[0],
                        motiv_iesire: `Vândut prin fișa #${body.numar_fisa || data[0].id}`,
                        pret_achizitie: stocItem.pret_achizitie,
                        pret_vanzare: Number(pret_unitate) || stocItem.pret_vanzare,
                        profit_per_bucata: profitPerBuc,
                        profit_total: profitPerBuc * cantitate
                    }]);
                }
            }
        }

        return NextResponse.json({ success: true, id: data[0].id });
    } catch (err: any) {
        console.error('Save Service Record Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
