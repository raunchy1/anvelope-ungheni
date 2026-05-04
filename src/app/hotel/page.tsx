'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Hotel, Calendar, User, Pencil, Trash2, PackageCheck, Package, AlertTriangle, X } from 'lucide-react';
import type { Fisa } from '@/types';

export default function HotelPage() {
    const router = useRouter();
    const [search, setSearch] = useState('');
    const [fise, setFise] = useState<Fisa[]>([]);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchFise = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/fise?all=true');
            const data = await res.json();
            console.log('[Hotel] API response:', data);
            
            // Handle paginated response
            const fiseArray = data.data || data || [];
            if (!Array.isArray(fiseArray)) {
                console.error('[Hotel] Invalid data format:', fiseArray);
                setFise([]);
                setError('Format de date invalid');
                return;
            }
            
            setFise(fiseArray);
        } catch (err: any) {
            console.error('[Hotel] Fetch error:', err);
            setError(err.message || 'Eroare la încărcarea datelor');
            setFise([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFise();
    }, []);

    const handleToggleStatus = async (fisa: Fisa) => {
        const currentHotel = fisa.hotel_anvelope;
        if (!currentHotel) return;
        const newStatus: 'Depozitate' | 'Ridicate' = currentHotel.status_hotel === 'Ridicate' ? 'Depozitate' : 'Ridicate';

        const payload: Fisa = {
            ...fisa,
            hotel_anvelope: {
                ...currentHotel,
                status_hotel: newStatus
            }
        };

        try {
            const res = await fetch(`/api/fise/${fisa.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setFise(prev => prev.map(f => f.id === fisa.id ? payload : f));
            } else {
                alert('Eroare la actualizarea statusului.');
            }
        } catch (e) {
            alert('Eroare rețea la actualizare.');
        }
    };

    const handleDeleteHotelRecord = async () => {
        if (!deletingId) return;

        const fisa = fise.find(f => f.id === deletingId);
        if (!fisa || !fisa.hotel_anvelope) return;

        const payload: Fisa = {
            ...fisa,
            hotel_anvelope: {
                ...fisa.hotel_anvelope,
                activ: false
            }
        };

        try {
            const res = await fetch(`/api/fise/${deletingId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setFise(prev => prev.filter(f => f.id !== deletingId));
                setDeletingId(null);
                setTimeout(() => alert('Înregistrarea hotel a fost ștearsă (fișa service rămâne intactă).'), 100);
            } else {
                alert('Eroare la ștergerea înregistrării.');
            }
        } catch (e) {
            alert('Eroare rețea la ștergere.');
        }
    };

    // Keep only the ones with `hotel_anvelope.activ` true
    const hotelRecords = useMemo(() => {
        try {
            return fise.filter(f => f.hotel_anvelope && f.hotel_anvelope.activ === true);
        } catch (e) {
            console.error('[Hotel] Error filtering hotel records:', e);
            return [];
        }
    }, [fise]);

    const filtered = useMemo(() => {
        try {
            if (!search.trim()) return hotelRecords;
            const q = search.toLowerCase();
            return hotelRecords.filter(f =>
                f.client_nume?.toLowerCase().includes(q) ||
                f.client_telefon?.includes(q)
            );
        } catch (e) {
            console.error('[Hotel] Error filtering:', e);
            return [];
        }
    }, [search, hotelRecords]);

    const dateDescSorted = useMemo(() => {
        try {
            return [...filtered].sort((a, b) => {
                const dateStrA = a.hotel_anvelope?.data_depozitare || a.data_intrarii;
                const dateStrB = b.hotel_anvelope?.data_depozitare || b.data_intrarii;
                
                // Safe date parsing
                const dateA = dateStrA ? new Date(dateStrA) : new Date(0);
                const dateB = dateStrB ? new Date(dateStrB) : new Date(0);
                
                // Check for invalid dates
                const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
                const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
                
                return timeB - timeA;
            });
        } catch (e) {
            console.error('[Hotel] Error sorting:', e);
            return filtered || [];
        }
    }, [filtered]);

    return (
        <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Hotel size={28} color="var(--blue)" />
                    Hotel Anvelope
                </h1>
            </div>

            {/* Search */}
            <div className="glass" style={{ padding: 16, marginBottom: 24 }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-dim)' }} />
                    <input
                        className="glass-input"
                        style={{ paddingLeft: 40 }}
                        placeholder="Caută client în registrul hotelului de anvelope (nume, telefon)..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="glass" style={{ padding: 16, marginBottom: 24, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <div style={{ color: 'var(--red)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={18} />
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className="glass" style={{ padding: 40, textAlign: 'center' }}>
                    <div style={{ color: 'var(--text-dim)' }}>Se încarcă...</div>
                </div>
            )}

            {!loading && (
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                    {filtered.length} seturi găsite în depozit
                </div>
            )}

            {/* Hotel Table */}
            <div className="glass" style={{ overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Client & Telefon</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Nr. Mașină</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Anvelope (Marcă / Detalii)</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Tip depozit</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Bucăți</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Dată Depozit</th>
                            <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 500 }}>Status</th>
                            <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 500 }}>Acțiuni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dateDescSorted.map((f, i) => {
                            const hotel = f.hotel_anvelope;
                            if (!hotel) return null;
                            const isRidicate = hotel.status_hotel === 'Ridicate';
                            return (
                                <tr key={f.id} className="slide-up" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', animationDelay: `${i * 30}ms`, background: isRidicate ? 'rgba(0,0,0,0.1)' : 'transparent', opacity: isRidicate ? 0.6 : 1 }}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{f.client_nume}</div>
                                        <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>{f.client_telefon}</div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        {f.numar_masina ? (
                                            <span className="badge badge-blue" style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}>
                                                {f.numar_masina}
                                            </span>
                                        ) : (
                                            <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ fontWeight: 600 }}>{hotel.marca_model || '-'}</div>
                                        <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>
                                            {hotel.dimensiune_anvelope || '-'}{' '}
                                            {hotel.saci && <span className="badge badge-blue">Saci</span>}
                                        </div>
                                        {hotel.status_observatii && (
                                            <div style={{ color: 'var(--orange)', fontSize: 11, marginTop: 4 }}>
                                                Obs: {hotel.status_observatii}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ fontWeight: 500 }}>{hotel.tip_depozit || 'Anvelope'}</div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ fontWeight: 600 }}>{hotel.bucati || 4}</div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-dim)' }}>
                                            <Calendar size={14} />
                                            {hotel.data_depozitare || f.data_intrarii}
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span className={`badge ${isRidicate ? 'badge-orange' : 'badge-green'}`}>
                                            {isRidicate ? 'RIDICATE' : 'DEPOZITATE'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                                            <button
                                                onClick={() => handleToggleStatus(f)}
                                                className={`action-btn ${isRidicate ? '' : 'text-orange'}`}
                                                style={{ border: '1px solid var(--glass-border)', background: 'var(--glass)', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
                                            >
                                                {isRidicate ? <Package size={14} /> : <PackageCheck size={14} />}
                                                {isRidicate ? 'Readu în Stoc' : 'Marchează Ridicat'}
                                            </button>

                                            <button
                                                onClick={() => router.push(`/fise/edit/${f.id}`)}
                                                className="action-btn text-blue" title="Editează Fișa și Hotel"
                                            >
                                                <Pencil size={18} />
                                            </button>
                                            <button
                                                onClick={() => setDeletingId(f.id)}
                                                className="action-btn text-red" title="Șterge Registru"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                {dateDescSorted.length === 0 && (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
                        Nu există clienți înregistrați în hotel.
                    </div>
                )}
            </div>

            {/* Delete Modal */}
            {deletingId && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
                    <div className="glass slide-up" style={{ width: 400, maxWidth: '90%', padding: 24, paddingBottom: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, color: 'var(--red)' }}>
                            <AlertTriangle size={28} />
                            <h3 style={{ fontSize: 18, margin: 0, fontWeight: 600 }}>Sigur doriți să ștergeți din Registru?</h3>
                        </div>
                        <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 24, lineHeight: 1.5 }}>
                            Această acțiune va debifa "Hotel Anvelope" din fișa service asociată. Înregistrarea nu va mai fi vizibilă aici, însă vechea fișă service în sine va rămâne neatinsă.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                            <button onClick={() => setDeletingId(null)} className="glass-btn" style={{ padding: '8px 16px' }}>
                                <X size={16} /> Anulează
                            </button>
                            <button onClick={handleDeleteHotelRecord} className="glass-btn" style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                <Trash2 size={16} /> Confirmă Ștergerea
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
