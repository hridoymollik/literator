/**
 * Booklet Generator Module
 * Handles pagination of content and PDF generation with booklet imposition
 */
class BookletGenerator {
    constructor() {
        this.pageSizes = {
            'A3': { w: 297, h: 420 },
            'A4': { w: 210, h: 297 },
            'A5': { w: 148, h: 210 },
            'A6': { w: 105, h: 148 },
            'Letter': { w: 215.9, h: 279.4 },
            'Half-Letter': { w: 139.7, h: 215.9 },
            'Legal': { w: 215.9, h: 355.6 },
            'Tabloid': { w: 279.4, h: 431.8 },
            'B6': { w: 125, h: 176 }
        };

        this.settings = this.getDefaultSettings();
    }

    getDefaultSettings() {
        return {
            contentPageSize: 'A5',
            printPaperSize: 'A4',
            orientation: 'landscape',
            pagesPerSheet: 2,
            marginTop: 10,
            marginBottom: 10,
            marginInner: 15,
            marginOuter: 10,
            showPageNumbers: true,
            showCutLines: false,
            duplexPrint: true,
            customContentW: 148,
            customContentH: 210,
            customPrintW: 210,
            customPrintH: 297
        };
    }

    getContentPageDimensions() {
        if (this.settings.contentPageSize === 'custom') {
            return {
                w: this.settings.customContentW,
                h: this.settings.customContentH
            };
        }
        return { ...this.pageSizes[this.settings.contentPageSize] };
    }

    getPrintPaperDimensions() {
        if (this.settings.printPaperSize === 'custom') {
            return {
                w: this.settings.customPrintW,
                h: this.settings.customPrintH
            };
        }
        return { ...this.pageSizes[this.settings.printPaperSize] };
    }

    /**
     * Paginate the editor content into individual page contents
     * Returns an array of HTML strings, one per content page
     */
    async paginateContent(editorElement) {
        const contentPage = this.getContentPageDimensions();

        // Calculate usable area in mm, then convert to pixels for rendering
        const mmToPx = 96 / 25.4; // 96 DPI
        const usableW = (contentPage.w - this.settings.marginInner - this.settings.marginOuter) * mmToPx;
        const usableH = (contentPage.h - this.settings.marginTop - this.settings.marginBottom) * mmToPx;

        // Clone editor content for measurement
        const container = document.createElement('div');
        container.style.cssText = `
            position: absolute;
            left: -9999px;
            top: 0;
            width: ${usableW}px;
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.15;
            visibility: hidden;
        `;
        container.innerHTML = editorElement.innerHTML;
        document.body.appendChild(container);

        const pages = [];
        let currentPageContent = '';
        let currentHeight = 0;

        // Get all top-level nodes
        const childNodes = Array.from(container.childNodes);

        for (let i = 0; i < childNodes.length; i++) {
            const node = childNodes[i];
            const clone = node.cloneNode(true);

            // Measure element height
            const measureDiv = document.createElement('div');
            measureDiv.style.cssText = `
                position: absolute;
                left: -9999px;
                top: 0;
                width: ${usableW}px;
                visibility: hidden;
            `;
            measureDiv.appendChild(clone.cloneNode(true));
            document.body.appendChild(measureDiv);
            const nodeHeight = measureDiv.offsetHeight;
            document.body.removeChild(measureDiv);

            if (currentHeight + nodeHeight > usableH && currentPageContent) {
                // Start new page
                pages.push(currentPageContent);
                currentPageContent = '';
                currentHeight = 0;
            }

            // Get outer HTML or text content
            if (node.nodeType === 1) {
                currentPageContent += node.outerHTML;
            } else if (node.nodeType === 3 && node.textContent.trim()) {
                currentPageContent += `<span>${node.textContent}</span>`;
            }
            currentHeight += nodeHeight;
        }

        // Add remaining content
        if (currentPageContent.trim()) {
            pages.push(currentPageContent);
        }

        document.body.removeChild(container);

        // Ensure at least one page
        if (pages.length === 0) {
            pages.push('<p>&nbsp;</p>');
        }

        return pages;
    }

