'use client';

import { use, useState, useRef, useEffect } from 'react';
import { FileText, Printer, ArrowLeft, User, Wrench, Shield, Hotel, Paintbrush, Wind, Disc3, Loader2, Pencil, FileDown } from 'lucide-react';
import Link from 'next/link';
import type { Fisa } from '@/types';
import { generateInvoice } from '@/utils/generate-invoice';

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
                <Link href="/fise" className="glass-btn glass-btn-primary" style={{ marginTop: 16, textDecoration: 'none' }}>
                    Înapoi la Fișe
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
                { label: `Service R${fisa.servicii?.vulcanizare?.diametru || ''} ${fisa.marca_model || ''}`.trim(), active: fisa.servicii?.vulcanizare?.service_complet_r },
                { label: getQuantityLabel('Scos roată', fisa.servicii?.vulcanizare?.scos_roata), active: !!fisa.servicii?.vulcanizare?.scos_roata },
                { label: getQuantityLabel('Montat / demontat', fisa.servicii?.vulcanizare?.montat_demontat), active: !!fisa.servicii?.vulcanizare?.montat_demontat },
                { label: getQuantityLabel('Echilibrat', fisa.servicii?.vulcanizare?.echilibrat), active: !!fisa.servicii?.vulcanizare?.echilibrat },
                { label: 'Curățat butuc', active: fisa.servicii?.vulcanizare?.curatat_butuc },
                { label: 'Azot', active: fisa.servicii?.vulcanizare?.azot },
                { label: 'Valvă', active: fisa.servicii?.vulcanizare?.valva },
                { label: 'Valvă metal', active: fisa.servicii?.vulcanizare?.valva_metal },
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
                { label: `Serviciu A/C Freon 134A (${fisa.servicii?.aer_conditionat?.freon_134a_gr}g)`, active: !!fisa.servicii?.aer_conditionat?.freon_134a_gr },
                { label: `Serviciu A/C Freon 1234YF (${fisa.servicii?.aer_conditionat?.freon_1234yf_gr}g)`, active: !!fisa.servicii?.aer_conditionat?.freon_1234yf_gr },
                { label: 'Schimb radiator', active: fisa.servicii?.aer_conditionat?.schimb_radiator },
                { label: 'Schimb compresor', active: fisa.servicii?.aer_conditionat?.schimb_compresor }
            ].filter(i => i.active)
        },
        {
            title: 'Sisteme Frânare & Altele',
            items: [
                { label: 'Șlefuit discuri', active: fisa.servicii?.frana?.slefuit_discuri },
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
                    padding: '10mm 12mm 28mm 12mm',
                }}>
                    {/* Header */}
                    <div style={{ position: 'relative', marginBottom: '5mm', minHeight: '35mm' }}>
                        {/* Right aligned text */}
                        <div style={{ position: 'absolute', top: 0, right: 0, color: '#000000', textAlign: 'right' }}>
                            <div style={{ fontSize: '20pt', fontWeight: 'bold', marginBottom: '2mm', whiteSpace: 'nowrap' }}>FIȘĂ SERVICE</div>
                            <div style={{ fontSize: '12pt', whiteSpace: 'nowrap' }}>Nr: {fisa.numar_fisa}</div>
                            <div style={{ fontSize: '11pt', whiteSpace: 'nowrap', marginTop: '1mm' }}>Data: {fisa.data_intrarii || '-'}</div>
                        </div>

                        {/* Logo image width 40mm exactly, original aspect ratio */}
                        <img src="/logo-black.jpg" style={{ display: 'block', width: '40mm', height: 'auto', objectFit: 'contain', marginBottom: '10mm' }} alt="Logo" crossOrigin="anonymous" />
                        {/* Company info placed exactly 10mm below logo */}
                        <div style={{ fontSize: '9pt', color: '#555555', lineHeight: '1.5' }}>
                            <div style={{ color: '#000000' }}><strong>SRL ANVELOPEN</strong></div>
                            <div>C/F: 102060004938</div>
                            <div>IBAN: MD29EX00002318183350MD</div>
                            <div>Mun. Ungheni, str. Decebal 62A</div>
                            <div>Tel: 068263644</div>
                            <div>anvelope-ungheni.md</div>
                        </div>
                    </div>

                    {/* ── SEPARATOR ── */}
                    <div style={{ height: '1px', backgroundColor: '#cccccc', marginBottom: '5mm' }}></div>

                    {/* Client section: table */}
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt', marginBottom: '8mm' }}>
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
                        {sections.map((section, sidx) => (
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
                        )}
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
                        <ServiceCheck label="Valvă" checked={fisa.servicii?.vulcanizare?.valva} />
                        <ServiceCheck label="Valvă metal" checked={fisa.servicii?.vulcanizare?.valva_metal} />
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
                {fisa.servicii?.aer_conditionat?.freon_134a_gr && <InfoPair label="Freon 134A" value={`${fisa.servicii?.aer_conditionat?.freon_134a_gr}g`} />}
                {fisa.servicii?.aer_conditionat?.freon_1234yf_gr && <InfoPair label="Freon 1234YF" value={`${fisa.servicii?.aer_conditionat?.freon_1234yf_gr}g`} />}
                <ServiceCheck label="Schimb radiator" checked={fisa.servicii?.aer_conditionat?.schimb_radiator} />
                <ServiceCheck label="Schimb compresor A/C" checked={fisa.servicii?.aer_conditionat?.schimb_compresor} />
            </div>

            {/* Frâne */}
            <div className="glass" style={{ padding: 24, marginBottom: 16 }}>
                <div className="section-header" style={{ margin: '-24px -24px 20px', borderRadius: '24px 24px 0 0' }}>
                    <Disc3 size={18} color="var(--red)" /> 4. Frână
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                    <ServiceCheck label="Șlefuit discuri" checked={fisa.servicii?.frana?.slefuit_discuri} />
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
