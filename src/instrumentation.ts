export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        try {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (!supabaseUrl || !supabaseKey) return;

            const { createClient } = await import('@supabase/supabase-js');
            const supabase = createClient(supabaseUrl, supabaseKey);

            const EXTRA_PRICES = [
                { serviciu: 'Azot AUTO', pret: 150 },
                { serviciu: 'Azot SUV', pret: 200 },
                { serviciu: 'Valva', pret: 20 },
                { serviciu: 'Valva metal', pret: 50 },
                { serviciu: 'Cap senzor', pret: 100 },
                { serviciu: 'Montat senzor presiune', pret: 25 },
                { serviciu: 'Programat senzor + scanat', pret: 200 },
                { serviciu: 'UP3', pret: 15 },
                { serviciu: 'UP4', pret: 20 },
                { serviciu: 'TL110', pret: 100 },
                { serviciu: 'TL120', pret: 200 },
                { serviciu: 'Roluit janta tabla', pret: 100 },
                { serviciu: 'Indreptat janta aliaj', pret: 400 },
                { serviciu: 'Ozonare AC', pret: 350 },
            ];

            for (const entry of EXTRA_PRICES) {
                await supabase
                    .from('preturi_extra')
                    .upsert({ serviciu: entry.serviciu, pret: entry.pret }, { onConflict: 'serviciu' });
            }

            console.log('[Instrumentation] Prices synced to DB');
        } catch (err) {
            console.error('[Instrumentation] Price sync failed:', err);
        }
    }
}
