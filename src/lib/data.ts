import type { Fisa, Anvelopa, MiscareStoc, Client, Car } from '@/types';

// ─── Sample Clients ───
export const sampleClients: Client[] = [
    { id: '1', nume: 'Paun Ciprian', telefon: '060612336', created_at: '2026-03-01' },
    { id: '2', nume: 'Gladei Gheorghe', telefon: '068229191', created_at: '2026-03-01' },
    { id: '3', nume: 'Doroftei Tudor', telefon: '069450316', created_at: '2026-02-28' },
    { id: '4', nume: 'Arcan Dumitru', telefon: '068516107', created_at: '2026-02-28' },
    { id: '5', nume: 'Gornea Ion', telefon: '069183570', created_at: '2026-02-27' },
    { id: '6', nume: 'Munteanu Vasile', telefon: '074512890', created_at: '2026-02-25' },
];

export const sampleCars: Car[] = [
    { id: '1', client_id: '1', numar_masina: 'IASI 70SIR', marca_model: 'WT4', dimensiune_anvelope: '205/55 R16', last_km: 87500, created_at: '2026-03-01' },
    { id: '2', client_id: '2', numar_masina: 'DCN 141', marca_model: 'Mercedes GLE', dimensiune_anvelope: '255/50 R19', last_km: 42300, created_at: '2026-03-01' },
    { id: '3', client_id: '3', numar_masina: 'IWK 433', marca_model: 'WTG', dimensiune_anvelope: '195/65 R15', last_km: 125000, created_at: '2026-02-28' },
    { id: '4', client_id: '4', numar_masina: 'DWP 954', marca_model: 'VW Sharan', dimensiune_anvelope: '225/45 R17', last_km: 98600, created_at: '2026-02-28' },
    { id: '5', client_id: '5', numar_masina: 'WIU 016', marca_model: 'Ford Fiesta', dimensiune_anvelope: '195/55 R15', last_km: 67800, created_at: '2026-02-27' },
    { id: '6', client_id: '6', numar_masina: 'IS 45 ABC', marca_model: 'Dacia Logan', dimensiune_anvelope: '185/65 R15', last_km: 156000, created_at: '2026-02-25' },
];

