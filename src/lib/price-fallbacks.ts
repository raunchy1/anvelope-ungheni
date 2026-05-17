// Fallback prices matching official price board — used when DB entry is missing

export interface VulcPriceEntry {
    scos_roata: number;
    montat_demontat: number;
    echilibrat: number;
    service_complet: number;
    pret_bucata: number;
}

// Key format: `${diametru}-${tip}`
export const VULC_PRICE_FALLBACKS: Record<string, VulcPriceEntry> = {
    'R15-AUTO':  { scos_roata: 25, montat_demontat: 25, echilibrat: 40,  service_complet: 360,  pret_bucata: 90  },
    'R15-SUV':   { scos_roata: 30, montat_demontat: 30, echilibrat: 50,  service_complet: 440,  pret_bucata: 110 },
    'R15-ATMT':  { scos_roata: 35, montat_demontat: 35, echilibrat: 55,  service_complet: 500,  pret_bucata: 125 },
    'R16-AUTO':  { scos_roata: 30, montat_demontat: 25, echilibrat: 40,  service_complet: 380,  pret_bucata: 95  },
    'R16-SUV':   { scos_roata: 30, montat_demontat: 30, echilibrat: 50,  service_complet: 440,  pret_bucata: 110 },
    'R16-ATMT':  { scos_roata: 35, montat_demontat: 35, echilibrat: 55,  service_complet: 500,  pret_bucata: 125 },
    'R17-AUTO':  { scos_roata: 30, montat_demontat: 30, echilibrat: 50,  service_complet: 440,  pret_bucata: 110 },
    'R17-SUV':   { scos_roata: 35, montat_demontat: 35, echilibrat: 55,  service_complet: 500,  pret_bucata: 125 },
    'R17-ATMT':  { scos_roata: 45, montat_demontat: 40, echilibrat: 65,  service_complet: 600,  pret_bucata: 150 },
    'R18-AUTO':  { scos_roata: 35, montat_demontat: 35, echilibrat: 55,  service_complet: 500,  pret_bucata: 125 },
    'R18-SUV':   { scos_roata: 40, montat_demontat: 35, echilibrat: 65,  service_complet: 560,  pret_bucata: 140 },
    'R19-AUTO':  { scos_roata: 40, montat_demontat: 35, echilibrat: 60,  service_complet: 540,  pret_bucata: 135 },
    'R19-SUV':   { scos_roata: 45, montat_demontat: 40, echilibrat: 65,  service_complet: 600,  pret_bucata: 150 },
    'R20-AUTO':  { scos_roata: 45, montat_demontat: 45, echilibrat: 85,  service_complet: 700,  pret_bucata: 175 },
    'R20-SUV':   { scos_roata: 50, montat_demontat: 75, echilibrat: 100, service_complet: 900,  pret_bucata: 225 },
    'R21-AUTO':  { scos_roata: 45, montat_demontat: 45, echilibrat: 85,  service_complet: 700,  pret_bucata: 175 },
    'R21-SUV':   { scos_roata: 50, montat_demontat: 75, echilibrat: 100, service_complet: 900,  pret_bucata: 225 },
    'R22-AUTO':  { scos_roata: 45, montat_demontat: 45, echilibrat: 85,  service_complet: 700,  pret_bucata: 175 },
    'R22-SUV':   { scos_roata: 65, montat_demontat: 85, echilibrat: 150, service_complet: 1200, pret_bucata: 300 },
    'R23-SUV':   { scos_roata: 75, montat_demontat: 100, echilibrat: 200, service_complet: 1500, pret_bucata: 375 },
    'R24-SUV':   { scos_roata: 75, montat_demontat: 100, echilibrat: 200, service_complet: 1500, pret_bucata: 375 },
    'R15C-TABLA':    { scos_roata: 30, montat_demontat: 30, echilibrat: 40, service_complet: 400, pret_bucata: 100 },
    'R15C-ALIAJ':    { scos_roata: 30, montat_demontat: 30, echilibrat: 50, service_complet: 440, pret_bucata: 110 },
    'R15C-MICROBUS': { scos_roata: 30, montat_demontat: 30, echilibrat: 40, service_complet: 400, pret_bucata: 100 },
    'R16C-TABLA':    { scos_roata: 30, montat_demontat: 30, echilibrat: 50, service_complet: 440, pret_bucata: 110 },
    'R16C-ALIAJ':    { scos_roata: 35, montat_demontat: 35, echilibrat: 55, service_complet: 500, pret_bucata: 125 },
    'R16C-MICROBUS': { scos_roata: 30, montat_demontat: 35, echilibrat: 55, service_complet: 480, pret_bucata: 120 },
};

export const PETIC_PRICE_FALLBACKS: Record<string, number> = {
    UP3: 15, UP4: 20, TL110: 100, TL120: 200,
};

export const EXTRA_PRICE_FALLBACKS: Record<string, number> = {
    'Azot AUTO': 150,
    'Azot SUV': 200,
    'Valva': 20,
    'Valva metal': 50,
    'Cap senzor': 100,
    'Montat senzor presiune': 25,
    'Programat senzor + scanat': 200,
    'Roluit janta tabla': 150,
    'Indreptat janta aliaj': 200,
    ...PETIC_PRICE_FALLBACKS,
};

export function getVulcPrice(
    dbPrices: any[],
    diametru: string,
    tip: string
): VulcPriceEntry | null {
    const fromDb = dbPrices.find(p => p.diametru === diametru && p.tip === tip);
    if (fromDb) return fromDb;
    return VULC_PRICE_FALLBACKS[`${diametru}-${tip}`] || null;
}

export function getExtraPrice(dbPrices: any[], serviciu: string): number {
    const fromDb = dbPrices.find(p => p.serviciu === serviciu)?.pret;
    if (fromDb) return fromDb;
    return EXTRA_PRICE_FALLBACKS[serviciu] || 0;
}
