import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: stocuri, error: fetchErr } = await supabase.from('stocuri').select('*');
    if (fetchErr) {
        console.error('Fetch error:', fetchErr);
        return;
    }
    
    console.log(`Found ${stocuri.length} items. Updating...`);
    
    for (const item of stocuri) {
        if (item.cantitate > 0) {
            const newQty = Math.floor(item.cantitate / 2);
            console.log(`Updating item ${item.id} from ${item.cantitate} to ${newQty}`);
            await supabase.from('stocuri').update({ cantitate: newQty }).eq('id', item.id);
        }
    }
    console.log('Update complete.');
}

main();
