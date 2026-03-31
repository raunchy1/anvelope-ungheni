// ═══════════════════════════════════════════════════════════
// GENERATOR PDF RAPORT LUNAR - Direct jsPDF (Fără html2canvas)
// ═══════════════════════════════════════════════════════════

// @ts-ignore - jsPDF are exporturi diferite în diferite medii
import { jsPDF } from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

interface RaportData {
    perioada: {
        luna_nume: string;
        an: number;
        start: string;
        end: string;
        zile_lucratoare: number;
    };
    kpi: {
        venit_total: number;
        profit_total: number;
        stoc_bucati: number;
        stoc_venit: number;
        stoc_profit: number;
        stoc_tranzactii: number;
        servicii_fise: number;
        servicii_total: number;
        servicii_vulcanizare: number;
        servicii_ac: number;
        servicii_frana: number;
        servicii_jante: number;
        servicii_hotel: number;
        hotel_active: number;
        hotel_ridicate: number;
        hotel_total: number;
    };
    vanzari: Array<{
        id: number;
        data: string;
        brand: string;
        dimensiune: string;
        cantitate: number;
        pret_vanzare: number;
        profit_total: number;
        client: string | null;
    }>;
    top: {
        branduri: Array<[string, number]>;
        dimensiuni: Array<[string, number]>;
        mecanici: Array<{ nume: string; fise: number; venit: number }>;
    };
    servicii: {
        total_vulcanizare: number;
        total_ac: number;
        total_frana: number;
        total_jante: number;
        total_hotel: number;
    };
    insights: {
        cea_mai_buna_zi?: { data: string; profit: number };
        cel_mai_profitabil_produs?: { brand: string; dimensiune: string; profit_total: number };
        cel_mai_activ_mecanic?: { nume: string; fise: number; venit: number };
        recomandari_restock: Array<{ mesaj: string }>;
    };
    zilnic: Array<{
        data: string;
        vanzari: number;
        profit: number;
        servicii: number;
        fise: number;
        total: number;
    }>;
}

/**
 * Generează PDF raport lunar folosind jsPDF direct
 * Fără html2canvas - mai stabil și mai rapid
 */
