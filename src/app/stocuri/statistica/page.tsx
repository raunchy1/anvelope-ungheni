'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
    BarChart3, TrendingUp, TrendingDown, Calendar, ArrowLeft, 
    Download, Printer, Package, DollarSign, Users, Filter,
    ChevronDown, ChevronUp, PieChart, Activity, Loader2,
    ShoppingCart, User, Car, Phone, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import type { DateStatistici, TranzactieVanzare } from '@/types';
import Link from 'next/link';

// ═══════════════════════════════════════════════════════════
// COMPONENTA PAGINA STATISTICA VÂNZĂRI
// ═══════════════════════════════════════════════════════════

export default function StatisticaVanzariPage() {
    // ─── STATE ───
    const [data, setData] = useState<DateStatistici | null>(null);
    const [loading, setLoading] = useState(true);
    const [perioada, setPerioada] = useState<string>('luna');
    const [lunaSelectata, setLunaSelectata] = useState<string>('2026-03');
    const [dataStart, setDataStart] = useState<string>('');
    const [dataEnd, setDataEnd] = useState<string>('');
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [brandFilter, setBrandFilter] = useState<string>('');
    const [sortBy, setSortBy] = useState<'data' | 'profit' | 'cantitate' | 'vanzare'>('data');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [isPrinting, setIsPrinting] = useState(false);
    const chartRef = useRef<HTMLCanvasElement>(null);

    // ─── LUNI DISPONIBILE ───
    const luniDisponibile = useMemo(() => {
        const luni = [];
        const now = new Date();
        for (let i = 0; i < 12; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const label = d.toLocaleDateString('ro-MD', { month: 'long', year: 'numeric' });
            luni.push({ value: val, label });
        }
        return luni;
    }, []);

    // ─── FETCH DATA ───
    useEffect(() => {
        fetchData();
    }, [perioada, lunaSelectata, dataStart, dataEnd]);

    const fetchData = async () => {
        setLoading(true);
        try {
            let url = `/api/statistica?perioada=${perioada}`;
            if (perioada === 'luna' && lunaSelectata) {
                url += `&luna=${lunaSelectata}`;
            }
            if (perioada === 'custom' && dataStart && dataEnd) {
                url += `&data_start=${dataStart}&data_end=${dataEnd}`;
            }
            
            const res = await fetch(url);
            const result = await res.json();
            if (result.success) {
                setData(result);
            }
        } catch (err) {
            console.error('Error fetching statistics:', err);
        } finally {
            setLoading(false);
        }
    };

    // ─── FILTERED & SORTED TRANZACȚII ───
    const filteredTranzactii = useMemo(() => {
        if (!data?.tranzactii) return [];
        let result = [...data.tranzactii];
        
        if (brandFilter) {
            result = result.filter(t => 
                t.brand.toLowerCase().includes(brandFilter.toLowerCase())
            );
        }
        
        result.sort((a, b) => {
            let valA: number | string, valB: number | string;
            switch (sortBy) {
                case 'profit':
                    valA = a.profit_total;
                    valB = b.profit_total;
                    break;
                case 'cantitate':
                    valA = a.cantitate;
                    valB = b.cantitate;
                    break;
                case 'vanzare':
                    valA = a.pret_vanzare * a.cantitate;
                    valB = b.pret_vanzare * b.cantitate;
                    break;
                default:
                    valA = a.data + ' ' + (a.created_at || '');
                    valB = b.data + ' ' + (b.created_at || '');
            }
            
            if (typeof valA === 'string') {
                return sortOrder === 'asc' 
                    ? valA.localeCompare(valB as string)
                    : (valB as string).localeCompare(valA);
            }
            return sortOrder === 'asc' 
                ? (valA as number) - (valB as number)
                : (valB as number) - (valA as number);
        });
        
        return result;
    }, [data?.tranzactii, brandFilter, sortBy, sortOrder]);

    // ─── TOGGLE ROW EXPANSION ───
    const toggleRow = (id: number) => {
        const newSet = new Set(expandedRows);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setExpandedRows(newSet);
    };

    // ─── GENERARE PDF ───
    const generatePDF = async () => {
        if (!data) return;
        setIsPrinting(true);
        
        try {
            const { jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            
            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const mL = 14, mR = 14;
            const today = new Date().toLocaleDateString('ro-MD');
            
            // Header
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(15, 23, 42);
            doc.text('ANVELOPE UNGHENI', mL, 15);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Raport Vânzări din Stoc`, mL, 22);
            doc.text(`Perioada: ${data.perioada.start} - ${data.perioada.end}`, mL, 28);
            doc.text(`Generat: ${today}`, pageW - mR, 28, { align: 'right' });
            
            // Linie separator
            doc.setDrawColor(249, 115, 22);
            doc.setLineWidth(0.5);
            doc.line(mL, 32, pageW - mR, 32);
            
            // KPI Cards
            const cardY = 38;
            const cardH = 20;
            const cardGap = 4;
            const cards = [
                { label: 'Total Bucăți', value: data.kpi.total_bucati_vandute.toLocaleString('ro-MD'), color: [59, 130, 246] },
                { label: 'Total Vânzări', value: `${data.kpi.total_vanzari_mdl.toLocaleString('ro-MD')} MDL`, color: [251, 191, 36] },
                { label: 'Total Profit', value: `${data.kpi.total_profit_mdl.toLocaleString('ro-MD')} MDL`, color: [34, 197, 94] },
                { label: 'Număr Tranzacții', value: data.kpi.numar_tranzactii.toString(), color: [168, 85, 247] },
            ];
            
            const cardW = (pageW - mL - mR - (cards.length - 1) * cardGap) / cards.length;
            cards.forEach((card, i) => {
                const cx = mL + i * (cardW + cardGap);
                doc.setFillColor(248, 249, 251);
                doc.setDrawColor(220, 220, 220);
                doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, 'FD');
                doc.setFillColor(card.color[0], card.color[1], card.color[2]);
                doc.rect(cx, cardY, 3, cardH, 'F');
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(110, 110, 110);
                doc.text(card.label, cx + 5, cardY + 6);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(card.color[0], card.color[1], card.color[2]);
                doc.text(card.value, cx + 5, cardY + 14);
            });
            
            // Tabel tranzacții
            const head = [['Data', 'Brand', 'Dimensiune', 'Buc', 'Preț Ach.', 'Preț Vânz.', 'Profit/buc', 'Profit Total', 'Client/Mecanic']];
            const body = filteredTranzactii.map(t => [
                t.data,
                t.brand,
                t.dimensiune,
                t.cantitate.toString(),
                `${t.pret_achizitie.toLocaleString('ro-MD')}`,
                `${t.pret_vanzare.toLocaleString('ro-MD')}`,
                `${t.profit_per_bucata.toLocaleString('ro-MD')}`,
                `${t.profit_total.toLocaleString('ro-MD')}`,
                t.client || t.mecanic || '-'
            ]);
            
            // Total row
            const totalProfit = filteredTranzactii.reduce((s, t) => s + t.profit_total, 0);
            const totalBucati = filteredTranzactii.reduce((s, t) => s + t.cantitate, 0);
            const totalVanzari = filteredTranzactii.reduce((s, t) => s + (t.pret_vanzare * t.cantitate), 0);
            
            autoTable(doc, {
                startY: 62,
                head,
                body,
                foot: [[
                    { content: 'TOTAL', colSpan: 3, styles: { fontStyle: 'bold', halign: 'left' } },
                    { content: totalBucati.toString(), styles: { fontStyle: 'bold', halign: 'center' } },
                    '', '', '', '',
                    { content: `${totalProfit.toLocaleString('ro-MD')} MDL`, styles: { fontStyle: 'bold', halign: 'right' } },
                    ''
                ]],
                theme: 'grid',
                styles: {
                    fontSize: 7.5,
                    cellPadding: 2,
                    valign: 'middle',
                    font: 'helvetica',
                },
                headStyles: {
                    fillColor: [249, 115, 22],
                    textColor: 255,
                    fontStyle: 'bold',
                    halign: 'center',
                    fontSize: 8,
                },
                footStyles: {
                    fillColor: [255, 243, 224],
                    fontStyle: 'bold',
                },
                alternateRowStyles: {
                    fillColor: [248, 249, 251],
                },
                columnStyles: {
                    0: { cellWidth: 22 },
                    1: { cellWidth: 35 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 12, halign: 'center' },
                    4: { cellWidth: 22, halign: 'right' },
                    5: { cellWidth: 24, halign: 'right' },
                    6: { cellWidth: 22, halign: 'right' },
                    7: { cellWidth: 24, halign: 'right' },
                    8: { cellWidth: 35 },
                },
                didDrawPage: (data: any) => {
                    const totalPages = doc.getNumberOfPages();
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text('anvelope-ungheni.md', mL, pageH - 6);
                    doc.text(`Pagina ${data.pageNumber} / ${totalPages}`, pageW - mR, pageH - 6, { align: 'right' });
                },
            });
            
            // Top Branduri
            const finalY = (doc as any).lastAutoTable.finalY + 10;
            if (finalY < pageH - 40 && data.branduri.length > 0) {
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.setTextColor(15, 23, 42);
                doc.text('Top Branduri', mL, finalY);
                
                autoTable(doc, {
                    startY: finalY + 4,
                    head: [['Brand', 'Bucăți', 'Vânzări', 'Profit']],
                    body: data.branduri.slice(0, 5).map(b => [
                        b.brand,
                        b.cantitate.toString(),
                        `${b.vanzari.toLocaleString('ro-MD')} MDL`,
                        `${b.profit.toLocaleString('ro-MD')} MDL`
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [15, 23, 42], textColor: 255 },
                    styles: { fontSize: 9 },
                    columnStyles: {
                        2: { halign: 'right' },
                        3: { halign: 'right' }
                    }
                });
            }
            
            doc.save(`Raport_Vanzari_${data.perioada.start}_${data.perioada.end}.pdf`);
        } catch (err) {
            console.error('PDF Error:', err);
        } finally {
            setIsPrinting(false);
        }
    };

    // ─── RENDER ───
    if (loading) {
        return (
            <div className="fade-in" style={{ textAlign: 'center', padding: 60 }}>
                <Loader2 className="animate-spin" size={48} style={{ margin: '0 auto', color: 'var(--blue)' }} />
                <div style={{ marginTop: 16, color: 'var(--text-muted)' }}>Se încarcă statisticile...</div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <style>{`
                @media print {
                    @page { size: A4 landscape; margin: 15mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .no-print { display: none !important; }
                }
            `}</style>
            
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <Link href="/stocuri" style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                        <ArrowLeft size={14} /> Înapoi la Stocuri
                    </Link>
                    <h1 style={{ fontSize: 26, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12, margin: 0 }}>
                        <BarChart3 size={32} color="var(--blue)" />
                        Statistica Vânzări Anvelope
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={generatePDF} disabled={isPrinting} className="glass-btn glass-btn-primary no-print">
                        {isPrinting ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
                        {isPrinting ? 'Se generează...' : 'Export PDF'}
                    </button>
                    <button onClick={() => window.print()} className="glass-btn no-print">
                        <Printer size={18} /> Print
                    </button>
                </div>
            </div>

            {/* Filtre Perioadă */}
            <div className="glass no-print" style={{ padding: 20, marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Filter size={16} color="var(--blue)" />
                    <span style={{ fontWeight: 600 }}>Filtre Perioadă</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                    {/* Select perioadă */}
                    <div>
                        <label className="form-label">Perioadă</label>
                        <select 
                            className="glass-select" 
                            value={perioada} 
                            onChange={e => setPerioada(e.target.value)}
                        >
                            <option value="azi">Astăzi</option>
                            <option value="ieri">Ieri</option>
                            <option value="saptamana">Săptămâna curentă</option>
                            <option value="luna">Lună selectată</option>
                            <option value="an">Anul curent</option>
                            <option value="custom">Interval custom</option>
                        </select>
                    </div>
                    
                    {/* Select lună */}
                    {perioada === 'luna' && (
                        <div>
                            <label className="form-label">Selectează Luna</label>
                            <select 
                                className="glass-select" 
                                value={lunaSelectata} 
                                onChange={e => setLunaSelectata(e.target.value)}
                            >
                                {luniDisponibile.map(l => (
                                    <option key={l.value} value={l.value}>{l.label}</option>
                                ))}
                            </select>
                        </div>
                    )}
                    
                    {/* Date custom */}
                    {perioada === 'custom' && (
                        <>
                            <div>
                                <label className="form-label">De la</label>
                                <input 
                                    type="date" 
                                    className="glass-input"
                                    value={dataStart}
                                    onChange={e => setDataStart(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="form-label">Până la</label>
                                <input 
                                    type="date" 
                                    className="glass-input"
                                    value={dataEnd}
                                    onChange={e => setDataEnd(e.target.value)}
                                />
                            </div>
                        </>
                    )}
                </div>
                
                {data && (
                    <div style={{ marginTop: 16, padding: 12, background: 'rgba(59,130,246,0.05)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.2)' }}>
                        <Calendar size={14} style={{ display: 'inline', marginRight: 8, color: 'var(--blue)' }} />
                        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                            Perioada analizată: <strong>{data.perioada.start}</strong> - <strong>{data.perioada.end}</strong> 
                            {' '}({data.perioada.zile} zile)
                        </span>
                    </div>
                )}
            </div>

            {data && (
                <>
                    {/* KPI Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
                        {/* Total Bucăți */}
                        <KPICard 
                            icon={<Package size={24} />}
                            label="Total Bucăți Vândute"
                            value={data.kpi.total_bucati_vandute.toLocaleString('ro-MD')}
                            color="#3b82f6"
                            comparativ={data.comparativ.bucati}
                        />
                        
                        {/* Total Vânzări */}
                        <KPICard 
                            icon={<ShoppingCart size={24} />}
                            label="Total Vânzări"
                            value={`${data.kpi.total_vanzari_mdl.toLocaleString('ro-MD')} MDL`}
                            color="#fbbf24"
                            comparativ={data.comparativ.vanzari}
                        />
                        
                        {/* Total Profit */}
                        <KPICard 
                            icon={<DollarSign size={24} />}
                            label="Total Profit"
                            value={`${data.kpi.total_profit_mdl.toLocaleString('ro-MD')} MDL`}
                            color="#22c55e"
                            comparativ={data.comparativ.profit}
                        />
                        
                        {/* Număr Tranzacții */}
                        <KPICard 
                            icon={<Activity size={24} />}
                            label="Număr Tranzacții"
                            value={data.kpi.numar_tranzactii.toString()}
                            color="#a855f7"
                            comparativ={data.comparativ.tranzactii}
                        />
                    </div>

                    {/* Grafice & Topuri */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20, marginBottom: 24 }}>
                        {/* Top Branduri */}
                        <div className="glass" style={{ padding: 20 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <PieChart size={18} color="var(--blue)" />
                                Top Branduri
                            </h3>
                            {data.branduri.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
                                    Nu există date
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {data.branduri.slice(0, 5).map((brand, idx) => (
                                        <div key={brand.brand} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ 
                                                width: 28, height: 28, borderRadius: '50%', 
                                                background: idx === 0 ? '#fbbf24' : idx === 1 ? '#94a3b8' : idx === 2 ? '#b45309' : 'rgba(255,255,255,0.1)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 12, fontWeight: 700, color: idx < 3 ? '#1e293b' : 'inherit'
                                            }}>
                                                {idx + 1}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600 }}>{brand.brand}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                                                    {brand.cantitate} buc • {brand.tranzactii} tranz.
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 700, color: '#22c55e' }}>
                                                    +{brand.profit.toLocaleString('ro-MD')} MDL
                                                </div>
                                                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                                                    {brand.vanzari.toLocaleString('ro-MD')} MDL
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Top Dimensiuni */}
                        <div className="glass" style={{ padding: 20 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <TrendingUp size={18} color="var(--green)" />
                                Top Dimensiuni
                            </h3>
                            {data.dimensiuni.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
                                    Nu există date
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {data.dimensiuni.slice(0, 5).map((dim, idx) => (
                                        <div key={dim.dimensiune} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ 
                                                width: 28, height: 28, borderRadius: '50%', 
                                                background: 'rgba(59,130,246,0.15)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 12, fontWeight: 700
                                            }}>
                                                {idx + 1}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 600 }}>{dim.dimensiune}</div>
                                                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                                                    {dim.cantitate} buc vândute
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontWeight: 700, color: '#22c55e' }}>
                                                    +{dim.profit.toLocaleString('ro-MD')} MDL
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Grafic Zilnic (dacă sunt mai multe zile) */}
                    {data.zilnic.length > 1 && (
                        <div className="glass" style={{ padding: 20, marginBottom: 24 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Activity size={18} color="var(--blue)" />
                                Evoluție Zilnică - Profit
                            </h3>
                            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120, padding: '10px 0' }}>
                                {data.zilnic.map((zi, idx) => {
                                    const maxProfit = Math.max(...data.zilnic.map(z => z.profit));
                                    const height = maxProfit > 0 ? (zi.profit / maxProfit) * 100 : 0;
                                    return (
                                        <div key={zi.data} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                                            <div 
                                                style={{ 
                                                    width: '100%', 
                                                    maxWidth: 40,
                                                    height: `${Math.max(height, 4)}px`, 
                                                    background: 'linear-gradient(to top, #22c55e, #4ade80)',
                                                    borderRadius: '4px 4px 0 0',
                                                    minHeight: 4
                                                }} 
                                                title={`${zi.data}: ${zi.profit.toLocaleString('ro-MD')} MDL`}
                                            />
                                            <div style={{ fontSize: 10, color: 'var(--text-dim)', transform: 'rotate(-45deg)', transformOrigin: 'top left' }}>
                                                {new Date(zi.data).getDate()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Tabel Tranzacții */}
                    <div className="glass" style={{ padding: 20, marginBottom: 24 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <ShoppingCart size={18} color="var(--blue)" />
                                Vânzări Anvelope din Stoc ({filteredTranzactii.length} tranzacții)
                            </h3>
                            <div className="no-print" style={{ display: 'flex', gap: 10 }}>
                                <input 
                                    type="text"
                                    placeholder="Filtrează după brand..."
                                    className="glass-input"
                                    value={brandFilter}
                                    onChange={e => setBrandFilter(e.target.value)}
                                    style={{ width: 200 }}
                                />
                                <select 
                                    className="glass-select"
                                    value={sortBy}
                                    onChange={e => setSortBy(e.target.value as any)}
                                >
                                    <option value="data">Sortează după Data</option>
                                    <option value="profit">Sortează după Profit</option>
                                    <option value="cantitate">Sortează după Cantitate</option>
                                    <option value="vanzare">Sortează după Vânzare</option>
                                </select>
                                <button 
                                    className="glass-btn"
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                >
                                    {sortOrder === 'asc' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                </button>
                            </div>
                        </div>

                        {filteredTranzactii.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
                                <Package size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
                                <h4>Nicio tranzacție găsită</h4>
                                <p>Nu există vânzări pentru perioada și filtrele selectate.</p>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                                    <thead>
                                        <tr style={{ borderBottom: '2px solid var(--glass-border)' }}>
                                            <th style={{ padding: '12px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Data</th>
                                            <th style={{ padding: '12px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Produs</th>
                                            <th style={{ padding: '12px 10px', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600 }}>Cant.</th>
                                            <th style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Preț Ach.</th>
                                            <th style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Preț Vânz.</th>
                                            <th style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Profit/buc</th>
                                            <th style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Profit Total</th>
                                            <th style={{ padding: '12px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Client / Mecanic</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTranzactii.map(tranzactie => (
                                            <TranzactieRow 
                                                key={tranzactie.id} 
                                                tranzactie={tranzactie}
                                                expanded={expandedRows.has(tranzactie.id)}
                                                onToggle={() => toggleRow(tranzactie.id)}
                                            />
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ borderTop: '2px solid var(--glass-border)', background: 'rgba(34,197,94,0.05)' }}>
                                            <td colSpan={2} style={{ padding: '14px 10px', fontWeight: 700 }}>
                                                TOTAL ({filteredTranzactii.length} tranzacții)
                                            </td>
                                            <td style={{ padding: '14px 10px', textAlign: 'center', fontWeight: 800, color: 'var(--blue)' }}>
                                                {filteredTranzactii.reduce((s, t) => s + t.cantitate, 0)}
                                            </td>
                                            <td colSpan={3}></td>
                                            <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 800, color: '#22c55e', fontSize: 15 }}>
                                                +{filteredTranzactii.reduce((s, t) => s + t.profit_total, 0).toLocaleString('ro-MD')} MDL
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Statistici Mecanici */}
                    {data.mecanici.length > 0 && (
                        <div className="glass" style={{ padding: 20, marginBottom: 24 }}>
                            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Users size={18} color="var(--blue)" />
                                Performanță pe Mecanici
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
                                {data.mecanici.map(mecanic => (
                                    <div key={mecanic.mecanic} style={{ 
                                        padding: 16, 
                                        background: 'rgba(255,255,255,0.03)', 
                                        borderRadius: 12,
                                        border: '1px solid var(--glass-border)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                                            <div style={{ 
                                                width: 36, height: 36, borderRadius: '50%',
                                                background: 'rgba(59,130,246,0.15)',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}>
                                                <User size={18} color="var(--blue)" />
                                            </div>
                                            <div style={{ fontWeight: 600 }}>{mecanic.mecanic}</div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <div>
                                                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Bucăți</div>
                                                <div style={{ fontWeight: 700 }}>{mecanic.cantitate}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Tranzacții</div>
                                                <div style={{ fontWeight: 700 }}>{mecanic.tranzactii}</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Vânzări</div>
                                                <div style={{ fontWeight: 700 }}>{mecanic.vanzari.toLocaleString('ro-MD')} MDL</div>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Profit</div>
                                                <div style={{ fontWeight: 700, color: '#22c55e' }}>+{mecanic.profit.toLocaleString('ro-MD')} MDL</div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE AJUTĂTOARE
// ═══════════════════════════════════════════════════════════

interface KPICardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
    comparativ?: {
        curent: number;
        anterior: number;
        diferenta: number;
        procent: string;
    };
}

function KPICard({ icon, label, value, color, comparativ }: KPICardProps) {
    const isPositive = comparativ ? comparativ.diferenta >= 0 : true;
    
    return (
        <div style={{ 
            padding: 24, 
            borderRadius: 16, 
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--glass-border)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            <div style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                right: 0, 
                height: 4, 
                background: color 
            }} />
            
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: 12, 
                    background: `${color}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: color
                }}>
                    {icon}
                </div>
                {comparativ && (
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 4,
                        padding: '6px 12px',
                        borderRadius: 20,
                        background: isPositive ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        color: isPositive ? '#22c55e' : '#ef4444',
                        fontSize: 12,
                        fontWeight: 600
                    }}>
                        {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        {Math.abs(Number(comparativ.procent)).toFixed(1)}%
                    </div>
                )}
            </div>
            
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color }}>{value}</div>
            
            {comparativ && comparativ.anterior > 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 8 }}>
                    vs {comparativ.anterior.toLocaleString('ro-MD')} perioada anterioară
                </div>
            )}
        </div>
    );
}

