import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Fisa } from '@/types';

export const generateInvoice = (fisa: Fisa) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString('ro-MD');

    const v = fisa.servicii?.vulcanizare;
    const pretTotal = v?.pret_total || 0;

    // --- Header ---
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

    // --- Client Details ---
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

    // --- Services Table ---
    const tableData: any[][] = [];

    // Main Service Items based on the record flags
    if (v?.service_complet_r) {
        tableData.push([`Service Complet Vulcanizare R${v.diametru || ''}`, 1, v.pret_vulcanizare ? `${v.pret_vulcanizare} MDL` : '-']);
    } else {
        if (v?.scos_roata) tableData.push(['Scos / pus roată', typeof v.scos_roata === 'object' ? v.scos_roata.quantity : 4, '-']);
        if (v?.montat_demontat) tableData.push(['Montat / demontat anvelopă', typeof v.montat_demontat === 'object' ? v.montat_demontat.quantity : 4, '-']);
        if (v?.echilibrat) tableData.push(['Echilibrat roată', typeof v.echilibrat === 'object' ? v.echilibrat.quantity : 4, '-']);
        // If categories have total price but not in service_complet mode
        if (v?.pret_vulcanizare && v.pret_vulcanizare > 0 && !v.service_complet_r) {
            tableData.push(['Total Servicii Vulcanizare', 1, `${v.pret_vulcanizare} MDL`]);
        }
    }

    // Extra services
    if (v?.azot) tableData.push(['Serviciu umflare cu Azot', 4, '-']);
    if (v?.valva) tableData.push(['Valve cauciuc noi', 4, '-']);
    if (v?.valva_metal) tableData.push(['Valve metal noi', 4, '-']);
    if (v?.cap_senzor) tableData.push(['Capac senzori noi', 1, '-']);
    if (v?.petic) tableData.push([`Reparație anvelopă (Petic ${v.petic})`, 1, '-']);
    if (v?.senzori_schimbati || v?.senzori_programati) tableData.push(['Montaj/Programat senzori presiune', 1, '-']);

    const vj = fisa.servicii?.vopsit_jante;
    if (vj?.indreptat_janta_aliaj) tableData.push(['Îndreptat jantă aliaj', 1, v?.pret_jante ? `${v.pret_jante} MDL` : '-']);
    if (vj?.roluit_janta_tabla) tableData.push(['Roluit jantă tablă', 1, v?.pret_jante ? `${v.pret_jante} MDL` : '-']);
    if (vj?.vopsit_janta_culoare) tableData.push(['Vopsit jante culoarea standard', vj.nr_bucati_vopsit || 4, v?.pret_jante ? `${v.pret_jante} MDL` : '-']);

    if (fisa.hotel_anvelope?.activ) {
        tableData.push([`Depozitare Hotel (${fisa.hotel_anvelope.tip_depozit || 'Anvelope'})`, 1, v?.pret_hotel ? `${v.pret_hotel} MDL` : '-']);
    }

    // Check for AC and Brakes
    const ac = fisa.servicii?.aer_conditionat;
    if (ac?.freon_134a_gr || ac?.freon_1234yf_gr || ac?.schimb_radiator) {
        tableData.push(['Servicii Aer Condiționat', 1, v?.pret_ac ? `${v.pret_ac} MDL` : '-']);
    }

    const fr = fisa.servicii?.frana;
    if (fr?.schimbat_placute || fr?.schimb_discuri || fr?.slefuit_discuri) {
        tableData.push(['Servicii Mecanică / Sistem Frânare', 1, v?.pret_frane ? `${v.pret_frane} MDL` : '-']);
    }

    // Simple fallback if nothing was added
    if (tableData.length === 0) {
        tableData.push(['Servicii mentenanță vehicul', 1, pretTotal > 0 ? `${pretTotal} MDL` : '-']);
    }

    autoTable(doc, {
        startY: 110,
        head: [['Descriere Serviciu', 'Cantitate', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [33, 150, 243], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { font: 'helvetica', fontSize: 10, cellPadding: 4 },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 40, halign: 'right' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 160;

    // --- Footer Totals ---
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(33, 150, 243);
    doc.text(`TOTAL DE PLATĂ: ${pretTotal} MDL`, pageWidth - 14, finalY + 15, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.setFont('helvetica', 'normal');
    doc.text('Prezenta factură servește ca dovadă a serviciilor prestate în unitatea noastră.', 14, finalY + 30);
    doc.text('Vă rugăm să păstrați documentul pentru garanție (20 de zile lucrătoare).', 14, finalY + 35);

    doc.text(`Generat la: ${new Date().toLocaleString('ro-MD')}`, pageWidth / 2, 285, { align: 'center' });

    doc.save(`factura-service-${fisa.id}.pdf`);
};
