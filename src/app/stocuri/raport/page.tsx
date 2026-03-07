'use client';

import { useState, useEffect, useMemo } from 'react';
import { sezoane, tipuriAchizitie } from '@/lib/data';
import { FileText, Filter, Download, Loader2, ArrowLeft, TrendingUp, Printer, DollarSign, ArrowDownRight } from 'lucide-react';
import type { Anvelopa, MiscareStoc } from '@/types';
import Link from 'next/link';

export default function StocuriRaportPage() {
    const [anvelope, setAnvelope] = useState<Anvelopa[]>([]);
    const [miscari, setMiscari] = useState<MiscareStoc[]>([]);
    const [loading, setLoading] = useState(true);
    const [sezonFilter, setSezonFilter] = useState('Toate');
    const [tipFilter, setTipFilter] = useState('Toate');
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch('/api/stocuri').then(r => r.json()),
            fetch('/api/stocuri/miscari').then(r => r.json()),
        ]).then(([s, m]) => {
            setAnvelope(s);
            setMiscari(m);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    // Profit realizat din ieșiri efective
    const profitRealizat = useMemo(() => {
        return miscari
            .filter(m => m.tip === 'iesire' && m.profit_total)
            .reduce((s, m) => s + (m.profit_total || 0), 0);
    }, [miscari]);

    const iesiriCuProfit = useMemo(() => {
        return miscari
            .filter(m => m.tip === 'iesire' && m.profit_total)
            .sort((a, b) => b.data.localeCompare(a.data))
            .map(m => {
                const anv = anvelope.find(a => a.id === m.anvelopa_id);
                return { ...m, anvelopa: anv };
            });
    }, [miscari, anvelope]);

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

    const generatePDF = async () => {
        setIsPrinting(true);
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

            const pageW = doc.internal.pageSize.getWidth();  // 297
            const pageH = doc.internal.pageSize.getHeight(); // 210
            const mL = 14, mR = 14;
            const usableW = pageW - mL - mR; // 269
            const today = new Date().toLocaleDateString('ro-MD');

            // ── Color palette ──
            const C = {
                darkBlue:   [15, 23, 42]   as [number,number,number],
                primaryBlue:[30, 64, 175]  as [number,number,number],
                lightBg:    [248, 250, 252] as [number,number,number],
                border:     [220, 228, 240] as [number,number,number],
                green:      [22, 163, 74]  as [number,number,number],
                orange:     [234, 88, 12]  as [number,number,number],
                zebra:      [241, 245, 249] as [number,number,number],
                text:       [15, 23, 42]   as [number,number,number],
                muted:      [100, 116, 139] as [number,number,number],
                white:      [255, 255, 255] as [number,number,number],
                footerBg:   [237, 242, 248] as [number,number,number],
                subText:    [148, 163, 184] as [number,number,number],
            };

            // ── Main table columns — fixed widths sum = 269mm ──
            const cols    = ['#', 'Brand', 'Dimensiune', 'Sezon', 'DOT', 'Buc', 'Preț Vânz.', 'Valoare', 'Profit'];
            const colW    = [12,   55,      35,           25,      20,    15,    35,            38,        34];
            // colW sum: 12+55+35+25+20+15+35+38+34 = 269 ✓
            const rightCols = new Set([5, 6, 7, 8]);
            const rowH = 7;
            const hdrH = 8;

            // ── Computed values ──
            const profitPercent = valoareAchizitie > 0 ? (profit / valoareAchizitie) * 100 : 0;

            const top5 = [...filtered]
                .map(a => ({
                    ...a,
                    valStoc: a.pret_vanzare * a.cantitate,
                    profitEst: (a.pret_vanzare - a.pret_achizitie) * a.cantitate,
                }))
                .sort((a, b) => b.valStoc - a.valStoc)
                .slice(0, 5);

            const allSezoane = ['Iarnă', 'Vară', 'All-Season'];
            const seasonTotals: Record<string, number> = {};
            allSezoane.forEach(s => {
                seasonTotals[s] = filtered
                    .filter(a => a.sezon === s || (s === 'All-Season' && (a.sezon as string) === 'Toate Anotimpurile'))
                    .reduce((sum, a) => sum + a.cantitate, 0);
            });
            const maxSeason = Math.max(...Object.values(seasonTotals), 1);

            // ── Helper: draw page header ──
            const drawPageHeader = () => {
                // Background
                doc.setFillColor(...C.darkBlue);
                doc.rect(0, 0, pageW, 22, 'F');
                // Accent line at bottom of header
                doc.setFillColor(...C.primaryBlue);
                doc.rect(0, 20, pageW, 2, 'F');

                // Left — company name
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(160, 190, 225);
                doc.text('SRL ANVELOPEN', mL, 8);

                // Center — main title
                doc.setFontSize(15);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...C.white);
                doc.text('RAPORT STOCURI ANVELOPE', pageW / 2, 12, { align: 'center' });

                // Right — date
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(160, 190, 225);
                doc.text(today, pageW - mR, 8, { align: 'right' });

                // Center subtitle
                const filterNote = [
                    sezonFilter !== 'Toate' ? `Sezon: ${sezonFilter}` : '',
                    tipFilter !== 'Toate' ? `Tip: ${tipFilter}` : '',
                ].filter(Boolean).join('  •  ');
                doc.setFontSize(7);
                doc.setTextColor(130, 165, 210);
                doc.text(filterNote || 'Inventar complet — toate produsele din stoc', pageW / 2, 18, { align: 'center' });
            };

            // ── Helper: draw footer ──
            const drawFooter = (pn: number, total: number) => {
                doc.setFillColor(...C.footerBg);
                doc.rect(0, pageH - 10, pageW, 10, 'F');
                doc.setDrawColor(...C.border);
                doc.setLineWidth(0.3);
                doc.line(mL, pageH - 10, pageW - mR, pageH - 10);
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...C.muted);
                doc.text('Anvelope Ungheni System  •  Raport generat automat', mL, pageH - 4);
                doc.text(`Pagina ${pn} / ${total}`, pageW - mR, pageH - 4, { align: 'right' });
            };

            // ── Helper: draw table header row ──
            const drawTableHeader = (y: number) => {
                doc.setFillColor(...C.primaryBlue);
                doc.rect(mL, y, usableW, hdrH, 'F');
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...C.white);
                let x = mL;
                cols.forEach((col, i) => {
                    rightCols.has(i)
                        ? doc.text(col, x + colW[i] - 2, y + 5.5, { align: 'right' })
                        : doc.text(col, x + 2, y + 5.5);
                    x += colW[i];
                });
                return y + hdrH;
            };

            // ── Helper: section title ──
            const drawSectionTitle = (label: string, y: number) => {
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...C.darkBlue);
                doc.text(label, mL, y);
                doc.setDrawColor(...C.primaryBlue);
                doc.setLineWidth(1);
                doc.line(mL, y + 1.5, mL + label.length * 1.7, y + 1.5);
                doc.setLineWidth(0.3);
            };

            // ═══════════════════════════════════════
            // PASS 1 — calculate total pages
            // ═══════════════════════════════════════
            const firstTableStartY = 150; // approximate Y where table starts on page 1
            const footerTop = pageH - 10;
            const firstPageRows = Math.floor((footerTop - firstTableStartY - hdrH) / rowH);
            const laterPageRows = Math.floor((footerTop - 22 - hdrH) / rowH);
            const remaining = Math.max(0, filtered.length - firstPageRows);
            const extraPages = remaining > 0 ? Math.ceil(remaining / laterPageRows) : 0;
            const totalPages = 1 + extraPages;

            // ═══════════════════════════════════════
            // PAGE 1 — header, cards, top5, seasons, table start
            // ═══════════════════════════════════════
            drawPageHeader();

            // ── Summary cards (5 cards) ──
            const cardY = 25;
            const cardH = 19;
            const gap = 3;
            const nCards = 5;
            const cardW = (usableW - gap * (nCards - 1)) / nCards; // ~51.4mm

            const cards = [
                { label: 'Total Bucăți',   value: String(totalBucati),                              color: C.primaryBlue },
                { label: 'Val. Vânzare',   value: `${valoareVanzare.toLocaleString('en-US')} MDL`,  color: C.green },
                { label: 'Val. Achiziție', value: `${valoareAchizitie.toLocaleString('en-US')} MDL`, color: C.orange },
                { label: 'Profit Estimat', value: `${profit.toLocaleString('en-US')} MDL`,           color: C.primaryBlue },
                { label: 'Profit %',       value: `${profitPercent.toFixed(1)}%`,                    color: profitPercent >= 20 ? C.green : C.orange },
            ];

            cards.forEach((card, i) => {
                const cx = mL + i * (cardW + gap);
                // Card background
                doc.setFillColor(...C.lightBg);
                doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, 'F');
                // Card border
                doc.setDrawColor(...C.border);
                doc.setLineWidth(0.3);
                doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, 'S');
                // Top accent
                doc.setDrawColor(...card.color);
                doc.setLineWidth(1.8);
                doc.line(cx + 2, cardY, cx + cardW - 2, cardY);
                doc.setLineWidth(0.3);
                // Label
                doc.setFontSize(6.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...C.muted);
                doc.text(card.label, cx + cardW / 2, cardY + 7, { align: 'center' });
                // Value
                const valFontSize = card.value.length > 14 ? 8.5 : card.value.length > 10 ? 10 : 12;
                doc.setFontSize(valFontSize);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...card.color);
                doc.text(card.value, cx + cardW / 2, cardY + 15, { align: 'center' });
            });

            // ── Top 5 section ──
            const t5Y = cardY + cardH + 6;
            drawSectionTitle('TOP 5 PRODUSE DUPĂ VALOARE STOC', t5Y + 4);

            // Top5 table columns — sum = 269
            const t5ColW = [10, 75, 30, 18, 42, 52, 42] as const;
            const t5Cols = ['#', 'Brand / Dimensiune', 'Sezon', 'Buc', 'Preț Vânz.', 'Valoare Stoc', 'Profit Est.'];
            const t5RightCols = new Set([3, 4, 5, 6]);

            const t5HdrY = t5Y + 8;
            doc.setFillColor(51, 83, 165);
            doc.rect(mL, t5HdrY, usableW, 7, 'F');
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...C.white);
            let t5x = mL;
            t5Cols.forEach((col, i) => {
                t5RightCols.has(i)
                    ? doc.text(col, t5x + t5ColW[i] - 2, t5HdrY + 5, { align: 'right' })
                    : doc.text(col, t5x + 2, t5HdrY + 5);
                t5x += t5ColW[i];
            });

            const t5RowH = 7;
            top5.forEach((a, idx) => {
                const ry = t5HdrY + 7 + idx * t5RowH;
                if (idx % 2 === 1) {
                    doc.setFillColor(...C.zebra);
                    doc.rect(mL, ry, usableW, t5RowH, 'F');
                }
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...C.text);

                const t5Row = [
                    String(idx + 1),
                    `${a.brand} ${a.dimensiune}`,
                    a.sezon,
                    String(a.cantitate),
                    `${a.pret_vanzare.toLocaleString('en-US')}`,
                    `${a.valStoc.toLocaleString('en-US')} MDL`,
                    `${a.profitEst.toLocaleString('en-US')} MDL`,
                ];
                let rx = mL;
                t5Row.forEach((cell, i) => {
                    const txt = doc.splitTextToSize(cell, t5ColW[i] - 4)[0] ?? '';
                    t5RightCols.has(i)
                        ? doc.text(txt, rx + t5ColW[i] - 2, ry + 5, { align: 'right' })
                        : doc.text(txt, rx + 2, ry + 5);
                    rx += t5ColW[i];
                });
            });

            // ── Season distribution ──
            const sdY = t5HdrY + 7 + top5.length * t5RowH + 5;
            drawSectionTitle('DISTRIBUȚIE STOC PE SEZON', sdY + 4);

            const barColors: Record<string, [number, number, number]> = {
                'Iarnă':      [59, 130, 246],
                'Vară':       [234, 179, 8],
                'All-Season': [34, 197, 94],
            };
            const barMaxW = 110;
            const barH = 5.5;
            const barLabelW = 32;
            let barY = sdY + 8;

            allSezoane.forEach(season => {
                const count = seasonTotals[season] ?? 0;
                const barW = (count / maxSeason) * barMaxW;
                const barColor = barColors[season] ?? C.muted;
                // Label
                doc.setFontSize(7);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...C.muted);
                doc.text(season, mL, barY + 4);
                // Track background
                doc.setFillColor(225, 232, 243);
                doc.roundedRect(mL + barLabelW, barY, barMaxW, barH, 1.5, 1.5, 'F');
                // Filled bar
                if (barW > 0.5) {
                    doc.setFillColor(...barColor);
                    doc.roundedRect(mL + barLabelW, barY, barW, barH, 1.5, 1.5, 'F');
                }
                // Count label
                doc.setFontSize(7);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...C.text);
                doc.text(`${count} buc`, mL + barLabelW + barMaxW + 3, barY + 4);
                barY += barH + 4.5;
            });

            // ── Main inventory table ──
            const tblTitleY = barY + 3;
            drawSectionTitle('INVENTAR COMPLET STOCURI', tblTitleY + 4);

            let y = drawTableHeader(tblTitleY + 8);
            let pageNum = 1;

            filtered.forEach((a, idx) => {
                if (y + rowH > footerTop) {
                    drawFooter(pageNum, totalPages);
                    doc.addPage();
                    pageNum++;
                    drawPageHeader();
                    y = drawTableHeader(24);
                }

                // Zebra striping
                if (idx % 2 === 1) {
                    doc.setFillColor(...C.zebra);
                    doc.rect(mL, y, usableW, rowH, 'F');
                }

                const profitRow = (a.pret_vanzare - a.pret_achizitie) * a.cantitate;
                const valRow    = a.pret_vanzare * a.cantitate;

                doc.setFont('helvetica', 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(...C.text);

                const row = [
                    String(idx + 1),
                    a.brand,
                    a.dimensiune,
                    a.sezon,
                    a.dot || '—',
                    String(a.cantitate),
                    a.pret_vanzare.toLocaleString('en-US'),
                    valRow.toLocaleString('en-US'),
                    profitRow.toLocaleString('en-US'),
                ];

                let x = mL;
                row.forEach((cell, i) => {
                    const txt = doc.splitTextToSize(cell, colW[i] - 3)[0] ?? '';
                    rightCols.has(i)
                        ? doc.text(txt, x + colW[i] - 2, y + 4.8, { align: 'right' })
                        : doc.text(txt, x + 2, y + 4.8);
                    x += colW[i];
                });

                // Sub-info: Furnizor • Raft • Tip under the Brand cell
                const sub = [a.furnizor, a.locatie_raft].filter(Boolean).join(' • ');
                if (sub && rowH >= 7) {
                    doc.setFontSize(5.5);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(...C.subText);
                    const subTxt = doc.splitTextToSize(sub, colW[1] - 4)[0] ?? '';
                    doc.text(subTxt, mL + colW[0] + 2, y + rowH - 1.2);
                }

                y += rowH;
            });

            // ── Total row ──
            if (y + rowH + 4 > footerTop) {
                drawFooter(pageNum, totalPages);
                doc.addPage();
                pageNum++;
                drawPageHeader();
                y = 24;
            }

            // Thin separator line
            doc.setDrawColor(...C.border);
            doc.setLineWidth(0.4);
            doc.line(mL, y + 1, mL + usableW, y + 1);

            // Total dark bar
            doc.setFillColor(...C.darkBlue);
            doc.rect(mL, y + 2, usableW, rowH + 1, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(8);
            doc.setTextColor(...C.white);
            doc.text('TOTAL', mL + 2, y + 6.5);

            const totals: (string | null)[] = [
                null, null, null, null, null,
                String(totalBucati),
                null,
                `${valoareVanzare.toLocaleString('en-US')} MDL`,
                `${profit.toLocaleString('en-US')} MDL`,
            ];
            let tx = mL;
            totals.forEach((val, i) => {
                if (val !== null) {
                    rightCols.has(i)
                        ? doc.text(val, tx + colW[i] - 2, y + 6.5, { align: 'right' })
                        : doc.text(val, tx + 2, y + 6.5);
                }
                tx += colW[i];
            });

            drawFooter(pageNum, totalPages);
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
                <button onClick={generatePDF} className="glass-btn glass-btn-primary" disabled={isPrinting}>
                    {isPrinting ? <Loader2 className="animate-spin" size={18} /> : <Printer size={18} />}
                    {isPrinting ? 'Se generează...' : 'Descarcă PDF'}
                </button>
            </div>

            {/* Filters */}
            <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}><Filter size={16} color="var(--blue)" /> <span style={{ fontWeight: 600 }}>Filtre</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
                    <TrendingUp size={18} color="var(--blue)" /> Sumar pe Brand
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
                                {iesiriCuProfit.map(m => (
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
                        {iesiriCuProfit.map(m => (
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
