const { PDFDocument, StandardFonts, rgb, degrees } = require('pdf-lib');
const sharp = require('sharp');
const crypto = require('crypto');
const puppeteer = require('puppeteer');
const archiver = require('archiver')
const pdfStorage = new Map();

const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const DocxMerger = require('docx-merger');
const ExcelJS = require('exceljs');

const PROJECT_TEMP_ROOT = path.join(__dirname, '..', 'temp', 'word-to-pdf');

const VIEWPORTS = {
    desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
    tablet: { width: 768, height: 1024, deviceScaleFactor: 1 },
    mobile: { width: 390, height: 844, deviceScaleFactor: 2 }, // ≈ iPhone 12/13/14 size @2x
};

// Helper to convert PDF page size to points
const pageSizes = {
    A4: [595.28, 841.89],
    LETTER: [612, 792],
    FIT: null
};

// Margin settings in millimeters converted to points (1mm = 2.83465 points)
const marginSizes = {
    none: 0,
    small: 10 * 2.83465, // 10mm = 28.3465 points
    big: 20 * 2.83465    // 20mm = 56.693 points
};

async function imageToPDFPOST(request, reply) {
    try {
        const parts = await request.parts();

        const images = [];
        let settings = {};

        // -------- Parse multipart data --------
        for await (const part of parts) {
            if (part.file) {
                const buffer = await part.toBuffer();
                const match = part.fieldname.match(/images\[(\d+)\]\[file\]/);

                if (match) {
                    const index = Number(match[1]);
                    images[index] ??= {};
                    images[index].file = buffer;
                    images[index].filename = part.filename;
                }
            } else {
                if (part.fieldname.startsWith('images[')) {
                    const match = part.fieldname.match(/images\[(\d+)\]\[(\w+)\]/);
                    if (match) {
                        const index = Number(match[1]);
                        const key = match[2];
                        images[index] ??= {};
                        images[index][key] = part.value;
                    }
                } else if (part.fieldname === 'settings') {
                    settings = JSON.parse(part.value);
                }
            }
        }

        // -------- Validation --------
        if (!images.length) {
            return reply.status(400).send({ error: 'No images provided' });
        }

        if (!settings.pageSize || !settings.margin || !settings.orientation) {
            return reply.status(400).send({ error: 'Invalid settings' });
        }

        if (!['none', 'small', 'big'].includes(settings.margin)) {
            return reply.status(400).send({ error: 'Invalid margin value' });
        }

        const dpi = settings.dpi ? parseInt(settings.dpi) : 300;
        const margin = marginSizes[settings.margin] || 0;

        // -------- FIX: Normalize + sort images by index --------
        const orderedImages = images
            .map((img, index) => ({ ...img, index }))
            .filter(img => img.file && img.rotation !== undefined)
            .sort((a, b) => a.index - b.index);

        // -------- Create PDF --------
        const pdfDoc = await PDFDocument.create();

        // -------- FIX: Process images SEQUENTIALLY --------
        for (const img of orderedImages) {
            const processedImage = await sharp(img.file)
                .rotate(Number(img.rotation) || 0)
                .jpeg({ quality: 85 })
                .toBuffer();

            const pdfImage = await pdfDoc.embedJpg(processedImage);
            const { width, height } = pdfImage;

            const imgWidthPt = (width / dpi) * 72;
            const imgHeightPt = (height / dpi) * 72;

            let pageWidth, pageHeight;

            if (settings.pageSize.toUpperCase() === 'FIT') {
                pageWidth = imgWidthPt + margin * 2;
                pageHeight = imgHeightPt + margin * 2;
            } else {
                const pageSize =
                    pageSizes[settings.pageSize.toUpperCase()] || pageSizes.A4;

                [pageWidth, pageHeight] =
                    settings.orientation === 'landscape'
                        ? [pageSize[1], pageSize[0]]
                        : pageSize;
            }

            const contentWidth = pageWidth - margin * 2;
            const contentHeight = pageHeight - margin * 2;

            const scale =
                settings.pageSize.toUpperCase() === 'FIT'
                    ? 1
                    : Math.min(
                        contentWidth / imgWidthPt,
                        contentHeight / imgHeightPt
                    );

            const drawWidth = imgWidthPt * scale;
            const drawHeight = imgHeightPt * scale;

            const x = margin + (contentWidth - drawWidth) / 2;
            const y = margin + (contentHeight - drawHeight) / 2;

            const page = pdfDoc.addPage([pageWidth, pageHeight]);
            page.drawImage(pdfImage, {
                x,
                y,
                width: drawWidth,
                height: drawHeight,
            });
        }

        // -------- Save PDF --------
        const pdfBytes = await pdfDoc.save();

        // -------- Store PDF --------
        const token = crypto.randomBytes(32).toString('hex');
        pdfStorage.set(token, Buffer.from(pdfBytes));

        return reply.redirect(`/imagetopdf/download/${token}`);

    } catch (err) {
        request.log.error(err);
        return reply.status(500).send({
            error: 'Internal Server Error',
            message: err.message
        });
    }
}


