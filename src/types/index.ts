export type UserRole = 'admin' | 'receptioner';

export interface Profile {
    id: string;
    email: string;
    role: UserRole;
    full_name: string;
    created_at: string;
}

export interface Client {
    id: string;
    nume: string;
    telefon: string;
    created_at: string;
}

export interface Car {
    id: string;
    client_id: string;
    numar_masina: string;
    marca_model: string;
    dimensiune_anvelope: string;
    last_km: number | null;
    created_at: string;
}

export interface ServiciiVulcanizare {
    diametru?: string;
    tip_vehicul?: 'AUTO' | 'SUV' | 'ATMT' | 'MICROBUS';
    service_complet_r?: boolean;
    service_complet_diametru?: string;
    scos_roata?: boolean | { service: string; quantity: number };
    montat_demontat?: boolean | { service: string; quantity: number };
    echilibrat?: boolean | { service: string; quantity: number };
    curatat_butuc?: boolean;
    azot?: boolean;
    valva?: boolean;
    valva_metal?: boolean;
    cap_senzor?: boolean;
    senzori_schimbati?: boolean;
    senzori_programati?: boolean;
    saci?: boolean;
    saci_cantitate?: number;
    petic?: string; // UP3 / UP4 / TL110 / TL120
    pret_vulcanizare?: number;
    pret_jante?: number;
    pret_ac?: number;
    pret_frane?: number;
    pret_hotel?: number;
    pret_total?: number;
}

export interface VopsitJante {
    indreptat_janta_aliaj?: boolean;
    diametru_indreptat?: string;

    roluit_janta_tabla?: boolean;
    note_roluire?: string;

    vopsit_janta_culoare?: boolean;
    nr_bucati_vopsit?: string;
    culoare_vopsit?: string;

    vopsit_diamant_cut?: boolean;
    nr_bucati_vopsit_diamant?: string;

    diamant_cut_lac?: boolean;
    nr_bucati_diamant_cut_lac?: string;
    diametru_diamant_cut_lac?: string;
}

export interface AerConditionat {
    freon_134a_gr?: string;
    freon_1234yf_gr?: string;
    schimb_radiator?: boolean;
    schimb_compresor?: boolean;
}

export interface Frana {
    slefuit_discuri?: boolean;
    schimb_discuri?: boolean;
    schimbat_placute?: boolean;
    placute_fata?: boolean;
    placute_spate?: boolean;
    placute_spate_frana_electrica?: boolean;
    curatat_vopsire_etriere?: boolean;
}

export interface HotelAnvelope {
    activ: boolean;
    dimensiune_anvelope?: string;
    marca_model?: string;
    status_observatii?: string;
    saci?: boolean;
    status_hotel?: 'Depozitate' | 'Ridicate';
    data_depozitare?: string;
    tip_depozit?: 'Anvelope' | 'Anvelope + jante' | 'Jante';
    bucati?: number;
}

export interface FisaServicii {
    vulcanizare: ServiciiVulcanizare;
    vopsit_jante: VopsitJante;
    aer_conditionat: AerConditionat;
    frana: Frana;
}

export interface Fisa {
    id: string;
    numar_fisa: string; // format: 00000161
    client_id: string;
    client_nume?: string;
    client_telefon?: string;
    numar_masina: string;
    marca_model: string;
    km_bord: number | null;
    dimensiune_anvelope: string;
    servicii: FisaServicii;
    hotel_anvelope: HotelAnvelope;
    mecanic: string;
    observatii: string;
    data_intrarii: string;
    created_by: string;
    created_at: string;
    updated_at: string;
}

// ─── Stocuri types (from existing app) ───
export interface Anvelopa {
    id: number;
    brand: string;
    dimensiune: string;
    sezon: 'Vară' | 'Iarnă' | 'All-Season' | 'M+S';
    cantitate: number;
    pret_achizitie: number;
    pret_vanzare: number;
    locatie_raft: string;
    furnizor: string;
    tip_achizitie: 'Cu factură' | 'Cash';
    dot: string;
}

export interface MiscareStoc {
    id: number;
    anvelopa_id: number;
    tip: 'intrare' | 'iesire' | 'ajustare_plus' | 'ajustare_minus';
    cantitate: number;
    data: string;
    motiv_iesire: string | null;
    pret_achizitie?: number;
    pret_vanzare?: number;
    profit_per_bucata?: number;
    profit_total?: number;
}
export interface PretVulcanizare {
    id: string;
    diametru: string;
    tip: string;
    scos_roata: number;
    montat_demontat: number;
    echilibrat: number;
    service_complet: number;
    pret_bucata: number;
}

export interface PretExtra {
    id: string;
    serviciu: string;
    pret: number;
}

export interface PretHotel {
    id: string;
    serviciu: string;
    pret: number;
}
