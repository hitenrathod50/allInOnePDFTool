const { PDFDocument, StandardFonts, rgb, degrees } = require('pdf-lib');
const sharp = require('sharp');
const crypto = require('crypto');
const archiver = require('archiver')
// const { type } = require('os');
const pdfStorage = new Map();

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


module.exports = {
    imageToPDFPOST,
    pdfStorage,
    addPagestoPDFPOST,
    mergePDFPost,
    addPageNumberToPDFPost,
    rotatePDFAllPagesPost,
    removePagesFromPDFPost,
    splitPDFPost
};