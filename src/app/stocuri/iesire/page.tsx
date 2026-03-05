'use client';

import { useState, useEffect, useMemo } from 'react';
import { MinusCircle, Search, Save, Loader2, ArrowLeft, CheckCircle2, Snowflake, Sun, CloudSun, Wind, TrendingUp, DollarSign } from 'lucide-react';
import type { Anvelopa } from '@/types';
import Link from 'next/link';

const motiveIesire = ['Vânzare Client', 'Montaj pe Fișă', 'Defect', 'Returnare Furnizor'];
const sezonIcons: Record<string, React.ReactNode> = { 'Iarnă': <Snowflake size={14} />, 'Vară': <Sun size={14} />, 'All-Season': <CloudSun size={14} />, 'M+S': <Wind size={14} /> };
const sezonColors: Record<string, string> = { 'Iarnă': '#60a5fa', 'Vară': '#fbbf24', 'All-Season': '#34d399', 'M+S': '#a78bfa' };

export default function StocuriIesirePage() {
    const [anvelope, setAnvelope] = useState<Anvelopa[]>([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [cantitate, setCantitate] = useState('');
    const [motiv, setMotiv] = useState(motiveIesire[0]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState('');
    const [lastProfit, setLastProfit] = useState<{ perUnit: number; total: number } | null>(null);

    useEffect(() => {
        fetch('/api/stocuri')
            .then(r => r.json())
            .then(data => { setAnvelope(data); setLoading(false); })
            .catch(() => setLoading(false));
    }, []);

    const results = useMemo(() => {
        if (!query.trim()) return [];
        const q = query.toLowerCase();
        return anvelope.filter(a => a.cantitate > 0 &&
            (a.brand.toLowerCase().includes(q) || a.dimensiune.toLowerCase().includes(q) || a.furnizor.toLowerCase().includes(q))
        );
    }, [query, anvelope]);

    const selected = selectedId !== null ? anvelope.find(a => a.id === selectedId) : null;

    // Auto-calculated profit
    const qty = Number(cantitate) || 0;
    const profitPerBucata = selected ? (selected.pret_vanzare - selected.pret_achizitie) : 0;
    const profitTotal = profitPerBucata * qty;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selected) return;
        if (qty > selected.cantitate) {
            setError(`Cantitate maximă disponibilă: ${selected.cantitate}`);
            return;
        }

        setSaving(true);
        setError('');

        try {
            // 1. Update stock (reduce quantity)
            const newQty = selected.cantitate - qty;
            const updateRes = await fetch('/api/stocuri', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: selected.id, cantitate: newQty }),
            });
            const updateData = await updateRes.json();
            if (!updateData.success) throw new Error(updateData.error || 'Eroare la actualizare stoc');

            // 2. Record the movement WITH profit data
            await fetch('/api/stocuri/miscari', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    anvelopa_id: selected.id,
                    tip: 'iesire',
                    cantitate: qty,
                    data: new Date().toISOString().split('T')[0],
                    motiv_iesire: motiv,
                    pret_achizitie: selected.pret_achizitie,
                    pret_vanzare: selected.pret_vanzare,
                    profit_per_bucata: profitPerBucata,
                    profit_total: profitTotal,
                }),
            });

            // Update local state
            setAnvelope(prev => prev.map(a => a.id === selected.id ? { ...a, cantitate: newQty } : a));

            setLastProfit({ perUnit: profitPerBucata, total: profitTotal });
            setSaved(true);
            setTimeout(() => {
                setSaved(false);
                setLastProfit(null);
                setSelectedId(null);
                setCantitate('');
                setQuery('');
            }, 5000);
        } catch (err: any) {
            setError(err.message);
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
        <div className="fade-in" style={{ maxWidth: 700 }}>
            <Link href="/stocuri" style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                <ArrowLeft size={14} /> Înapoi la Dashboard Stocuri
            </Link>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                <MinusCircle size={28} color="var(--red)" /> Ieșire din Stoc
            </h1>

            {/* Success message with profit */}
            {saved && lastProfit && (
                <div className="fade-in" style={{
                    padding: 20, borderRadius: 16, marginBottom: 16,
                    background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--green)', fontSize: 15, fontWeight: 600, marginBottom: 10 }}>
                        <CheckCircle2 size={20} /> Ieșirea a fost înregistrată cu succes!
                    </div>
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
                        padding: 12, borderRadius: 12, background: 'rgba(34,197,94,0.08)',
                    }}>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Profit / bucată</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>{lastProfit.perUnit.toLocaleString('ro-MD')} MDL</div>
                        </div>
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Profit total</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>{lastProfit.total.toLocaleString('ro-MD')} MDL</div>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="fade-in" style={{
                    padding: 16, borderRadius: 16, marginBottom: 16,
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                    color: 'var(--red)', fontSize: 14,
                }}>
                    ❌ {error}
                </div>
            )}

            {/* Search */}
            <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
                <label className="form-label">Caută Produs</label>
                <div style={{ position: 'relative' }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-dim)' }} />
                    <input className="glass-input" style={{ paddingLeft: 36 }} placeholder="Brand, dimensiune sau furnizor..."
                        value={query} onChange={e => { setQuery(e.target.value); setSelectedId(null); }} />
                </div>
                {results.length > 0 && !selected && (
                    <div style={{ marginTop: 8, maxHeight: 300, overflowY: 'auto' }}>
                        {results.map(a => (
                            <div key={a.id} onClick={() => { setSelectedId(a.id); setQuery(`${a.brand} ${a.dimensiune}`); }}
                                className="glass" style={{
                                    padding: 14, marginTop: 6, cursor: 'pointer',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    transition: 'all 0.2s',
                                }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                                        <span style={{ color: sezonColors[a.sezon] }}>{sezonIcons[a.sezon]}</span>
                                        {a.brand} {a.dimensiune}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                                        Raft {a.locatie_raft} • {a.furnizor} • Achiziție: {a.pret_achizitie} MDL • Vânzare: {a.pret_vanzare} MDL
                                    </div>
                                </div>
                                <span style={{
                                    fontWeight: 700, fontSize: 18,
                                    color: a.cantitate <= 4 ? 'var(--orange)' : 'var(--green)',
                                }}>{a.cantitate} buc</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Selected product + exit form */}
            {selected && (
                <form onSubmit={handleSubmit}>
                    {/* Product Info Card */}
                    <div className="glass fade-in" style={{ padding: 20, marginBottom: 16, borderColor: 'rgba(239,68,68,0.3)', borderWidth: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ color: sezonColors[selected.sezon] }}>{sezonIcons[selected.sezon]}</span>
                                    {selected.brand} {selected.dimensiune}
                                </div>
                                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Raft {selected.locatie_raft} • DOT {selected.dot} • {selected.sezon}
                                </div>
                            </div>
                            <div style={{
                                padding: '8px 16px', borderRadius: 12,
                                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
                                fontWeight: 700, fontSize: 20, color: 'var(--green)',
                            }}>
                                {selected.cantitate} buc
                            </div>
                        </div>

                        {/* Prices */}
                        <div style={{
                            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16,
                            padding: 14, borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)',
                        }}>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <DollarSign size={12} /> Preț Achiziție
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--orange)' }}>{selected.pret_achizitie} MDL</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <DollarSign size={12} /> Preț Vânzare
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)' }}>{selected.pret_vanzare} MDL</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <TrendingUp size={12} /> Profit / buc
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>{profitPerBucata} MDL</div>
                            </div>
                        </div>

                        {/* Quantity + Reason */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <label className="form-label">Cantitate Ieșire *</label>
                                <input className="glass-input" type="number" min="1" max={selected.cantitate} required
                                    value={cantitate} onChange={e => { setCantitate(e.target.value); setError(''); }}
                                    placeholder={`max ${selected.cantitate}`} />
                            </div>
                            <div>
                                <label className="form-label">Motiv Ieșire *</label>
                                <select className="glass-select" value={motiv} onChange={e => setMotiv(e.target.value)}>
                                    {motiveIesire.map(m => <option key={m}>{m}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Profit Calculation Card – shown when quantity is entered */}
                    {qty > 0 && (
                        <div className="glass fade-in" style={{
                            padding: 20, marginBottom: 16,
                            border: '1px solid rgba(34,197,94,0.25)',
                            background: 'rgba(34,197,94,0.05)',
                        }}>
                            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--green)' }}>
                                <TrendingUp size={18} /> Calcul Profit
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                                <div style={{
                                    padding: 14, borderRadius: 12,
                                    background: 'rgba(0,0,0,0.2)', textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Preț Achiziție</div>
                                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--orange)' }}>{selected.pret_achizitie} MDL</div>
                                </div>
                                <div style={{
                                    padding: 14, borderRadius: 12,
                                    background: 'rgba(0,0,0,0.2)', textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Preț Vânzare</div>
                                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--blue)' }}>{selected.pret_vanzare} MDL</div>
                                </div>
                                <div style={{
                                    padding: 14, borderRadius: 12,
                                    background: 'rgba(0,0,0,0.2)', textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Cantitate</div>
                                    <div style={{ fontSize: 16, fontWeight: 600 }}>{qty} buc</div>
                                </div>
                            </div>

                            {/* Formula */}
                            <div style={{
                                padding: 10, borderRadius: 10,
                                background: 'rgba(0,0,0,0.15)', marginBottom: 14,
                                fontSize: 13, color: 'var(--text-muted)', textAlign: 'center',
                                fontFamily: 'monospace',
                            }}>
                                ({selected.pret_vanzare} − {selected.pret_achizitie}) × {qty} = <strong style={{ color: 'var(--green)' }}>{profitTotal.toLocaleString('ro-MD')} MDL</strong>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div style={{
                                    padding: 16, borderRadius: 14,
                                    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                                    textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Profit / bucată</div>
                                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)' }}>{profitPerBucata.toLocaleString('ro-MD')} MDL</div>
                                </div>
                                <div style={{
                                    padding: 16, borderRadius: 14,
                                    background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.06))',
                                    border: '1px solid rgba(34,197,94,0.3)',
                                    textAlign: 'center',
                                }}>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 4 }}>Profit Total</div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>{profitTotal.toLocaleString('ro-MD')} MDL</div>
                                </div>
                            </div>

                            {/* Remaining stock info */}
                            <div style={{
                                marginTop: 12, padding: 10, borderRadius: 10,
                                background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.12)',
                                fontSize: 13, color: 'var(--text-muted)', textAlign: 'center',
                            }}>
                                Sold după ieșire: <strong style={{ color: 'var(--text)' }}>{selected.cantitate - qty} buc</strong>
                                <span style={{ margin: '0 8px', color: 'var(--text-dim)' }}>•</span>
                                Valoare vânzare: <strong style={{ color: 'var(--blue)' }}>{(qty * selected.pret_vanzare).toLocaleString('ro-MD')} MDL</strong>
                            </div>
                        </div>
                    )}

                    <button type="submit" className="glass-btn glass-btn-danger" disabled={saving || qty <= 0}
                        style={{ width: '100%', padding: 16, fontSize: 16 }}>
                        {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        {saving ? 'Se procesează...' : saved ? '✓ Ieșire salvată!' : `Confirmă Ieșirea${qty > 0 ? ` – Profit: ${profitTotal.toLocaleString('ro-MD')} MDL` : ''}`}
                    </button>
                </form>
            )}
        </div>
    );
}
