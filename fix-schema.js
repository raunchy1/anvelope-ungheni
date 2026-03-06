import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
    const dbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', 'postgres://postgres.gbdyzojsevqceiexkhxo:YOUR_PASSWORD@aws-0-eu-central-1.pooler.supabase.com:6543/postgres');
    // I don't have the password. The URL is just the REST endpoint.
}