async function addPagestoPDFPOST(request, reply) {
    try {
        const data = await request.parts();

        const pageEntries = []; // Will hold { file, type, rotation, index }
        let settings = {};

        // ====================================================
        // Parse multipart form-data (new unified pages[] format)
        // ====================================================
        for await (const part of data) {
            if (part.file) {
                // All files come under pages[i][file]
                const match = part.fieldname.match(/pages\[(\d+)\]\[file\]/);
                if (match) {
                    const idx = parseInt(match[1]);
                    if (!pageEntries[idx]) pageEntries[idx] = {};
                    pageEntries[idx].file = await part.toBuffer();
                    pageEntries[idx].filename = part.filename || `page_${idx}`;
                }
            } else {
                // Text fields: pages[i][type], pages[i][index], pages[i][rotation], settings
                if (part.fieldname.startsWith("pages[")) {
                    const match = part.fieldname.match(/pages\[(\d+)\]\[(\w+)\]/);
                    if (match) {
                        const idx = parseInt(match[1]);
                        const key = match[2];
                        if (!pageEntries[idx]) pageEntries[idx] = {};
                        pageEntries[idx][key] = part.value;
                    }
                } else if (part.fieldname === "settings") {
                    try {
                        settings = JSON.parse(part.value);
                    } catch (e) {
                        return reply.status(400).send({ error: "Invalid settings JSON" });
                    }
                }
            }
        }

        // Validation
        if (pageEntries.length === 0) {
            return reply.status(400).send({ error: "No pages provided" });
        }

        // Ensure all pages have required data
        const validPages = pageEntries
            .map((entry, i) => {
                if (!entry?.file) return null;

                return {
                    buffer: entry.file,
                    type: entry.type || "image", // default to image if missing
                    rotation: parseFloat(entry.rotation) || 0,
                    index: parseInt(entry.index) || (i + 1),
                    filename: entry.filename
                };
            })
            .filter(Boolean);

        if (validPages.length === 0) {
            return reply.status(400).send({ error: "No valid pages to process" });
        }

        // Validate settings
        const required = ['pageSize', 'margin', 'orientation'];
        for (const key of required) {
            if (!settings[key]) {
                return reply.status(400).send({ error: `Missing setting: ${key}` });
            }
        }
        if (!['none', 'small', 'big'].includes(settings.margin)) {
            return reply.status(400).send({ error: "Invalid margin" });
        }

        settings.dpi = settings.dpi ? parseInt(settings.dpi) : 300;
        const marginPoints = marginSizes[settings.margin] || 0;

        // ====================================================
        // Create NEW PDF from scratch using exact order from frontend
        // ====================================================
        const pdfDoc = await PDFDocument.create();

        for (const pageData of validPages) {
            let buffer = pageData.buffer;

            if (pageData.type === "pdf") {
                const sourcePdf = await PDFDocument.load(buffer);

                const totalPages = sourcePdf.getPageCount();

                // Create an array [0, 1, 2, ..., totalPages-1]
                const pageIndices = Array.from({ length: totalPages }, (_, i) => i);

                const copiedPages = await pdfDoc.copyPages(sourcePdf, pageIndices);

                for (const page of copiedPages) {
                    pdfDoc.addPage(page);
                }

                continue; // Skip image processing 
            }

            // === Image processing ===
            // Rotate + convert to JPEG if needed
            // if (pageData.rotation !== 0 || !/\.(jpe?g)$/i.test(pageData.filename)) {
            buffer = await sharp(buffer)
                .rotate(pageData.rotation)
                .jpeg({ quality: 95 })
                .toBuffer();
            // }

            const embeddedImage = await pdfDoc.embedJpg(buffer);
            const { width: imgW, height: imgH } = embeddedImage.scale(1);

            const imgWpts = (imgW / settings.dpi) * 72;
            const imgHpts = (imgH / settings.dpi) * 72;

            let pageWidth, pageHeight;
            let scaledW, scaledH, x, y;

            if (settings.pageSize.toUpperCase() === "FIT") {
                pageWidth = imgWpts + 2 * marginPoints;
                pageHeight = imgHpts + 2 * marginPoints;
                scaledW = imgWpts;
                scaledH = imgHpts;
                x = marginPoints;
                y = marginPoints;
            } else {
                const base = pageSizes[settings.pageSize.toUpperCase()] || pageSizes.A4;
                [pageWidth, pageHeight] = settings.orientation === "landscape"
                    ? [base[1], base[0]]
                    : base;

                const contentW = pageWidth - 2 * marginPoints;
                const contentH = pageHeight - 2 * marginPoints;

                const scale = Math.min(contentW / imgWpts, contentH / imgHpts);
                scaledW = imgWpts * scale;
                scaledH = imgHpts * scale;

                x = marginPoints + (contentW - scaledW) / 2;
                y = marginPoints + (contentH - scaledH) / 2;
            }

            const page = pdfDoc.addPage([pageWidth, pageHeight]);
            page.drawImage(embeddedImage, {
                x,
                y,
                width: scaledW,
                height: scaledH
            });
        }

        // ====================================================
        // Save and return
        // ====================================================
        const pdfBytes = await pdfDoc.save({ useObjectStreams: true });

        if (!pdfBytes || pdfBytes.length === 0) {
            return reply.status(500).send({ error: "Failed to generate PDF" });
        }

        const token = crypto.randomBytes(32).toString('hex');
        pdfStorage.set(token, Buffer.from(pdfBytes));

        return reply.redirect(`/add-pages-pdf/download/${token}`);

    } catch (error) {
        fastify.log.error("Add Pages to PDF Error:", error);
        return reply.status(500).send({
            error: "Internal server error",
            message: error.message
        });
    }
}

async function mergePDFPost(request, reply) {
    try {
        const data = await request.parts();

        const pdfs = [];
        let settings = { margin: 'none' };

        // -------- Parse multipart data --------
        for await (const part of data) {
            if (part.file) {
                const buffer = await part.toBuffer();
                const match = part.fieldname.match(/^pdfs\[(\d+)\]$/);

                if (match) {
                    const index = Number(match[1]);
                    pdfs[index] = {
                        index,
                        file: buffer,
                        filename: part.filename || `pdf_${index}.pdf`,
                    };
                }
            } else if (part.fieldname === 'settings') {
                try {
                    const parsed = JSON.parse(part.value);
                    if (['none', 'small', 'big'].includes(parsed.margin)) {
                        settings.margin = parsed.margin;
                    }
                } catch {
                    return reply.status(400).send({ error: 'Invalid settings JSON' });
                }
            }
        }

        // -------- Normalize + sort PDFs --------
        const orderedPdfs = pdfs
            .filter(p => p && p.file)
            .sort((a, b) => a.index - b.index);

        if (orderedPdfs.length === 0) {
            return reply.status(400).send({ error: 'No PDFs provided' });
        }

        // -------- Create merged PDF --------
        const mergedPdf = await PDFDocument.create();
        const margin = marginSizes[settings.margin] || 0;

        // -------- Merge in correct order --------
        for (const pdfItem of orderedPdfs) {
            const srcPdf = await PDFDocument.load(pdfItem.file);
            const pageCount = srcPdf.getPageCount();

            for (let i = 0; i < pageCount; i++) {
                const [embeddedPage] = await mergedPdf.embedPages([
                    srcPdf.getPage(i),
                ]);

                const { width, height } = embeddedPage;

                const newPage = mergedPdf.addPage([
                    width + margin * 2,
                    height + margin * 2,
                ]);

                newPage.drawPage(embeddedPage, {
                    x: margin,
                    y: margin,
                    width,
                    height,
                });
            }
        }

        // -------- Save merged PDF --------
        const pdfBytes = await mergedPdf.save();

        const token = crypto.randomBytes(32).toString('hex');
        pdfStorage.set(token, Buffer.from(pdfBytes));

        return reply.redirect(`/merge-pdf/download/${token}`);

    } catch (error) {

        request.log.error(error);
        return reply.status(500).send({
            error: 'Internal server error',
            message: error.message,
        });
    }
}


