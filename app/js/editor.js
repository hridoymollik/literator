/**
 * Rich Text Editor Module
 * Handles all editor functionality similar to Google Docs
 */
class RichTextEditor {
    constructor() {
        this.editor = document.getElementById('editor');
        this.setupEditor();
        this.setupToolbarListeners();
        this.setupKeyboardShortcuts();
        this.setupSelectionListener();
        this.setupAutoSave();
        this.updateCounts();
    }

    setupEditor() {
        // Make editor focusable and setup paste handler
        this.editor.addEventListener('paste', (e) => this.handlePaste(e));
        this.editor.addEventListener('input', () => this.handleInput());
        this.editor.addEventListener('drop', (e) => this.handleDrop(e));

        // Focus editor on page load
        setTimeout(() => this.editor.focus(), 100);
    }

    handlePaste(e) {
        // Allow rich text paste by default
        // For plain text: e.preventDefault() + insertText
        const clipboardData = e.clipboardData;
        if (clipboardData) {
            const html = clipboardData.getData('text/html');
            const text = clipboardData.getData('text/plain');

            if (html) {
                e.preventDefault();
                // Clean up the HTML a bit
                const cleaned = this.cleanPastedHTML(html);
                document.execCommand('insertHTML', false, cleaned);
            }
        }
        setTimeout(() => this.updateCounts(), 100);
    }

    cleanPastedHTML(html) {
        // Remove Word/Google Docs specific styling but keep formatting
        const div = document.createElement('div');
        div.innerHTML = html;

        // Remove style attributes that might break layout
        const allElements = div.querySelectorAll('*');
        allElements.forEach(el => {
            // Keep basic formatting styles
            const style = el.style;
            const keepStyles = {};

            if (style.fontWeight) keepStyles.fontWeight = style.fontWeight;
            if (style.fontStyle) keepStyles.fontStyle = style.fontStyle;
            if (style.textDecoration) keepStyles.textDecoration = style.textDecoration;
            if (style.color && style.color !== 'rgb(0, 0, 0)') keepStyles.color = style.color;
            if (style.backgroundColor && style.backgroundColor !== 'transparent')
                keepStyles.backgroundColor = style.backgroundColor;
            if (style.fontSize) keepStyles.fontSize = style.fontSize;
            if (style.textAlign) keepStyles.textAlign = style.textAlign;

            el.removeAttribute('style');
            el.removeAttribute('class');
            el.removeAttribute('id');

            Object.keys(keepStyles).forEach(k => {
                el.style[k] = keepStyles[k];
            });

            // Remove comments and other meta elements
            if (['META', 'LINK', 'STYLE', 'SCRIPT', 'TITLE'].includes(el.tagName)) {
                el.remove();
            }
        });

        return div.innerHTML;
    }

    handleInput() {
        this.updateCounts();
    }

    handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            if (file.type.startsWith('image/')) {
                e.preventDefault();
                this.insertImageFile(file);
            }
        }
    }

    // Toolbar Commands
    execCommand(command, value = null) {
        this.editor.focus();
        document.execCommand(command, false, value);
        this.updateToolbarState();
    }

    setupToolbarListeners() {
        // Format commands
        document.getElementById('btnBold').addEventListener('click', () => this.execCommand('bold'));
        document.getElementById('btnItalic').addEventListener('click', () => this.execCommand('italic'));
        document.getElementById('btnUnderline').addEventListener('click', () => this.execCommand('underline'));
        document.getElementById('btnStrikethrough').addEventListener('click', () => this.execCommand('strikeThrough'));

        // Undo/Redo
        document.getElementById('btnUndo').addEventListener('click', () => this.execCommand('undo'));
        document.getElementById('btnRedo').addEventListener('click', () => this.execCommand('redo'));

        // Alignment
        document.getElementById('btnAlignLeft').addEventListener('click', () => this.execCommand('justifyLeft'));
        document.getElementById('btnAlignCenter').addEventListener('click', () => this.execCommand('justifyCenter'));
        document.getElementById('btnAlignRight').addEventListener('click', () => this.execCommand('justifyRight'));
        document.getElementById('btnAlignJustify').addEventListener('click', () => this.execCommand('justifyFull'));

        // Lists
        document.getElementById('btnBulletList').addEventListener('click', () => this.execCommand('insertUnorderedList'));
        document.getElementById('btnNumberList').addEventListener('click', () => this.execCommand('insertOrderedList'));

        // Indent
        document.getElementById('btnIndentIncrease').addEventListener('click', () => this.execCommand('indent'));
        document.getElementById('btnIndentDecrease').addEventListener('click', () => this.execCommand('outdent'));

        // Clear formatting
        document.getElementById('btnClearFormat').addEventListener('click', () => this.execCommand('removeFormat'));

        // Font family
        document.getElementById('fontFamily').addEventListener('change', (e) => {
            this.execCommand('fontName', e.target.value);
        });

        // Format block (headings, paragraph)
        document.getElementById('formatBlock').addEventListener('change', (e) => {
            const value = e.target.value;
            if (value === 'blockquote') {
                this.execCommand('formatBlock', 'blockquote');
            } else {
                this.execCommand('formatBlock', value);
            }
        });

        // Font size
        const fontSizeInput = document.getElementById('fontSize');
        document.getElementById('fontSizeIncrease').addEventListener('click', () => {
            let size = parseInt(fontSizeInput.value) || 11;
            size = Math.min(size + 1, 400);
            fontSizeInput.value = size;
            this.applyFontSize(size);
        });

        document.getElementById('fontSizeDecrease').addEventListener('click', () => {
            let size = parseInt(fontSizeInput.value) || 11;
            size = Math.max(size - 1, 1);
            fontSizeInput.value = size;
            this.applyFontSize(size);
        });

        fontSizeInput.addEventListener('change', (e) => {
            const size = parseInt(e.target.value) || 11;
            this.applyFontSize(size);
        });

        fontSizeInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const size = parseInt(e.target.value) || 11;
                this.applyFontSize(size);
                this.editor.focus();
            }
        });

        // Text color
        const textColorPicker = document.getElementById('textColorPicker');
        document.getElementById('btnTextColor').addEventListener('click', () => {
            textColorPicker.click();
        });
        textColorPicker.addEventListener('input', (e) => {
            document.getElementById('textColorIndicator').style.background = e.target.value;
            this.execCommand('foreColor', e.target.value);
        });

        // Highlight color
        const highlightColorPicker = document.getElementById('highlightColorPicker');
        document.getElementById('btnHighlight').addEventListener('click', () => {
            highlightColorPicker.click();
        });
        highlightColorPicker.addEventListener('input', (e) => {
            document.getElementById('highlightIndicator').style.background = e.target.value;
            this.execCommand('hiliteColor', e.target.value);
        });

        // Insert link
        document.getElementById('btnLink').addEventListener('click', () => this.insertLink());

        // Insert image
        document.getElementById('btnImage').addEventListener('click', () => {
            document.getElementById('imageInput').click();
        });

        document.getElementById('imageInput').addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.insertImageFile(e.target.files[0]);
                e.target.value = '';
            }
        });

        // Line spacing
        document.getElementById('lineSpacing').addEventListener('change', (e) => {
            this.applyLineSpacing(e.target.value);
        });
    }

    applyFontSize(size) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        if (range.collapsed) {
            // No selection, apply to next typed text
            const span = document.createElement('span');
            span.style.fontSize = size + 'pt';
            span.innerHTML = '&#8203;'; // Zero-width space
            range.insertNode(span);

            // Place cursor inside span
            const newRange = document.createRange();
            newRange.setStart(span.firstChild, 1);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        } else {
            // Wrap selected text
            // Use execCommand fontSize then replace
            document.execCommand('fontSize', false, '7');
            const fontElements = this.editor.querySelectorAll('font[size="7"]');
            fontElements.forEach(el => {
                const span = document.createElement('span');
                span.style.fontSize = size + 'pt';
                span.innerHTML = el.innerHTML;
                el.replaceWith(span);
            });
        }
    }

    applyLineSpacing(value) {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        // Apply to editor globally or to selected blocks
        let node = selection.anchorNode;
        while (node && node !== this.editor) {
            if (node.nodeType === 1 && ['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'BLOCKQUOTE'].includes(node.tagName)) {
                node.style.lineHeight = value;
                break;
            }
            node = node.parentNode;
        }

        // If no block element found, apply to editor
        if (node === this.editor || !node) {
            this.editor.style.lineHeight = value;
        }
    }

    insertLink() {
        const selection = window.getSelection();
        const selectedText = selection.toString();
        const url = prompt('Enter URL:', 'https://');

        if (url) {
            if (selectedText) {
                this.execCommand('createLink', url);
            } else {
                const displayText = prompt('Enter display text:', url);
                const link = `<a href="${url}" target="_blank">${displayText || url}</a>`;
                this.execCommand('insertHTML', link);
            }
        }
    }

    insertImageFile(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = `<img src="${e.target.result}" style="max-width:100%;" alt="Inserted image">`;
            this.editor.focus();
            document.execCommand('insertHTML', false, img);
        };
        reader.readAsDataURL(file);
    }

    setupKeyboardShortcuts() {
        this.editor.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'b':
                        e.preventDefault();
                        this.execCommand('bold');
                        break;
                    case 'i':
                        e.preventDefault();
                        this.execCommand('italic');
                        break;
                    case 'u':
                        e.preventDefault();
                        this.execCommand('underline');
                        break;
                    case 'z':
                        if (e.shiftKey) {
                            e.preventDefault();
                            this.execCommand('redo');
                        }
                        break;
                    case 'y':
                        e.preventDefault();
                        this.execCommand('redo');
                        break;
                    case 'k':
                        e.preventDefault();
                        this.insertLink();
                        break;
                    case 's':
                        e.preventDefault();
                        this.saveDocument();
                        break;
                }
            }

            // Tab key for indent
            if (e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.execCommand('outdent');
                } else {
                    this.execCommand('indent');
                }
            }
        });
    }

    setupSelectionListener() {
        document.addEventListener('selectionchange', () => {
            this.updateToolbarState();
        });

        this.editor.addEventListener('mouseup', () => {
            this.updateToolbarState();
        });
    }

    updateToolbarState() {
        // Bold
        this.toggleButtonState('btnBold', document.queryCommandState('bold'));
        this.toggleButtonState('btnItalic', document.queryCommandState('italic'));
        this.toggleButtonState('btnUnderline', document.queryCommandState('underline'));
        this.toggleButtonState('btnStrikethrough', document.queryCommandState('strikeThrough'));

        // Alignment
        this.toggleButtonState('btnAlignLeft', document.queryCommandState('justifyLeft'));
        this.toggleButtonState('btnAlignCenter', document.queryCommandState('justifyCenter'));
        this.toggleButtonState('btnAlignRight', document.queryCommandState('justifyRight'));
        this.toggleButtonState('btnAlignJustify', document.queryCommandState('justifyFull'));

        // Lists
        this.toggleButtonState('btnBulletList', document.queryCommandState('insertUnorderedList'));
        this.toggleButtonState('btnNumberList', document.queryCommandState('insertOrderedList'));

        // Font family
        const fontName = document.queryCommandValue('fontName');
        if (fontName) {
            const cleanFont = fontName.replace(/"/g, '');
            const fontSelect = document.getElementById('fontFamily');
            for (let option of fontSelect.options) {
                if (option.value.toLowerCase() === cleanFont.toLowerCase()) {
                    fontSelect.value = option.value;
                    break;
                }
            }
        }

        // Format block
        const formatBlock = document.queryCommandValue('formatBlock');
        if (formatBlock) {
            const formatSelect = document.getElementById('formatBlock');
            const tag = formatBlock.replace(/</g, '').replace(/>/g, '').toLowerCase();
            for (let option of formatSelect.options) {
                if (option.value === tag) {
                    formatSelect.value = option.value;
                    break;
                }
            }
        }

        // Font size detection
        this.detectFontSize();
    }

    detectFontSize() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return;

        let node = selection.anchorNode;
        if (node.nodeType === 3) node = node.parentNode;

        const computed = window.getComputedStyle(node);
        const pxSize = parseFloat(computed.fontSize);
        const ptSize = Math.round(pxSize * 72 / 96);
        document.getElementById('fontSize').value = ptSize;
    }

    toggleButtonState(btnId, state) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.classList.toggle('active', state);
        }
    }

    updateCounts() {
        const text = this.editor.innerText || '';
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const chars = text.length;

        document.getElementById('wordCount').textContent = `Words: ${words}`;
        document.getElementById('charCount').textContent = `Characters: ${chars}`;
    }

    getContent() {
        return this.editor.innerHTML;
    }

    setContent(html) {
        this.editor.innerHTML = html;
        this.updateCounts();
    }

    getPlainText() {
        return this.editor.innerText;
    }

    saveDocument() {
        const content = this.getContent();
        const title = document.getElementById('docTitle').value || 'Untitled Booklet';

        const fullHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.15; max-width: 800px; margin: 40px auto; padding: 0 20px; }
        img { max-width: 100%; }
    </style>