export async function generateMonthlyPDF(
    data: any,
    setIsGenerating?: (value: boolean) => void
): Promise<void> {
    console.log('📄 FUNCȚIE generateMonthlyPDF APELATĂ!');
    
    if (setIsGenerating) setIsGenerating(true);
    
    console.log('📄 Date primite:', {
        hasPerioada: !!data?.perioada,
        hasKpi: !!data?.kpi,
        vanzariLength: data?.vanzari?.length,
        hasTop: !!data?.top
    });
    
    try {
        console.log('📄 Inițializare jsPDF...');
        
        // Verificăm datele
        if (!data || !data.kpi || !data.perioada) {
            throw new Error('Date incomplete pentru PDF');
        }
        
        console.log('📄 Creare document jsPDF...');
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });
        
        console.log('✅ jsPDF inițializat');

        const pageW = doc.internal.pageSize.getWidth();
        const mL = 15, mR = 15;
        const contentW = pageW - mL - mR;

        // ═══════════════════════════════════════════════════════════
        // PAGINA 1 - HEADER & KPI
        // ═══════════════════════════════════════════════════════════
        
        console.log('📄 Pagina 1 - Header...');
        
        // Header cu gradient orange
        doc.setFillColor(249, 115, 22);
        doc.rect(0, 0, pageW, 35, 'F');
        
        // Titlu companie
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text('ANVELOPE UNGHENI', mL, 18);
        
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        const lunaNume = data.perioada?.luna_nume || 'Luna';
        const an = data.perioada?.an || new Date().getFullYear();
        doc.text(`Raport Lunar - ${lunaNume} ${an}`, mL, 26);
        doc.text(`Generat: ${new Date().toLocaleDateString('ro-MD')}`, pageW - mR, 26, { align: 'right' });

        let y = 45;

        // KPI Cards - 4 pe row
        console.log('📄 Pagina 1 - KPI Cards...');
        const kpiData = [
            { label: 'Venit Total', value: `${(data.kpi?.venit_total || 0).toLocaleString('ro-MD')} MDL`, color: [34, 197, 94] },
            { label: 'Profit Total', value: `${(data.kpi?.profit_total || 0).toLocaleString('ro-MD')} MDL`, color: [249, 115, 22] },
            { label: 'Bucăți Vândute', value: (data.kpi?.stoc_bucati || 0).toString(), color: [59, 130, 246] },
            { label: 'Fișe Service', value: (data.kpi?.servicii_fise || 0).toString(), color: [168, 85, 247] },
        ];

        const cardW = (contentW - 9) / 4;
        kpiData.forEach((kpi, i) => {
            const x = mL + i * (cardW + 3);
            
            // Card background
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(x, y, cardW, 22, 2, 2, 'F');
            
            // Color bar
            doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
            doc.rect(x, y, 3, 22, 'F');
            
            // Label
            doc.setFontSize(7);
            doc.setTextColor(100, 116, 139);
            doc.text(kpi.label, x + 6, y + 7);
            
            // Value
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
            doc.text(kpi.value, x + 6, y + 17);
            doc.setFont('helvetica', 'normal');
        });

        y += 30;

        // Secțiuni Overview
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text('Rezumat pe Secțiuni', mL, y);
        y += 8;

        // Stoc, Servicii, Hotel
        const sectiuni = [
            { title: 'Vânzări Stoc', val1: `${(data.kpi?.stoc_venit || 0).toLocaleString('ro-MD')} MDL`, val2: `${(data.kpi?.stoc_profit || 0).toLocaleString('ro-MD')} profit`, color: '#3b82f6' },
            { title: 'Servicii', val1: `${(data.kpi?.servicii_total || 0).toLocaleString('ro-MD')} MDL`, val2: `${data.kpi?.servicii_fise || 0} fișe`, color: '#f97316' },
            { title: 'Hotel', val1: `${data.kpi?.hotel_active || 0} active`, val2: `${data.kpi?.hotel_ridicate || 0} ridicate`, color: '#22c55e' },
        ];

        const sectW = (contentW - 6) / 3;
        sectiuni.forEach((sect, i) => {
            const x = mL + i * (sectW + 3);
            doc.setFillColor(241, 245, 249);
            doc.roundedRect(x, y, sectW, 20, 2, 2, 'F');
            
            // Border color
            const rgb = sect.color === '#3b82f6' ? [59, 130, 246] : sect.color === '#f97316' ? [249, 115, 22] : [34, 197, 94];
            doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
            doc.setLineWidth(0.5);
            doc.line(x, y, x, y + 20);
            
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text(sect.title, x + 5, y + 7);
            
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            doc.text(sect.val1, x + 5, y + 14);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7);
            doc.text(sect.val2, x + 5, y + 18);
        });

        y += 28;

        // Cea mai bună zi
        if (data.insights?.cea_mai_buna_zi) {
            doc.setFillColor(254, 243, 199);
            doc.roundedRect(mL, y, contentW, 18, 3, 3, 'F');
            doc.setDrawColor(245, 158, 11);
            doc.setLineWidth(0.3);
            doc.roundedRect(mL, y, contentW, 18, 3, 3, 'S');
            
            doc.setFontSize(9);
            doc.setTextColor(146, 64, 14);
            doc.setFont('helvetica', 'bold');
            doc.text('🏆 Cea mai bună zi', mL + 5, y + 7);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(
                `${new Date(data.insights.cea_mai_buna_zi.data).toLocaleDateString('ro-MD')} cu ${data.insights.cea_mai_buna_zi.profit.toLocaleString('ro-MD')} MDL profit`,
                mL + 5, y + 14
            );
            
            y += 25;
        }

        // ═══════════════════════════════════════════════════════════
        // PAGINA 2 - TOP BRANDURI & DIMENSIUNI
        // ═══════════════════════════════════════════════════════════
        doc.addPage();
        y = 20;

        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text('Top Branduri și Dimensiuni', mL, y);
        y += 10;

        // Tabel Top Branduri
        console.log('📄 Pagina 2 - Tabele...');
        if (data.top?.branduri && data.top.branduri.length > 0) {
            autoTable(doc, {
                startY: y,
                head: [['#', 'Brand', 'Bucăți Vândute']],
                body: data.top.branduri.slice(0, 10).map((item: any, idx: number) => [
                    (idx + 1).toString(),
                    item[0],
                    item[1].toString()
                ]),
                theme: 'grid',
                headStyles: { 
                    fillColor: [249, 115, 22], 
                    textColor: 255, 
                    fontSize: 9,
                    fontStyle: 'bold'
                },
                styles: { 
                    fontSize: 9, 
                    cellPadding: 3,
                    font: 'helvetica'
                },
                columnStyles: {
                    0: { cellWidth: 15, halign: 'center' },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 30, halign: 'right' }
                },
                margin: { left: mL, right: mR }
            });
            
            y = (doc as any).lastAutoTable.finalY + 10;
        }

        // Tabel Top Dimensiuni
        if (data.top?.dimensiuni && data.top.dimensiuni.length > 0) {
            autoTable(doc, {
                startY: y,
                head: [['#', 'Dimensiune', 'Bucăți Vândute']],
                body: data.top.dimensiuni.slice(0, 10).map((item: any, idx: number) => [
                    (idx + 1).toString(),
                    item[0],
                    item[1].toString()
                ]),
                theme: 'grid',
                headStyles: { 
                    fillColor: [59, 130, 246], 
                    textColor: 255, 
                    fontSize: 9,
                    fontStyle: 'bold'
                },
                styles: { 
                    fontSize: 9, 
                    cellPadding: 3,
                    font: 'helvetica'
                },
                columnStyles: {
                    0: { cellWidth: 15, halign: 'center' },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 30, halign: 'right' }
                },
                margin: { left: mL, right: mR }
            });
        }

        // ═══════════════════════════════════════════════════════════
        // PAGINA 3 - DETALII VÂNZĂRI & MECANICI
        // ═══════════════════════════════════════════════════════════
        doc.addPage();
        y = 20;

        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text('Detalii Vânzări și Mecanici', mL, y);
        y += 10;

        // Tabel Top Mecanici
        console.log('📄 Pagina 3 - Mecanici și Tranzacții...');
        if (data.top?.mecanici && data.top.mecanici.length > 0) {
            autoTable(doc, {
                startY: y,
                head: [['#', 'Mecanic', 'Fișe', 'Venit Generat']],
                body: data.top.mecanici.slice(0, 10).map((m: any, idx: number) => [
                    (idx + 1).toString(),
                    m.nume,
                    m.fise.toString(),
                    `${m.venit.toLocaleString('ro-MD')} MDL`
                ]),
                theme: 'grid',
                headStyles: { 
                    fillColor: [139, 92, 246], 
                    textColor: 255, 
                    fontSize: 9,
                    fontStyle: 'bold'
                },
                styles: { 
                    fontSize: 9, 
                    cellPadding: 3,
                    font: 'helvetica'
                },
                columnStyles: {
                    0: { cellWidth: 15, halign: 'center' },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 25, halign: 'center' },
                    3: { cellWidth: 40, halign: 'right' }
                },
                margin: { left: mL, right: mR }
            });
            
            y = (doc as any).lastAutoTable.finalY + 10;
        }

        // Tabel Tranzacții (primele 20)
        if (data.vanzari && data.vanzari.length > 0) {
            // Verificăm dacă mai e spațiu pe pagină
            if (y > 200) {
                doc.addPage();
                y = 20;
            }

            doc.setFontSize(12);
            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            doc.text(`Ultimele Tranzacții (primele ${Math.min(data.vanzari.length, 20)})`, mL, y);
            y += 5;

            autoTable(doc, {
                startY: y,
                head: [['Data', 'Produs', 'Dimensiune', 'Cant', 'Preț', 'Profit']],
                body: data.vanzari.slice(0, 20).map((v: any) => [
                    new Date(v.data).toLocaleDateString('ro-MD'),
                    v.brand,
                    v.dimensiune,
                    v.cantitate.toString(),
                    `${(v.pret_vanzare * v.cantitate).toLocaleString('ro-MD')} MDL`,
                    `+${v.profit_total.toLocaleString('ro-MD')} MDL`
                ]),
                theme: 'grid',
                headStyles: { 
                    fillColor: [34, 197, 94], 
                    textColor: 255, 
                    fontSize: 8,
                    fontStyle: 'bold'
                },
                styles: { 
                    fontSize: 8, 
                    cellPadding: 2,
                    font: 'helvetica'
                },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 45 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 15, halign: 'center' },
                    4: { cellWidth: 35, halign: 'right' },
                    5: { cellWidth: 35, halign: 'right' }
                },
                margin: { left: mL, right: mR }
            });
        }

        // ═══════════════════════════════════════════════════════════
        // PAGINA 4 - INSIGHTS & FOOTER
        // ═══════════════════════════════════════════════════════════
        doc.addPage();
        y = 20;

        doc.setFontSize(14);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text('Insights și Recomandări', mL, y);
        y += 12;

        // Insights cards
        console.log('📄 Pagina 4 - Insights...');
        const insights = [];
        if (data.insights?.cel_mai_profitabil_produs) {
            insights.push({
                icon: '⭐',
                title: 'Cel mai profitabil produs',
                text: `${data.insights.cel_mai_profitabil_produs.brand} ${data.insights.cel_mai_profitabil_produs.dimensiune} - ${data.insights.cel_mai_profitabil_produs.profit_total.toLocaleString('ro-MD')} MDL`
            });
        }
        if (data.insights?.cel_mai_activ_mecanic) {
            insights.push({
                icon: '👨‍🔧',
                title: 'Cel mai activ mecanic',
                text: `${data.insights.cel_mai_activ_mecanic.nume} - ${data.insights.cel_mai_activ_mecanic.fise} fișe`
            });
        }

        insights.forEach((insight: any) => {
            doc.setFillColor(254, 243, 199);
            doc.roundedRect(mL, y, contentW, 20, 2, 2, 'F');
            
            doc.setFontSize(9);
            doc.setTextColor(146, 64, 14);
            doc.setFont('helvetica', 'bold');
            doc.text(`${insight.icon} ${insight.title}`, mL + 5, y + 8);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(insight.text, mL + 5, y + 15);
            
            y += 25;
        });

        // Recomandări
        if (data.insights?.recomandari_restock && data.insights.recomandari_restock.length > 0) {
            doc.setFillColor(252, 231, 243);
            doc.roundedRect(mL, y, contentW, 12 + data.insights.recomandari_restock.slice(0, 3).length * 6, 2, 2, 'F');
            
            doc.setFontSize(9);
            doc.setTextColor(157, 23, 77);
            doc.setFont('helvetica', 'bold');
            doc.text('📦 Recomandări Reaprovizionare', mL + 5, y + 8);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            data.insights.recomandari_restock.slice(0, 3).forEach((rec: any, idx: number) => {
                doc.text(`• ${rec.mesaj}`, mL + 5, y + 15 + idx * 6);
            });
            
            y += 30 + data.insights.recomandari_restock.slice(0, 3).length * 6;
        }

        // Footer pe toate paginile
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            
            // Linie footer
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(mL, 280, pageW - mR, 280);
            
            // Text footer
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            const lunaNume = data.perioada?.luna_nume || 'Luna';
            const an = data.perioada?.an || new Date().getFullYear();
            doc.text(
                `ANVELOPE UNGHENI SRL • Pagina ${i} din ${pageCount} • ${lunaNume} ${an}`,
                pageW / 2,
                287,
                { align: 'center' }
            );
        }

        // Salvăm PDF-ul
        console.log('📄 Salvare PDF...');
        const filename = `Raport_Lunar_${data.perioada?.luna_nume || 'Luna'}_${data.perioada?.an || new Date().getFullYear()}.pdf`;
        doc.save(filename);
        
        console.log('✅ PDF generat cu succes:', filename);
        
    } catch (error) {
        console.error('❌ Eroare generare PDF:', error);
        alert(`Eroare la generarea PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
    } finally {
        if (setIsGenerating) setIsGenerating(false);
    }
}

// Export pentru compatibilitate
export { generateMonthlyPDF as generateMonthlyBusinessPDF };
