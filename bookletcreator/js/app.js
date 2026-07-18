/**
 * Application Module
 * Ties together the editor and booklet generator, handles UI interactions
 */
document.addEventListener('DOMContentLoaded', () => {
    const editor = new RichTextEditor();
    const booklet = new BookletGenerator();

    // DOM Elements
    const settingsModal = document.getElementById('settingsModal');
    const previewModal = document.getElementById('previewModal');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const fileMenu = document.getElementById('fileMenu');

    // === File Menu ===
    document.getElementById('menuFile').addEventListener('click', (e) => {
        e.stopPropagation();
        fileMenu.classList.toggle('active');
    });

    document.addEventListener('click', () => {
        fileMenu.classList.remove('active');
    });

    document.getElementById('menuNew').addEventListener('click', () => {
        editor.newDocument();
        fileMenu.classList.remove('active');
    });

    document.getElementById('menuOpen').addEventListener('click', () => {
        document.getElementById('fileInput').click();
        fileMenu.classList.remove('active');
    });

    document.getElementById('fileInput').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            editor.loadDocument(e.target.files[0]);
            e.target.value = '';
        }
    });

    document.getElementById('menuSave').addEventListener('click', () => {
        editor.saveDocument();
        fileMenu.classList.remove('active');
    });

    document.getElementById('menuPageSetup').addEventListener('click', () => {
        openSettings();
        fileMenu.classList.remove('active');
    });

    document.getElementById('menuPrintBooklet').addEventListener('click', () => {
        generateBookletPDF();
        fileMenu.classList.remove('active');
    });

    // Other menu items (placeholder)
    ['menuEdit', 'menuView', 'menuInsert', 'menuFormat'].forEach(id => {
        document.getElementById(id).addEventListener('click', () => {
            // Could implement dropdown menus for these
        });
    });

    // === Settings Modal ===
    function openSettings() {
        loadSettingsToUI();
        settingsModal.classList.add('active');
    }

    function closeSettings() {
        settingsModal.classList.remove('active');
    }

    document.getElementById('btnBookletSettings').addEventListener('click', openSettings);
    document.getElementById('closeSettings').addEventListener('click', closeSettings);

    document.getElementById('applySettings').addEventListener('click', () => {
        saveSettingsFromUI();
        closeSettings();
    });

    document.getElementById('resetSettings').addEventListener('click', () => {
        booklet.settings = booklet.getDefaultSettings();
        loadSettingsToUI();
    });

    // Custom size toggles
    document.getElementById('contentPageSize').addEventListener('change', (e) => {
        document.getElementById('customContentSize').style.display =
            e.target.value === 'custom' ? 'block' : 'none';
    });

    document.getElementById('printPaperSize').addEventListener('change', (e) => {
        document.getElementById('customPrintSize').style.display =
            e.target.value === 'custom' ? 'block' : 'none';
    });

    function loadSettingsToUI() {
        const s = booklet.settings;
        document.getElementById('contentPageSize').value = s.contentPageSize;
        document.getElementById('printPaperSize').value = s.printPaperSize;
        document.querySelector(`input[name="orientation"][value="${s.orientation}"]`).checked = true;
        document.getElementById('pagesPerSheet').value = s.pagesPerSheet;
        document.getElementById('marginTop').value = s.marginTop;
        document.getElementById('marginBottom').value = s.marginBottom;
        document.getElementById('marginInner').value = s.marginInner;
        document.getElementById('marginOuter').value = s.marginOuter;
        document.getElementById('showPageNumbers').checked = s.showPageNumbers;
        document.getElementById('showCutLines').checked = s.showCutLines;
        document.getElementById('duplexPrint').checked = s.duplexPrint;
        document.getElementById('customContentW').value = s.customContentW;
        document.getElementById('customContentH').value = s.customContentH;
        document.getElementById('customPrintW').value = s.customPrintW;
        document.getElementById('customPrintH').value = s.customPrintH;

        document.getElementById('customContentSize').style.display =
            s.contentPageSize === 'custom' ? 'block' : 'none';
        document.getElementById('customPrintSize').style.display =
            s.printPaperSize === 'custom' ? 'block' : 'none';
    }

    function saveSettingsFromUI() {
        booklet.settings.contentPageSize = document.getElementById('contentPageSize').value;
        booklet.settings.printPaperSize = document.getElementById('printPaperSize').value;
        booklet.settings.orientation = document.querySelector('input[name="orientation"]:checked').value;
        booklet.settings.pagesPerSheet = parseInt(document.getElementById('pagesPerSheet').value);
        booklet.settings.marginTop = parseFloat(document.getElementById('marginTop').value) || 10;
        booklet.settings.marginBottom = parseFloat(document.getElementById('marginBottom').value) || 10;
        booklet.settings.marginInner = parseFloat(document.getElementById('marginInner').value) || 15;
        booklet.settings.marginOuter = parseFloat(document.getElementById('marginOuter').value) || 10;
        booklet.settings.showPageNumbers = document.getElementById('showPageNumbers').checked;
        booklet.settings.showCutLines = document.getElementById('showCutLines').checked;
        booklet.settings.duplexPrint = document.getElementById('duplexPrint').checked;
        booklet.settings.customContentW = parseFloat(document.getElementById('customContentW').value) || 148;
        booklet.settings.customContentH = parseFloat(document.getElementById('customContentH').value) || 210;
        booklet.settings.customPrintW = parseFloat(document.getElementById('customPrintW').value) || 210;
        booklet.settings.customPrintH = parseFloat(document.getElementById('customPrintH').value) || 297;
    }

    // === Print / Generate Booklet ===
    document.getElementById('btnPrint').addEventListener('click', generateBookletPDF);
    document.getElementById('btnPrintPreview').addEventListener('click', showPreview);

    async function generateBookletPDF() {
        saveSettingsFromUI();

        const editorElement = document.getElementById('editor');

        // Show loading
        loadingOverlay.classList.add('active');

        try {
            const pdf = await booklet.generatePDF(editorElement, (progress, message) => {
                document.getElementById('progressFill').style.width = `${progress}%`;
                document.getElementById('progressText').textContent = `${Math.round(progress)}%`;
                document.getElementById('loadingText').textContent = message;
            });

            // Download PDF
            const title = document.getElementById('docTitle').value || 'Booklet';
            pdf.save(`${title}_booklet.pdf`);

            document.getElementById('progressFill').style.width = '100%';
            document.getElementById('progressText').textContent = '100%';
            document.getElementById('loadingText').textContent = 'Done!';

            setTimeout(() => {
                loadingOverlay.classList.remove('active');
                document.getElementById('progressFill').style.width = '0%';
            }, 1000);

        } catch (err) {
            console.error('PDF generation failed:', err);
            alert('Error generating PDF: ' + err.message);
            loadingOverlay.classList.remove('active');
        }
    }

    async function showPreview() {
        saveSettingsFromUI();
        const editorElement = document.getElementById('editor');

        previewModal.classList.add('active');
        const previewContainer = document.getElementById('previewContainer');
        previewContainer.innerHTML = '<p style="color:white;text-align:center;padding:40px;">Generating preview...</p>';

        try {
            const previewData = await booklet.generatePreview(editorElement);
            renderPreview(previewData);
        } catch (err) {
            console.error('Preview generation failed:', err);
            previewContainer.innerHTML = `<p style="color:white;text-align:center;padding:40px;">Error: ${err.message}</p>`;
        }
    }

    function renderPreview(data) {
        const { pages, sheets, paddedTotal, contentDim, printDim, settings } = data;
        const container = document.getElementById('previewContainer');
        container.innerHTML = '';

        // Calculate display dimensions
        let printW, printH;
        if (settings.orientation === 'landscape') {
            printW = Math.max(printDim.w, printDim.h);
            printH = Math.min(printDim.w, printDim.h);
        } else {
            printW = Math.min(printDim.w, printDim.h);
            printH = Math.max(printDim.w, printDim.h);
        }

        // Scale for display (fit in modal)
        const maxDisplayW = Math.min(window.innerWidth * 0.8, 1100);
        const displayScale = maxDisplayW / printW;
        const displayW = printW * displayScale;
        const displayH = printH * displayScale;

        const halfW = displayW / 2;
        const contentScale = Math.min(
            (printW / 2 - 5) / contentDim.w,
            (printH - 5) / contentDim.h,
            1
        ) * displayScale;

        let sheetIndex = 0;

        function renderSheetSide(sheetData, side, label) {
            const sheetDiv = document.createElement('div');
            sheetDiv.className = 'preview-sheet';
            sheetDiv.style.cssText = `
                width: ${displayW}px;
                height: ${displayH}px;
                position: relative;
                flex-shrink: 0;
            `;

            // Label
            const labelDiv = document.createElement('div');
            labelDiv.style.cssText = `
                position: absolute;
                top: -22px;
                left: 0;
                font-size: 12px;
                color: #aaa;
            `;
            labelDiv.textContent = label;
            sheetDiv.appendChild(labelDiv);

            // Left page slot
            const leftSlot = createPageSlot(
                side.left, pages, paddedTotal,
                0, 0, halfW, displayH,
                contentDim, contentScale, settings
            );
            sheetDiv.appendChild(leftSlot);

            // Right page slot
            const rightSlot = createPageSlot(
                side.right, pages, paddedTotal,
                halfW, 0, halfW, displayH,
                contentDim, contentScale, settings
            );
            sheetDiv.appendChild(rightSlot);

            // Fold line
            const fold = document.createElement('div');
            fold.style.cssText = `
                position: absolute;
                left: ${halfW}px;
                top: 0;
                bottom: 0;
                border-left: 1px dashed #ccc;
                z-index: 5;
            `;
            sheetDiv.appendChild(fold);

            container.appendChild(sheetDiv);
        }

        sheets.forEach((sheet, i) => {
            renderSheetSide(sheet, sheet.front, `Sheet ${i + 1} - Front`);
            if (settings.duplexPrint) {
                renderSheetSide(sheet, sheet.back, `Sheet ${i + 1} - Back`);
            }
        });

        // Update page info
        const totalSides = settings.duplexPrint ? sheets.length * 2 : sheets.length;
        document.getElementById('previewPageInfo').textContent =
            `${sheets.length} sheet(s), ${totalSides} side(s), ${pages.length} content pages`;
    }

    function createPageSlot(pageIndex, pages, totalPages, x, y, slotW, slotH, contentDim, contentScale, settings) {
        const slot = document.createElement('div');
        slot.style.cssText = `
            position: absolute;
            left: ${x}px;
            top: ${y}px;
            width: ${slotW}px;
            height: ${slotH}px;
            overflow: hidden;
            border: 1px solid #eee;
        `;

        if (pageIndex < pages.length) {
            const contentDiv = document.createElement('div');
            const usableW = contentDim.w - settings.marginInner - settings.marginOuter;
            const mmToPx = 96 / 25.4;

            contentDiv.style.cssText = `
                width: ${usableW * mmToPx}px;
                font-family: Arial, sans-serif;
                font-size: 11pt;
                line-height: 1.15;
                padding: ${settings.marginTop * contentScale}px ${settings.marginOuter * contentScale}px ${settings.marginBottom * contentScale}px ${settings.marginInner * contentScale}px;
                transform: scale(${contentScale / mmToPx * (25.4 / 96) * (96 / 25.4) * contentScale / contentScale});
                transform-origin: top left;
                overflow: hidden;
            `;

            // Simplified scaling
            const renderScale = (slotW - 10) / (contentDim.w * (96 / 25.4));
            contentDiv.style.cssText = `
                width: ${contentDim.w * (96 / 25.4)}px;
                min-height: ${contentDim.h * (96 / 25.4)}px;
                font-family: Arial, sans-serif;
                font-size: 11pt;
                line-height: 1.15;
                padding: ${settings.marginTop * (96 / 25.4)}px ${settings.marginOuter * (96 / 25.4)}px ${settings.marginBottom * (96 / 25.4)}px ${settings.marginInner * (96 / 25.4)}px;
                transform: scale(${renderScale});
                transform-origin: top left;
                overflow: hidden;
                background: white;
            `;

            contentDiv.innerHTML = pages[pageIndex];
            slot.appendChild(contentDiv);

            // Page number
            if (settings.showPageNumbers) {
                const numDiv = document.createElement('div');
                numDiv.style.cssText = `
                    position: absolute;
                    bottom: 5px;
                    left: 0;
                    right: 0;
                    text-align: center;
                    font-size: 10px;
                    color: #999;
                `;
                numDiv.textContent = pageIndex + 1;
                slot.appendChild(numDiv);
            }
        } else {
            // Blank page
            slot.style.background = '#fafafa';
        }

        return slot;
    }

    // Preview controls
    document.getElementById('closePreview').addEventListener('click', () => {
        previewModal.classList.remove('active');
    });

    document.getElementById('cancelPreview').addEventListener('click', () => {
        previewModal.classList.remove('active');
    });

    document.getElementById('downloadPdf').addEventListener('click', async () => {
        previewModal.classList.remove('active');
        await generateBookletPDF();
    });

    // Close modals on overlay click
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) closeSettings();
    });

    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) previewModal.classList.remove('active');
    });

    // Escape key closes modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSettings();
            previewModal.classList.remove('active');
            fileMenu.classList.remove('active');
        }
    });

    // === Ruler ===
    function buildRuler() {
        const ruler = document.getElementById('rulerH');
        ruler.innerHTML = '';
        const pageWidth = 816; // pixels
        const rulerOffset = 40; // left padding of editor area

        for (let i = 0; i <= 21; i++) { // ~21cm for A4
            const mark = document.createElement('div');
            mark.style.cssText = `
                position: absolute;
                left: ${rulerOffset + (i * pageWidth / 21)}px;
                bottom: 0;
                height: ${i % 5 === 0 ? 12 : 6}px;
                width: 1px;
                background: #bbb;
            `;
            if (i % 5 === 0) {
                const label = document.createElement('span');
                label.style.cssText = `
                    position: absolute;
                    bottom: 12px;
                    left: ${rulerOffset + (i * pageWidth / 21) - 4}px;
                    font-size: 9px;
                    color: #999;
                `;
                label.textContent = i;
                ruler.appendChild(label);
            }
            ruler.appendChild(mark);
        }
    }
    buildRuler();

    // === Zoom ===
    let currentZoom = 100;
    document.getElementById('zoomLevel').addEventListener('click', () => {
        const zoom = prompt('Enter zoom level (25-400):', currentZoom);
        if (zoom) {
            currentZoom = Math.max(25, Math.min(400, parseInt(zoom) || 100));
            document.querySelector('.page').style.transform = `scale(${currentZoom / 100})`;
            document.querySelector('.page').style.transformOrigin = 'top center';
            document.getElementById('zoomLevel').textContent = `${currentZoom}%`;
        }
    });

    // Page count estimation
    function updatePageCount() {
        const editorHeight = document.getElementById('editor').scrollHeight;
        const pageHeight = 912; // approximate usable height in pixels
        const pages = Math.max(1, Math.ceil(editorHeight / pageHeight));
        document.getElementById('pageCount').textContent = `~${pages} page(s)`;
    }

    // Update page count periodically
    setInterval(updatePageCount, 2000);
    updatePageCount();

    // Initial focus
    document.getElementById('editor').focus();

    console.log('Booklet Creator initialized successfully!');
});