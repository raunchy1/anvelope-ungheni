#!/usr/bin/env node
/**
 * Aplică migrațiile SQL pe Supabase
 */

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

// Construim connection string din service role key
// Supabase connection: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
const PROJECT_REF = 'gbdyzojsevqceiexkhxo';
const PASSWORD = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiZHl6b2pzZXZxY2VpZXhraHhvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjcwMzUzNywiZXhwIjoyMDg4Mjc5NTM3fQ.GkVk57MHGesMip5ooK4gxiqM6IhjAZI8Gw3VQlYNXEs';

const connectionString = `postgresql://postgres:${PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres`;

async function applyMigrations() {
    console.log('🚀 Conectare la Supabase PostgreSQL...\n');
    
    const client = new Client({
        connectionString,
        ssl: {
            rejectUnauthorized: false
        }
    });
    
    try {
        await client.connect();
        console.log('✅ Conectat la baza de date\n');
        
        // Citim fișierul SQL
        const sqlFile = path.join(__dirname, '..', 'supabase', '20260401_fix_transactions.sql');
        const sql = fs.readFileSync(sqlFile, 'utf8');
        
        console.log('📄 Execut migrația principală...');
        console.log(`   Dimensiune: ${sql.length} caractere\n`);
        
        // Executăm SQL
        await client.query(sql);
        console.log('✅ Migrație principală aplicată cu succes!\n');
        
        // Citim și aplicăm migrația de auth
        const authFile = path.join(__dirname, '..', 'supabase', '20260401_auth_profiles.sql');
        if (fs.existsSync(authFile)) {
            const authSql = fs.readFileSync(authFile, 'utf8');
            console.log('📄 Execut migrația auth...');
            await client.query(authSql);
            console.log('✅ Migrație auth aplicată cu succes!\n');
        }
        
        // Verificăm funcțiile create
        console.log('🔍 Verific funcțiile create:');
        const functions = await client.query(`
            SELECT routine_name 
            FROM information_schema.routines 
            WHERE routine_schema = 'public' 
            AND routine_type = 'FUNCTION'
            AND routine_name IN ('get_next_service_number', 'create_service_with_stock', 'delete_service_with_restore')
        `);
        
        functions.rows.forEach(row => {
            console.log(`   ✅ ${row.routine_name}`);
        });
        
        console.log('\n🎉 Toate migrațiile au fost aplicate cu succes!');
        
    } catch (err) {
        console.error('\n❌ Eroare:', err.message);
        if (err.message.includes('password authentication failed')) {
            console.log('\n⚠️  Service Role Key nu funcționează pentru conexiunea directă PostgreSQL.');
            console.log('   Folosește metoda manuală:');
            console.log('   1. https://app.supabase.com/project/gbdyzojsevqceiexkhxo');
            console.log('   2. SQL Editor → New query');
            console.log('   3. Copiază conținutul din supabase/RUN_THIS_SQL.sql');
        }
    } finally {
        await client.end();
    }
}

applyMigrations();
