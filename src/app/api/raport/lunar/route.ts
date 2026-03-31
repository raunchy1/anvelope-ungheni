import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

// ═══════════════════════════════════════════════════════════
// API RAPORT LUNAR - BULLETPROOF VERSION
// Promise.allSettled - niciodată crash, mereu returnează date parțiale
// ═══════════════════════════════════════════════════════════

export async function GET(req: Request) {
    const startTime = Date.now();
    console.log('═'.repeat(70));
    console.log('📊 RAPORT LUNAR API - BULLETPROOF MODE');
    console.log('═'.repeat(70));
    
    try {
        const { searchParams } = new URL(req.url);
        const an = parseInt(searchParams.get('an') || new Date().getFullYear().toString());
        const luna = parseInt(searchParams.get('luna') || (new Date().getMonth() + 1).toString());
        const mecanicFilter = searchParams.get('mecanic') || null;

        console.log('📅 Parametri:', { an, luna, mecanicFilter });

        const supabase = await createServerSupabase();

        // Calculăm intervalul de date
        const startDate = `${an}-${String(luna).padStart(2, '0')}-01`;
        const lastDay = new Date(an, luna, 0).getDate();
        const endDate = `${an}-${String(luna).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

        console.log('📆 Interval date:', { startDate, endDate });

        const zileInLuna = lastDay;
        const zileLucratoare = calculeazaZileLucratoare(an, luna);

        // ═══════════════════════════════════════════════════════════
        // FETCH TOATE SURSELE CU Promise.allSettled
        // ═══════════════════════════════════════════════════════════

        const results = await Promise.allSettled([
            // 1. VÂNZĂRI STOC
            fetchVanzariStoc(supabase, startDate, endDate, mecanicFilter),
            // 2. FIȘE SERVICE
            fetchFiseService(supabase, startDate, endDate, mecanicFilter),
            // 3. HOTEL ANVELOPE
            fetchHotelAnvelope(supabase, startDate, endDate),
            // 4. MECANICI (pentru filter)
            fetchMecanici(supabase),
            // 5. LUNA TRECUTĂ (comparativ)
            fetchLunaTrecuta(supabase, an, luna),
        ]);

        // Extragem rezultatele cu fallback-uri sigure
        const [vanzariResult, fiseResult, hotelResult, mecaniciResult, lunaTrecutaResult] = results;

        // Log fiecare secțiune
        console.log('\n📋 REZULTATE FETCH:');
        console.log('  stock_movements:', vanzariResult.status === 'fulfilled' ? `✅ ${vanzariResult.value.vanzari.length} înregistrări` : `❌ ${vanzariResult.reason?.message}`);
        console.log('  service_records:', fiseResult.status === 'fulfilled' ? `✅ ${fiseResult.value.fise.length} fișe` : `❌ ${fiseResult.reason?.message}`);
        console.log('  hotel_anvelope:', hotelResult.status === 'fulfilled' ? `✅ ${hotelResult.value.hotelRecords?.length || 0} înregistrări` : `❌ ${hotelResult.reason?.message}`);
        console.log('  mecanici:', mecaniciResult.status === 'fulfilled' ? `✅ ${mecaniciResult.value.length} mecanici` : `❌ ${mecaniciResult.reason?.message}`);
        console.log('  luna_trecuta:', lunaTrecutaResult.status === 'fulfilled' ? '✅ OK' : `❌ ${lunaTrecutaResult.reason?.message}`);

        // ═══════════════════════════════════════════════════════════
        // PROCESEAZĂ DATELE (cu fallback la array gol)
        // ═══════════════════════════════════════════════════════════

        const vanzariData = vanzariResult.status === 'fulfilled' ? vanzariResult.value : { vanzari: [], anvelopeMap: {}, serviceMap: {} };
        const fiseData = fiseResult.status === 'fulfilled' ? fiseResult.value : { fise: [], serviciiDetaliate: [], mecaniciStats: {}, diametreCount: {}, totaluri: { totalVulcanizare: 0, totalAC: 0, totalFrana: 0, totalJante: 0, totalHotel: 0 } };
        const hotelData = hotelResult.status === 'fulfilled' ? hotelResult.value : { hotelRecords: [], hotelActiv: 0, hotelRidicat: 0 };
        const mecaniciList = mecaniciResult.status === 'fulfilled' ? mecaniciResult.value : [];
        const lunaTrecutaData = lunaTrecutaResult.status === 'fulfilled' ? lunaTrecutaResult.value : { vanzari: [], fise: [] };

        // Procesează vânzări
        const vanzariProcesate = vanzariData.vanzari;
        const anvelopeMap = vanzariData.anvelopeMap;
        const serviceMap = vanzariData.serviceMap;

        // Procesează servicii
        const serviciiDetaliate = fiseData.serviciiDetaliate;
        const mecaniciStats = fiseData.mecaniciStats;
        const diametreCount = fiseData.diametreCount;
        const totaluri = fiseData.totaluri || {};

        // ═══════════════════════════════════════════════════════════
        // STATISTICI ZILNICE
        // ═══════════════════════════════════════════════════════════
        const zilnicStats: Record<string, any> = {};
        for (let i = 1; i <= zileInLuna; i++) {
            const zi = `${an}-${String(luna).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            zilnicStats[zi] = { vanzari: 0, profit: 0, servicii: 0, hotel: 0, fise: 0 };
        }

        vanzariProcesate.forEach((v: any) => {
            if (zilnicStats[v.data]) {
                zilnicStats[v.data].vanzari += v.pret_vanzare * v.cantitate;
                zilnicStats[v.data].profit += v.profit_total;
            }
        });

        serviciiDetaliate.forEach((s: any) => {
            if (zilnicStats[s.data]) {
                zilnicStats[s.data].servicii += s.total;
                zilnicStats[s.data].fise += 1;
            }
        });

        // ═══════════════════════════════════════════════════════════
        // CALCULEAZĂ KPI-URI (mereu calculează, chiar și cu 0)
        // ═══════════════════════════════════════════════════════════
        const kpi = {
            stoc_bucati: vanzariProcesate.reduce((s: number, v: any) => s + v.cantitate, 0),
            stoc_venit: vanzariProcesate.reduce((s: number, v: any) => s + (v.pret_vanzare * v.cantitate), 0),
            stoc_profit: vanzariProcesate.reduce((s: number, v: any) => s + v.profit_total, 0),
            stoc_tranzactii: vanzariProcesate.length,

            servicii_fise: fiseData.fise?.length || 0,
            servicii_vulcanizare: totaluri.totalVulcanizare || 0,
            servicii_ac: totaluri.totalAC || 0,
            servicii_frana: totaluri.totalFrana || 0,
            servicii_jante: totaluri.totalJante || 0,
            servicii_hotel: totaluri.totalHotel || 0,
            servicii_total: (totaluri.totalVulcanizare || 0) + (totaluri.totalAC || 0) + 
                           (totaluri.totalFrana || 0) + (totaluri.totalJante || 0) + (totaluri.totalHotel || 0),

            hotel_active: hotelData.hotelActiv || 0,
            hotel_ridicate: hotelData.hotelRidicat || 0,
            hotel_venit: 0,
            hotel_total: hotelData.hotelRecords?.length || 0,

            venit_total: 0,
            profit_total: 0,
        };

        kpi.venit_total = kpi.stoc_venit + kpi.servicii_total + kpi.hotel_venit;
        kpi.profit_total = kpi.stoc_profit + kpi.servicii_total + kpi.hotel_venit;

        // ═══════════════════════════════════════════════════════════
        // TOP STATISTICI
        // ═══════════════════════════════════════════════════════════
        const topBranduri = Object.entries(
            vanzariProcesate.reduce((acc: any, v: any) => {
                acc[v.brand] = (acc[v.brand] || 0) + v.cantitate;
                return acc;
            }, {})
        ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);

        const topDimensiuni = Object.entries(
            vanzariProcesate.reduce((acc: any, v: any) => {
                acc[v.dimensiune] = (acc[v.dimensiune] || 0) + v.cantitate;
                return acc;
            }, {})
        ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);

        const topFurnizori = Object.entries(
            vanzariProcesate.filter((v: any) => v.furnizor).reduce((acc: any, v: any) => {
                acc[v.furnizor] = (acc[v.furnizor] || 0) + v.cantitate;
                return acc;
            }, {})
        ).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);

        const topClienti = Object.entries(
            vanzariProcesate.filter((v: any) => v.client).reduce((acc: any, v: any) => {
                if (!acc[v.client]) acc[v.client] = { bucati: 0, cheltuit: 0 };
                acc[v.client].bucati += v.cantitate;
                acc[v.client].cheltuit += v.pret_vanzare * v.cantitate;
                return acc;
            }, {})
        ).sort((a: any, b: any) => b[1].cheltuit - a[1].cheltuit).slice(0, 5);

        const topDiametre = Object.entries(diametreCount)
            .sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);

        const topMecanici = Object.entries(mecaniciStats)
            .sort((a: any, b: any) => b[1].venit - a[1].venit)
            .slice(0, 5)
            .map(([nume, stats]: [string, any]) => ({ nume, ...stats }));

        // ═══════════════════════════════════════════════════════════
        // INSIGHTS
        // ═══════════════════════════════════════════════════════════
        const zileCuActivitate = Object.entries(zilnicStats)
            .filter(([_, stats]: [string, any]) => stats.profit > 0 || stats.servicii > 0)
            .map(([data, stats]: [string, any]) => ({ data, ...stats }));

        const ceaMaiBunaZi = zileCuActivitate.length > 0 
            ? zileCuActivitate.reduce((max, zi) => zi.profit > max.profit ? zi : max, zileCuActivitate[0])
            : null;

        const celMaiProfitabilProdus = vanzariProcesate.length > 0
            ? vanzariProcesate.reduce((max: any, v: any) => v.profit_total > max.profit_total ? v : max, vanzariProcesate[0])
            : null;

        const celMaiActivMecanic = topMecanici.length > 0 ? topMecanici[0] : null;

        const recomandariRestock = topDimensiuni
            .filter(([_, count]: [string, any]) => count >= 5)
            .map(([dimensiune, count]: [string, any]) => ({
                dimensiune,
                vandut: count,
                mesaj: `Dimensiunea ${dimensiune} s-a vândut de ${count} ori, recomandăm reaprovizionare.`
            }));

        // ═══════════════════════════════════════════════════════════
        // COMPARATIV LUNA TRECUTĂ
        // ═══════════════════════════════════════════════════════════
        const venitLunaTrecutaStoc = (lunaTrecutaData.vanzari || []).reduce((s: number, v: any) => 
            s + ((v.pret_vanzare || 0) * (v.cantitate || 0)), 0);
        const profitLunaTrecutaStoc = (lunaTrecutaData.vanzari || []).reduce((s: number, v: any) => {
            const p = v.profit_total !== null ? Number(v.profit_total) : 0;
            return s + p;
        }, 0);

        let venitLunaTrecutaServicii = 0;
        (lunaTrecutaData.fise || []).forEach((f: any) => {
            const s = (f.services as any) || {};
            venitLunaTrecutaServicii += Number(s?.servicii?.vulcanizare?.pret_total || 0);
        });

        const comparativ = {
            venit: calculeazaDiferenta(kpi.venit_total, venitLunaTrecutaStoc + venitLunaTrecutaServicii),
            profit: calculeazaDiferenta(kpi.profit_total, profitLunaTrecutaStoc + venitLunaTrecutaServicii),
            fise: calculeazaDiferenta(kpi.servicii_fise, lunaTrecutaData.fise?.length || 0),
            vanzari: calculeazaDiferenta(kpi.stoc_bucati, 
                (lunaTrecutaData.vanzari || []).reduce((s: number, v: any) => s + (v.cantitate || 0), 0)),
        };

        // ═══════════════════════════════════════════════════════════
        // SECȚIUNI CU ERORI (pentru UI)
        // ═══════════════════════════════════════════════════════════
        const sectionErrors: Record<string, string> = {};
        if (vanzariResult.status === 'rejected') sectionErrors.stock = vanzariResult.reason?.message;
        if (fiseResult.status === 'rejected') sectionErrors.servicii = fiseResult.reason?.message;
        if (hotelResult.status === 'rejected') sectionErrors.hotel = hotelResult.reason?.message;

        console.log('\n✅ Raport generat în', Date.now() - startTime, 'ms');
        console.log('📊 Rezumat:', {
            venit_total: kpi.venit_total,
            profit_total: kpi.profit_total,
            vanzari: vanzariProcesate.length,
            fise: kpi.servicii_fise,
            erori: Object.keys(sectionErrors).length
        });
        console.log('═'.repeat(70));

        // ═══════════════════════════════════════════════════════════
        // RETURNEAZĂ ÎNTOTDEAUNA SUCCESS (cu date parțiale dacă e cazul)
        // ═══════════════════════════════════════════════════════════
        return NextResponse.json({
            success: true, // ÎNTOTDEAUNA true, chiar cu date parțiale
            partial: Object.keys(sectionErrors).length > 0,
            sectionErrors: Object.keys(sectionErrors).length > 0 ? sectionErrors : undefined,
            perioada: {
                an,
                luna,
                luna_nume: new Date(an, luna - 1).toLocaleDateString('ro-MD', { month: 'long' }),
                start: startDate,
                end: endDate,
                zile_luna: zileInLuna,
                zile_lucratoare: zileLucratoare,
            },
            kpi,
            vanzari: vanzariProcesate,
            servicii: {
                lista: serviciiDetaliate,
                total_vulcanizare: totaluri.totalVulcanizare || 0,
                total_ac: totaluri.totalAC || 0,
                total_frana: totaluri.totalFrana || 0,
                total_jante: totaluri.totalJante || 0,
                total_hotel: totaluri.totalHotel || 0,
            },
            hotel: {
                active: hotelData.hotelActiv || 0,
                ridicate: hotelData.hotelRidicat || 0,
                venit: 0,
                total: hotelData.hotelRecords?.length || 0,
            },
            zilnic: Object.entries(zilnicStats).map(([data, stats]: [string, any]) => ({
                data,
                ...stats,
                total: stats.vanzari + stats.servicii + stats.hotel,
            })),
            top: {
                branduri: topBranduri,
                dimensiuni: topDimensiuni,
                furnizori: topFurnizori,
                clienti: topClienti,
                diametre: topDiametre,
                mecanici: topMecanici,
            },
            insights: {
                cea_mai_buna_zi: ceaMaiBunaZi,
                cel_mai_profitabil_produs: celMaiProfitabilProdus,
                cel_mai_activ_mecanic: celMaiActivMecanic,
                recomandari_restock: recomandariRestock,
            },
            comparativ,
            filters: {
                mecanici: mecaniciList,
                mecanic_selectat: mecanicFilter,
            },
        });

    } catch (err: any) {
        console.error('═'.repeat(70));
        console.error('❌ RAPORT LUNAR - EROARE FINALĂ:');
        console.error('Message:', err.message);
        console.error('═'.repeat(70));
        
        // CHIAR ȘI LA EROARE TOTALĂ, returnăm un raport gol valid
        return NextResponse.json({ 
            success: true, // Da, true - pagina să se încarce
            partial: true,
            error: err.message,
            perioada: {
                an: new Date().getFullYear(),
                luna: new Date().getMonth() + 1,
                luna_nume: 'Eroare',
                start: '',
                end: '',
                zile_luna: 30,
                zile_lucratoare: 22,
            },
            kpi: {
                stoc_bucati: 0, stoc_venit: 0, stoc_profit: 0, stoc_tranzactii: 0,
                servicii_fise: 0, servicii_vulcanizare: 0, servicii_ac: 0, 
                servicii_frana: 0, servicii_jante: 0, servicii_hotel: 0, servicii_total: 0,
                hotel_active: 0, hotel_ridicate: 0, hotel_venit: 0, hotel_total: 0,
                venit_total: 0, profit_total: 0,
            },
            vanzari: [],
            servicii: { lista: [], total_vulcanizare: 0, total_ac: 0, total_frana: 0, total_jante: 0, total_hotel: 0 },
            hotel: { active: 0, ridicate: 0, venit: 0, total: 0 },
            zilnic: [],
            top: { branduri: [], dimensiuni: [], furnizori: [], clienti: [], diametre: [], mecanici: [] },
            insights: { cea_mai_buna_zi: null, cel_mai_profitabil_produs: null, cel_mai_activ_mecanic: null, recomandari_restock: [] },
            comparativ: {
                venit: { curent: 0, anterior: 0, diferenta: 0, procent: 0, trend: 'up' },
                profit: { curent: 0, anterior: 0, diferenta: 0, procent: 0, trend: 'up' },
                fise: { curent: 0, anterior: 0, diferenta: 0, procent: 0, trend: 'up' },
                vanzari: { curent: 0, anterior: 0, diferenta: 0, procent: 0, trend: 'up' },
            },
            filters: { mecanici: [], mecanic_selectat: null },
        });
    }
}