interface TranzactieRowProps {
    tranzactie: TranzactieVanzare;
    expanded: boolean;
    onToggle: () => void;
}

function TranzactieRow({ tranzactie, expanded, onToggle }: TranzactieRowProps) {
    return (
        <>
            <tr 
                style={{ 
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'pointer',
                    background: expanded ? 'rgba(59,130,246,0.05)' : 'transparent'
                }}
                onClick={onToggle}
            >
                <td style={{ padding: '12px 10px' }}>
                    <div style={{ fontWeight: 500 }}>{tranzactie.data}</div>
                    {tranzactie.created_at && (
                        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                            {new Date(tranzactie.created_at).toLocaleTimeString('ro-MD', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    )}
                </td>
                <td style={{ padding: '12px 10px' }}>
                    <div style={{ fontWeight: 600 }}>{tranzactie.brand}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{tranzactie.dimensiune}</div>
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 700 }}>
                    {tranzactie.cantitate}
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'right', color: 'var(--text-dim)' }}>
                    {tranzactie.pret_achizitie.toLocaleString('ro-MD')}
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 500 }}>
                    {tranzactie.pret_vanzare.toLocaleString('ro-MD')}
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'right', color: '#22c55e' }}>
                    +{tranzactie.profit_per_bucata.toLocaleString('ro-MD')}
                </td>
                <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>
                    +{tranzactie.profit_total.toLocaleString('ro-MD')}
                </td>
                <td style={{ padding: '12px 10px' }}>
                    {tranzactie.client ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <User size={14} color="var(--blue)" />
                            <span>{tranzactie.client}</span>
                        </div>
                    ) : tranzactie.mecanic ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Users size={14} color="var(--orange)" />
                            <span>{tranzactie.mecanic}</span>
                        </div>
                    ) : (
                        <span style={{ color: 'var(--text-dim)' }}>-</span>
                    )}
                    {expanded ? <ChevronUp size={16} style={{ float: 'right', color: 'var(--text-dim)' }} /> 
                              : <ChevronDown size={16} style={{ float: 'right', color: 'var(--text-dim)' }} />}
                </td>
            </tr>
            {expanded && (
                <tr style={{ background: 'rgba(59,130,246,0.03)' }}>
                    <td colSpan={8} style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Sezon</div>
                                <div style={{ fontWeight: 500 }}>{tranzactie.sezon}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>DOT</div>
                                <div style={{ fontWeight: 500 }}>{tranzactie.dot || '-'}</div>
                            </div>
                            {tranzactie.numar_masina && (
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Mașină</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Car size={14} />
                                        {tranzactie.numar_masina}
                                    </div>
                                </div>
                            )}
                            {tranzactie.telefon_client && (
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Telefon</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Phone size={14} />
                                        {tranzactie.telefon_client}
                                    </div>
                                </div>
                            )}
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 4 }}>Total Vânzare</div>
                                <div style={{ fontWeight: 700, color: 'var(--blue)' }}>
                                    {(tranzactie.pret_vanzare * tranzactie.cantitate).toLocaleString('ro-MD')} MDL
                                </div>
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
