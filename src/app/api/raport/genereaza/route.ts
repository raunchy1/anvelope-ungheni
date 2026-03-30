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

async function handleGenerate(_req: Request) {
    try {
        const supabase = await createServerSupabase();
        const azi = new Date().toISOString().split('T')[0];

        // ═══════════════════════════════════════════════════════════
        // 1. Fetch tire sales from stock_movements (SINGLE SOURCE OF TRUTH)
        // ═══════════════════════════════════════════════════════════
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

        // Calculate totals from stock movements
        const profitVanzari = (miscariAzi || []).reduce((s, m) => {
            const profit = m.profit_total !== null ? Number(m.profit_total) : 
                ((m.pret_vanzare || 0) - (m.pret_achizitie || 0)) * (m.cantitate || 0);
            return s + profit;
        }, 0);
        
        const bucateVandute = (miscariAzi || []).reduce((s, m) => s + (m.cantitate || 0), 0);
        const venituriVanzari = (miscariAzi || []).reduce((s, m) => 
            s + ((m.pret_vanzare || 0) * (m.cantitate || 0)), 0);

        // Fetch tire details for the sales
        const anvelopeIds = [...new Set((miscariAzi || []).map(m => m.anvelopa_id).filter(Boolean))];
        let anvelopeMap: Record<number, any> = {};
        if (anvelopeIds.length > 0) {
            const { data: anvelope } = await supabase
                .from('stocuri')
                .select('id, brand, dimensiune')
                .in('id', anvelopeIds);
            for (const a of anvelope || []) {
                anvelopeMap[a.id] = a;
            }
        }

        // Fetch service records for client/mecanic info
        const referenceIds = [...new Set((miscariAzi || []).map(m => m.reference_id).filter(Boolean))];
        let serviceMap: Record<string, any> = {};
        if (referenceIds.length > 0) {
            const { data: services } = await supabase
                .from('service_records')
                .select('id, client_name, mecanic')
                .in('id', referenceIds);
            for (const s of services || []) {
                serviceMap[s.id] = s;
            }
        }

        // Build vanzari array for PDF (format compatibil)
        const vanzari = (miscariAzi || []).map(m => {
            const totalVanzare = (m.pret_vanzare || 0) * (m.cantitate || 0);
            const profitCalc = ((m.pret_vanzare || 0) - (m.pret_achizitie || 0)) * (m.cantitate || 0);
            
            return {
                brand: anvelopeMap[m.anvelopa_id]?.brand || 'Necunoscut',
                dimensiune: anvelopeMap[m.anvelopa_id]?.dimensiune || '-',
                cantitate: m.cantitate,
                pret_vanzare: m.pret_vanzare,
                pret_achizitie: m.pret_achizitie || 0,
                profit_total: m.profit_total !== null ? Number(m.profit_total) : profitCalc,
                total_vanzare: totalVanzare,
            };
        });

        // Build vanzariDetaliat array for PDF (format extins)
        const vanzariDetaliat = (miscariAzi || []).map(m => {
            const service = m.reference_id ? serviceMap[m.reference_id] : null;
            const profitCalc = m.profit_total !== null ? Number(m.profit_total) : 
                ((m.pret_vanzare || 0) - (m.pret_achizitie || 0)) * (m.cantitate || 0);
            const profitPerBucata = m.profit_per_bucata !== null ? Number(m.profit_per_bucata) :
                ((m.pret_vanzare || 0) - (m.pret_achizitie || 0));
            
            return {
                id: m.id,
                data: m.data || azi,
                brand: anvelopeMap[m.anvelopa_id]?.brand || 'Necunoscut',
                dimensiune: anvelopeMap[m.anvelopa_id]?.dimensiune || '-',
                cantitate: m.cantitate || 0,
                pret_achizitie: m.pret_achizitie || 0,
                pret_vanzare: m.pret_vanzare || 0,
                profit_per_bucata: profitPerBucata,
                profit_total: profitCalc,
                mecanic: service?.mecanic || null,
                client: service?.client_name || null,
            };
        });

        // ═══════════════════════════════════════════════════════════
        // 2. Fetch services (excluding tire sales which come from stock_movements)
        // ═══════════════════════════════════════════════════════════
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
            const stocVanzare = s?.servicii?.vulcanizare?.stoc_vanzare || [];
            const totalVanzareStoc = stocVanzare.reduce((sum: number, item: any) => 
                sum + (item.total_vanzare || 0), 0);
            
            // Service profit = total - tire sales
            const serviceProfit = Math.max(0, pretTotal - totalVanzareStoc);
            
            profitServicii += serviceProfit;
            venituriServicii += serviceProfit;
            
            if (serviceProfit > 0 || pretTotal === 0) {
                servicii.push({
                    client_name: fisa.client_name,
                    car_number: fisa.car_number,
                    serviciu: 'Servicii Vulcanizare',
                    pret: serviceProfit,
                });
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 3. Fetch hotel records
        // ═══════════════════════════════════════════════════════════
        const { data: hotelAzi } = await supabase
            .from('hotel_anvelope')
            .select('dimensiune_anvelope, tip_depozit, pret_total')
            .gte('created_at', `${azi}T00:00:00`)
            .lte('created_at', `${azi}T23:59:59`);

        const numarHotel = (hotelAzi || []).length;
        const profitHotel = (hotelAzi || []).reduce((s, h) => s + (Number(h.pret_total) || 0), 0);
        const hotel = (hotelAzi || []).map(h => ({
            dimensiune_anvelope: h.dimensiune_anvelope,
            tip_depozit: h.tip_depozit,
        }));

        // ═══════════════════════════════════════════════════════════
        // 4. Calculate totals
        // ═══════════════════════════════════════════════════════════
        const total = profitVanzari + profitServicii + profitHotel;
        const totalVenituri = venituriVanzari + venituriServicii + profitHotel;

        // ═══════════════════════════════════════════════════════════
        // 5. Generate PDF
        // ═══════════════════════════════════════════════════════════
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

        // ═══════════════════════════════════════════════════════════
        // 6. Upload to Supabase Storage
        // ═══════════════════════════════════════════════════════════
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

        // 7. Get public URL
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
                venituriVanzari
            },
        });

    } catch (err: any) {
        console.error('Genereaza Raport Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