// ═══════════════════════════════════════════════════════════
// FUNCȚII FETCH INDIVIDUALE (fiecare cu propriul try/catch)
// ═══════════════════════════════════════════════════════════

async function fetchVanzariStoc(supabase: any, startDate: string, endDate: string, mecanicFilter: string | null) {
    try {
        console.log('🔍 Fetch: stock_movements...');
        
        let query = supabase
            .from('stock_movements')
            .select(`
                id, anvelopa_id, reference_id, cantitate, data,
                pret_achizitie, pret_vanzare, profit_total, profit_per_bucata,
                created_at
            `)
            .eq('tip', 'iesire')
            .eq('motiv_iesire', 'vanzare')
            .gte('data', startDate)
            .lte('data', endDate);

        const { data: vanzariStoc, error } = await query;

        if (error) {
            console.error('❌ Eroare stock_movements:', error);
            throw error;
        }

        console.log('✅ stock_movements:', vanzariStoc?.length || 0, 'înregistrări');

        // Fetch anvelope details
        const anvelopeIds = [...new Set((vanzariStoc || []).map((v: any) => v.anvelopa_id).filter(Boolean))];
        let anvelopeMap: Record<number, any> = {};
        
        if (anvelopeIds.length > 0) {
            try {
                const { data: anvelope, error: anvError } = await supabase
                    .from('stocuri')
                    .select('id, brand, dimensiune, sezon, furnizor')
                    .in('id', anvelopeIds);
                
                if (!anvError && anvelope) {
                    anvelope.forEach((a: any) => anvelopeMap[a.id] = a);
                }
            } catch (e) {
                console.warn('⚠️ Nu s-au putut încărca detalii anvelope:', e);
            }
        }

        // Fetch service records pentru client/mecanic
        const referenceIds = [...new Set((vanzariStoc || []).map((v: any) => v.reference_id).filter(Boolean))];
        let serviceMap: Record<string, any> = {};
        
        if (referenceIds.length > 0) {
            try {
                const { data: services, error: svcError } = await supabase
                    .from('service_records')
                    .select('id, client_name, mecanic, car_number')
                    .in('id', referenceIds);
                
                if (!svcError && services) {
                    services.forEach((s: any) => serviceMap[s.id] = s);
                }
            } catch (e) {
                console.warn('⚠️ Nu s-au putut încărca detalii service:', e);
            }
        }

        // Procesează vânzări
        let vanzari = (vanzariStoc || []).map((v: any) => {
            const anv = anvelopeMap[v.anvelopa_id];
            const service = v.reference_id ? serviceMap[v.reference_id] : null;
            const profit = v.profit_total !== null 
                ? Number(v.profit_total)
                : ((v.pret_vanzare || 0) - (v.pret_achizitie || 0)) * (v.cantitate || 0);
            
            return {
                id: v.id,
                data: v.data,
                brand: anv?.brand || 'Necunoscut',
                dimensiune: anv?.dimensiune || '-',
                sezon: anv?.sezon || '-',
                furnizor: anv?.furnizor || null,
                cantitate: v.cantitate || 0,
                pret_achizitie: v.pret_achizitie || 0,
                pret_vanzare: v.pret_vanzare || 0,
                profit_total: profit,
                client: service?.client_name || null,
                mecanic: service?.mecanic || null,
                masina: service?.car_number || null,
            };
        });

        // Filtrare mecanic
        if (mecanicFilter) {
            vanzari = vanzari.filter((v: any) => v.mecanic === mecanicFilter);
        }

        return { vanzari, anvelopeMap, serviceMap };

    } catch (err: any) {
        console.error('❌ fetchVanzariStoc failed:', err.message);
        throw err;
    }
}