function toRoman(num) {
    if (num < 1) return "";
    const roman = [
        ["M", 1000], ["CM", 900], ["D", 500], ["CD", 400],
        ["C", 100], ["XC", 90], ["L", 50], ["XL", 40],
        ["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1]
    ];

    let result = "";
    for (const [r, v] of roman) {
        while (num >= v) {
            result += r;
            num -= v;
        }
    }
    return result;
}

async function addPageNumberToPDFPost(request, reply) {
    try {
        const parts = await request.parts();

        let pdfBuffer = null;
        let settings = {};

        // -------------------------
        // Parse multipart data
        // -------------------------
        for await (const part of parts) {
            if (part.file && part.fieldname === "pdf") {
                pdfBuffer = await part.toBuffer();
            } else if (part.fieldname === "settings") {
                try {
                    settings = JSON.parse(part.value || "{}");
                } catch {
                    return reply.status(400).send({ error: "Invalid settings JSON" });
                }
            }
        }

        // -------------------------
        // Validation
        // -------------------------
        if (!pdfBuffer) {
            return reply.status(400).send({ error: "No PDF file provided" });
        }

        if (!settings.pageSize || !settings.margin || !settings.orientation) {
            return reply.status(400).send({ error: "Invalid settings" });
        }

        if (!["none", "small", "big"].includes(settings.margin)) {
            return reply.status(400).send({ error: "Invalid margin value" });
        }

        // -------------------------
        // Defaults & State
        // -------------------------
        const state = {
            pageNumberFormat: settings.pageNumberFormat || "arabic",
            position: settings.position || "bottom-center",
            pageNumberStart: Math.max(parseInt(settings.pageNumberStart) || 1, 1),
            startFromPage: Math.max(parseInt(settings.startFromPage) || 1, 1),
            margin: settings.margin,
            pageSize: String(settings.pageSize).toUpperCase(),
            orientation: String(settings.orientation).toLowerCase(),
        };

        if (!pageSizes[state.pageSize]) {
            state.pageSize = "FIT";
        }

        const margin = marginSizes[state.margin] || 0;

        // -------------------------
        // Load source PDF
        // -------------------------
        const srcDoc = await PDFDocument.load(pdfBuffer);
        const srcPages = srcDoc.getPages();
        const totalPages = srcPages.length;

        if (state.startFromPage > totalPages) {
            state.startFromPage = totalPages;
        }

        // -------------------------
        // Create output PDF
        // -------------------------
        const pdfDoc = await PDFDocument.create();
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const fontSize = 10;

        // -------------------------
        // Page number formatter
        // -------------------------
        const formatPageNumber = (num) => {
            switch (state.pageNumberFormat) {
                case "roman":
                    return toRoman(num);
                case "page-n":
                    return `Page ${num}`;
                case "page-n-of-m":
                    return `Page ${num} of ${totalPages}`;
                case "n-slash-m":
                    return `${num} / ${totalPages}`;
                default:
                    return String(num);
            }
        };

        // -------------------------
        // Process pages
        // -------------------------
        for (let i = 0; i < totalPages; i++) {
            const srcPage = srcPages[i];
            const [embeddedPage] = await pdfDoc.embedPages([srcPage]);

            const srcWidth = srcPage.getWidth();
            const srcHeight = srcPage.getHeight();

            let pageWidth, pageHeight;

            if (state.pageSize === "FIT") {
                pageWidth = srcWidth + margin * 2;
                pageHeight = srcHeight + margin * 2;
            } else {
                [pageWidth, pageHeight] = pageSizes[state.pageSize];
                if (state.orientation === "landscape") {
                    [pageWidth, pageHeight] = [pageHeight, pageWidth];
                }
            }

            const contentWidth = pageWidth - margin * 2;
            const contentHeight = pageHeight - margin * 2;

            const scale =
                state.pageSize === "FIT"
                    ? 1
                    : Math.min(
                        contentWidth / srcWidth,
                        contentHeight / srcHeight
                    );

            const drawWidth = srcWidth * scale;
            const drawHeight = srcHeight * scale;

            const x = margin + (contentWidth - drawWidth) / 2;
            const y = margin + (contentHeight - drawHeight) / 2;

            const page = pdfDoc.addPage([pageWidth, pageHeight]);

            page.drawPage(embeddedPage, {
                x,
                y,
                width: drawWidth,
                height: drawHeight,
            });

            // -------------------------
            // Page number logic
            // -------------------------
            const pageIndex = i + 1;

            if (pageIndex >= state.startFromPage) {
                const displayNumber =
                    state.pageNumberStart + (pageIndex - state.startFromPage);

                const text = formatPageNumber(displayNumber);
                const textWidth = font.widthOfTextAtSize(text, fontSize);

                const isTop = state.position.startsWith("top");
                const isCenter = state.position.endsWith("center");
                const isLeft = state.position.endsWith("left");

                const textX = isCenter
                    ? (pageWidth - textWidth) / 2
                    : isLeft
                        ? margin
                        : pageWidth - margin - textWidth;

                const textY = isTop
                    ? pageHeight - margin - fontSize
                    : margin;

                page.drawText(text, {
                    x: textX,
                    y: textY,
                    size: fontSize,
                    font,
                    color: rgb(0.2, 0.2, 0.2),
                });
            }
        }

        // -------------------------
        // Save & store PDF
        // -------------------------
        const pdfBytes = await pdfDoc.save({ useObjectStreams: true });

        const token = crypto.randomBytes(32).toString("hex");
        pdfStorage.set(token, Buffer.from(pdfBytes));

        return reply.redirect(`/add-page-numbers/download/${token}`);

    } catch (err) {
        request.log.error(err);
        return reply.status(500).send({
            error: "Internal Server Error",
            message: err.message,
        });
    }
}

async function rotatePDFAllPagesPost(request, reply) {
    try {
        const parts = await request.parts();

        let pdfBuffer = null;
        let settings = {
            rotation: 90, // CLOCKWISE rotation requested
            margin: 'none',
        };

        // ---------------- Parse multipart ----------------
        for await (const part of parts) {
            if (part.file && part.fieldname === 'pdf') {
                pdfBuffer = await part.toBuffer();

                if (!part.filename.toLowerCase().endsWith('.pdf')) {
                    return reply.status(400).send({ error: 'Uploaded file must be a PDF' });
                }
            }

            if (!part.file && part.fieldname === 'settings') {
                try {
                    const parsed = JSON.parse(part.value);

                    if ([0, 90, 180, 270].includes(Number(parsed.rotation))) {
                        settings.rotation = Number(parsed.rotation);
                    }

                    if (['none', 'small', 'big'].includes(parsed.margin)) {
                        settings.margin = parsed.margin;
                    }
                } catch {
                    return reply.status(400).send({ error: 'Invalid settings JSON' });
                }
            }
        }

        if (!pdfBuffer) {
            return reply.status(400).send({ error: 'No PDF provided' });
        }

        // ---------------- Load PDFs ----------------
        const srcPdf = await PDFDocument.load(pdfBuffer);
        const outPdf = await PDFDocument.create();

        const margin = marginSizes[settings.margin] || 0;
        const cwRotation = settings.rotation;

        // Convert CLOCKWISE → pdf-lib (CCW)
        const ccwRotation = (360 - cwRotation) % 360;

        // ---------------- Rotate pages ----------------
        for (const srcPage of srcPdf.getPages()) {
            const { width, height } = srcPage.getSize();

            const is90 = cwRotation === 90 || cwRotation === 270;

            const pageWidth = (is90 ? height : width) + margin * 2;
            const pageHeight = (is90 ? width : height) + margin * 2;

            const page = outPdf.addPage([pageWidth, pageHeight]);
            const [embedded] = await outPdf.embedPages([srcPage]);

            let x = margin;
            let y = margin;

            // -------- CLOCKWISE translation --------
            if (cwRotation === 90) {
                x = margin;
                y = margin + width;
            }

            if (cwRotation === 180) {
                x = margin + width;
                y = margin + height;
            }

            if (cwRotation === 270) {
                x = margin + height;
                y = margin;
            }

            page.drawPage(embedded, {
                x,
                y,
                width,
                height,
                rotate: degrees(ccwRotation), // IMPORTANT
            });
        }

        // ---------------- Save ----------------
        const pdfBytes = await outPdf.save();
        const token = crypto.randomBytes(32).toString('hex');

        pdfStorage.set(token, Buffer.from(pdfBytes));

        return reply.redirect(`/rotate-pages/download/${token}`);

    } catch (err) {

        if (err.code === "FST_REQ_FILE_TOO_LARGE") {
            return reply.status(413).send({
                error: "File too large",
                maxSize: "30MB"
            });
        }

        request.log.error(err);
        return reply.status(500).send({
            error: 'Failed to rotate PDF',
            message: err.message,
        });
    }
}

async function removePagesFromPDFPost(request, reply) {

    try {
        const parts = await request.parts();

        let pdfBuffer = null;
        let pagesToRemove = []; // 1-based
        let settings = { margin: 'none' };

        // ---------------- Parse multipart ----------------
        for await (const part of parts) {

            if (part.file && part.fieldname === 'pdf') {
                if (!part.filename.toLowerCase().endsWith('.pdf')) {
                    return reply.status(400).send({ error: 'Uploaded file must be a PDF' });
                }
                pdfBuffer = await part.toBuffer();
            }

            if (!part.file && part.fieldname === 'pagesToRemove') {
                try {
                    const parsed = JSON.parse(part.value);
                    if (!Array.isArray(parsed)) throw new Error();
                    pagesToRemove = parsed.map(Number); // 1-based
                } catch {
                    return reply.status(400).send({ error: 'Invalid pagesToRemove JSON' });
                }
            }

            if (!part.file && part.fieldname === 'settings') {
                try {
                    const parsed = JSON.parse(part.value);
                    if (['none', 'small', 'big'].includes(parsed.margin)) {
                        settings.margin = parsed.margin;
                    }
                } catch {
                    return reply.status(400).send({ error: 'Invalid settings JSON' });
                }
            }
        }

        if (!pdfBuffer) {
            return reply.status(400).send({ error: 'No PDF provided' });
        }

        // ---------------- Load PDFs ----------------
        const srcPdf = await PDFDocument.load(pdfBuffer);
        const outPdf = await PDFDocument.create();

        const pageCount = srcPdf.getPageCount();
        const margin = marginSizes[settings.margin] || 0;

        // ---------------- Convert to 0-based indexes ----------------
        const removeSet = new Set(
            pagesToRemove
                .map(p => p - 1)                 // 🔑 convert to 0-based
                .filter(i => i >= 0 && i < pageCount)
        );

        // ---------------- Pages to KEEP ----------------
        const keepIndexes = [];
        for (let i = 0; i < pageCount; i++) {
            if (!removeSet.has(i)) {
                keepIndexes.push(i);
            }
        }

        // console.log(keepIndexes);

        if (keepIndexes.length === 0) {
            return reply.status(400).send({ error: 'Cannot remove all pages' });
        }

        // ---------------- Copy pages with margin ----------------
        const pagesToEmbed = await outPdf.embedPages(
            keepIndexes.map(i => srcPdf.getPage(i))
        );

        pagesToEmbed.forEach((embeddedPage) => {
            const { width, height } = embeddedPage;

            const page = outPdf.addPage([
                width + margin * 2,
                height + margin * 2,
            ]);

            page.drawPage(embeddedPage, {
                x: margin,
                y: margin,
                width,
                height,
            });
        });

        // ---------------- Save ----------------
        const pdfBytes = await outPdf.save({ useObjectStreams: true });
        const token = crypto.randomBytes(32).toString('hex');

        pdfStorage.set(token, Buffer.from(pdfBytes));

        return reply.redirect(`/remove-pages/download/${token}`);

    } catch (err) {

        if (err.code === 'FST_REQ_FILE_TOO_LARGE') {
            return reply.status(413).send({
                error: 'File too large',
                maxSize: '30MB',
            });
        }

        request.log.error(err);
        return reply.status(500).send({
            error: 'Failed to remove pages',
            message: err.message,
        });
    }

}

async function splitPDFPost(request, reply) {
    try {
        const parts = await request.parts();

        let pdfBuffer = null;
        let splitRanges = [];
        let settings = { margin: 'none' };
        let keepDifferentPDF = false;

        // ── Parse multipart/form-data ──────────────────────────────
        for await (const part of parts) {
            try {
                if (part.file && part.fieldname === 'pdf') {
                    if (!part.filename?.toLowerCase().endsWith('.pdf')) {
                        return reply.status(400).send({ error: 'Uploaded file must be a PDF' });
                    }
                    pdfBuffer = await part.toBuffer();
                }

                if (!part.file && part.fieldname === 'splitPagesArray') {
                    const parsed = JSON.parse(part.value);
                    if (!Array.isArray(parsed)) throw new Error('Invalid splitPagesArray');

                    splitRanges = parsed.map(r => ({
                        startPage: Number(r.startPage),
                        endPage: Number(r.endPage)
                    }));
                }

                if (!part.file && part.fieldname === 'settings') {
                    const parsed = JSON.parse(part.value);
                    if (['none', 'small', 'big'].includes(parsed?.margin)) {
                        settings.margin = parsed.margin;
                    }
                }

                if (!part.file && part.fieldname === 'keepDifferentPDF') {
                    keepDifferentPDF = JSON.parse(part.value) === true;
                }
            } catch {
                return reply.status(400).send({ error: 'Invalid form data' });
            }
        }

        // ── Basic validations ──────────────────────────────────────
        if (!pdfBuffer) {
            return reply.status(400).send({ error: 'No PDF provided' });
        }

        if (!splitRanges.length) {
            return reply.status(400).send({ error: 'No split ranges provided' });
        }

        // ── Load PDF ───────────────────────────────────────────────
        const srcPdf = await PDFDocument.load(pdfBuffer);
        const pageCount = srcPdf.getPageCount();
        const margin = marginSizes[settings.margin] || 0;

        // ── Validate ranges strictly ───────────────────────────────
        const usedPages = new Set();

        for (const r of splitRanges) {
            if (
                !Number.isInteger(r.startPage) ||
                !Number.isInteger(r.endPage) ||
                r.startPage < 1 ||
                r.endPage < r.startPage ||
                r.endPage > pageCount
            ) {
                return reply.status(400).send({ error: 'Invalid page range detected' });
            }

            for (let p = r.startPage; p <= r.endPage; p++) {
                if (usedPages.has(p)) {
                    return reply.status(400).send({ error: 'Overlapping page ranges are not allowed' });
                }
                usedPages.add(p);
            }
        }

        const outputPDFs = [];

        // ── Helper: add pages with margin ──────────────────────────
        async function addPages(outPdf, pageIndexes) {
            const pages = await outPdf.embedPages(
                pageIndexes.map(i => srcPdf.getPage(i))
            );

            for (const page of pages) {
                const { width, height } = page;
                const newPage = outPdf.addPage([
                    width + margin * 2,
                    height + margin * 2
                ]);
                newPage.drawPage(page, { x: margin, y: margin });
            }
        }

        // ── Split logic ────────────────────────────────────────────
        if (keepDifferentPDF) {
            for (let i = 0; i < splitRanges.length; i++) {
                const range = splitRanges[i];
                const outPdf = await PDFDocument.create();

                const indexes = [];
                for (let p = range.startPage; p <= range.endPage; p++) {
                    indexes.push(p - 1);
                }

                await addPages(outPdf, indexes);

                outputPDFs.push({
                    name: `split_${i + 1}_${range.startPage}-${range.endPage}.pdf`,
                    buffer: Buffer.from(await outPdf.save())
                });
            }
        } else {
            const outPdf = await PDFDocument.create();
            const indexes = [];

            for (const range of splitRanges) {
                for (let p = range.startPage; p <= range.endPage; p++) {
                    indexes.push(p - 1);
                }
            }

            await addPages(outPdf, indexes);

            outputPDFs.push({
                name: 'merged.pdf',
                buffer: Buffer.from(await outPdf.save())
            });
        }

        // ── ZIP or single response ─────────────────────────────────
        const token = crypto.randomBytes(24).toString('hex');

        if (keepDifferentPDF && outputPDFs.length > 1) {
            const zipBuffer = await new Promise((resolve, reject) => {
                const zip = archiver('zip', { zlib: { level: 6 } });
                const chunks = [];

                zip.on('data', c => chunks.push(c));
                zip.on('end', () => resolve(Buffer.concat(chunks)));
                zip.on('error', reject);

                for (const file of outputPDFs) {
                    zip.append(file.buffer, { name: file.name });
                }

                zip.finalize();
            });

            pdfStorage.set(token, zipBuffer);
            return reply.redirect(`/split-pdf/download/${token}?type=zip&filename=split_pdfs.zip`);
        }

        pdfStorage.set(token, outputPDFs[0].buffer);
        return reply.redirect(`/split-pdf/download/${token}`);

    } catch (err) {
        request.log.error(err);
        return reply.status(500).send({
            error: 'Failed to split PDF',
            message: err.message
        });
    }
}

(async () => {
    try {
        await fs.mkdir(PROJECT_TEMP_ROOT, { recursive: true });
    } catch (err) {
        if (err.code !== 'EEXIST') console.error('Cannot create temp/word-to-pdf folder:', err);
    }
})();


async function convertToPdfBuffer(inputBuffer, inputExtension) {
    if (!inputExtension.startsWith('.')) {
        throw new Error('inputExtension must start with "." (e.g. ".docx", ".xlsx")');
    }

    const uniqueId = Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    const tmpDir = path.join(PROJECT_TEMP_ROOT, `conv-${uniqueId}`);

    const inputPath = path.join(tmpDir, `input${inputExtension}`);
    const outputPath = path.join(tmpDir, 'input.pdf'); // LibreOffice naming

    try {
        await fs.mkdir(tmpDir, { recursive: true });
        await fs.writeFile(inputPath, inputBuffer);

        const cmd = `soffice --headless --convert-to pdf --outdir "${tmpDir}" "${inputPath}"`;

        await new Promise((resolve, reject) => {
            exec(cmd, { timeout: 120000 }, (error, stdout, stderr) => {
                if (error) {
                    console.error('LibreOffice error:', stderr || error.message);
                    return reject(error);
                }
                resolve();
            });
        });

        const pdfBuffer = await fs.readFile(outputPath);
        // console.log(pdfBuffer);
        return pdfBuffer;

    } finally {
        // Best-effort cleanup
        fs.rm(tmpDir, { recursive: true, force: true })
            .catch(err => console.warn(`Cleanup failed ${tmpDir}:`, err.message));
    }
}

// async function convertDocxToPdfBuffer(docxBuffer) {
//     const uniqueId = Date.now() + '-' + Math.random().toString(36).slice(2, 10);
//     const tmpDir = path.join(PROJECT_TEMP_ROOT, `conv-${uniqueId}`);

//     const inputPath  = path.join(tmpDir, 'input.docx');
//     const outputPath = path.join(tmpDir, 'input.pdf');   // soffice default naming

//     try {
//         await fs.mkdir(tmpDir, { recursive: true });
//         await fs.writeFile(inputPath, docxBuffer);

//         const cmd = `soffice --headless --convert-to pdf --outdir "${tmpDir}" "${inputPath}"`;

//         await new Promise((resolve, reject) => {
//             exec(cmd, { timeout: 90000 }, (error, stdout, stderr) => {
//                 if (error) {
//                     console.error('soffice error:', stderr || error.message);
//                     return reject(error);
//                 }
//                 resolve();
//             });
//         });

//         let pdfBuffer;
//         try {
//             pdfBuffer = await fs.readFile(outputPath);
//         } catch (e) {
//             throw new Error(`PDF not generated - file missing: ${outputPath}`);
//         }

//         return pdfBuffer;
//     } finally {
//         // Cleanup – best effort
//         fs.rm(tmpDir, { recursive: true, force: true })
//             .catch(err => console.warn(`Cleanup failed ${tmpDir}:`, err.message));
//     } 
// }


async function mergeDocxBuffers(buffers) {
    if (buffers.length === 0) throw new Error('No documents to merge');
    if (buffers.length === 1) return buffers[0];

    const merger = new DocxMerger({ pageBreak: true }, buffers);
    return new Promise((resolve, reject) => {
        merger.save('nodebuffer', (data) => {
            if (Buffer.isBuffer(data)) resolve(data);
            else reject(new Error('docx-merger failed to produce buffer'));
        });
    });
}


async function wordToPDFPost(request, reply) {
    try {
        const parts = await request.parts();

        let wordFiles = [];           // [ { buffer, filename, contentType? } ]
        let mergeIntoSingle = false;

        for await (const part of parts) {
            if (part.file) {
                if (/^files\[\d+\]$/.test(part.fieldname)) {
                    const buffer = await part.toBuffer();
                    wordFiles.push({
                        buffer,
                        filename: part.filename || `document_${wordFiles.length + 1}.docx`,
                        contentType: part.mimetype || 'application/octet-stream'
                    });
                }
            } else {
                // Form fields
                const value = part.value;
                if (part.fieldname === 'mergeIntoSingle') {
                    mergeIntoSingle =
                        value === 'true' || value === 'True' ||
                        (value && JSON.parse(value) === true);
                }
            }
        }

        if (wordFiles.length === 0) {
            return reply.status(400).send({ error: 'No Word files received' });
        }

        const outputPDFs = [];

        if (mergeIntoSingle) {
            // Merge all → one PDF
            const mergedDocx = await mergeDocxBuffers(wordFiles.map(f => f.buffer));
            // const pdfBuffer = await convertDocxToPdfBuffer(mergedDocx);
            const pdfBuffer = await convertToPdfBuffer(mergedDocx, '.docx');

            outputPDFs.push({
                name: 'merged-documents.pdf',
                buffer: pdfBuffer
            });
        } else {
            // Convert each separately
            for (const file of wordFiles) {
                // const pdfBuffer = await convertDocxToPdfBuffer(file.buffer);
                const pdfBuffer = await convertToPdfBuffer(file.buffer, '.docx');

                let safeName = file.filename
                    .replace(/[^a-zA-Z0-9._-]/g, '_')
                    .replace(/\.[^.]+$/, ''); // remove extension

                safeName += '.pdf';

                outputPDFs.push({
                    name: safeName,
                    buffer: pdfBuffer
                });
            }
        }

        const token = crypto.randomBytes(24).toString('hex');

        if (!mergeIntoSingle && outputPDFs.length > 1) {
            // ZIP multiple PDFs
            const zipBuffer = await new Promise((resolve, reject) => {
                const zip = archiver('zip', { zlib: { level: 6 } });
                const chunks = [];

                zip.on('data', chunk => chunks.push(chunk));
                zip.on('end', () => resolve(Buffer.concat(chunks)));
                zip.on('error', reject);

                outputPDFs.forEach(file => {
                    zip.append(file.buffer, { name: file.name });
                });

                zip.finalize();
            });

            pdfStorage.set(token, zipBuffer);
            return reply.redirect(`/word-to-pdf/download/${token}?type=zip&filename=converted-word-files.zip`);
        }

        // Single file case (merged or only one input)
        pdfStorage.set(token, outputPDFs[0].buffer);
        return reply.redirect(`/word-to-pdf/download/${token}`);

    } catch (err) {
        if (err.code === 'FST_REQ_FILE_TOO_LARGE') {
            return reply.status(413).send({ error: 'File too large', maxSize: '30MB' });
        }

        console.error(err);
        return reply.status(500).send({
            error: 'Word to PDF conversion failed',
            message: err.message
        });
    }
}


async function mergeExcelBuffers(buffersWithNames) {
    // buffersWithNames = [{ buffer: Buffer, filename: string }, ...]
    if (buffersWithNames.length === 0) throw new Error('No excel files to merge');
    if (buffersWithNames.length === 1) return buffersWithNames[0].buffer;

    const mergedWorkbook = new ExcelJS.Workbook();

    for (const { buffer, filename } of buffersWithNames) {
        const wb = new ExcelJS.Workbook();
        await wb.xlsx.load(buffer);

        // Take first worksheet or all? → here we take ALL sheets from source
        for (const ws of wb.worksheets) {
            // Create safe sheet name (ExcelJS enforces 31 char limit + no invalid chars)
            let sheetName = (filename || 'Sheet')
                .replace(/\.[^.]+$/, '')           // remove extension
                .replace(/[^a-zA-Z0-9-_ ]/g, '_')  // safe chars
                .slice(0, 28);                     // conservative limit

            if (ws.name && ws.name.trim()) {
                sheetName = ws.name
                    .replace(/[^a-zA-Z0-9-_ ]/g, '_')
                    .slice(0, 28);
            }

            // Avoid duplicate names
            let finalName = sheetName;
            let counter = 2;
            while (mergedWorkbook.getWorksheet(finalName)) {
                finalName = `${sheetName}_${counter++}`;
                if (finalName.length > 31) finalName = `Sheet_${counter++}`;
            }

            const newSheet = mergedWorkbook.addWorksheet(finalName);

            // Copy everything from source worksheet
            ws.eachRow((row, rowNumber) => {
                const newRow = newSheet.getRow(rowNumber);
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    const newCell = newSheet.getCell(rowNumber, colNumber);
                    newCell.value = cell.value;
                    newCell.style = { ...cell.style }; // shallow copy
                    // You can also copy merges, row height, column width, etc. if needed
                });
            });

            // Copy column widths (optional but recommended)
            ws.columns.forEach((col, i) => {
                newSheet.columns[i] = { ...col };
            });

            // Copy row heights (optional)
            ws.getRow(1).height; // trigger load if needed
            for (let r = 1; r <= ws.rowCount; r++) {
                const sourceRow = ws.getRow(r);
                if (sourceRow.height) {
                    newSheet.getRow(r).height = sourceRow.height;
                }
            }
        }
    }

    const mergedBuffer = await mergedWorkbook.xlsx.writeBuffer();
    return Buffer.from(mergedBuffer);
}

