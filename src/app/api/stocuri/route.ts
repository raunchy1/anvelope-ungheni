import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET() {
    try {
        const supabase = await createServerSupabase();
        const { data, error } = await supabase
            .from('stocuri')
            .select('*')
            .order('brand', { ascending: true });

        if (error) {
            console.error('Fetch Stocuri Error:', error);
            if (error.code === '42P01') return NextResponse.json([]);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const supabase = await createServerSupabase();

        const newItem = {
            brand: body.brand || '',
            dimensiune: body.dimensiune || '',
            sezon: body.sezon || 'Vară',
            cantitate: 0,
            pret_achizitie: Number(body.pret_achizitie) || 0,
            pret_vanzare: Number(body.pret_vanzare) || 0,
            locatie_raft: body.locatie_raft || '',
            furnizor: body.furnizor || '',
            tip_achizitie: body.tip_achizitie || 'Cu factură',
            dot: body.dot || '',
            stoc_minim: Number(body.stoc_minim) || 2,
            cod_produs: body.cod_produs || '',
            profit_unitar: (Number(body.pret_vanzare) || 0) - (Number(body.pret_achizitie) || 0),
        };

        const { data, error } = await supabase
            .from('stocuri')
            .insert([newItem])
            .select()
            .single();

        if (error) throw new Error(error.message);

        return NextResponse.json({ success: true, id: data.id, item: data });
    } catch (err: any) {
        console.error('POST Stocuri Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const { id, ...updates } = body;

        if (updates.pret_vanzare !== undefined || updates.pret_achizitie !== undefined) {
            const pV = updates.pret_vanzare !== undefined ? Number(updates.pret_vanzare) : undefined;
            const pA = updates.pret_achizitie !== undefined ? Number(updates.pret_achizitie) : undefined;

            // If we have both or just one, we might need the current ones from DB to be 100% accurate, 
            // but usually they come together in the update or we can just calculate if available in the body.
            if (updates.pret_vanzare !== undefined && updates.pret_achizitie !== undefined) {
                updates.profit_unitar = Number(updates.pret_vanzare) - Number(updates.pret_achizitie);
            }
        }

        const supabase = await createServerSupabase();

        const { data, error } = await supabase
            .from('stocuri')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new Error(error.message);

        return NextResponse.json({ success: true, item: data });
    } catch (err: any) {
        console.error('PUT Stocuri Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
