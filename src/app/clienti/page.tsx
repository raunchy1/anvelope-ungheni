'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserSearch, Search, User, Phone, Calendar, Car, Eye, Loader2, Wrench, Edit2, Trash2, X, Check, ChevronRight } from 'lucide-react';


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

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const colors = [
    ['#3b82f6', '#1d4ed8'],
    ['#a78bfa', '#7c3aed'],
    ['#22c55e', '#15803d'],
    ['#f59e0b', '#b45309'],
    ['#ef4444', '#b91c1c'],
    ['#06b6d4', '#0e7490'],
  ];
  const colorIdx = name.charCodeAt(0) % colors.length;
  const [from, to] = colors[colorIdx];

  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.28,
      background: `linear-gradient(135deg, ${from}, ${to})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      fontSize: size * 0.38, fontWeight: 700, color: 'white',
      letterSpacing: '0.02em',
    }}>
      {initials}
    </div>
  );
}

export default function ClientiPage() {
    const [query, setQuery] = useState('');
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [clients, setClients] = useState<ClientRecord[]>([]);
    const [fise, setFise] = useState<FisaRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingClient, setDeletingClient] = useState<ClientRecord | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();

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
        <Loader2 className="animate-spin" size={28} style={{ margin: '0 auto', color: 'var(--accent)' }} />
        <div style={{ marginTop: 10, color: 'var(--text-dim)', fontSize: 13 }}>Se încarcă clienții...</div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.02em' }}>
          <UserSearch size={24} color="var(--accent)" />
          Bază de Clienți
        </h1>
        <div style={{ fontSize: 12, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px' }}>
          <span style={{ fontWeight: 700, color: 'var(--text-muted)' }}>{groupedClients.length}</span> clienți total
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
        <input
          className="glass-input"
          style={{ paddingLeft: 38 }}
          placeholder="Caută după nume, telefon sau număr auto..."
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedClientId(null); }}
        />
      </div>

      {/* Selected Client Detail */}
      {selectedClient && (
        <div className="glass fade-in" style={{ padding: 24, marginBottom: 20, borderColor: 'rgba(59,130,246,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Avatar name={selectedClient.nume} size={48} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>{selectedClient.nume}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                  <Phone size={13} /> {selectedClient.telefon || '—'}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link 
                href={`/clienti/${selectedClient.id}`}
                className="glass-btn glass-btn-primary"
                style={{ padding: '5px 12px', fontSize: 12, textDecoration: 'none' }}
              >
                Vezi Istoric Complet →
              </Link>
              <button
                onClick={() => setSelectedClientId(null)}
                className="glass-btn"
                style={{ padding: '5px 10px', fontSize: 12 }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Vehicule */}
          {selectedClient.masini.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                Vehicule ({selectedClient.masini.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {selectedClient.masini.map((car, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', background: 'var(--surface-2)',
                    borderRadius: 8, border: '1px solid var(--border)', fontSize: 13,
                  }}>
                    <Car size={14} color="var(--accent)" style={{ flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{car.numar_masina}</span>
                    <span style={{ color: 'var(--text-dim)' }}>– {car.marca_model || '—'}</span>
                    {car.dimensiune_anvelope && (
                      <span className="badge badge-blue" style={{ fontSize: 10, marginLeft: 'auto' }}>{car.dimensiune_anvelope}</span>
                    )}
                    {car.last_km && (
                      <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>{car.last_km.toLocaleString()} km</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fișe Service */}
          <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Wrench size={13} />
            Istoric Fișe ({selectedClient.fise.length})
          </div>

          {selectedClient.fise.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 13, background: 'var(--surface-2)', borderRadius: 8 }}>
              Nicio fișă service.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {selectedClient.fise.map(f => (
                <Link key={f.id} href={`/fise/${f.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="glass" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <span className="badge badge-blue">#{f.numar_fisa}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Calendar size={11} /> {f.data_intrarii}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Car size={12} /> {f.numar_masina} – {f.marca_model}
                      </div>
                    </div>
                    <Eye size={15} color="var(--accent)" style={{ opacity: 0.7 }} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Client List */}
      {!selectedClient && (
        <>
          {query.trim() && (
            <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
              <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{filtered.length}</span> rezultate pentru „{query}"
            </div>
          )}

          {filtered.length === 0 && query.trim() && (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-dim)', fontSize: 14 }}>
              Niciun client găsit pentru „{query}"
            </div>
          )}

          {/* Table */}
          {filtered.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>Client</th>
                    <th style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>Telefon</th>
                    <th style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)' }}>Vehicule</th>
                    <th style={{ padding: '11px 14px', textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', width: 90 }}>Fișe</th>
                    <th style={{ padding: '11px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', width: 40 }} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c, i) => (
                    <tr
                      key={c.id}
                      className="table-row"
                      onClick={() => setSelectedClientId(c.id)}
                      style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <Avatar name={c.nume} size={34} />
                          <span style={{ fontSize: 14, fontWeight: 600 }}>{c.nume}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Phone size={12} style={{ opacity: 0.5 }} />
                          {c.telefon || '—'}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          {c.masini.slice(0, 3).map((m, idx) => (
                            <span key={idx} style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 4, padding: '2px 7px', display: 'flex', alignItems: 'center', gap: 3 }}>
                              <Car size={10} style={{ opacity: 0.6 }} /> {m.numar_masina}
                            </span>
                          ))}
                          {c.masini.length > 3 && (
                            <span style={{ fontSize: 11, color: 'var(--text-dim)', padding: '2px 7px' }}>+{c.masini.length - 3}</span>
                          )}
                          {c.masini.length === 0 && <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                        <span className={`badge ${c.fise.length > 0 ? 'badge-blue' : ''}`} style={c.fise.length === 0 ? { color: 'var(--text-dim)', fontSize: 12 } : {}}>
                          {c.fise.length > 0 ? `${c.fise.length} fișe` : '—'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                        <ChevronRight size={15} style={{ color: 'var(--text-dim)', opacity: 0.5 }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