async function excelToPDFPost(request, reply) {
    try {
        const parts = await request.parts();

        let excelFiles = [];           // [ { buffer, filename, contentType? } ]
        let mergeIntoSingle = false;

        for await (const part of parts) {
            if (part.file) {
                if (/^files\[\d+\]$/.test(part.fieldname)) {
                    const buffer = await part.toBuffer();
                    excelFiles.push({
                        buffer,
                        filename: part.filename || `spreadsheet_${excelFiles.length + 1}.xlsx`,
                        contentType: part.mimetype || 'application/octet-stream'
                    });
                }
            } else {
                // Form fields
                const value = part.value;
                if (part.fieldname === 'mergeIntoSingle') {
                    mergeIntoSingle =
                        value === 'true' || value === 'True' ||
                        (value && JSON.parse(value) === true);
                }
            }
        }

        if (excelFiles.length === 0) {
            return reply.status(400).send({ error: 'No Excel files received' });
        }

        const outputPDFs = [];

        if (mergeIntoSingle) {
            // Merge all → one PDF
            const mergedXlsx = await mergeExcelBuffers(excelFiles);
            const pdfBuffer = await convertToPdfBuffer(mergedXlsx, '.xlsx');

            outputPDFs.push({
                name: 'merged-spreadsheets.pdf',
                buffer: pdfBuffer
            });
        } else {
            // Convert each separately
            for (const file of excelFiles) {
                const pdfBuffer = await convertToPdfBuffer(file.buffer, path.extname(file.filename) || '.xlsx');

                let safeName = file.filename
                    .replace(/[^a-zA-Z0-9._-]/g, '_')
                    .replace(/\.[^.]+$/, ''); // remove extension

                safeName += '.pdf';

                outputPDFs.push({
                    name: safeName,
                    buffer: pdfBuffer
                });
            }
        }

        const token = crypto.randomBytes(24).toString('hex');

        if (!mergeIntoSingle && outputPDFs.length > 1) {
            // ZIP multiple PDFs
            const zipBuffer = await new Promise((resolve, reject) => {
                const zip = archiver('zip', { zlib: { level: 6 } });
                const chunks = [];

                zip.on('data', chunk => chunks.push(chunk));
                zip.on('end', () => resolve(Buffer.concat(chunks)));
                zip.on('error', reject);

                outputPDFs.forEach(file => {
                    zip.append(file.buffer, { name: file.name });
                });

                zip.finalize();
            });

            pdfStorage.set(token, zipBuffer);
            return reply.redirect(`/excel-to-pdf/download/${token}?type=zip&filename=converted-excel-files.zip`);
        }

        // Single file case (merged or only one input)
        pdfStorage.set(token, outputPDFs[0].buffer);
        return reply.redirect(`/excel-to-pdf/download/${token}`);

    } catch (err) {
        if (err.code === 'FST_REQ_FILE_TOO_LARGE') {
            return reply.status(413).send({ error: 'File too large', maxSize: '30MB' });
        }

        console.error(err);
        return reply.status(500).send({
            error: 'Excel to PDF conversion failed',
            message: err.message
        });
    }
}

