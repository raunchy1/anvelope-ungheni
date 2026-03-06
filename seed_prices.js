const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://gbdyzojsevqceiexkhxo.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdiZHl6b2pzZXZxY2VpZXhraHhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3MDM1MzcsImV4cCI6MjA4ODI3OTUzN30.kbUQeHVZDwkUxsnq4DTMJ-8of_P5oIm17qcNRxmQeKs'
);

async function seed() {
    console.log('Seeding prices...');

    const vulcanizare = [
        ['R15 AUTO', 25, 25, 40, 360, 90],
        ['R15 SUV', 30, 30, 50, 440, 110],
        ['R15 ATMT', 35, 35, 55, 500, 125],
        ['R16 AUTO', 30, 25, 40, 380, 95],
        ['R16 SUV', 30, 30, 50, 440, 110],
        ['R16 ATMT', 35, 35, 55, 500, 125],
        ['R17 AUTO', 30, 30, 50, 440, 110],
        ['R17 SUV', 35, 35, 55, 500, 125],
        ['R17 ATMT', 45, 40, 65, 600, 150],
        ['R18 AUTO', 35, 35, 55, 500, 125],
        ['R18 SUV', 40, 35, 65, 560, 140],
        ['R19 AUTO', 40, 35, 60, 540, 135],
        ['R19 SUV', 45, 40, 65, 600, 150],
        ['R20 AUTO', 45, 45, 85, 700, 175],
        ['R20 SUV', 50, 75, 100, 900, 225],
        ['R21 AUTO', 45, 45, 85, 700, 175],
        ['R21 SUV', 50, 75, 100, 900, 225],
        ['R22 AUTO', 45, 45, 85, 700, 175],
        ['R22 SUV', 50, 75, 100, 900, 225],
        ['R15C/16C MICROBUS', 30, 35, 55, 480, 120],
        ['R15C/16C TABLA', 35, 40, 55, 520, 130],
        ['R15C/16C ALIAJ', 40, 45, 65, 600, 150]
    ];

    for (const [key, scos, mont, echil, compl, buc] of vulcanizare) {
        const [dim, tip] = key.split(' ');
        const { error } = await supabase.from('preturi_vulcanizare').insert([{
            diametru: dim,
            tip: tip,
            scos_roata: scos,
            montat_demontat: mont,
            echilibrat: echil,
            service_complet: compl,
            pret_bucata: buc
        }]);
        if (error) console.error(`Error inserting ${key}:`, error.message);
        else console.log(`Inserted ${key}`);
    }

    const extra = [
        ['Azot AUTO', 10],
        ['Azot SUV', 15],
        ['Valva', 10],
        ['Valva metal', 40],
        ['Cap senzor', 25],
        ['Montat senzor presiune', 25],
        ['Programat senzor + scanat', 150],
        ['Ciuperca (reparatie)', 150],
        ['Snur (reparatie)', 50],
        ['Petic mic', 100],
        ['Petic mare', 150],
        ['Petic lateral', 400],
        ['Roluit janta tabla', 150],
        ['Indreptat janta aliaj', 200]
    ];

    for (const [serv, pret] of extra) {
        const { error } = await supabase.from('preturi_extra').insert([{ serviciu: serv, pret: pret }]);
        if (error) console.error(`Error inserting ${serv}:`, error.message);
        else console.log(`Inserted ${serv}`);
    }

    const hotel = [
        ['Set 4 anvelope', 300],
        ['Set 4 anvelope + jante', 400]
    ];

    for (const [serv, pret] of hotel) {
        const { error } = await supabase.from('preturi_hotel').insert([{ serviciu: serv, pret: pret }]);
        if (error) console.error(`Error inserting ${serv}:`, error.message);
        else console.log(`Inserted ${serv}`);
    }

    console.log('Seeding complete.');
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed script failed:', err);
    process.exit(1);
});
