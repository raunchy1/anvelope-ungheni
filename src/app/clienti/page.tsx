'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { UserSearch, Search, User, Phone, Calendar, Car, Eye, Loader2, Wrench, Edit2, Trash2, X, Check } from 'lucide-react';


interface ClientRecord {
    id: string;
    nume: string;
    telefon: string;
    masini: {
        numar_masina: string;
        marca_model: string;
        dimensiune_anvelope: string;
        last_km: number | null;
    }[];
    created_at: string;
    updated_at: string;
}

interface FisaRecord {
    id: string;
    numar_fisa: string;
    client_nume?: string;
    client_telefon?: string;
    numar_masina: string;
    marca_model: string;
    km_bord: number | null;
    dimensiune_anvelope: string;
    data_intrarii: string;
}

export default function ClientiPage() {
    const [query, setQuery] = useState('');
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [clients, setClients] = useState<ClientRecord[]>([]);
    const [fise, setFise] = useState<FisaRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);
    const [deletingClient, setDeletingClient] = useState<ClientRecord | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Edit Form State
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editCarNumber, setEditCarNumber] = useState('');

    const refreshData = async () => {
        setLoading(true);
        try {
            const [clientsData, fiseData] = await Promise.all([
                fetch('/api/clienti').then(r => r.json()),
                fetch('/api/fise').then(r => r.json()),
            ]);
            setClients(clientsData);
            setFise(fiseData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        refreshData();
    }, []);

    const handleEdit = (client: ClientRecord) => {
        setEditingClient(client);
        setEditName(client.nume);
        setEditPhone(client.telefon || '');
        setEditCarNumber(client.masini[0]?.numar_masina || '');
    };

    const saveEdit = async () => {
        if (!editingClient) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/clienti/${editingClient.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nume: editName,
                    telefon: editPhone,
                    masini: [{ numar_masina: editCarNumber }]
                }),
            });
            if (res.ok) {
                setEditingClient(null);
                refreshData();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteClient = async () => {
        if (!deletingClient) return;
        setIsSaving(true);
        try {
            const res = await fetch(`/api/clienti/${deletingClient.id}`, {
                method: 'DELETE',
            });
            if (res.ok) {
                setDeletingClient(null);
                setSelectedClientId(null);
                refreshData();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSaving(false);
        }
    };


    const groupedClients = useMemo(() => {
        return clients.map(c => ({
            ...c,
            fise: fise.filter(f =>
                f.client_nume?.toLowerCase().trim() === c.nume.toLowerCase().trim()
            ),
        }));
    }, [clients, fise]);

    const filtered = useMemo(() => {
        if (!query.trim()) return groupedClients;
        const q = query.toLowerCase();
        return groupedClients.filter(c =>
            c.nume.toLowerCase().includes(q) ||
            c.telefon.includes(q) ||
            c.masini.some(m => m.numar_masina.toLowerCase().includes(q))
        );
    }, [query, groupedClients]);

    const selectedClient = selectedClientId ? groupedClients.find(c => c.id === selectedClientId) : null;

    if (loading) {
        return (
            <div className="fade-in" style={{ textAlign: 'center', padding: 60 }}>
                <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: 'var(--blue)' }} />
            </div>
        );
    }

    return (
        <div className="fade-in">
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                <UserSearch size={28} color="var(--blue)" />
                Căutare Clienți
            </h1>

            <div className="glass" style={{ padding: 16, marginBottom: 20 }}>
                <div style={{ position: 'relative' }}>
                    <Search size={18} style={{ position: 'absolute', left: 14, top: 13, color: 'var(--text-dim)' }} />
                    <input className="glass-input" style={{ paddingLeft: 40 }}
                        placeholder="Caută după nume, telefon sau număr auto..."
                        value={query} onChange={e => { setQuery(e.target.value); setSelectedClientId(null); }} />
                </div>
            </div>

            {/* Selected Client Detail */}
            {selectedClient && (
                <div className="glass fade-in" style={{ padding: 24, marginBottom: 20, borderColor: 'var(--blue)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <User size={20} color="var(--blue)" /> {selectedClient.nume}
                            </div>
                            <div style={{ color: 'var(--text-muted)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Phone size={14} /> {selectedClient.telefon || '—'}
                            </div>
                        </div>
                        <button onClick={() => setSelectedClientId(null)}
                            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18 }}>✕</button>
                    </div>

                    {/* Vehicule */}
                    {selectedClient.masini.length > 0 && (
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Vehicule</div>
                            {selectedClient.masini.map((car, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', marginBottom: 4, background: 'var(--glass)', borderRadius: 10, fontSize: 14 }}>
                                    <Car size={15} color="var(--blue)" />
                                    <span style={{ fontWeight: 600 }}>{car.numar_masina}</span>
                                    <span style={{ color: 'var(--text-dim)' }}>– {car.marca_model || '—'}</span>
                                    {car.dimensiune_anvelope && (
                                        <span className="badge badge-blue" style={{ fontSize: 10 }}>{car.dimensiune_anvelope}</span>
                                    )}
                                    {car.last_km && (
                                        <span style={{ color: 'var(--text-dim)', fontSize: 11, marginLeft: 'auto' }}>{car.last_km.toLocaleString()} km</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Fise Service */}
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                        <Wrench size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        Istoric Fișe ({selectedClient.fise.length})
                    </div>
                    {selectedClient.fise.length === 0 && (
                        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                            Nicio fișă service.
                        </div>
                    )}
                    {selectedClient.fise.map(f => (
                        <Link key={f.id} href={`/fise/${f.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                            <div className="glass" style={{ padding: 14, marginBottom: 8, cursor: 'pointer' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                                            <span className="badge badge-blue">#{f.numar_fisa}</span>
                                            <span style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <Calendar size={12} /> {f.data_intrarii}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Car size={14} /> {f.numar_masina} – {f.marca_model}
                                            {f.dimensiune_anvelope && <span style={{ fontSize: 11 }}>({f.dimensiune_anvelope})</span>}
                                        </div>
                                    </div>
                                    <Eye size={18} color="var(--blue)" />
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Client List */}
            {!selectedClient && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
                        {filtered.length} clienți găsiți
                    </div>
                    {filtered.length === 0 && query.trim() && (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-dim)' }}>
                            Niciun client găsit pentru „{query}"
                        </div>
                    )}
                    {filtered.map((c, i) => (
                        <div key={c.id} className="glass slide-up" style={{ padding: 16, animationDelay: `${i * 40}ms` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div onClick={() => setSelectedClientId(c.id)} style={{ cursor: 'pointer', flex: 1 }}>
                                    <div style={{ fontWeight: 600, fontSize: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <User size={16} color="var(--blue)" /> {c.nume}
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Phone size={13} /> {c.telefon || '—'}
                                    </div>
                                    {c.masini.length > 0 && (
                                        <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            {c.masini.map((m, idx) => (
                                                <span key={idx} style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 3 }}>
                                                    <Car size={11} /> {m.numar_masina}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); handleEdit(c); }} title="Editează">
                                            <Edit2 size={16} />
                                        </button>
                                        <button className="btn-icon danger" onClick={(e) => { e.stopPropagation(); setDeletingClient(c); }} title="Șterge">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <div onClick={() => setSelectedClientId(c.id)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span className="badge badge-blue">{c.fise.length} fișe</span>
                                        <Eye size={18} color="var(--blue)" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Edit Modal */}
            {editingClient && (
                <div className="modal-overlay" onClick={() => setEditingClient(null)}>
                    <div className="modal-content glass" onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Editează Client</h2>
                            <button onClick={() => setEditingClient(null)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6, display: 'block' }}>Nume Client</label>
                                <input className="glass-input" value={editName} onChange={e => setEditName(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6, display: 'block' }}>Telefon</label>
                                <input className="glass-input" value={editPhone} onChange={e => setEditPhone(e.target.value)} />
                            </div>
                            <div>
                                <label style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6, display: 'block' }}>Număr Auto</label>
                                <input className="glass-input" value={editCarNumber} onChange={e => setEditCarNumber(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                                <button className="glass-button" style={{ flex: 1 }} onClick={() => setEditingClient(null)}>Anulează</button>
                                <button className="glass-button" style={{ flex: 1, background: 'var(--blue)', color: 'white' }}
                                    onClick={saveEdit} disabled={isSaving}>
                                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Salvează'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deletingClient && (
                <div className="modal-overlay" onClick={() => setDeletingClient(null)}>
                    <div className="modal-content glass" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Șterge Client?</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 24 }}>
                            Sigur dorești să ștergi acest client? Toate datele asociate (mașini, fișe service) vor fi șterse definitiv.
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button className="glass-button" style={{ flex: 1 }} onClick={() => setDeletingClient(null)}>Anulează</button>
                            <button className="glass-button" style={{ flex: 1, background: 'var(--danger)', color: 'white' }}
                                onClick={deleteClient} disabled={isSaving}>
                                {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'Confirmă Ștergerea'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