    /**
     * Arrange pages in booklet imposition order
     * For a booklet, pages must be arranged so when the sheets are folded
     * and nested, they read in sequence
     */
    arrangeForBooklet(totalPages) {
        // Pad to multiple of 4 for proper booklet folding
        const paddedTotal = Math.ceil(totalPages / 4) * 4;
        const sheets = [];

        for (let i = 0; i < paddedTotal / 4; i++) {
            // Each physical sheet has 4 page positions (front-left, front-right, back-left, back-right)
            // Sheet i:
            //   Front: right = 2*i + 1 (counting from 0: page 2i), left = paddedTotal - 1 - 2*i
            //   Back:  left  = 2*i + 2 (page 2i+1), right = paddedTotal - 2 - 2*i

            const sheet = {
                front: {
                    left: paddedTotal - 1 - (2 * i),   // right side when folded = last pages
                    right: 2 * i                         // left side when folded = first pages
                },
                back: {
                    left: 2 * i + 1,
                    right: paddedTotal - 2 - (2 * i)
                }
            };

            sheets.push(sheet);
        }

        return { sheets, paddedTotal };
    }

    /**
     * Generate the booklet PDF
     */
    async generatePDF(editorElement, progressCallback) {
        const { jsPDF } = window.jspdf;

        // Paginate content
        progressCallback(5, 'Paginating content...');
        const pages = await this.paginateContent(editorElement);

        const contentDim = this.getContentPageDimensions();
        const printDim = this.getPrintPaperDimensions();

        // Determine print page orientation
        let printW, printH;
        if (this.settings.orientation === 'landscape') {
            printW = Math.max(printDim.w, printDim.h);
            printH = Math.min(printDim.w, printDim.h);
        } else {
            printW = Math.min(printDim.w, printDim.h);
            printH = Math.max(printDim.w, printDim.h);
        }

        // Get booklet arrangement
        const { sheets, paddedTotal } = this.arrangeForBooklet(pages.length);

        progressCallback(10, 'Creating PDF...');

        // Create PDF
        const pdf = new jsPDF({
            orientation: this.settings.orientation,
            unit: 'mm',
            format: [printW, printH]
        });

        const mmToPx = 96 / 25.4;
        const halfSheetW = printW / 2;

        // Calculate scale to fit content page on half-sheet
        const scaleX = (halfSheetW - 5) / contentDim.w; // 5mm buffer
        const scaleY = (printH - 5) / contentDim.h;
        const scale = Math.min(scaleX, scaleY, 1);

        const scaledW = contentDim.w * scale;
        const scaledH = contentDim.h * scale;

        // Center vertically
        const offsetY = (printH - scaledH) / 2;

        const totalSides = this.settings.duplexPrint ? sheets.length * 2 : sheets.length;
        let sidesDone = 0;

        for (let si = 0; si < sheets.length; si++) {
            const sheet = sheets[si];

            // FRONT SIDE
            if (si > 0 || sidesDone > 0) {
                pdf.addPage([printW, printH], this.settings.orientation);
            }

            // Render front-left page
            await this.renderPageToPDF(
                pdf, pages, sheet.front.left, paddedTotal,
                contentDim, scale, offsetY,
                0, // x offset for left page
                halfSheetW, mmToPx
            );

            // Render front-right page
            await this.renderPageToPDF(
                pdf, pages, sheet.front.right, paddedTotal,
                contentDim, scale, offsetY,
                halfSheetW, // x offset for right page
                halfSheetW, mmToPx
            );

            // Fold line
            if (this.settings.showCutLines) {
                pdf.setDrawColor(200, 200, 200);
                pdf.setLineDashPattern([3, 3], 0);
                pdf.line(halfSheetW, 0, halfSheetW, printH);
                pdf.setLineDashPattern([], 0);
            }

            sidesDone++;
            progressCallback(10 + (sidesDone / totalSides) * 80,
                `Rendering sheet ${si + 1} of ${sheets.length} (front)...`);

            // BACK SIDE
            if (this.settings.duplexPrint) {
                pdf.addPage([printW, printH], this.settings.orientation);

                // Render back-left page
                await this.renderPageToPDF(
                    pdf, pages, sheet.back.left, paddedTotal,
                    contentDim, scale, offsetY,
                    0, halfSheetW, mmToPx
                );

                // Render back-right page
                await this.renderPageToPDF(
                    pdf, pages, sheet.back.right, paddedTotal,
                    contentDim, scale, offsetY,
                    halfSheetW, halfSheetW, mmToPx
                );

                // Fold line
                if (this.settings.showCutLines) {
                    pdf.setDrawColor(200, 200, 200);
                    pdf.setLineDashPattern([3, 3], 0);
                    pdf.line(halfSheetW, 0, halfSheetW, printH);
                    pdf.setLineDashPattern([], 0);
                }

                sidesDone++;
                progressCallback(10 + (sidesDone / totalSides) * 80,
                    `Rendering sheet ${si + 1} of ${sheets.length} (back)...`);
            }
        }

        progressCallback(95, 'Finalizing PDF...');
        return pdf;
    }

