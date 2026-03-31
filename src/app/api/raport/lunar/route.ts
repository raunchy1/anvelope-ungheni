import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

// ═══════════════════════════════════════════════════════════
// API RAPORT LUNAR PREMIUM - Debug & Error Resilient
// ═══════════════════════════════════════════════════════════

export async function GET(req: Request) {
    console.log('═'.repeat(60));
    console.log('RAPORT LUNAR API - START');
    console.log('═'.repeat(60));
    
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
        // 1. VÂNZĂRI ANVELOPE DIN STOC (stock_movements)
        // ═══════════════════════════════════════════════════════════
        console.log('🔍 Query: stock_movements...');
        
        let vanzariQuery = supabase
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

        const { data: vanzariStoc, error: vanzariError } = await vanzariQuery;

        if (vanzariError) {
            console.error('❌ Eroare stock_movements:', vanzariError);
            throw new Error(`stock_movements: ${vanzariError.message}`);
        }
        console.log('✅ stock_movements:', { count: vanzariStoc?.length || 0 });

        // Fetch anvelope details
        const anvelopeIds = [...new Set((vanzariStoc || []).map(v => v.anvelopa_id).filter(Boolean))];
        let anvelopeMap: Record<number, any> = {};
        if (anvelopeIds.length > 0) {
            console.log('🔍 Query: stocuri (anvelope)...');
            const { data: anvelope, error: anvError } = await supabase
                .from('stocuri')
                .select('id, brand, dimensiune, sezon, furnizor')
                .in('id', anvelopeIds);
            
            if (anvError) {
                console.error('❌ Eroare stocuri:', anvError);
            } else {
                anvelope?.forEach(a => anvelopeMap[a.id] = a);
                console.log('✅ stocuri:', { count: anvelope?.length || 0 });
            }
        }

        // Fetch service records pentru client/mecanic
        const referenceIds = [...new Set((vanzariStoc || []).map(v => v.reference_id).filter(Boolean))];
        let serviceMap: Record<string, any> = {};
        if (referenceIds.length > 0) {
            console.log('🔍 Query: service_records (references)...');
            const { data: services, error: svcError } = await supabase
                .from('service_records')
                .select('id, client_name, mecanic, car_number')
                .in('id', referenceIds);
            
            if (svcError) {
                console.error('❌ Eroare service_records:', svcError);
            } else {
                services?.forEach(s => serviceMap[s.id] = s);
                console.log('✅ service_records:', { count: services?.length || 0 });
            }
        }

        // Procesează vânzări
        const vanzariProcesate = (vanzariStoc || []).map(v => {
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
                cantitate: v.cantitate,
                pret_achizitie: v.pret_achizitie || 0,
                pret_vanzare: v.pret_vanzare || 0,
                profit_total: profit,
                client: service?.client_name || null,
                mecanic: service?.mecanic || null,
                masina: service?.car_number || null,
            };
        });

        const vanzariFiltrate = mecanicFilter 
            ? vanzariProcesate.filter(v => v.mecanic === mecanicFilter)
            : vanzariProcesate;

        // ═══════════════════════════════════════════════════════════
        // 2. FIȘE SERVICII (service_records)
        // ═══════════════════════════════════════════════════════════
        console.log('🔍 Query: service_records (fise)...');
        
        let fiseQuery = supabase
            .from('service_records')
            .select(`
                id, service_number, client_name, car_number, car_details,
                services, mecanic, data_intrarii, created_at
            `)
            .gte('data_intrarii', startDate)
            .lte('data_intrarii', endDate);

        if (mecanicFilter) {
            fiseQuery = fiseQuery.eq('mecanic', mecanicFilter);
        }

        const { data: fiseService, error: fiseError } = await fiseQuery;

        if (fiseError) {
            console.error('❌ Eroare service_records (fise):', fiseError);
            throw new Error(`service_records: ${fiseError.message}`);
        }
        console.log('✅ service_records (fise):', { count: fiseService?.length || 0 });

        // Procesează servicii
        let totalVulcanizare = 0;
        let totalAC = 0;
        let totalFrana = 0;
        let totalJante = 0;
        let totalHotelServicii = 0;

        const serviciiDetaliate: any[] = [];
        const diametreCount: Record<string, number> = {};
        const vehiculeCount: Record<string, number> = {};
        const mecaniciStats: Record<string, { fise: number; venit: number }> = {};

        (fiseService || []).forEach(fisa => {
            const s = (fisa.services as any) || {};
            const vulc = s?.servicii?.vulcanizare || {};
            const jante = s?.servicii?.vopsit_jante || {};
            const ac = s?.servicii?.aer_conditionat || {};
            const frana = s?.servicii?.frana || {};
            const hotel = s?.hotel_anvelope || {};

            // Calculează venituri
            const pretVulcanizare = Number(vulc?.pret_total || 0);
            const pretAC = Number(ac?.pret_total || 0) || 
                (ac?.serviciu_ac ? 800 : 0);
            const pretFrana = Number(frana?.pret_total || 0) ||
                ((frana?.schimbat_placute || frana?.schimb_discuri) ? 400 : 0);
            const pretJante = Number(jante?.pret_total || 0) ||
                (jante?.vopsit_janta_culoare ? 200 : 0);
            const pretHotel = Number(hotel?.pret_total || 0) || 
                Number(vulc?.pret_hotel || 0);

            totalVulcanizare += pretVulcanizare;
            totalAC += pretAC;
            totalFrana += pretFrana;
            totalJante += pretJante;
            totalHotelServicii += pretHotel;

            const diametru = vulc?.diametru || 'Necunoscut';
            diametreCount[diametru] = (diametreCount[diametru] || 0) + 1;

            const tipVehicul = vulc?.tip_vehicul || 'AUTO';
            vehiculeCount[tipVehicul] = (vehiculeCount[tipVehicul] || 0) + 1;

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
        });

        // ═══════════════════════════════════════════════════════════
        // 3. HOTEL ANVELOPE (FĂRĂ pret_total - conform schemei reale)
        // ═══════════════════════════════════════════════════════════
        console.log('🔍 Query: hotel_anvelope...');
        
        // Schema reală NU are pret_total în hotel_anvelope
        // Folosim doar câmpurile care există: id, client_id, status, data_depozitare, etc.
        const { data: hotelRecords, error: hotelError } = await supabase
            .from('hotel_anvelope')
            .select('id, client_id, status, dimensiune_anvelope, data_depozitare, data_ridicare, created_at')
            .gte('data_depozitare', startDate)
            .lte('data_depozitare', endDate);

        if (hotelError) {
            console.error('❌ Eroare hotel_anvelope:', hotelError);
            // NU aruncăm eroare - continuăm cu hotel gol
            console.log('⚠️ Continuăm fără date hotel...');
        }
        console.log('✅ hotel_anvelope:', { count: hotelRecords?.length || 0 });

        const hotelActiv = (hotelRecords || []).filter(h => h.status === 'Depozitate' || !h.status).length;
        const hotelRidicat = (hotelRecords || []).filter(h => h.status === 'Ridicate').length;
        // NU calculăm venitHotel căci nu avem pret_total în schema reală
        const venitHotel = 0;

        // ═══════════════════════════════════════════════════════════
        // 4. STATISTICI ZILNICE
        // ═══════════════════════════════════════════════════════════
        const zilnicStats: Record<string, { 
            vanzari: number; 
            profit: number; 
            servicii: number; 
            hotel: number;
            fise: number;
        }> = {};

        for (let i = 1; i <= zileInLuna; i++) {
            const zi = `${an}-${String(luna).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            zilnicStats[zi] = { vanzari: 0, profit: 0, servicii: 0, hotel: 0, fise: 0 };
        }

        vanzariFiltrate.forEach(v => {
            if (zilnicStats[v.data]) {
                zilnicStats[v.data].vanzari += v.pret_vanzare * v.cantitate;
                zilnicStats[v.data].profit += v.profit_total;
            }
        });

        serviciiDetaliate.forEach(s => {
            if (zilnicStats[s.data]) {
                zilnicStats[s.data].servicii += s.total;
                zilnicStats[s.data].fise += 1;
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 5. CALCULEAZĂ KPI-URI
        // ═══════════════════════════════════════════════════════════
        const kpi = {
            stoc_bucati: vanzariFiltrate.reduce((s, v) => s + v.cantitate, 0),
            stoc_venit: vanzariFiltrate.reduce((s, v) => s + (v.pret_vanzare * v.cantitate), 0),
            stoc_profit: vanzariFiltrate.reduce((s, v) => s + v.profit_total, 0),
            stoc_tranzactii: vanzariFiltrate.length,

            servicii_fise: fiseService?.length || 0,
            servicii_vulcanizare: totalVulcanizare,
            servicii_ac: totalAC,
            servicii_frana: totalFrana,
            servicii_jante: totalJante,
            servicii_hotel: totalHotelServicii,
            servicii_total: totalVulcanizare + totalAC + totalFrana + totalJante + totalHotelServicii,

            hotel_active: hotelActiv,
            hotel_ridicate: hotelRidicat,
            hotel_venit: venitHotel,
            hotel_total: (hotelRecords || []).length,

            venit_total: 0,
            profit_total: 0,
        };

        kpi.venit_total = kpi.stoc_venit + kpi.servicii_total + kpi.hotel_venit;
        kpi.profit_total = kpi.stoc_profit + kpi.servicii_total + kpi.hotel_venit;

        // ═══════════════════════════════════════════════════════════
        // 6. TOP STATISTICI
        // ═══════════════════════════════════════════════════════════
        const topBranduri = Object.entries(
            vanzariFiltrate.reduce((acc, v) => {
                acc[v.brand] = (acc[v.brand] || 0) + v.cantitate;
                return acc;
            }, {} as Record<string, number>)
        ).sort((a, b) => b[1] - a[1]).slice(0, 5);

        const topDimensiuni = Object.entries(
            vanzariFiltrate.reduce((acc, v) => {
                acc[v.dimensiune] = (acc[v.dimensiune] || 0) + v.cantitate;
                return acc;
            }, {} as Record<string, number>)
        ).sort((a, b) => b[1] - a[1]).slice(0, 5);

        const topFurnizori = Object.entries(
            vanzariFiltrate.filter(v => v.furnizor).reduce((acc, v) => {
                acc[v.furnizor!] = (acc[v.furnizor!] || 0) + v.cantitate;
                return acc;
            }, {} as Record<string, number>)
        ).sort((a, b) => b[1] - a[1]).slice(0, 5);

        const topClienti = Object.entries(
            vanzariFiltrate.filter(v => v.client).reduce((acc, v) => {
                if (!acc[v.client!]) acc[v.client!] = { bucati: 0, cheltuit: 0 };
                acc[v.client!].bucati += v.cantitate;
                acc[v.client!].cheltuit += v.pret_vanzare * v.cantitate;
                return acc;
            }, {} as Record<string, { bucati: number; cheltuit: number }>)
        ).sort((a, b) => b[1].cheltuit - a[1].cheltuit).slice(0, 5);

        const topDiametre = Object.entries(diametreCount)
            .sort((a, b) => b[1] - a[1]).slice(0, 5);

        const topMecanici = Object.entries(mecaniciStats)
            .sort((a, b) => b[1].venit - a[1].venit)
            .slice(0, 5)
            .map(([nume, stats]) => ({ nume, ...stats }));

        // ═══════════════════════════════════════════════════════════
        // 7. ANALIZĂ SMART - INSIGHTS
        // ═══════════════════════════════════════════════════════════
        const zileCuActivitate = Object.entries(zilnicStats)
            .filter(([_, stats]) => stats.profit > 0 || stats.servicii > 0)
            .map(([data, stats]) => ({ data, ...stats }));

        const ceaMaiBunaZi = zileCuActivitate.length > 0 
            ? zileCuActivitate.reduce((max, zi) => zi.profit > max.profit ? zi : max, zileCuActivitate[0])
            : null;

        const celMaiProfitabilProdus = vanzariFiltrate.length > 0
            ? vanzariFiltrate.reduce((max, v) => v.profit_total > max.profit_total ? v : max, vanzariFiltrate[0])
            : null;

        const celMaiActivMecanic = topMecanici.length > 0 ? topMecanici[0] : null;

        const recomandariRestock = topDimensiuni
            .filter(([_, count]) => count >= 5)
            .map(([dimensiune, count]) => ({
                dimensiune,
                vandut: count,
                mesaj: `Dimensiunea ${dimensiune} s-a vândut de ${count} ori, recomandăm reaprovizionare.`
            }));

        // ═══════════════════════════════════════════════════════════
        // 8. COMPARATIV CU LUNA TRECUTĂ
        // ═══════════════════════════════════════════════════════════
        const lunaTrecuta = luna === 1 ? 12 : luna - 1;
        const anLunaTrecuta = luna === 1 ? an - 1 : an;
        const startLunaTrecuta = `${anLunaTrecuta}-${String(lunaTrecuta).padStart(2, '0')}-01`;
        const endLunaTrecuta = `${anLunaTrecuta}-${String(lunaTrecuta).padStart(2, '0')}-${new Date(anLunaTrecuta, lunaTrecuta, 0).getDate()}`;

        const { data: vanzariLunaTrecuta } = await supabase
            .from('stock_movements')
            .select('cantitate, pret_vanzare, profit_total')
            .eq('tip', 'iesire')
            .eq('motiv_iesire', 'vanzare')
            .gte('data', startLunaTrecuta)
            .lte('data', endLunaTrecuta);

        const { data: fiseLunaTrecuta } = await supabase
            .from('service_records')
            .select('services')
            .gte('data_intrarii', startLunaTrecuta)
            .lte('data_intrarii', endLunaTrecuta);

        const venitLunaTrecutaStoc = (vanzariLunaTrecuta || []).reduce((s, v) => 
            s + ((v.pret_vanzare || 0) * (v.cantitate || 0)), 0);
        const profitLunaTrecutaStoc = (vanzariLunaTrecuta || []).reduce((s, v) => {
            const p = v.profit_total !== null ? Number(v.profit_total) : 0;
            return s + p;
        }, 0);

        let venitLunaTrecutaServicii = 0;
        (fiseLunaTrecuta || []).forEach(f => {
            const s = (f.services as any) || {};
            venitLunaTrecutaServicii += Number(s?.servicii?.vulcanizare?.pret_total || 0);
        });

        const comparativ = {
            venit: calculeazaDiferenta(kpi.venit_total, venitLunaTrecutaStoc + venitLunaTrecutaServicii),
            profit: calculeazaDiferenta(kpi.profit_total, profitLunaTrecutaStoc + venitLunaTrecutaServicii),
            fise: calculeazaDiferenta(kpi.servicii_fise, fiseLunaTrecuta?.length || 0),
            vanzari: calculeazaDiferenta(kpi.stoc_bucati, 
                (vanzariLunaTrecuta || []).reduce((s, v) => s + (v.cantitate || 0), 0)),
        };

        // ═══════════════════════════════════════════════════════════
        // 9. LISTA MECANICI PENTRU FILTER
        // ═══════════════════════════════════════════════════════════
        const { data: totiMecanici } = await supabase
            .from('service_records')
            .select('mecanic')
            .not('mecanic', 'is', null)
            .order('mecanic');

        const mecaniciUnici = [...new Set((totiMecanici || []).map(m => m.mecanic).filter(Boolean))];

        console.log('✅ Raport generat cu succes!');
        console.log('📊 Rezumat:', {
            vanzari: vanzariFiltrate.length,
            fise: fiseService?.length || 0,
            hotel: hotelRecords?.length || 0,
            venit_total: kpi.venit_total,
            profit_total: kpi.profit_total
        });
        console.log('═'.repeat(60));

        return NextResponse.json({
            success: true,
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
            vanzari: vanzariFiltrate,
            servicii: {
                lista: serviciiDetaliate,
                total_vulcanizare: totalVulcanizare,
                total_ac: totalAC,
                total_frana: totalFrana,
                total_jante: totalJante,
                total_hotel: totalHotelServicii,
            },
            hotel: {
                active: hotelActiv,
                ridicate: hotelRidicat,
                venit: venitHotel,
                total: (hotelRecords || []).length,
            },
            zilnic: Object.entries(zilnicStats).map(([data, stats]) => ({
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
                mecanici: mecaniciUnici,
                mecanic_selectat: mecanicFilter,
            },
        });

    } catch (err: any) {
        console.error('═'.repeat(60));
        console.error('❌ RAPORT LUNAR - EROARE CRITICĂ:');
        console.error('Message:', err.message);
        console.error('Stack:', err.stack);
        console.error('═'.repeat(60));
        
        return NextResponse.json({ 
            success: false, 
            error: err.message,
            details: err.stack,
            hint: 'Verificați conexiunea la Supabase și existența tabelelor'
        }, { status: 500 });
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
