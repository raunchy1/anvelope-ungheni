import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET() {
    try {
        const supabase = await createServerSupabase();
        const { data, error } = await supabase
            .from('stock_movements')
            .select('*')
            .order('data', { ascending: false });

        if (error) {
            console.error('Fetch Miscari Error:', error);
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

        const newMovement = {
            anvelopa_id: body.anvelopa_id,
            tip: body.tip, // 'intrare' | 'iesire'
            cantitate: Number(body.cantitate),
            data: body.data || new Date().toISOString().split('T')[0],
            motiv_iesire: body.motiv_iesire || null,
            pret_achizitie: Number(body.pret_achizitie) || null,
            pret_vanzare: Number(body.pret_vanzare) || null,
            profit_per_bucata: Number(body.profit_per_bucata) || null,
            profit_total: Number(body.profit_total) || null,
        };

        // Double submit protection
        const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
        const { data: duplicate } = await supabase
            .from('stock_movements')
            .select('id')
            .eq('anvelopa_id', body.anvelopa_id)
            .eq('tip', body.tip)
            .eq('cantitate', Number(body.cantitate))
            .gte('created_at', fiveSecondsAgo)
            .maybeSingle();

        if (duplicate) {
            console.log('Duplicate stock movement prevented for:', body.anvelopa_id);
            return NextResponse.json({ success: true, id: duplicate.id });
        }

        const { data, error } = await supabase
            .from('stock_movements')
            .insert([newMovement])
            .select()
            .single();

        if (error) throw new Error(error.message);

        // Update the inventory quantity accordingly
        const { data: tire, error: tireError } = await supabase
            .from('stocuri')
            .select('cantitate')
            .eq('id', body.anvelopa_id)
            .single();

        if (!tireError && tire) {
            const newQty = body.tip === 'intrare'
                ? tire.cantitate + Number(body.cantitate)
                : tire.cantitate - Number(body.cantitate);

            await supabase.from('stocuri').update({ cantitate: newQty }).eq('id', body.anvelopa_id);
        }

        return NextResponse.json({ success: true, id: data.id });
    } catch (err: any) {
        console.error('POST Miscari Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
