import { createClient } from '@supabase/supabase-js';

const url = 'https://gbdyzojsevqceiexkhxo.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiZHl6b2pzZXZxY2VpZXhraHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDM1MzcsImV4cCI6MjA4ODI3OTUzN30.kbUQeHVZDwkUxsnq4DTMJ-8of_P5oIm17qcNRxmQeKs';

const supabase = createClient(url, key);

async function main() {
    console.log('Fetching stocuri...');
    const { data: stocuri, error } = await supabase.from('stocuri').select('*');
    if (error) {
        console.error('Error fetching', error);
        return;
    }

    let updated = 0;
    for (const item of stocuri) {
        if (item.cantitate > 0) {
            const newQty = Math.floor(item.cantitate / 2);
            const { error: updateErr } = await supabase.from('stocuri').update({ cantitate: newQty }).eq('id', item.id);
            if (!updateErr) {
                console.log(`Updated item ID ${item.id} from ${item.cantitate} to ${newQty}`);
                updated++;
            }
        }
    }
    console.log(`Done updating ${updated} items.`);
}
main();
