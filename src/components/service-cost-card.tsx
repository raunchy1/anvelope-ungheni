'use client';

import React, { useMemo } from 'react';
import { Wrench, Disc3, Hotel, Package, DollarSign, Wind } from 'lucide-react';
import { FisaServicii, HotelAnvelope, PretVulcanizare, PretExtra, PretHotel } from '@/types';
import { getVulcPrice, getExtraPrice, PETIC_PRICE_FALLBACKS } from '@/lib/price-fallbacks';

interface Props {
    servicii: FisaServicii;
    hotel: HotelAnvelope;
    prices: {
        vulcanizare: PretVulcanizare[];
        extra: PretExtra[];
        hotel: PretHotel[];
    };
    stocVanzare?: any[];
}

export default function CostEstimativServicii({ servicii, hotel, prices, stocVanzare = [] }: Props) {
    const selectedServices = useMemo(() => {
        const list: { category: string; icon: any; items: { name: string; price: number }[] }[] = [
            { category: 'Vulcanizare', icon: Wrench, items: [] },
            { category: 'Jante', icon: Disc3, items: [] },
            { category: 'Hotel', icon: Hotel, items: [] },
            { category: 'A/C', icon: Wind, items: [] },
            { category: 'Produse Stoc', icon: Package, items: [] },
        ];

        const v = servicii.vulcanizare;
        const vj = servicii.vopsit_jante;
        const h = hotel;

        // 1. Vulcanizare
        const hasDiametruTip = v.diametru && v.tip_vehicul;
        const priceEntry = hasDiametruTip ? getVulcPrice(prices.vulcanizare || [], v.diametru!, v.tip_vehicul!) : null;

        if (priceEntry) {
            if (v.service_complet_r) {
                const qty = v.service_complet_r_bucati || 4;
                list[0].items.push({ name: `Service R (${qty} bucăți)`, price: (priceEntry.service_complet / 4) * qty });
            } else {
                if (v.scos_roata) {
                    const qty = typeof v.scos_roata === 'object' ? v.scos_roata.quantity : 4;
                    list[0].items.push({ name: `Scos roată (${qty} buc)`, price: priceEntry.scos_roata * qty });
                }
                if (v.montat_demontat) {
                    const qty = typeof v.montat_demontat === 'object' ? v.montat_demontat.quantity : 4;
                    list[0].items.push({ name: `Montat / demontat (${qty} buc)`, price: priceEntry.montat_demontat * qty });
                }
                if (v.echilibrat) {
                    const qty = typeof v.echilibrat === 'object' ? v.echilibrat.quantity : 4;
                    list[0].items.push({ name: `Echilibrat (${qty} buc)`, price: priceEntry.echilibrat * qty });
                }
            }
        }

        const ge = (serv: string) => getExtraPrice(prices.extra || [], serv);

        if (v.curatat_butuc) list[0].items.push({ name: 'Curățat butuc', price: 20 });
        if (v.azot) {
            const price = v.tip_vehicul === 'SUV' ? ge('Azot SUV') : ge('Azot AUTO');
            list[0].items.push({ name: 'Încărcat Azot', price });
        }
        if (v.valva) { const q = v.valva_cantitate || 4; list[0].items.push({ name: `Valvă (${q} buc)`, price: ge('Valva') * q }); }
        if (v.valva_metal) { const q = v.valva_metal_cantitate || 4; list[0].items.push({ name: `Valvă metal (${q} buc)`, price: ge('Valva metal') * q }); }
        if (v.cap_senzor) list[0].items.push({ name: 'Cap senzor (4 buc)', price: ge('Cap senzor') * 4 });
        if (v.senzori_schimbati) list[0].items.push({ name: 'Montat senzor presiune (4 buc)', price: ge('Montat senzor presiune') * 4 });
        if (v.senzori_programati) list[0].items.push({ name: 'Programat senzor + scanat', price: ge('Programat senzor + scanat') });
        if (v.saci) list[0].items.push({ name: `Saci (${v.saci_cantitate || 4} buc)`, price: 5 * (v.saci_cantitate || 4) });
        if (v.petic) list[0].items.push({ name: `Petic ${v.petic}`, price: ge(v.petic) || PETIC_PRICE_FALLBACKS[v.petic] || 0 });

        // 2. Jante
        if (vj.roluit_janta_tabla) list[1].items.push({ name: 'Roluit jantă tablă', price: ge('Roluit janta tabla') });
        if (vj.indreptat_janta_aliaj) list[1].items.push({ name: 'Îndreptat jantă aliaj', price: ge('Indreptat janta aliaj') });
        if (vj.vopsit_janta_culoare) {
            const qty = parseInt(vj.nr_bucati_vopsit || '4');
            list[1].items.push({ name: `Vopsit jantă o culoare (${qty} buc)`, price: 200 * qty });
        }
        if (vj.vopsit_diamant_cut) {
            const qty = parseInt(vj.nr_bucati_vopsit_diamant || '4');
            list[1].items.push({ name: `Vopsit diamant cut + lac (${qty} buc)`, price: 300 * qty });
        }
        if (vj.diamant_cut_lac) {
            const qty = parseInt(vj.nr_bucati_diamant_cut_lac || '4');
            list[1].items.push({ name: `Diamant cut + lac (${qty} buc)`, price: 150 * qty });
        }

        // 3. Hotel
        if (h.activ) {
            const hotelEntry = Array.isArray(prices.hotel) ? prices.hotel.find(p => p.serviciu === (h.tip_depozit === 'Anvelope + jante' ? 'Set 4 anvelope + jante' : 'Set 4 anvelope')) : null;
            const price = hotelEntry?.pret || 300;
            list[2].items.push({ name: `Depozitare ${h.tip_depozit || 'Anvelope'} (${h.bucati || 4} buc)`, price });
        }

        // 4. A/C
        const ac = servicii.aer_conditionat;
        if (ac?.serviciu_ac) {
            list[3].items.push({ name: 'Serviciu AC', price: 150 });
        }
        if (ac?.tip_freon && ac?.grams_freon > 0) {
            const up = ac.tip_freon === 'R134A' ? 0.75 : 5.5;
            list[3].items.push({ name: `Freon ${ac.tip_freon} (${ac.grams_freon}g)`, price: Math.round(ac.grams_freon * up) });
        }

        // 5. Stoc
        stocVanzare.forEach(item => {
            list[4].items.push({ name: `${item.brand} ${item.dimensiune} (${item.cantitate} buc)`, price: item.pret_unitate * item.cantitate });
        });

        const total = list.reduce((acc, cat) => acc + cat.items.reduce((s, i) => s + i.price, 0), 0);
        const vulcServicesSelected = !!(v.service_complet_r || v.scos_roata || v.montat_demontat || v.echilibrat);
        const needsConfig = vulcServicesSelected && !hasDiametruTip;
        const hasItems = list.some(cat => cat.items.length > 0) || needsConfig;

        return {
            list,
            total,
            hasItems,
            needsConfig,
        };
    }, [servicii, hotel, prices, stocVanzare]);

    if (!selectedServices.hasItems) return null;

    return (
        <div className="glass-strong fade-in" style={{ padding: 24, marginBottom: 20, borderRadius: 24, border: '2px solid var(--blue)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 800, color: 'var(--blue)', fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    <DollarSign size={22} />
                    Cost Estimativ Servicii
                </div>
                {selectedServices.needsConfig && (
                    <div style={{ fontSize: 11, color: 'var(--orange)', display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,152,0,0.1)', padding: '4px 10px', borderRadius: 20 }}>
                        <DollarSign size={12} /> Selectați Diametrul & Tipul
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {selectedServices.needsConfig && (
                    <div className="fade-in" style={{ padding: '14px 16px', borderRadius: 14, background: 'rgba(255,152,0,0.1)', border: '1px solid rgba(255,152,0,0.3)', color: 'var(--orange)', fontSize: 13, fontWeight: 600, textAlign: 'center' }}>
                        Selectați <strong>Diametrul</strong> și <strong>Tipul Vehiculului</strong> pentru a vedea prețurile
                    </div>
                )}
                {selectedServices.list.filter(cat => cat.items.length > 0).map(cat => (
                    <div key={cat.category} className="fade-in">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text)' }}>
                            <cat.icon size={16} color="var(--blue)" />
                            {cat.category}
                        </div>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {cat.items.map((item, i) => (
                                <li key={i} style={{
                                    fontSize: 13,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingLeft: 20,
                                    position: 'relative'
                                }}>
                                    <span style={{
                                        position: 'absolute',
                                        left: 6,
                                        top: 8,
                                        width: 5,
                                        height: 5,
                                        borderRadius: '50%',
                                        background: 'var(--blue)',
                                        opacity: 0.5
                                    }}></span>
                                    <span style={{ color: 'var(--text-dim)' }}>{item.name}</span>
                                    <span style={{ fontWeight: 700, color: 'var(--text)' }}>{item.price.toLocaleString('ro-MD')} MDL</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

            <div style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid var(--glass-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>TOTAL ESTIMAT</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: selectedServices.needsConfig ? 'var(--orange)' : 'var(--blue)', textShadow: '0 0 20px rgba(33,150,243,0.2)' }}>
                    {selectedServices.needsConfig ? '—' : `${selectedServices.total.toLocaleString('ro-MD')} MDL`}
                </div>
            </div>
        </div>
    );
}
