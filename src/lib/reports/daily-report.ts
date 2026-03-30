import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface DailyReportData {
    data: string;
    profitVanzari: number;
    profitServicii: number;
    profitHotel: number;
    total: number;
    totalVenituri: number;
    bucateVandute: number;
    numarServicii: number;
    numarHotel: number;
    servicii?: Array<{
        client_name: string;
        car_number: string;
        serviciu: string;
        pret: number;
    }>;
    vanzari?: Array<{
        brand: string;
        dimensiune: string;
        cantitate: number;
        pret_vanzare: number;
        pret_achizitie: number;
        profit_total: number;
        total_vanzare: number;
    }>;
    hotel?: Array<{
        client?: string;
        dimensiune_anvelope?: string;
        tip_depozit?: string;
    }>;
    // Date extinse pentru vânzări
    vanzariDetaliat?: Array<{
        id: number;
        data: string;
        brand: string;
        dimensiune: string;
        cantitate: number;
        pret_achizitie: number;
        pret_vanzare: number;
        profit_per_bucata: number;
        profit_total: number;
        mecanic?: string | null;
        client?: string | null;
    }>;
}

export function generateDailyReportBuffer(data: DailyReportData): Buffer {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const dataFormatata = new Date(data.data + 'T12:00:00').toLocaleDateString('ro-MD', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // ═══════════════════════════════════════════════════════════
    // HEADER PREMIUM
    // ═══════════════════════════════════════════════════════════
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Logo/Brand
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('ANVELOPE UNGHENI', 14, 20);

    // Subtitlu
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Raport Zilnic Activitate', 14, 30);
    doc.text(dataFormatata, 14, 38);

    // Info contact
    doc.setFontSize(9);
    doc.text('Tel: 068263644 | anvelope-ungheni.md', pageWidth - 14, 26, { align: 'right' });
    doc.text('Mun. Ungheni, str. Decebal 62A/1', pageWidth - 14, 32, { align: 'right' });

    // ═══════════════════════════════════════════════════════════
    // SECȚIUNEA 1: SUMAR ZILNIC - KPI CARDS
    // ═══════════════════════════════════════════════════════════
    let y = 60;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('1. SUMAR ZILNIC', 14, y);
    y += 8;

    // KPI Cards moderne
    const kpiCards = [
        { 
            label: 'Total Servicii', 
            value: String(data.numarServicii), 
            subtext: 'fișe deschise',
            color: [33, 150, 243] as [number, number, number],
            icon: 'S'
        },
        { 
            label: 'Anvelope Vândute', 
            value: `${data.bucateVandute} buc`, 
            subtext: 'din stoc',
            color: [251, 191, 36] as [number, number, number],
            icon: 'A'
        },
        { 
            label: 'Total Venituri', 
            value: `${data.totalVenituri.toLocaleString('ro-MD')} MDL`, 
            subtext: 'încasări',
            color: [34, 197, 94] as [number, number, number],
            icon: 'V'
        },
        { 
            label: 'Total Profit', 
            value: `${data.total.toLocaleString('ro-MD')} MDL`, 
            subtext: 'realizat',
            color: [168, 85, 247] as [number, number, number],
            icon: 'P'
        },
    ];

    const cardW = (pageWidth - 28 - 9) / 4;
    kpiCards.forEach((card, i) => {
        const bx = 14 + i * (cardW + 3);
        
        // Card background
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(bx, y, cardW, 30, 4, 4, 'F');
        
        // Color strip
        doc.setFillColor(card.color[0], card.color[1], card.color[2]);
        doc.roundedRect(bx, y, 4, 30, 2, 2, 'F');
        doc.rect(bx + 2, y, 2, 30, 'F');
        
        // Icon circle
        doc.setFillColor(card.color[0], card.color[1], card.color[2]);
        doc.circle(bx + cardW - 12, y + 10, 6, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(card.icon, bx + cardW - 12, y + 12, { align: 'center' });
        
        // Label
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(card.label.toUpperCase(), bx + 10, y + 10);
        
        // Value
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(card.value, bx + 10, y + 20);
        
        // Subtext
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(6);
        doc.setFont('helvetica', 'normal');
        doc.text(card.subtext, bx + 10, y + 26);
    });
    y += 38;

    // ═══════════════════════════════════════════════════════════
    // TABEL DETALIU PROFIT
    // ═══════════════════════════════════════════════════════════
    autoTable(doc, {
        startY: y,
        head: [['Sursă Venit', 'Detalii', 'Profit (MDL)']],
        body: [
            ['🛞 Vânzări Anvelope', `${data.bucateVandute} bucăți vândute`, `${data.profitVanzari.toLocaleString('ro-MD')} MDL`],
            ['🔧 Servicii Vulcanizare', `${data.numarServicii} servicii efectuate`, `${data.profitServicii.toLocaleString('ro-MD')} MDL`],
            ['🏨 Hotel Anvelope', `${data.numarHotel} înregistrări`, `${data.profitHotel.toLocaleString('ro-MD')} MDL`],
            ['💰 TOTAL GENERAL', 'Toate sursele', `${data.total.toLocaleString('ro-MD')} MDL`],
        ],
        theme: 'grid',
        headStyles: { 
            fillColor: [15, 23, 42], 
            textColor: [255, 255, 255], 
            fontStyle: 'bold', 
            fontSize: 9,
            cellPadding: 4
        },
        styles: { 
            fontSize: 9, 
            cellPadding: 5,
            font: 'helvetica'
        },
        columnStyles: { 
            0: { cellWidth: 50, fontStyle: 'bold' },
            1: { cellWidth: 70 },
            2: { halign: 'right', fontStyle: 'bold', cellWidth: 50 } 
        },
        bodyStyles: {
            textColor: [30, 41, 59]
        },
        didParseCell: (hookData: any) => {
            if (hookData.row.index === 3) {
                hookData.cell.styles.fillColor = [34, 197, 94];
                hookData.cell.styles.textColor = [255, 255, 255];
                hookData.cell.styles.fontStyle = 'bold';
            }
        },
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    // Track section numbers
    let sectionNum = 2;

    // ═══════════════════════════════════════════════════════════
    // SECȚIUNEA: VÂNZĂRI ANVELOPE DETALIAT
    // ═══════════════════════════════════════════════════════════
    const vanzariToShow = data.vanzariDetaliat?.length ? data.vanzariDetaliat : (data.vanzari || []);
    
    if (vanzariToShow.length > 0) {
        if (y > 230) { doc.addPage(); y = 20; }

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${sectionNum}. VÂNZĂRI ANVELOPE DIN STOC`, 14, y);
        y += 4;

        // Info suplimentară
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(`${vanzariToShow.length} tranzacții • ${data.bucateVandute} bucăți totale`, 14, y + 4);
        y += 10;

        const totalVanzariValue = vanzariToShow.reduce((sum, v) => sum + ((v.pret_vanzare || 0) * (v.cantitate || 0)), 0);
        const totalProfit = vanzariToShow.reduce((sum, v) => sum + (v.profit_total || 0), 0);

        autoTable(doc, {
            startY: y,
            head: [['Data', 'Produs', 'Dimensiune', 'Buc', 'Preț Ach.', 'Preț Vânz.', 'Profit/buc', 'Profit Total']],
            body: [
                ...vanzariToShow.map(v => {
                    // Check if it's the detailed format
                    const vAny = v as any;
                    const hasBrand = vAny.brand != null;
                    const hasData = vAny.data != null;
                    
                    // Calculate profit per unit
                    const profitPerUnit = vAny.profit_per_bucata != null 
                        ? vAny.profit_per_bucata 
                        : (v.pret_vanzare && v.pret_achizitie) ? (v.pret_vanzare - v.pret_achizitie) : 0;
                    
                    return [
                        hasData ? vAny.data : data.data,
                        hasBrand ? vAny.brand : '-',
                        vAny.dimensiune || '-',
                        String(v.cantitate || 0),
                        (v.pret_achizitie || 0) > 0 ? `${(v.pret_achizitie || 0).toLocaleString('ro-MD')}` : '-',
                        (v.pret_vanzare || 0) > 0 ? `${(v.pret_vanzare || 0).toLocaleString('ro-MD')}` : '-',
                        profitPerUnit > 0 ? `+${profitPerUnit.toLocaleString('ro-MD')}` : '-',
                        (v.profit_total || 0) > 0 ? `+${(v.profit_total || 0).toLocaleString('ro-MD')}` : 
                            (v.pret_vanzare && v.pret_achizitie && v.cantitate) ? `+${((v.pret_vanzare - v.pret_achizitie) * v.cantitate).toLocaleString('ro-MD')}` : '-',
                    ];
                }),
                // Total row
                [
                    { content: 'TOTAL VÂNZĂRI:', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: String(data.bucateVandute), styles: { halign: 'center', fontStyle: 'bold' } },
                    '', '', '',
                    { content: `+${totalProfit.toLocaleString('ro-MD')} MDL`, styles: { halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] } }
                ]
            ],
            theme: 'grid',
            headStyles: { 
                fillColor: [34, 197, 94], 
                textColor: [255, 255, 255], 
                fontSize: 8, 
                fontStyle: 'bold',
                cellPadding: 3
            },
            styles: { 
                fontSize: 8, 
                cellPadding: 3,
                font: 'helvetica'
            },
            columnStyles: { 
                0: { cellWidth: 25 },
                1: { cellWidth: 35 },
                2: { cellWidth: 28 },
                3: { cellWidth: 12, halign: 'center' }, 
                4: { cellWidth: 22, halign: 'right' }, 
                5: { cellWidth: 24, halign: 'right' }, 
                6: { cellWidth: 22, halign: 'right' }, 
                7: { cellWidth: 26, halign: 'right', fontStyle: 'bold' } 
            },
            alternateRowStyles: {
                fillColor: [240, 253, 244],
            },
        });

        y = (doc as any).lastAutoTable.finalY + 12;
        sectionNum++;
    }

    // ═══════════════════════════════════════════════════════════
    // SECȚIUNEA: SERVICII
    // ═══════════════════════════════════════════════════════════
    if (data.servicii && data.servicii.length > 0) {
        if (y > 230) { doc.addPage(); y = 20; }

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${sectionNum}. SERVICII EFECTUATE`, 14, y);
        y += 6;

        autoTable(doc, {
            startY: y,
            head: [['Client', 'Mașină', 'Serviciu', 'Preț (MDL)']],
            body: data.servicii.map(s => [
                s.client_name || '-',
                s.car_number || '-',
                s.serviciu || 'Servicii vulcanizare',
                s.pret ? `${s.pret.toLocaleString('ro-MD')} MDL` : '-',
            ]),
            theme: 'striped',
            headStyles: { 
                fillColor: [33, 150, 243], 
                textColor: [255, 255, 255], 
                fontSize: 9,
                fontStyle: 'bold'
            },
            styles: { 
                fontSize: 8, 
                cellPadding: 4,
                font: 'helvetica'
            },
            columnStyles: { 
                3: { halign: 'right', fontStyle: 'bold' } 
            },
        });

        y = (doc as any).lastAutoTable.finalY + 12;
        sectionNum++;
    }

    // ═══════════════════════════════════════════════════════════
    // SECȚIUNEA: HOTEL
    // ═══════════════════════════════════════════════════════════
    if (data.hotel && data.hotel.length > 0) {
        if (y > 240) { doc.addPage(); y = 20; }

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${sectionNum}. HOTEL ANVELOPE`, 14, y);
        y += 6;

        autoTable(doc, {
            startY: y,
            head: [['Client', 'Dimensiune', 'Tip Depozit']],
            body: data.hotel.map(h => [
                h.client || 'Necunoscut',
                h.dimensiune_anvelope || '-',
                h.tip_depozit || 'Anvelope',
            ]),
            theme: 'striped',
            headStyles: { 
                fillColor: [168, 85, 247], 
                textColor: [255, 255, 255], 
                fontSize: 9 
            },
            styles: { 
                fontSize: 8, 
                cellPadding: 4,
                font: 'helvetica'
            },
        });

        y = (doc as any).lastAutoTable.finalY + 12;
        sectionNum++;
    }

    // ═══════════════════════════════════════════════════════════
    // SECȚIUNEA: STATISTICĂ ZILNICĂ
    // ═══════════════════════════════════════════════════════════
    if (data.vanzari && data.vanzari.length > 0) {
        if (y > 220) { doc.addPage(); y = 20; }

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${sectionNum}. REZUMAT VÂNZĂRI`, 14, y);
        y += 6;

        const totalBucati = data.vanzari.reduce((sum, v) => sum + (v.cantitate || 0), 0);
        const valoareVanzari = data.vanzari.reduce((sum, v) => sum + (v.total_vanzare || 0), 0);
        const profitVanzariCalc = data.vanzari.reduce((sum, v) => sum + ((v.pret_vanzare - v.pret_achizitie) * v.cantitate), 0);
        const marjaMedie = profitVanzariCalc > 0 && valoareVanzari > 0 
            ? ((profitVanzariCalc / valoareVanzari) * 100).toFixed(1) 
            : '0';

        autoTable(doc, {
            startY: y,
            head: [['Indicator', 'Valoare']],
            body: [
                ['Total Bucăți vândute:', `${totalBucati} buc`],
                ['Valoare totală vânzări:', `${valoareVanzari.toLocaleString('ro-MD')} MDL`],
                ['Profit total din vânzări:', `${profitVanzariCalc.toLocaleString('ro-MD')} MDL`],
                ['Marjă medie de profit:', `${marjaMedie}%`],
                ['Număr tranzacții:', `${data.vanzari.length}`],
            ],
            theme: 'striped',
            headStyles: { 
                fillColor: [15, 23, 42], 
                textColor: [255, 255, 255], 
                fontSize: 9, 
                fontStyle: 'bold' 
            },
            styles: { 
                fontSize: 10, 
                cellPadding: 5,
                font: 'helvetica'
            },
            columnStyles: { 
                0: { fontStyle: 'bold', cellWidth: 80 },
                1: { halign: 'right', fontStyle: 'bold' } 
            },
            bodyStyles: { textColor: [15, 23, 42] },
        });
    }

    // ═══════════════════════════════════════════════════════════
    // FOOTER PREMIUM
    // ═══════════════════════════════════════════════════════════
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Linie footer
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(14, 280, pageWidth - 14, 280);
        
        // Text footer
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.setFont('helvetica', 'normal');
        doc.text(
            `ANVELOPE UNGHENI SRL | CF 102060004938 | anvelope-ungheni.md`,
            pageWidth / 2, 287, { align: 'center' }
        );
        doc.text(
            `Generat la ${new Date().toLocaleString('ro-MD')} | Pagina ${i}/${pageCount}`,
            pageWidth / 2, 292, { align: 'center' }
        );
    }

    // Return as Buffer (server-side compatible)
    const uint8 = doc.output('arraybuffer');
    return Buffer.from(uint8);
}