async function mergePdfBuffers(buffers) {
    if (buffers.length === 0) throw new Error('No PDFs to merge');
    if (buffers.length === 1) return buffers[0];

    const mergedPdf = await PDFDocument.create();

    for (const pdfBuffer of buffers) {
        const srcDoc = await PDFDocument.load(pdfBuffer);
        const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        copiedPages.forEach(page => mergedPdf.addPage(page));
    }

    const mergedBuffer = await mergedPdf.save();
    return Buffer.from(mergedBuffer);
}

async function powerpointTOPDFPost(request, reply) {
    try {
        const parts = await request.parts();

        let pptFiles = [];           // [ { buffer, filename, contentType? } ]
        let mergeIntoSingle = false;

        for await (const part of parts) {
            if (part.file) {
                if (/^files\[\d+\]$/.test(part.fieldname)) {
                    const buffer = await part.toBuffer();
                    pptFiles.push({
                        buffer,
                        filename: part.filename || `presentation_${pptFiles.length + 1}.pptx`,
                        contentType: part.mimetype || 'application/octet-stream'
                    });
                }
            } else {
                // Form fields
                const value = part.value;
                if (part.fieldname === 'mergeIntoSingle') {
                    mergeIntoSingle =
                        value === 'true' || value === 'True' ||
                        (value && JSON.parse(value) === true);
                }
            }
        }

        console.log(`merge into single ${mergeIntoSingle}`);

        if (pptFiles.length === 0) {
            return reply.status(400).send({ error: 'No PowerPoint files received' });
        }

        const outputPDFs = [];

        if (mergeIntoSingle) {
            // Strategy: convert each PPTX → PDF, then merge the PDFs
            const pdfBuffers = [];

            for (const file of pptFiles) {
                const pdfBuffer = await convertToPdfBuffer(file.buffer, '.pptx');
                pdfBuffers.push(pdfBuffer);
            }

            const mergedPdfBuffer = await mergePdfBuffers(pdfBuffers);

            outputPDFs.push({
                name: 'merged-presentations.pdf',
                buffer: mergedPdfBuffer
            });
        } else {
            // Convert each separately
            for (const file of pptFiles) {
                const pdfBuffer = await convertToPdfBuffer(file.buffer, '.pptx');

                let safeName = file.filename
                    .replace(/[^a-zA-Z0-9._-]/g, '_')
                    .replace(/\.[^.]+$/, ''); // remove extension

                safeName += '.pdf';

                outputPDFs.push({
                    name: safeName,
                    buffer: pdfBuffer
                });
            }
        }

        const token = crypto.randomBytes(24).toString('hex');

        if (!mergeIntoSingle && outputPDFs.length > 1) {
            // ZIP multiple PDFs
            const zipBuffer = await new Promise((resolve, reject) => {
                const zip = archiver('zip', { zlib: { level: 6 } });
                const chunks = [];

                zip.on('data', chunk => chunks.push(chunk));
                zip.on('end', () => resolve(Buffer.concat(chunks)));
                zip.on('error', reject);

                outputPDFs.forEach(file => {
                    zip.append(file.buffer, { name: file.name });
                });

                zip.finalize();
            });

            pdfStorage.set(token, zipBuffer);
            return reply.redirect(`/powerpoint-to-pdf/download/${token}?type=zip&filename=converted-powerpoint-files.zip`);
        }

        // Single file case (merged or only one input)
        pdfStorage.set(token, outputPDFs[0].buffer);
        return reply.redirect(`/powerpoint-to-pdf/download/${token}`);

    } catch (err) {
        if (err.code === 'FST_REQ_FILE_TOO_LARGE') {
            return reply.status(413).send({ error: 'File too large', maxSize: '30MB' });
        }

        console.error('PowerPoint → PDF error:', err);
        return reply.status(500).send({
            error: 'PowerPoint to PDF conversion failed',
            message: err.message
        });
    }
}

