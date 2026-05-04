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

// A4 layout constants (all in mm)
const PAGE_W = 210;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2; // 182mm
const PAGE_H = 297;
const FOOTER_Y = 283;

function fmt(n: number): string {
    return n.toLocaleString('ro-MD');
}

function addHeader(doc: jsPDF, dataFormatata: string): void {
    const pageWidth = doc.internal.pageSize.getWidth();

    // Clean white header with bottom border
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, 48, 'F');

    // Orange accent bar on left
    doc.setFillColor(249, 115, 22); // orange-500
    doc.rect(0, 0, 5, 48, 'F');

    // Company name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42);
    doc.text('ANVELOPE UNGHENI', MARGIN + 4, 18);

    // Report title
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(71, 85, 105);
    doc.text('Raport Zilnic de Activitate', MARGIN + 4, 27);
    doc.text(dataFormatata, MARGIN + 4, 35);

    // Contact info — right side
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Tel: 068263644', pageWidth - MARGIN, 20, { align: 'right' });
    doc.text('anvelope-ungheni.md', pageWidth - MARGIN, 27, { align: 'right' });
    doc.text('Mun. Ungheni, str. Decebal 62A/1', pageWidth - MARGIN, 34, { align: 'right' });

    // Bottom border
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, 44, pageWidth - MARGIN, 44);
}

function addFooter(doc: jsPDF): void {
    const pageCount = doc.getNumberOfPages();
    const pageWidth = doc.internal.pageSize.getWidth();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, FOOTER_Y, pageWidth - MARGIN, FOOTER_Y);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
            'ANVELOPE UNGHENI SRL | CF 102060004938 | anvelope-ungheni.md',
            pageWidth / 2, FOOTER_Y + 5, { align: 'center' }
        );
        doc.text(
            `Generat: ${new Date().toLocaleString('ro-MD')}  |  Pagina ${i} din ${pageCount}`,
            pageWidth / 2, FOOTER_Y + 10, { align: 'center' }
        );
    }
}

function sectionTitle(doc: jsPDF, y: number, num: number, title: string): number {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(`${num}. ${title}`, MARGIN, y);

    doc.setDrawColor(249, 115, 22);
    doc.setLineWidth(0.6);
    doc.line(MARGIN, y + 2, MARGIN + 60, y + 2);

    return y + 10;
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
    if (y + needed > FOOTER_Y - 15) {
        doc.addPage();
        return 54; // Start after header area on new pages
    }
    return y;
}

