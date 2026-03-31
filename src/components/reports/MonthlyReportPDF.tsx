'use client';

import { useRef, useEffect, useState } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

// ═══════════════════════════════════════════════════════════
// TIPURI RAPORT
// ═══════════════════════════════════════════════════════════

interface RaportLunarData {
    success: boolean;
    partial?: boolean;
    perioada: {
        an: number;
        luna: number;
        luna_nume: string;
        start: string;
        end: string;
        zile_luna: number;
        zile_lucratoare: number;
    };
    kpi: {
        stoc_bucati: number;
        stoc_venit: number;
        stoc_profit: number;
        stoc_tranzactii: number;
        servicii_fise: number;
        servicii_vulcanizare: number;
        servicii_ac: number;
        servicii_frana: number;
        servicii_jante: number;
        servicii_hotel: number;
        servicii_total: number;
        hotel_active: number;
        hotel_ridicate: number;
        hotel_venit: number;
        hotel_total: number;
        venit_total: number;
        profit_total: number;
    };
    vanzari: Array<{
        id: number;
        data: string;
        brand: string;
        dimensiune: string;
        sezon: string;
        cantitate: number;
        pret_achizitie: number;
        pret_vanzare: number;
        profit_total: number;
        client: string | null;
        mecanic: string | null;
    }>;
    servicii: {
        lista: any[];
        total_vulcanizare: number;
        total_ac: number;
        total_frana: number;
        total_jante: number;
        total_hotel: number;
    };
    hotel: {
        active: number;
        ridicate: number;
        venit: number;
        total: number;
    };
    zilnic: Array<{
        data: string;
        vanzari: number;
        profit: number;
        servicii: number;
        hotel: number;
        fise: number;
        total: number;
    }>;
    top: {
        branduri: Array<[string, number]>;
        dimensiuni: Array<[string, number]>;
        furnizori: Array<[string, number]>;
        clienti: Array<[string, { bucati: number; cheltuit: number }]>;
        diametre: Array<[string, number]>;
        mecanici: Array<{ nume: string; fise: number; venit: number }>;
    };
    insights: {
        cea_mai_buna_zi: any;
        cel_mai_profitabil_produs: any;
        cel_mai_activ_mecanic: any;
        recomandari_restock: Array<{ dimensiune: string; vandut: number; mesaj: string }>;
    };
    comparativ: {
        venit: { curent: number; anterior: number; diferenta: number; procent: number; trend: string };
        profit: { curent: number; anterior: number; diferenta: number; procent: number; trend: string };
        fise: { curent: number; anterior: number; diferenta: number; procent: number; trend: string };
        vanzari: { curent: number; anterior: number; diferenta: number; procent: number; trend: string };
    };
}

// ═══════════════════════════════════════════════════════════
// COMPONENTĂ PDF PRINT LAYOUT
// ═══════════════════════════════════════════════════════════

interface MonthlyReportPDFProps {
    data: RaportLunarData;
    onChartsReady?: () => void;
}

