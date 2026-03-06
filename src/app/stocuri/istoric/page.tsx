'use client';

import { useState, useEffect, useMemo } from 'react';
import { History, ArrowLeft, ArrowUpRight, ArrowDownRight, Scale, Search, Filter, Loader2, Package } from 'lucide-react';
import type { Anvelopa, MiscareStoc } from '@/types';
import Link from 'next/link';

export default function StockHistoryPage() {
    const [miscari, setMiscari] = useState<MiscareStoc[]>([]);
    const [anvelope, setAnvelope] = useState<Anvelopa[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [tipFilter, setTipFilter] = useState('Toate');

    useEffect(() => {
        Promise.all([
            fetch('/api/stocuri/miscari').then(r => r.json()),
            fetch('/api/stocuri').then(r => r.json())
        ]).then(([m, s]) => {
            setMiscari(m);
            setAnvelope(s);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, []);

    const enrichedMiscari = useMemo(() => {
        return miscari.map(m => ({
            ...m,
            anvelopa: anvelope.find(a => a.id === m.anvelopa_id)
        }));
    }, [miscari, anvelope]);

    const filtered = useMemo(() => {
        let data = [...enrichedMiscari];
        if (query.trim()) {
            const q = query.toLowerCase();
            data = data.filter(m =>
                m.anvelopa?.brand.toLowerCase().includes(q) ||
                m.anvelopa?.dimensiune.toLowerCase().includes(q) ||
                (m.motiv_iesire && m.motiv_iesire.toLowerCase().includes(q))
            );
        }
        if (tipFilter !== 'Toate') {
            data = data.filter(m => m.tip === tipFilter);
        }
        return data;
    }, [enrichedMiscari, query, tipFilter]);

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
                <ArrowLeft size={14} /> Înapoi la Dashboard
            </Link>

            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                <History size={28} color="var(--blue)" /> Istoric Mișcări Stoc
            </h1>

            <div className="glass" style={{ padding: 16, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-dim)' }} />
                    <input
                        className="glass-input"
                        style={{ paddingLeft: 36 }}
                        placeholder="Caută după produs sau motiv..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                </div>
                <div style={{ width: 180 }}>
                    <select className="glass-select" value={tipFilter} onChange={e => setTipFilter(e.target.value)}>
                        <option value="Toate">Toate tipurile</option>
                        <option value="intrare">Intrări</option>
                        <option value="iesire">Ieșiri / Vânzare</option>
                        <option value="ajustare_plus">Ajustări (+)</option>
                        <option value="ajustare_minus">Ajustări (-)</option>
                        <option value="service" disabled>Service (Auto)</option>
                    </select>
                </div>
            </div>

            <div className="glass" style={{ overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.02)' }}>
                                <th style={{ padding: '12px 14px', textAlign: 'left', color: 'var(--text-muted)' }}>Data</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', color: 'var(--text-muted)' }}>Produs</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', color: 'var(--text-muted)' }}>Tip</th>
                                <th style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-muted)' }}>Cantitate</th>
                                <th style={{ padding: '12px 14px', textAlign: 'left', color: 'var(--text-muted)' }}>Motiv / Detalii</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
                                        Nicio mișcare găsită.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(m => (
                                    <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                                            {new Date(m.data).toLocaleDateString('ro-MD')}
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <div style={{ fontWeight: 600 }}>{m.anvelopa?.brand || 'Necunoscut'}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{m.anvelopa?.dimensiune || '-'}</div>
                                        </td>
                                        <td style={{ padding: '12px 14px' }}>
                                            <div style={{
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                gap: 6,
                                                padding: '4px 8px',
                                                borderRadius: 6,
                                                fontSize: 11,
                                                fontWeight: 600,
                                                background: m.tip === 'intrare' || m.tip === 'ajustare_plus'
                                                    ? 'rgba(34,197,94,0.1)'
                                                    : 'rgba(239,68,68,0.1)',
                                                color: m.tip === 'intrare' || m.tip === 'ajustare_plus'
                                                    ? 'var(--green)'
                                                    : 'var(--red)'
                                            }}>
                                                {m.tip === 'intrare' && <><ArrowUpRight size={12} /> Intrare</>}
                                                {m.tip === 'iesire' && <><ArrowDownRight size={12} /> Vânzare</>}
                                                {m.tip === 'ajustare_plus' && <><ArrowUpRight size={12} /> Ajustare (+)</>}
                                                {m.tip === 'ajustare_minus' && <><ArrowDownRight size={12} /> Ajustare (-)</>}
                                                {m.tip === 'service' && <><Package size={12} /> Service</>}
                                            </div>
                                        </td>
                                        <td style={{
                                            padding: '12px 14px',
                                            textAlign: 'right',
                                            fontWeight: 700,
                                            fontSize: 16,
                                            color: m.tip === 'intrare' || m.tip === 'ajustare_plus' ? 'var(--green)' : 'var(--red)'
                                        }}>
                                            {m.tip === 'intrare' || m.tip === 'ajustare_plus' ? '+' : '-'}{m.cantitate}
                                        </td>
                                        <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>
                                            {m.motiv_iesire || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
