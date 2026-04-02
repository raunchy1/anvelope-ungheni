import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { generateDailyReportBuffer } from '@/lib/reports/daily-report';
import type { DailyReportData } from '@/lib/reports/daily-report';

export async function GET(req: Request) {
    return handleGenerate(req);
}

export async function POST(req: Request) {
    return handleGenerate(req);
}

// Build a human-readable service description from the services JSONB field
function buildServiceDescription(services: any): string {
    if (!services) return 'Servicii vulcanizare';

    const servicii = services?.servicii || {};
    const vulc = servicii?.vulcanizare || {};
    const ac = servicii?.aer_conditionat || {};
    const frana = servicii?.frana || {};
    const jante = servicii?.vopsit_jante || {};
    const hotel = services?.hotel_anvelope || {};

    const parts: string[] = [];

    // Vulcanizare — service complet or individual items
    if (vulc.service_complet_r) {
        const diam = vulc.diametru || vulc.service_complet_diametru || '';
        const buc = vulc.service_complet_r_bucati ? ` ${vulc.service_complet_r_bucati} roti` : '';
        parts.push(`Service complet R${diam}${buc}`);
    } else {
        const vulcItems: string[] = [];
        if (vulc.scos_roata) {
            const qty = typeof vulc.scos_roata === 'object' ? vulc.scos_roata.quantity : null;
            vulcItems.push(qty ? `Scos/pus roata x${qty}` : 'Scos/pus roata');
        }
        if (vulc.montat_demontat) {
            const qty = typeof vulc.montat_demontat === 'object' ? vulc.montat_demontat.quantity : null;
            vulcItems.push(qty ? `Montat/Demontat x${qty}` : 'Montat/Demontat');
        }
        if (vulc.echilibrat) {
            const qty = typeof vulc.echilibrat === 'object' ? vulc.echilibrat.quantity : null;
            vulcItems.push(qty ? `Echilibrat x${qty}` : 'Echilibrat');
        }
        if (vulc.azot) vulcItems.push('Azot');
        if (vulc.petic) vulcItems.push('Petic');
        if (vulc.valva) vulcItems.push('Valve noi');
        if (vulc.curatat_butuc) vulcItems.push('Curatat butuc');
        if (vulcItems.length > 0) parts.push(vulcItems.join(', '));
    }

    // Anvelope vandute din stoc
    const stoc: any[] = vulc.stoc_vanzare || [];
    for (const item of stoc) {
        if (item.brand && item.dimensiune) {
            parts.push(`${item.cantitate || 1}x ${item.brand} ${item.dimensiune}`);
        }
    }

    // Aer conditionat
    if (ac.serviciu_ac) {
        const tip = ac.tip_freon || 'R134A';
        const gr = ac.freon_134a_gr || ac.freon_1234yf_gr || ac.grams_freon || '';
        parts.push(gr ? `Freon ${tip} ${gr}g` : `Freon ${tip}`);
    }

    // Sistem franare
    if (frana.slefuit_discuri || frana.schimb_discuri || frana.schimbat_placute) {
        const franaItems: string[] = [];
        if (frana.slefuit_discuri) franaItems.push('Slefuit discuri');
        if (frana.schimb_discuri) franaItems.push('Schimb discuri');
        if (frana.schimbat_placute) franaItems.push('Placute frana');
        parts.push(franaItems.join(', '));
    }

    // Vopsit / indreptat jante
    if (jante.indreptat_janta_aliaj || jante.vopsit_janta_culoare || jante.roluit_janta_tabla) {
        const janteItems: string[] = [];
        if (jante.indreptat_janta_aliaj) {
            const diam = jante.diametru_indreptat ? ` R${jante.diametru_indreptat}` : '';
            janteItems.push(`Indreptat janta${diam}`);
        }
        if (jante.roluit_janta_tabla) janteItems.push('Roluit janta tabla');
        if (jante.vopsit_janta_culoare) {
            const buc = jante.nr_bucati_vopsit ? ` ${jante.nr_bucati_vopsit}buc` : '';
            janteItems.push(`Vopsit jante${buc}`);
        }
        parts.push(janteItems.join(', '));
    }

    // Hotel anvelope
    if (hotel.activ) {
        const buc = hotel.bucati || 4;
        const tip = hotel.tip_depozit ? ` (${hotel.tip_depozit})` : '';
        parts.push(`Hotel ${buc} roti${tip}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'Servicii vulcanizare';
}

async function handleGenerate(_req: Request) {
    try {
        const supabase = await createServerSupabase();
        const azi = new Date().toISOString().split('T')[0];

        // ─────────────────────────────────────────────────────────────
        // 1. Tire sales from stock_movements
        // ─────────────────────────────────────────────────────────────
        const { data: miscariAzi } = await supabase
            .from('stock_movements')
            .select(`
                id,
                cantitate,
                pret_vanzare,
                pret_achizitie,
                profit_total,
                profit_per_bucata,
                data,
                anvelopa_id,
                reference_id
            `)
            .eq('data', azi)
            .eq('tip', 'iesire')
            .eq('motiv_iesire', 'vanzare')
            .order('created_at', { ascending: false });

        const profitVanzari = (miscariAzi || []).reduce((s, m) => {
            const profit = m.profit_total !== null
                ? Number(m.profit_total)
                : ((m.pret_vanzare || 0) - (m.pret_achizitie || 0)) * (m.cantitate || 0);
            return s + profit;
        }, 0);

        const bucateVandute = (miscariAzi || []).reduce((s, m) => s + (m.cantitate || 0), 0);
        const venituriVanzari = (miscariAzi || []).reduce(
            (s, m) => s + ((m.pret_vanzare || 0) * (m.cantitate || 0)), 0
        );

        // Tire details (brand + dimensiune)
        const anvelopeIds = [...new Set((miscariAzi || []).map(m => m.anvelopa_id).filter(Boolean))];
        let anvelopeMap: Record<number, any> = {};
        if (anvelopeIds.length > 0) {
            const { data: anvelope } = await supabase
                .from('stocuri')
                .select('id, brand, dimensiune')
                .in('id', anvelopeIds);
            for (const a of anvelope || []) anvelopeMap[a.id] = a;
        }

        // Service records for client/mecanic of sales
        const referenceIds = [...new Set((miscariAzi || []).map(m => m.reference_id).filter(Boolean))];
        let serviceMap: Record<string, any> = {};
        if (referenceIds.length > 0) {
            const { data: services } = await supabase
                .from('service_records')
                .select('id, client_name, mecanic')
                .in('id', referenceIds);
            for (const s of services || []) serviceMap[s.id] = s;
        }

        const vanzari = (miscariAzi || []).map(m => ({
            brand: anvelopeMap[m.anvelopa_id]?.brand || 'Necunoscut',
            dimensiune: anvelopeMap[m.anvelopa_id]?.dimensiune || '-',
            cantitate: m.cantitate,
            pret_vanzare: m.pret_vanzare,
            pret_achizitie: m.pret_achizitie || 0,
            profit_total: m.profit_total !== null
                ? Number(m.profit_total)
                : ((m.pret_vanzare || 0) - (m.pret_achizitie || 0)) * (m.cantitate || 0),
            total_vanzare: (m.pret_vanzare || 0) * (m.cantitate || 0),
        }));

        const vanzariDetaliat = (miscariAzi || []).map(m => {
            const service = m.reference_id ? serviceMap[m.reference_id] : null;
            const profitCalc = m.profit_total !== null
                ? Number(m.profit_total)
                : ((m.pret_vanzare || 0) - (m.pret_achizitie || 0)) * (m.cantitate || 0);
            return {
                id: m.id,
                data: m.data || azi,
                brand: anvelopeMap[m.anvelopa_id]?.brand || 'Necunoscut',
                dimensiune: anvelopeMap[m.anvelopa_id]?.dimensiune || '-',
                cantitate: m.cantitate || 0,
                pret_achizitie: m.pret_achizitie || 0,
                pret_vanzare: m.pret_vanzare || 0,
                profit_per_bucata: m.profit_per_bucata !== null
                    ? Number(m.profit_per_bucata)
                    : ((m.pret_vanzare || 0) - (m.pret_achizitie || 0)),
                profit_total: profitCalc,
                mecanic: service?.mecanic || null,
                client: service?.client_name || null,
            };
        });

        // ─────────────────────────────────────────────────────────────
        // 2. Service records — with REAL service details
        // ─────────────────────────────────────────────────────────────
        const { data: fiseAzi } = await supabase
            .from('service_records')
            .select('id, client_name, car_number, services')
            .eq('data_intrarii', azi);

        let profitServicii = 0;
        let venituriServicii = 0;
        const servicii: DailyReportData['servicii'] = [];

        for (const fisa of fiseAzi || []) {
            const s = (fisa.services as any) || {};
            const pretTotal = Number(s?.servicii?.vulcanizare?.pret_total || 0);
            const stocVanzare: any[] = s?.servicii?.vulcanizare?.stoc_vanzare || [];
            const totalVanzareStoc = stocVanzare.reduce(
                (sum: number, item: any) => sum + (item.total_vanzare || 0), 0
            );

            // Service profit = total revenue minus stock tire value
            const serviceProfit = Math.max(0, pretTotal - totalVanzareStoc);
            profitServicii += serviceProfit;
            venituriServicii += serviceProfit;

            // Build detailed service description
            const serviciu = buildServiceDescription(fisa.services);

            servicii.push({
                client_name: fisa.client_name || '-',
                car_number: fisa.car_number || '-',
                serviciu,
                pret: serviceProfit,
            });
        }

        // ─────────────────────────────────────────────────────────────
        // 3. Hotel records with client names
        // ─────────────────────────────────────────────────────────────
        const { data: hotelAzi } = await supabase
            .from('hotel_anvelope')
            .select(`
                dimensiune_anvelope,
                tip_depozit,
                pret_total,
                service_record_id
            `)
            .gte('created_at', `${azi}T00:00:00`)
            .lte('created_at', `${azi}T23:59:59`);

        // Resolve client names for hotel records
        const hotelServiceIds = [...new Set(
            (hotelAzi || []).map((h: any) => h.service_record_id).filter(Boolean)
        )];
        let hotelClientMap: Record<string, string> = {};
        if (hotelServiceIds.length > 0) {
            const { data: hotelServices } = await supabase
                .from('service_records')
                .select('id, client_name')
                .in('id', hotelServiceIds);
            for (const s of hotelServices || []) {
                hotelClientMap[s.id] = s.client_name || 'Necunoscut';
            }
        }

        const numarHotel = (hotelAzi || []).length;
        const profitHotel = (hotelAzi || []).reduce((s, h) => s + (Number(h.pret_total) || 0), 0);
        const hotel = (hotelAzi || []).map((h: any) => ({
            client: h.service_record_id ? (hotelClientMap[h.service_record_id] || 'Necunoscut') : 'Necunoscut',
            dimensiune_anvelope: h.dimensiune_anvelope,
            tip_depozit: h.tip_depozit,
        }));

        // ─────────────────────────────────────────────────────────────
        // 4. Totals
        // ─────────────────────────────────────────────────────────────
        const total = profitVanzari + profitServicii + profitHotel;
        const totalVenituri = venituriVanzari + venituriServicii + profitHotel;

        // ─────────────────────────────────────────────────────────────
        // 5. Generate PDF
        // ─────────────────────────────────────────────────────────────
        const reportData: DailyReportData = {
            data: azi,
            profitVanzari,
            profitServicii,
            profitHotel,
            total,
            totalVenituri,
            bucateVandute,
            numarServicii: fiseAzi?.length || 0,
            numarHotel,
            servicii,
            vanzari,
            vanzariDetaliat,
            hotel,
        };

        const pdfBuffer = generateDailyReportBuffer(reportData);
        const fileName = `raport_${azi}.pdf`;

        // ─────────────────────────────────────────────────────────────
        // 6. Upload to Supabase Storage
        // ─────────────────────────────────────────────────────────────
        const { error: uploadError } = await supabase.storage
            .from('rapoarte-zilnice')
            .upload(fileName, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true,
            });

        if (uploadError) {
            console.warn('Storage upload error:', uploadError.message);
            const uint8 = new Uint8Array(pdfBuffer);
            return new Response(uint8, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${fileName}"`,
                },
            });
        }

        const { data: urlData } = supabase.storage
            .from('rapoarte-zilnice')
            .getPublicUrl(fileName);

        return NextResponse.json({
            success: true,
            url: urlData?.publicUrl || null,
            fileName,
            stats: {
                total,
                profitVanzari,
                profitServicii,
                profitHotel,
                bucateVandute,
                venituriVanzari,
            },
        });

    } catch (err: any) {
        console.error('Genereaza Raport Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
