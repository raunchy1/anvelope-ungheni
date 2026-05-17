'use client';

import { useState, useRef, useEffect, use } from 'react';
import { FileText, Printer, ArrowLeft, User, Wrench, Shield, Hotel, Paintbrush, Wind, Disc3, Loader2, Pencil, FileDown } from 'lucide-react';
import Link from 'next/link';
import type { Fisa } from '@/types';
import { generateInvoice } from '@/utils/generate-invoice';
import { getVulcPrice, getExtraPrice, PETIC_PRICE_FALLBACKS } from '@/lib/price-fallbacks';

export default function FisaViewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    console.log('[FisaView] Component render, id:', id);
    
    const [fisa, setFisa] = useState<Fisa | null>(null);
    const [prices, setPrices] = useState<{ vulcanizare: any[]; extra: any[]; hotel: any[] }>({ vulcanizare: [], extra: [], hotel: [] });
    const [isLoading, setIsLoading] = useState(true);
    const [isPrinting, setIsPrinting] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [rawResponse, setRawResponse] = useState<any>(null);
    const printRef = useRef<HTMLDivElement>(null);
    
    // Track if we've already fetched
    const hasFetched = useRef(false);

    useEffect(() => {
        console.log('[FisaView] useEffect running, hasFetched:', hasFetched.current, 'id:', id);
        if (hasFetched.current) {
            console.log('[FisaView] Already fetched, skipping');
            return;
        }
        hasFetched.current = true;
        
        // FIX: Use specific endpoint instead of fetching all sheets
        fetch(`/api/fise/${id}`)
            .then(async res => {
                const text = await res.text();
                console.log('[FisaView] Raw response:', text);
                setRawResponse(text);
                
                if (!res.ok) {
                    if (res.status === 404) {
                        setFetchError(`API returned 404 - Sheet not found in database`);
                        return null;
                    }
                    throw new Error(`HTTP ${res.status}: ${text}`);
                }
                
                try {
                    return JSON.parse(text);
                } catch (e) {
                    throw new Error(`Invalid JSON: ${text}`);
                }
            })
            .then((data) => {
                console.log('[FisaView] Parsed data:', data);
                // Handle both direct object and {data: ...} wrapper
                const fisaData = data?.data || data;
                setFisa(fisaData || null);
                setIsLoading(false);
            })
            .catch((err) => {
                console.error('[FisaView] Error fetching sheet:', err);
                setFetchError(err.message);
                setIsLoading(false);
            });
    }, [id]);

    useEffect(() => {
        fetch('/api/preturi')
            .then(res => res.json())
            .then(data => { if (Array.isArray(data?.vulcanizare)) setPrices(data); })
            .catch(console.error);
    }, []);

    if (isLoading) {
        return <div className="fade-in" style={{ textAlign: 'center', padding: 60 }}><Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: 'var(--blue)' }} /></div>;
    }

    if (!fisa) {
        return (
            <div className="fade-in" style={{ textAlign: 'center', padding: 60 }}>
                <h2 style={{ marginBottom: 8 }}>Fișa nu a fost găsită</h2>
                <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 16 }}>
                    ID căutat: <code style={{ background: 'var(--surface-2)', padding: '2px 6px', borderRadius: 4 }}>{id}</code>
                </p>
                
                {fetchError && (
                    <div style={{ 
                        background: 'rgba(239, 68, 68, 0.1)', 
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 8,
                        padding: 16,
                        marginBottom: 16,
                        maxWidth: 600,
                        margin: '0 auto 16px'
                    }}>
                        <p style={{ color: '#ef4444', fontSize: 14, marginBottom: 8 }}>
                            <strong>Eroare:</strong> {fetchError}
                        </p>
                        {rawResponse && (
                            <pre style={{ 
                                fontSize: 12, 
                                textAlign: 'left',
                                background: 'rgba(0,0,0,0.2)',
                                padding: 8,
                                borderRadius: 4,
                                overflow: 'auto',
                                maxHeight: 200
                            }}>
                                {rawResponse.substring(0, 500)}
                            </pre>
                        )}
                    </div>
                )}
                <Link href="/fise" className="glass-btn glass-btn-primary" style={{ textDecoration: 'none' }}>
                    Înapoi la Fișe
                </Link>
            </div>
        );
    }

    const generatePDF = async () => {
        if (!printRef.current) return;
        setIsPrinting(true);
        const wrapper = printRef.current.parentElement as HTMLElement;
        const savedStyle = wrapper.style.cssText;
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');

            // html2canvas can't render content at -9999px; temporarily bring into viewport
            wrapper.style.cssText = 'position:fixed;top:0;left:0;opacity:0;pointer-events:none;z-index:9999;';
            await new Promise(r => setTimeout(r, 80));

            const canvas = await html2canvas(printRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            wrapper.style.cssText = savedStyle;

            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const doc = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });
            const pdfWidth = doc.internal.pageSize.getWidth();
            const pdfHeight = doc.internal.pageSize.getHeight();
            let finalHeight = (canvas.height * pdfWidth) / canvas.width;
            let finalWidth = pdfWidth;

            if (finalHeight > pdfHeight) {
                const ratio = pdfHeight / finalHeight;
                finalHeight = pdfHeight;
                finalWidth = pdfWidth * ratio;
            }

            const xOffset = (pdfWidth - finalWidth) / 2;

            doc.addImage(imgData, 'JPEG', xOffset, 0, finalWidth, finalHeight);
            doc.save(`Fisa_${fisa.numar_fisa}.pdf`);
        } catch (err) {
            wrapper.style.cssText = savedStyle;
            console.error('Eroare generare PDF', err);
            alert('A apărut o eroare la generarea PDF-ului.');
        } finally {
            setIsPrinting(false);
        }
    };

    const InfoPair = ({ label, value }: { label: string; value?: string | number | null }) => (
        <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{label}</div>
            <div style={{ fontWeight: 500, fontSize: 14 }}>{value || '-'}</div>
        </div>
    );

    const ServiceCheck = ({ label, checked }: { label: string; checked?: boolean | { service: string; quantity: number } }) => {
        const isChecked = !!checked;
        const displayLabel = (typeof checked === 'object' && checked !== null && checked.quantity)
            ? `${label} – ${checked.quantity} roți`
            : label;

        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', fontSize: 14 }}>
                <span style={{ color: isChecked ? 'var(--blue)' : 'var(--text-dim)', fontSize: 16 }}>{isChecked ? '✓' : '○'}</span>
                <span style={{ color: isChecked ? 'var(--text)' : 'var(--text-dim)' }}>{displayLabel}</span>
            </div>
        );
    };

    const getQuantityLabel = (baseLabel: string, val: any) => {
        if (typeof val === 'object' && val !== null && val.quantity) {
            return `${baseLabel} – ${val.quantity} roți`;
        }
        return baseLabel;
    };

    // Get stock sales from service
    const stocVanzare = (fisa.servicii?.vulcanizare?.stoc_vanzare) || [];
    const totalVanzareStoc = stocVanzare.reduce((sum: number, item: any) => sum + (item.pret_unitate * item.cantitate), 0);
    const profitStoc = stocVanzare.reduce((sum: number, item: any) => sum + ((item.pret_unitate - (item.pret_achizitie || 0)) * item.cantitate), 0);

    // Build the sections for the PDF (Services only)
    const serviceSections = [
        {
            title: 'Vulcanizare',
            items: [
                { label: `Service R${fisa.servicii?.vulcanizare?.diametru || ''} ${fisa.marca_model || ''}`.trim(), active: fisa.servicii?.vulcanizare?.service_complet_r },
                { label: getQuantityLabel('Scos roată', fisa.servicii?.vulcanizare?.scos_roata), active: !!fisa.servicii?.vulcanizare?.scos_roata },
                { label: getQuantityLabel('Montat / demontat', fisa.servicii?.vulcanizare?.montat_demontat), active: !!fisa.servicii?.vulcanizare?.montat_demontat },
                { label: getQuantityLabel('Echilibrat', fisa.servicii?.vulcanizare?.echilibrat), active: !!fisa.servicii?.vulcanizare?.echilibrat },
                { label: 'Curățat butuc', active: fisa.servicii?.vulcanizare?.curatat_butuc },
                { label: 'Azot', active: fisa.servicii?.vulcanizare?.azot },
                { label: `Valvă (${fisa.servicii?.vulcanizare?.valva_cantitate || 4} buc)`, active: !!fisa.servicii?.vulcanizare?.valva },
                { label: `Valvă metal (${fisa.servicii?.vulcanizare?.valva_metal_cantitate || 4} buc)`, active: !!fisa.servicii?.vulcanizare?.valva_metal },
                { label: 'Cap senzor', active: fisa.servicii?.vulcanizare?.cap_senzor },
                { label: 'Senzori schimbați', active: fisa.servicii?.vulcanizare?.senzori_schimbati },
                { label: fisa.servicii?.vulcanizare?.senzori_programati ? 'Senzori programați' : '', active: fisa.servicii?.vulcanizare?.senzori_programati },
                { label: fisa.servicii?.vulcanizare?.saci ? `Saci (${fisa.servicii?.vulcanizare?.saci_cantitate || 0} buc)` : '', active: !!fisa.servicii?.vulcanizare?.saci },
                { label: fisa.servicii?.vulcanizare?.petic ? `Petic: ${fisa.servicii?.vulcanizare?.petic}` : '', active: !!fisa.servicii?.vulcanizare?.petic }
            ].filter(i => i.active)
        },
        {
            title: 'Reparații & Vopsit Jante',
            items: [
                { label: `Îndreptat jantă aliaj R${fisa.servicii?.vopsit_jante?.diametru_indreptat || ''}`, active: fisa.servicii?.vopsit_jante?.indreptat_janta_aliaj },
                { label: `Roluit jantă tablă${fisa.servicii?.vopsit_jante?.note_roluire ? ` (${fisa.servicii?.vopsit_jante?.note_roluire})` : ''}`, active: fisa.servicii?.vopsit_jante?.roluit_janta_tabla },
                { label: `Vopsit jantă o culoare (${fisa.servicii?.vopsit_jante?.nr_bucati_vopsit || 0} buc) - ${fisa.servicii?.vopsit_jante?.culoare_vopsit || ''}`, active: fisa.servicii?.vopsit_jante?.vopsit_janta_culoare },
                { label: `Vopsit jantă diamant cut + lac (${fisa.servicii?.vopsit_jante?.nr_bucati_vopsit_diamant || 0} buc)`, active: fisa.servicii?.vopsit_jante?.vopsit_diamant_cut },
                { label: `Diamant cut + lac jantă R${fisa.servicii?.vopsit_jante?.diametru_diamant_cut_lac || ''} (${fisa.servicii?.vopsit_jante?.nr_bucati_diamant_cut_lac || 0} buc)`, active: fisa.servicii?.vopsit_jante?.diamant_cut_lac }
            ].filter(i => i.active)
        },
        {
            title: 'Aer Condiționat',
            items: [
                { label: 'Serviciu Aer Condiționat', active: !!fisa.servicii?.aer_conditionat?.serviciu_ac },
                { label: `Freon ${fisa.servicii?.aer_conditionat?.tip_freon} (${fisa.servicii?.aer_conditionat?.grams_freon}g)`, active: !!(fisa.servicii?.aer_conditionat?.tip_freon && (fisa.servicii?.aer_conditionat?.grams_freon ?? 0) > 0) },
                { label: 'Schimb radiator', active: !!fisa.servicii?.aer_conditionat?.schimb_radiator },
                { label: 'Schimb compresor', active: !!fisa.servicii?.aer_conditionat?.schimb_compresor }
            ].filter(i => i.active)
        },
        {
            title: 'Sisteme Frânare & Altele',
            items: [
                { label: 'Ŝlefuit discuri', active: fisa.servicii?.frana?.slefuit_discuri },
                { label: 'Schimb discuri', active: fisa.servicii?.frana?.schimb_discuri },
                { label: 'Schimbat plăcuțe', active: fisa.servicii?.frana?.schimbat_placute },
                { label: 'Plăcuțe față', active: fisa.servicii?.frana?.placute_fata },
                { label: 'Plăcuțe spate', active: fisa.servicii?.frana?.placute_spate },
                { label: 'Pl. spate (frână electr.)', active: fisa.servicii?.frana?.placute_spate_frana_electrica },
                { label: 'Curățat + vopsire etriere', active: fisa.servicii?.frana?.curatat_vopsire_etriere }
            ].filter(i => i.active)
        },
        ...(fisa.hotel_anvelope?.activ ? [{
            title: 'Hotel Anvelope',
            items: [
                { label: `Dimensiune: ${fisa.hotel_anvelope.dimensiune_anvelope}`, active: true },
                { label: `Marcă / Model: ${fisa.hotel_anvelope.marca_model}`, active: true },
                { label: `Status / Observații: ${fisa.hotel_anvelope.status_observatii}`, active: !!fisa.hotel_anvelope.status_observatii },
                { label: `Saci: ${fisa.hotel_anvelope.saci ? 'Da' : 'Nu'}`, active: true }
            ].filter(i => i.active)
        }] : []),
        ...(fisa.observatii ? [{
            title: 'Observații',
            items: [
                { label: fisa.observatii, active: true }
            ]
        }] : [])
    ].filter(s => s.items.length > 0);

    // Build stock sales section for PDF (if any)
    const hasStockSales = stocVanzare.length > 0;

    // Compute cost breakdown for PDF
    const _v = fisa.servicii?.vulcanizare || {} as any;
    const _vj = fisa.servicii?.vopsit_jante || {} as any;
    const _h = fisa.hotel_anvelope || {} as any;
    const _ac = fisa.servicii?.aer_conditionat || {} as any;
    const _priceEntry = (_v.diametru && _v.tip_vehicul) ? getVulcPrice(prices.vulcanizare, _v.diametru, _v.tip_vehicul) : null;
    const _ge = (serv: string) => getExtraPrice(prices.extra, serv);

    const costLines: { label: string; price: number }[] = [];
    if (_priceEntry) {
        if (_v.service_complet_r) {
            const qty = _v.service_complet_r_bucati || 4;
            costLines.push({ label: `Service R (${qty} bucăți)`, price: (_priceEntry.service_complet / 4) * qty });
        } else {
            if (_v.scos_roata) { const qty = typeof _v.scos_roata === 'object' ? _v.scos_roata.quantity : 4; costLines.push({ label: `Scos roată (${qty} buc)`, price: _priceEntry.scos_roata * qty }); }
            if (_v.montat_demontat) { const qty = typeof _v.montat_demontat === 'object' ? _v.montat_demontat.quantity : 4; costLines.push({ label: `Montat / demontat (${qty} buc)`, price: _priceEntry.montat_demontat * qty }); }
            if (_v.echilibrat) { const qty = typeof _v.echilibrat === 'object' ? _v.echilibrat.quantity : 4; costLines.push({ label: `Echilibrat (${qty} buc)`, price: _priceEntry.echilibrat * qty }); }
        }
    }
    if (_v.curatat_butuc) costLines.push({ label: 'Curățat butuc', price: 20 });
    if (_v.azot) costLines.push({ label: 'Azot', price: _v.tip_vehicul === 'SUV' ? _ge('Azot SUV') : _ge('Azot AUTO') });
    if (_v.valva) { const q = _v.valva_cantitate || 4; costLines.push({ label: `Valvă (${q} buc)`, price: _ge('Valva') * q }); }
    if (_v.valva_metal) { const q = _v.valva_metal_cantitate || 4; costLines.push({ label: `Valvă metal (${q} buc)`, price: _ge('Valva metal') * q }); }
    if (_v.cap_senzor) costLines.push({ label: 'Cap senzor (4 buc)', price: _ge('Cap senzor') * 4 });
    if (_v.senzori_schimbati) costLines.push({ label: 'Montat senzor presiune (4 buc)', price: _ge('Montat senzor presiune') * 4 });
    if (_v.senzori_programati) costLines.push({ label: 'Programat senzor + scanat', price: _ge('Programat senzor + scanat') });
    if (_v.saci) costLines.push({ label: `Saci (${_v.saci_cantitate || 4} buc)`, price: 5 * (_v.saci_cantitate || 4) });
    if (_v.petic) costLines.push({ label: `Petic ${_v.petic}`, price: _ge(_v.petic) || PETIC_PRICE_FALLBACKS[_v.petic] || 0 });
    if (_vj.roluit_janta_tabla) costLines.push({ label: 'Roluit jantă tablă', price: _ge('Roluit janta tabla') });
    if (_vj.indreptat_janta_aliaj) costLines.push({ label: 'Îndreptat jantă aliaj', price: _ge('Indreptat janta aliaj') });
    if (_vj.vopsit_janta_culoare) { const qty = parseInt(_vj.nr_bucati_vopsit || '4'); costLines.push({ label: `Vopsit jantă culoare (${qty} buc)`, price: 200 * qty }); }
    if (_vj.vopsit_diamant_cut) { const qty = parseInt(_vj.nr_bucati_vopsit_diamant || '4'); costLines.push({ label: `Vopsit diamant cut + lac (${qty} buc)`, price: 300 * qty }); }
    if (_vj.diamant_cut_lac) { const qty = parseInt(_vj.nr_bucati_diamant_cut_lac || '4'); costLines.push({ label: `Diamant cut + lac (${qty} buc)`, price: 150 * qty }); }
    if (_h.activ) {
        const hotelEntry = prices.hotel?.find((p: any) => p.serviciu === (_h.tip_depozit === 'Anvelope + jante' ? 'Set 4 anvelope + jante' : 'Set 4 anvelope'));
        costLines.push({ label: `Depozitare ${_h.tip_depozit || 'Anvelope'}`, price: hotelEntry?.pret || 300 });
    }
    if (_ac.serviciu_ac) costLines.push({ label: 'Serviciu A/C', price: 150 });
    if (_ac.tip_freon && _ac.grams_freon > 0) { const up = _ac.tip_freon === 'R134A' ? 0.75 : 5.5; costLines.push({ label: `Freon ${_ac.tip_freon} (${_ac.grams_freon}g)`, price: Math.round(_ac.grams_freon * up) }); }
    stocVanzare.forEach((item: any) => costLines.push({ label: `${item.brand} ${item.dimensiune} (${item.cantitate} buc)`, price: item.pret_unitate * item.cantitate }));

    const costTotal = costLines.reduce((s, l) => s + l.price, 0);
    const hasCostLines = costLines.length > 0;

    return (
        <div className="fade-in" style={{ maxWidth: 750, margin: '0 auto' }}>

            {/* HIDDEN PRINT LAYOUT STRICTLY FORMATTED FOR A4 PDF GENERATION */}
            <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -100 }}>
                <div ref={printRef} style={{
                    width: '210mm',
                    minHeight: '297mm',
                    backgroundColor: '#ffffff',
                    fontFamily: "'Arial', 'Helvetica', sans-serif",
                    color: '#1a1a1a',
                    boxSizing: 'border-box',
                    position: 'relative',
                    padding: '8mm 10mm 22mm 10mm',
                }}>
                    {/* Header: Logo stânga + date companie centru + fișă dreapta */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '4mm' }}>
                        {/* Logo */}
                        <img src="/logo-transparent.png" style={{ display: 'block', width: '45mm', height: 'auto', objectFit: 'contain', flexShrink: 0 }} alt="Logo" crossOrigin="anonymous" />

                        {/* Company info - centru */}
                        <div style={{ fontSize: '7.5pt', color: '#333333', lineHeight: '1.6', flex: 1, padding: '0 6mm' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '8.5pt', color: '#000000', marginBottom: '1mm' }}>S.R.L. &quot;ANVELOPEN&quot;</div>
                            <div>c/f 1020609004938</div>
                            <div>TVA 9501340</div>
                            <div>Mun. Ungheni, str. Danuteni 78</div>
                            <div>B.C. &quot;Eximbank&quot; S.A., Sucursala nr. 2</div>
                            <div>EXMMMD22835</div>
                            <div>MD29EX000000225181335OMD</div>
                            <div>MD24EX000000225181335OEU</div>
                            <div>Administrator: Ermurache Alexei</div>
                            <div>Contacte: 060711101</div>
                        </div>

                        {/* FIȘĂ SERVICE - dreapta */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: '16pt', fontWeight: 'bold', color: '#000000', whiteSpace: 'nowrap' }}>FIȘĂ SERVICE</div>
                            <div style={{ fontSize: '10pt', marginTop: '2mm' }}>Nr: <strong>{fisa.numar_fisa}</strong></div>
                            <div style={{ fontSize: '10pt', marginTop: '1mm' }}>Data: {fisa.data_intrarii || '-'}</div>
                        </div>
                    </div>

                    {/* ── SEPARATOR ── */}
                    <div style={{ height: '1px', backgroundColor: '#cccccc', marginBottom: '4mm' }}></div>

                    {/* Client section: table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt', marginBottom: '4mm' }}>
                        <tbody>
                            {[
                                ['Client', fisa.client_nume || '-'],
                                ['Telefon', fisa.client_telefon || '-'],
                                ['Nr. Mașină', fisa.numar_masina || '-'],
                                ['Marcă / Model', fisa.marca_model || '-'],
                                ['Km Bord', fisa.km_bord || '-'],
                                ['Dimensiune Anvelope', fisa.dimensiune_anvelope || '-'],
                                ['Data', fisa.data_intrarii || '-'],
                                ['Mecanic', fisa.mecanic || '-'],
                            ].map((row, ri) => (
                                <tr key={ri}>
                                    <td style={{ padding: '1.5mm 3mm', border: '1px solid #cccccc', color: '#666666', fontSize: '8.5pt', textTransform: 'uppercase', letterSpacing: '0.03em', width: '38%', backgroundColor: '#f9f9f9' }}>{row[0]}</td>
                                    <td style={{ padding: '1.5mm 3mm', border: '1px solid #cccccc', fontWeight: 500, width: '62%', backgroundColor: '#ffffff' }}>{row[1]}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Services section */}
                    <div style={{ fontSize: '9pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3mm' }}>Servicii Efectuate</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3mm' }}>
                        {serviceSections.map((section, sidx) => (
                            <div key={sidx} style={{ breakInside: 'avoid', border: '1px solid #cccccc', padding: '2.5mm 3.5mm' }}>
                                <div style={{ fontSize: '8.5pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '1.5mm', color: '#1a1a1a' }}>{section.title}</div>
                                <div style={{ fontSize: '9.5pt', display: 'flex', flexDirection: 'column', gap: '0.5mm' }}>
                                    {section.items.map((item, iidx) => (
                                        <div key={iidx} style={{ display: 'flex', alignItems: 'center', gap: '2mm' }}>
                                            <span style={{ fontWeight: 'bold' }}>✓</span>
                                            <span>{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Stock Sales Section - Only if there are sales */}
                    {hasStockSales && (
                        <>
                            <div style={{ fontSize: '9pt', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '5mm', marginBottom: '3mm', color: '#d97706' }}>Anvelope Vândute din Stoc</div>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt', marginBottom: '3mm' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#fef3c7' }}>
                                        <th style={{ padding: '2mm', border: '1px solid #cccccc', textAlign: 'left', fontSize: '8pt' }}>Produs</th>
                                        <th style={{ padding: '2mm', border: '1px solid #cccccc', textAlign: 'center', fontSize: '8pt', width: '15%' }}>Cant.</th>
                                        <th style={{ padding: '2mm', border: '1px solid #cccccc', textAlign: 'right', fontSize: '8pt', width: '20%' }}>Preț/buc</th>
                                        <th style={{ padding: '2mm', border: '1px solid #cccccc', textAlign: 'right', fontSize: '8pt', width: '20%' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stocVanzare.map((item: any, idx: number) => (
                                        <tr key={idx}>
                                            <td style={{ padding: '2mm', border: '1px solid #cccccc' }}>
                                                <strong>{item.brand}</strong> {item.dimensiune}
                                                {item.dot && <span style={{ fontSize: '7.5pt', color: '#666' }}> (DOT: {item.dot})</span>}
                                            </td>
                                            <td style={{ padding: '2mm', border: '1px solid #cccccc', textAlign: 'center' }}>{item.cantitate} buc</td>
                                            <td style={{ padding: '2mm', border: '1px solid #cccccc', textAlign: 'right' }}>{item.pret_unitate} MDL</td>
                                            <td style={{ padding: '2mm', border: '1px solid #cccccc', textAlign: 'right', fontWeight: 'bold' }}>{(item.pret_unitate * item.cantitate).toLocaleString('ro-MD')} MDL</td>
                                        </tr>
                                    ))}
                                    <tr style={{ backgroundColor: '#f9fafb' }}>
                                        <td colSpan={3} style={{ padding: '2mm', border: '1px solid #cccccc', textAlign: 'right', fontWeight: 'bold' }}>Total Anvelope:</td>
                                        <td style={{ padding: '2mm', border: '1px solid #cccccc', textAlign: 'right', fontWeight: 'bold', color: '#d97706' }}>{totalVanzareStoc.toLocaleString('ro-MD')} MDL</td>
                                    </tr>
                                </tbody>
                            </table>
                        </>
                    )}

                    {/* Signature row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6mm', fontSize: '8.5pt', color: '#444' }}>
                        <div>Mecanic: ________________________</div>
                        <div>Client: ________________________</div>
                    </div>

                    {/* ── FOOTER ── */}
                    <div style={{
                        position: 'absolute',
                        bottom: '8mm',
                        left: '12mm',
                        right: '12mm',
                        borderTop: '1px solid #cccccc',
                        paddingTop: '3mm',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '8.5pt',
                        color: '#444444',
                    }}>
                        <div>anvelope-ungheni.md</div>
                        <div>Garanție servicii: 20 zile lucrătoare</div>
                    </div>
                </div>
            </div>
            {/* END PRINT LAYOUT */}

            {/* NORMAL UI */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <Link href="/fise" style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                        <ArrowLeft size={14} /> Înapoi la Fișe
                    </Link>
                    <h1 style={{ fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileText size={28} color="var(--blue)" />
                        Fișă #{fisa.numar_fisa}
                    </h1>
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <Link href={`/fise/edit/${fisa.id}`} className="glass-btn" style={{ textDecoration: 'none' }}>
                        <Pencil size={18} />
                        Editează
                    </Link>
                    <button onClick={generatePDF} className="glass-btn" disabled={isPrinting}>
                        {isPrinting ? <Loader2 className="animate-spin" size={18} /> : <Printer size={18} />}
                        {isPrinting ? 'Se generează...' : 'Printează Fișă'}
                    </button>
                    <button onClick={() => generateInvoice(fisa)} className="glass-btn glass-btn-primary">
                        <FileDown size={18} />
                        Generează Factură PDF
                    </button>
                </div>
            </div>

            {/* Client Info */}
            <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                    <User size={18} color="var(--blue)" /> Informații Client & Vehicul
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                    <InfoPair label="Client" value={fisa.client_nume} />
                    <InfoPair label="Telefon" value={fisa.client_telefon} />
                    <InfoPair label="Nr. Mașină" value={fisa.numar_masina} />
                    <InfoPair label="Marcă / Model" value={fisa.marca_model} />
                    <InfoPair label="Km / Bord" value={fisa.km_bord} />
                    <InfoPair label="Dimensiune Anvelope" value={fisa.dimensiune_anvelope} />
                    <InfoPair label="Mecanic" value={fisa.mecanic} />
                    <InfoPair label="Data Intrării" value={fisa.data_intrarii} />
                </div>
            </div>

            {/* Vânzare Anvelope din Stoc */}
            {stocVanzare.length > 0 && (
                <div className="glass" style={{ padding: 24, marginBottom: 16, border: '2px solid rgba(251,191,36,0.4)' }}>
                    <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0', background: 'linear-gradient(135deg, rgba(251,191,36,0.9), rgba(245,158,11,0.9))' }}>
                        <span style={{ color: '#1e293b', fontWeight: 700 }}>🛹 VÂNZARE ANVELOPE DIN STOC</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {stocVanzare.map((item: any, idx: number) => (
                            <div key={idx} style={{ 
                                padding: 14, borderRadius: 10, 
                                background: 'rgba(251,191,36,0.1)', 
                                border: '1px solid rgba(251,191,36,0.2)',
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, fontSize: 15 }}>{item.brand} {item.dimensiune}</div>
                                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                                        {item.cantitate} buc × {item.pret_unitate} MDL
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--blue)' }}>
                                        {(item.pret_unitate * item.cantitate).toLocaleString('ro-MD')} MDL
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--green)' }}>
                                        Profit: +{((item.pret_unitate - (item.pret_achizitie || 0)) * item.cantitate).toLocaleString('ro-MD')} MDL
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div style={{ 
                            marginTop: 8, padding: 16, borderRadius: 10,
                            background: 'linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.9))',
                            color: 'white'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span>Total anvelope vândute:</span>
                                <span>{stocVanzare.reduce((s: number, i: any) => s + i.cantitate, 0)} buc</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span>Total vânzare:</span>
                                <span>{totalVanzareStoc.toLocaleString('ro-MD')} MDL</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#4ade80' }}>
                                <span>Profit total:</span>
                                <span>+{profitStoc.toLocaleString('ro-MD')} MDL</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Vulcanizare */}
            <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                    <Wrench size={18} color="var(--blue)" /> 1. Servicii Vulcanizare
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                    <ServiceCheck label={`Service R${fisa.servicii?.vulcanizare?.diametru || ''}`} checked={fisa.servicii?.vulcanizare?.service_complet_r} />
                    <ServiceCheck label="Scos roată" checked={fisa.servicii?.vulcanizare?.scos_roata} />
                    <ServiceCheck label="Montat / demontat" checked={fisa.servicii?.vulcanizare?.montat_demontat} />
                    <ServiceCheck label="Echilibrat" checked={fisa.servicii?.vulcanizare?.echilibrat} />
                    <ServiceCheck label="Curățat butuc" checked={fisa.servicii?.vulcanizare?.curatat_butuc} />
                    <ServiceCheck label="Azot" checked={fisa.servicii?.vulcanizare?.azot} />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', gridColumn: '1 / -1' }}>
                        <ServiceCheck label={`Valvă (${fisa.servicii?.vulcanizare?.valva_cantitate || 4} buc)`} checked={fisa.servicii?.vulcanizare?.valva} />
                        <ServiceCheck label={`Valvă metal (${fisa.servicii?.vulcanizare?.valva_metal_cantitate || 4} buc)`} checked={fisa.servicii?.vulcanizare?.valva_metal} />
                        <ServiceCheck label="Cap senzor" checked={fisa.servicii?.vulcanizare?.cap_senzor} />
                    </div>
                    <ServiceCheck label="Senzori schimbați" checked={fisa.servicii?.vulcanizare?.senzori_schimbati} />
                    <ServiceCheck label="Senzori programați" checked={fisa.servicii?.vulcanizare?.senzori_programati} />
                    <ServiceCheck
                        label={fisa.servicii?.vulcanizare?.saci ? `Saci (${fisa.servicii?.vulcanizare?.saci_cantitate || 0} buc)` : 'Saci'}
                        checked={fisa.servicii?.vulcanizare?.saci}
                    />
                </div>
                {fisa.servicii?.vulcanizare?.petic && <InfoPair label="Petic" value={fisa.servicii?.vulcanizare?.petic} />}
            </div>

            {/* Servicii Jante */}
            <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                    <Paintbrush size={18} color="var(--orange)" /> 2. Servicii Jante
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                    <ServiceCheck label="Îndreptat jantă aliaj" checked={fisa.servicii?.vopsit_jante?.indreptat_janta_aliaj} />
                    <ServiceCheck label="Roluit jantă tablă" checked={fisa.servicii?.vopsit_jante?.roluit_janta_tabla} />
                    <ServiceCheck label="Vopsit jantă o culoare" checked={fisa.servicii?.vopsit_jante?.vopsit_janta_culoare} />
                    <ServiceCheck label="Vopsit diamant cut + lac" checked={fisa.servicii?.vopsit_jante?.vopsit_diamant_cut} />
                    <ServiceCheck label="Diamant cut + lac jantă" checked={fisa.servicii?.vopsit_jante?.diamant_cut_lac} />
                </div>

                <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {fisa.servicii?.vopsit_jante?.indreptat_janta_aliaj && fisa.servicii?.vopsit_jante?.diametru_indreptat &&
                        <InfoPair label="Diametru (Îndreptat)" value={fisa.servicii?.vopsit_jante?.diametru_indreptat} />}

                    {fisa.servicii?.vopsit_jante?.roluit_janta_tabla && fisa.servicii?.vopsit_jante?.note_roluire &&
                        <InfoPair label="Note Roluire" value={fisa.servicii?.vopsit_jante?.note_roluire} />}

                    {fisa.servicii?.vopsit_jante?.vopsit_janta_culoare && (
                        <>
                            <InfoPair label="Nr. bucăți (Vopsit)" value={fisa.servicii?.vopsit_jante?.nr_bucati_vopsit} />
                            <InfoPair label="Culoare" value={fisa.servicii?.vopsit_jante?.culoare_vopsit} />
                        </>
                    )}

                    {fisa.servicii?.vopsit_jante?.vopsit_diamant_cut &&
                        <InfoPair label="Nr. bucăți (Diamant Cut)" value={fisa.servicii?.vopsit_jante?.nr_bucati_vopsit_diamant} />}

                    {fisa.servicii?.vopsit_jante?.diamant_cut_lac && (
                        <>
                            <InfoPair label="Nr. bucăți (DC + lac)" value={fisa.servicii?.vopsit_jante?.nr_bucati_diamant_cut_lac} />
                            <InfoPair label="Diametru (DC + lac)" value={fisa.servicii?.vopsit_jante?.diametru_diamant_cut_lac} />
                        </>
                    )}
                </div>
            </div>

            {/* AC */}
            <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                    <Wind size={18} color="var(--blue)" /> 3. Aer Condiționat
                </div>
                {fisa.servicii?.aer_conditionat?.serviciu_ac && <InfoPair label="Serviciu A/C" value="Da" />}
                {fisa.servicii?.aer_conditionat?.tip_freon && (fisa.servicii?.aer_conditionat?.grams_freon ?? 0) > 0 && <InfoPair label={`Freon ${fisa.servicii.aer_conditionat.tip_freon}`} value={`${fisa.servicii.aer_conditionat.grams_freon}g`} />}
                <ServiceCheck label="Schimb radiator" checked={fisa.servicii?.aer_conditionat?.schimb_radiator} />
                <ServiceCheck label="Schimb compresor A/C" checked={fisa.servicii?.aer_conditionat?.schimb_compresor} />
            </div>

            {/* Frâne */}
            <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                    <Disc3 size={18} color="var(--red)" /> 4. Frână
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                    <ServiceCheck label="Ŝlefuit discuri" checked={fisa.servicii?.frana?.slefuit_discuri} />
                    <ServiceCheck label="Schimb discuri" checked={fisa.servicii?.frana?.schimb_discuri} />
                    <ServiceCheck label="Schimbat plăcuțe frână" checked={fisa.servicii?.frana?.schimbat_placute} />
                    <ServiceCheck label="Plăcuțe față" checked={fisa.servicii?.frana?.placute_fata} />
                    <ServiceCheck label="Plăcuțe spate" checked={fisa.servicii?.frana?.placute_spate} />
                    <ServiceCheck label="Plăcuțe spate (frână electrică)" checked={fisa.servicii?.frana?.placute_spate_frana_electrica} />
                    <ServiceCheck label="Curățat + vopsire etriere" checked={fisa.servicii?.frana?.curatat_vopsire_etriere} />
                </div>
            </div>

            {/* Hotel */}
            {fisa.hotel_anvelope?.activ && (
                <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                    <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                        <Hotel size={18} color="var(--green)" /> Hotel Anvelope
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <InfoPair label="Dimensiune" value={fisa.hotel_anvelope.dimensiune_anvelope} />
                        <InfoPair label="Marcă / Model" value={fisa.hotel_anvelope.marca_model} />
                        <InfoPair label="Status / Observații" value={fisa.hotel_anvelope.status_observatii} />
                        <InfoPair label="Saci" value={fisa.hotel_anvelope.saci ? 'Da' : 'Nu'} />
                    </div>
                </div>
            )}

            {/* Observații */}
            {fisa.observatii && (
                <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 4 }}>Observații</div>
                    <div style={{ fontSize: 14 }}>{fisa.observatii}</div>
                </div>
            )}

            {/* Garanție */}
            <div style={{
                padding: 14, borderRadius: 16, marginBottom: 16,
                background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
                textAlign: 'center', fontSize: 13, color: 'var(--green)',
            }}>
                <Shield size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                La serviciu de vulcanizare garanție – 20 zile lucrătoare
            </div>
        </div>
    );
}