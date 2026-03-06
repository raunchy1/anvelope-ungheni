const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.production' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
(async () => {
  const { data: d1 } = await s.from('clienti').select('id');
  const { data: d2 } = await s.from('stocuri').select('id');
  console.log('clienti:', d1);
  console.log('stocuri:', d2);
})();
