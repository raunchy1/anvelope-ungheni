#!/usr/bin/env node
/**
 * Script pentru aplicarea migrațiilor SQL pe Supabase
 * Folosește Supabase Management API
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Lipsește NEXT_PUBLIC_SUPABASE_URL sau SUPABASE_SERVICE_ROLE_KEY');
    console.log('Pentru a obține SUPABASE_SERVICE_ROLE_KEY:');
    console.log('1. Intră în Supabase Dashboard → Project Settings → API');
    console.log('2. Copiază "service_role secret"');
    process.exit(1);
}

async function executeSQL(sql, description) {
    console.log(`\n🔄 ${description}...`);
    
    try {
        // Extrage project ref din URL
        const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\./)?.[1];
        if (!projectRef) {
            throw new Error('URL Supabase invalid');
        }

        // Folosim Postgres API direct
        const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'apikey': SUPABASE_SERVICE_KEY
            },
            body: JSON.stringify({ query: sql })
        });

        if (!response.ok) {
            const error = await response.text();
            if (error.includes('function') && error.includes('does not exist')) {
                console.log('   ⚠️  Funcția exec_sql nu există, încerc metoda alternativă...');
                // Încercăm să executăm direct prin query parameter (doar pentru SELECT)
                return { success: false, error: 'exec_sql not found' };
            }
            console.error(`   ⚠️  ${error.substring(0, 150)}`);
            return { success: false, error };
        }

        console.log('   ✅ OK');
        return { success: true };
    } catch (err) {
        console.error(`   ⚠️  ${err.message}`);
        return { success: false, error: err.message };
    }
}

async function main() {
    console.log('🚀 Aplic migrațiile pe Supabase...\n');
    console.log(`📡 URL: ${SUPABASE_URL}`);

    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
        console.log('❌ Directorul migrations nu există');
        process.exit(1);
    }

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    console.log(`📁 ${files.length} fișiere SQL găsite:`);
    files.forEach(f => console.log(`   • ${f}`));

    let successCount = 0;
    let failCount = 0;

    for (const file of files) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        const result = await executeSQL(sql, file);
        
        if (result.success) {
            successCount++;
        } else {
            failCount++;
            // Continuăm chiar dacă apare o eroare
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log(`✅ ${successCount} migrații aplicate`);
    if (failCount > 0) {
        console.log(`⚠️  ${failCount} migrații cu erori (posibil deja există)`);
    }
    
    console.log('\n📝 IMPORTANT:');
    console.log('Dacă migrațiile au eșuat, rulează manual SQL în Supabase Dashboard:');
    console.log('1. Deschide https://app.supabase.com');
    console.log('2. SQL Editor → New query');
    console.log('3. Copiază conținutul din supabase/migrations/20260401_fix_transactions.sql');
    console.log('4. Run');
}

main().catch(err => {
    console.error('❌ Eroare fatală:', err);
    process.exit(1);
});
