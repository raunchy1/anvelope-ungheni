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
}

export function generateDailyReportBuffer(data: DailyReportData): Buffer {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const dataFormatata = new Date(data.data + 'T12:00:00').toLocaleDateString('ro-MD', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    // ─── HEADER ───
    doc.setFillColor(15, 23, 42); // dark navy
    doc.rect(0, 0, pageWidth, 45, 'F');

    doc.setFontSize(22);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('ANVELOPE UNGHENI', 14, 18);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text('Raport Zilnic Activitate', 14, 26);
    doc.text(dataFormatata, 14, 33);

    doc.setFontSize(9);
    doc.text('Tel: 068263644 | anvelope-ungheni.md', pageWidth - 14, 22, { align: 'right' });
    doc.text('Mun. Ungheni, str. Decebal 62A/1', pageWidth - 14, 28, { align: 'right' });

    // ─── SECTION 1: SUMAR ───
    let y = 55;

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text('1. SUMAR ZILNIC', 14, y);
    y += 6;

    // Summary boxes
    const boxes = [
        { label: 'Total Servicii', value: String(data.numarServicii), color: [33, 150, 243] as [number, number, number] },
        { label: 'Anvelope Vândute', value: `${data.bucateVandute} buc`, color: [251, 191, 36] as [number, number, number] },
        { label: 'Total Venituri', value: `${data.totalVenituri.toLocaleString('ro-MD')} MDL`, color: [34, 197, 94] as [number, number, number] },
        { label: 'Total Profit', value: `${data.total.toLocaleString('ro-MD')} MDL`, color: [168, 85, 247] as [number, number, number] },
    ];

    const boxW = (pageWidth - 28 - 9) / 4;
    boxes.forEach((box, i) => {
        const bx = 14 + i * (boxW + 3);
        doc.setFillColor(box.color[0], box.color[1], box.color[2]);
        doc.roundedRect(bx, y, boxW, 22, 3, 3, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.text(box.label.toUpperCase(), bx + boxW / 2, y + 7, { align: 'center' });
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(box.value, bx + boxW / 2, y + 16, { align: 'center' });
    });
    y += 30;

    // Detaliu profit
    autoTable(doc, {
        startY: y,
        head: [['Sursă', 'Profit (MDL)']],
        body: [
            ['Vânzări Anvelope', `${data.profitVanzari.toLocaleString('ro-MD')} MDL`],
            ['Servicii Vulcanizare', `${data.profitServicii.toLocaleString('ro-MD')} MDL`],
            ['Hotel Anvelope', `${data.profitHotel.toLocaleString('ro-MD')} MDL`],
            ['TOTAL', `${data.total.toLocaleString('ro-MD')} MDL`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
        bodyStyles: {},
        didParseCell: (hookData: any) => {
            if (hookData.row.index === 3) {
                hookData.cell.styles.fillColor = [34, 197, 94];
                hookData.cell.styles.textColor = [255, 255, 255];
                hookData.cell.styles.fontStyle = 'bold';
            }
        },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // Track section numbers dynamically
    let sectionNum = 2;

    // ─── SECTION: SERVICII ───
    if (data.servicii && data.servicii.length > 0) {
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${sectionNum}. SERVICII EFECTUATE`, 14, y);
        y += 4;

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
            headStyles: { fillColor: [33, 150, 243], textColor: [255, 255, 255], fontSize: 9 },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: { 3: { halign: 'right' } },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
        sectionNum++;
    }

    // ─── SECTION: VÂNZĂRI ANVELOPE ───
    if (y > 200) { doc.addPage(); y = 20; }

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${sectionNum}. VÂNZĂRI ANVELOPE`, 14, y);
    y += 6;

    if (data.vanzari && data.vanzari.length > 0) {
        const totalVanzariValue = data.vanzari.reduce((sum, v) => sum + (v.total_vanzare || 0), 0);

        autoTable(doc, {
            startY: y,
            head: [['Brand', 'Dimensiune', 'Buc', 'Preț vânzare', 'Total']],
            body: [
                ...data.vanzari.map(v => [
                    v.brand || '-',
                    v.dimensiune || '-',
                    String(v.cantitate),
                    v.pret_vanzare ? `${v.pret_vanzare.toLocaleString('ro-MD')}` : '-',
                    v.total_vanzare ? `${v.total_vanzare.toLocaleString('ro-MD')}` : '-',
                ]),
                // Total row
                [
                    { content: 'TOTAL VÂNZĂRI ANVELOPE:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
                    { content: `${totalVanzariValue.toLocaleString('ro-MD')} MDL`, styles: { halign: 'right', fontStyle: 'bold', textColor: [15, 23, 42] } }
                ]
            ],
            theme: 'striped',
            headStyles: { fillColor: [251, 191, 36], textColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 4 },
            columnStyles: { 
                0: { cellWidth: 40 },
                1: { cellWidth: 35 },
                2: { cellWidth: 15, halign: 'center' }, 
                3: { cellWidth: 35, halign: 'right' }, 
                4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' } 
            },
            didParseCell: (hookData: any) => {
                // Style the total row
                if (hookData.row.index === data.vanzari!.length) {
                    hookData.cell.styles.fillColor = [254, 243, 199]; // Light yellow
                    hookData.cell.styles.fontStyle = 'bold';
                }
            },
        });

        y = (doc as any).lastAutoTable.finalY + 12;

        // ─── SECTION: STATISTICĂ ZILNICĂ ───
        sectionNum++;
        if (y > 230) { doc.addPage(); y = 20; }

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${sectionNum}. STATISTICĂ ZILNICĂ`, 14, y);
        y += 6;

        const totalBucati = data.vanzari.reduce((sum, v) => sum + (v.cantitate || 0), 0);
        const valoareVanzari = data.vanzari.reduce((sum, v) => sum + (v.total_vanzare || 0), 0);
        const profitVanzariCalc = data.vanzari.reduce((sum, v) => sum + ((v.pret_vanzare - v.pret_achizitie) * v.cantitate), 0);

        autoTable(doc, {
            startY: y,
            head: [['Indicator', 'Valoare']],
            body: [
                ['Total Bucăți vândute:', `${totalBucati} buc`],
                ['Valoare vânzări:', `${valoareVanzari.toLocaleString('ro-MD')} MDL`],
                ['Profit vânzări:', `${profitVanzariCalc.toLocaleString('ro-MD')} MDL`],
            ],
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: { 
                0: { fontStyle: 'bold', cellWidth: 70 },
                1: { halign: 'right', fontStyle: 'bold' } 
            },
            bodyStyles: { textColor: [15, 23, 42] },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
    } else {
        // No sales for today
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text('Nu există vânzări pentru această zi', 14, y);
        y += 10;
    }

    // ─── SECTION: HOTEL ───
    if (data.hotel && data.hotel.length > 0) {
        sectionNum++;
        if (y > 230) { doc.addPage(); y = 20; }

        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(`${sectionNum}. HOTEL ANVELOPE`, 14, y);
        y += 4;

        autoTable(doc, {
            startY: y,
            head: [['Client', 'Dimensiune', 'Tip Depozit']],
            body: data.hotel.map(h => [
                h.client || 'Necunoscut',
                h.dimensiune_anvelope || '-',
                h.tip_depozit || 'Anvelope',
            ]),
            theme: 'striped',
            headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], fontSize: 9 },
            styles: { fontSize: 8, cellPadding: 3 },
        });

        y = (doc as any).lastAutoTable.finalY + 10;
    }

    // ─── FOOTER ───
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148);
        doc.text(
            `Generat automat la ${new Date().toLocaleString('ro-MD')} | Pagina ${i}/${pageCount}`,
            pageWidth / 2, 290, { align: 'center' }
        );
    }

    // Return as Buffer (server-side compatible)
    const uint8 = doc.output('arraybuffer');
    return Buffer.from(uint8);
}