export default function MonthlyReportPDF({ data, onChartsReady }: MonthlyReportPDFProps) {
    const [chartsRendered, setChartsRendered] = useState(0);
    const totalCharts = 4;
    
    const chart1Ref = useRef<HTMLDivElement>(null);
    const chart2Ref = useRef<HTMLDivElement>(null);
    const chart3Ref = useRef<HTMLDivElement>(null);
    const chart4Ref = useRef<HTMLDivElement>(null);

    const { kpi, perioada, comparativ, insights, top, vanzari, servicii, hotel, zilnic } = data;

    // Calculăm medii și procente
    const zileActive = zilnic.filter(z => z.total > 0).length || 1;
    const mediaPeZi = kpi.venit_total / (zileActive || 1);
    const marjaProfit = kpi.venit_total > 0 ? ((kpi.profit_total / kpi.venit_total) * 100).toFixed(1) : '0';

    useEffect(() => {
        if (chartsRendered >= totalCharts && onChartsReady) {
            // Small delay to ensure DOM is fully rendered
            setTimeout(onChartsReady, 500);
        }
    }, [chartsRendered, onChartsReady]);

    const handleChartRender = () => {
        setChartsRendered(prev => prev + 1);
    };

    // Date pentru grafice
    const venitProfitData = zilnic.map(z => ({
        zi: new Date(z.data).getDate(),
        venit: z.total,
        profit: z.profit
    }));

    const serviciiPieData = [
        { name: 'Vulcanizare', value: kpi.servicii_vulcanizare, color: '#f97316' },
        { name: 'A/C', value: kpi.servicii_ac, color: '#3b82f6' },
        { name: 'Frână', value: kpi.servicii_frana, color: '#ef4444' },
        { name: 'Jante', value: kpi.servicii_jante, color: '#8b5cf6' },
        { name: 'Hotel', value: kpi.servicii_hotel, color: '#22c55e' },
    ].filter(s => s.value > 0);

    const branduriData = top.branduri.slice(0, 5).map(([name, value]) => ({ name, value }));

    return (
        <div 
            id="monthly-report-pdf" 
            className="bg-white text-slate-900"
            style={{ 
                width: '210mm', 
                minHeight: '297mm',
                margin: '0 auto',
                fontFamily: 'Arial, Helvetica, sans-serif',
                position: 'absolute',
                left: '-9999px',
                top: 0,
            }}
        >
            {/* ═══════════════════════════════════════════════════════════
                PAGINA 1 - COVER & KPI OVERVIEW
            ═══════════════════════════════════════════════════════════ */}
            <div className="pdf-page" style={{ width: '210mm', minHeight: '297mm', padding: '20mm', pageBreakAfter: 'always' }}>
                {/* Header Branding */}
                <div style={{ 
                    background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
                    margin: '-20mm -20mm 20px -20mm',
                    padding: '30px 20mm',
                    color: 'white'
                }}>
                    <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>ANVELOPE UNGHENI</h1>
                    <p style={{ fontSize: '14px', margin: '8px 0 0 0', opacity: 0.9 }}>
                        Raport Lunar Executiv • {perioada.luna_nume} {perioada.an}
                    </p>
                    <p style={{ fontSize: '11px', margin: '4px 0 0 0', opacity: 0.8 }}>
                        CF 102060004938 • Mun. Ungheni, str. Decebal 62A/1 • Tel: 068263644
                    </p>
                </div>

                {/* Perioada Info */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '30px',
                    padding: '15px 20px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0'
                }}>
                    <div>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Perioada Raport</p>
                        <p style={{ fontSize: '14px', fontWeight: '600', margin: '4px 0 0 0' }}>
                            {perioada.start} - {perioada.end}
                        </p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Zile Lucrătoare</p>
                        <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#f97316', margin: '4px 0 0 0' }}>
                            {perioada.zile_lucratoare}
                        </p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Generat</p>
                        <p style={{ fontSize: '14px', fontWeight: '600', margin: '4px 0 0 0' }}>
                            {new Date().toLocaleDateString('ro-MD')}
                        </p>
                    </div>
                </div>

                {/* KPI Cards Grid */}
                <h2 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', color: '#1e293b' }}>
                    Indicatori Cheie de Performanță
                </h2>
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(2, 1fr)', 
                    gap: '15px',
                    marginBottom: '25px'
                }}>
                    {/* Venit Total */}
                    <div style={{ 
                        padding: '20px', 
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        borderRadius: '12px',
                        color: 'white'
                    }}>
                        <p style={{ fontSize: '11px', opacity: 0.9, margin: 0 }}>Venit Total Lunar</p>
                        <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0 0 0' }}>
                            {kpi.venit_total.toLocaleString('ro-MD')} MDL
                        </p>
                        <p style={{ fontSize: '12px', margin: '8px 0 0 0', opacity: 0.9 }}>
                            {comparativ.venit.trend === 'up' ? '↑' : '↓'} {comparativ.venit.procent}% vs luna trecută
                        </p>
                    </div>

                    {/* Profit Total */}
                    <div style={{ 
                        padding: '20px', 
                        background: 'linear-gradient(135deg, #f97316 0%, #dc2626 100%)',
                        borderRadius: '12px',
                        color: 'white'
                    }}>
                        <p style={{ fontSize: '11px', opacity: 0.9, margin: 0 }}>Profit Total Lunar</p>
                        <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0 0 0' }}>
                            {kpi.profit_total.toLocaleString('ro-MD')} MDL
                        </p>
                        <p style={{ fontSize: '12px', margin: '8px 0 0 0', opacity: 0.9 }}>
                            Marjă: {marjaProfit}%
                        </p>
                    </div>

                    {/* Bucăți Vândute */}
                    <div style={{ 
                        padding: '20px', 
                        background: 'linear-gradient(135deg, #3b82f6 0%, #4f46e5 100%)',
                        borderRadius: '12px',
                        color: 'white'
                    }}>
                        <p style={{ fontSize: '11px', opacity: 0.9, margin: 0 }}>Total Bucăți Vândute</p>
                        <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0 0 0' }}>
                            {kpi.stoc_bucati}
                        </p>
                        <p style={{ fontSize: '12px', margin: '8px 0 0 0', opacity: 0.9 }}>
                            {kpi.stoc_tranzactii} tranzacții
                        </p>
                    </div>

                    {/* Fișe Service */}
                    <div style={{ 
                        padding: '20px', 
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                        borderRadius: '12px',
                        color: 'white'
                    }}>
                        <p style={{ fontSize: '11px', opacity: 0.9, margin: 0 }}>Total Fișe Service</p>
                        <p style={{ fontSize: '24px', fontWeight: 'bold', margin: '8px 0 0 0' }}>
                            {kpi.servicii_fise}
                        </p>
                        <p style={{ fontSize: '12px', margin: '8px 0 0 0', opacity: 0.9 }}>
                            Media: {Math.round(mediaPeZi).toLocaleString('ro-MD')} MDL/zi
                        </p>
                    </div>
                </div>

                {/* Overview Secțiuni */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px' }}>
                    {/* Stoc */}
                    <div style={{ padding: '15px', background: '#f1f5f9', borderRadius: '8px', borderLeft: '4px solid #3b82f6' }}>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Vânzări Stoc</p>
                        <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: '4px 0' }}>
                            {kpi.stoc_venit.toLocaleString('ro-MD')} MDL
                        </p>
                        <p style={{ fontSize: '11px', color: '#22c55e', margin: 0 }}>
                            Profit: {kpi.stoc_profit.toLocaleString('ro-MD')} MDL
                        </p>
                    </div>

                    {/* Servicii */}
                    <div style={{ padding: '15px', background: '#f1f5f9', borderRadius: '8px', borderLeft: '4px solid #f97316' }}>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Servicii</p>
                        <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: '4px 0' }}>
                            {kpi.servicii_total.toLocaleString('ro-MD')} MDL
                        </p>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                            {kpi.servicii_fise} fișe
                        </p>
                    </div>

                    {/* Hotel */}
                    <div style={{ padding: '15px', background: '#f1f5f9', borderRadius: '8px', borderLeft: '4px solid #22c55e' }}>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Hotel Anvelope</p>
                        <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#1e293b', margin: '4px 0' }}>
                            {kpi.hotel_active} active
                        </p>
                        <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>
                            {kpi.hotel_ridicate} ridicate
                        </p>
                    </div>
                </div>

                {/* Top Zi */}
                {insights.cea_mai_buna_zi && (
                    <div style={{ 
                        marginTop: '25px', 
                        padding: '15px 20px',
                        background: 'linear-gradient(90deg, #fef3c7 0%, #fde68a 100%)',
                        borderRadius: '8px',
                        border: '1px solid #f59e0b'
                    }}>
                        <p style={{ fontSize: '11px', color: '#92400e', margin: 0, fontWeight: 600 }}>
                            🏆 Cea mai bună zi
                        </p>
                        <p style={{ fontSize: '14px', color: '#78350f', margin: '4px 0 0 0' }}>
                            {new Date(insights.cea_mai_buna_zi.data).toLocaleDateString('ro-MD')} 
                            {' '}cu {insights.cea_mai_buna_zi.profit.toLocaleString('ro-MD')} MDL profit
                        </p>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════
                PAGINA 2 - GRAFICE
            ═══════════════════════════════════════════════════════════ */}
            <div className="pdf-page" style={{ width: '210mm', minHeight: '297mm', padding: '20mm', pageBreakAfter: 'always' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b' }}>
                    Grafice și Analize
                </h2>

                {/* Grafic Venit și Profit pe Zile */}
                <div style={{ marginBottom: '30px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#475569' }}>
                        Evoluție Venit și Profit pe Zile
                    </h3>
                    <div 
                        ref={chart1Ref}
                        style={{ width: '100%', height: '220px', background: '#f8fafc', borderRadius: '8px' }}
                    >
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={venitProfitData}>
                                <defs>
                                    <linearGradient id="colorVenitPDF" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorProfitPDF" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="zi" stroke="#64748b" fontSize={10} />
                                <YAxis stroke="#64748b" fontSize={10} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                    formatter={(value: any) => `${Number(value).toLocaleString('ro-MD')} MDL`}
                                />
                                <Legend wrapperStyle={{ fontSize: '11px' }} />
                                <Area 
                                    type="monotone" 
                                    dataKey="venit" 
                                    name="Venit Total" 
                                    stroke="#f97316" 
                                    fillOpacity={1} 
                                    fill="url(#colorVenitPDF)" 
                                    onAnimationEnd={handleChartRender}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="profit" 
                                    name="Profit" 
                                    stroke="#22c55e" 
                                    fillOpacity={1} 
                                    fill="url(#colorProfitPDF)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Două grafice pe row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Grafic Servicii pe Categorii */}
                    <div>
                        <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#475569' }}>
                            Distribuție Servicii
                        </h3>
                        <div 
                            ref={chart2Ref}
                            style={{ width: '100%', height: '200px', background: '#f8fafc', borderRadius: '8px' }}
                        >
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={serviciiPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={45}
                                        outerRadius={70}
                                        paddingAngle={3}
                                        dataKey="value"
                                        onAnimationEnd={handleChartRender}
                                    >
                                        {serviciiPieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                        formatter={(value: any) => `${Number(value).toLocaleString('ro-MD')} MDL`}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Grafic Activitate Zilnică */}
                    <div>
                        <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#475569' }}>
                            Activitate Zilnică - Fișe
                        </h3>
                        <div 
                            ref={chart3Ref}
                            style={{ width: '100%', height: '200px', background: '#f8fafc', borderRadius: '8px' }}
                        >
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={zilnic}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis 
                                        dataKey="data" 
                                        tickFormatter={(value) => new Date(value).getDate().toString()}
                                        stroke="#64748b" 
                                        fontSize={9}
                                    />
                                    <YAxis stroke="#64748b" fontSize={10} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                    />
                                    <Bar dataKey="fise" name="Fișe" fill="#3b82f6" radius={[2, 2, 0, 0]} onAnimationEnd={handleChartRender} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Grafic Top Branduri */}
                {branduriData.length > 0 && (
                    <div style={{ marginTop: '25px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#475569' }}>
                            Top Branduri Vândute
                        </h3>
                        <div 
                            ref={chart4Ref}
                            style={{ width: '100%', height: '180px', background: '#f8fafc', borderRadius: '8px' }}
                        >
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={branduriData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                                    <XAxis type="number" stroke="#64748b" fontSize={10} />
                                    <YAxis dataKey="name" type="category" width={80} stroke="#64748b" fontSize={10} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                    />
                                    <Bar dataKey="value" fill="#f97316" radius={[0, 3, 3, 0]} onAnimationEnd={handleChartRender} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════
                PAGINA 3 - STOC & VÂNZĂRI DETALII
            ═══════════════════════════════════════════════════════════ */}
            <div className="pdf-page" style={{ width: '210mm', minHeight: '297mm', padding: '20mm', pageBreakAfter: 'always' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b' }}>
                    Vânzări Anvelope din Stoc
                </h2>

                {/* KPI Stoc */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(4, 1fr)', 
                    gap: '12px',
                    marginBottom: '25px'
                }}>
                    <div style={{ padding: '15px', background: '#eff6ff', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>Total Bucăți</p>
                        <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6', margin: '4px 0 0 0' }}>
                            {kpi.stoc_bucati}
                        </p>
                    </div>
                    <div style={{ padding: '15px', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>Venit Stoc</p>
                        <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#22c55e', margin: '4px 0 0 0' }}>
                            {kpi.stoc_venit.toLocaleString('ro-MD')}
                        </p>
                        <p style={{ fontSize: '9px', color: '#22c55e', margin: 0 }}>MDL</p>
                    </div>
                    <div style={{ padding: '15px', background: '#fff7ed', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>Profit Stoc</p>
                        <p style={{ fontSize: '18px', fontWeight: 'bold', color: '#f97316', margin: '4px 0 0 0' }}>
                            {kpi.stoc_profit.toLocaleString('ro-MD')}
                        </p>
                        <p style={{ fontSize: '9px', color: '#f97316', margin: 0 }}>MDL</p>
                    </div>
                    <div style={{ padding: '15px', background: '#faf5ff', borderRadius: '8px', textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>Tranzacții</p>
                        <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6', margin: '4px 0 0 0' }}>
                            {kpi.stoc_tranzactii}
                        </p>
                    </div>
                </div>

                {/* Top Branduri și Dimensiuni */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '25px' }}>
                    {/* Top Branduri */}
                    <div>
                        <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#475569' }}>
                            Top 5 Branduri
                        </h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9' }}>
                                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>#</th>
                                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Brand</th>
                                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Bucăți</th>
                                </tr>
                            </thead>
                            <tbody>
                                {top.branduri.slice(0, 5).map(([brand, count], idx) => (
                                    <tr key={brand} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                                            <span style={{ 
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#d97706' : '#e2e8f0',
                                                color: idx < 3 ? '#fff' : '#64748b',
                                                fontSize: '10px',
                                                fontWeight: 'bold'
                                            }}>
                                                {idx + 1}
                                            </span>
                                        </td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', fontWeight: 500 }}>{brand}</td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>{count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Top Dimensiuni */}
                    <div>
                        <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#475569' }}>
                            Top 5 Dimensiuni
                        </h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9' }}>
                                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>#</th>
                                    <th style={{ padding: '8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Dimensiune</th>
                                    <th style={{ padding: '8px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Bucăți</th>
                                </tr>
                            </thead>
                            <tbody>
                                {top.dimensiuni.slice(0, 5).map(([dim, count], idx) => (
                                    <tr key={dim} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                                            <span style={{ 
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '20px',
                                                height: '20px',
                                                borderRadius: '50%',
                                                background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#d97706' : '#e2e8f0',
                                                color: idx < 3 ? '#fff' : '#64748b',
                                                fontSize: '10px',
                                                fontWeight: 'bold'
                                            }}>
                                                {idx + 1}
                                            </span>
                                        </td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', fontWeight: 500 }}>{dim}</td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>{count}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Tabel Tranzacții (primele 15) */}
                {vanzari.length > 0 && (
                    <div>
                        <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#475569' }}>
                            Detaliu Tranzacții (primele {Math.min(vanzari.length, 15)} din {vanzari.length})
                        </h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
                            <thead>
                                <tr style={{ background: '#f97316', color: '#fff' }}>
                                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Data</th>
                                    <th style={{ padding: '10px 8px', textAlign: 'left' }}>Produs</th>
                                    <th style={{ padding: '10px 8px', textAlign: 'center' }}>Cant</th>
                                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Preț/buc</th>
                                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Total</th>
                                    <th style={{ padding: '10px 8px', textAlign: 'right' }}>Profit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {vanzari.slice(0, 15).map((v, idx) => (
                                    <tr key={v.id} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                                            {new Date(v.data).toLocaleDateString('ro-MD')}
                                        </td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                                            <div style={{ fontWeight: 500 }}>{v.brand}</div>
                                            <div style={{ fontSize: '9px', color: '#64748b' }}>{v.dimensiune}</div>
                                        </td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>
                                            {v.cantitate}
                                        </td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right' }}>
                                            {v.pret_vanzare.toLocaleString('ro-MD')}
                                        </td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 500 }}>
                                            {(v.pret_vanzare * v.cantitate).toLocaleString('ro-MD')}
                                        </td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', color: '#22c55e', fontWeight: 500 }}>
                                            +{v.profit_total.toLocaleString('ro-MD')}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════
                PAGINA 4 - SERVICII, MECANICI, INSIGHTS
            ═══════════════════════════════════════════════════════════ */}
            <div className="pdf-page" style={{ width: '210mm', minHeight: '297mm', padding: '20mm' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#1e293b' }}>
                    Servicii, Mecanici și Insights
                </h2>

                {/* Servicii pe Categorii */}
                <div style={{ marginBottom: '25px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#475569' }}>
                        Venituri pe Categorii de Servicii
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                        {[
                            { label: 'Vulcanizare', value: servicii.total_vulcanizare, color: '#f97316' },
                            { label: 'Aer Condiționat', value: servicii.total_ac, color: '#3b82f6' },
                            { label: 'Frână', value: servicii.total_frana, color: '#ef4444' },
                            { label: 'Jante', value: servicii.total_jante, color: '#8b5cf6' },
                            { label: 'Hotel', value: servicii.total_hotel, color: '#22c55e' },
                        ].filter(s => s.value > 0).map((svc) => (
                            <div key={svc.label} style={{ 
                                padding: '15px', 
                                background: `${svc.color}15`, 
                                borderRadius: '8px',
                                borderLeft: `3px solid ${svc.color}`,
                                textAlign: 'center'
                            }}>
                                <p style={{ fontSize: '9px', color: '#64748b', margin: 0 }}>{svc.label}</p>
                                <p style={{ fontSize: '14px', fontWeight: 'bold', color: svc.color, margin: '4px 0 0 0' }}>
                                    {svc.value.toLocaleString('ro-MD')}
                                </p>
                                <p style={{ fontSize: '8px', color: '#94a3b8', margin: 0 }}>MDL</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Mecanici */}
                {top.mecanici.length > 0 && (
                    <div style={{ marginBottom: '25px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#475569' }}>
                            Top Mecanici
                        </h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                            <thead>
                                <tr style={{ background: '#f1f5f9' }}>
                                    <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>#</th>
                                    <th style={{ padding: '10px 8px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Mecanic</th>
                                    <th style={{ padding: '10px 8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0' }}>Fișe</th>
                                    <th style={{ padding: '10px 8px', textAlign: 'right', borderBottom: '2px solid #e2e8f0' }}>Venit Generat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {top.mecanici.slice(0, 5).map((m, idx) => (
                                    <tr key={m.nume} style={{ background: idx % 2 === 0 ? '#fff' : '#f8fafc' }}>
                                        <td style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0' }}>
                                            <span style={{ 
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#d97706' : '#e2e8f0',
                                                color: idx < 3 ? '#fff' : '#64748b',
                                                fontSize: '11px',
                                                fontWeight: 'bold'
                                            }}>
                                                {idx + 1}
                                            </span>
                                        </td>
                                        <td style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', fontWeight: 600 }}>{m.nume}</td>
                                        <td style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'center' }}>{m.fise}</td>
                                        <td style={{ padding: '10px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontWeight: 600, color: '#22c55e' }}>
                                            {m.venit.toLocaleString('ro-MD')} MDL
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Insights */}
                <div style={{ marginBottom: '25px' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#475569' }}>
                        Insights și Recomandări
                    </h3>
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {insights.cel_mai_profitabil_produs && (
                            <div style={{ padding: '12px 15px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fbbf24' }}>
                                <p style={{ fontSize: '10px', color: '#92400e', margin: 0, fontWeight: 600 }}>⭐ Cel mai profitabil produs</p>
                                <p style={{ fontSize: '12px', color: '#78350f', margin: '4px 0 0 0' }}>
                                    {insights.cel_mai_profitabil_produs.brand} {insights.cel_mai_profitabil_produs.dimensiune}
                                    {' '}• {insights.cel_mai_profitabil_produs.profit_total.toLocaleString('ro-MD')} MDL profit
                                </p>
                            </div>
                        )}

                        {insights.cel_mai_activ_mecanic && (
                            <div style={{ padding: '12px 15px', background: '#dbeafe', borderRadius: '8px', border: '1px solid #60a5fa' }}>
                                <p style={{ fontSize: '10px', color: '#1e40af', margin: 0, fontWeight: 600 }}>👨‍🔧 Cel mai activ mecanic</p>
                                <p style={{ fontSize: '12px', color: '#1e3a8a', margin: '4px 0 0 0' }}>
                                    {insights.cel_mai_activ_mecanic.nume}
                                    {' '}• {insights.cel_mai_activ_mecanic.fise} fișe
                                    {' '}• {insights.cel_mai_activ_mecanic.venit.toLocaleString('ro-MD')} MDL
                                </p>
                            </div>
                        )}

                        {insights.recomandari_restock.length > 0 && (
                            <div style={{ padding: '12px 15px', background: '#fce7f3', borderRadius: '8px', border: '1px solid #f472b6' }}>
                                <p style={{ fontSize: '10px', color: '#9d174d', margin: 0, fontWeight: 600 }}>📦 Recomandări Reaprovizionare</p>
                                <ul style={{ fontSize: '11px', color: '#831843', margin: '8px 0 0 0', paddingLeft: '16px' }}>
                                    {insights.recomandari_restock.slice(0, 3).map((rec, idx) => (
                                        <li key={idx} style={{ marginBottom: '4px' }}>{rec.mesaj}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* Hotel Anvelope */}
                {hotel.total > 0 && (
                    <div style={{ marginBottom: '25px' }}>
                        <h3 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: '#475569' }}>
                            Hotel Anvelope
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                            <div style={{ padding: '15px', background: '#eff6ff', borderRadius: '8px', textAlign: 'center' }}>
                                <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>Seturi Active</p>
                                <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6', margin: '4px 0 0 0' }}>
                                    {hotel.active}
                                </p>
                            </div>
                            <div style={{ padding: '15px', background: '#f0fdf4', borderRadius: '8px', textAlign: 'center' }}>
                                <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>Seturi Ridicate</p>
                                <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#22c55e', margin: '4px 0 0 0' }}>
                                    {hotel.ridicate}
                                </p>
                            </div>
                            <div style={{ padding: '15px', background: '#faf5ff', borderRadius: '8px', textAlign: 'center' }}>
                                <p style={{ fontSize: '10px', color: '#64748b', margin: 0 }}>Total Înregistrări</p>
                                <p style={{ fontSize: '20px', fontWeight: 'bold', color: '#8b5cf6', margin: '4px 0 0 0' }}>
                                    {hotel.total}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer Page 4 */}
                <div style={{ 
                    marginTop: '40px', 
                    padding: '20px',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <p style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                        Rezumat Executiv {perioada.luna_nume} {perioada.an}
                    </p>
                    <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0 0' }}>
                        Venit Total: <strong>{kpi.venit_total.toLocaleString('ro-MD')} MDL</strong>
                        {' '}• Profit: <strong style={{ color: '#22c55e' }}>{kpi.profit_total.toLocaleString('ro-MD')} MDL</strong>
                        {' '}• Marjă: <strong>{marjaProfit}%</strong>
                    </p>
                    <p style={{ fontSize: '9px', color: '#94a3b8', margin: '12px 0 0 0' }}>
                        ANVELOPE UNGHENI SRL • CF 102060004938 • Mun. Ungheni, str. Decebal 62A/1 • Tel: 068263644
                    </p>
                </div>
            </div>
        </div>
    );
}
