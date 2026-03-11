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

        // 1. Fetch mișcări stoc azi — profit calculat dinamic: (pret_vanzare - pret_achizitie) * cantitate
        const { data: miscariAzi } = await supabase
            .from('stock_movements')
            .select('cantitate, pret_vanzare, pret_achizitie, anvelopa_id')
            .eq('data', azi)
            .eq('tip', 'iesire');

        const profitVanzari = (miscariAzi || []).reduce((s, m) => {
            const profitUnit = (m.pret_vanzare || 0) - (m.pret_achizitie || 0);
            return s + profitUnit * (m.cantitate || 0);
        }, 0);
        const bucateVandute = (miscariAzi || []).reduce((s, m) => s + (m.cantitate || 0), 0);
        const venituriVanzari = (miscariAzi || []).reduce((s, m) => s + ((m.pret_vanzare || 0) * (m.cantitate || 0)), 0);

        // Fetch detalii anvelope pentru vânzări
        const anvelopeIds = [...new Set((miscariAzi || []).map(m => m.anvelopa_id))];
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

        const vanzari = (miscariAzi || []).map(m => ({
            brand: anvelopeMap[m.anvelopa_id]?.brand || 'Necunoscut',
            dimensiune: anvelopeMap[m.anvelopa_id]?.dimensiune || '-',
            cantitate: m.cantitate,
            pret_vanzare: m.pret_vanzare,
            profit_total: ((m.pret_vanzare || 0) - (m.pret_achizitie || 0)) * (m.cantitate || 0),
        }));

        // 2. Fetch servicii azi — SUM(pret_total) din services JSON
        const { data: fiseAzi } = await supabase
            .from('service_records')
            .select('client_name, car_number, services')
            .eq('data_intrarii', azi);

        let profitServicii = 0;
        let venituriServicii = 0;
        const servicii: DailyReportData['servicii'] = [];

        for (const fisa of fiseAzi || []) {
            const s = (fisa.services as any) || {};
            const pretTotal = Number(s?.servicii?.vulcanizare?.pret_total || 0);
            profitServicii += pretTotal;
            venituriServicii += pretTotal;
            servicii.push({
                client_name: fisa.client_name,
                car_number: fisa.car_number,
                serviciu: 'Servicii Vulcanizare',
                pret: pretTotal,
            });
        }

        // 3. Fetch hotel azi — SUM(pret_total) din hotel_anvelope înregistrate azi
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

        const total = profitVanzari + profitServicii + profitHotel;
        const totalVenituri = venituriVanzari + venituriServicii + profitHotel;

        // 4. Generează PDF
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
            hotel,
        };

        const pdfBuffer = generateDailyReportBuffer(reportData);
        const fileName = `raport_${azi}.pdf`;

        // 5. Upload în Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('rapoarte-zilnice')
            .upload(fileName, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true,
            });

        if (uploadError) {
            // Dacă bucket-ul nu există, returnăm PDF direct ca download
            console.warn('Storage upload error:', uploadError.message);
            const uint8 = new Uint8Array(pdfBuffer);
            return new Response(uint8, {
                headers: {
                    'Content-Type': 'application/pdf',
                    'Content-Disposition': `attachment; filename="${fileName}"`,
                },
            });
        }

        // 6. Obține URL public
        const { data: urlData } = supabase.storage
            .from('rapoarte-zilnice')
            .getPublicUrl(fileName);

        return NextResponse.json({
            success: true,
            url: urlData?.publicUrl || null,
            fileName,
            stats: { total, profitVanzari, profitServicii, profitHotel, bucateVandute },
        });

    } catch (err: any) {
        console.error('Genereaza Raport Error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
