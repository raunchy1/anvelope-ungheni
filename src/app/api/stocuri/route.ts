import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

const PAGE_SIZE = 50;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const q = (searchParams.get('q') || '').trim();
        const limit = Math.min(parseInt(searchParams.get('limit') || String(PAGE_SIZE)), 100);
        const offset = parseInt(searchParams.get('offset') || '0');
        
        const supabase = await createServerSupabase();
        
        // FIX C9: Server-side search with ILIKE
        let query = supabase
            .from('stocuri')
            .select('*', { count: 'exact' })
            .order('brand', { ascending: true })
            .range(offset, offset + limit - 1);
        
        if (q) {
            query = query.or(`brand.ilike.%${q}%,dimensiune.ilike.%${q}%,cod_produs.ilike.%${q}%`);
        }
        
        const { data, error, count } = await query;

        if (error) {
            console.error('Fetch Stocuri Error:', error);
            if (error.code === '42P01') return NextResponse.json([]);
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }

        return NextResponse.json({
            data: data || [],
            pagination: {
                total: count || 0,
                limit,
                offset,
                hasMore: (count || 0) > offset + limit
            }
        });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const supabase = await createServerSupabase();

        // Safe number parsing
        const pretAchizitie = Number(body.pret_achizitie) || 0;
        const pretVanzare = Number(body.pret_vanzare) || 0;
        
        const newItem = {
            brand: body.brand || '',
            dimensiune: body.dimensiune || '',
            sezon: body.sezon || 'Vară',
            cantitate: 0,
            pret_achizitie: pretAchizitie,
            pret_vanzare: pretVanzare,
            locatie_raft: body.locatie_raft || '',
            furnizor: body.furnizor || '',
            tip_achizitie: body.tip_achizitie || 'Cu factură',
            dot: body.dot || '',
            stoc_minim: Number(body.stoc_minim) || 2,
            cod_produs: body.cod_produs || '',
            profit_unitar: pretVanzare - pretAchizitie,
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