async function fetchFiseService(supabase: any, startDate: string, endDate: string, mecanicFilter: string | null) {
    try {
        console.log('🔍 Fetch: service_records...');
        
        let query = supabase
            .from('service_records')
            .select(`
                id, service_number, client_name, car_number, car_details,
                services, mecanic, data_intrarii, created_at
            `)
            .gte('data_intrarii', startDate)
            .lte('data_intrarii', endDate);

        if (mecanicFilter) {
            query = query.eq('mecanic', mecanicFilter);
        }

        const { data: fiseService, error } = await query;

        if (error) {
            console.error('❌ Eroare service_records:', error);
            throw error;
        }

        console.log('✅ service_records:', fiseService?.length || 0, 'fișe');

        // Procesează servicii
        let totalVulcanizare = 0, totalAC = 0, totalFrana = 0, totalJante = 0, totalHotel = 0;
        const serviciiDetaliate: any[] = [];
        const diametreCount: Record<string, number> = {};
        const mecaniciStats: Record<string, { fise: number; venit: number }> = {};

        (fiseService || []).forEach((fisa: any) => {
            try {
                const s = (fisa.services as any) || {};
                const vulc = s?.servicii?.vulcanizare || {};
                const jante = s?.servicii?.vopsit_jante || {};
                const ac = s?.servicii?.aer_conditionat || {};
                const frana = s?.servicii?.frana || {};
                const hotel = s?.hotel_anvelope || {};

                const pretVulcanizare = Number(vulc?.pret_total || vulc?.pret_vulcanizare || 0);
                const pretAC = Number(ac?.pret_total || ac?.pret_ac || 0) || (ac?.serviciu_ac ? 800 : 0);
                const pretFrana = Number(frana?.pret_total || frana?.pret_frane || 0) || 
                    ((frana?.schimbat_placute || frana?.schimb_discuri) ? 400 : 0);
                const pretJante = Number(jante?.pret_total || jante?.pret_jante || 0) || 
                    (jante?.vopsit_janta_culoare ? 200 : 0);
                const pretHotel = Number(hotel?.pret_total || vulc?.pret_hotel || 0);

                totalVulcanizare += pretVulcanizare;
                totalAC += pretAC;
                totalFrana += pretFrana;
                totalJante += pretJante;
                totalHotel += pretHotel;

                const diametru = vulc?.diametru || 'Necunoscut';
                diametreCount[diametru] = (diametreCount[diametru] || 0) + 1;

                if (fisa.mecanic) {
                    if (!mecaniciStats[fisa.mecanic]) {
                        mecaniciStats[fisa.mecanic] = { fise: 0, venit: 0 };
                    }
                    mecaniciStats[fisa.mecanic].fise += 1;
                    mecaniciStats[fisa.mecanic].venit += pretVulcanizare + pretAC + pretFrana + pretJante;
                }

                serviciiDetaliate.push({
                    id: fisa.id,
                    numar_fisa: fisa.service_number,
                    data: fisa.data_intrarii,
                    client: fisa.client_name,
                    masina: fisa.car_number,
                    mecanic: fisa.mecanic,
                    vulcanizare: pretVulcanizare,
                    ac: pretAC,
                    frana: pretFrana,
                    jante: pretJante,
                    hotel: pretHotel,
                    total: pretVulcanizare + pretAC + pretFrana + pretJante + pretHotel,
                });
            } catch (e) {
                console.warn('⚠️ Eroare procesare fișă:', fisa.id, e);
            }
        });

        return { 
            fise: fiseService || [], 
            serviciiDetaliate, 
            mecaniciStats, 
            diametreCount,
            totaluri: { totalVulcanizare, totalAC, totalFrana, totalJante, totalHotel }
        };

    } catch (err: any) {
        console.error('❌ fetchFiseService failed:', err.message);
        throw err;
    }
}

