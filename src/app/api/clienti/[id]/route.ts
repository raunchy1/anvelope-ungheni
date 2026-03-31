import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createServerSupabase();

        // Get client with all their vehicles
        const { data, error } = await supabase
            .from('clienti')
            .select('*, masini(*)')
            .eq('id', id)
            .single();

        if (error || !data) {
            return NextResponse.json({ success: false, error: 'Client not found' }, { status: 404 });
        }

        const mapped = {
            id: data.id,
            nume: data.nume,
            telefon: data.telefon,
            created_at: data.created_at,
            updated_at: data.updated_at,
            masini: data.masini || []
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
        const { nume, telefon } = body;
        const supabase = await createServerSupabase();

        // Update client basic info
        const { error: clientErr } = await supabase
            .from('clienti')
            .update({ nume, telefon, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (clientErr) throw new Error(clientErr.message);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Update Client Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
