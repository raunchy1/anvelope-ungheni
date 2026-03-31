import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// ═══════════════════════════════════════════════════════════
// GENERATOR PDF RAPORT LUNAR - Multi-Page Professional
// ═══════════════════════════════════════════════════════════

interface PDFGeneratorOptions {
    filename?: string;
    quality?: number;
    scale?: number;
}

/**
 * Generează PDF multi-page din elementul DOM specificat
 * 
 * @param elementId - ID-ul elementului DOM de convertit
 * @param options - Opțiuni pentru generare
 * @returns Promise<void>
 */
export async function generatePDF(
    elementId: string = 'monthly-report-pdf',
    options: PDFGeneratorOptions = {}
): Promise<void> {
    const {
        filename = `Raport_Lunar_${new Date().toISOString().split('T')[0]}.pdf`,
        quality = 2,
        scale = 2
    } = options;

    console.log('📄 Generare PDF...');

    // Găsim elementul PDF
    const element = document.getElementById(elementId);
    if (!element) {
        throw new Error(`Elementul cu ID ${elementId} nu a fost găsit`);
    }

    // Afișăm temporar elementul pentru captură
    const originalPosition = element.style.position;
    const originalLeft = element.style.left;
    const originalVisibility = element.style.visibility;

    element.style.position = 'fixed';
    element.style.left = '0';
    element.style.top = '0';
    element.style.visibility = 'visible';
    element.style.zIndex = '-1000';

    try {
        // Găsim toate paginile PDF
        const pages = element.querySelectorAll('.pdf-page');
        
        if (pages.length === 0) {
            throw new Error('Nu s-au găsit pagini PDF (.pdf-page)');
        }

        console.log(`📄 S-au găsit ${pages.length} pagini`);

        // Creăm documentul PDF
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true
        });

        const pageWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm

        // Procesăm fiecare pagină
        for (let i = 0; i < pages.length; i++) {
            const page = pages[i] as HTMLElement;
            
            console.log(`📄 Procesare pagina ${i + 1}/${pages.length}...`);

            // Capturăm pagina ca imagine
            const canvas = await html2canvas(page, {
                scale: scale,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                width: 794, // 210mm in pixels at 96 DPI
                height: 1123, // 297mm in pixels at 96 DPI
                windowWidth: 794,
                windowHeight: 1123,
            });

            // Convertim canvas la imagine
            const imgData = canvas.toDataURL('image/jpeg', 0.95);

            // Adăugăm pagină nouă (exceptând prima)
            if (i > 0) {
                pdf.addPage();
            }

            // Calculăm dimensiunile pentru a încadra imaginea în pagină
            const imgWidth = pageWidth;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Adăugăm imaginea în PDF
            pdf.addImage(
                imgData,
                'JPEG',
                0,
                0,
                imgWidth,
                Math.min(imgHeight, pageHeight)
            );

            console.log(`✅ Pagina ${i + 1} adăugată`);
        }

        // Salvăm PDF-ul
        pdf.save(filename);
        console.log('✅ PDF generat cu succes:', filename);

    } catch (error) {
        console.error('❌ Eroare generare PDF:', error);
        throw error;
    } finally {
        // Restaurăm stilul original
        element.style.position = originalPosition;
        element.style.left = originalLeft;
        element.style.visibility = originalVisibility;
        element.style.zIndex = '';
    }
}

/**
 * Generează PDF pentru raport lunar business
 * 
 * @param data - Datele raportului
 * @param filename - Numele fișierului
 */
export async function generateMonthlyBusinessPDF(
    data: any,
    filename?: string
): Promise<void> {
    const defaultFilename = `Raport_Lunar_${data?.perioada?.luna_nume || 'Luna'}_${data?.perioada?.an || new Date().getFullYear()}.pdf`;
    
    return generatePDF('monthly-report-pdf', {
        filename: filename || defaultFilename,
        quality: 2,
        scale: 2
    });
}

/**
 * Așteaptă ca toate graficele să fie randate înainte de generare PDF
 * 
 * @param timeout - Timeout maxim în ms
 * @returns Promise<boolean>
 */
export async function waitForCharts(timeout: number = 5000): Promise<boolean> {
    return new Promise((resolve) => {
        const startTime = Date.now();
        
        const checkCharts = () => {
            // Căutăm elemente recharts
            const charts = document.querySelectorAll('.recharts-wrapper');
            const svgs = document.querySelectorAll('.recharts-surface');
            
            // Dacă avem grafice și toate au SVG randat
            if (charts.length > 0 && svgs.length >= charts.length) {
                // Așteptăm puțin pentru animații
                setTimeout(() => resolve(true), 500);
                return;
            }
            
            // Timeout
            if (Date.now() - startTime > timeout) {
                console.warn('⚠️ Timeout așteptare grafice');
                resolve(false);
                return;
            }
            
            // Verificăm din nou
            setTimeout(checkCharts, 100);
        };
        
        checkCharts();
    });
}

/**
 * Generează PDF cu așteptare pentru grafice
 * 
 * @param data - Datele raportului
 * @param setIsPrinting - Callback pentru stare
 */
export async function generateMonthlyPDFWithCharts(
    data: any,
    setIsPrinting?: (value: boolean) => void
): Promise<void> {
    if (setIsPrinting) setIsPrinting(true);
    
    try {
        console.log('⏳ Așteptare randare grafice...');
        await waitForCharts(3000);
        console.log('✅ Grafice randate');
        
        await generateMonthlyBusinessPDF(data);
    } catch (error) {
        console.error('❌ Eroare generare PDF:', error);
        throw error;
    } finally {
        if (setIsPrinting) setIsPrinting(false);
    }
}
