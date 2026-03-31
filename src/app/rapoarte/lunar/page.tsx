'use client';

import { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
    Calendar, TrendingUp, TrendingDown, Download, Printer, ArrowLeft,
    Package, Wrench, Hotel, DollarSign, Users, Target, Award,
    Zap, BarChart3, PieChart as PieChartIcon, Activity, Lightbulb,
    ShoppingCart, Star, ArrowUpRight, ArrowDownRight, Filter,
    ChevronDown, ChevronUp, Car, AlertTriangle, RefreshCw,
    CheckCircle, Info
} from 'lucide-react';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════
// TIPURI - Extended cu sectionErrors pentru UI resilience
// ═══════════════════════════════════════════════════════════

interface RaportLunarData {
    success: boolean;
    partial?: boolean;
    error?: string;
    sectionErrors?: Record<string, string>;
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
    filters: {
        mecanici: string[];
        mecanic_selectat: string | null;
    };
}

// ═══════════════════════════════════════════════════════════
// COMPONENTA PRINCIPALĂ - BULLETPROOF
// ═══════════════════════════════════════════════════════════

export default function RaportLunarPage() {
    const [data, setData] = useState<RaportLunarData | null>(null);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [an, setAn] = useState(new Date().getFullYear());
    const [luna, setLuna] = useState(new Date().getMonth() + 1);
    const [mecanic, setMecanic] = useState<string>('');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['kpi', 'vanzari', 'servicii', 'grafice']));
    const [isPrinting, setIsPrinting] = useState(false);

    const luni = [
        { value: 1, label: 'Ianuarie' },
        { value: 2, label: 'Februarie' },
        { value: 3, label: 'Martie' },
        { value: 4, label: 'Aprilie' },
        { value: 5, label: 'Mai' },
        { value: 6, label: 'Iunie' },
        { value: 7, label: 'Iulie' },
        { value: 8, label: 'August' },
        { value: 9, label: 'Septembrie' },
        { value: 10, label: 'Octombrie' },
        { value: 11, label: 'Noiembrie' },
        { value: 12, label: 'Decembrie' },
    ];

    const ani = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
    }, []);

    useEffect(() => {
        fetchData();
    }, [an, luna, mecanic]);

    const fetchData = async () => {
        setLoading(true);
        setFetchError(null);
        
        try {
            let url = `/api/raport/lunar?an=${an}&luna=${luna}`;
            if (mecanic) url += `&mecanic=${encodeURIComponent(mecanic)}`;

            console.log('📊 Fetching:', url);
            
            const res = await fetch(url);
            const result = await res.json();
            
            console.log('📊 Response:', { success: result.success, partial: result.partial, hasErrors: !!result.sectionErrors });
            
            if (result.success) {
                setData(result);
                if (result.partial && result.sectionErrors) {
                    console.warn('⚠️ Date parțiale încărcate:', result.sectionErrors);
                }
            } else {
                setFetchError(result.error || 'Eroare necunoscută');
            }
        } catch (err: any) {
            console.error('❌ Error fetching monthly report:', err);
            setFetchError(err.message || 'Eroare la conectarea cu serverul');
        } finally {
            setLoading(false);
        }
    };

    const toggleSection = (section: string) => {
        const newSet = new Set(expandedSections);
        if (newSet.has(section)) {
            newSet.delete(section);
        } else {
            newSet.add(section);
        }
        setExpandedSections(newSet);
    };

    // ═══════════════════════════════════════════════════════════
    // RENDER STATES
    // ═══════════════════════════════════════════════════════════

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
                    <p className="text-slate-400 text-lg">Se încarcă raportul lunar...</p>
                    <p className="text-slate-500 text-sm mt-2">Se agregă datele din multiple surse</p>
                </div>
            </div>
        );
    }

    // Error state cu retry
    if (fetchError && !data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center max-w-md mx-auto px-4">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="w-8 h-8 text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-red-400 mb-2">Eroare la încărcarea datelor</h2>
                    <p className="text-slate-400 mb-4">{fetchError}</p>
                    <button 
                        onClick={fetchData} 
                        className="flex items-center gap-2 px-4 py-2 bg-orange-500 rounded-lg text-white mx-auto hover:bg-orange-600 transition"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Reîncearcă
                    </button>
                </div>
            </div>
        );
    }

    // No data at all (shouldn't happen with bulletproof API)
    if (!data) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-slate-400 text-lg">Nu există date disponibile</p>
                    <button onClick={fetchData} className="mt-4 px-4 py-2 bg-orange-500 rounded-lg text-white">
                        Reîncarcă
                    </button>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════
    // DATE DISPONIBILE - RENDER RAPORTUL
    // ═══════════════════════════════════════════════════════════

    const { kpi, perioada, comparativ, insights, sectionErrors } = data;
    const hasPartialData = data.partial || !!sectionErrors;

    // Calculează media pe zi
    const zileActive = data.zilnic.filter(z => z.total > 0).length || 1;
    const mediaPeZi = kpi.venit_total / (zileActive || 1);
    const marjaProfit = kpi.venit_total > 0 ? ((kpi.profit_total / kpi.venit_total) * 100).toFixed(1) : '0';

    // Check pentru secțiuni cu erori
    const stockError = sectionErrors?.stock;
    const serviciiError = sectionErrors?.servicii;
    const hotelError = sectionErrors?.hotel;

    // Check pentru date goale
    const hasVanzari = data.vanzari.length > 0;
    const hasServicii = data.servicii.lista.length > 0;
    const hasHotel = data.hotel.total > 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
            <style>{`
                @media print {
                    @page { size: A4 landscape; margin: 10mm; }
                    body { background: white !important; color: black !important; }
                    .no-print { display: none !important; }
                    .print-break { page-break-before: always; }
                }
            `}</style>

            {/* ═══════════════════════════════════════════════════════════
                HEADER PREMIUM
            ═══════════════════════════════════════════════════════════ */}
            <div className="bg-gradient-to-r from-orange-600 via-red-600 to-orange-700 shadow-2xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <Link href="/" className="no-print p-2 bg-white/10 rounded-lg hover:bg-white/20 transition">
                                <ArrowLeft className="w-6 h-6" />
                            </Link>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">ANVELOPE UNGHENI</h1>
                                <p className="text-orange-100 text-sm">Raport Lunar Business Premium</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 no-print">
                            <button
                                onClick={() => window.print()}
                                className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
                            >
                                <Printer className="w-5 h-5" /> Print
                            </button>
                            <button
                                onClick={() => generatePDF(data, setIsPrinting)}
                                disabled={isPrinting}
                                className="flex items-center gap-2 px-4 py-2 bg-white text-orange-600 rounded-lg font-semibold hover:bg-orange-50 transition disabled:opacity-50"
                            >
                                {isPrinting ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-600 border-t-transparent" />
                                ) : (
                                    <Download className="w-5 h-5" />
                                )}
                                {isPrinting ? 'Se generează...' : 'Export PDF'}
                            </button>
                        </div>
                    </div>

                    {/* Selector Perioadă */}
                    <div className="mt-6 flex flex-wrap items-center gap-4 no-print">
                        <div className="flex items-center gap-2 bg-white/10 rounded-lg p-1">
                            <select
                                value={luna}
                                onChange={(e) => setLuna(Number(e.target.value))}
                                className="bg-transparent text-white font-semibold py-2 px-4 outline-none cursor-pointer"
                            >
                                {luni.map(l => (
                                    <option key={l.value} value={l.value} className="text-slate-900">
                                        {l.label}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={an}
                                onChange={(e) => setAn(Number(e.target.value))}
                                className="bg-transparent text-white font-semibold py-2 px-4 outline-none cursor-pointer border-l border-white/20"
                            >
                                {ani.map(a => (
                                    <option key={a} value={a} className="text-slate-900">
                                        {a}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {data.filters.mecanici.length > 0 && (
                            <select
                                value={mecanic}
                                onChange={(e) => setMecanic(e.target.value)}
                                className="bg-white/10 text-white py-2 px-4 rounded-lg outline-none cursor-pointer"
                            >
                                <option value="" className="text-slate-900">Toți mecanicii</option>
                                {data.filters.mecanici.map(m => (
                                    <option key={m} value={m} className="text-slate-900">{m}</option>
                                ))}
                            </select>
                        )}

                        <button 
                            onClick={fetchData}
                            className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
                            title="Reîmprospătează datele"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>

                        <div className="ml-auto text-orange-100 text-sm">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            {perioada.zile_luna} zile • {perioada.zile_lucratoare} lucrătoare
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════
                ALERTĂ DATE PARȚIALE (dacă există)
            ═══════════════════════════════════════════════════════════ */}
            {hasPartialData && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 no-print">
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="font-semibold text-amber-400">Date parțiale încărcate</h3>
                                <p className="text-sm text-amber-200/80 mt-1">
                                    Unele secțiuni nu au putut fi încărcate complet, dar raportul afișează datele disponibile.
                                </p>
                                {sectionErrors && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {Object.entries(sectionErrors).map(([key, error]) => (
                                            <span key={key} className="text-xs bg-amber-500/20 text-amber-300 px-2 py-1 rounded">
                                                {key}: {error}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

                {/* ═══════════════════════════════════════════════════════════
                    KPI CARDS PREMIUM
                ═══════════════════════════════════════════════════════════ */}
                <section>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KPICard
                            icon={<DollarSign className="w-6 h-6" />}
                            label="Venit Total Lunar"
                            value={`${kpi.venit_total.toLocaleString('ro-MD')} MDL`}
                            subvalue={comparativ.venit.trend === 'up' ? `+${comparativ.venit.procent}%` : `${comparativ.venit.procent}%`}
                            trend={comparativ.venit.trend as 'up' | 'down'}
                            color="from-green-500 to-emerald-600"
                        />
                        <KPICard
                            icon={<TrendingUp className="w-6 h-6" />}
                            label="Profit Total Lunar"
                            value={`${kpi.profit_total.toLocaleString('ro-MD')} MDL`}
                            subvalue={comparativ.profit.trend === 'up' ? `+${comparativ.profit.procent}%` : `${comparativ.profit.procent}%`}
                            trend={comparativ.profit.trend as 'up' | 'down'}
                            color="from-orange-500 to-red-500"
                        />
                        <KPICard
                            icon={<Package className="w-6 h-6" />}
                            label="Total Bucăți Vândute"
                            value={kpi.stoc_bucati.toString()}
                            subvalue={comparativ.vanzari.trend === 'up' ? `+${comparativ.vanzari.procent}%` : `${comparativ.vanzari.procent}%`}
                            trend={comparativ.vanzari.trend as 'up' | 'down'}
                            color="from-blue-500 to-indigo-600"
                        />
                        <KPICard
                            icon={<Wrench className="w-6 h-6" />}
                            label="Total Fișe Service"
                            value={kpi.servicii_fise.toString()}
                            subvalue={comparativ.fise.trend === 'up' ? `+${comparativ.fise.procent}%` : `${comparativ.fise.procent}%`}
                            trend={comparativ.fise.trend as 'up' | 'down'}
                            color="from-purple-500 to-pink-600"
                        />
                    </div>

                    {/* KPI Secundare */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                        <SecondaryKPI
                            icon={<Activity className="w-4 h-4" />}
                            label="Media pe Zi"
                            value={`${Math.round(mediaPeZi).toLocaleString('ro-MD')} MDL`}
                        />
                        <SecondaryKPI
                            icon={<Target className="w-4 h-4" />}
                            label="Marjă Profit"
                            value={`${marjaProfit}%`}
                        />
                        <SecondaryKPI
                            icon={<Hotel className="w-4 h-4" />}
                            label="Hotel Active"
                            value={kpi.hotel_active.toString()}
                        />
                        <SecondaryKPI
                            icon={<Star className="w-4 h-4" />}
                            label="Top Zi Profit"
                            value={insights.cea_mai_buna_zi ? `${new Date(insights.cea_mai_buna_zi.data).getDate()} ${perioada.luna_nume}` : '-'}
                        />
                    </div>
                </section>

                {/* ═══════════════════════════════════════════════════════════
                    GRAFICE BUSINESS
                ═══════════════════════════════════════════════════════════ */}
                <SectionHeader
                    title="Grafice Business"
                    icon={<BarChart3 className="w-5 h-5" />}
                    expanded={expandedSections.has('grafice')}
                    onToggle={() => toggleSection('grafice')}
                    disabled={!hasVanzari && !hasServicii}
                />
                {expandedSections.has('grafice') && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Venit și Profit pe Zile */}
                        <ChartCard title="Venit și Profit pe Zile" icon={<TrendingUp className="w-4 h-4" />}>
                            {data.zilnic.some(z => z.total > 0) ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <AreaChart data={data.zilnic}>
                                        <defs>
                                            <linearGradient id="colorVenit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                                            </linearGradient>
                                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis 
                                            dataKey="data" 
                                            tickFormatter={(value) => new Date(value).getDate().toString()}
                                            stroke="#94a3b8"
                                        />
                                        <YAxis stroke="#94a3b8" />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                            formatter={(value: any) => value?.toLocaleString('ro-MD') + ' MDL'}
                                        />
                                        <Legend />
                                        <Area type="monotone" dataKey="total" name="Venit Total" stroke="#f97316" fillOpacity={1} fill="url(#colorVenit)" />
                                        <Area type="monotone" dataKey="profit" name="Profit" stroke="#22c55e" fillOpacity={1} fill="url(#colorProfit)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState message="Nu există date pentru grafic în perioada selectată" />
                            )}
                        </ChartCard>

                        {/* Top Branduri */}
                        <ChartCard title="Top Branduri Vândute" icon={<Package className="w-4 h-4" />}>
                            {data.top.branduri.length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={data.top.branduri.map(([name, value]) => ({ name, value }))} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis type="number" stroke="#94a3b8" />
                                        <YAxis dataKey="name" type="category" width={80} stroke="#94a3b8" />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState message="Nu există vânzări de anvelope în perioada selectată" />
                            )}
                        </ChartCard>

                        {/* Servicii pe Categorii */}
                        <ChartCard title="Servicii pe Categorii" icon={<PieChartIcon className="w-4 h-4" />}>
                            {kpi.servicii_total > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Vulcanizare', value: kpi.servicii_vulcanizare },
                                                { name: 'A/C', value: kpi.servicii_ac },
                                                { name: 'Frână', value: kpi.servicii_frana },
                                                { name: 'Jante', value: kpi.servicii_jante },
                                                { name: 'Hotel', value: kpi.servicii_hotel },
                                            ].filter(s => s.value > 0)}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {[
                                                { name: 'Vulcanizare', color: '#f97316' },
                                                { name: 'A/C', color: '#3b82f6' },
                                                { name: 'Frână', color: '#ef4444' },
                                                { name: 'Jante', color: '#8b5cf6' },
                                                { name: 'Hotel', color: '#22c55e' },
                                            ].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                            formatter={(value: any) => value?.toLocaleString('ro-MD') + ' MDL'}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState message="Nu există servicii înregistrate în perioada selectată" />
                            )}
                        </ChartCard>

                        {/* Activitate Zilnică */}
                        <ChartCard title="Activitate Zilnică - Fișe" icon={<Activity className="w-4 h-4" />}>
                            {data.zilnic.some(z => z.fise > 0) ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={data.zilnic}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis 
                                            dataKey="data" 
                                            tickFormatter={(value) => new Date(value).getDate().toString()}
                                            stroke="#94a3b8"
                                        />
                                        <YAxis stroke="#94a3b8" />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="fise" name="Fișe Service" fill="#3b82f6" />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyState message="Nu există fișe service în perioada selectată" />
                            )}
                        </ChartCard>
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    ANALIZĂ SMART - INSIGHTS
                ═══════════════════════════════════════════════════════════ */}
                {(insights.cea_mai_buna_zi || insights.cel_mai_profitabil_produs || insights.cel_mai_activ_mecanic || insights.recomandari_restock.length > 0) && (
                    <section className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 border border-slate-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-yellow-500/20 rounded-lg">
                                <Lightbulb className="w-5 h-5 text-yellow-400" />
                            </div>
                            <h2 className="text-xl font-bold">Analiză Smart & Insights</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {insights.cea_mai_buna_zi && (
                                <InsightCard
                                    icon={<Award className="w-5 h-5 text-yellow-400" />}
                                    title="Cea mai bună zi"
                                    description={`${new Date(insights.cea_mai_buna_zi.data).toLocaleDateString('ro-MD')} cu ${insights.cea_mai_buna_zi.profit.toLocaleString('ro-MD')} MDL profit`}
                                />
                            )}
                            {insights.cel_mai_profitabil_produs && (
                                <InsightCard
                                    icon={<Star className="w-5 h-5 text-orange-400" />}
                                    title="Cel mai profitabil produs"
                                    description={`${insights.cel_mai_profitabil_produs.brand} ${insights.cel_mai_profitabil_produs.dimensiune} - ${insights.cel_mai_profitabil_produs.profit_total.toLocaleString('ro-MD')} MDL`}
                                />
                            )}
                            {insights.cel_mai_activ_mecanic && (
                                <InsightCard
                                    icon={<Users className="w-5 h-5 text-blue-400" />}
                                    title="Cel mai activ mecanic"
                                    description={`${insights.cel_mai_activ_mecanic.nume} - ${insights.cel_mai_activ_mecanic.venit.toLocaleString('ro-MD')} MDL în ${insights.cel_mai_activ_mecanic.fise} fișe`}
                                />
                            )}
                        </div>

                        {/* Recomandări Restock */}
                        {insights.recomandari_restock.length > 0 && (
                            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                                <h3 className="font-semibold text-amber-400 mb-2 flex items-center gap-2">
                                    <Zap className="w-4 h-4" /> Recomandări Reaprovizionare
                                </h3>
                                <div className="space-y-2">
                                    {insights.recomandari_restock.map((rec, idx) => (
                                        <p key={idx} className="text-sm text-slate-300">
                                            • {rec.mesaj}
                                        </p>
                                    ))}
                                </div>
                            </div>
                        )}
                    </section>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    SECȚIUNEA VÂNZĂRI DIN STOC
                ═══════════════════════════════════════════════════════════ */}
                <SectionHeader
                    title="Vânzări Anvelope din Stoc"
                    icon={<ShoppingCart className="w-5 h-5" />}
                    expanded={expandedSections.has('vanzari')}
                    onToggle={() => toggleSection('vanzari')}
                    disabled={!hasVanzari}
                    error={stockError}
                />
                {expandedSections.has('vanzari') && (
                    <div className="space-y-6">
                        {/* Eroare secțiune */}
                        {stockError && (
                            <SectionError 
                                message="Nu s-au putut încărca vânzările din stoc" 
                                error={stockError}
                            />
                        )}

                        {/* KPI Vânzări */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard label="Total Bucăți" value={kpi.stoc_bucati} color="blue" />
                            <StatCard label="Venit Stoc" value={`${kpi.stoc_venit.toLocaleString('ro-MD')} MDL`} color="green" />
                            <StatCard label="Profit Stoc" value={`${kpi.stoc_profit.toLocaleString('ro-MD')} MDL`} color="orange" />
                            <StatCard label="Tranzacții" value={kpi.stoc_tranzactii} color="purple" />
                        </div>

                        {/* Conținut doar dacă avem date */}
                        {hasVanzari ? (
                            <>
                                {/* Top Branduri și Dimensiuni */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <TopListCard title="Top Branduri Vândute" items={data.top.branduri} icon={<Package className="w-4 h-4" />} />
                                    <TopListCard title="Top Dimensiuni Vândute" items={data.top.dimensiuni} icon={<Car className="w-4 h-4" />} />
                                </div>

                                {/* Tabel Vânzări */}
                                <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
                                    <div className="p-4 border-b border-slate-700">
                                        <h3 className="font-semibold">Detaliu Tranzacții Vânzări</h3>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-slate-900/50">
                                                <tr>
                                                    <th className="text-left p-3 text-slate-400 font-medium">Data</th>
                                                    <th className="text-left p-3 text-slate-400 font-medium">Produs</th>
                                                    <th className="text-center p-3 text-slate-400 font-medium">Cant.</th>
                                                    <th className="text-right p-3 text-slate-400 font-medium">Vânzare</th>
                                                    <th className="text-right p-3 text-slate-400 font-medium">Profit</th>
                                                    <th className="text-left p-3 text-slate-400 font-medium">Client</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.vanzari.slice(0, 10).map((v) => (
                                                    <tr key={v.id} className="border-t border-slate-700/50 hover:bg-slate-700/30">
                                                        <td className="p-3 text-slate-300">{new Date(v.data).toLocaleDateString('ro-MD')}</td>
                                                        <td className="p-3">
                                                            <div className="font-medium">{v.brand}</div>
                                                            <div className="text-xs text-slate-400">{v.dimensiune}</div>
                                                        </td>
                                                        <td className="p-3 text-center">{v.cantitate}</td>
                                                        <td className="p-3 text-right">{(v.pret_vanzare * v.cantitate).toLocaleString('ro-MD')}</td>
                                                        <td className="p-3 text-right text-green-400 font-medium">+{v.profit_total.toLocaleString('ro-MD')}</td>
                                                        <td className="p-3 text-slate-400">{v.client || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {data.vanzari.length > 10 && (
                                        <div className="p-3 text-center text-slate-400 text-sm border-t border-slate-700">
                                            ... și încă {data.vanzari.length - 10} tranzacții
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : !stockError && (
                            <EmptyState message="Nu există vânzări de anvelope din stoc în luna selectată" />
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    SECȚIUNEA SERVICII
                ═══════════════════════════════════════════════════════════ */}
                <SectionHeader
                    title="Servicii Lunare"
                    icon={<Wrench className="w-5 h-5" />}
                    expanded={expandedSections.has('servicii')}
                    onToggle={() => toggleSection('servicii')}
                    disabled={!hasServicii}
                    error={serviciiError}
                />
                {expandedSections.has('servicii') && (
                    <div className="space-y-6">
                        {/* Eroare secțiune */}
                        {serviciiError && (
                            <SectionError 
                                message="Nu s-au putut încărca fișele service" 
                                error={serviciiError}
                            />
                        )}

                        {/* KPI Servicii */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <StatCard label="Vulcanizare" value={`${data.servicii.total_vulcanizare.toLocaleString('ro-MD')} MDL`} color="orange" />
                            <StatCard label="A/C" value={`${data.servicii.total_ac.toLocaleString('ro-MD')} MDL`} color="blue" />
                            <StatCard label="Frână" value={`${data.servicii.total_frana.toLocaleString('ro-MD')} MDL`} color="red" />
                            <StatCard label="Jante" value={`${data.servicii.total_jante.toLocaleString('ro-MD')} MDL`} color="purple" />
                            <StatCard label="Hotel Svc" value={`${data.servicii.total_hotel.toLocaleString('ro-MD')} MDL`} color="green" />
                            <StatCard label="Total" value={`${kpi.servicii_total.toLocaleString('ro-MD')} MDL`} color="yellow" />
                        </div>

                        {/* Conținut doar dacă avem date */}
                        {hasServicii ? (
                            <>
                                {/* Top Mecanici */}
                                {data.top.mecanici.length > 0 && (
                                    <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                                            <Users className="w-4 h-4 text-blue-400" /> Top Mecanici
                                        </h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {data.top.mecanici.map((m, idx) => (
                                                <div key={m.nume} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                                                        idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                                                        idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                                                        idx === 2 ? 'bg-amber-600/20 text-amber-500' :
                                                        'bg-slate-700 text-slate-400'
                                                    }`}>
                                                        {idx + 1}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="font-medium">{m.nume}</div>
                                                        <div className="text-xs text-slate-400">{m.fise} fișe</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-semibold text-green-400">{m.venit.toLocaleString('ro-MD')}</div>
                                                        <div className="text-xs text-slate-400">MDL</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : !serviciiError && (
                            <EmptyState message="Nu există fișe service în luna selectată" />
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    SECȚIUNEA HOTEL
                ═══════════════════════════════════════════════════════════ */}
                <SectionHeader
                    title="Hotel Anvelope"
                    icon={<Hotel className="w-5 h-5" />}
                    expanded={expandedSections.has('hotel')}
                    onToggle={() => toggleSection('hotel')}
                    disabled={!hasHotel}
                    error={hotelError}
                />
                {expandedSections.has('hotel') && (
                    <div className="space-y-4">
                        {/* Eroare secțiune */}
                        {hotelError && (
                            <SectionError 
                                message="Nu s-au putut încărca datele hotel" 
                                error={hotelError}
                            />
                        )}

                        {!hotelError && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <StatCard label="Seturi Active" value={kpi.hotel_active} color="blue" />
                                <StatCard label="Seturi Ridicate" value={kpi.hotel_ridicate} color="green" />
                                <StatCard label="Venit Hotel" value={`${kpi.hotel_venit.toLocaleString('ro-MD')} MDL`} color="orange" />
                                <StatCard label="Total Înregistrări" value={kpi.hotel_total} color="purple" />
                            </div>
                        )}

                        {!hasHotel && !hotelError && (
                            <EmptyState message="Nu există activitate hotel în luna selectată" />
                        )}
                    </div>
                )}

                {/* ═══════════════════════════════════════════════════════════
                    FOOTER
                ═══════════════════════════════════════════════════════════ */}
                <footer className="text-center text-slate-500 text-sm pt-8 border-t border-slate-800">
                    <p>ANVELOPE UNGHENI SRL • CF 102060004938</p>
                    <p className="mt-1">Mun. Ungheni, str. Decebal 62A/1 • Tel: 068263644 • anvelope-ungheni.md</p>
                    <p className="mt-2 text-xs">Raport generat la {new Date().toLocaleString('ro-MD')}</p>
                </footer>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE AJUTĂTOARE - Extended cu error handling
// ═══════════════════════════════════════════════════════════

function KPICard({ icon, label, value, subvalue, trend, color }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    subvalue: string;
    trend: 'up' | 'down';
    color: string;
}) {
    return (
        <div className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${color} shadow-lg`}>
            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-white/20 rounded-lg">{icon}</div>
                    <div className={`flex items-center gap-1 text-sm font-semibold ${
                        trend === 'up' ? 'text-green-200' : 'text-red-200'
                    }`}>
                        {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                        {subvalue}
                    </div>
                </div>
                <div className="text-2xl font-bold mb-1">{value}</div>
                <div className="text-sm text-white/80">{label}</div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full" />
        </div>
    );
}

function SecondaryKPI({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700">
            <div className="p-2 bg-slate-700 rounded-lg text-slate-400">{icon}</div>
            <div>
                <div className="text-xs text-slate-400">{label}</div>
                <div className="font-semibold">{value}</div>
            </div>
        </div>
    );
}

function SectionHeader({ title, icon, expanded, onToggle, disabled, error }: {
    title: string;
    icon: React.ReactNode;
    expanded: boolean;
    onToggle: () => void;
    disabled?: boolean;
    error?: string;
}) {
    return (
        <div 
            className={`flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border ${
                error ? 'border-red-500/50 bg-red-500/5' : 'border-slate-700'
            } cursor-pointer hover:bg-slate-800 transition ${disabled ? 'opacity-60' : ''}`}
            onClick={disabled ? undefined : onToggle}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${error ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                    {error ? <AlertTriangle className="w-5 h-5" /> : icon}
                </div>
                <div>
                    <h2 className="text-lg font-bold">{title}</h2>
                    {disabled && !error && <span className="text-xs text-slate-500">Nu există date</span>}
                    {error && <span className="text-xs text-red-400">Eroare la încărcare</span>}
                </div>
            </div>
            {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
        </div>
    );
}

function SectionError({ message, error }: { message: string; error?: string }) {
    return (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-red-400">{message}</h4>
                    {error && <p className="text-sm text-red-300/70 mt-1">{error}</p>}
                </div>
            </div>
        </div>
    );
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-300">
                {icon} {title}
            </h3>
            {children}
        </div>
    );
}

function InsightCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
    return (
        <div className="flex items-start gap-3 p-4 bg-slate-700/30 rounded-xl border border-slate-600/50">
            <div className="p-2 bg-slate-600/30 rounded-lg">{icon}</div>
            <div>
                <h4 className="font-medium text-slate-200">{title}</h4>
                <p className="text-sm text-slate-400 mt-1">{description}</p>
            </div>
        </div>
    );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
        green: 'bg-green-500/10 border-green-500/30 text-green-400',
        orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
        purple: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
        red: 'bg-red-500/10 border-red-500/30 text-red-400',
        yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    };

    return (
        <div className={`p-4 rounded-xl border ${colorClasses[color] || colorClasses.blue}`}>
            <div className="text-xs opacity-80 mb-1">{label}</div>
            <div className="text-xl font-bold">{value}</div>
        </div>
    );
}

function TopListCard({ title, items, icon }: { title: string; items: Array<[string, any]>; icon: React.ReactNode }) {
    if (items.length === 0) {
        return (
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-300">
                    {icon} {title}
                </h3>
                <EmptyState message="Nu există date disponibile" />
            </div>
        );
    }

    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700 p-4">
            <h3 className="font-semibold mb-4 flex items-center gap-2 text-slate-300">
                {icon} {title}
            </h3>
            <div className="space-y-2">
                {items.slice(0, 5).map(([name, value], idx) => (
                    <div key={name} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            idx === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                            idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                            idx === 2 ? 'bg-amber-600/20 text-amber-500' :
                            'bg-slate-700 text-slate-400'
                        }`}>
                            {idx + 1}
                        </div>
                        <div className="flex-1 text-sm">{name}</div>
                        <div className="text-sm font-semibold text-slate-300">
                            {typeof value === 'number' ? value : value.bucati || value}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="text-center py-12">
            <Info className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500">{message}</p>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// PDF GENERATOR
// ═══════════════════════════════════════════════════════════

async function generatePDF(data: RaportLunarData, setIsPrinting: (v: boolean) => void) {
    setIsPrinting(true);
    try {
        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

        const pageW = doc.internal.pageSize.getWidth();
        const pageH = doc.internal.pageSize.getHeight();
        const mL = 14, mR = 14;

        // Header
        doc.setFillColor(249, 115, 22);
        doc.rect(0, 0, pageW, 35, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text('ANVELOPE UNGHENI', mL, 15);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Raport Lunar Executiv - ${data.perioada.luna_nume} ${data.perioada.an}`, mL, 23);
        doc.text(`Generat: ${new Date().toLocaleDateString('ro-MD')}`, pageW - mR, 23, { align: 'right' });

        // KPI Cards
        let y = 42;
        const kpiCards = [
            { label: 'Venit Total', value: `${data.kpi.venit_total.toLocaleString('ro-MD')} MDL`, color: [34, 197, 94] },
            { label: 'Profit Total', value: `${data.kpi.profit_total.toLocaleString('ro-MD')} MDL`, color: [249, 115, 22] },
            { label: 'Bucăți Vândute', value: data.kpi.stoc_bucati.toString(), color: [59, 130, 246] },
            { label: 'Fișe Service', value: data.kpi.servicii_fise.toString(), color: [168, 85, 247] },
        ];

        const cardW = (pageW - mL - mR - 12) / 4;
        kpiCards.forEach((card, i) => {
            const cx = mL + i * (cardW + 4);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(cx, y, cardW, 18, 2, 2, 'F');
            doc.setFillColor(card.color[0], card.color[1], card.color[2]);
            doc.rect(cx, y, 3, 18, 'F');
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text(card.label, cx + 6, y + 6);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(card.color[0], card.color[1], card.color[2]);
            doc.text(card.value, cx + 6, y + 14);
        });

        y = 66;

        // Tabel Vânzări (doar dacă avem date)
        if (data.vanzari.length > 0) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(15, 23, 42);
            doc.text('Vânzări Anvelope din Stoc', mL, y);
            y += 4;

            autoTable(doc, {
                startY: y,
                head: [['Data', 'Produs', 'Dimensiune', 'Buc', 'Preț Vânz.', 'Profit']],
                body: data.vanzari.slice(0, 15).map(v => [
                    v.data,
                    v.brand,
                    v.dimensiune,
                    v.cantitate.toString(),
                    `${(v.pret_vanzare * v.cantitate).toLocaleString('ro-MD')} MDL`,
                    `+${v.profit_total.toLocaleString('ro-MD')} MDL`,
                ]),
                theme: 'grid',
                headStyles: { fillColor: [34, 197, 94], textColor: 255, fontSize: 8 },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: { 4: { halign: 'right' }, 5: { halign: 'right' } },
            });
        }

        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text('ANVELOPE UNGHENI SRL • anvelope-ungheni.md', pageW / 2, pageH - 6, { align: 'center' });
        }

        doc.save(`Raport_Lunar_${data.perioada.luna_nume}_${data.perioada.an}.pdf`);
    } catch (err) {
        console.error('PDF Error:', err);
    } finally {
        setIsPrinting(false);
    }
}