</head>
<body>
${content}
</body>
</html>`;

        const blob = new Blob([fullHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}.html`;
        a.click();
        URL.revokeObjectURL(url);
    }

    loadDocument(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;

            if (file.name.endsWith('.txt')) {
                // Plain text - convert newlines to paragraphs
                const paras = content.split('\n').map(line =>
                    line.trim() ? `<p>${line}</p>` : '<p><br></p>'
                ).join('');
                this.setContent(paras);
            } else {
                // HTML file - extract body content
                const parser = new DOMParser();
                const doc = parser.parseFromString(content, 'text/html');
                const bodyContent = doc.body.innerHTML;
                this.setContent(bodyContent);

                // Try to extract title
                const title = doc.title;
                if (title) {
                    document.getElementById('docTitle').value = title;
                }
            }
        };
        reader.readAsText(file);
    }

    newDocument() {
        if (confirm('Create a new document? Any unsaved changes will be lost.')) {
            this.setContent('<p><br></p>');
            document.getElementById('docTitle').value = 'Untitled Booklet';
        }
    }

    setupAutoSave() {
        // Auto-save to localStorage every 30 seconds
        setInterval(() => {
            localStorage.setItem('bookletCreator_content', this.getContent());
            localStorage.setItem('bookletCreator_title', document.getElementById('docTitle').value);
        }, 30000);

        // Restore on load
        const savedContent = localStorage.getItem('bookletCreator_content');
        const savedTitle = localStorage.getItem('bookletCreator_title');

        if (savedContent && savedContent !== '<p><br></p>') {
            this.setContent(savedContent);
        }
        if (savedTitle) {
            document.getElementById('docTitle').value = savedTitle;
        }
    }
}