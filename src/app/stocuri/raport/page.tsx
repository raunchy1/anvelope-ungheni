'use client';

import { useState, useEffect, useMemo } from 'react';
import { sezoane, tipuriAchizitie } from '@/lib/data';
import { FileText, Filter, Download, Loader2, ArrowLeft, TrendingUp, Printer, DollarSign, ArrowDownRight, BarChart3, Package, Calendar } from 'lucide-react';
import type { Anvelopa, MiscareStoc, TranzactieVanzare } from '@/types';
import Link from 'next/link';

export default function StocuriRaportPage() {
    const [anvelope, setAnvelope] = useState<Anvelopa[]>([]);
    const [miscari, setMiscari] = useState<MiscareStoc[]>([]);
    const [tranzactiiVanzare, setTranzactiiVanzare] = useState<TranzactieVanzare[]>([]);
    const [loading, setLoading] = useState(true);
    const [sezonFilter, setSezonFilter] = useState('Toate');
    const [tipFilter, setTipFilter] = useState('Toate');
    const [isPrinting, setIsPrinting] = useState(false);
    const [dataStart, setDataStart] = useState('');
    const [dataEnd, setDataEnd] = useState('');

    useEffect(() => {
        Promise.all([
            fetch('/api/stocuri').then(r => r.json()),
            fetch('/api/stocuri/miscari').then(r => r.json()),
            fetch('/api/statistica?perioada=an&include_service=true').then(r => r.json()).catch(() => null),
        ]).then(([s, m, statData]) => {
            setAnvelope(s);
            setMiscari(m);
            if (statData?.success) {
                setTranzactiiVanzare(statData.tranzactii || []);
            }
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    // Profit realizat din ieșiri efective
    const profitRealizat = useMemo(() => {
        return miscari
            .filter(m => m.tip === 'iesire' && m.profit_total)
            .reduce((s, m) => s + (m.profit_total || 0), 0);
    }, [miscari]);

    // Ieșiri cu profit (toate)
    const iesiriCuProfit = useMemo(() => {
        return miscari
            .filter(m => m.tip === 'iesire' && m.profit_total)
            .sort((a, b) => b.data.localeCompare(a.data))
            .map(m => {
                const anv = anvelope.find(a => a.id === m.anvelopa_id);
                return { ...m, anvelopa: anv };
            });
    }, [miscari, anvelope]);

    // Vânzări filtrate după dată
    const vanzariFiltrate = useMemo(() => {
        if (!dataStart && !dataEnd) return tranzactiiVanzare;
        return tranzactiiVanzare.filter(t => {
            if (dataStart && t.data < dataStart) return false;
            if (dataEnd && t.data > dataEnd) return false;
            return true;
        });
    }, [tranzactiiVanzare, dataStart, dataEnd]);

    const filtered = useMemo(() => {
        let data = [...anvelope];
        if (sezonFilter !== 'Toate') data = data.filter(a => a.sezon === sezonFilter);
        if (tipFilter !== 'Toate') data = data.filter(a => a.tip_achizitie === tipFilter);
        return data;
    }, [sezonFilter, tipFilter, anvelope]);

    const totalBucati = filtered.reduce((s, a) => s + a.cantitate, 0);
    const valoareVanzare = filtered.reduce((s, a) => s + (a.pret_vanzare * a.cantitate), 0);
    const valoareAchizitie = filtered.reduce((s, a) => s + (a.pret_achizitie * a.cantitate), 0);
    const profit = valoareVanzare - valoareAchizitie;
    const marjaMedie = valoareAchizitie > 0 ? ((profit / valoareAchizitie) * 100).toFixed(1) : '0';
    const totalIesiri = miscari.filter(m => m.tip === 'iesire').reduce((s, m) => s + m.cantitate, 0);

    // Totaluri pentru vânzările filtrate
    const totalVanzariFiltrate = {
        bucati: vanzariFiltrate.reduce((s, t) => s + t.cantitate, 0),
        vanzari: vanzariFiltrate.reduce((s, t) => s + (t.pret_vanzare * t.cantitate), 0),
        profit: vanzariFiltrate.reduce((s, t) => s + t.profit_total, 0),
        count: vanzariFiltrate.length,
    };

    // Group by brand for summary
    const brandSummary = useMemo(() => {
        const map = new Map<string, { count: number; qty: number; val: number }>();
        filtered.forEach(a => {
            const entry = map.get(a.brand) || { count: 0, qty: 0, val: 0 };
            entry.count++;
            entry.qty += a.cantitate;
            entry.val += a.pret_vanzare * a.cantitate;
            map.set(a.brand, entry);
        });
        return Array.from(map.entries()).sort((a, b) => b[1].qty - a[1].qty);
    }, [filtered]);

    // Group vanzari by brand
    const brandVanzariSummary = useMemo(() => {
        const map = new Map<string, { cantitate: number; vanzari: number; profit: number; tranzactii: number }>();
        vanzariFiltrate.forEach(t => {
            const entry = map.get(t.brand) || { cantitate: 0, vanzari: 0, profit: 0, tranzactii: 0 };
            entry.cantitate += t.cantitate;
            entry.vanzari += t.pret_vanzare * t.cantitate;
            entry.profit += t.profit_total;
            entry.tranzactii += 1;
            map.set(t.brand, entry);
        });
        return Array.from(map.entries()).sort((a, b) => b[1].profit - a[1].profit);
    }, [vanzariFiltrate]);

    const generatePDF = async () => {
        setIsPrinting(true);
        try {
            const { jsPDF } = await import('jspdf');
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

            const pageW = doc.internal.pageSize.getWidth();
            const pageH = doc.internal.pageSize.getHeight();
            const mL = 14, mR = 14;
            const today = new Date().toLocaleDateString('ro-MD');

            // --- 1. Load logo as base64 ---
            let logoBase64: string | null = null;
            try {
                const logoImg = new Image();
                logoImg.src = '/logo-transparent.png';
                await new Promise<void>((resolve, reject) => {
                    logoImg.onload = () => resolve();
                    logoImg.onerror = () => reject();
                });
                const canvas = document.createElement('canvas');
                canvas.width = logoImg.width;
                canvas.height = logoImg.height;
                canvas.getContext('2d')!.drawImage(logoImg, 0, 0);
                logoBase64 = canvas.toDataURL('image/png');
            } catch {
                // logo optional — continue without it
            }

            // --- 2. Header (y: 10–34mm) ---
            const logoSize = 18;
            const logoX = mL;
            const logoY = 8;
            if (logoBase64) {
                doc.addImage(logoBase64, 'PNG', logoX, logoY, logoSize, logoSize);
            }
            const textX = mL + (logoBase64 ? logoSize + 4 : 0);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.setTextColor(30, 30, 30);
            doc.text('ANVELOPE UNGHENI', textX, 13);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.setTextColor(90, 90, 90);
            doc.text('SRL • CF 102060004938', textX, 18);
            doc.text('Mun. Ungheni, str. Decebal 62A/1', textX, 22.5);
            doc.text('Tel: 068 263 644 • anvelope-ungheni.md', textX, 27);

            // Title right-aligned
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(16);
            doc.setTextColor(249, 115, 22);
            doc.text('RAPORT STOCURI ANVELOPE', pageW - mR, 14, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(90, 90, 90);
            doc.text(`Data: ${today}`, pageW - mR, 20, { align: 'right' });

            // Separator line
            doc.setDrawColor(249, 115, 22);
            doc.setLineWidth(0.5);
            doc.line(mL, 32, pageW - mR, 32);

            // --- 3. Summary cards (y: 36–54mm) ---
            const cardY = 36;
            const cardH = 18;
            const cardGap = 4;
            const totalCards = 5;
            const cardW = (pageW - mL - mR - (totalCards - 1) * cardGap) / totalCards;
            const cards = [
                { label: 'Total Bucăți', value: String(totalBucati), color: [59, 130, 246] as [number, number, number] },
                { label: 'Val. Vânzare', value: `${valoareVanzare.toLocaleString('en-US')} MDL`, color: [34, 197, 94] as [number, number, number] },
                { label: 'Val. Achiziție', value: `${valoareAchizitie.toLocaleString('en-US')} MDL`, color: [249, 115, 22] as [number, number, number] },
                { label: 'Profit Estimat', value: `${profit.toLocaleString('en-US')} MDL`, color: [34, 197, 94] as [number, number, number] },
                { label: 'Profit Realizat', value: `${profitRealizat.toLocaleString('en-US')} MDL`, color: [22, 163, 74] as [number, number, number] },
            ];
            cards.forEach((card, i) => {
                const cx = mL + i * (cardW + cardGap);
                doc.setFillColor(248, 249, 251);
                doc.setDrawColor(220, 220, 220);
                doc.setLineWidth(0.3);
                doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, 'FD');
                doc.setFillColor(...card.color);
                doc.rect(cx, cardY, 3, cardH, 'F');
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7);
                doc.setTextColor(110, 110, 110);
                doc.text(card.label, cx + 5, cardY + 6);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.setTextColor(...card.color);
                doc.text(card.value, cx + 5, cardY + 13);
            });

            // --- 4. Main table (startY: 57mm) ---
            const head = [['#', 'Brand', 'Dimensiune', 'Sezon', 'DOT', 'Raft', 'Buc', 'P.Ach.', 'P.Vân.', 'Profit/Un', 'Profit Tot.']];
            const body = filtered.map((a, idx) => [
                idx + 1,
                a.brand,
                a.dimensiune,
                a.sezon,
                a.dot || '—',
                a.locatie_raft || '—',
                a.cantitate,
                `${a.pret_achizitie.toLocaleString('en-US')}`,
                `${a.pret_vanzare.toLocaleString('en-US')}`,
                `${(a.pret_vanzare - a.pret_achizitie).toLocaleString('en-US')}`,
                `${((a.pret_vanzare - a.pret_achizitie) * a.cantitate).toLocaleString('en-US')}`,
            ]);

            const totalRow = [
                { content: 'TOTAL', colSpan: 6, styles: { fontStyle: 'bold' as const, halign: 'left' as const } },
                { content: String(totalBucati), styles: { fontStyle: 'bold' as const, halign: 'center' as const } },
                { content: '' },
                { content: '' },
                { content: '' },
                { content: `${profit.toLocaleString('en-US')} MDL`, styles: { fontStyle: 'bold' as const, halign: 'right' as const } },
            ];

            autoTable(doc, {
                startY: 57,
                head,
                body,
                foot: [totalRow],
                theme: 'grid',
                styles: {
                    fontSize: 7.5,
                    cellPadding: 2,
                    valign: 'middle',
                    overflow: 'linebreak',
                    font: 'helvetica',
                    textColor: [30, 30, 30],
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
                    textColor: [30, 30, 30],
                    fontStyle: 'bold',
                    fontSize: 8,
                },
                alternateRowStyles: {
                    fillColor: [248, 249, 251],
                },
                columnStyles: {
                    0:  { cellWidth: 8,  halign: 'center' },
                    1:  { cellWidth: 40 },
                    2:  { cellWidth: 35 },
                    3:  { cellWidth: 22, halign: 'center' },
                    4:  { cellWidth: 18, halign: 'center' },
                    5:  { cellWidth: 28 },
                    6:  { cellWidth: 14, halign: 'center' },
                    7:  { cellWidth: 26, halign: 'right' },
                    8:  { cellWidth: 26, halign: 'right' },
                    9:  { cellWidth: 26, halign: 'right' },
                    10: { cellWidth: 30, halign: 'right' },
                },
            });

            // --- 5. VÂNZĂRI DIN STOC (pagina nouă) ---
            if (vanzariFiltrate.length > 0) {
                doc.addPage();
                
                // Header pentru pagina de vânzări
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(14);
                doc.setTextColor(15, 23, 42);
                doc.text('VÂNZĂRI ANVELOPE DIN STOC', mL, 20);
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(9);
                doc.setTextColor(90, 90, 90);
                const perioadaText = dataStart || dataEnd 
                    ? `Perioada: ${dataStart || '...'} - ${dataEnd || '...'}`
                    : `Toate vânzările (${vanzariFiltrate.length} tranzacții)`;
                doc.text(perioadaText, mL, 28);

                // KPI Vânzări
                const kpiY = 35;
                const kpiCardW = (pageW - mL - mR - 3 * 4) / 4;
                const kpiCards = [
                    { label: 'Total Bucăți', value: totalVanzariFiltrate.bucati.toString(), color: [59, 130, 246] },
                    { label: 'Total Vânzări', value: `${totalVanzariFiltrate.vanzari.toLocaleString('en-US')} MDL`, color: [251, 191, 36] },
                    { label: 'Total Profit', value: `${totalVanzariFiltrate.profit.toLocaleString('en-US')} MDL`, color: [34, 197, 94] },
                    { label: 'Tranzacții', value: totalVanzariFiltrate.count.toString(), color: [168, 85, 247] },
                ];
                
                kpiCards.forEach((card, i) => {
                    const cx = mL + i * (kpiCardW + 4);
                    doc.setFillColor(248, 249, 251);
                    doc.roundedRect(cx, kpiY, kpiCardW, 16, 2, 2, 'F');
                    doc.setFillColor(card.color[0], card.color[1], card.color[2]);
                    doc.rect(cx, kpiY, 2, 16, 'F');
                    doc.setFontSize(6);
                    doc.setTextColor(110, 110, 110);
                    doc.text(card.label, cx + 4, kpiY + 5);
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(9);
                    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
                    doc.text(card.value, cx + 4, kpiY + 12);
                    doc.setFont('helvetica', 'normal');
                });

                // Tabel vânzări
                const vanzariHead = [['Data', 'Brand', 'Dimensiune', 'Buc', 'Preț Ach.', 'Preț Vânz.', 'Profit/buc', 'Profit Total', 'Client/Mecanic']];
                const vanzariBody = vanzariFiltrate.map(t => [
                    t.data,
                    t.brand,
                    t.dimensiune,
                    t.cantitate.toString(),
                    `${t.pret_achizitie.toLocaleString('en-US')}`,
                    `${t.pret_vanzare.toLocaleString('en-US')}`,
                    `${t.profit_per_bucata.toLocaleString('en-US')}`,
                    `${t.profit_total.toLocaleString('en-US')}`,
                    t.client || t.mecanic || '-',
                ]);

                autoTable(doc, {
                    startY: 56,
                    head: vanzariHead,
                    body: vanzariBody,
                    theme: 'grid',
                    styles: {
                        fontSize: 7,
                        cellPadding: 2,
                        valign: 'middle',
                        font: 'helvetica',
                    },
                    headStyles: {
                        fillColor: [34, 197, 94],
                        textColor: 255,
                        fontStyle: 'bold',
                        fontSize: 8,
                    },
                    alternateRowStyles: {
                        fillColor: [240, 253, 244],
                    },
                    columnStyles: {
                        0: { cellWidth: 22 },
                        1: { cellWidth: 35 },
                        2: { cellWidth: 28 },
                        3: { cellWidth: 12, halign: 'center' },
                        4: { cellWidth: 22, halign: 'right' },
                        5: { cellWidth: 24, halign: 'right' },
                        6: { cellWidth: 22, halign: 'right' },
                        7: { cellWidth: 24, halign: 'right' },
                        8: { cellWidth: 35 },
                    },
                });

                // Top Branduri Vândute
                const finalY = (doc as any).lastAutoTable.finalY + 8;
                if (finalY < pageH - 30 && brandVanzariSummary.length > 0) {
                    doc.setFont('helvetica', 'bold');
                    doc.setFontSize(11);
                    doc.setTextColor(15, 23, 42);
                    doc.text('Top Branduri Vândute', mL, finalY + 5);

                    autoTable(doc, {
                        startY: finalY + 8,
                        head: [['Brand', 'Bucăți', 'Vânzări', 'Profit', 'Tranzacții']],
                        body: brandVanzariSummary.slice(0, 5).map(([brand, data]) => [
                            brand,
                            data.cantitate.toString(),
                            `${data.vanzari.toLocaleString('en-US')} MDL`,
                            `${data.profit.toLocaleString('en-US')} MDL`,
                            data.tranzactii.toString(),
                        ]),
                        theme: 'striped',
                        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
                        styles: { fontSize: 8 },
                        columnStyles: {
                            2: { halign: 'right' },
                            3: { halign: 'right' },
                        }
                    });
                }
            }

            // Footer pe toate paginile
            const pageCount = doc.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.setFont('helvetica', 'normal');
                doc.text('anvelope-ungheni.md', mL, pageH - 6);
                doc.text(`Pagina ${i} / ${pageCount}`, pageW - mR, pageH - 6, { align: 'right' });
            }

            doc.save(`Raport_Stocuri_${today.replaceAll('.', '-')}.pdf`);
        } catch (err) {
            console.error('PDF Error:', err);
            alert('Eroare la generarea PDF-ului');
        } finally {
            setIsPrinting(false);
        }
    };

    if (loading) {
        return (
            <div className="fade-in" style={{ textAlign: 'center', padding: 60 }}>
                <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: 'var(--blue)' }} />
            </div>
        );
    }

    return (
        <div className="fade-in">
            <style>{`
                @media print {
                    @page { size: A4 landscape; margin: 20mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    .glass-btn, .glass-btn-primary, button { display: none !important; }
                    .fade-in { padding: 0 !important; }
                }
            `}</style>
            <Link href="/stocuri" style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                <ArrowLeft size={14} /> Înapoi la Dashboard Stocuri
            </Link>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FileText size={28} color="var(--blue)" /> Raport Stocuri
                </h1>
                <div style={{ display: 'flex', gap: 10 }}>
                    <Link href="/stocuri/statistica" className="glass-btn" style={{ textDecoration: 'none' }}>
                        <BarChart3 size={18} /> Statistică Vânzări
                    </Link>
                    <button onClick={generatePDF} className="glass-btn glass-btn-primary" disabled={isPrinting}>
                        {isPrinting ? <Loader2 className="animate-spin" size={18} /> : <Printer size={18} />}
                        {isPrinting ? 'Se generează...' : 'Descarcă PDF'}
                    </button>
                </div>
            </div>

            {/* Quick Links */}
            <div className="glass" style={{ padding: 20, marginBottom: 20, background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(34,197,94,0.05))' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <BarChart3 size={24} color="var(--blue)" />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>Statistici Avansate de Vânzări</div>
                        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Vizualizează rapoarte detaliate cu profit per tranzacție, filtre pe perioade, și grafice.</div>
                    </div>
                    <Link href="/stocuri/statistica" className="glass-btn glass-btn-primary" style={{ textDecoration: 'none' }}>
                        Deschide Statistica →
                    </Link>
                </div>
            </div>

            {/* Filters */}
            <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><Filter size={16} color="var(--blue)" /> <span style={{ fontWeight: 600 }}>Filtre Stoc</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                    <div><label className="form-label">Sezon</label><select className="glass-select" value={sezonFilter} onChange={e => setSezonFilter(e.target.value)}><option>Toate</option>{sezoane.map(s => <option key={s}>{s}</option>)}</select></div>
                    <div><label className="form-label">Tip Achiziție</label><select className="glass-select" value={tipFilter} onChange={e => setTipFilter(e.target.value)}><option>Toate</option>{tipuriAchizitie.map(t => <option key={t}>{t}</option>)}</select></div>
                </div>
            </div>

            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 12, marginBottom: 24 }}>
                <div className="stat-card"><div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Total Bucăți</div><div style={{ fontSize: 28, fontWeight: 800, color: 'var(--blue)' }}>{totalBucati}</div></div>
                <div className="stat-card"><div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Valoare Vânzare</div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>{valoareVanzare.toLocaleString('ro-MD')} MDL</div></div>
                <div className="stat-card"><div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Valoare Achiziție</div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--orange)' }}>{valoareAchizitie.toLocaleString('ro-MD')} MDL</div></div>
                <div className="stat-card"><div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Profit Estimat</div><div style={{ fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>{profit.toLocaleString('ro-MD')} MDL</div></div>
                <div className="stat-card"><div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Marjă Medie</div><div style={{ fontSize: 22, fontWeight: 800, color: Number(marjaMedie) > 30 ? 'var(--green)' : 'var(--orange)' }}>{marjaMedie}%</div></div>
                <div className="stat-card" style={{ border: '1px solid rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.05)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <DollarSign size={12} color="var(--green)" /> Profit Realizat
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--green)' }}>{profitRealizat.toLocaleString('ro-MD')} MDL</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>{totalIesiri} buc vândute</div>
                </div>
            </div>

            {/* Brand Summary */}
            <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={18} color="var(--blue)" /> Sumar pe Brand (Stoc)
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    {brandSummary.map(([brand, data]) => (
                        <div key={brand} style={{
                            padding: 12, borderRadius: 12,
                            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                        }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{brand}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {data.count} produse • {data.qty} buc • {data.val.toLocaleString('ro-MD')} MDL
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detail Table */}
            <div className="glass" style={{ overflow: 'auto', marginBottom: 20 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                        {['#', 'Brand', 'Dimensiune', 'Sezon', 'DOT', 'Raft', 'Buc', 'Tip', 'Val. Achiziție', 'Val. Vânzare', 'Profit'].map(h => (
                            <th key={h} style={{ padding: '12px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                    </tr></thead>
                    <tbody>{filtered.map((a, i) => {
                        const va = a.pret_achizitie * a.cantitate;
                        const vv = a.pret_vanzare * a.cantitate;
                        const p = vv - va;
                        return (
                            <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: 10, color: 'var(--text-dim)' }}>{i + 1}</td>
                                <td style={{ padding: 10, fontWeight: 600 }}>{a.brand}</td>
                                <td style={{ padding: 10 }}>{a.dimensiune}</td>
                                <td style={{ padding: 10 }}>{a.sezon}</td>
                                <td style={{ padding: 10, color: 'var(--text-dim)' }}>{a.dot}</td>
                                <td style={{ padding: 10 }}>{a.locatie_raft}</td>
                                <td style={{ padding: 10, fontWeight: 600, color: a.cantitate <= 4 ? 'var(--orange)' : 'var(--text)' }}>{a.cantitate}</td>
                                <td style={{ padding: 10 }}><span className={`badge ${a.tip_achizitie === 'Cu factură' ? 'badge-green' : 'badge-orange'}`}>{a.tip_achizitie === 'Cu factură' ? 'Factură' : 'Cash'}</span></td>
                                <td style={{ padding: 10 }}>{va.toLocaleString('ro-MD')}</td>
                                <td style={{ padding: 10, fontWeight: 500 }}>{vv.toLocaleString('ro-MD')}</td>
                                <td style={{ padding: 10, fontWeight: 600, color: 'var(--green)' }}>{p.toLocaleString('ro-MD')}</td>
                            </tr>
                        );
                    })}</tbody>
                    <tfoot>
                        <tr style={{ borderTop: '2px solid var(--glass-border)' }}>
                            <td colSpan={6} style={{ padding: 12, fontWeight: 700 }}>TOTAL</td>
                            <td style={{ padding: 12, fontWeight: 800, color: 'var(--blue)' }}>{totalBucati}</td>
                            <td></td>
                            <td style={{ padding: 12, fontWeight: 700 }}>{valoareAchizitie.toLocaleString('ro-MD')}</td>
                            <td style={{ padding: 12, fontWeight: 700 }}>{valoareVanzare.toLocaleString('ro-MD')}</td>
                            <td style={{ padding: 12, fontWeight: 800, color: 'var(--green)' }}>{profit.toLocaleString('ro-MD')}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* VÂNZĂRI DIN STOC - TABEL NOU */}
            {vanzariFiltrate.length > 0 && (
                <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
                        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Package size={20} color="var(--green)" />
                            VÂNZĂRI ANVELOPE DIN STOC ({vanzariFiltrate.length} tranzacții)
                        </h3>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <input 
                                type="date" 
                                className="glass-input"
                                value={dataStart}
                                onChange={e => setDataStart(e.target.value)}
                                placeholder="De la"
                            />
                            <input 
                                type="date" 
                                className="glass-input"
                                value={dataEnd}
                                onChange={e => setDataEnd(e.target.value)}
                                placeholder="Până la"
                            />
                        </div>
                    </div>

                    {/* KPI Cards pentru vânzări */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
                        <div style={{ padding: 16, background: 'rgba(59,130,246,0.08)', borderRadius: 12, border: '1px solid rgba(59,130,246,0.2)' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Bucăți Vândute</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#3b82f6' }}>{totalVanzariFiltrate.bucati}</div>
                        </div>
                        <div style={{ padding: 16, background: 'rgba(251,191,36,0.08)', borderRadius: 12, border: '1px solid rgba(251,191,36,0.2)' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Vânzări</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#fbbf24' }}>{totalVanzariFiltrate.vanzari.toLocaleString('ro-MD')} MDL</div>
                        </div>
                        <div style={{ padding: 16, background: 'rgba(34,197,94,0.08)', borderRadius: 12, border: '1px solid rgba(34,197,94,0.2)' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total Profit</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#22c55e' }}>{totalVanzariFiltrate.profit.toLocaleString('ro-MD')} MDL</div>
                        </div>
                        <div style={{ padding: 16, background: 'rgba(168,85,247,0.08)', borderRadius: 12, border: '1px solid rgba(168,85,247,0.2)' }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Număr Tranzacții</div>
                            <div style={{ fontSize: 24, fontWeight: 800, color: '#a855f7' }}>{totalVanzariFiltrate.count}</div>
                        </div>
                    </div>

                    {/* Tabel Vânzări */}
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
                                {vanzariFiltrate.slice(0, 50).map((t) => (
                                    <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '10px' }}>
                                            <div style={{ fontWeight: 500 }}>{t.data}</div>
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            <div style={{ fontWeight: 600 }}>{t.brand}</div>
                                            <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{t.dimensiune}</div>
                                        </td>
                                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 700 }}>{t.cantitate}</td>
                                        <td style={{ padding: '10px', textAlign: 'right', color: 'var(--text-dim)' }}>{t.pret_achizitie.toLocaleString('ro-MD')}</td>
                                        <td style={{ padding: '10px', textAlign: 'right' }}>{t.pret_vanzare.toLocaleString('ro-MD')}</td>
                                        <td style={{ padding: '10px', textAlign: 'right', color: '#22c55e' }}>+{t.profit_per_bucata.toLocaleString('ro-MD')}</td>
                                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#22c55e' }}>+{t.profit_total.toLocaleString('ro-MD')}</td>
                                        <td style={{ padding: '10px' }}>
                                            {t.client || t.mecanic ? (
                                                <div>
                                                    {t.client && <div style={{ fontWeight: 500 }}>{t.client}</div>}
                                                    {t.mecanic && <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{t.mecanic}</div>}
                                                </div>
                                            ) : (
                                                <span style={{ color: 'var(--text-dim)' }}>-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: '2px solid var(--glass-border)', background: 'rgba(34,197,94,0.05)' }}>
                                    <td colSpan={2} style={{ padding: '14px 10px', fontWeight: 700 }}>
                                        TOTAL ({vanzariFiltrate.length} tranzacții)
                                    </td>
                                    <td style={{ padding: '14px 10px', textAlign: 'center', fontWeight: 800, color: '#3b82f6' }}>
                                        {totalVanzariFiltrate.bucati}
                                    </td>
                                    <td colSpan={3}></td>
                                    <td style={{ padding: '14px 10px', textAlign: 'right', fontWeight: 800, color: '#22c55e', fontSize: 15 }}>
                                        +{totalVanzariFiltrate.profit.toLocaleString('ro-MD')} MDL
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {vanzariFiltrate.length > 50 && (
                        <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-dim)' }}>
                            ... și încă {vanzariFiltrate.length - 50} tranzacții. 
                            <Link href="/stocuri/statistica" style={{ color: 'var(--blue)', marginLeft: 8 }}>
                                Vezi toate în pagina de statistică →
                            </Link>
                        </div>
                    )}

                    {/* Top Branduri Vândute */}
                    {brandVanzariSummary.length > 0 && (
                        <div style={{ marginTop: 24 }}>
                            <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Top Branduri Vândute</h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                                {brandVanzariSummary.slice(0, 5).map(([brand, data]) => (
                                    <div key={brand} style={{
                                        padding: 12, borderRadius: 10,
                                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                                    }}>
                                        <div style={{ fontWeight: 600, marginBottom: 4 }}>{brand}</div>
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                            {data.cantitate} buc • {data.profit.toLocaleString('ro-MD')} MDL profit
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Profit din Ieșiri */}
            {iesiriCuProfit.length > 0 && (
                <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <DollarSign size={18} color="var(--green)" /> Profit din Ieșiri ({iesiriCuProfit.length} tranzacții)
                    </h3>
                    <div className="hide-mobile" style={{ overflow: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                            <thead><tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                {['Data', 'Produs', 'Motiv', 'Buc', 'Preț Achiziție', 'Preț Vânzare', 'Profit/buc', 'Profit Total'].map(h => (
                                    <th key={h} style={{ padding: '12px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr></thead>
                            <tbody>
                                {iesiriCuProfit.slice(0, 20).map(m => (
                                    <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: 10, color: 'var(--text-dim)' }}>{m.data}</td>
                                        <td style={{ padding: 10, fontWeight: 600 }}>{m.anvelopa ? `${m.anvelopa.brand} ${m.anvelopa.dimensiune}` : `#${m.anvelopa_id}`}</td>
                                        <td style={{ padding: 10, color: 'var(--text-muted)' }}>{m.motiv_iesire}</td>
                                        <td style={{ padding: 10, fontWeight: 600 }}>{m.cantitate}</td>
                                        <td style={{ padding: 10, color: 'var(--orange)' }}>{m.pret_achizitie?.toLocaleString('ro-MD')} MDL</td>
                                        <td style={{ padding: 10, color: 'var(--blue)' }}>{m.pret_vanzare?.toLocaleString('ro-MD')} MDL</td>
                                        <td style={{ padding: 10, color: 'var(--green)' }}>{m.profit_per_bucata?.toLocaleString('ro-MD')} MDL</td>
                                        <td style={{ padding: 10, fontWeight: 700, color: 'var(--green)' }}>{m.profit_total?.toLocaleString('ro-MD')} MDL</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: '2px solid var(--glass-border)' }}>
                                    <td colSpan={3} style={{ padding: 12, fontWeight: 700 }}>TOTAL PROFIT REALIZAT</td>
                                    <td style={{ padding: 12, fontWeight: 700 }}>{iesiriCuProfit.reduce((s, m) => s + m.cantitate, 0)}</td>
                                    <td colSpan={3}></td>
                                    <td style={{ padding: 12, fontWeight: 800, fontSize: 16, color: 'var(--green)' }}>{profitRealizat.toLocaleString('ro-MD')} MDL</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                    {/* Mobile cards */}
                    <div className="show-mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {iesiriCuProfit.slice(0, 10).map(m => (
                            <div key={m.id} style={{
                                padding: 12, borderRadius: 12,
                                background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ fontWeight: 600 }}>{m.anvelopa ? `${m.anvelopa.brand} ${m.anvelopa.dimensiune}` : `#${m.anvelopa_id}`}</span>
                                    <span style={{ fontWeight: 700, color: 'var(--green)' }}>+{m.profit_total?.toLocaleString('ro-MD')} MDL</span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>
                                    {m.data} • {m.cantitate} buc • {m.motiv_iesire} • Profit/buc: {m.profit_per_bucata} MDL
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
