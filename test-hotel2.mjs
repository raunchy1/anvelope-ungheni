import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gbdyzojsevqceiexkhxo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiZHl6b2pzZXZxY2VpZXhraHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDM1MzcsImV4cCI6MjA4ODI3OTUzN30.kbUQeHVZDwkUxsnq4DTMJ-8of_P5oIm17qcNRxmQeKs'
);

const { data, error } = await supabase.from('hotel_anvelope').select('*').limit(1);
console.log('Error:', error);
console.log('Data:', data);
console.log('Data length:', data?.length);
if (data && data[0]) {
  console.log('Keys:', Object.keys(data[0]));
}
