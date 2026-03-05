'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import {
    FilePlus, Save, Wrench, Paintbrush, Wind, Disc3, Hotel,
    User, Car, Calendar, Search, Shield, Pencil, Loader2
} from 'lucide-react';
import type { FisaServicii, HotelAnvelope } from '@/types';

export default function EditFisaPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [clientSearch, setClientSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [saved, setSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [nextNum, setNextNum] = useState<string>('...');

    useEffect(() => {
        fetch(`/api/fise/${id}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.success !== false) {
                    setNextNum(data.numar_fisa);
                    setForm(prev => ({
                        ...prev,
                        client_nume: data.client_nume || '',
                        client_telefon: data.client_telefon || '',
                        numar_masina: data.numar_masina || '',
                        marca_model: data.marca_model || '',
                        km_bord: data.km_bord?.toString() || '',
                        dimensiune_anvelope: data.dimensiune_anvelope || '',
                        mecanic: data.mecanic || '',
                        observatii: data.observatii || '',
                        data_intrarii: data.data_intrarii || new Date().toISOString().split('T')[0],
                    }));
                    setClientSearch(data.client_nume || '');
                    if (data.servicii) setServicii(data.servicii);
                    if (data.hotel_anvelope) setHotel(data.hotel_anvelope);
                }
            })
            .catch(console.error)
            .finally(() => setIsLoading(false));
    }, [id]);

    const [form, setForm] = useState({
        client_nume: '', client_telefon: '',
        numar_masina: '', marca_model: '', km_bord: '',
        dimensiune_anvelope: '', mecanic: '', observatii: '',
        data_intrarii: new Date().toISOString().split('T')[0],
    });

    const [servicii, setServicii] = useState<FisaServicii>({
        vulcanizare: {}, vopsit_jante: {}, aer_conditionat: {}, frana: {},
    });

    const [hotel, setHotel] = useState<HotelAnvelope>({
        activ: false, dimensiune_anvelope: '', marca_model: '', status_observatii: '', saci: false, tip_depozit: 'Anvelope', bucati: 4
    });

    const [apiClients, setApiClients] = useState<any[]>([]);

    useEffect(() => {
        if (clientSearch.length < 2) { setApiClients([]); return; }
        const timer = setTimeout(() => {
            fetch(`/api/clienti?q=${encodeURIComponent(clientSearch)}`)
                .then(r => r.json())
                .then(data => setApiClients(data))
                .catch(() => setApiClients([]));
        }, 250);
        return () => clearTimeout(timer);
    }, [clientSearch]);

    const suggestions = apiClients;

    const selectClient = (client: any) => {
        const car = client.masini?.[0];
        setForm(prev => ({
            ...prev,
            client_nume: client.nume,
            client_telefon: client.telefon || '',
            numar_masina: car?.numar_masina || '',
            marca_model: car?.marca_model || '',
            km_bord: car?.last_km?.toString() || '',
            dimensiune_anvelope: car?.dimensiune_anvelope || '',
        }));
        setClientSearch(client.nume);
        setShowSuggestions(false);
    };

    const updateField = (field: string, value: string) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const toggleVulc = (field: string) => {
        setServicii(prev => {
            const current = (prev.vulcanizare as any)[field];
            const updated = { ...prev.vulcanizare, [field]: !current };
            if (field === 'saci' && !current) {
                updated.saci_cantitate = 4;
            }
            return { ...prev, vulcanizare: updated };
        });
    };

    const toggleVulcQuantity = (field: 'scos_roata' | 'montat_demontat' | 'echilibrat', label: string) => {
        setServicii(prev => {
            const current = (prev.vulcanizare as any)[field];
            return {
                ...prev,
                vulcanizare: {
                    ...prev.vulcanizare,
                    [field]: current ? false : { service: label, quantity: 4 }
                }
            };
        });
    };

    const updateVulcQuantity = (field: 'scos_roata' | 'montat_demontat' | 'echilibrat', quantityStr: string) => {
        setServicii(prev => {
            const current = (prev.vulcanizare as any)[field];
            if (current && typeof current === 'object') {
                return {
                    ...prev,
                    vulcanizare: {
                        ...prev.vulcanizare,
                        [field]: { ...current, quantity: quantityStr === '' ? '' : parseInt(quantityStr) }
                    }
                };
            }
            return prev;
        });
    };

    const toggleFrana = (field: string) => {
        setServicii(prev => ({
            ...prev,
            frana: { ...prev.frana, [field]: !(prev.frana as Record<string, unknown>)[field] }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.client_nume || !form.numar_masina || !form.mecanic) {
            alert("Completați câmpurile obligatorii (Nume Client, Nr. Mașină, Mecanic)!");
            return;
        }

        const v: any = servicii.vulcanizare;
        for (const k of ['scos_roata', 'montat_demontat', 'echilibrat']) {
            if (v[k] && typeof v[k] === 'object' && !v[k].quantity) {
                alert(`Introduceți numărul de roți pentru: ${v[k].service}!`);
                return;
            }
        }

        setIsSaving(true);

        const payload = {
            numar_fisa: nextNum !== '...' ? nextNum : undefined,
            client_id: 'edit',
            client_nume: form.client_nume,
            client_telefon: form.client_telefon,
            numar_masina: form.numar_masina,
            marca_model: form.marca_model,
            km_bord: form.km_bord ? parseInt(form.km_bord) : null,
            dimensiune_anvelope: form.dimensiune_anvelope,
            servicii: servicii,
            hotel_anvelope: hotel,
            mecanic: form.mecanic,
            observatii: form.observatii,
            data_intrarii: form.data_intrarii,
        };

        try {
            const res = await fetch(`/api/fise/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'A apărut o eroare la salvare.');
            }

            setSaved(true);

            // Auto-save/update client in client database
            fetch('/api/clienti', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_nume: form.client_nume,
                    client_telefon: form.client_telefon,
                    numar_masina: form.numar_masina,
                    marca_model: form.marca_model,
                    dimensiune_anvelope: form.dimensiune_anvelope,
                    km_bord: form.km_bord ? parseInt(form.km_bord) : null,
                })
            }).catch(console.error);

            setTimeout(() => {
                setSaved(false);
                router.push('/fise');
            }, 2000);

        } catch (err: any) {
            console.error(err);
            alert("Eroare la editare: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return <div className="fade-in" style={{ textAlign: 'center', padding: 60 }}><Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: 'var(--blue)' }} /></div>;
    }

    const CheckboxField = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => (
        <label className={`checkbox-card ${checked ? 'checked' : ''}`} onClick={onChange}>
            <input type="checkbox" checked={checked} readOnly />
            {label}
        </label>
    );

    const QuantityCheckbox = ({ field, label }: { field: 'scos_roata' | 'montat_demontat' | 'echilibrat', label: string }) => {
        const val = servicii.vulcanizare[field] as any;
        const checked = !!val;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <CheckboxField label={label} checked={checked} onChange={() => toggleVulcQuantity(field, label)} />
                {checked && (
                    <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8 }}>
                        <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Număr roți</label>
                        <input
                            type="number"
                            className="glass-input"
                            style={{ padding: '6px 12px', width: 80, fontSize: 13, minHeight: 'auto' }}
                            min={1} max={8}
                            value={val?.quantity ?? ''}
                            onChange={e => updateVulcQuantity(field, e.target.value)}
                            required
                        />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fade-in" style={{ maxWidth: 750, margin: '0 auto' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                <Pencil size={28} color="var(--blue)" />
                Editează Fișa
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 24 }}>
                Nr. Fișă: <span className="badge badge-blue">#{nextNum}</span>
            </p>

            <form onSubmit={handleSubmit}>
                {/* ─── Client Info ─── */}
                <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                    <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                        <User size={18} color="var(--blue)" />
                        Informații Client
                    </div>
                    <div style={{ position: 'relative', marginBottom: 16 }}>
                        <label className="form-label">Nume Client *</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-dim)' }} />
                            <input className="glass-input" style={{ paddingLeft: 36 }}
                                placeholder="Caută sau introdu un client nou..."
                                value={clientSearch}
                                onChange={e => { setClientSearch(e.target.value); setShowSuggestions(true); updateField('client_nume', e.target.value); }}
                                onFocus={() => setShowSuggestions(true)}
                            />
                        </div>
                        {showSuggestions && suggestions.length > 0 && (
                            <div className="glass-strong" style={{
                                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
                                marginTop: 4, maxHeight: 200, overflow: 'auto', borderRadius: 12,
                            }}>
                                {suggestions.map((c: any) => (
                                    <div key={c.id} style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                        <div onClick={() => selectClient(c)} style={{
                                            padding: '10px 16px', cursor: 'pointer',
                                            fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        }}>
                                            <div>
                                                <span style={{ fontWeight: 600 }}>{c.nume}</span>
                                                <span style={{ color: 'var(--text-dim)', marginLeft: 8, fontSize: 12 }}>{c.telefon}</span>
                                            </div>
                                            {c.masini?.length > 0 && (
                                                <span style={{ fontSize: 11, color: 'var(--blue)' }}>
                                                    {c.masini.map((m: any) => m.numar_masina).join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label className="form-label">Telefon</label>
                            <input className="glass-input" placeholder="Nr. telefon"
                                value={form.client_telefon} onChange={e => updateField('client_telefon', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Nr. Mașină *</label>
                            <input className="glass-input" placeholder="ex: IS 01 ABC"
                                value={form.numar_masina} onChange={e => updateField('numar_masina', e.target.value)} required />
                        </div>
                        <div>
                            <label className="form-label">Marcă / Model</label>
                            <input className="glass-input" placeholder="ex: VW Golf"
                                value={form.marca_model} onChange={e => updateField('marca_model', e.target.value)} />
                        </div>
                        <div>
                            <label className="form-label">Km / Bord</label>
                            <input className="glass-input" type="number" placeholder="Kilometraj"
                                value={form.km_bord} onChange={e => updateField('km_bord', e.target.value)} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Dimensiune Anvelope</label>
                            <input className="glass-input" placeholder="ex: 205/55 R16"
                                value={form.dimensiune_anvelope} onChange={e => updateField('dimensiune_anvelope', e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* ─── 1. Servicii Vulcanizare ─── */}
                <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                    <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                        <Wrench size={18} color="var(--blue)" />
                        1. Servicii Vulcanizare
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, alignItems: 'center' }}>
                            <CheckboxField label="Service complet R" checked={!!servicii.vulcanizare.service_complet_r}
                                onChange={() => toggleVulc('service_complet_r')} />
                            <input className="glass-input" style={{ width: 100 }} placeholder="Diametru"
                                value={servicii.vulcanizare.service_complet_diametru || ''}
                                onChange={e => setServicii(p => ({ ...p, vulcanizare: { ...p.vulcanizare, service_complet_diametru: e.target.value } }))} />
                        </div>
                        <QuantityCheckbox field="scos_roata" label="Scos roată" />
                        <QuantityCheckbox field="montat_demontat" label="Montat / demontat" />
                        <QuantityCheckbox field="echilibrat" label="Echilibrat" />
                        <CheckboxField label="Curățat butuc" checked={!!servicii.vulcanizare.curatat_butuc} onChange={() => toggleVulc('curatat_butuc')} />
                        <CheckboxField label="Azot" checked={!!servicii.vulcanizare.azot} onChange={() => toggleVulc('azot')} />
                        <CheckboxField label="Valvă" checked={!!servicii.vulcanizare.valva} onChange={() => toggleVulc('valva')} />
                        <CheckboxField label="Senzori schimbați" checked={!!servicii.vulcanizare.senzori_schimbati} onChange={() => toggleVulc('senzori_schimbati')} />
                        <CheckboxField label="Senzori programați" checked={!!servicii.vulcanizare.senzori_programati} onChange={() => toggleVulc('senzori_programati')} />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <CheckboxField label="Saci" checked={!!servicii.vulcanizare.saci} onChange={() => toggleVulc('saci')} />
                            {servicii.vulcanizare.saci && (
                                <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8 }}>
                                    <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Cantitate saci</label>
                                    <select
                                        className="glass-select"
                                        style={{ padding: '6px 12px', width: 80, fontSize: 13, minHeight: 'auto' }}
                                        value={servicii.vulcanizare.saci_cantitate || 4}
                                        onChange={e => setServicii(p => ({ ...p, vulcanizare: { ...p.vulcanizare, saci_cantitate: parseInt(e.target.value) } }))}
                                    >
                                        {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                            <label className="form-label">Petic</label>
                            <select className="glass-select"
                                value={servicii.vulcanizare.petic || ''}
                                onChange={e => setServicii(p => ({ ...p, vulcanizare: { ...p.vulcanizare, petic: e.target.value } }))}
                            >
                                <option value="">Selectează petic...</option>
                                <option value="UP3">UP3</option>
                                <option value="UP4">UP4</option>
                                <option value="TL110">TL110</option>
                                <option value="TL120">TL120</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* ─── 2. Vopsit / Îndreptat Jante ─── */}
                <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                    <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                        <Paintbrush size={18} color="var(--orange)" />
                        2. Vopsit / Îndreptat Jante
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <CheckboxField label="Vopsit jante"
                            checked={!!servicii.vopsit_jante.vopsit_jante}
                            onChange={() => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, vopsit_jante: !p.vopsit_jante.vopsit_jante } }))} />
                        <CheckboxField label="Îndreptat jante"
                            checked={!!servicii.vopsit_jante.indreptat_jante}
                            onChange={() => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, indreptat_jante: !p.vopsit_jante.indreptat_jante } }))} />
                        <div>
                            <label className="form-label">Nr. Jante</label>
                            <input className="glass-input" placeholder="ex: 4"
                                value={servicii.vopsit_jante.numar_jante || ''}
                                onChange={e => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, numar_jante: e.target.value } }))} />
                        </div>
                        <div>
                            <label className="form-label">Culoare</label>
                            <input className="glass-input" placeholder="ex: Negru mat"
                                value={servicii.vopsit_jante.culoare || ''}
                                onChange={e => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, culoare: e.target.value } }))} />
                        </div>
                        <div>
                            <label className="form-label">Diametru</label>
                            <input className="glass-input" placeholder="ex: 17"
                                value={servicii.vopsit_jante.diametru || ''}
                                onChange={e => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, diametru: e.target.value } }))} />
                        </div>
                    </div>
                </div>

                {/* ─── 3. Aer Condiționat ─── */}
                <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                    <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                        <Wind size={18} color="var(--blue)" />
                        3. Aer Condiționat
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div>
                            <label className="form-label">Freon 134A (grame)</label>
                            <input className="glass-input" type="number" placeholder="ex: 450"
                                value={servicii.aer_conditionat.freon_134a_gr || ''}
                                onChange={e => setServicii(p => ({ ...p, aer_conditionat: { ...p.aer_conditionat, freon_134a_gr: e.target.value } }))} />
                        </div>
                        <div>
                            <label className="form-label">Freon 1234YF (grame)</label>
                            <input className="glass-input" type="number" placeholder="ex: 300"
                                value={servicii.aer_conditionat.freon_1234yf_gr || ''}
                                onChange={e => setServicii(p => ({ ...p, aer_conditionat: { ...p.aer_conditionat, freon_1234yf_gr: e.target.value } }))} />
                        </div>
                        <CheckboxField label="Schimb radiator condiționer"
                            checked={!!servicii.aer_conditionat.schimb_radiator}
                            onChange={() => setServicii(p => ({ ...p, aer_conditionat: { ...p.aer_conditionat, schimb_radiator: !p.aer_conditionat.schimb_radiator } }))} />
                        <CheckboxField label="Schimb compresor A/C"
                            checked={!!servicii.aer_conditionat.schimb_compresor}
                            onChange={() => setServicii(p => ({ ...p, aer_conditionat: { ...p.aer_conditionat, schimb_compresor: !p.aer_conditionat.schimb_compresor } }))} />
                    </div>
                </div>

                {/* ─── 4. Frână ─── */}
                <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                    <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                        <Disc3 size={18} color="var(--red)" />
                        4. Frână
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <CheckboxField label="Șlefuit discuri" checked={!!servicii.frana.slefuit_discuri} onChange={() => toggleFrana('slefuit_discuri')} />
                        <CheckboxField label="Schimb discuri" checked={!!servicii.frana.schimb_discuri} onChange={() => toggleFrana('schimb_discuri')} />
                        <CheckboxField label="Schimbat plăcuțe frână" checked={!!servicii.frana.schimbat_placute} onChange={() => toggleFrana('schimbat_placute')} />
                        <CheckboxField label="Plăcuțe față" checked={!!servicii.frana.placute_fata} onChange={() => toggleFrana('placute_fata')} />
                        <CheckboxField label="Plăcuțe spate" checked={!!servicii.frana.placute_spate} onChange={() => toggleFrana('placute_spate')} />
                        <CheckboxField label="Plăcuțe spate (frână electrică)" checked={!!servicii.frana.placute_spate_frana_electrica} onChange={() => toggleFrana('placute_spate_frana_electrica')} />
                        <div style={{ gridColumn: '1 / -1' }}>
                            <CheckboxField label="Curățat + vopsire etriere" checked={!!servicii.frana.curatat_vopsire_etriere} onChange={() => toggleFrana('curatat_vopsire_etriere')} />
                        </div>
                    </div>
                </div>

                {/* ─── Hotel Anvelope ─── */}
                <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                    <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                        <Hotel size={18} color="var(--green)" />
                        Hotel Anvelope
                    </div>
                    <div style={{ marginBottom: 12 }}>
                        <CheckboxField label="Hotel Anvelope" checked={hotel.activ}
                            onChange={() => setHotel(prev => ({ ...prev, activ: !prev.activ }))} />
                    </div>
                    {hotel.activ && (
                        <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label className="form-label">Dimensiune Anvelope</label>
                                <input className="glass-input" placeholder="ex: 205/55 R16"
                                    value={hotel.dimensiune_anvelope || ''}
                                    onChange={e => setHotel(p => ({ ...p, dimensiune_anvelope: e.target.value }))} />
                            </div>
                            <div>
                                <label className="form-label">Marcă / Model Anvelope</label>
                                <input className="glass-input" placeholder="ex: Continental"
                                    value={hotel.marca_model || ''}
                                    onChange={e => setHotel(p => ({ ...p, marca_model: e.target.value }))} />
                            </div>
                            <div style={{ gridColumn: '1 / -1' }}>
                                <label className="form-label">Status / Observații</label>
                                <textarea className="glass-textarea" placeholder="Starea anvelopelor..."
                                    value={hotel.status_observatii || ''}
                                    onChange={e => setHotel(p => ({ ...p, status_observatii: e.target.value }))} />
                            </div>
                            <CheckboxField label="Saci" checked={!!hotel.saci}
                                onChange={() => setHotel(p => ({ ...p, saci: !p.saci }))} />

                            <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 4 }}>
                                <div>
                                    <label className="form-label">Tip depozit</label>
                                    <select className="glass-select"
                                        value={hotel.tip_depozit || 'Anvelope'}
                                        onChange={e => setHotel(p => ({ ...p, tip_depozit: e.target.value as any }))}
                                    >
                                        <option value="Anvelope">Anvelope</option>
                                        <option value="Anvelope + jante">Anvelope + jante</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="form-label">Bucăți</label>
                                    <select className="glass-select"
                                        value={hotel.bucati || 4}
                                        onChange={e => setHotel(p => ({ ...p, bucati: parseInt(e.target.value) }))}
                                    >
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ─── Additional Info ─── */}
                <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                    <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                        <Calendar size={18} color="var(--blue)" />
                        Informații Adiționale
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label className="form-label">Data Intrării *</label>
                            <input className="glass-input" type="date"
                                value={form.data_intrarii} onChange={e => updateField('data_intrarii', e.target.value)} required />
                        </div>
                        <div>
                            <label className="form-label">Mecanic *</label>
                            <input className="glass-input" placeholder="Numele mecanicului"
                                value={form.mecanic} onChange={e => updateField('mecanic', e.target.value)} required />
                        </div>
                    </div>
                    <div style={{ marginTop: 16 }}>
                        <label className="form-label">Observații</label>
                        <textarea className="glass-textarea" placeholder="Note suplimentare..."
                            value={form.observatii} onChange={e => updateField('observatii', e.target.value)} />
                    </div>
                </div>

                {/* Garanție */}
                <div style={{
                    padding: 14, borderRadius: 16, marginBottom: 16,
                    background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                    textAlign: 'center', fontSize: 13, color: 'var(--green)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                    <Shield size={18} />
                    La serviciu de vulcanizare garanție – 20 zile lucrătoare
                </div>

                <button type="submit" className="glass-btn glass-btn-primary" disabled={isSaving || saved}
                    style={{ width: '100%', padding: '16px 24px', fontSize: 16 }}>
                    <Save size={20} />
                    {saved ? '✓ Fișă actualizată cu succes!' : (isSaving ? 'Se actualizează...' : 'Actualizează Fișa')}
                </button>
            </form>
        </div>
    );
}