async function odtTOPDFPost(request, reply) {
    try {
        const parts = await request.parts();

        let odtFiles = [];
        let mergeIntoSingle = false;

        for await (const part of parts) {
            if (part.file && /^files\[\d+\]$/.test(part.fieldname)) {
                const buffer = await part.toBuffer();

                odtFiles.push({
                    buffer,
                    filename: part.filename || `document_${odtFiles.length + 1}.odt`
                });

            } else if (part.fieldname === 'mergeIntoSingle') {
                mergeIntoSingle =
                    part.value === 'true' ||
                    part.value === 'True' ||
                    (part.value && JSON.parse(part.value) === true);
            }
        }

        if (odtFiles.length === 0) {
            return reply.status(400).send({ error: 'No ODT files received' });
        }

        const outputPDFs = [];

        if (mergeIntoSingle) {
            const pdfBuffers = [];

            for (const file of odtFiles) {
                const pdfBuffer = await convertToPdfBuffer(file.buffer, '.odt');
                pdfBuffers.push(pdfBuffer);
            }

            const mergedPdf = await mergePdfBuffers(pdfBuffers);

            outputPDFs.push({
                name: 'merged-documents.pdf',
                buffer: mergedPdf
            });

        } else {
            for (const file of odtFiles) {
                const pdfBuffer = await convertToPdfBuffer(file.buffer, '.odt');

                const safeName = file.filename
                    .replace(/[^a-zA-Z0-9._-]/g, '_')
                    .replace(/\.[^.]+$/, '') + '.pdf';

                outputPDFs.push({
                    name: safeName,
                    buffer: pdfBuffer
                });
            }
        }

        const token = crypto.randomBytes(24).toString('hex');

        if (!mergeIntoSingle && outputPDFs.length > 1) {
            // ZIP multiple PDFs
            const zipBuffer = await new Promise((resolve, reject) => {
                const zip = archiver('zip', { zlib: { level: 6 } });
                const chunks = [];

                zip.on('data', c => chunks.push(c));
                zip.on('end', () => resolve(Buffer.concat(chunks)));
                zip.on('error', reject);

                outputPDFs.forEach(f => zip.append(f.buffer, { name: f.name }));
                zip.finalize();
            });

            pdfStorage.set(token, zipBuffer);
            return reply.redirect(
                `/odt-to-pdf/download/${token}?type=zip&filename=converted-odt-files.zip`
            );
        }

        pdfStorage.set(token, outputPDFs[0].buffer);
        return reply.redirect(`/odt-to-pdf/download/${token}`);

    } catch (err) {
        if (err.code === 'FST_REQ_FILE_TOO_LARGE') {
            return reply.status(413).send({ error: 'File too large', maxSize: '30MB' });
        }

        console.error('ODT → PDF error:', err);
        return reply.status(500).send({
            error: 'ODT to PDF conversion failed',
            message: err.message
        });
    }
}


