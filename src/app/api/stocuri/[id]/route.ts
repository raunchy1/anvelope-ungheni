import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

// Stock entries are retired, not erased. Every row has stock_movements hanging
// off it that carry the sales history behind reports the shop has already
// closed its books on, so deleting the row outright would quietly rewrite past
// figures. Setting deleted_at hides the entry from the stock lists while
// leaving that history — and the option to bring it back — intact.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createServerSupabase();

        const { error } = await supabase
            .from('stocuri')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (error) throw new Error(error.message);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Delete Stoc Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
