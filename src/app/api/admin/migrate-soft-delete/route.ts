import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

// Temporary endpoint to run the soft-delete migration
// Access: GET /api/admin/migrate-soft-delete?pin=1234
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const pin = searchParams.get('pin');
    
    if (pin !== '1234') {
        return NextResponse.json({ error: 'Invalid PIN' }, { status: 403 });
    }

    const supabase = await createServerSupabase();
    const results: string[] = [];
    const errors: string[] = [];

    // We can't run ALTER TABLE via PostgREST, but we CAN check if columns exist
    // and use a workaround: try to select from the columns and if they don't exist, 
    // we know we need the migration

    // Test if deleted_at exists on service_records
    const { error: testError } = await supabase
        .from('service_records')
        .select('deleted_at')
        .limit(1);

    if (testError && testError.message.includes('does not exist')) {
        results.push('Column deleted_at does not exist yet - migration needed');
        results.push('Please run soft-delete-migration.sql in Supabase SQL Editor');
        return NextResponse.json({ 
            success: false, 
            message: 'Migration needed - run SQL manually',
            results,
            sql: `
ALTER TABLE service_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE hotel_anvelope ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE stocuri ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE service_records ADD COLUMN IF NOT EXISTS deleted_by TEXT DEFAULT NULL;
ALTER TABLE clienti ADD COLUMN IF NOT EXISTS deleted_by TEXT DEFAULT NULL;
            `.trim()
        });
    }

    results.push('Column deleted_at already exists - migration not needed');
    
    // Verify all tables
    const tables = ['service_records', 'clienti', 'hotel_anvelope', 'stocuri'];
    for (const table of tables) {
        const { error } = await supabase
            .from(table)
            .select('deleted_at')
            .limit(1);
        
        if (error) {
            errors.push(`${table}: ${error.message}`);
        } else {
            results.push(`${table}: deleted_at column exists ✓`);
        }
    }

    return NextResponse.json({ success: errors.length === 0, results, errors });
}
