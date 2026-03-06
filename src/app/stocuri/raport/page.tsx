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
            const autoTable = (await import('jspdf-autotable')).default;
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

            const pageW = doc.internal.pageSize.getWidth();
            const today = new Date().toLocaleDateString('ro-MD');

            // Header
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('RAPORT STOCURI ANVELOPE', pageW / 2, 20, { align: 'center' });
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text('SRL ANVELOPEN', pageW / 2, 28, { align: 'center' });
            doc.text(`Data raport: ${today}`, pageW / 2, 34, { align: 'center' });

            // Summary cards (drawn manually as requested to match UI)
            doc.setFillColor(245, 247, 250);
            doc.roundedRect(14, 42, 60, 18, 2, 2, 'F');
            doc.roundedRect(80, 42, 60, 18, 2, 2, 'F');
            doc.roundedRect(146, 42, 60, 18, 2, 2, 'F');
            doc.roundedRect(212, 42, 60, 18, 2, 2, 'F');

            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text('Total Bucăți', 44, 48, { align: 'center' });
            doc.text('Val. Vânzare', 110, 48, { align: 'center' });
            doc.text('Val. Achiziție', 176, 48, { align: 'center' });
            doc.text('Profit Estimat', 242, 48, { align: 'center' });

            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.setFont('helvetica', 'bold');
            doc.text(String(totalBucati), 44, 55, { align: 'center' });
            doc.text(`${valoareVanzare.toLocaleString('en-US')} MDL`, 110, 55, { align: 'center' });
            doc.text(`${valoareAchizitie.toLocaleString('en-US')} MDL`, 176, 55, { align: 'center' });
            doc.text(`${profit.toLocaleString('en-US')} MDL`, 242, 55, { align: 'center' });

            // Table using autoTable
            const head = [['#', 'Brand', 'Dimensiune', 'Sezon', 'DOT', 'Raft', 'Buc', 'Profit Un.', 'Profit Tot.']];
            const body = filtered.map((a, idx) => [
                idx + 1,
                a.brand,
                a.dimensiune,
                a.sezon,
                a.dot,
                a.locatie_raft,
                a.cantitate,
                (a.pret_vanzare - a.pret_achizitie).toLocaleString('en-US'),
                ((a.pret_vanzare - a.pret_achizitie) * a.cantitate).toLocaleString('en-US')
            ]);

            autoTable(doc, {
                startY: 68,
                head: head,
                body: body,
                theme: 'grid',
                styles: {
                    fontSize: 8,
                    cellPadding: 2,
                    valign: 'middle',
                    overflow: 'linebreak',
                    font: 'helvetica'
                },
                headStyles: {
                    fillColor: [33, 150, 243],
                    textColor: 255,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: {
                    0: { cellWidth: 10, halign: 'center' },
                    1: { cellWidth: 50 },
                    2: { cellWidth: 40 },
                    3: { cellWidth: 25, halign: 'center' },
                    4: { cellWidth: 25, halign: 'center' },
                    5: { cellWidth: 35 },
                    6: { cellWidth: 20, halign: 'center' },
                    7: { cellWidth: 35, halign: 'right' },
                    8: { cellWidth: 35, halign: 'right' }
                },
                didDrawPage: (data) => {
                    // Footer
                    doc.setFontSize(8);
                    doc.setTextColor(150);
                    doc.text('anvelope-ungheni.md', 14, doc.internal.pageSize.height - 10);
                    doc.text(`Pagina ${data.pageNumber}`, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 10, { align: 'right' });
                }
            });

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
