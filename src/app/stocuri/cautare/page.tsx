'use client';

import { useState, useEffect, useMemo } from 'react';
import { sezoane, tipuriAchizitie } from '@/lib/data';
import { Search, Filter, ChevronUp, ChevronDown, Snowflake, Sun, CloudSun, Wind, Loader2, ArrowLeft, Package } from 'lucide-react';
import type { Anvelopa } from '@/types';
import Link from 'next/link';

const sezonIcons: Record<string, React.ReactNode> = { 'Iarnă': <Snowflake size={14} />, 'Vară': <Sun size={14} />, 'All-Season': <CloudSun size={14} />, 'M+S': <Wind size={14} /> };
const sezonColors: Record<string, string> = { 'Iarnă': '#60a5fa', 'Vară': '#fbbf24', 'All-Season': '#34d399', 'M+S': '#a78bfa' };

export default function StocuriCautarePage() {
    const [anvelope, setAnvelope] = useState<Anvelopa[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [sezonFilter, setSezonFilter] = useState('Toate');
    const [tipFilter, setTipFilter] = useState('Toate');
    const [showFilters, setShowFilters] = useState(false);
    const [sortField, setSortField] = useState('brand');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        fetch('/api/stocuri')
            .then(r => r.json())
            .then(data => { setAnvelope(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        let data = [...anvelope];
        if (query.trim()) {
            const q = query.toLowerCase();
            data = data.filter(a => a.brand.toLowerCase().includes(q) || a.dimensiune.toLowerCase().includes(q) || a.furnizor.toLowerCase().includes(q) || a.locatie_raft.toLowerCase().includes(q));
        }
        if (sezonFilter !== 'Toate') data = data.filter(a => a.sezon === sezonFilter);
        if (tipFilter !== 'Toate') data = data.filter(a => a.tip_achizitie === tipFilter);
        data.sort((a, b) => {
            const va = (a as unknown as Record<string, unknown>)[sortField];
            const vb = (b as unknown as Record<string, unknown>)[sortField];
            const av = typeof va === 'string' ? va.toLowerCase() : va as number;
            const bv = typeof vb === 'string' ? vb.toLowerCase() : vb as number;
            if (av < bv) return sortDir === 'asc' ? -1 : 1;
            if (av > bv) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return data;
    }, [query, sezonFilter, tipFilter, sortField, sortDir, anvelope]);

    const toggleSort = (field: string) => {
        if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        else { setSortField(field); setSortDir('asc'); }
    };

    const totalQty = filtered.reduce((s, a) => s + a.cantitate, 0);
    const totalVal = filtered.reduce((s, a) => s + (a.pret_vanzare * a.cantitate), 0);

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
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Search size={28} color="var(--blue)" /> Căutare Anvelope
            </h1>
            <div className="glass" style={{ padding: 16, marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: showFilters ? 12 : 0 }}>
                    <div style={{ flex: 1, position: 'relative' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-dim)' }} />
                        <input className="glass-input" style={{ paddingLeft: 36 }} placeholder="Brand, dimensiune, furnizor, raft..." value={query} onChange={e => setQuery(e.target.value)} />
                    </div>
                    <button className={`glass-btn ${showFilters ? 'glass-btn-primary' : ''}`} onClick={() => setShowFilters(!showFilters)} style={{ padding: '0 14px' }}>
                        <Filter size={18} />
                    </button>
                </div>
                {showFilters && (
                    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div><label className="form-label">Sezon</label><select className="glass-select" value={sezonFilter} onChange={e => setSezonFilter(e.target.value)}><option>Toate</option>{sezoane.map(s => <option key={s}>{s}</option>)}</select></div>
                        <div><label className="form-label">Tip Achiziție</label><select className="glass-select" value={tipFilter} onChange={e => setTipFilter(e.target.value)}><option>Toate</option>{tipuriAchizitie.map(t => <option key={t}>{t}</option>)}</select></div>
                    </div>
                )}
            </div>

            {/* Summary bar */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontSize: 13, color: 'var(--text-muted)', marginBottom: 12,
                padding: '8px 4px',
            }}>
                <span><Package size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} /> {filtered.length} produse • {totalQty} bucăți</span>
                <span>Valoare: <strong style={{ color: 'var(--green)' }}>{totalVal.toLocaleString('ro-MD')} MDL</strong></span>
            </div>

            {/* Desktop Table */}
            <div className="glass hide-mobile" style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            {[['', ''], ['brand', 'Brand'], ['dimensiune', 'Dimensiune'], ['locatie_raft', 'Raft'], ['furnizor', 'Furnizor'], ['pret_achizitie', 'Achiziție'], ['pret_vanzare', 'Vânzare'], ['tip_achizitie', 'Tip'], ['dot', 'DOT'], ['cantitate', 'Buc']].map(([f, l]) => (
                                <th key={f || 'icon'} onClick={f ? () => toggleSort(f) : undefined}
                                    style={{ padding: '12px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, cursor: f ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                                    {l} {sortField === f && (sortDir === 'asc' ? <ChevronUp size={12} style={{ verticalAlign: 'middle' }} /> : <ChevronDown size={12} style={{ verticalAlign: 'middle' }} />)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(a => (
                            <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td style={{ padding: '10px', color: sezonColors[a.sezon] }}>{sezonIcons[a.sezon]}</td>
                                <td style={{ padding: '10px', fontWeight: 600 }}>{a.brand}</td>
                                <td style={{ padding: '10px' }}>{a.dimensiune}</td>
                                <td style={{ padding: '10px' }}>{a.locatie_raft}</td>
                                <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{a.furnizor}</td>
                                <td style={{ padding: '10px' }}>{a.pret_achizitie}</td>
                                <td style={{ padding: '10px', fontWeight: 500 }}>{a.pret_vanzare}</td>
                                <td style={{ padding: '10px' }}><span className={`badge ${a.tip_achizitie === 'Cu factură' ? 'badge-green' : 'badge-orange'}`}>{a.tip_achizitie === 'Cu factură' ? 'Factură' : 'Cash'}</span></td>
                                <td style={{ padding: '10px', color: 'var(--text-dim)' }}>{a.dot}</td>
                                <td style={{ padding: '10px', fontWeight: 700, fontSize: 16, textAlign: 'right', color: a.cantitate === 0 ? 'var(--red)' : a.cantitate <= 4 ? 'var(--orange)' : 'var(--green)' }}>{a.cantitate}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Cards */}
            <div className="show-mobile-only" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filtered.map(a => (
                    <div key={a.id} className="glass" style={{ padding: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ color: sezonColors[a.sezon] }}>{sezonIcons[a.sezon]}</span>
                                <span style={{ fontWeight: 700 }}>{a.brand} {a.dimensiune}</span>
                            </div>
                            <span style={{ fontSize: 20, fontWeight: 800, color: a.cantitate === 0 ? 'var(--red)' : a.cantitate <= 4 ? 'var(--orange)' : 'var(--green)' }}>{a.cantitate}</span>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Raft: {a.locatie_raft} • {a.furnizor} • {a.pret_vanzare} MDL • DOT {a.dot}</div>
                        <div style={{ marginTop: 4 }}>
                            <span className={`badge ${a.tip_achizitie === 'Cu factură' ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: 10 }}>{a.tip_achizitie === 'Cu factură' ? 'Factură' : 'Cash'}</span>
                        </div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)', fontSize: 14 }}>
                    Nu s-au găsit anvelope cu criteriile selectate
                </div>
            )}
        </div>
    );
}