export function generateDailyReportBuffer(data: DailyReportData): Buffer {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const dataFormatata = new Date(data.data + 'T12:00:00').toLocaleDateString('ro-MD', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    addHeader(doc, dataFormatata);

    let y = 52;
    let sec = 1;

    // ─────────────────────────────────────────────────────────────
    // SECTION 1: KPI SUMMARY
    // ─────────────────────────────────────────────────────────────
    y = sectionTitle(doc, y, sec++, 'SUMAR ZILNIC');

    autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [['Servicii Efectuate', 'Anvelope Vandute', 'Total Venituri', 'Total Profit']],
        body: [[
            `${data.numarServicii} fise`,
            `${data.bucateVandute} bucati`,
            `${fmt(data.totalVenituri)} MDL`,
            `${fmt(data.total)} MDL`,
        ]],
        theme: 'grid',
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10,
            cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
            halign: 'center',
        },
        bodyStyles: {
            fontSize: 12,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: { top: 8, bottom: 8, left: 8, right: 8 },
            textColor: [15, 23, 42],
        },
        columnStyles: {
            0: { cellWidth: CONTENT_W / 4 },
            1: { cellWidth: CONTENT_W / 4 },
            2: { cellWidth: CONTENT_W / 4, textColor: [22, 163, 74] },
            3: { cellWidth: CONTENT_W / 4, textColor: [249, 115, 22] },
        },
        styles: { overflow: 'linebreak', font: 'helvetica' },
    });

    y = (doc as any).lastAutoTable.finalY + 10;

    // ─────────────────────────────────────────────────────────────
    // SECTION 2: PROFIT BREAKDOWN
    // ─────────────────────────────────────────────────────────────
    y = ensureSpace(doc, y, 50);
    y = sectionTitle(doc, y, sec++, 'DEFALCARE PROFIT');

    autoTable(doc, {
        startY: y,
        margin: { left: MARGIN, right: MARGIN },
        head: [['Sursa de Venit', 'Detalii', 'Profit (MDL)']],
        body: [
            ['Vanzari Anvelope din Stoc', `${data.bucateVandute} bucati vandute`, `${fmt(data.profitVanzari)} MDL`],
            ['Servicii Vulcanizare / AC / Frene', `${data.numarServicii} fise de serviciu`, `${fmt(data.profitServicii)} MDL`],
            ['Hotel Anvelope', `${data.numarHotel} inregistrari depozit`, `${fmt(data.profitHotel)} MDL`],
        ],
        foot: [['TOTAL GENERAL', 'Toate sursele combinate', `${fmt(data.total)} MDL`]],
        theme: 'grid',
        headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 10,
            cellPadding: { top: 5, bottom: 5, left: 8, right: 8 },
        },
        footStyles: {
            fillColor: [249, 115, 22],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 11,
            cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
        },
        bodyStyles: {
            fontSize: 10,
            cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
            textColor: [30, 41, 59],
        },
        columnStyles: {
            0: { cellWidth: 70, fontStyle: 'bold' },
            1: { cellWidth: 72 },
            2: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
        },
        styles: { overflow: 'linebreak', font: 'helvetica' },
    });

    y = (doc as any).lastAutoTable.finalY + 12;

    // ─────────────────────────────────────────────────────────────
    // SECTION 3: SERVICII EFECTUATE (with real service details)
    // ─────────────────────────────────────────────────────────────
    if (data.servicii && data.servicii.length > 0) {
        y = ensureSpace(doc, y, 40);
        y = sectionTitle(doc, y, sec++, 'SERVICII EFECTUATE');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(`${data.servicii.length} fise de serviciu`, MARGIN, y - 4);

        const serviciiRows = data.servicii.map(s => [
            s.client_name || '-',
            s.car_number || '-',
            s.serviciu || 'Servicii vulcanizare',
            s.pret > 0 ? `${fmt(s.pret)} MDL` : '-',
        ]);

        const totalServicii = data.servicii.reduce((sum, s) => sum + (s.pret || 0), 0);

        autoTable(doc, {
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            head: [['Client', 'Masina', 'Servicii Efectuate', 'Pret (MDL)']],
            body: serviciiRows,
            foot: [[
                { content: 'TOTAL SERVICII', colSpan: 3, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: `${fmt(totalServicii)} MDL`, styles: { halign: 'right', fontStyle: 'bold' } },
            ]],
            theme: 'grid',
            headStyles: {
                fillColor: [15, 23, 42],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 10,
                cellPadding: { top: 5, bottom: 5, left: 8, right: 8 },
            },
            footStyles: {
                fillColor: [241, 245, 249],
                textColor: [15, 23, 42],
                fontStyle: 'bold',
                fontSize: 10,
            },
            bodyStyles: {
                fontSize: 10,
                cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
                textColor: [30, 41, 59],
                minCellHeight: 10,
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },
            columnStyles: {
                // Client 30%, Masina 20%, Serviciu 35%, Pret 15%
                0: { cellWidth: 55 },
                1: { cellWidth: 36 },
                2: { cellWidth: 63, overflow: 'linebreak' },
                3: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
            },
            styles: { overflow: 'linebreak', font: 'helvetica' },
            didDrawPage: () => {
                // page already handled by footer loop
            },
        });

        y = (doc as any).lastAutoTable.finalY + 12;
        sec++;
    }

    // ─────────────────────────────────────────────────────────────
    // SECTION: VANZARI ANVELOPE DIN STOC
    // ─────────────────────────────────────────────────────────────
    const vanzariToShow = data.vanzariDetaliat?.length ? data.vanzariDetaliat : (data.vanzari || []);

    if (vanzariToShow.length > 0) {
        y = ensureSpace(doc, y, 40);
        y = sectionTitle(doc, y, sec++, 'VANZARI ANVELOPE DIN STOC');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text(
            `${vanzariToShow.length} tranzactii  •  ${data.bucateVandute} bucati totale`,
            MARGIN, y - 4
        );

        const totalProfit = vanzariToShow.reduce((s, v) => s + (v.profit_total || 0), 0);
        const totalVal = vanzariToShow.reduce((s, v) => s + ((v.pret_vanzare || 0) * (v.cantitate || 0)), 0);

        const vanzariRows = vanzariToShow.map(v => {
            const vA = v as any;
            const profitUnit = vA.profit_per_bucata != null
                ? vA.profit_per_bucata
                : (v.pret_vanzare && v.pret_achizitie) ? (v.pret_vanzare - v.pret_achizitie) : 0;
            return [
                vA.brand || '-',
                vA.dimensiune || '-',
                String(v.cantitate || 0),
                v.pret_achizitie > 0 ? `${fmt(v.pret_achizitie)}` : '-',
                v.pret_vanzare > 0 ? `${fmt(v.pret_vanzare)}` : '-',
                v.profit_total > 0 ? `+${fmt(v.profit_total)}` : (profitUnit > 0 ? `+${fmt(profitUnit * (v.cantitate || 1))}` : '-'),
            ];
        });

        autoTable(doc, {
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            head: [['Brand', 'Dimensiune', 'Buc', 'Pret Ach.', 'Pret Vanz.', 'Profit']],
            body: vanzariRows,
            foot: [[
                { content: 'TOTAL', colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: String(data.bucateVandute), styles: { halign: 'center', fontStyle: 'bold' } },
                '',
                { content: `${fmt(totalVal)} MDL`, styles: { halign: 'right', fontStyle: 'bold' } },
                { content: `+${fmt(totalProfit)} MDL`, styles: { halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] } },
            ]],
            theme: 'grid',
            headStyles: {
                fillColor: [15, 23, 42],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 10,
                cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
            },
            footStyles: {
                fillColor: [240, 253, 244],
                textColor: [15, 23, 42],
                fontStyle: 'bold',
                fontSize: 10,
            },
            bodyStyles: {
                fontSize: 10,
                cellPadding: { top: 5, bottom: 5, left: 6, right: 6 },
                textColor: [30, 41, 59],
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },
            columnStyles: {
                0: { cellWidth: 40 },
                1: { cellWidth: 38 },
                2: { cellWidth: 14, halign: 'center' },
                3: { cellWidth: 28, halign: 'right' },
                4: { cellWidth: 30, halign: 'right' },
                5: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] },
            },
            styles: { overflow: 'linebreak', font: 'helvetica' },
        });

        y = (doc as any).lastAutoTable.finalY + 12;
    }

    // ─────────────────────────────────────────────────────────────
    // SECTION: HOTEL ANVELOPE
    // ─────────────────────────────────────────────────────────────
    if (data.hotel && data.hotel.length > 0) {
        y = ensureSpace(doc, y, 40);
        y = sectionTitle(doc, y, sec++, 'HOTEL ANVELOPE');

        autoTable(doc, {
            startY: y,
            margin: { left: MARGIN, right: MARGIN },
            head: [['Client', 'Dimensiune Anvelope', 'Tip Depozit']],
            body: data.hotel.map(h => [
                h.client || 'Necunoscut',
                h.dimensiune_anvelope || '-',
                h.tip_depozit || 'Anvelope',
            ]),
            theme: 'grid',
            headStyles: {
                fillColor: [15, 23, 42],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 10,
                cellPadding: { top: 5, bottom: 5, left: 8, right: 8 },
            },
            bodyStyles: {
                fontSize: 10,
                cellPadding: { top: 6, bottom: 6, left: 8, right: 8 },
                textColor: [30, 41, 59],
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },
            columnStyles: {
                0: { cellWidth: 72 },
                1: { cellWidth: 64 },
                2: { cellWidth: 46 },
            },
            styles: { overflow: 'linebreak', font: 'helvetica' },
        });

        y = (doc as any).lastAutoTable.finalY + 12;
    }

    addFooter(doc);

    const uint8 = doc.output('arraybuffer');
    return Buffer.from(uint8);
}
