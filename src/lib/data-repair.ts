// ═══════════════════════════════════════════════════════════
// DATA REPAIR & MIGRATION SCRIPT
// Fix incorrect stock data and synchronize everything
// ═══════════════════════════════════════════════════════════

import { createServerSupabase } from './supabase-server';

export async function repairStockData() {
    const supabase = await createServerSupabase();
    const results = {
        repaired: [] as string[],
        errors: [] as string[],
        stats: {
            totalMovements: 0,
            duplicatedFixed: 0,
            profitRecalculated: 0,
            stockSynced: 0
        }
    };

    try {
        // 1. Get all stock movements
        const { data: movements, error: mError } = await supabase
            .from('stock_movements')
            .select('*')
            .order('created_at', { ascending: true });

        if (mError) throw mError;

        results.stats.totalMovements = movements?.length || 0;

        // 2. Find and fix duplicate movements (same anvelopa_id, same cantitate, same second)
        const seen = new Map<string, boolean>();
        const duplicates: number[] = [];

        for (const m of movements || []) {
            const key = `${m.anvelopa_id}_${m.cantitate}_${m.data}_${m.tip}_${m.created_at?.substring(0, 16)}`;
            if (seen.has(key)) {
                duplicates.push(m.id);
            } else {
                seen.set(key, true);
            }
        }

        if (duplicates.length > 0) {
            // Delete duplicates
            const { error: dError } = await supabase
                .from('stock_movements')
                .delete()
                .in('id', duplicates);

            if (dError) {
                results.errors.push(`Failed to delete duplicates: ${dError.message}`);
            } else {
                results.stats.duplicatedFixed = duplicates.length;
                results.repaired.push(`Deleted ${duplicates.length} duplicate movements`);
            }
        }

        // 3. Recalculate profit for all movements where it's wrong
        const { data: movementsToFix } = await supabase
            .from('stock_movements')
            .select('*');

        for (const m of movementsToFix || []) {
            const correctProfit = ((m.pret_vanzare || 0) - (m.pret_achizitie || 0)) * (m.cantitate || 0);
            
            // Only update if profit is wrong
            if (Math.abs((m.profit_total || 0) - correctProfit) > 0.01) {
                const { error: uError } = await supabase
                    .from('stock_movements')
                    .update({ 
                        profit_total: correctProfit,
                        profit_per_bucata: (m.pret_vanzare || 0) - (m.pret_achizitie || 0)
                    })
                    .eq('id', m.id);

                if (!uError) {
                    results.stats.profitRecalculated++;
                }
            }
        }

        if (results.stats.profitRecalculated > 0) {
            results.repaired.push(`Recalculated profit for ${results.stats.profitRecalculated} movements`);
        }

        // 4. Recalculate and sync all stock quantities
        const { data: allStocks } = await supabase
            .from('stocuri')
            .select('id');

        for (const stock of allStocks || []) {
            // Get all entries (intrari)
            const { data: entries } = await supabase
                .from('stock_movements')
                .select('cantitate')
                .eq('anvelopa_id', stock.id)
                .eq('tip', 'intrare');

            // Get all exits (iesiri)
            const { data: exits } = await supabase
                .from('stock_movements')
                .select('cantitate')
                .eq('anvelopa_id', stock.id)
                .eq('tip', 'iesire');

            const totalIn = (entries || []).reduce((s, e) => s + (e.cantitate || 0), 0);
            const totalOut = (exits || []).reduce((s, e) => s + (e.cantitate || 0), 0);
            const correctQty = totalIn - totalOut;

            // Update stock with correct quantity
            const { error: sError } = await supabase
                .from('stocuri')
                .update({ cantitate: correctQty })
                .eq('id', stock.id);

            if (!sError) {
                results.stats.stockSynced++;
            }
        }

        results.repaired.push(`Synced ${results.stats.stockSynced} stock items`);

        return { success: true, ...results };
    } catch (err: any) {
        return { success: false, error: err.message, ...results };
    }
}