async function fetchHotelAnvelope(supabase: any, startDate: string, endDate: string) {
    try {
        console.log('🔍 Fetch: hotel_anvelope...');
        
        const { data: hotelRecords, error } = await supabase
            .from('hotel_anvelope')
            .select('id, client_id, status, dimensiune_anvelope, data_depozitare, data_ridicare, created_at')
            .gte('data_depozitare', startDate)
            .lte('data_depozitare', endDate);

        if (error) {
            console.error('❌ Eroare hotel_anvelope:', error);
            throw error;
        }

        console.log('✅ hotel_anvelope:', hotelRecords?.length || 0, 'înregistrări');

        const hotelActiv = (hotelRecords || []).filter((h: any) => h.status === 'Depozitate' || !h.status).length;
        const hotelRidicat = (hotelRecords || []).filter((h: any) => h.status === 'Ridicate').length;

        return { hotelRecords: hotelRecords || [], hotelActiv, hotelRidicat };

    } catch (err: any) {
        console.error('❌ fetchHotelAnvelope failed:', err.message);
        throw err;
    }
}

async function fetchMecanici(supabase: any) {
    try {
        console.log('🔍 Fetch: mecanici...');
        
        const { data: totiMecanici, error } = await supabase
            .from('service_records')
            .select('mecanic')
            .not('mecanic', 'is', null)
            .order('mecanic');

        if (error) {
            console.error('❌ Eroare mecanici:', error);
            throw error;
        }

        const mecaniciUnici = [...new Set((totiMecanici || []).map((m: any) => m.mecanic).filter(Boolean))];
        console.log('✅ mecanici:', mecaniciUnici.length, 'unici');
        
        return mecaniciUnici;

    } catch (err: any) {
        console.error('❌ fetchMecanici failed:', err.message);
        throw err;
    }
}

