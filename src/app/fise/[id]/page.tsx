'use client';

import { use, useState, useRef, useEffect } from 'react';
import { FileText, Printer, ArrowLeft, User, Wrench, Shield, Hotel, Paintbrush, Wind, Disc3, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { Fisa } from '@/types';

export default function FisaViewPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const [fisa, setFisa] = useState<Fisa | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isPrinting, setIsPrinting] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch('/api/fise')
            .then(res => res.json())
            .then((data: Fisa[]) => {
                setFisa(data.find(f => f.id === id) || null);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, [id]);

    if (isLoading) {
        return <div className="fade-in" style={{ textAlign: 'center', padding: 60 }}><Loader2 className="animate-spin" size={32} style={{ margin: '0 auto', color: 'var(--blue)' }} /></div>;
    }

    if (!fisa) {
        return (
            <div className="fade-in" style={{ textAlign: 'center', padding: 60 }}>
                <h2>Fișa nu a fost găsită</h2>
                <Link href="/stocuri" className="glass-btn glass-btn-primary" style={{ marginTop: 16, textDecoration: 'none' }}>
                    Înapoi la Stocuri
                </Link>
            </div>
        );
    }

    const generatePDF = async () => {
        if (!printRef.current) return;
        setIsPrinting(true);
        try {
            const html2canvas = (await import('html2canvas')).default;
            const { jsPDF } = await import('jspdf');

            const canvas = await html2canvas(printRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });
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

    // Build the sections for the PDF
    const sections = [
        {
            title: 'Vulcanizare',
            items: [
                { label: `Service complet R${fisa.servicii.vulcanizare.service_complet_diametru || ''} ${fisa.marca_model || ''}`.trim(), active: fisa.servicii.vulcanizare.service_complet_r },
                { label: getQuantityLabel('Scos roată', fisa.servicii.vulcanizare.scos_roata), active: !!fisa.servicii.vulcanizare.scos_roata },
                { label: getQuantityLabel('Montat / demontat', fisa.servicii.vulcanizare.montat_demontat), active: !!fisa.servicii.vulcanizare.montat_demontat },
                { label: getQuantityLabel('Echilibrat', fisa.servicii.vulcanizare.echilibrat), active: !!fisa.servicii.vulcanizare.echilibrat },
                { label: 'Curățat butuc', active: fisa.servicii.vulcanizare.curatat_butuc },
                { label: 'Azot', active: fisa.servicii.vulcanizare.azot },
                { label: 'Valvă', active: fisa.servicii.vulcanizare.valva },
                { label: 'Senzori schimbați', active: fisa.servicii.vulcanizare.senzori_schimbati },
                { label: fisa.servicii.vulcanizare.senzori_programati ? 'Senzori programați' : '', active: fisa.servicii.vulcanizare.senzori_programati },
                { label: fisa.servicii.vulcanizare.saci ? `Saci (${fisa.servicii.vulcanizare.saci_cantitate || 0} buc)` : '', active: !!fisa.servicii.vulcanizare.saci },
                { label: fisa.servicii.vulcanizare.petic ? `Petic: ${fisa.servicii.vulcanizare.petic}` : '', active: !!fisa.servicii.vulcanizare.petic }
            ].filter(i => i.active)
        },
        {
            title: 'Servicii Jante',
            items: [
                { label: `Roluit jantă tablă${fisa.servicii.vopsit_jante.numar_jante ? ` (${fisa.servicii.vopsit_jante.numar_jante} buc)` : ''}`, active: !!fisa.servicii.vopsit_jante.roluit_janta_tabla },
                { label: `Îndreptat jantă aliaj${fisa.servicii.vopsit_jante.numar_jante ? ` (${fisa.servicii.vopsit_jante.numar_jante} buc)` : ''}`, active: !!fisa.servicii.vopsit_jante.indreptat_janta_aliaj },
                { label: `Vopsit jantă R${fisa.servicii.vopsit_jante.diametru || ''}${fisa.servicii.vopsit_jante.culoare ? ` - ${fisa.servicii.vopsit_jante.culoare}` : ''}`, active: !!fisa.servicii.vopsit_jante.vopsit_janta },
                { label: `Vopsit diamant cut R${fisa.servicii.vopsit_jante.diametru || ''}${fisa.servicii.vopsit_jante.culoare ? ` - ${fisa.servicii.vopsit_jante.culoare}` : ''}`, active: !!fisa.servicii.vopsit_jante.vopsit_diamant_cut },
                { label: `Diamant cut + lac R${fisa.servicii.vopsit_jante.diametru || ''}${fisa.servicii.vopsit_jante.culoare ? ` - ${fisa.servicii.vopsit_jante.culoare}` : ''}`, active: !!fisa.servicii.vopsit_jante.diamant_cut_lac }
            ].filter(i => i.active)
        },
        {
            title: 'Aer Condiționat',
            items: [
                { label: 'Serviciu A/C (aspirat + vacumat + schimb ulei)', active: !!fisa.servicii.aer_conditionat.serviciu_ac },
                { label: `Freon 134A (${fisa.servicii.aer_conditionat.freon_134a_gr}g) — ${(parseFloat(fisa.servicii.aer_conditionat.freon_134a_gr || '0') * 0.75).toFixed(2)} MDL`, active: !!fisa.servicii.aer_conditionat.freon_134a_gr },
                { label: `Freon 1234YF (${fisa.servicii.aer_conditionat.freon_1234yf_gr}g) — ${(parseFloat(fisa.servicii.aer_conditionat.freon_1234yf_gr || '0') * 5.5).toFixed(2)} MDL`, active: !!fisa.servicii.aer_conditionat.freon_1234yf_gr },
                { label: 'Schimb radiator', active: fisa.servicii.aer_conditionat.schimb_radiator },
                { label: 'Schimb compresor', active: fisa.servicii.aer_conditionat.schimb_compresor }
            ].filter(i => i.active)
        },
        {
            title: 'Sisteme Frânare & Altele',
            items: [
                { label: 'Șlefuit discuri', active: fisa.servicii.frana.slefuit_discuri },
                { label: 'Schimb discuri', active: fisa.servicii.frana.schimb_discuri },
                { label: 'Schimbat plăcuțe', active: fisa.servicii.frana.schimbat_placute },
                { label: 'Plăcuțe față', active: fisa.servicii.frana.placute_fata },
                { label: 'Plăcuțe spate', active: fisa.servicii.frana.placute_spate },
                { label: 'Pl. spate (frână electr.)', active: fisa.servicii.frana.placute_spate_frana_electrica },
                { label: 'Curățat + vopsire etriere', active: fisa.servicii.frana.curatat_vopsire_etriere }
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
                }}>
                    {/* ── HEADER DARK BANNER ── */}
                    <div style={{
                        backgroundColor: '#1a1a1a',
                        padding: '6mm 10mm',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <img
                            src="/logo-anvelope-ungheni-new.png"
                            style={{ display: 'block', width: '62mm', height: 'auto', objectFit: 'contain' }}
                            alt="Logo"
                            crossOrigin="anonymous"
                        />
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '22pt', fontWeight: 'bold', color: '#ffffff', letterSpacing: '0.03em', lineHeight: 1 }}>FIȘĂ SERVICE</div>
                            <div style={{ fontSize: '13pt', color: '#aaaaaa', marginTop: '2mm', letterSpacing: '0.05em' }}>Nr: {fisa.numar_fisa}</div>
                        </div>
                    </div>

                    {/* ── ACCENT LINE ── */}
                    <div style={{ height: '4px', backgroundColor: '#cc0000' }}></div>

                    {/* ── COMPANY INFO BAND ── */}
                    <div style={{
                        backgroundColor: '#f5f5f5',
                        padding: '3mm 10mm',
                        fontSize: '8.5pt',
                        color: '#444444',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6mm',
                        flexWrap: 'wrap',
                        borderBottom: '1px solid #e0e0e0',
                    }}>
                        <span style={{ color: '#1a1a1a', fontWeight: 'bold' }}>SRL ANVELOPEN</span>
                        <span style={{ color: '#cccccc' }}>|</span>
                        <span>C/F: 102060004938</span>
                        <span style={{ color: '#cccccc' }}>|</span>
                        <span>IBAN: MD29EX00002318183350MD</span>
                        <span style={{ color: '#cccccc' }}>|</span>
                        <span>Mun. Ungheni, str. Decebal 62A/1</span>
                        <span style={{ color: '#cccccc' }}>|</span>
                        <span>Tel: 068263644</span>
                        <span style={{ color: '#cccccc' }}>|</span>
                        <span>anvelope-ungheni.md</span>
                    </div>

                    {/* ── BODY ── */}
                    <div style={{ padding: '6mm 10mm 32mm 10mm' }}>

                        {/* ── CLIENT & VEHICUL ── */}
                        <div style={{ marginBottom: '6mm' }}>
                            {/* Section title */}
                            <div style={{
                                backgroundColor: '#cc0000',
                                color: '#ffffff',
                                fontSize: '10pt',
                                fontWeight: 'bold',
                                padding: '2mm 4mm',
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                marginBottom: 0,
                            }}>Client &amp; Vehicul</div>

                            {/* 2-col info table */}
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
                                <tbody>
                                    {[
                                        ['Client', fisa.client_nume, 'Nr. Mașină', fisa.numar_masina],
                                        ['Telefon', fisa.client_telefon, 'Marcă / Model', fisa.marca_model || '-'],
                                        ['Km Bord', fisa.km_bord || '-', 'Anvelope', fisa.dimensiune_anvelope || '-'],
                                        ['Mecanic', fisa.mecanic || '-', 'Data', fisa.data_intrarii || '-'],
                                    ].map((row, ri) => (
                                        <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? '#ffffff' : '#f9f9f9' }}>
                                            <td style={{ padding: '2.5mm 4mm', border: '1px solid #e8e8e8', color: '#888888', fontSize: '8pt', textTransform: 'uppercase', letterSpacing: '0.04em', width: '18%' }}>{row[0]}</td>
                                            <td style={{ padding: '2.5mm 4mm', border: '1px solid #e8e8e8', fontWeight: 'bold', width: '32%' }}>{row[1]}</td>
                                            <td style={{ padding: '2.5mm 4mm', border: '1px solid #e8e8e8', color: '#888888', fontSize: '8pt', textTransform: 'uppercase', letterSpacing: '0.04em', width: '18%' }}>{row[2]}</td>
                                            <td style={{ padding: '2.5mm 4mm', border: '1px solid #e8e8e8', fontWeight: 'bold', width: '32%' }}>{row[3]}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* ── SERVICII EFECTUATE ── */}
                        {sections.length > 0 && (
                            <div>
                                <div style={{
                                    backgroundColor: '#cc0000',
                                    color: '#ffffff',
                                    fontSize: '10pt',
                                    fontWeight: 'bold',
                                    padding: '2mm 4mm',
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                    marginBottom: '4mm',
                                }}>Servicii Efectuate</div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3mm' }}>
                                    {sections.map((section, sidx) => (
                                        <div key={sidx} style={{
                                            borderLeft: '4px solid #cc0000',
                                            backgroundColor: '#fff8f8',
                                            padding: '3mm 4mm',
                                            breakInside: 'avoid',
                                        }}>
                                            <div style={{ fontSize: '10pt', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '2mm', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                                {section.title}
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1mm 6mm', fontSize: '9.5pt' }}>
                                                {section.items.map((item, iidx) => (
                                                    <div key={iidx} style={{ display: 'flex', alignItems: 'center', gap: '2mm', minWidth: '85mm' }}>
                                                        <span style={{ color: '#cc0000', fontWeight: 'bold', fontSize: '11pt', lineHeight: 1 }}>✓</span>
                                                        <span style={{ color: '#222222' }}>{item.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── FOOTER ── */}
                    <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                    }}>
                        <div style={{ height: '3px', backgroundColor: '#cc0000' }}></div>
                        <div style={{
                            backgroundColor: '#1a1a1a',
                            padding: '3mm 10mm',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '9pt',
                            color: '#aaaaaa',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '3mm' }}>
                                <span style={{ color: '#cc0000', fontSize: '14pt' }}>●</span>
                                <span style={{ color: '#ffffff', fontWeight: 'bold' }}>anvelope-ungheni.md</span>
                            </div>
                            <div style={{ color: '#dddddd', fontWeight: 'bold', letterSpacing: '0.04em' }}>
                                Garanție 20 zile lucrătoare
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* END PRINT LAYOUT */}

            {/* NORMAL UI */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <div>
                    <Link href="/stocuri" style={{ fontSize: 13, color: 'var(--blue)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 8 }}>
                        <ArrowLeft size={14} /> Înapoi la Stocuri
                    </Link>
                    <h1 style={{ fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <FileText size={28} color="var(--blue)" />
                        Fișă #{fisa.numar_fisa}
                    </h1>
                </div>
                <button onClick={generatePDF} className="glass-btn glass-btn-primary" disabled={isPrinting}>
                    {isPrinting ? <Loader2 className="animate-spin" size={18} /> : <Printer size={18} />}
                    {isPrinting ? 'Se generează...' : 'Printează Fișă'}
                </button>
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

            {/* Vulcanizare */}
            <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                    <Wrench size={18} color="var(--blue)" /> 1. Servicii Vulcanizare
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                    <ServiceCheck label={`Service complet R${fisa.servicii.vulcanizare.service_complet_diametru || ''}`} checked={fisa.servicii.vulcanizare.service_complet_r} />
                    <ServiceCheck label="Scos roată" checked={fisa.servicii.vulcanizare.scos_roata} />
                    <ServiceCheck label="Montat / demontat" checked={fisa.servicii.vulcanizare.montat_demontat} />
                    <ServiceCheck label="Echilibrat" checked={fisa.servicii.vulcanizare.echilibrat} />
                    <ServiceCheck label="Curățat butuc" checked={fisa.servicii.vulcanizare.curatat_butuc} />
                    <ServiceCheck label="Azot" checked={fisa.servicii.vulcanizare.azot} />
                    <ServiceCheck label="Valvă" checked={fisa.servicii.vulcanizare.valva} />
                    <ServiceCheck label="Senzori schimbați" checked={fisa.servicii.vulcanizare.senzori_schimbati} />
                    <ServiceCheck label="Senzori programați" checked={fisa.servicii.vulcanizare.senzori_programati} />
                    <ServiceCheck
                        label={fisa.servicii.vulcanizare.saci ? `Saci (${fisa.servicii.vulcanizare.saci_cantitate || 0} buc)` : 'Saci'}
                        checked={fisa.servicii.vulcanizare.saci}
                    />
                </div>
                {fisa.servicii.vulcanizare.petic && <InfoPair label="Petic" value={fisa.servicii.vulcanizare.petic} />}
            </div>

            {/* Servicii Jante */}
            <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                    <Paintbrush size={18} color="var(--orange)" /> 2. Servicii Jante
                </div>
                <ServiceCheck label="Roluit jantă tablă" checked={fisa.servicii.vopsit_jante.roluit_janta_tabla} />
                <ServiceCheck label="Îndreptat jantă aliaj" checked={fisa.servicii.vopsit_jante.indreptat_janta_aliaj} />
                <ServiceCheck label="Vopsit jantă" checked={fisa.servicii.vopsit_jante.vopsit_janta} />
                <ServiceCheck label="Vopsit diamant cut" checked={fisa.servicii.vopsit_jante.vopsit_diamant_cut} />
                <ServiceCheck label="Diamant cut + lac" checked={fisa.servicii.vopsit_jante.diamant_cut_lac} />
                {fisa.servicii.vopsit_jante.numar_jante && <InfoPair label="Nr. Jante" value={fisa.servicii.vopsit_jante.numar_jante} />}
                {fisa.servicii.vopsit_jante.diametru && <InfoPair label="Diametru" value={fisa.servicii.vopsit_jante.diametru} />}
                {fisa.servicii.vopsit_jante.culoare && <InfoPair label="Culoare" value={fisa.servicii.vopsit_jante.culoare} />}
            </div>

            {/* AC */}
            <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                    <Wind size={18} color="var(--blue)" /> 3. Aer Condiționat
                </div>
                <ServiceCheck label="Serviciu A/C (aspirat + vacumat + schimb ulei)" checked={fisa.servicii.aer_conditionat.serviciu_ac} />
                {fisa.servicii.aer_conditionat.freon_134a_gr && <InfoPair label="Freon 134A" value={`${fisa.servicii.aer_conditionat.freon_134a_gr}g — ${(parseFloat(fisa.servicii.aer_conditionat.freon_134a_gr) * 0.75).toFixed(2)} MDL`} />}
                {fisa.servicii.aer_conditionat.freon_1234yf_gr && <InfoPair label="Freon 1234YF" value={`${fisa.servicii.aer_conditionat.freon_1234yf_gr}g — ${(parseFloat(fisa.servicii.aer_conditionat.freon_1234yf_gr) * 5.5).toFixed(2)} MDL`} />}
                <ServiceCheck label="Schimb radiator" checked={fisa.servicii.aer_conditionat.schimb_radiator} />
                <ServiceCheck label="Schimb compresor A/C" checked={fisa.servicii.aer_conditionat.schimb_compresor} />
            </div>

            {/* Frâne */}
            <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                    <Disc3 size={18} color="var(--red)" /> 4. Frână
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                    <ServiceCheck label="Șlefuit discuri" checked={fisa.servicii.frana.slefuit_discuri} />
                    <ServiceCheck label="Schimb discuri" checked={fisa.servicii.frana.schimb_discuri} />
                    <ServiceCheck label="Schimbat plăcuțe frână" checked={fisa.servicii.frana.schimbat_placute} />
                    <ServiceCheck label="Plăcuțe față" checked={fisa.servicii.frana.placute_fata} />
                    <ServiceCheck label="Plăcuțe spate" checked={fisa.servicii.frana.placute_spate} />
                    <ServiceCheck label="Plăcuțe spate (frână electrică)" checked={fisa.servicii.frana.placute_spate_frana_electrica} />
                    <ServiceCheck label="Curățat + vopsire etriere" checked={fisa.servicii.frana.curatat_vopsire_etriere} />
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
