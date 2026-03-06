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

function SortIcon({ field, sortKey, sortDir }: { field: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (field !== sortKey) return <ChevronsUpDown size={13} style={{ opacity: 0.3 }} />;
  return sortDir === 'asc'
    ? <ChevronUp size={13} style={{ color: 'var(--accent)' }} />
    : <ChevronDown size={13} style={{ color: 'var(--accent)' }} />;
}

export default function FisePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [fise, setFise] = useState<Fisa[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('data_intrarii');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');

  useEffect(() => {
    fetch('/api/fise').then(res => res.json()).then(data => setFise(data));
  }, []);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

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
    } catch {
      alert('Eroare rețea la ștergere');
    }
  };

  const filtered = useMemo(() => {
    const base = Array.isArray(fise) ? fise : [];
    const searched = !search.trim() ? base : (() => {
      const q = search.toLowerCase();
      return base.filter(f =>
        f.client_nume?.toLowerCase().includes(q) ||
        f.client_telefon?.includes(q) ||
        f.numar_masina.toLowerCase().includes(q) ||
        f.numar_fisa.includes(q)
      );
    })();

    return [...searched].sort((a, b) => {
      if (sortKey === 'numar_fisa') {
        const an = Number(a.numar_fisa ?? 0);
        const bn = Number(b.numar_fisa ?? 0);
        return sortDir === 'asc' ? an - bn : bn - an;
      }
      const av = String(a[sortKey] ?? '');
      const bv = String(b[sortKey] ?? '');
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [search, fise, sortKey, sortDir]);

  const ThCell = ({ label, field, style }: { label: string; field: SortKey; style?: React.CSSProperties }) => (
    <th
      onClick={() => handleSort(field)}
      style={{
        padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600,
        color: sortKey === field ? 'var(--accent)' : 'var(--text-dim)',
        textTransform: 'uppercase', letterSpacing: '0.07em',
        cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-2)',
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {label}
        <SortIcon field={field} sortKey={sortKey} sortDir={sortDir} />
      </div>
    </th>
  );

  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.02em' }}>
          <ClipboardList size={24} color="var(--accent)" />
          Fișe Service
        </h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: 'var(--surface-2)', borderRadius: 7, padding: 3, border: '1px solid var(--border)', gap: 2 }}>
            <button
              onClick={() => setViewMode('table')}
              className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`}
            >
              Tabel
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`view-toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
            >
              Carduri
            </button>
          </div>
          <Link href="/fise/new" className="glass-btn glass-btn-primary" style={{ textDecoration: 'none' }}>
            <FilePlus size={16} />
            Adaugă Fișă
          </Link>
        </div>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <Search size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', pointerEvents: 'none' }} />
        <input
          className="glass-input"
          style={{ paddingLeft: 38 }}
          placeholder="Caută după client, telefon, nr. mașină sau nr. fișă..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 600, color: 'var(--text-muted)' }}>{filtered.length}</span> fișe
        {search && <span>· filtrat după „<span style={{ color: 'var(--text-muted)' }}>{search}</span>"</span>}
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <ThCell label="#" field="numar_fisa" style={{ width: 70 }} />
                  <ThCell label="Data" field="data_intrarii" style={{ width: 110 }} />
                  <ThCell label="Client" field="client_nume" />
                  <ThCell label="Mașină" field="numar_masina" />
                  <th style={{ padding: '11px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', textAlign: 'left' }}>
                    Servicii
                  </th>
                  <th style={{ padding: '11px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)', background: 'var(--surface-2)', width: 90, textAlign: 'right' }}>
                    Acțiuni
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((f, i) => (
                  <tr
                    key={f.id}
                    className="table-row"
                    onClick={() => router.push(`/fise/${f.id}`)}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }}
                  >
                    <td style={{ padding: '12px 14px' }}>
                      <span className="badge badge-blue" style={{ fontVariantNumeric: 'tabular-nums' }}>#{f.numar_fisa}</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Calendar size={12} style={{ opacity: 0.5 }} />
                        {f.data_intrarii}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{f.client_nume}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>{f.client_telefon}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <Car size={13} style={{ color: 'var(--accent)', opacity: 0.7, flexShrink: 0 }} />
                        {f.numar_masina}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 1 }}>{f.marca_model}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {f.servicii.vulcanizare.service_complet_r && <span className="badge badge-blue" style={{ fontSize: 10 }}>R{f.servicii.vulcanizare.service_complet_diametru}</span>}
                        {f.servicii.vulcanizare.echilibrat && <span className="badge badge-green" style={{ fontSize: 10 }}>Echilibrat</span>}
                        {f.servicii.vulcanizare.petic && <span className="badge badge-orange" style={{ fontSize: 10 }}>Petic</span>}
                        {f.servicii.frana.slefuit_discuri && <span className="badge badge-red" style={{ fontSize: 10 }}>Discuri</span>}
                        {f.servicii.frana.placute_fata && <span className="badge badge-red" style={{ fontSize: 10 }}>Plăcuțe</span>}
                        {f.servicii.aer_conditionat.freon_134a_gr && <span className="badge badge-blue" style={{ fontSize: 10 }}>AC</span>}
                        {f.hotel_anvelope?.activ && <span className="badge badge-green" style={{ fontSize: 10 }}>🏨</span>}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => router.push(`/fise/${f.id}/edit`)}
                          className="glass-btn"
                          style={{ padding: '5px 8px' }}
                          title="Editează"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => setDeletingId(f.id)}
                          className="glass-btn glass-btn-danger"
                          style={{ padding: '5px 8px' }}
                          title="Șterge"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--text-dim)', fontSize: 14 }}>
                      Nicio fișă găsită
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CARDS VIEW */}
      {viewMode === 'cards' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((f, i) => (
            <div key={f.id} className="glass slide-up" style={{ padding: 18, animationDelay: `${i * 50}ms`, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Link href={`/fise/${f.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span className="badge badge-blue">#{f.numar_fisa}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} /> {f.data_intrarii}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <User size={14} color="var(--accent)" />
                    <span style={{ fontWeight: 600, fontSize: 14 }}>{f.client_nume}</span>
                    <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>· {f.client_telefon}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: 12 }}>
                    <Car size={13} />
                    <span>{f.numar_masina}</span>
                    <span style={{ color: 'var(--text-dim)' }}>–</span>
                    <span>{f.marca_model}</span>
                  </div>
                </Link>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => router.push(`/fise/${f.id}/edit`)} className="glass-btn" style={{ padding: 6 }}>
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => setDeletingId(f.id)} className="glass-btn glass-btn-danger" style={{ padding: 6 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <Link href={`/fise/${f.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                <div style={{ display: 'flex', gap: 5, marginTop: 10, flexWrap: 'wrap' }}>
                  {f.servicii.vulcanizare.service_complet_r && <span className="badge badge-blue">R{f.servicii.vulcanizare.service_complet_diametru}</span>}
                  {f.servicii.vulcanizare.echilibrat && <span className="badge badge-green">Echilibrat</span>}
                  {f.servicii.vulcanizare.petic && <span className="badge badge-orange">Petic</span>}
                  {f.servicii.frana.slefuit_discuri && <span className="badge badge-red">Discuri</span>}
                  {f.servicii.frana.placute_fata && <span className="badge badge-red">Plăcuțe</span>}
                  {f.servicii.aer_conditionat.freon_134a_gr && <span className="badge badge-blue">AC {f.servicii.aer_conditionat.freon_134a_gr}g</span>}
                  {f.hotel_anvelope?.activ && <span className="badge badge-green">🏨 Hotel</span>}
                </div>
              </Link>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-dim)', fontSize: 14 }}>
              Nicio fișă găsită
            </div>
          )}
        </div>
      )}

      {/* Garanție */}
      <div style={{
        marginTop: 20, padding: 12, borderRadius: 10,
        background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.18)',
        textAlign: 'center', fontSize: 12, color: 'var(--green)',
      }}>
        🛡 La serviciu de vulcanizare — garanție 20 zile lucrătoare
      </div>

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(6px)'
        }}>
          <div className="glass fade-in" style={{ padding: 28, borderRadius: 14, maxWidth: 380, width: '90%', border: '1px solid rgba(239,68,68,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div style={{ padding: 10, background: 'rgba(239,68,68,0.1)', borderRadius: 10, color: 'var(--red)', flexShrink: 0 }}>
                <AlertTriangle size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Șterge fișă?</h3>
            </div>
            <p style={{ margin: '0 0 22px', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
              Această acțiune este <strong style={{ color: 'var(--red)' }}>ireversibilă</strong>. Fișa va fi ștearsă permanent.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setDeletingId(null)} className="glass-btn">Anulează</button>
              <button onClick={handleDelete} className="glass-btn" style={{ background: 'var(--red)', color: 'white', borderColor: 'transparent' }}>
                Șterge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