async function htmlToPDFPost(request, reply) {

    try {


        const { url, screen_size, page_size, orientation, margin } = request.body;

        if (!url || typeof url !== 'string' || !url.startsWith('http')) {
            return reply.code(400).send({ error: 'Valid http(s) url is required' });
        }

        if (!['desktop', 'tablet', 'mobile'].includes(screen_size)) {
            return reply.code(400).send({ error: 'screen_size must be desktop|tablet|mobile' });
        }

        if (!['fit', 'a4', 'usletter'].includes(page_size?.toLowerCase())) {
            return reply.code(400).send({ error: 'page_size must be fit|a4|usletter' });
        }

        const normalizedPageSize = page_size.toLowerCase() === 'usletter' ? 'LETTER' : page_size.toUpperCase();

        if (normalizedPageSize !== 'FIT') {
            if (!['portrait', 'landscape'].includes(orientation)) {
                return reply.code(400).send({ error: 'orientation must be portrait|landscape when page_size ≠ fit' });
            }
        }

        if (!['none', 'small', 'big'].includes(margin)) {
            return reply.code(400).send({ error: 'margin must be none|small|big' });
        }

        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
            // timeout: 45000, // optional
        });

        try {
            const page = await browser.newPage();

            // Set viewport / device emulation
            await page.setViewport(VIEWPORTS[screen_size]);

            // Wait for network idle → better for JS-heavy/SPA pages
            await page.goto(url, {
                waitUntil: 'networkidle2',   // or 'networkidle0' if you want stricter
                timeout: 60000,
            });

            // Optional: wait extra time for lazy-loaded content, animations, etc.
            // await page.waitForTimeout(1500);

            // ────────────────────────────────────────────────
            // 3. PDF generation settings
            // ────────────────────────────────────────────────
            const pdfOptions = {
                printBackground: true,
                margin: { top: marginSizes[margin], right: marginSizes[margin], bottom: marginSizes[margin], left: marginSizes[margin] },
            };

            if (normalizedPageSize === 'FIT') {
                // Content-fit mode — no fixed page size
                pdfOptions.format = undefined;
                pdfOptions.width = undefined;
                pdfOptions.height = undefined;
                pdfOptions.scale = 1;           // you can experiment with 0.9–1.1
            } else {
                // Fixed page size + orientation
                pdfOptions.format = normalizedPageSize;   // 'A4' or 'LETTER'
                pdfOptions.landscape = orientation === 'landscape';
            }

            const pdfBuffer = await page.pdf(pdfOptions);

            await page.close();

            // ────────────────────────────────────────────────
            // 4. Store PDF temporarily & redirect
            // ────────────────────────────────────────────────
            const token = crypto.randomBytes(32).toString('hex');

            pdfStorage.set(token, pdfBuffer);           // ← your storage (Map, Redis, …)

            // Optional: set expiration (if using Map + some cleanup logic)
            // setTimeout(() => pdfStorage.delete(token), 1000 * 60 * 30); // 30 min

            return reply.redirect(`/html-to-pdf/download/${token}`);

        } finally {
            await browser.close().catch(() => { });     // always try to close
        }


    } catch (err) {
        return reply.status(500).send({
            error: 'Fail to generate HTML to PDF',
            message: err.message
        });
    }

}

