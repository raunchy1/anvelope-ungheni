'use client';

import { useState, useEffect, useMemo } from 'react';
import { sezoane, tipuriAchizitie } from '@/lib/data';
import { Search, Filter, ChevronUp, ChevronDown, Snowflake, Sun, CloudSun, Wind, Loader2, ArrowLeft, Package, Pencil, Trash2, Scale, AlertTriangle } from 'lucide-react';
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
    const [dotFilter, setDotFilter] = useState('Toate');
    const [showFilters, setShowFilters] = useState(false);
    const [sortField, setSortField] = useState('brand');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    // Modals states
    const [editingItem, setEditingItem] = useState<Anvelopa | null>(null);
    const [deletingItem, setDeletingItem] = useState<Anvelopa | null>(null);
    const [adjustingItem, setAdjustingItem] = useState<Anvelopa | null>(null);
    const [saving, setSaving] = useState(false);

    const [editForm, setEditForm] = useState({
        brand: '', dimensiune: '', sezon: '', dot: '', cantitate: 0,
        locatie_raft: '', furnizor: '', tip_achizitie: '',
        pret_achizitie: 0, pret_vanzare: 0, cod_produs: '', stoc_minim: 2
    });
    const [adjustForm, setAdjustForm] = useState({ tip: 'ajustare_plus', cantitate: '', motiv: 'Corecție inventar' });

    useEffect(() => {
        fetch('/api/stocuri?limit=1000')
            .then(r => r.json())
            .then(data => {
                // Handle paginated response
                const stocArray = data.data || data || [];
                setAnvelope(Array.isArray(stocArray) ? stocArray : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        let data = [...anvelope];
        if (query.trim()) {
            const q = query.toLowerCase();
            data = data.filter(a =>
                a.brand.toLowerCase().includes(q) ||
                a.dimensiune.toLowerCase().includes(q) ||
                a.furnizor.toLowerCase().includes(q) ||
                a.locatie_raft.toLowerCase().includes(q) ||
                (a.dot && a.dot.toLowerCase().includes(q)) ||
                (a.cod_produs && a.cod_produs.toLowerCase().includes(q))
            );
        }
        if (sezonFilter !== 'Toate') data = data.filter(a => a.sezon === sezonFilter);
        if (tipFilter !== 'Toate') data = data.filter(a => a.tip_achizitie === tipFilter);
        if (dotFilter !== 'Toate') data = data.filter(a => a.dot && a.dot.includes(dotFilter));
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

    const openEdit = (a: Anvelopa) => {
        setEditingItem(a);
        setEditForm({
            brand: a.brand || '', dimensiune: a.dimensiune || '', sezon: a.sezon || 'Vară', dot: a.dot || '',
            cantitate: a.cantitate || 0, locatie_raft: a.locatie_raft || '', furnizor: a.furnizor || '',
            tip_achizitie: a.tip_achizitie || 'Cu factură', pret_achizitie: a.pret_achizitie || 0,
            pret_vanzare: a.pret_vanzare || 0, cod_produs: a.cod_produs || '', stoc_minim: a.stoc_minim || 2
        });
    };

    const openAdjust = (a: Anvelopa) => {
        setAdjustingItem(a);
        setAdjustForm({ tip: 'ajustare_plus', cantitate: '', motiv: 'Corecție inventar' });
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving || !editingItem) return;
        setSaving(true);
        try {
            const res = await fetch('/api/stocuri', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editingItem.id, ...editForm, cantitate: Number(editForm.cantitate), pret_achizitie: Number(editForm.pret_achizitie), pret_vanzare: Number(editForm.pret_vanzare) })
            });
            if (res.ok) {
                setAnvelope(prev => prev.map(a => a.id === editingItem.id ? { ...a, ...editForm, cantitate: Number(editForm.cantitate), pret_achizitie: Number(editForm.pret_achizitie), pret_vanzare: Number(editForm.pret_vanzare) } as Anvelopa : a));
                setEditingItem(null);
            } else {
                alert('Eroare la salvare');
            }
        } catch (err) {
            alert('Eroare rețea');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (saving || !deletingItem) return;
        setSaving(true);
        try {
            const res = await fetch(`/api/stocuri/${deletingItem.id}`, { method: 'DELETE' });
            if (res.ok) {
                setAnvelope(prev => prev.filter(a => a.id !== deletingItem.id));
                setDeletingItem(null);
            } else {
                alert('Eroare la ștergere');
            }
        } catch (err) {
            alert('Eroare rețea');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAdjust = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving || !adjustingItem) return;
        const qty = Number(adjustForm.cantitate);
        if (!qty || qty <= 0) {
            alert('Introduceți o cantitate validă ( > 0 )');
            return;
        }

        if (adjustForm.tip === 'ajustare_minus' && adjustingItem.cantitate - qty < 0) {
            alert('Eroare! Cantitatea finală nu poate fi negativă.');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/stocuri/miscari', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    anvelopa_id: adjustingItem.id,
                    tip: adjustForm.tip,
                    cantitate: qty,
                    motiv_iesire: adjustForm.motiv
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                setAnvelope(prev => prev.map(a => {
                    if (a.id === adjustingItem.id) {
                        return { ...a, cantitate: adjustForm.tip === 'ajustare_plus' ? a.cantitate + qty : a.cantitate - qty };
                    }
                    return a;
                }));
                setAdjustingItem(null);
            } else {
                alert(data.error || 'Eroare la ajustare');
            }
        } catch (err) {
            alert('Eroare rețea');
        } finally {
            setSaving(false);
        }
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
                <Search size={28} color="var(--blue)" /> Căutare & Control Stoc
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
                    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                        <div><label className="form-label">Sezon</label><select className="glass-select" value={sezonFilter} onChange={e => setSezonFilter(e.target.value)}><option>Toate</option>{sezoane.map(s => <option key={s}>{s}</option>)}</select></div>
                        <div><label className="form-label">Tip Achiziție</label><select className="glass-select" value={tipFilter} onChange={e => setTipFilter(e.target.value)}><option>Toate</option>{tipuriAchizitie.map(t => <option key={t}>{t}</option>)}</select></div>
                        <div>
                            <label className="form-label">An DOT</label>
                            <select className="glass-select" value={dotFilter} onChange={e => setDotFilter(e.target.value)}>
                                <option>Toate</option>
                                {['2024', '2023', '2022', '2021', '2020', '2019'].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
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
                            {[['', ''], ['cod_produs', 'Cod'], ['brand', 'Brand'], ['dimensiune', 'Dimensiune'], ['locatie_raft', 'Raft'], ['pret_vanzare', 'Vânzare'], ['cantitate', 'Buc'], ['', 'Acțiuni']].map(([f, l], i) => (
                                <th key={i} onClick={f ? () => toggleSort(f) : undefined}
                                    style={{ padding: '12px 10px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500, cursor: f ? 'pointer' : 'default', userSelect: 'none', whiteSpace: 'nowrap' }}>
                                    {l} {sortField === f && (sortDir === 'asc' ? <ChevronUp size={12} style={{ verticalAlign: 'middle' }} /> : <ChevronDown size={12} style={{ verticalAlign: 'middle' }} />)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.map(a => {
                            const isLowStock = a.cantitate <= (a.stoc_minim || 2);
                            return (
                                <tr key={a.id} style={{
                                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                                    backgroundColor: isLowStock ? 'rgba(239, 68, 68, 0.05)' : 'transparent'
                                }}>
                                    <td style={{ padding: '10px', color: sezonColors[a.sezon] }}>{sezonIcons[a.sezon]}</td>
                                    <td style={{ padding: '10px', color: 'var(--text-dim)', fontSize: 11 }}>{a.cod_produs || '-'}</td>
                                    <td style={{ padding: '10px', fontWeight: 600 }}>{a.brand}</td>
                                    <td style={{ padding: '10px' }}>{a.dimensiune}</td>
                                    <td style={{ padding: '10px' }}>{a.locatie_raft}</td>
                                    <td style={{ padding: '10px', fontWeight: 500 }}>{a.pret_vanzare}</td>
                                    <td style={{ padding: '10px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                                            <span style={{
                                                fontWeight: 700,
                                                fontSize: 16,
                                                color: a.cantitate === 0 ? 'var(--red)' : isLowStock ? 'var(--orange)' : 'var(--green)'
                                            }}>{a.cantitate}</span>
                                            {isLowStock && <span style={{ fontSize: 9, color: 'var(--red)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 2 }}><AlertTriangle size={8} /> STOC SCĂZUT</span>}
                                        </div>
                                    </td>
                                    <td style={{ padding: '10px' }}>
                                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                            <button onClick={() => openEdit(a)} title="Editare" className="btn-icon"><Pencil size={16} /></button>
                                            <button onClick={() => openAdjust(a)} title="Ajustare" className="btn-icon" style={{ color: 'var(--blue)' }}><Scale size={16} /></button>
                                            <button onClick={() => setDeletingItem(a)} title="Ștergere" className="btn-icon danger"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
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
                        <div style={{ marginTop: 12, display: 'flex', gap: 8, borderTop: '1px solid var(--glass-border)', paddingTop: 10 }}>
                            <button className="glass-btn" style={{ flex: 1, padding: 8, fontSize: 12 }} onClick={() => openEdit(a)}><Pencil size={14} /> Edit</button>
                            <button className="glass-btn" style={{ flex: 1, padding: 8, fontSize: 12, color: 'var(--blue)' }} onClick={() => openAdjust(a)}><Scale size={14} /> Ajust</button>
                            <button className="glass-btn" style={{ flex: 1, padding: 8, fontSize: 12, color: 'var(--red)' }} onClick={() => setDeletingItem(a)}><Trash2 size={14} /> Del</button>
                        </div>
                    </div>
                ))}
            </div>

            {
                filtered.length === 0 && (
                    <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)', fontSize: 14 }}>
                        Nu s-au găsit anvelope cu criteriile selectate
                    </div>
                )
            }

            {/* --- Modals --- */}

            {/* Delete Confirmation Modal */}
            {
                deletingItem && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                        <div className="glass fade-in" style={{ padding: 24, borderRadius: 20, maxWidth: 400, width: '90%' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                                <div style={{ padding: 10, background: 'rgba(239,68,68,0.1)', borderRadius: '50%', color: 'var(--red)' }}><AlertTriangle size={24} /></div>
                                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Ștergere Produs</h3>
                            </div>
                            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-dim)' }}>
                                Sigur doriți să ștergeți produsul <strong>{deletingItem.brand} {deletingItem.dimensiune}</strong> din stoc?
                                Această acțiune este ireversibilă, iar istoricul aferent va fi de asemenea șters.
                            </p>
                            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                <button onClick={() => setDeletingItem(null)} className="glass-btn" disabled={saving}>Anulează</button>
                                <button onClick={handleDelete} className="glass-btn" style={{ background: 'var(--red)', color: 'white' }} disabled={saving}>
                                    {saving ? <Loader2 size={16} className="animate-spin" /> : 'Confirmă'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Edit Stock Item Modal */}
            {
                editingItem && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: 16 }}>
                        <div className="glass fade-in" style={{ padding: 24, borderRadius: 20, maxWidth: 600, width: '100%', maxHeight: '90vh', overflow: 'auto' }}>
                            <h3 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Pencil size={24} color="var(--blue)" /> Editare Produs
                            </h3>
                            <form onSubmit={handleSaveEdit}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                                    <div style={{ gridColumn: 'span 2' }}>
                                        <label className="form-label">Cod Produs (ex: MIC-2254517-WIN)</label>
                                        <input className="glass-input" value={editForm.cod_produs} onChange={e => setEditForm(p => ({ ...p, cod_produs: e.target.value.toUpperCase() }))} />
                                    </div>
                                    <div><label className="form-label">Brand *</label><input className="glass-input" required value={editForm.brand} onChange={e => setEditForm(p => ({ ...p, brand: e.target.value }))} /></div>
                                    <div><label className="form-label">Dimensiune *</label><input className="glass-input" required value={editForm.dimensiune} onChange={e => setEditForm(p => ({ ...p, dimensiune: e.target.value }))} /></div>
                                    <div><label className="form-label">Sezon *</label><select className="glass-select" value={editForm.sezon} onChange={e => setEditForm(p => ({ ...p, sezon: e.target.value }))}>{sezoane.map(s => <option key={s}>{s}</option>)}</select></div>
                                    <div><label className="form-label">DOT</label><input className="glass-input" value={editForm.dot} onChange={e => setEditForm(p => ({ ...p, dot: e.target.value }))} /></div>
                                    <div><label className="form-label">Cantitate (buc) *</label><input className="glass-input" type="number" required value={editForm.cantitate} onChange={e => setEditForm(p => ({ ...p, cantitate: Number(e.target.value) }))} /></div>
                                    <div><label className="form-label">Stoc Minim Alertă *</label><input className="glass-input" type="number" required value={editForm.stoc_minim} onChange={e => setEditForm(p => ({ ...p, stoc_minim: Number(e.target.value) }))} /></div>
                                    <div><label className="form-label">Locație Raft</label><input className="glass-input" value={editForm.locatie_raft} onChange={e => setEditForm(p => ({ ...p, locatie_raft: e.target.value }))} /></div>
                                    <div><label className="form-label">Preț Achiziție</label><input className="glass-input" type="number" step="0.01" value={editForm.pret_achizitie} onChange={e => setEditForm(p => ({ ...p, pret_achizitie: Number(e.target.value) }))} /></div>
                                    <div><label className="form-label">Preț Vânzare *</label><input className="glass-input" type="number" step="0.01" required value={editForm.pret_vanzare} onChange={e => setEditForm(p => ({ ...p, pret_vanzare: Number(e.target.value) }))} /></div>
                                    <div><label className="form-label">Furnizor</label><input className="glass-input" value={editForm.furnizor} onChange={e => setEditForm(p => ({ ...p, furnizor: e.target.value }))} /></div>
                                    <div><label className="form-label">Tip Achiziție *</label><select className="glass-select" value={editForm.tip_achizitie} onChange={e => setEditForm(p => ({ ...p, tip_achizitie: e.target.value }))}>{tipuriAchizitie.map(t => <option key={t}>{t}</option>)}</select></div>
                                </div>
                                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--glass-border)' }}>
                                    <button type="button" onClick={() => setEditingItem(null)} className="glass-btn" disabled={saving}>Anulează</button>
                                    <button type="submit" className="glass-btn glass-btn-primary" disabled={saving}>
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : 'Salvează Modificările'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Adjust Stock Item Modal */}
            {
                adjustingItem && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', padding: 16 }}>
                        <div className="glass fade-in" style={{ padding: 24, borderRadius: 20, maxWidth: 500, width: '100%' }}>
                            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Scale size={24} color="var(--blue)" /> Ajustare Stoc
                            </h3>
                            <p style={{ color: 'var(--text-dim)', fontSize: 13, marginBottom: 20 }}>
                                {adjustingItem.brand} {adjustingItem.dimensiune} • Stoc curent: <strong>{adjustingItem.cantitate} buc</strong>
                            </p>
                            <form onSubmit={handleSaveAdjust}>
                                <div style={{ marginBottom: 16 }}>
                                    <label className="form-label">Tip Ajustare *</label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <label className={`checkbox-card ${adjustForm.tip === 'ajustare_plus' ? 'checked' : ''}`} style={{ flex: 1 }} onClick={() => setAdjustForm(p => ({ ...p, tip: 'ajustare_plus' }))}>
                                            <input type="radio" checked={adjustForm.tip === 'ajustare_plus'} readOnly style={{ display: 'none' }} />
                                            ➕ Adaugă bucăți
                                        </label>
                                        <label className={`checkbox-card ${adjustForm.tip === 'ajustare_minus' ? 'checked' : ''}`} style={{ flex: 1, borderColor: adjustForm.tip === 'ajustare_minus' ? 'var(--red)' : '' }} onClick={() => setAdjustForm(p => ({ ...p, tip: 'ajustare_minus' }))}>
                                            <input type="radio" checked={adjustForm.tip === 'ajustare_minus'} readOnly style={{ display: 'none' }} />
                                            ➖ Scade bucăți
                                        </label>
                                    </div>
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <label className="form-label">Cantitate *</label>
                                    <input className="glass-input" type="number" min="1" required placeholder="Bucăți de ajustat" value={adjustForm.cantitate} onChange={e => setAdjustForm(p => ({ ...p, cantitate: e.target.value }))} />
                                </div>
                                <div style={{ marginBottom: 24 }}>
                                    <label className="form-label">Motiv Ajustare *</label>
                                    <select className="glass-select" required value={adjustForm.motiv} onChange={e => setAdjustForm(p => ({ ...p, motiv: e.target.value }))}>
                                        <option>Corecție inventar</option>
                                        <option>Produs deteriorat</option>
                                        <option>Greșeală introducere</option>
                                        <option>Alt motiv</option>
                                    </select>
                                </div>

                                {adjustForm.cantitate && (
                                    <div style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.05)', marginBottom: 20, fontSize: 14 }}>
                                        Stoc final estimat: <strong style={{ color: adjustForm.tip === 'ajustare_minus' && adjustingItem.cantitate - Number(adjustForm.cantitate) < 0 ? 'var(--red)' : 'var(--green)' }}>
                                            {adjustForm.tip === 'ajustare_plus' ? adjustingItem.cantitate + Number(adjustForm.cantitate) : adjustingItem.cantitate - Number(adjustForm.cantitate)} buc
                                        </strong>
                                    </div>
                                )}

                                <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--glass-border)' }}>
                                    <button type="button" onClick={() => setAdjustingItem(null)} className="glass-btn" disabled={saving}>Anulează</button>
                                    <button type="submit" className="glass-btn glass-btn-primary" disabled={saving}>
                                        {saving ? <Loader2 size={16} className="animate-spin" /> : 'Confirmă Ajustarea'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
