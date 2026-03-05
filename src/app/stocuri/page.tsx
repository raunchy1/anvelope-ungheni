'use client';

import { useState, useEffect, useMemo } from 'react';
import { Package, Snowflake, Sun, CloudSun, Wind, AlertTriangle, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Loader2, DollarSign } from 'lucide-react';
import type { Anvelopa, MiscareStoc } from '@/types';
import Link from 'next/link';

export default function StocuriDashboardPage() {
    const [anvelope, setAnvelope] = useState<Anvelopa[]>([]);
    const [miscari, setMiscari] = useState<MiscareStoc[]>([]);
    const [loading, setLoading] = useState(true);

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

    const stats = useMemo(() => {
        const total = anvelope.reduce((s, a) => s + a.cantitate, 0);
        const iarna = anvelope.filter(a => a.sezon === 'Iarnă').reduce((s, a) => s + a.cantitate, 0);
        const vara = anvelope.filter(a => a.sezon === 'Vară').reduce((s, a) => s + a.cantitate, 0);
        const allSeason = anvelope.filter(a => a.sezon === 'All-Season' || a.sezon === 'M+S').reduce((s, a) => s + a.cantitate, 0);
        const valoareTotala = anvelope.reduce((s, a) => s + (a.pret_vanzare * a.cantitate), 0);
        const profitEstimat = anvelope.reduce((s, a) => s + ((a.pret_vanzare - a.pret_achizitie) * a.cantitate), 0);
        return { total, iarna, vara, allSeason, valoareTotala, profitEstimat };
    }, [anvelope]);

    // Profit realizat din ieșiri (calculat din mișcări)
    const profitRealizat = useMemo(() => {
        return miscari
            .filter(m => m.tip === 'iesire' && m.profit_total)
            .reduce((s, m) => s + (m.profit_total || 0), 0);
    }, [miscari]);

    const totalIesiri = useMemo(() => {
        return miscari.filter(m => m.tip === 'iesire').reduce((s, m) => s + m.cantitate, 0);
    }, [miscari]);

    const lowStock = useMemo(() =>
        anvelope.filter(a => a.cantitate > 0 && a.cantitate <= 4).sort((a, b) => a.cantitate - b.cantitate),
        [anvelope]
    );

    const recentMiscari = useMemo(() => {
        const sorted = [...miscari].sort((a, b) => b.data.localeCompare(a.data));
        return sorted.slice(0, 8).map(m => {
            const anv = anvelope.find(a => a.id === m.anvelopa_id);
            return { ...m, anvelopa: anv };
        });
    }, [miscari, anvelope]);

    // Stats for sezon breakdown (pie-like)
    const sezonBreakdown = useMemo(() => {
        const groups = [
            { label: 'Iarnă', color: '#60a5fa', icon: <Snowflake size={16} />, count: stats.iarna },
            { label: 'Vară', color: '#fbbf24', icon: <Sun size={16} />, count: stats.vara },
            { label: 'All-Season / M+S', color: '#34d399', icon: <CloudSun size={16} />, count: stats.allSeason },
        ];
        return groups;
    }, [stats]);

    if (loading) {
        return (
            <div className="fade-in" style={{ textAlign: 'center', padding: 60 }}>
                <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: 'var(--blue)' }} />
                <div style={{ marginTop: 12, color: 'var(--text-muted)', fontSize: 14 }}>Se încarcă stocurile...</div>
            </div>
        );
    }

    return (
        <div className="fade-in">
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Package size={28} color="var(--blue)" />
                Dashboard Stocuri
            </h1>

            {/* Main Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
                <div className="stat-card" style={{ position: 'relative', overflow: 'hidden' }}>
                    <div style={{
                        position: 'absolute', top: -10, right: -10, width: 60, height: 60,
                        borderRadius: '50%', background: 'rgba(33,150,243,0.1)',
                    }} />
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Package size={14} /> Total Anvelope
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--blue)' }}>{stats.total}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{anvelope.length} produse unice</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Snowflake size={14} color="#60a5fa" /> Iarnă
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#60a5fa' }}>{stats.iarna}</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Sun size={14} color="#fbbf24" /> Vară
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#fbbf24' }}>{stats.vara}</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CloudSun size={14} color="#34d399" /> All-Season
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#34d399' }}>{stats.allSeason}</div>
                </div>
            </div>

            {/* Financial Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
                <div className="stat-card">
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TrendingUp size={14} color="var(--green)" /> Valoare Stoc (Vânzare)
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green)' }}>{stats.valoareTotala.toLocaleString('ro-MD')} MDL</div>
                </div>
                <div className="stat-card">
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <TrendingDown size={14} color="var(--blue)" /> Profit Estimat (Stoc)
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--blue)' }}>{stats.profitEstimat.toLocaleString('ro-MD')} MDL</div>
                </div>
                <div className="stat-card" style={{ border: '1px solid rgba(34,197,94,0.25)', background: 'rgba(34,197,94,0.05)' }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <DollarSign size={14} color="var(--green)" /> Profit Realizat (Ieșiri)
                    </div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)' }}>{profitRealizat.toLocaleString('ro-MD')} MDL</div>
                    <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>{totalIesiri} buc vândute</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                {/* Sezon Distribution */}
                <div className="glass" style={{ padding: 20 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Wind size={18} color="var(--blue)" /> Distribuție pe Sezon
                    </h3>
                    {sezonBreakdown.map(s => {
                        const pct = stats.total > 0 ? (s.count / stats.total * 100) : 0;
                        return (
                            <div key={s.label} style={{ marginBottom: 14 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: s.color }}>
                                        {s.icon} {s.label}
                                    </div>
                                    <span style={{ fontWeight: 700, fontSize: 14 }}>{s.count} buc ({pct.toFixed(0)}%)</span>
                                </div>
                                <div style={{
                                    height: 8, borderRadius: 8, background: 'rgba(255,255,255,0.06)',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        height: '100%', borderRadius: 8,
                                        width: `${pct}%`,
                                        background: `linear-gradient(90deg, ${s.color}, ${s.color}88)`,
                                        transition: 'width 0.6s ease',
                                    }} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Low Stock Alerts */}
                <div className="glass" style={{ padding: 20 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--orange)' }}>
                        <AlertTriangle size={18} /> Stoc Scăzut ({lowStock.length})
                    </h3>
                    {lowStock.length === 0 ? (
                        <div style={{ fontSize: 14, color: 'var(--text-dim)', textAlign: 'center', padding: 24 }}>
                            ✅ Toate produsele au stoc suficient
                        </div>
                    ) : (
                        lowStock.map(a => (
                            <div key={a.id} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px 0', borderBottom: '1px solid var(--glass-border)',
                            }}>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 500 }}>{a.brand} {a.dimensiune}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>Raft {a.locatie_raft} • {a.sezon}</div>
                                </div>
                                <span style={{
                                    fontWeight: 700, fontSize: 18,
                                    color: a.cantitate <= 2 ? 'var(--red)' : 'var(--orange)',
                                    minWidth: 50, textAlign: 'right',
                                }}>{a.cantitate} buc</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Recent Movements */}
            <div className="glass" style={{ padding: 20, marginTop: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                    📊 Mișcări Recente
                </h3>
                {recentMiscari.length === 0 ? (
                    <div style={{ fontSize: 14, color: 'var(--text-dim)', textAlign: 'center', padding: 24 }}>
                        Nu există mișcări înregistrate
                    </div>
                ) : (
                    recentMiscari.map(m => (
                        <div key={m.id} style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 0', borderBottom: '1px solid var(--glass-border)',
                        }}>
                            <div style={{
                                width: 36, height: 36, borderRadius: 10,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: m.tip === 'intrare' ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                flexShrink: 0,
                            }}>
                                {m.tip === 'intrare'
                                    ? <ArrowUpRight size={18} color="var(--green)" />
                                    : <ArrowDownRight size={18} color="var(--red)" />
                                }
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 500 }}>
                                    {m.anvelopa ? `${m.anvelopa.brand} ${m.anvelopa.dimensiune}` : `ID #${m.anvelopa_id}`}
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                                    {m.data} {m.motiv_iesire ? `• ${m.motiv_iesire}` : ''}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{
                                    fontWeight: 700, fontSize: 16,
                                    color: m.tip === 'intrare' ? 'var(--green)' : 'var(--red)',
                                }}>
                                    {m.tip === 'intrare' ? '+' : '-'}{m.cantitate}
                                </div>
                                {m.tip === 'iesire' && m.profit_total ? (
                                    <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>
                                        +{m.profit_total.toLocaleString('ro-MD')} MDL
                                    </div>
                                ) : null}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 20 }}>
                <Link href="/stocuri/intrare" className="glass-btn glass-btn-success" style={{ padding: 16, textDecoration: 'none', textAlign: 'center' }}>
                    <ArrowUpRight size={20} /> Intrare în Stoc
                </Link>
                <Link href="/stocuri/iesire" className="glass-btn glass-btn-danger" style={{ padding: 16, textDecoration: 'none', textAlign: 'center' }}>
                    <ArrowDownRight size={20} /> Ieșire din Stoc
                </Link>
                <Link href="/stocuri/cautare" className="glass-btn glass-btn-primary" style={{ padding: 16, textDecoration: 'none', textAlign: 'center' }}>
                    <Package size={20} /> Căutare Anvelope
                </Link>
            </div>
        </div>
    );
}
