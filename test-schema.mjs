import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gbdyzojsevqceiexkhxo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiZHl6b2pzZXZxY2VpZXhraHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDM1MzcsImV4cCI6MjA4ODI3OTUzN30.kbUQeHVZDwkUxsnq4DTMJ-8of_P5oIm17qcNRxmQeKs'
);

// Try to infer schema by inserting and rolling back
const testRow = {
  client_id: 1,
  client_name: 'Test',
  phone: '123',
  car_number: 'TEST',
  data_intrare: '2026-03-01'
};

const { error } = await supabase.from('hotel_anvelope').insert(testRow);
console.log('Test insert error:', error?.message);
console.log('Hint (available columns):', error?.details);
