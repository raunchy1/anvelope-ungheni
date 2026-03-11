'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    FilePlus, Save, Wrench, Paintbrush, Wind, Disc3, Hotel,
    User, Car, Calendar, Search, Shield, DollarSign, Package, Calculator
} from 'lucide-react';
import type { FisaServicii, HotelAnvelope, PretVulcanizare, PretExtra, PretHotel, Anvelopa } from '@/types';
import CostEstimativServicii from '@/components/service-cost-card';

export default function NewFisaPage() {
    const router = useRouter();
    const [clientSearch, setClientSearch] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [saved, setSaved] = useState(false);
    const [apiClients, setApiClients] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [nextNum, setNextNum] = useState<string>('...');

    // Price lists from API
    const [prices, setPrices] = useState<{
        vulcanizare: PretVulcanizare[];
        extra: PretExtra[];
        hotel: PretHotel[];
    }>({ vulcanizare: [], extra: [], hotel: [] });

    useEffect(() => {
        fetch('/api/fise')
            .then(res => res.json())
            .then(data => {
                const maxNum = Math.max(...data.map((f: any) => parseInt(f.numar_fisa) || 0), 0);
                setNextNum(String(maxNum + 1).padStart(8, '0'));
            })
            .catch(console.error);

        fetch('/api/preturi')
            .then(res => res.json())
            .then(data => setPrices(data))
            .catch(console.error);
    }, []);

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
        activ: false,
        dimensiune_anvelope: '',
        marca_model: '',
        status_observatii: '',
        saci: false,
        status_hotel: 'Depozitate',
        data_depozitare: new Date().toISOString().split('T')[0],
        tip_depozit: 'Anvelope',
        bucati: 4
    });

    // Debounced API search for clients
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

    const [selectedCarIndex, setSelectedCarIndex] = useState<number | null>(null);

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
        setSelectedCarIndex(0);
    };

    const selectCar = (client: any, carIdx: number) => {
        const car = client.masini[carIdx];
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
        setSelectedCarIndex(carIdx);
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
            if (field === 'service_complet_r' && !current) {
                updated.service_complet_r_bucati = 4;
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
    const [stocVanzare, setStocVanzare] = useState<any[]>([]); // Items to sell from stock
    const [stocSearch, setStocSearch] = useState('');
    const [stocSuggestions, setStocSuggestions] = useState<Anvelopa[]>([]);

    useEffect(() => {
        if (stocSearch.length < 2) { setStocSuggestions([]); return; }
        const timer = setTimeout(() => {
            fetch(`/api/stocuri`)
                .then(r => r.json())
                .then(data => {
                    const q = stocSearch.toLowerCase();
                    const filtered = data.filter((a: Anvelopa) =>
                        a.brand.toLowerCase().includes(q) ||
                        a.dimensiune.toLowerCase().includes(q) ||
                        (a.cod_produs && a.cod_produs.toLowerCase().includes(q))
                    );
                    setStocSuggestions(filtered.slice(0, 5));
                })
                .catch(() => setStocSuggestions([]));
        }, 250);
        return () => clearTimeout(timer);
    }, [stocSearch]);

    const addStocItem = (a: Anvelopa) => {
        if (stocVanzare.some(item => item.id_stoc === a.id)) return;
        setStocVanzare(prev => [...prev, {
            id_stoc: a.id,
            brand: a.brand,
            dimensiune: a.dimensiune,
            cantitate: 4,
            pret_unitate: a.pret_vanzare
        }]);
        setStocSearch('');
        setStocSuggestions([]);
    };

    const removeStocItem = (id: number) => {
        setStocVanzare(prev => prev.filter(i => i.id_stoc !== id));
    };

    const updateStocQty = (id: number, qty: number) => {
        setStocVanzare(prev => prev.map(i => i.id_stoc === id ? { ...i, cantitate: qty } : i));
    };

    const calculateTotals = useCallback(() => {
        const v = servicii.vulcanizare;
        const vj = servicii.vopsit_jante;
        const h = hotel;

        let totalVulc = 0;
        let totalJante = 0;
        let totalExtra = 0;
        let totalHotel = 0;
        let totalAC = 0;
        // Safety guard: ensure prices and its arrays exist
        if (!prices || !Array.isArray(prices.vulcanizare)) {
            return { vulcanizare: 0, jante: 0, extra: 0, hotel: 0, total: 0 };
        }

        // 1. Vulcanizare
        if (v.diametru && v.tip_vehicul) {
            const priceEntry = prices.vulcanizare.find(p => p.diametru === v.diametru && p.tip === v.tip_vehicul);
            if (priceEntry) {
                if (v.service_complet_r) {
                    const qty = v.service_complet_r_bucati || 4;
                    totalVulc += (priceEntry.service_complet / 4) * qty;
                } else {
                    if (v.scos_roata) totalVulc += priceEntry.scos_roata * (typeof v.scos_roata === 'object' ? v.scos_roata.quantity : 4);
                    if (v.montat_demontat) totalVulc += priceEntry.montat_demontat * (typeof v.montat_demontat === 'object' ? v.montat_demontat.quantity : 4);
                    if (v.echilibrat) totalVulc += priceEntry.echilibrat * (typeof v.echilibrat === 'object' ? v.echilibrat.quantity : 4);
                }
            }
        }

        // 2. Extra (curatat butuc, azot, valva, senzori, petice)
        const getExtra = (serv: string) => (Array.isArray(prices.extra) ? prices.extra.find(p => p.serviciu === serv)?.pret : 0) || 0;

        if (v.curatat_butuc) totalExtra += 20; // Default or add to table
        if (v.azot) totalExtra += v.tip_vehicul === 'SUV' ? getExtra('Azot SUV') : getExtra('Azot AUTO');
        if (v.valva) totalExtra += getExtra('Valva') * 4;
        if (v.valva_metal) totalExtra += getExtra('Valva metal') * 4;
        if (v.cap_senzor) totalExtra += getExtra('Cap senzor') * 4;
        if (v.senzori_schimbati) totalExtra += getExtra('Montat senzor presiune') * 4;
        if (v.senzori_programati) totalExtra += getExtra('Programat senzor + scanat');
        if (v.saci) totalExtra += 5 * (v.saci_cantitate || 4); // Example
        if (v.petic) totalExtra += getExtra(v.petic);

        // 3. Jante
        if (vj.roluit_janta_tabla) totalJante += getExtra('Roluit janta tabla');
        if (vj.indreptat_janta_aliaj) totalJante += getExtra('Indreptat janta aliaj');
        // Vopsit is usually quoted, but we can add placeholders or use nr_bucati
        if (vj.vopsit_janta_culoare) totalJante += 200 * parseInt(vj.nr_bucati_vopsit || '4');
        if (vj.vopsit_diamant_cut) totalJante += 300 * parseInt(vj.nr_bucati_vopsit_diamant || '4');
        if (vj.diamant_cut_lac) totalJante += 150 * parseInt(vj.nr_bucati_diamant_cut_lac || '4');

        // 4. Hotel
        if (h.activ) {
            const hotelEntry = Array.isArray(prices.hotel) ? prices.hotel.find(p => p.serviciu === (h.tip_depozit === 'Anvelope + jante' ? 'Set 4 anvelope + jante' : 'Set 4 anvelope')) : null;
            totalHotel = hotelEntry?.pret || 300;
        }

        // 5. A/C
        const ac = servicii.aer_conditionat;
        if (ac.serviciu_ac) totalAC += 150;
        if (ac.tip_freon && ac.grams_freon) {
            const up = ac.tip_freon === 'R134A' ? 0.75 : 5.5;
            totalAC += Math.round(ac.grams_freon * up);
        }

        // 6. Stoc
        const totalStoc = stocVanzare.reduce((s, i) => s + (i.pret_unitate * i.cantitate), 0);

        return {
            vulcanizare: totalVulc,
            jante: totalJante,
            extra: totalExtra,
            hotel: totalHotel,
            ac: totalAC,
            stoc: totalStoc,
            total: totalVulc + totalJante + totalExtra + totalHotel + totalAC + totalStoc
        };
    }, [servicii, hotel, prices, stocVanzare]);

    const totals = calculateTotals();

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
            client_id: 'new',
            client_nume: form.client_nume,
            client_telefon: form.client_telefon,
            numar_masina: form.numar_masina,
            marca_model: form.marca_model,
            km_bord: form.km_bord ? parseInt(form.km_bord) : null,
            dimensiune_anvelope: form.dimensiune_anvelope,
            servicii: {
                ...servicii,
                vulcanizare: {
                    ...servicii.vulcanizare,
                    pret_vulcanizare: totals.vulcanizare + totals.extra,
                    pret_jante: totals.jante,
                    pret_hotel: totals.hotel,
                    pret_total: totals.total,
                    stoc_vanzare: stocVanzare
                }
            },
            hotel_anvelope: hotel,
            mecanic: form.mecanic,
            observatii: form.observatii,
            data_intrarii: form.data_intrarii,
            created_by: 'admin'
        };

        try {
            const res = await fetch('/api/fise', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'A apărut o eroare la salvare.');
            }

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

            setSaved(true);
            setTimeout(() => {
                setSaved(false);
                router.push('/fise');
            }, 2000);

        } catch (err: any) {
            console.error(err);
            alert("Eroare la salvare: " + err.message);
        } finally {
            setIsSaving(false);
        }
    };

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

    const anyJanteSelected = !!(
        servicii.vopsit_jante.roluit_janta_tabla ||
        servicii.vopsit_jante.indreptat_janta_aliaj ||
        servicii.vopsit_jante.vopsit_janta ||
        servicii.vopsit_jante.vopsit_diamant_cut ||
        servicii.vopsit_jante.diamant_cut_lac
    );

    const freon134aTotal = parseFloat(servicii.aer_conditionat.freon_134a_gr || '0') * 0.75;
    const freon1234yfTotal = parseFloat(servicii.aer_conditionat.freon_1234yf_gr || '0') * 5.5;
    const acServiceTotal = servicii.aer_conditionat.serviciu_ac ? 150 : 0;
    const acTotal = freon134aTotal + freon1234yfTotal + acServiceTotal;
    const totalGeneral = acTotal;

    return (
        <div className="fade-in" style={{ maxWidth: 750, margin: '0 auto' }}>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
                <FilePlus size={28} color="var(--blue)" />
                Adaugă Fișă Nouă
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
                                    <div key={c.id} style={{
                                        borderBottom: '1px solid var(--glass-border)',
                                    }}>
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
                                        {c.masini?.length > 1 && (
                                            <div style={{ padding: '0 16px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                                {c.masini.map((m: any, idx: number) => (
                                                    <button key={idx} type="button" onClick={() => selectCar(c, idx)}
                                                        className="badge badge-blue" style={{ cursor: 'pointer', fontSize: 11, border: 'none' }}>
                                                        🚗 {m.numar_masina} – {m.marca_model}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
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
                        <div style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label className="form-label">Diametru</label>
                                <select className="glass-select" value={servicii.vulcanizare.diametru || ''}
                                    onChange={e => setServicii(p => ({ ...p, vulcanizare: { ...p.vulcanizare, diametru: e.target.value } }))}>
                                    <option value="">Selectează...</option>
                                    {['R15', 'R15C', 'R16', 'R16C', 'R17', 'R18', 'R19', 'R20', 'R21', 'R22', 'R23', 'R24'].map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="form-label">Tip vehicul</label>
                                <select className="glass-select" value={servicii.vulcanizare.tip_vehicul || ''}
                                    onChange={e => {
                                        const val = e.target.value as any;
                                        setServicii(p => {
                                            const updated = { ...p.vulcanizare, tip_vehicul: val };
                                            // Handle special R15C/R16C logic if needed, but the DB handles it via diametru + tip
                                            return { ...p, vulcanizare: updated };
                                        });
                                    }}>
                                    <option value="">Selectează...</option>
                                    <option value="AUTO">AUTO</option>
                                    <option value="SUV">SUV</option>
                                    <option value="ATMT">ATMT</option>
                                    <option value="MICROBUS">MICROBUS</option>
                                    <option value="TABLA">TABLA (microbus)</option>
                                    <option value="ALIAJ">ALIAJ (microbus)</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <CheckboxField label="Service R" checked={!!servicii.vulcanizare.service_complet_r}
                                onChange={() => toggleVulc('service_complet_r')} />
                            {servicii.vulcanizare.service_complet_r && (
                                <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8 }}>
                                    <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Număr roți</label>
                                    <select
                                        className="glass-select"
                                        style={{ padding: '6px 12px', width: 120, fontSize: 13, minHeight: 'auto' }}
                                        value={servicii.vulcanizare.service_complet_r_bucati || 4}
                                        onChange={e => setServicii(p => ({ ...p, vulcanizare: { ...p.vulcanizare, service_complet_r_bucati: parseInt(e.target.value) } }))}
                                    >
                                        <option value={1}>1 roată</option>
                                        <option value={2}>2 roți</option>
                                        <option value={3}>3 roți</option>
                                        <option value={4}>4 roți</option>
                                    </select>
                                </div>
                            )}
                        </div>
                        <QuantityCheckbox field="scos_roata" label="Scos roată" />
                        <QuantityCheckbox field="montat_demontat" label="Montat / demontat" />
                        <QuantityCheckbox field="echilibrat" label="Echilibrat" />
                        <CheckboxField label="Curățat butuc" checked={!!servicii.vulcanizare.curatat_butuc} onChange={() => toggleVulc('curatat_butuc')} />
                        <CheckboxField label="Azot" checked={!!servicii.vulcanizare.azot} onChange={() => toggleVulc('azot')} />
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', gridColumn: '1 / -1' }}>
                            <CheckboxField label="Valvă" checked={!!servicii.vulcanizare.valva} onChange={() => toggleVulc('valva')} />
                            <CheckboxField label="Valvă metal" checked={!!servicii.vulcanizare.valva_metal} onChange={() => toggleVulc('valva_metal')} />
                            <CheckboxField label="Cap senzor" checked={!!servicii.vulcanizare.cap_senzor} onChange={() => toggleVulc('cap_senzor')} />
                        </div>
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
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <option key={n} value={n}>{n}</option>)}
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

                {/* ─── 2. Servicii Jante ─── */}
                <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                    <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                        <Paintbrush size={18} color="var(--orange)" />
                        2. Servicii Jante
                    </div>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {/* Service 1 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <CheckboxField label="Îndreptat jantă aliaj"
                                checked={!!servicii.vopsit_jante.indreptat_janta_aliaj}
                                onChange={() => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, indreptat_janta_aliaj: !p.vopsit_jante.indreptat_janta_aliaj } }))} />
                            {servicii.vopsit_jante.indreptat_janta_aliaj && (
                                <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8 }}>
                                    <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Diametru</label>
                                    <input className="glass-input" style={{ width: 100, minHeight: 'auto', padding: '6px 12px' }} placeholder="ex: 17"
                                        value={servicii.vopsit_jante.diametru_indreptat || ''}
                                        onChange={e => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, diametru_indreptat: e.target.value } }))} />
                                </div>
                            )}
                        </div>

                        {/* Service 2 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <CheckboxField label="Roluit jantă tablă"
                                checked={!!servicii.vopsit_jante.roluit_janta_tabla}
                                onChange={() => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, roluit_janta_tabla: !p.vopsit_jante.roluit_janta_tabla } }))} />
                            {servicii.vopsit_jante.roluit_janta_tabla && (
                                <div className="fade-in" style={{ paddingLeft: 8 }}>
                                    <input className="glass-input" style={{ width: '100%', minHeight: 'auto', padding: '6px 12px' }} placeholder="Note roluire..."
                                        value={servicii.vopsit_jante.note_roluire || ''}
                                        onChange={e => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, note_roluire: e.target.value } }))} />
                                </div>
                            )}
                        </div>

                        {/* Service 3 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <CheckboxField label="Vopsit jantă R într-o culoare"
                                checked={!!servicii.vopsit_jante.vopsit_janta_culoare}
                                onChange={() => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, vopsit_janta_culoare: !p.vopsit_jante.vopsit_janta_culoare } }))} />
                            {servicii.vopsit_jante.vopsit_janta_culoare && (
                                <div className="fade-in" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Nr. bucăți</label>
                                        <input className="glass-input" style={{ width: 80, minHeight: 'auto', padding: '6px 12px' }} placeholder="4"
                                            value={servicii.vopsit_jante.nr_bucati_vopsit || ''}
                                            onChange={e => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, nr_bucati_vopsit: e.target.value } }))} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Culoare</label>
                                        <input className="glass-input" style={{ width: 150, minHeight: 'auto', padding: '6px 12px' }} placeholder="ex: Gri"
                                            value={servicii.vopsit_jante.culoare_vopsit || ''}
                                            onChange={e => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, culoare_vopsit: e.target.value } }))} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Service 4 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <CheckboxField label="Vopsit jantă R diamant cut + lac"
                                checked={!!servicii.vopsit_jante.vopsit_diamant_cut}
                                onChange={() => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, vopsit_diamant_cut: !p.vopsit_jante.vopsit_diamant_cut } }))} />
                            {servicii.vopsit_jante.vopsit_diamant_cut && (
                                <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 8 }}>
                                    <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Nr. bucăți</label>
                                    <input className="glass-input" style={{ width: 80, minHeight: 'auto', padding: '6px 12px' }} placeholder="4"
                                        value={servicii.vopsit_jante.nr_bucati_vopsit_diamant || ''}
                                        onChange={e => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, nr_bucati_vopsit_diamant: e.target.value } }))} />
                                </div>
                            )}
                        </div>

                        {/* Service 5 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <CheckboxField label="Diamant cut + lac jantă"
                                checked={!!servicii.vopsit_jante.diamant_cut_lac}
                                onChange={() => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, diamant_cut_lac: !p.vopsit_jante.diamant_cut_lac } }))} />
                            {servicii.vopsit_jante.diamant_cut_lac && (
                                <div className="fade-in" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, paddingLeft: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Nr. bucăți</label>
                                        <input className="glass-input" style={{ width: 80, minHeight: 'auto', padding: '6px 12px' }} placeholder="4"
                                            value={servicii.vopsit_jante.nr_bucati_diamant_cut_lac || ''}
                                            onChange={e => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, nr_bucati_diamant_cut_lac: e.target.value } }))} />
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <label style={{ fontSize: 12, color: 'var(--text-dim)' }}>Diametru</label>
                                        <input className="glass-input" style={{ width: 80, minHeight: 'auto', padding: '6px 12px' }} placeholder="17"
                                            value={servicii.vopsit_jante.diametru_diamant_cut_lac || ''}
                                            onChange={e => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, diametru_diamant_cut_lac: e.target.value } }))} />
                                    </div>
                                </div>
                            )}
                        </div>
                        {anyJanteSelected && (
                            <div className="fade-in" style={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                                <div>
                                    <label className="form-label">Nr. Jante</label>
                                    <input className="glass-input" placeholder="ex: 4"
                                        value={servicii.vopsit_jante.numar_jante || ''}
                                        onChange={e => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, numar_jante: e.target.value } }))} />
                                </div>
                                <div>
                                    <label className="form-label">Diametru</label>
                                    <input className="glass-input" placeholder="ex: 17"
                                        value={servicii.vopsit_jante.diametru || ''}
                                        onChange={e => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, diametru: e.target.value } }))} />
                                </div>
                                <div>
                                    <label className="form-label">Culoare</label>
                                    <input className="glass-input" placeholder="ex: Negru mat"
                                        value={servicii.vopsit_jante.culoare || ''}
                                        onChange={e => setServicii(p => ({ ...p, vopsit_jante: { ...p.vopsit_jante, culoare: e.target.value } }))} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── 3. Aer Condiționat ─── */}
                <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                    <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                        <Wind size={18} color="var(--blue)" />
                        3. Aer Condiționat
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <CheckboxField label="Serviciu Aer Condiționat (150 MDL)"
                            checked={!!servicii.aer_conditionat.serviciu_ac}
                            onChange={() => setServicii(p => ({ ...p, aer_conditionat: { ...p.aer_conditionat, serviciu_ac: !p.aer_conditionat.serviciu_ac } }))} />

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            <div>
                                <label className="form-label">Tip freon</label>
                                <select className="glass-select"
                                    value={servicii.aer_conditionat.tip_freon || ''}
                                    onChange={e => setServicii(p => ({ ...p, aer_conditionat: { ...p.aer_conditionat, tip_freon: e.target.value as any } }))}
                                >
                                    <option value="">Selectează...</option>
                                    <option value="R134A">Freon 134A</option>
                                    <option value="R1234YF">Freon 1234YF</option>
                                </select>
                            </div>
                            {servicii.aer_conditionat.tip_freon && (
                                <div className="fade-in">
                                    <label className="form-label">Grame freon</label>
                                    <input className="glass-input" type="number" placeholder="ex: 450"
                                        value={servicii.aer_conditionat.grams_freon || ''}
                                        onChange={e => setServicii(p => ({ ...p, aer_conditionat: { ...p.aer_conditionat, grams_freon: parseFloat(e.target.value) || 0 } }))} />
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <CheckboxField label="Schimb radiator"
                                checked={!!servicii.aer_conditionat.schimb_radiator}
                                onChange={() => setServicii(p => ({ ...p, aer_conditionat: { ...p.aer_conditionat, schimb_radiator: !p.aer_conditionat.schimb_radiator } }))} />
                            <CheckboxField label="Schimb compresor"
                                checked={!!servicii.aer_conditionat.schimb_compresor}
                                onChange={() => setServicii(p => ({ ...p, aer_conditionat: { ...p.aer_conditionat, schimb_compresor: !p.aer_conditionat.schimb_compresor } }))} />
                        </div>
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
                                        <option value="Jante">Jante</option>
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

                {/* ─── 5. Vânzare Anvelope din Stoc ─── */}
                <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                    <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                        <Package size={18} color="var(--blue)" />
                        5. Vânzare Anvelope din Stoc
                    </div>
                    <div style={{ position: 'relative', marginBottom: 16 }}>
                        <label className="form-label">Caută în Stoc (Brand, Dimensiune, Cod)</label>
                        <div style={{ position: 'relative' }}>
                            <Search size={16} style={{ position: 'absolute', left: 12, top: 14, color: 'var(--text-dim)' }} />
                            <input className="glass-input" style={{ paddingLeft: 36 }}
                                placeholder="ex: Michelin 225/45..."
                                value={stocSearch}
                                onChange={e => setStocSearch(e.target.value)}
                            />
                        </div>
                        {stocSuggestions.length > 0 && (
                            <div className="glass-strong" style={{
                                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30,
                                marginTop: 4, borderRadius: 12, overflow: 'hidden'
                            }}>
                                {stocSuggestions.map(a => (
                                    <div key={a.id} onClick={() => addStocItem(a)} style={{
                                        padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--glass-border)',
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                    }}>
                                        <div>
                                            <div style={{ fontWeight: 600 }}>{a.brand} {a.dimensiune}</div>
                                            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{a.cod_produs || 'Fără cod'} • Raft: {a.locatie_raft}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)' }}>{a.pret_vanzare} MDL</div>
                                            <div style={{ fontSize: 10, color: a.cantitate > 4 ? 'var(--green)' : 'var(--orange)' }}>Disponibil: {a.cantitate} buc</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {stocVanzare.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {stocVanzare.map(item => (
                                <div key={item.id_stoc} className="glass-light" style={{ padding: 12, borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: 14 }}>{item.brand} {item.dimensiune}</div>
                                        <div style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 700 }}>{item.pret_unitate} MDL / buc</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <label style={{ fontSize: 11, color: 'var(--text-dim)' }}>Cant.</label>
                                        <select className="glass-select" style={{ minHeight: 32, padding: '0 8px', fontSize: 13, width: 60 }}
                                            value={item.cantitate} onChange={e => updateStocQty(item.id_stoc, parseInt(e.target.value))}>
                                            {[1, 2, 4, 5, 8].map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                        <button type="button" onClick={() => removeStocItem(item.id_stoc)}
                                            style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: 'var(--red)', borderRadius: 8, padding: 6, cursor: 'pointer' }}>
                                            Șterge
                                        </button>
                                    </div>
                                </div>
                            ))}
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

                {/* ─── Sumar Costuri ─── */}
                <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                    <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                        <Calculator size={18} color="var(--blue)" />
                        Sumar Costuri
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {[
                            { label: 'Vulcanizare total', value: null },
                            { label: 'Jante total', value: null },
                            { label: 'Aer condiționat total', value: acTotal > 0 ? acTotal : null },
                            { label: 'Frână total', value: null },
                        ].map(({ label, value }) => (
                            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--glass-border)', fontSize: 14 }}>
                                <span style={{ color: 'var(--text-dim)' }}>{label}</span>
                                <span style={{ fontWeight: 600, color: value ? 'var(--blue)' : undefined }}>
                                    {value !== null ? `${value.toFixed(2)} MDL` : '—'}
                                </span>
                            </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 16 }}>
                            <span style={{ fontWeight: 700 }}>Total general</span>
                            <span style={{ fontWeight: 700, color: 'var(--blue)' }}>
                                {totalGeneral > 0 ? `${totalGeneral.toFixed(2)} MDL` : '—'}
                            </span>
                        </div>
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

                <CostEstimativServicii
                    servicii={servicii}
                    hotel={hotel}
                    prices={prices}
                    stocVanzare={stocVanzare}
                />

                <button type="submit" className="glass-btn glass-btn-primary" disabled={isSaving || saved}
                    style={{ width: '100%', padding: '16px 24px', fontSize: 16 }}>
                    <Save size={20} />
                    {saved ? '✓ Fișă salvată cu succes!' : (isSaving ? 'Se salvează...' : 'Salvează Fișa')}
                </button>
            </form>
        </div>
    );
}
