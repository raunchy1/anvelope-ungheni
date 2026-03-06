'use client';

import { useState } from 'react';
import { sezoane, tipuriAchizitie } from '@/lib/data';
import { PlusCircle, Save, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function StocuriIntrarePage() {
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        brand: '', dimensiune: '', sezon: 'Vară', dot: '',
        cantitate: '', locatie_raft: '', pret_achizitie: '', pret_vanzare: '',
        furnizor: '', tip_achizitie: 'Cu factură',
    });

    const resetForm = () => setForm({
        brand: '', dimensiune: '', sezon: 'Vară', dot: '',
        cantitate: '', locatie_raft: '', pret_achizitie: '', pret_vanzare: '',
        furnizor: '', tip_achizitie: 'Cu factură',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        setSaving(true);
        setError('');

        try {
            // 1. Create the tire entry in stocuri
            const stocRes = await fetch('/api/stocuri', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const stocData = await stocRes.json();
            if (!stocData.success) throw new Error(stocData.error || 'Eroare la salvare');

            // 2. Record the stock movement
            await fetch('/api/stocuri/miscari', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    anvelopa_id: stocData.id,
                    tip: 'intrare',
                    cantitate: Number(form.cantitate),
                    data: new Date().toISOString().split('T')[0],
                }),
            });

            setSaved(true);
            setTimeout(() => { setSaved(false); resetForm(); }, 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fade-in" style={{ maxWidth: 650 }}>
            <Link href="/stocuri" style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                <ArrowLeft size={14} /> Înapoi la Dashboard Stocuri
            </Link>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                <PlusCircle size={28} color="var(--green)" /> Intrare în Stoc
            </h1>

            {saved && (
                <div className="fade-in" style={{
                    padding: 16, borderRadius: 16, marginBottom: 16,
                    background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                    display: 'flex', alignItems: 'center', gap: 10, color: 'var(--green)', fontSize: 14,
                }}>
                    <CheckCircle2 size={20} /> Anvelopa a fost adăugată cu succes în stoc!
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

            <form onSubmit={handleSubmit}>
                <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                    <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                        📦 Informații Produs
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div><label className="form-label">Brand *</label><input className="glass-input" required value={form.brand} onChange={e => setForm(p => ({ ...p, brand: e.target.value }))} placeholder="ex: PETLAS" /></div>
                        <div><label className="form-label">Dimensiune *</label><input className="glass-input" required value={form.dimensiune} onChange={e => setForm(p => ({ ...p, dimensiune: e.target.value }))} placeholder="ex: 205/55 R16" /></div>
                        <div><label className="form-label">Sezon *</label><select className="glass-select" value={form.sezon} onChange={e => setForm(p => ({ ...p, sezon: e.target.value }))}>{sezoane.map(s => <option key={s}>{s}</option>)}</select></div>
                        <div><label className="form-label">DOT</label><input className="glass-input" value={form.dot} onChange={e => setForm(p => ({ ...p, dot: e.target.value }))} placeholder="ex: 2024" /></div>
                        <div><label className="form-label">Cantitate *</label><input className="glass-input" type="number" min="1" required value={form.cantitate} onChange={e => setForm(p => ({ ...p, cantitate: e.target.value }))} placeholder="ex: 4" /></div>
                        <div><label className="form-label">Locație Raft</label><input className="glass-input" value={form.locatie_raft} onChange={e => setForm(p => ({ ...p, locatie_raft: e.target.value }))} placeholder="ex: A1" /></div>
                    </div>
                </div>
                <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                    <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                        💰 Prețuri & Achiziție
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div><label className="form-label">Preț Achiziție (MDL)</label><input className="glass-input" type="number" step="0.01" value={form.pret_achizitie} onChange={e => setForm(p => ({ ...p, pret_achizitie: e.target.value }))} placeholder="ex: 680" /></div>
                        <div><label className="form-label">Preț Vânzare (MDL) *</label><input className="glass-input" type="number" step="0.01" required value={form.pret_vanzare} onChange={e => setForm(p => ({ ...p, pret_vanzare: e.target.value }))} placeholder="ex: 950" /></div>
                        <div><label className="form-label">Furnizor</label><input className="glass-input" value={form.furnizor} onChange={e => setForm(p => ({ ...p, furnizor: e.target.value }))} placeholder="ex: AutoTire SRL" /></div>
                        <div>
                            <label className="form-label">Tip Achiziție *</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                {tipuriAchizitie.map(t => (
                                    <label key={t} className={`checkbox-card ${form.tip_achizitie === t ? 'checked' : ''}`} style={{ flex: 1 }}
                                        onClick={() => setForm(p => ({ ...p, tip_achizitie: t }))}>
                                        <input type="radio" name="tip" checked={form.tip_achizitie === t} readOnly style={{ display: 'none' }} />
                                        {t === 'Cu factură' ? '📄' : '💵'} {t}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                <button type="submit" className="glass-btn glass-btn-success" disabled={saving} style={{ width: '100%', padding: 16, fontSize: 16 }}>
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    {saving ? 'Se salvează...' : saved ? '✓ Salvat!' : 'Salvează Intrarea'}
                </button>
            </form>
        </div>
    );
}
