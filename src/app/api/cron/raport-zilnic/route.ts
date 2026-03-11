import { NextResponse } from 'next/server';

// Vercel Cron Job - rulează zilnic la 18:00 UTC (20:00 Romania)
// Configurat în vercel.json: "schedule": "0 18 * * *"
export async function GET(req: Request) {
    // Verificare opțională a secretului cron (recomandat pe Vercel Pro)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Apelăm intern endpoint-ul de generare
        const baseUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase')
                ? 'https://anvelope-ungheni.vercel.app'
                : 'http://localhost:3000';

        const res = await fetch(`${baseUrl}/api/raport/genereaza`, { method: 'POST' });
        const data = await res.json();

        if (data.success) {
            console.log(`✅ Raport zilnic generat: ${data.fileName} | Profit total: ${data.stats?.total} MDL`);
            return NextResponse.json({
                success: true,
                mesaj: 'Raport zilnic generat cu succes!',
                fileName: data.fileName,
                url: data.url,
                stats: data.stats,
            });
        } else {
            throw new Error(data.error || 'Generare raport eșuată');
        }
    } catch (err: any) {
        console.error('Cron raport zilnic error:', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}
