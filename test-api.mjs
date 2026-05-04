// Test script for API
const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Testing connection to Supabase...');
console.log('URL:', API_URL);

// Test if we can query service_records
fetch(`${API_URL}/rest/v1/service_records?select=id,service_number,client_name&limit=1`, {
  headers: {
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`
  }
})
.then(res => res.json())
.then(data => {
  console.log('Sample record:', data);
})
.catch(err => {
  console.error('Error:', err);
});
