'use client';

import { useState, useEffect, useMemo } from 'react';
import { ClipboardList, ArrowLeft, Loader2, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Anvelopa } from '@/types';
import Link from 'next/link';

export default function InventarPage() {
    const [anvelope, setAnvelope] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [inventar, setInventar] = useState<Record<number, number>>({});
    const [saving, setSaving] = useState(false);
    const [done, setDone] = useState(false);

    useEffect(() => {
        fetch('/api/stocuri')
            .then(r => r.json())
            .then(data => {
                // Handle paginated response
                const stocArray = data.data || data || [];
                setAnvelope(Array.isArray(stocArray) ? stocArray : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleQtyChange = (id: number, val: string) => {
        const num = val === '' ? 0 : parseInt(val);
        setInventar(prev => ({ ...prev, [id]: num }));
    };

    const diffs = useMemo(() => {
        return anvelope.map(a => {
            const fizic = inventar[a.id] ?? a.cantitate;
            return {
                ...a,
                fizic,
                diferenta: fizic - a.cantitate
            };
        });
    }, [anvelope, inventar]);

    const hasChanges = useMemo(() => {
        return Object.keys(inventar).length > 0 && diffs.some(d => d.diferenta !== 0);
    }, [inventar, diffs]);

    const handleSaveInventar = async () => {
        if (!confirm('Sigur doriți să aplicați ajustările de inventar? Aceasta va înregistra mișcări de corecție pentru produsele cu diferențe.')) return;
        setSaving(true);

        const changes = diffs.filter(d => d.diferenta !== 0);

        try {
            for (const item of changes) {
                const tip = item.diferenta > 0 ? 'ajustare_plus' : 'ajustare_minus';
                const qty = Math.abs(item.diferenta);

                await fetch('/api/stocuri/miscari', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        anvelopa_id: item.id,
                        tip: tip,
                        cantitate: qty,
                        motiv_iesire: 'Inventar periodic'
                    })
                });
            }
            setDone(true);
            // Refresh data
            const res = await fetch('/api/stocuri');
            const newData = await res.json();
            // Handle paginated response
            const stocArray = newData.data || newData || [];
            setAnvelope(Array.isArray(stocArray) ? stocArray : []);
            setInventar({});
        } catch (err) {
            alert('Eroare la salvarea inventarului');
        } finally {
            setSaving(false);
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
                <ArrowLeft size={14} /> Înapoi la Dashboard
            </Link>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ClipboardList size={28} color="var(--blue)" /> Inventar Produse
                </h1>

                {hasChanges && (
                    <button className="glass-btn glass-btn-primary" onClick={handleSaveInventar} disabled={saving}>
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <><Save size={18} /> Aplică Corecțiile</>}
                    </button>
                )}
            </div>

            {done && (
                <div style={{
                    padding: 16, borderRadius: 16, background: 'rgba(34,197,94,0.1)',
                    border: '1px solid rgba(34,197,94,0.2)', color: 'var(--green)',
                    display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20
                }}>
                    <CheckCircle2 size={20} /> Inventar salvat cu succes! Mișcările de corecție au fost înregistrate.
                    <button style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', fontWeight: 700 }} onClick={() => setDone(false)}>X</button>
                </div>
            )}

            <div className="glass" style={{ padding: '0 20px 20px' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <th style={{ padding: '16px 10px', textAlign: 'left', color: 'var(--text-muted)' }}>Produs / Brand</th>
                                <th style={{ padding: '16px 10px', textAlign: 'left', color: 'var(--text-muted)' }}>Raft</th>
                                <th style={{ padding: '16px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>Stoc Sistem</th>
                                <th style={{ padding: '16px 10px', textAlign: 'center', color: 'var(--text-muted)', width: 140 }}>Stoc Fizic</th>
                                <th style={{ padding: '16px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>Diferență</th>
                            </tr>
                        </thead>
                        <tbody>
                            {diffs.map(d => (
                                <tr key={d.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '12px 10px' }}>
                                        <div style={{ fontWeight: 600 }}>{d.brand} {d.dimensiune}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{d.cod_produs || '-'}</div>
                                    </td>
                                    <td style={{ padding: '12px 10px', color: 'var(--text-dim)' }}>{d.locatie_raft}</td>
                                    <td style={{ padding: '12px 10px', textAlign: 'right', fontWeight: 600 }}>{d.cantitate}</td>
                                    <td style={{ padding: '12px 10px' }}>
                                        <input
                                            type="number"
                                            className="glass-input"
                                            style={{ textAlign: 'center', minHeight: 40 }}
                                            value={inventar[d.id] ?? d.cantitate}
                                            onChange={e => handleQtyChange(d.id, e.target.value)}
                                        />
                                    </td>
                                    <td style={{ padding: '12px 10px', textAlign: 'right' }}>
                                        {d.diferenta !== 0 ? (
                                            <span style={{
                                                fontWeight: 800,
                                                fontSize: 16,
                                                color: d.diferenta > 0 ? 'var(--green)' : 'var(--red)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-end',
                                                gap: 4
                                            }}>
                                                {d.diferenta > 0 ? '+' : ''}{d.diferenta}
                                                <AlertCircle size={14} />
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--text-dim)' }}>0</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
