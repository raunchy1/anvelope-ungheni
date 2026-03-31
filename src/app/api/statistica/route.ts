import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

// ═══════════════════════════════════════════════════════════
// API STATISTICI AVANSATE - Vânzări Anvelope din Stoc
// ═══════════════════════════════════════════════════════════

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const perioada = searchParams.get('perioada') || 'azi'; // azi, saptamana, luna, an, custom
        const dataStart = searchParams.get('data_start');
        const dataEnd = searchParams.get('data_end');
        const luna = searchParams.get('luna'); // Format: 2026-03
        const includeServiceRecords = searchParams.get('include_service') !== 'false';

        const supabase = await createServerSupabase();

        // ═══════════════════════════════════════════════════════════
        // 1. CALCULEAZĂ INTERVALUL DE DATE
        // ═══════════════════════════════════════════════════════════
        let startDate: string;
        let endDate: string;
        const azi = new Date();
        const aziStr = azi.toISOString().split('T')[0];

        switch (perioada) {
            case 'azi':
                startDate = aziStr;
                endDate = aziStr;
                break;
            case 'ieri':
                const ieri = new Date(azi);
                ieri.setDate(ieri.getDate() - 1);
                startDate = ieri.toISOString().split('T')[0];
                endDate = startDate;
                break;
            case 'saptamana':
                const startSapt = new Date(azi);
                startSapt.setDate(startSapt.getDate() - startSapt.getDay() + 1); // Luni
                startDate = startSapt.toISOString().split('T')[0];
                endDate = aziStr;
                break;
            case 'luna':
                if (luna) {
                    // Luna specificată (format: 2026-03)
                    const [year, month] = luna.split('-');
                    startDate = `${year}-${month}-01`;
                    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
                    endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
                } else {
                    // Luna curentă
                    startDate = `${azi.getFullYear()}-${String(azi.getMonth() + 1).padStart(2, '0')}-01`;
                    endDate = aziStr;
                }
                break;
            case 'an':
                startDate = `${azi.getFullYear()}-01-01`;
                endDate = aziStr;
                break;
            case 'custom':
                startDate = dataStart || aziStr;
                endDate = dataEnd || aziStr;
                break;
            default:
                startDate = aziStr;
                endDate = aziStr;
        }

        // ═══════════════════════════════════════════════════════════
        // 2. FETCH VÂNZĂRI DIN STOC (stock_movements)
        // ═══════════════════════════════════════════════════════════
        const { data: miscari, error: miscariError } = await supabase
            .from('stock_movements')
            .select(`
                id,
                anvelopa_id,
                tip,
                cantitate,
                data,
                motiv_iesire,
                pret_achizitie,
                pret_vanzare,
                profit_per_bucata,
                profit_total,
                created_at,
                created_by
            `)
            .eq('tip', 'iesire')
            .eq('motiv_iesire', 'vanzare')
            .gte('data', startDate)
            .lte('data', endDate)
            .order('data', { ascending: false })
            .order('created_at', { ascending: false });

        if (miscariError) {
            console.error('Error fetching stock movements:', miscariError);
            return NextResponse.json({ success: false, error: miscariError.message }, { status: 500 });
        }

        // ═══════════════════════════════════════════════════════════
        // 3. FETCH DATE ANVELOPE PENTRU REFERINȚĂ
        // ═══════════════════════════════════════════════════════════
        const anvelopeIds = [...new Set((miscari || []).map(m => m.anvelopa_id).filter(Boolean))];
        let anvelopeMap: Record<number, any> = {};
        
        if (anvelopeIds.length > 0) {
            const { data: anvelope } = await supabase
                .from('stocuri')
                .select('id, brand, dimensiune, sezon, dot, furnizor')
                .in('id', anvelopeIds);
            
            for (const a of anvelope || []) {
                anvelopeMap[a.id] = a;
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 4. CONSTRUIEȘTE TRANZACȚIILE
        // ═══════════════════════════════════════════════════════════
        const tranzactii = (miscari || []).map(m => {
            const anvelopa = anvelopeMap[m.anvelopa_id];
            
            // Calculează profitul pe tranzacție
            const profitCalc = m.profit_total !== null 
                ? Number(m.profit_total)
                : ((m.pret_vanzare || 0) - (m.pret_achizitie || 0)) * (m.cantitate || 0);
            
            const profitPerBucata = m.profit_per_bucata !== null
                ? Number(m.profit_per_bucata)
                : (m.pret_vanzare || 0) - (m.pret_achizitie || 0);

            return {
                id: m.id,
                data: m.data,
                created_at: m.created_at,
                anvelopa_id: m.anvelopa_id,
                brand: anvelopa?.brand || 'Necunoscut',
                dimensiune: anvelopa?.dimensiune || '-',
                sezon: anvelopa?.sezon || '-',
                dot: anvelopa?.dot || '-',
                cantitate: m.cantitate,
                pret_achizitie: m.pret_achizitie || 0,
                pret_vanzare: m.pret_vanzare || 0,
                profit_per_bucata: profitPerBucata,
                profit_total: profitCalc,
                motiv_iesire: m.motiv_iesire,
                mecanic: null,
                client: null,
                telefon_client: null,
                numar_masina: null,
                furnizor: anvelopa?.furnizor || null,
            };
        });

        // ═══════════════════════════════════════════════════════════
        // 6. CALCULEAZĂ KPI-URI
        // ═══════════════════════════════════════════════════════════
        const kpi = {
            total_bucati_vandute: tranzactii.reduce((s, t) => s + t.cantitate, 0),
            total_vanzari_mdl: tranzactii.reduce((s, t) => s + (t.pret_vanzare * t.cantitate), 0),
            total_profit_mdl: tranzactii.reduce((s, t) => s + t.profit_total, 0),
            numar_tranzactii: tranzactii.length,
            profit_mediu_per_tranzactie: tranzactii.length > 0 
                ? tranzactii.reduce((s, t) => s + t.profit_total, 0) / tranzactii.length 
                : 0,
            valoare_medie_per_tranzactie: tranzactii.length > 0
                ? tranzactii.reduce((s, t) => s + (t.pret_vanzare * t.cantitate), 0) / tranzactii.length
                : 0,
        };

        // ═══════════════════════════════════════════════════════════
        // 7. STATISTICI PE BRAND
        // ═══════════════════════════════════════════════════════════
        const brandStats = Object.entries(
            tranzactii.reduce((acc, t) => {
                if (!acc[t.brand]) {
                    acc[t.brand] = { 
                        brand: t.brand, 
                        cantitate: 0, 
                        vanzari: 0, 
                        profit: 0,
                        tranzactii: 0 
                    };
                }
                acc[t.brand].cantitate += t.cantitate;
                acc[t.brand].vanzari += t.pret_vanzare * t.cantitate;
                acc[t.brand].profit += t.profit_total;
                acc[t.brand].tranzactii += 1;
                return acc;
            }, {} as Record<string, any>)
        )
        .map(([_, data]) => data)
        .sort((a, b) => b.profit - a.profit);

        // ═══════════════════════════════════════════════════════════
        // 8. STATISTICI PE DIMENSIUNE
        // ═══════════════════════════════════════════════════════════
        const dimensiuneStats = Object.entries(
            tranzactii.reduce((acc, t) => {
                if (!acc[t.dimensiune]) {
                    acc[t.dimensiune] = { 
                        dimensiune: t.dimensiune, 
                        cantitate: 0, 
                        vanzari: 0, 
                        profit: 0 
                    };
                }
                acc[t.dimensiune].cantitate += t.cantitate;
                acc[t.dimensiune].vanzari += t.pret_vanzare * t.cantitate;
                acc[t.dimensiune].profit += t.profit_total;
                return acc;
            }, {} as Record<string, any>)
        )
        .map(([_, data]) => data)
        .sort((a, b) => b.cantitate - a.cantitate)
        .slice(0, 10);

        // ═══════════════════════════════════════════════════════════
        // 9. STATISTICI PE ZILE (pentru grafice)
        // ═══════════════════════════════════════════════════════════
        const zilnicStats = Object.entries(
            tranzactii.reduce((acc, t) => {
                if (!acc[t.data]) {
                    acc[t.data] = { 
                        data: t.data, 
                        cantitate: 0, 
                        vanzari: 0, 
                        profit: 0,
                        tranzactii: 0
                    };
                }
                acc[t.data].cantitate += t.cantitate;
                acc[t.data].vanzari += t.pret_vanzare * t.cantitate;
                acc[t.data].profit += t.profit_total;
                acc[t.data].tranzactii += 1;
                return acc;
            }, {} as Record<string, any>)
        )
        .map(([_, data]) => data)
        .sort((a, b) => a.data.localeCompare(b.data));

        // ═══════════════════════════════════════════════════════════
        // 10. STATISTICI PE MECANIC
        // ═══════════════════════════════════════════════════════════
        const mecanicStats = Object.entries(
            tranzactii
                .filter(t => t.mecanic)
                .reduce((acc, t) => {
                    const nume = t.mecanic || 'Necunoscut';
                    if (!acc[nume]) {
                        acc[nume] = { 
                            mecanic: nume, 
                            cantitate: 0, 
                            vanzari: 0, 
                            profit: 0,
                            tranzactii: 0
                        };
                    }
                    acc[nume].cantitate += t.cantitate;
                    acc[nume].vanzari += t.pret_vanzare * t.cantitate;
                    acc[nume].profit += t.profit_total;
                    acc[nume].tranzactii += 1;
                    return acc;
                }, {} as Record<string, any>)
        )
        .map(([_, data]) => data)
        .sort((a, b) => b.profit - a.profit);

        // ═══════════════════════════════════════════════════════════
        // 11. COMPARATIV CU PERIOADA ANTERIOARĂ
        // ═══════════════════════════════════════════════════════════
        const perioadaZile = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        const startDatePrev = new Date(startDate);
        startDatePrev.setDate(startDatePrev.getDate() - perioadaZile);
        const endDatePrev = new Date(startDate);
        endDatePrev.setDate(endDatePrev.getDate() - 1);
        
        const { data: miscariPrev } = await supabase
            .from('stock_movements')
            .select('cantitate, pret_vanzare, pret_achizitie, profit_total')
            .eq('tip', 'iesire')
            .eq('motiv_iesire', 'vanzare')
            .gte('data', startDatePrev.toISOString().split('T')[0])
            .lte('data', endDatePrev.toISOString().split('T')[0]);

        const prevStats = {
            total_bucati: (miscariPrev || []).reduce((s, m) => s + (m.cantitate || 0), 0),
            total_vanzari: (miscariPrev || []).reduce((s, m) => s + ((m.pret_vanzare || 0) * (m.cantitate || 0)), 0),
            total_profit: (miscariPrev || []).reduce((s, m) => {
                const profit = m.profit_total !== null ? Number(m.profit_total) : 
                    ((m.pret_vanzare || 0) - (m.pret_achizitie || 0)) * (m.cantitate || 0);
                return s + profit;
            }, 0),
            numar_tranzactii: (miscariPrev || []).length,
        };

        const comparativ = {
            bucati: {
                curent: kpi.total_bucati_vandute,
                anterior: prevStats.total_bucati,
                diferenta: kpi.total_bucati_vandute - prevStats.total_bucati,
                procent: prevStats.total_bucati > 0 
                    ? ((kpi.total_bucati_vandute - prevStats.total_bucati) / prevStats.total_bucati * 100).toFixed(1)
                    : kpi.total_bucati_vandute > 0 ? '100' : '0'
            },
            vanzari: {
                curent: kpi.total_vanzari_mdl,
                anterior: prevStats.total_vanzari,
                diferenta: kpi.total_vanzari_mdl - prevStats.total_vanzari,
                procent: prevStats.total_vanzari > 0
                    ? ((kpi.total_vanzari_mdl - prevStats.total_vanzari) / prevStats.total_vanzari * 100).toFixed(1)
                    : kpi.total_vanzari_mdl > 0 ? '100' : '0'
            },
            profit: {
                curent: kpi.total_profit_mdl,
                anterior: prevStats.total_profit,
                diferenta: kpi.total_profit_mdl - prevStats.total_profit,
                procent: prevStats.total_profit > 0
                    ? ((kpi.total_profit_mdl - prevStats.total_profit) / prevStats.total_profit * 100).toFixed(1)
                    : kpi.total_profit_mdl > 0 ? '100' : '0'
            },
            tranzactii: {
                curent: kpi.numar_tranzactii,
                anterior: prevStats.numar_tranzactii,
                diferenta: kpi.numar_tranzactii - prevStats.numar_tranzactii,
                procent: prevStats.numar_tranzactii > 0
                    ? ((kpi.numar_tranzactii - prevStats.numar_tranzactii) / prevStats.numar_tranzactii * 100).toFixed(1)
                    : kpi.numar_tranzactii > 0 ? '100' : '0'
            }
        };

        return NextResponse.json({
            success: true,
            perioada: {
                tip: perioada,
                start: startDate,
                end: endDate,
                zile: perioadaZile,
            },
            kpi,
            tranzactii,
            branduri: brandStats,
            dimensiuni: dimensiuneStats,
            zilnic: zilnicStats,
            mecanici: mecanicStats,
            comparativ,
        });

    } catch (err: any) {
        console.error('Statistica API Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
