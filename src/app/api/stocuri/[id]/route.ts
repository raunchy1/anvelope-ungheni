import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const supabase = await createServerSupabase();

        // ═══ PIN PROTECTION ═══
        const pin = req.headers.get('x-admin-pin');
        const expectedPin = process.env.ADMIN_DELETE_PIN || '1234';
        
        if (!pin || pin !== expectedPin) {
            return NextResponse.json({ 
                success: false, 
                error: 'PIN admin incorect. Ștergerea necesită autorizare.' 
            }, { status: 403 });
        }

        // Stock movements are implicitly deleted via ON DELETE CASCADE in the database schema.
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

