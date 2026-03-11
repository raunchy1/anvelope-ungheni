import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET() {
    try {
        const supabase = await createServerSupabase();
        const azi = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // 1. Profit servicii — SUM(pret_total) din fise create azi
        const { data: fiseAzi, error: e1 } = await supabase
            .from('service_records')
            .select('services')
            .eq('data_intrarii', azi);

        let profitServicii = 0;
        for (const fisa of fiseAzi || []) {
            const s = (fisa.services as any) || {};
            const pretTotal = Number(s?.servicii?.vulcanizare?.pret_total || 0);
            profitServicii += pretTotal;
        }
        const venituriServicii = profitServicii;
        const numarServicii = (fiseAzi || []).length;

        // 2. Profit anvelope — calculat dinamic: (pret_vanzare - pret_achizitie) * cantitate
        const { data: miscariAzi, error: e2 } = await supabase
            .from('stock_movements')
            .select('cantitate, pret_vanzare, pret_achizitie')
            .eq('data', azi)
            .eq('tip', 'iesire');

        const profitVanzari = (miscariAzi || []).reduce((s, m) => {
            const profitUnit = (m.pret_vanzare || 0) - (m.pret_achizitie || 0);
            return s + profitUnit * (m.cantitate || 0);
        }, 0);
        const bucateVandute = (miscariAzi || []).reduce((s, m) => s + (m.cantitate || 0), 0);
        const venituriVanzari = (miscariAzi || []).reduce((s, m) => s + ((m.pret_vanzare || 0) * (m.cantitate || 0)), 0);

        // 3. Profit hotel — SUM(pret_total) din hotel_anvelope înregistrate azi
        const { data: hotelAzi, error: e3 } = await supabase
            .from('hotel_anvelope')
            .select('pret_total')
            .gte('created_at', `${azi}T00:00:00`)
            .lte('created_at', `${azi}T23:59:59`);

        const numarHotel = (hotelAzi || []).length;
        const profitHotel = (hotelAzi || []).reduce((s, h) => s + (Number(h.pret_total) || 0), 0);

        const totalProfit = profitVanzari + profitServicii + profitHotel;
        const totalVenituri = venituriVanzari + venituriServicii + profitHotel;

        return NextResponse.json({
            data: azi,
            profitVanzari,
            profitServicii,
            profitHotel,
            total: totalProfit,
            totalVenituri,
            bucateVandute,
            numarServicii,
            numarHotel,
            erori: [e1?.message, e2?.message, e3?.message].filter(Boolean),
        });
    } catch (err: any) {
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
