'use client';

import React, { useMemo } from 'react';
import { Wrench, Disc3, Hotel, Package, DollarSign } from 'lucide-react';
import { FisaServicii, HotelAnvelope, PretVulcanizare, PretExtra, PretHotel } from '@/types';

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
            { category: 'Produse Stoc', icon: Package, items: [] },
        ];

        const v = servicii.vulcanizare;
        const vj = servicii.vopsit_jante;
        const h = hotel;

        // 1. Vulcanizare
        const hasDiametruTip = v.diametru && v.tip_vehicul;
        const priceEntry = hasDiametruTip ? prices.vulcanizare.find(p => p.diametru === v.diametru && p.tip === v.tip_vehicul) : null;

        if (v.service_complet_r) {
            const qty = v.service_complet_r_bucati || 4;
            const price = ((priceEntry?.service_complet || 0) / 4) * qty;
            list[0].items.push({ name: `Service R (${qty} bucăți)`, price });
        } else {
            if (v.scos_roata) {
                const qty = typeof v.scos_roata === 'object' ? v.scos_roata.quantity : 4;
                const price = (priceEntry?.scos_roata || 0) * qty;
                list[0].items.push({ name: `Scos roată (${qty} buc)`, price });
            }
            if (v.montat_demontat) {
                const qty = typeof v.montat_demontat === 'object' ? v.montat_demontat.quantity : 4;
                const price = (priceEntry?.montat_demontat || 0) * qty;
                list[0].items.push({ name: `Montat / demontat (${qty} buc)`, price });
            }
            if (v.echilibrat) {
                const qty = typeof v.echilibrat === 'object' ? v.echilibrat.quantity : 4;
                const price = (priceEntry?.echilibrat || 0) * qty;
                list[0].items.push({ name: `Echilibrat (${qty} buc)`, price });
            }
        }

        const getExtra = (serv: string) => (Array.isArray(prices.extra) ? prices.extra.find(p => p.serviciu === serv)?.pret : 0) || 0;

        if (v.curatat_butuc) list[0].items.push({ name: 'Curățat butuc', price: 20 });
        if (v.azot) {
            const price = v.tip_vehicul === 'SUV' ? getExtra('Azot SUV') : getExtra('Azot AUTO');
            list[0].items.push({ name: 'Încărcat Azot', price });
        }
        if (v.valva) list[0].items.push({ name: 'Valvă (4 buc)', price: getExtra('Valva') * 4 });
        if (v.valva_metal) list[0].items.push({ name: 'Valvă metal (4 buc)', price: getExtra('Valva metal') * 4 });
        if (v.cap_senzor) list[0].items.push({ name: 'Cap senzor (4 buc)', price: getExtra('Cap senzor') * 4 });
        if (v.senzori_schimbati) list[0].items.push({ name: 'Montat senzor presiune (4 buc)', price: getExtra('Montat senzor presiune') * 4 });
        if (v.senzori_programati) list[0].items.push({ name: 'Programat senzor + scanat', price: getExtra('Programat senzor + scanat') });
        if (v.saci) list[0].items.push({ name: `Saci (${v.saci_cantitate || 4} buc)`, price: 5 * (v.saci_cantitate || 4) });
        if (v.petic) list[0].items.push({ name: `Petic ${v.petic}`, price: getExtra(v.petic) });

        // 2. Jante
        if (vj.roluit_janta_tabla) list[1].items.push({ name: 'Roluit jantă tablă', price: getExtra('Roluit janta tabla') });
        if (vj.indreptat_janta_aliaj) list[1].items.push({ name: 'Îndreptat jantă aliaj', price: getExtra('Indreptat janta aliaj') });
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

        // 4. Stoc
        stocVanzare.forEach(item => {
            list[3].items.push({ name: `${item.brand} ${item.dimensiune} (${item.cantitate} buc)`, price: item.pret_unitate * item.cantitate });
        });

        const total = list.reduce((acc, cat) => acc + cat.items.reduce((s, i) => s + i.price, 0), 0);
        const hasItems = list.some(cat => cat.items.length > 0);

        return {
            list,
            total,
            hasItems,
            needsConfig: !hasDiametruTip && list[0].items.length > 0
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
                <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--blue)', textShadow: '0 0 20px rgba(33,150,243,0.2)' }}>
                    {selectedServices.total.toLocaleString('ro-MD')} MDL
                </div>
            </div>
        </div>
    );
}