// ─── Sample Fișe ───
export const sampleFise: Fisa[] = [
    {
        id: '1', numar_fisa: '00000181', client_id: '1', client_nume: 'Paun Ciprian', client_telefon: '060612336',
        numar_masina: 'IASI 70SIR', marca_model: 'WT4', km_bord: 87500, dimensiune_anvelope: '205/55 R16',
        servicii: {
            vulcanizare: { service_complet_r: true, service_complet_diametru: '16', echilibrat: true, azot: true },
            vopsit_jante: {}, aer_conditionat: {}, frana: {}
        },
        hotel_anvelope: { activ: false, saci: true },
        mecanic: 'Chirinciuc', observatii: '', data_intrarii: '2026-03-03',
        created_by: 'admin', created_at: '2026-03-03', updated_at: '2026-03-03'
    },
    {
        id: '2', numar_fisa: '00000180', client_id: '2', client_nume: 'Gladei Gheorghe', client_telefon: '068229191',
        numar_masina: 'DCN 141', marca_model: 'Mercedes GLE', km_bord: 42300, dimensiune_anvelope: '255/50 R19',
        servicii: {
            vulcanizare: { service_complet_r: true, service_complet_diametru: '19', montat_demontat: true, echilibrat: true, curatat_butuc: true },
            vopsit_jante: {},
            aer_conditionat: { freon_134a_gr: '450' },
            frana: {}
        },
        hotel_anvelope: { activ: true, dimensiune_anvelope: '255/50 R19', marca_model: 'Continental', status_observatii: 'Set iarnă depozitat', saci: true },
        mecanic: 'Chirinciuc', observatii: 'Echilibrare + hotel anvelope iarnă', data_intrarii: '2026-03-03',
        created_by: 'admin', created_at: '2026-03-03', updated_at: '2026-03-03'
    },
    {
        id: '3', numar_fisa: '00000179', client_id: '3', client_nume: 'Doroftei Tudor', client_telefon: '069450316',
        numar_masina: 'IWK 433', marca_model: 'WTG', km_bord: 125000, dimensiune_anvelope: '195/65 R15',
        servicii: {
            vulcanizare: { scos_roata: true, montat_demontat: true, echilibrat: true },
            vopsit_jante: {}, aer_conditionat: {},
            frana: { slefuit_discuri: true, schimbat_placute: true, placute_fata: true }
        },
        hotel_anvelope: { activ: false },
        mecanic: 'CHIRINCIUC', observatii: '', data_intrarii: '2026-03-02',
        created_by: 'admin', created_at: '2026-03-02', updated_at: '2026-03-02'
    },
    {
        id: '4', numar_fisa: '00000178', client_id: '4', client_nume: 'Arcan Dumitru', client_telefon: '068516107',
        numar_masina: 'DWP 954', marca_model: 'VW Sharan', km_bord: 98600, dimensiune_anvelope: '225/45 R17',
        servicii: {
            vulcanizare: { service_complet_r: true, service_complet_diametru: '17', echilibrat: true, valva: true, azot: true },
            vopsit_jante: { vopsit_janta: true, numar_jante: '4', culoare: 'Negru mat', diametru: '17' },
            aer_conditionat: {}, frana: { curatat_vopsire_etriere: true }
        },
        hotel_anvelope: { activ: true, dimensiune_anvelope: '225/45 R17', marca_model: 'Michelin', saci: false },
        mecanic: 'CHIRINCIUC', observatii: 'Verificare frâne', data_intrarii: '2026-03-02',
        created_by: 'admin', created_at: '2026-03-02', updated_at: '2026-03-02'
    },
    {
        id: '5', numar_fisa: '00000177', client_id: '5', client_nume: 'Gornea Ion', client_telefon: '069183570',
        numar_masina: 'WIU 016', marca_model: 'Ford Fiesta', km_bord: 67800, dimensiune_anvelope: '195/55 R15',
        servicii: {
            vulcanizare: { montat_demontat: true, echilibrat: true, petic: 'UP3' },
            vopsit_jante: {}, aer_conditionat: {}, frana: {}
        },
        hotel_anvelope: { activ: false, saci: true },
        mecanic: 'CHIRINCIUC', observatii: '', data_intrarii: '2026-03-02',
        created_by: 'admin', created_at: '2026-03-02', updated_at: '2026-03-02'
    },
    {
        id: '6', numar_fisa: '00000176', client_id: '6', client_nume: 'Munteanu Vasile', client_telefon: '074512890',
        numar_masina: 'IS 45 ABC', marca_model: 'Dacia Logan', km_bord: 156000, dimensiune_anvelope: '185/65 R15',
        servicii: {
            vulcanizare: { service_complet_r: true, service_complet_diametru: '15', azot: true },
            vopsit_jante: {},
            aer_conditionat: {},
            frana: { schimb_discuri: true, placute_fata: true, placute_spate: true }
        },
        hotel_anvelope: { activ: false },
        mecanic: 'CHIRINCIUC', observatii: 'Geometrie roți', data_intrarii: '2026-03-01',
        created_by: 'admin', created_at: '2026-03-01', updated_at: '2026-03-01'
    },
];

// ─── Stocuri (from existing app) ───
export const sezoane = ['Vară', 'Iarnă', 'All-Season', 'M+S'] as const;
export const tipuriAchizitie = ['Cu factură', 'Cash'] as const;

export const anvelope: Anvelopa[] = [];

export const miscariStoc: MiscareStoc[] = [];

// ─── Helper functions ───
export function getStocStats() {
    const total = anvelope.reduce((s, a) => s + a.cantitate, 0);
    const iarna = anvelope.filter(a => a.sezon === 'Iarnă').reduce((s, a) => s + a.cantitate, 0);
    const vara = anvelope.filter(a => a.sezon === 'Vară').reduce((s, a) => s + a.cantitate, 0);
    const allSeason = anvelope.filter(a => a.sezon === 'All-Season' || a.sezon === 'M+S').reduce((s, a) => s + a.cantitate, 0);
    return { total, iarna, vara, allSeason };
}

export function getLowStock(threshold = 6) {
    return anvelope.filter(a => a.cantitate > 0 && a.cantitate <= threshold);
}

export function getNextFisaNumber(): string {
    const maxNum = Math.max(...sampleFise.map(f => parseInt(f.numar_fisa)));
    return String(maxNum + 1).padStart(8, '0');
}
