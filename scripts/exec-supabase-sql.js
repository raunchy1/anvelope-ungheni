#!/usr/bin/env node
/**
 * Execută SQL pe Supabase folosind Service Role Key
 */

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://gbdyzojsevqceiexkhxo.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiZHl6b2pzZXZxY2VpZXhraHhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjcwMzUzNywiZXhwIjoyMDg4Mjc5NTM3fQ.GkVk57MHGesMip5ooK4gxiqM6IhjAZI8Gw3VQlYNXEs';

// Execută SQL prin PostgreSQL API
async function executePostgrestQuery(sql) {
    // PostgREST nu permite execuție SQL directă, dar putem crea o funcție temporară
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'apikey': SUPABASE_SERVICE_KEY
        },
        body: JSON.stringify({ query: sql })
    });

    if (response.status === 404) {
        // Funcția nu există, o creăm mai întâi
        console.log('  Creare funcție exec_sql temporară...');
        
        const createFnResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'apikey': SUPABASE_SERVICE_KEY
            },
            body: JSON.stringify({
                query: `
CREATE OR REPLACE FUNCTION exec_sql(query TEXT) RETURNS JSONB AS $$
BEGIN
    EXECUTE query;
    RETURN '{"success": true}'::JSONB;
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
                `.trim()
            })
        });
        
        console.log(`  Create function status: ${createFnResponse.status}`);
        
        // Reîncercăm
        const retry = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
                'apikey': SUPABASE_SERVICE_KEY
            },
            body: JSON.stringify({ query: sql })
        });
        
        return retry;
    }

    return response;
}

// Împărțim SQL în comenzi individuale
function splitSQL(sql) {
    // Separăm comenzile CREATE OR REPLACE FUNCTION (care conțin ; în interior)
    const commands = [];
    let current = '';
    let inFunction = false;
    
    const lines = sql.split('\n');
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('CREATE OR REPLACE FUNCTION') || 
            trimmed.startsWith('CREATE FUNCTION')) {
            if (current.trim()) {
                commands.push(current.trim());
            }
            current = line + '\n';
            inFunction = true;
        } else if (inFunction && trimmed === '$$ LANGUAGE plpgsql;') {
            current += line + '\n';
            commands.push(current.trim());
            current = '';
            inFunction = false;
        } else if (inFunction) {
            current += line + '\n';
        } else if (trimmed && !trimmed.startsWith('--') && !trimmed.startsWith('/*')) {
            // Comandă normală
            if (trimmed.endsWith(';')) {
                current += line;
                commands.push(current.trim());
                current = '';
            } else {
                current += line + ' ';
            }
        }
    }
    
    if (current.trim()) {
        commands.push(current.trim());
    }
    
    return commands.filter(cmd => cmd.length > 0);
}

async function main() {
    console.log('🚀 Execut SQL pe Supabase...\n');

    const sqlFile = path.join(__dirname, '..', 'supabase', 'RUN_THIS_SQL.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    
    console.log('✅ SQL citit din fișier');
    console.log(`📊 Dimensiune: ${sql.length} caractere`);
    
    // Împărțim în comenzi
    const commands = splitSQL(sql);
    console.log(`🔢 Comenzi identificate: ${commands.length}\n`);
    
    // Afișăm prima și ultima comandă pentru verificare
    console.log('Prima comandă:');
    console.log(commands[0]?.substring(0, 100) + '...\n');
    
    console.log('⚠️  Din păcate, Supabase REST API nu permite execuție SQL directă.');
    console.log('   Trebuie să rulezi SQL manual în Dashboard.');
    console.log('\n📋 Pași:');
    console.log('1. Deschide: https://app.supabase.com/project/gbdyzojsevqceiexkhxo');
    console.log('2. SQL Editor → New query');
    console.log('3. Copiază tot conținutul din supabase/RUN_THIS_SQL.sql');
    console.log('4. Click Run');
    
    // Salvăm și comenzile împărțite pentru debugging
    const debugFile = path.join(__dirname, '..', 'supabase', 'COMMANDS_DEBUG.txt');
    fs.writeFileSync(debugFile, commands.map((c, i) => `-- Command ${i+1} --\n${c}\n`).join('\n'));
    console.log(`\n📝 Debug salvat în: ${debugFile}`);
}

main().catch(console.error);