async function svgToPng(svgString, targetWidth, targetHeight) {
    let svg = svgString.trim();

    // 1. Add overflow visible (very important for strokes & shadows)
    if (!svg.includes('overflow="visible"')) {
        svg = svg.replace(/<svg([^>]*)/, '<svg$1 overflow="visible"');
    }

    // 2. Convert to Buffer
    const svgBuffer = Buffer.from(svg);

    // 3. Use Sharp with proper density + padding (NO unreliable regex)
    return sharp(svgBuffer, {
        density: 300,                    // High DPI for sharp output
    })
        .resize({
            width: Math.round(targetWidth * 3),
            height: Math.round(targetHeight * 3),
            fit: 'contain',              // Keep aspect ratio
            background: { r: 0, g: 0, b: 0, alpha: 0 },
            withoutEnlargement: false,
        })
        .png({
            compressionLevel: 6,
            adaptiveFiltering: true,
            force: true
        })
        .toBuffer();
}

// ───────────────────────────────
// MAIN CONTROLLER
// ───────────────────────────────
async function editPDFPagesPost(request, reply) {
    try {
        const parts = await request.parts();

        let pdfBuffer = null;
        let annotations = [];

        // ───────────────────────────────
        // Parse multipart form
        // ───────────────────────────────
        for await (const part of parts) {
            if (part.file && part.fieldname === "pdf") {
                pdfBuffer = await part.toBuffer();
            }

            if (part.fieldname === "annotations") {
                annotations = JSON.parse(part.value || "[]");
            }
        }

        if (!pdfBuffer) {
            return reply.status(400).send({ error: "PDF file is required" });
        }

        // Load original PDF
        const srcDoc = await PDFDocument.load(pdfBuffer);
        const totalPages = srcDoc.getPageCount();

        const pdfDoc = await PDFDocument.create();
        const embeddedPages = await pdfDoc.embedPages(srcDoc.getPages());

        // ───────────────────────────────
        // Process pages
        // ───────────────────────────────
        for (let i = 0; i < totalPages; i++) {
            const srcPage = srcDoc.getPage(i);
            const embPage = embeddedPages[i];

            const pageWidth = srcPage.getWidth();
            const pageHeight = srcPage.getHeight();

            const page = pdfDoc.addPage([pageWidth, pageHeight]);

            // Draw original page
            page.drawPage(embPage, {
                x: 0,
                y: 0,
                width: pageWidth,
                height: pageHeight,
            });

            // Find shapes for this page
            const pageEntry = annotations.find(
                entry => Number(entry.page) === i + 1
            );

            if (!pageEntry?.shapesArray?.length) continue;

            // ───────────────────────────────
            // Draw shapes
            // ───────────────────────────────
            for (const shape of pageEntry.shapesArray) {
                if (!shape) continue;

                const x = Number(shape.left) || 0;
                const y = pageHeight - Number(shape.top) - Number(shape.height);

                // ==================== IMAGE ====================
                if (shape.type === 'image' && shape.dataUrl) {
                    const base64Data = shape.dataUrl.split(',')[1];
                    const imgBuffer = Buffer.from(base64Data, 'base64');

                    const embeddedImg = await pdfDoc.embedPng(imgBuffer);   // or embedJpg if needed

                    page.drawImage(embeddedImg, {
                        x,
                        y,
                        width: Number(shape.width),
                        height: Number(shape.height),
                        opacity: Number(shape.opacity) ?? 1,
                        rotate: degrees(Number(shape.angle) || 0)
                    });
                    continue;
                }

                // ==================== SHAPE (SVG) ====================
                if (shape.type === 'shape' && shape.svg) {
                    const pngBuffer = await svgToPng(shape.svg, shape.width, shape.height);

                    const embeddedImg = await pdfDoc.embedPng(pngBuffer);

                    page.drawImage(embeddedImg, {
                        x,
                        y,
                        width: Number(shape.width),
                        height: Number(shape.height),
                        opacity: Number(shape.opacity) ?? 1,
                        // rotate: degrees(Number(shape.angle) || 0)   // add later
                    });
                }
            }
        }

        // ───────────────────────────────
        // Save PDF
        // ───────────────────────────────
        const pdfBytes = await pdfDoc.save();

        const token = crypto.randomBytes(32).toString("hex");
        pdfStorage.set(token, Buffer.from(pdfBytes));

        return reply.redirect(`/edit-pdf-pages/download/${token}`);

    } catch (err) {
        request.log.error(err);
        console.error("editPDFPagesPost error:", err);

        return reply.status(500).send({
            error: "Failed to process PDF",
            message: err.message
        });
    }

}


module.exports = {
    imageToPDFPOST,
    pdfStorage,
    addPagestoPDFPOST,
    mergePDFPost,
    addPageNumberToPDFPost,
    rotatePDFAllPagesPost,
    removePagesFromPDFPost,
    splitPDFPost,
    wordToPDFPost,
    excelToPDFPost,
    powerpointTOPDFPost,
    odtTOPDFPost,
    htmlToPDFPost,
    editPDFPagesPost
};