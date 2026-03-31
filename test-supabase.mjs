import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://gbdyzojsevqceiexkhxo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiZHl6b2pzZXZxY2VpZXhraHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDM1MzcsImV4cCI6MjA4ODI3OTUzN30.kbUQeHVZDwkUxsnq4DTMJ-8of_P5oIm17qcNRxmQeKs'
);

console.log('🔌 Testare conexiune Supabase...\n');

// Test 1: Conexiune de bază
const { data: { session }, error: authError } = await supabase.auth.getSession();
if (authError) {
  console.error('❌ Eroare conexiune:', authError.message);
  process.exit(1);
}
console.log('✅ Conexiune Supabase OK');
console.log('   Autentificat:', session ? 'Da' : 'Nu (anonim)');

// Test 2: Verifică tabelele critice
const tables = ['stock_movements', 'service_records', 'hotel_anvelope', 'clienti', 'masini', 'stocuri'];
console.log('\n📊 Verificare tabele:');

for (const table of tables) {
  const { error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });
  
  if (error) {
    console.log(`   ❌ ${table}: ${error.message}`);
  } else {
    console.log(`   ✅ ${table}: accesibil`);
  }
}

// Test 3: Verifică coloanele critice în stock_movements
console.log('\n🔍 Verificare coloane stock_movements:');
const { data: smCols, error: smError } = await supabase
  .from('stock_movements')
  .select('reference_id, tip, motiv_iesire, pret_vanzare, pret_achizitie, profit_total')
  .limit(1);

if (smError) {
  console.log('   ❌ Eroare la citire stock_movements:', smError.message);
  // Try to get any row to see what's available
  const { data: anyRow, error: anyError } = await supabase.from('stock_movements').select('*').limit(1);
  if (anyError) {
    console.log('   ❌ Nu pot citi deloc din stock_movements');
  } else if (anyRow && anyRow[0]) {
    console.log('   ⚠️ Coloane disponibile:', Object.keys(anyRow[0]).join(', '));
  }
} else {
  console.log('   ✅ Toate coloanele critice există');
}

// Test 4: Verifică coloanele în service_records
console.log('\n🔍 Verificare coloane service_records:');
const { data: srCols, error: srError } = await supabase
  .from('service_records')
  .select('data_intrarii, client_id, vehicle_id, services')
  .limit(1);

if (srError) {
  console.log('   ❌ Eroare:', srError.message);
  const { data: anyRow } = await supabase.from('service_records').select('*').limit(1);
  if (anyRow && anyRow[0]) {
    console.log('   ⚠️ Coloane disponibile:', Object.keys(anyRow[0]).join(', '));
  }
} else {
  console.log('   ✅ Toate coloanele critice există');
}

// Test 5: Verifică date pentru raport lunar (Martie 2026)
console.log('\n📅 Test date raport lunar (Martie 2026):');
const startDate = '2026-03-01';
const endDate = '2026-03-31';

// Stock movements
const { data: stockData, error: stockError } = await supabase
  .from('stock_movements')
  .select('*')
  .eq('tip', 'iesire')
  .gte('data', startDate)
  .lte('data', endDate);

console.log(`   Stock (iesiri): ${stockError ? '❌ ' + stockError.message : stockData?.length + ' înregistrări'}`);

// Service records
const { data: serviceData, error: serviceError } = await supabase
  .from('service_records')
  .select('*')
  .gte('data_intrarii', startDate)
  .lte('data_intrarii', endDate);

console.log(`   Service records: ${serviceError ? '❌ ' + serviceError.message : serviceData?.length + ' înregistrări'}`);

// Hotel
const { data: hotelData, error: hotelError } = await supabase
  .from('hotel_anvelope')
  .select('*')
  .gte('data_intrare', startDate)
  .lte('data_intrare', endDate);

console.log(`   Hotel: ${hotelError ? '❌ ' + hotelError.message : hotelData?.length + ' înregistrări'}`);

console.log('\n✅ Test complet!');
