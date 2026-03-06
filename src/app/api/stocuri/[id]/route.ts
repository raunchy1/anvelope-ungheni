import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createServerSupabase();

        // Stock movements are implicitly deleted via ON DELETE CASCADE in the database schema.
        // Wait, schema says: anvelopa_id INTEGER REFERENCES stocuri(id) ON DELETE CASCADE
        // Just in case, we can manually delete them first safely if we want, or rely on cascade.
        // The user specifically said: "DELETE FROM stock_movements WHERE product_id = product_id;"
        const { error: movementError } = await supabase
            .from('stock_movements')
            .delete()
            .eq('anvelopa_id', id);

        if (movementError) throw new Error(movementError.message);

        const { error: stocError } = await supabase
            .from('stocuri')
            .delete()
            .eq('id', id);

        if (stocError) throw new Error(stocError.message);

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('Delete Stoc Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
