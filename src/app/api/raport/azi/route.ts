import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export async function GET() {
    try {
        const supabase = await createServerSupabase();
        const azi = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        // 1. Profit din vânzări stoc (stock_movements tip=iesire, data=azi)
        const { data: miscariAzi, error: e1 } = await supabase
            .from('stock_movements')
            .select('profit_total, cantitate, pret_vanzare, pret_achizitie')
            .eq('data', azi)
            .eq('tip', 'iesire');

        const profitVanzari = (miscariAzi || []).reduce((s, m) => s + (m.profit_total || 0), 0);
        const bucateVandute = (miscariAzi || []).reduce((s, m) => s + (m.cantitate || 0), 0);
        const venituriVanzari = (miscariAzi || []).reduce((s, m) => s + ((m.pret_vanzare || 0) * (m.cantitate || 0)), 0);

        // 2. Venituri din servicii (service_records data_intrarii=azi)
        const { data: fiseAzi, error: e2 } = await supabase
            .from('service_records')
            .select('services, data_intrarii')
            .eq('data_intrarii', azi);

        let profitServicii = 0;
        let venituriServicii = 0;
        let numarServicii = 0;

        for (const fisa of fiseAzi || []) {
            const services = (fisa.services as any) || {};
            const vulc = services?.servicii?.vulcanizare || {};
            const pretTotal = vulc.pret_total || services?.vulcanizare?.pret_total || 0;
            profitServicii += Number(pretTotal);
            venituriServicii += Number(pretTotal);
            numarServicii++;
        }

        // 3. Venituri hotel (hotel_anvelope create_at=azi)
        const { data: hotelAzi, error: e3 } = await supabase
            .from('hotel_anvelope')
            .select('id, created_at')
            .gte('created_at', `${azi}T00:00:00`)
            .lte('created_at', `${azi}T23:59:59`);

        // Estimăm ~300 MDL per depozitare hotel (standard)
        const PRET_HOTEL_ESTIMAT = 300;
        const numarHotel = (hotelAzi || []).length;
        const profitHotel = numarHotel * PRET_HOTEL_ESTIMAT;

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
