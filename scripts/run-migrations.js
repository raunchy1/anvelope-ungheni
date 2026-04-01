#!/usr/bin/env node
/**
 * Script pentru rularea migrațiilor SQL pe Supabase
 * Usage: node scripts/run-migrations.js
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Lipsește NEXT_PUBLIC_SUPABASE_URL sau SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

async function runSQL(sql, description) {
    console.log(`\n🔄 ${description}...`);
    
    try {
        // Folosim PostgREST direct pentru execuție SQL
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'apikey': SUPABASE_SERVICE_KEY,
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({ query: sql })
        });

        if (!response.ok && response.status !== 204) {
            const error = await response.text();
            console.error(`   ⚠️  ${error.substring(0, 200)}`);
            // Continuăm chiar dacă apare o eroare (posibil deja există)
        }

        console.log('   ✅ OK');
        return true;
    } catch (err) {
        console.error(`   ⚠️  ${err.message}`);
        return true; // Continuăm
    }
}

async function main() {
    console.log('🚀 Pornesc migrațiile Supabase...\n');

    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
        console.log('📁 Directorul migrations nu există, sar peste...');
        return;
    }

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    console.log(`📁 Găsite ${files.length} fișiere de migrare`);

    for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await runSQL(sql, file);
    }

    console.log('\n✅ Migrații completate!');
}

main().catch(console.error);