async function fetchLunaTrecuta(supabase: any, an: number, luna: number) {
    try {
        console.log('🔍 Fetch: luna trecută...');
        
        const lunaTrecuta = luna === 1 ? 12 : luna - 1;
        const anLunaTrecuta = luna === 1 ? an - 1 : an;
        const startLunaTrecuta = `${anLunaTrecuta}-${String(lunaTrecuta).padStart(2, '0')}-01`;
        const endLunaTrecuta = `${anLunaTrecuta}-${String(lunaTrecuta).padStart(2, '0')}-${new Date(anLunaTrecuta, lunaTrecuta, 0).getDate()}`;

        const [vanzariRes, fiseRes] = await Promise.allSettled([
            supabase
                .from('stock_movements')
                .select('cantitate, pret_vanzare, profit_total')
                .eq('tip', 'iesire')
                .eq('motiv_iesire', 'vanzare')
                .gte('data', startLunaTrecuta)
                .lte('data', endLunaTrecuta),
            supabase
                .from('service_records')
                .select('services')
                .gte('data_intrarii', startLunaTrecuta)
                .lte('data_intrarii', endLunaTrecuta),
        ]);

        const vanzari = vanzariRes.status === 'fulfilled' ? vanzariRes.value.data : [];
        const fise = fiseRes.status === 'fulfilled' ? fiseRes.value.data : [];

        console.log('✅ luna trecută:', { vanzari: vanzari?.length || 0, fise: fise?.length || 0 });
        
        return { vanzari: vanzari || [], fise: fise || [] };

    } catch (err: any) {
        console.error('❌ fetchLunaTrecuta failed:', err.message);
        throw err;
    }
}

// ═══════════════════════════════════════════════════════════
// FUNCȚII AJUTĂTOARE
// ═══════════════════════════════════════════════════════════

function calculeazaZileLucratoare(an: number, luna: number): number {
    let count = 0;
    const zileInLuna = new Date(an, luna, 0).getDate();
    for (let i = 1; i <= zileInLuna; i++) {
        const zi = new Date(an, luna - 1, i).getDay();
        if (zi !== 0 && zi !== 6) count++;
    }
    return count;
}

function calculeazaDiferenta(curent: number, anterior: number) {
    const diferenta = curent - anterior;
    const procent = anterior > 0 ? ((diferenta / anterior) * 100).toFixed(1) : (curent > 0 ? '100' : '0');
    return {
        curent,
        anterior,
        diferenta,
        procent: Number(procent),
        trend: diferenta >= 0 ? 'up' : 'down',
    };
}
