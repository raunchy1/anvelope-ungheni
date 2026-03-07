'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search, FilePlus, Eye, Calendar, User, Car, Wrench,
  ClipboardList, Pencil, Trash2, AlertTriangle, ChevronUp, ChevronDown,
  ChevronsUpDown
} from 'lucide-react';
import type { Fisa } from '@/types';

type SortKey = 'numar_fisa' | 'data_intrarii' | 'client_nume' | 'numar_masina';
type SortDir = 'asc' | 'desc';

    useEffect(() => {
        fetch('/api/fise').then(res => res.json()).then(data => setFise(data));
    }, []);

    const handleDelete = async () => {
        if (!deletingId) return;
        try {
            const res = await fetch(`/api/fise/${deletingId}`, { method: 'DELETE' });
            if (res.ok) {
                setFise(prev => (Array.isArray(prev) ? prev : []).filter(f => f.id !== deletingId));
                setDeletingId(null);
                setTimeout(() => alert('Fișa ștearsă cu succes'), 100);
            } else {
                alert('Eroare la ștergerea fișei');
            }
        } catch (e) {
            alert('Eroare rețea la ștergere');
        }
    };

    const filtered = useMemo(() => {
        const base = Array.isArray(fise) ? fise : [];
        if (!search.trim()) return base;
        const q = search.toLowerCase();
        return base.filter(f =>
            f.client_nume?.toLowerCase().includes(q) ||
            f.client_telefon?.includes(q) ||
            f.numar_masina.toLowerCase().includes(q) ||
            f.numar_fisa.includes(q)
        );
    }, [search, fise]);

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ClipboardList size={28} color="var(--blue)" />
                    Fișe Service
                </h1>
                <Link href="/fise/new" className="glass-btn glass-btn-primary" style={{ textDecoration: 'none' }}>
                    <FilePlus size={18} />
                    Adaugă Fișă Nouă
                </Link>
            </div>

            {/* Search */}
            <div className="glass" style={{ padding: 16, marginBottom: 24 }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-dim)' }} />
                    <input
                        className="glass-input"
                        style={{ paddingLeft: 40 }}
                        placeholder="Caută după client, telefon, nr. mașină sau nr. fișă..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                {(Array.isArray(filtered) ? filtered : []).length} fișe găsite
            </div>

            {/* Fișe Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {(Array.isArray(filtered) ? filtered : []).map((f, i) => (
                    <div key={f.id} className="glass slide-up" style={{ padding: 20, animationDelay: `${i * 60}ms`, position: 'relative' }}>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Link href={`/fise/${f.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                    <span className="badge badge-blue">#{f.numar_fisa}</span>
                                    <span style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <Calendar size={13} /> {f.data_intrarii}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                    <User size={15} color="var(--blue)" />
                                    <span style={{ fontWeight: 600, fontSize: 15 }}>{f.client_nume}</span>
                                    <span style={{ color: 'var(--text-dim)', fontSize: 13 }}>| {f.client_telefon}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13 }}>
                                    <Car size={15} />
                                    <span>{f.numar_masina}</span>
                                    <span style={{ color: 'var(--text-dim)' }}>–</span>
                                    <span>{f.marca_model}</span>
                                </div>
                            </Link>

                            <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => router.push(`/fise/edit/${f.id}`)} className="glass-btn" style={{ padding: 6 }}>
                                        <Pencil size={15} color="var(--blue)" />
                                    </button>
                                    <button onClick={() => setDeletingId(f.id)} className="glass-btn" style={{ padding: 6 }}>
                                        <Trash2 size={15} color="var(--red)" />
                                    </button>
                                </div>
                                <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>Mecanic</div>
                                <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-muted)' }}>{f.mecanic}</div>
                            </div>
                        </div>

                        {/* Service badges */}
                        <Link href={`/fise/${f.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                                {f.servicii.vulcanizare.service_complet_r && <span className="badge badge-blue">Vulcanizare R{f.servicii.vulcanizare.service_complet_diametru}</span>}
                                {f.servicii.vulcanizare.echilibrat && <span className="badge badge-green">Echilibrat</span>}
                                {f.servicii.vulcanizare.petic && <span className="badge badge-orange">Petic {f.servicii.vulcanizare.petic}</span>}
                                {f.servicii.frana.slefuit_discuri && <span className="badge badge-red">Șlefuit discuri</span>}
                                {f.servicii.frana.placute_fata && <span className="badge badge-red">Plăcuțe față</span>}
                                {f.servicii.aer_conditionat.freon_134a_gr && <span className="badge badge-blue">AC {f.servicii.aer_conditionat.freon_134a_gr}g</span>}
                                {f.servicii.vopsit_jante.vopsit_janta_culoare && <span className="badge badge-orange">Vopsit jante</span>}
                                {f.hotel_anvelope?.activ && <span className="badge badge-green">🏨 Hotel</span>}
                            </div>
                        </Link>
                    </div>
                ))}
            </div>

            {/* Garanție */}
            <div style={{
                marginTop: 24, padding: 14, borderRadius: 16,
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                textAlign: 'center', fontSize: 13, color: 'var(--green)',
            }}>
                🛡 La serviciu de vulcanizare garanție – 20 zile lucrătoare
            </div>

            {/* Delete Confirmation Modal */}
            {deletingId && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
                    backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)'
                }}>
                    <div className="glass fade-in" style={{ padding: 24, borderRadius: 20, maxWidth: 400, width: '90%' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ padding: 10, background: 'rgba(239,68,68,0.1)', borderRadius: '50%', color: 'var(--red)' }}>
                                <AlertTriangle size={24} />
                            </div>
                            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Ștergere Fișă</h3>
                        </div>
                        <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--text-dim)', lineHeight: 1.5 }}>
                            Sigur doriți să ștergeți această fișă? Această acțiune este ireversibilă.
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button onClick={() => setDeletingId(null)} className="glass-btn" style={{ padding: '8px 16px' }}>
                                Anulează
                            </button>
                            <button onClick={handleDelete} className="glass-btn" style={{ padding: '8px 16px', background: 'var(--red)', color: 'white', borderColor: 'transparent' }}>
                                Confirmă
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