    /**
     * Render a single content page onto the PDF at given position
     */
    async renderPageToPDF(pdf, pages, pageIndex, totalPages, contentDim, scale, offsetY, xOffset, slotWidth, mmToPx) {
        const actualPageCount = pages.length;

        // If page index exceeds actual content, render blank
        if (pageIndex >= actualPageCount) {
            // Page number on blank page
            if (this.settings.showPageNumbers && pageIndex < totalPages) {
                // blank page, optionally show page number
            }
            return;
        }

        const pageHTML = pages[pageIndex];
        const usableW = contentDim.w - this.settings.marginInner - this.settings.marginOuter;
        const usableH = contentDim.h - this.settings.marginTop - this.settings.marginBottom;

        // Create off-screen element to render
        const renderDiv = document.createElement('div');
        renderDiv.style.cssText = `
            position: absolute;
            left: -9999px;
            top: 0;
            width: ${usableW * mmToPx}px;
            height: ${usableH * mmToPx}px;
            padding: 0;
            margin: 0;
            font-family: Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.15;
            color: #000;
            background: white;
            overflow: hidden;
            box-sizing: border-box;
        `;
        renderDiv.innerHTML = pageHTML;

        // Copy styles for proper rendering
        const styleEl = document.createElement('style');
        styleEl.textContent = `
            * { box-sizing: border-box; }
            p { margin: 0; min-height: 1em; }
            h1 { font-size: 24pt; margin: 16pt 0 8pt; font-weight: 400; }
            h2 { font-size: 18pt; margin: 14pt 0 6pt; font-weight: 400; }
            h3 { font-size: 14pt; margin: 12pt 0 4pt; font-weight: 500; }
            h4 { font-size: 12pt; margin: 10pt 0 4pt; font-weight: 500; }
            h5 { font-size: 11pt; margin: 8pt 0 4pt; font-weight: 500; }
            h6 { font-size: 10pt; font-style: italic; margin: 8pt 0 4pt; }
            blockquote { border-left: 3px solid #ccc; padding-left: 12px; margin: 8pt 0; color: #555; }
            ul, ol { padding-left: 24px; margin: 4pt 0; }
            img { max-width: 100%; }
            a { color: #1a73e8; }
        `;
        renderDiv.prepend(styleEl);
        document.body.appendChild(renderDiv);

        try {
            // Use html2canvas to capture the content
            const canvas = await html2canvas(renderDiv, {
                width: Math.ceil(usableW * mmToPx),
                height: Math.ceil(usableH * mmToPx),
                scale: 2, // Higher quality
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false
            });

            // Convert canvas to image and add to PDF
            const imgData = canvas.toDataURL('image/jpeg', 0.92);

            // Calculate position on the PDF page
            const centeredX = xOffset + (slotWidth - contentDim.w * scale) / 2;
            const marginLeft = this.settings.marginOuter * scale;
            const marginTop = this.settings.marginTop * scale;

            pdf.addImage(
                imgData,
                'JPEG',
                centeredX + marginLeft,
                offsetY + marginTop,
                usableW * scale,
                usableH * scale
            );

            // Page number
            if (this.settings.showPageNumbers) {
                const pageNum = pageIndex + 1;
                pdf.setFontSize(8);
                pdf.setTextColor(128, 128, 128);
                const numX = xOffset + slotWidth / 2;
                const numY = offsetY + contentDim.h * scale - (this.settings.marginBottom * scale / 2);
                pdf.text(String(pageNum), numX, numY, { align: 'center' });
                pdf.setTextColor(0, 0, 0);
            }

            // Page border (optional, for visual guide)
            if (this.settings.showCutLines) {
                pdf.setDrawColor(220, 220, 220);
                pdf.setLineWidth(0.2);
                pdf.rect(
                    centeredX,
                    offsetY,
                    contentDim.w * scale,
                    contentDim.h * scale
                );
            }

        } catch (err) {
            console.error('Error rendering page:', err);
        } finally {
            document.body.removeChild(renderDiv);
        }
    }

    /**
     * Generate preview data for the preview modal
     */
    async generatePreview(editorElement) {
        const pages = await this.paginateContent(editorElement);
        const { sheets, paddedTotal } = this.arrangeForBooklet(pages.length);

        return {
            pages,
            sheets,
            paddedTotal,
            contentDim: this.getContentPageDimensions(),
            printDim: this.getPrintPaperDimensions(),
            settings: { ...this.settings }
        };
    }
}