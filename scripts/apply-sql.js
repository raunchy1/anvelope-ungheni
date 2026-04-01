#!/usr/bin/env node
/**
 * Script pentru aplicarea SQL pe Supabase folosind Management API
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = 'https://gbdyzojsevqceiexkhxo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiZHl6b2pzZXZxY2VpZXhraHhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjcwMzUzNywiZXhwIjoyMDg4Mjc5NTM3fQ.GkVk57MHGesMip5ooK4gxiqM6IhjAZI8Gw3VQlYNXEs';

// Extrage project ref
const projectRef = 'gbdyzojsevqceiexkhxo';

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'api.supabase.com',
            port: 443,
            path: path,
            method: method,
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let responseData = '';
            res.on('data', (chunk) => responseData += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: parsed });
                } catch {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });

        req.on('error', reject);
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

// Folosim PostgREST pentru execuție SQL
async function executeSQL(sql, description) {
    console.log(`\n🔄 ${description}...`);
    
    try {
        // Încercăm prin PostgREST direct
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'apikey': SUPABASE_SERVICE_KEY,
                'Prefer': 'tx=rollback' // Doar pentru test, scoatem după
            },
            body: JSON.stringify({ query: sql })
        });

        if (!response.ok) {
            const error = await response.text();
            console.log(`   ⚠️ PostgREST error: ${error.substring(0, 100)}`);
            return { success: false, error };
        }

        console.log('   ✅ OK');
        return { success: true };
    } catch (err) {
        console.log(`   ⚠️ Error: ${err.message}`);
        return { success: false, error: err.message };
    }
}

// Alternativ: creăm fișier SQL de rulat manual
function createManualSQLFile() {
    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    
    let combinedSQL = `-- Combined migrations - Run this in Supabase SQL Editor\n`;
    combinedSQL += `-- Generated: ${new Date().toISOString()}\n\n`;
    
    for (const file of files) {
        const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        combinedSQL += `\n-- ================================================\n`;
        combinedSQL += `-- ${file}\n`;
        combinedSQL += `-- ================================================\n\n`;
        combinedSQL += content;
        combinedSQL += '\n\n';
    }
    
    const outputPath = path.join(__dirname, '..', 'supabase', 'RUN_THIS_SQL.sql');
    fs.writeFileSync(outputPath, combinedSQL);
    console.log(`\n📄 Fișier SQL combinat creat: ${outputPath}`);
    return outputPath;
}

async function main() {
    console.log('🚀 Aplic migrațiile pe Supabase...\n');
    console.log(`📡 Project: ${projectRef}`);

    const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
    
    if (!fs.existsSync(migrationsDir)) {
        console.log('❌ Directorul migrations nu există');
        process.exit(1);
    }

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    console.log(`📁 ${files.length} fișiere SQL găsite`);

    // Creăm fișier combinat pentru rulare manuală
    const manualFile = createManualSQLFile();
    
    console.log('\n⚠️  IMPORTANT: Rulează manual fișierul SQL în Supabase Dashboard:');
    console.log('1. Deschide https://app.supabase.com/project/gbdyzojsevqceiexkhxo');
    console.log('2. SQL Editor → New query');
    console.log(`3. Copiază conținutul din: ${manualFile}`);
    console.log('4. Click "Run"');
    console.log('\nSau folosește fișierul individual:');
    console.log('  - 20260401_fix_transactions.sql (principal)');
    console.log('  - 20260401_auth_profiles.sql (pentru auth)');
}

main().catch(console.error);
