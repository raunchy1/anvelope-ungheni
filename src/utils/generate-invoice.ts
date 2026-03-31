import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Fisa } from '@/types';

export const generateInvoice = (fisa: Fisa) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('ro-MD');

    // Helper pentru formatare preț
    const formatPrice = (price: number) => `${price.toLocaleString('ro-MD')} MDL`;

    // Extrage toate secțiunile de servicii
    const vulcanizare = fisa.servicii?.vulcanizare;
    const ac = fisa.servicii?.aer_conditionat;
    const frana = fisa.servicii?.frana;
    const jante = fisa.servicii?.vopsit_jante;
    const hotel = fisa.hotel_anvelope;
    const stocVanzare = vulcanizare?.stoc_vanzare || [];

    // Calculează totaluri pe categorii
    const totalVulcanizare = vulcanizare?.pret_vulcanizare || 0;
    const totalAC = vulcanizare?.pret_ac || 0;
    const totalFrana = vulcanizare?.pret_frane || 0;
    const totalJante = vulcanizare?.pret_jante || 0;
    const totalHotel = vulcanizare?.pret_hotel || 0;
    const totalStoc = stocVanzare.reduce((sum: number, item: any) => sum + (item.pret_unitate * item.cantitate), 0);
    
    const totalGeneral = totalVulcanizare + totalAC + totalFrana + totalJante + totalHotel + totalStoc;

    // ═══════════════════════════════════════════════════════════
    // HEADER
    // ═══════════════════════════════════════════════════════════
    doc.setFillColor(33, 150, 243);
    doc.rect(0, 0, pageWidth, 55, 'F');

    doc.setFontSize(26);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('ANVELOPE UNGHENI', 14, 25);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('SRL ANVELOPEN', pageWidth - 14, 20, { align: 'right' });
    doc.text('CF 102060004938', pageWidth - 14, 25, { align: 'right' });
    doc.text('IBAN: MD29EX00002318183350MD', pageWidth - 14, 30, { align: 'right' });
    doc.text('Mun. Ungheni, str. Decebal 62A/1', pageWidth - 14, 35, { align: 'right' });
    doc.text('Tel: 068263644', pageWidth - 14, 40, { align: 'right' });
    doc.text('https://anvelope-ungheni.md', pageWidth - 14, 45, { align: 'right' });

    // ═══════════════════════════════════════════════════════════
    // DETALII CLIENT
    // ═══════════════════════════════════════════════════════════
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALII FACTURARE', 14, 68);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(230);
    doc.roundedRect(14, 72, pageWidth - 28, 30, 2, 2, 'S');

    doc.text(`Beneficiar: ${fisa.client_nume || 'Nespecificat'}`, 20, 80);
    doc.text(`Telefon: ${fisa.client_telefon || '-'}`, 20, 86);
    doc.text(`Vehicul: ${fisa.marca_model || '-'} (${fisa.numar_masina || '-'})`, 20, 92);

    doc.text(`Nr. Fișă: ${fisa.numar_fisa || fisa.id}`, pageWidth - 20, 80, { align: 'right' });
    doc.text(`Data: ${fisa.data_intrarii || today}`, pageWidth - 20, 86, { align: 'right' });
    doc.text(`Mecanic: ${fisa.mecanic || '-'}`, pageWidth - 20, 92, { align: 'right' });

    let currentY = 110;

    // ═══════════════════════════════════════════════════════════
    // SECȚIUNEA 1: VULCANIZARE
    // ═══════════════════════════════════════════════════════════
    if (vulcanizare && (vulcanizare.service_complet_r || vulcanizare.pret_vulcanizare > 0)) {
        const vulcanizareItems: any[] = [];

        if (vulcanizare.service_complet_r) {
            vulcanizareItems.push([
                `Service Complet Vulcanizare R${vulcanizare.diametru || vulcanizare.service_complet_diametru || ''}`,
                vulcanizare.service_complet_r_bucati || 4,
                formatPrice(vulcanizare.pret_vulcanizare)
            ]);
        } else {
            // Servicii individuale
            if (vulcanizare.scos_roata) {
                const qty = typeof vulcanizare.scos_roata === 'object' ? vulcanizare.scos_roata.quantity : 4;
                vulcanizareItems.push(['Scos / pus roată', qty, '-']);
            }
            if (vulcanizare.montat_demontat) {
                const qty = typeof vulcanizare.montat_demontat === 'object' ? vulcanizare.montat_demontat.quantity : 4;
                vulcanizareItems.push(['Montat / demontat anvelopă', qty, '-']);
            }
            if (vulcanizare.echilibrat) {
                const qty = typeof vulcanizare.echilibrat === 'object' ? vulcanizare.echilibrat.quantity : 4;
                vulcanizareItems.push(['Echilibrat roată', qty, '-']);
            }
            if (vulcanizare.curatat_butuc) vulcanizareItems.push(['Curățat butuc', 4, '-']);
            if (vulcanizare.azot) vulcanizareItems.push(['Umflare cu Azot', 4, '-']);
            if (vulcanizare.valva) vulcanizareItems.push(['Valve cauciuc noi', 4, '-']);
            if (vulcanizare.valva_metal) vulcanizareItems.push(['Valve metal noi', 4, '-']);
            if (vulcanizare.cap_senzor) vulcanizareItems.push(['Capace senzori noi', 4, '-']);
            if (vulcanizare.senzori_schimbati) vulcanizareItems.push(['Senzori schimbați', 4, '-']);
            if (vulcanizare.senzori_programati) vulcanizareItems.push(['Senzori programați', 4, '-']);
            if (vulcanizare.saci) vulcanizareItems.push([`Saci depozitare (${vulcanizare.saci_cantitate || 4} buc)`, vulcanizare.saci_cantitate || 4, '-']);
            if (vulcanizare.petic) vulcanizareItems.push([`Reparație petic ${vulcanizare.petic}`, 1, '-']);
            
            // Total vulcanizare
            if (vulcanizare.pret_vulcanizare > 0) {
                vulcanizareItems.push(['', '', '']);
                vulcanizareItems.push(['TOTAL VULCANIZARE', '', formatPrice(vulcanizare.pret_vulcanizare)]);
            }
        }

        if (vulcanizareItems.length > 0) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(33, 150, 243);
            doc.text('VULCANIZARE', 14, currentY);

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Serviciu', 'Cantitate', 'Preț']],
                body: vulcanizareItems,
                theme: 'striped',
                headStyles: { fillColor: [33, 150, 243], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { font: 'helvetica', fontSize: 10, cellPadding: 3 },
                columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 30, halign: 'center' }, 2: { cellWidth: 40, halign: 'right' } }
            });

            currentY = (doc as any).lastAutoTable.finalY + 10;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // SECȚIUNEA 2: AER CONDIȚIONAT
    // ═══════════════════════════════════════════════════════════
    if (ac && (ac.serviciu_ac || ac.freon_134a_gr || ac.freon_1234yf_gr || ac.schimb_radiator || ac.schimb_compresor)) {
        const acItems: any[] = [];

        if (ac.freon_134a_gr && parseInt(ac.freon_134a_gr) > 0) {
            acItems.push([`Freon R134A - ${ac.freon_134a_gr} grame`, 1, formatPrice(totalAC)]);
        }
        if (ac.freon_1234yf_gr && parseInt(ac.freon_1234yf_gr) > 0) {
            acItems.push([`Freon R1234YF - ${ac.freon_1234yf_gr} grame`, 1, formatPrice(totalAC)]);
        }
        if (ac.grams_freon && ac.grams_freon > 0) {
            acItems.push([`Freon ${ac.tip_freon || 'R134A'} - ${ac.grams_freon} grame`, 1, formatPrice(totalAC)]);
        }
        if (ac.schimb_radiator) acItems.push(['Schimb radiator clima', 1, '-']);
        if (ac.schimb_compresor) acItems.push(['Schimb compresor clima', 1, '-']);
        if (ac.serviciu_ac && acItems.length === 0) {
            acItems.push(['Service complet aer condiționat', 1, formatPrice(totalAC)]);
        }

        if (acItems.length > 0) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(33, 150, 243);
            doc.text('AER CONDIȚIONAT', 14, currentY);

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Serviciu', 'Detalii', 'Preț']],
                body: acItems,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { font: 'helvetica', fontSize: 10, cellPadding: 3 },
                columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 30, halign: 'center' }, 2: { cellWidth: 40, halign: 'right' } }
            });

            currentY = (doc as any).lastAutoTable.finalY + 10;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // SECȚIUNEA 3: SISTEM FRÂNARE
    // ═══════════════════════════════════════════════════════════
    if (frana && (frana.schimbat_placute || frana.schimb_discuri || frana.slefuit_discuri || frana.placute_fata || frana.placute_spate)) {
        const franaItems: any[] = [];

        if (frana.schimbat_placute) franaItems.push(['Schimbat plăcuțe frână', 1, formatPrice(totalFrana)]);
        if (frana.placute_fata) franaItems.push(['Plăcuțe față', 1, '-']);
        if (frana.placute_spate) franaItems.push(['Plăcuțe spate', 1, '-']);
        if (frana.schimb_discuri) franaItems.push(['Schimbat discuri frână', 1, '-']);
        if (frana.slefuit_discuri) franaItems.push(['Șlefuit discuri frână', 1, '-']);

        if (franaItems.length > 0) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(33, 150, 243);
            doc.text('SISTEM FRÂNARE', 14, currentY);

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Serviciu', 'Cantitate', 'Preț']],
                body: franaItems,
                theme: 'striped',
                headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { font: 'helvetica', fontSize: 10, cellPadding: 3 },
                columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 30, halign: 'center' }, 2: { cellWidth: 40, halign: 'right' } }
            });

            currentY = (doc as any).lastAutoTable.finalY + 10;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // SECȚIUNEA 4: VOPSIT JANTE
    // ═══════════════════════════════════════════════════════════
    if (jante && (jante.indreptat_janta_aliaj || jante.roluit_janta_tabla || jante.vopsit_janta_culoare || jante.vopsit_diamant_cut)) {
        const janteItems: any[] = [];

        if (jante.indreptat_janta_aliaj) janteItems.push([`Îndreptat jantă aliaj R${jante.diametru_indreptat || ''}`, 1, formatPrice(totalJante)]);
        if (jante.roluit_janta_tabla) janteItems.push(['Roluit jantă tablă', 1, formatPrice(totalJante)]);
        if (jante.vopsit_janta_culoare) janteItems.push([`Vopsit jante - culoare standard (${jante.nr_bucati_vopsit || 4} buc)`, parseInt(jante.nr_bucati_vopsit || '4'), formatPrice(totalJante)]);
        if (jante.vopsit_diamant_cut) janteItems.push([`Vopsit jante diamant cut (${jante.nr_bucati_vopsit_diamant || 4} buc)`, parseInt(jante.nr_bucati_vopsit_diamant || '4'), formatPrice(totalJante)]);

        if (janteItems.length > 0) {
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(33, 150, 243);
            doc.text('VOPSIT JANTE', 14, currentY);

            autoTable(doc, {
                startY: currentY + 5,
                head: [['Serviciu', 'Cantitate', 'Preț']],
                body: janteItems,
                theme: 'striped',
                headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
                styles: { font: 'helvetica', fontSize: 10, cellPadding: 3 },
                columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 30, halign: 'center' }, 2: { cellWidth: 40, halign: 'right' } }
            });

            currentY = (doc as any).lastAutoTable.finalY + 10;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // SECȚIUNEA 5: HOTEL ANVELOPE
    // ═══════════════════════════════════════════════════════════
    if (hotel?.activ || totalHotel > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(33, 150, 243);
        doc.text('HOTEL ANVELOPE', 14, currentY);

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Serviciu', 'Detalii', 'Preț']],
            body: [[`Depozitare ${hotel?.tip_depozit || 'Anvelope'} - ${hotel?.bucati || 4} bucăți`, '1 lună', formatPrice(totalHotel)]],
            theme: 'striped',
            headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { font: 'helvetica', fontSize: 10, cellPadding: 3 },
            columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 30, halign: 'center' }, 2: { cellWidth: 40, halign: 'right' } }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // ═══════════════════════════════════════════════════════════
    // SECȚIUNEA 6: ANVELOPE VÂNDUTE DIN STOC
    // ═══════════════════════════════════════════════════════════
    if (stocVanzare.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(33, 150, 243);
        doc.text('ANVELOPE VÂNDUTE DIN STOC', 14, currentY);

        const stockTableData = stocVanzare.map((item: any) => [
            `${item.brand} ${item.dimensiune}`,
            item.cantitate,
            `${item.pret_unitate.toLocaleString('ro-MD')} MDL`,
            `${(item.pret_unitate * item.cantitate).toLocaleString('ro-MD')} MDL`
        ]);

        // Adaugă total
        stockTableData.push(['', '', 'TOTAL:', formatPrice(totalStoc)]);

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Produs', 'Cant.', 'Preț/buc', 'Total']],
            body: stockTableData,
            theme: 'striped',
            headStyles: { fillColor: [251, 191, 36], textColor: [0, 0, 0], fontStyle: 'bold' },
            styles: { font: 'helvetica', fontSize: 10, cellPadding: 3 },
            columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 20, halign: 'center' }, 2: { cellWidth: 35, halign: 'right' }, 3: { cellWidth: 35, halign: 'right' } }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Dacă nu există niciun serviciu, adaugă un mesaj
    if (currentY === 110) {
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text('Nu există servicii înregistrate pe această fișă.', 14, currentY);
        currentY += 20;
    }

    // ═══════════════════════════════════════════════════════════
    // FOOTER - TOTALURI
    // ═══════════════════════════════════════════════════════════
    
    // Verifică dacă mai e spațiu pe pagină
    if (currentY > 230) {
        doc.addPage();
        currentY = 20;
    }

    // Linie separatoare
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(14, currentY, pageWidth - 14, currentY);

    currentY += 15;

    // Totaluri detaliate
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);

    let totalY = currentY;
    
    if (totalVulcanizare > 0) {
        doc.text(`Servicii Vulcanizare:`, pageWidth - 80, totalY, { align: 'left' });
        doc.text(formatPrice(totalVulcanizare), pageWidth - 14, totalY, { align: 'right' });
        totalY += 7;
    }
    if (totalAC > 0) {
        doc.text(`Servicii A/C:`, pageWidth - 80, totalY, { align: 'left' });
        doc.text(formatPrice(totalAC), pageWidth - 14, totalY, { align: 'right' });
        totalY += 7;
    }
    if (totalFrana > 0) {
        doc.text(`Servicii Frână:`, pageWidth - 80, totalY, { align: 'left' });
        doc.text(formatPrice(totalFrana), pageWidth - 14, totalY, { align: 'right' });
        totalY += 7;
    }
    if (totalJante > 0) {
        doc.text(`Servicii Jante:`, pageWidth - 80, totalY, { align: 'left' });
        doc.text(formatPrice(totalJante), pageWidth - 14, totalY, { align: 'right' });
        totalY += 7;
    }
    if (totalHotel > 0) {
        doc.text(`Hotel Anvelope:`, pageWidth - 80, totalY, { align: 'left' });
        doc.text(formatPrice(totalHotel), pageWidth - 14, totalY, { align: 'right' });
        totalY += 7;
    }
    if (totalStoc > 0) {
        doc.text(`Anvelope Vândute:`, pageWidth - 80, totalY, { align: 'left' });
        doc.text(formatPrice(totalStoc), pageWidth - 14, totalY, { align: 'right' });
        totalY += 7;
    }

    // Linie înainte de total general
    totalY += 5;
    doc.setDrawColor(33, 150, 243);
    doc.setLineWidth(1);
    doc.line(pageWidth - 150, totalY - 3, pageWidth - 14, totalY - 3);

    // TOTAL GENERAL
    totalY += 10;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 150, 243);
    doc.text('TOTAL GENERAL:', pageWidth - 80, totalY, { align: 'left' });
    doc.text(formatPrice(totalGeneral), pageWidth - 14, totalY, { align: 'right' });

    // Footer text
    totalY += 20;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150);
    doc.text('Prezenta factură servește ca dovadă a serviciilor prestate în unitatea noastră.', pageWidth / 2, totalY, { align: 'center' });
    doc.text('Vă rugăm să păstrați documentul pentru garanție (20 de zile lucrătoare).', pageWidth / 2, totalY + 5, { align: 'center' });

    // Data generării
    doc.text(`Generat la: ${new Date().toLocaleString('ro-MD')}`, pageWidth / 2, 285, { align: 'center' });

    // Salvare
    doc.save(`factura-service-${fisa.numar_fisa || fisa.id}.pdf`);
};
