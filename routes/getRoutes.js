const { homePage, aboutPage, imageToPDF, imageToPDFDownload, imageToPDFDownloadFile, addPagesToPDF, addPagesToPDFDownload, addPagesToPDFDownloadFile, mergePDF, mergePDFDownload, mergePDFDownloadFile, addPageNumberToPDF, addPageNumberToPDFDownload, addPageNumberToPDFDownloadFile, rotateAllPages, rotateAllPagesDownload, rotateAllPagesDownloadFile, removePDFPages, removePDFPagesDownload, removePDFPagesDownloadFile, splitPDF, splitPDFDownload, splitPDFDownloadFile, editPDFPages, wordToPDF, wordToPDFDownload, wordToPDFDownloadFile } = require("../controllers/getController");

async function getRoutes(fastify, options) {

  fastify.get("/", homePage);        // Calls homePage controller

  // Image to PDF routes

  fastify.get("/imagetopdf", imageToPDF);
  fastify.get("/imagetopdf/download/:token", imageToPDFDownload);
  fastify.get("/imageToPDF/download/file/:token", imageToPDFDownloadFile);

  // Image to PDF routes

  fastify.get("/add-pages-pdf", addPagesToPDF);
  fastify.get("/add-pages-pdf/download/:token", addPagesToPDFDownload);
  fastify.get("/add-pages-pdf/download/file/:token", addPagesToPDFDownloadFile);

  // Merge PDF
  fastify.get("/merge-pdf", mergePDF);
  fastify.get("/merge-pdf/download/:token", mergePDFDownload);
  fastify.get("/merge-pdf/download/file/:token", mergePDFDownloadFile);

  // Add Page Number to PDF

  fastify.get("/add-page-numbers", addPageNumberToPDF);
  fastify.get("/add-page-numbers/download/:token", addPageNumberToPDFDownload);
  fastify.get("/add-page-numbers/download/file/:token", addPageNumberToPDFDownloadFile);

  // Rotate all pages

  fastify.get("/rotate-pages", rotateAllPages);
  fastify.get("/rotate-pages/download/:token", rotateAllPagesDownload);
  fastify.get("/rotate-pages/download/file/:token", rotateAllPagesDownloadFile);

  // remove pages from pdf by selecting them
  
  fastify.get("/remove-pages", removePDFPages);
  fastify.get("/remove-pages/download/:token", removePDFPagesDownload);
  fastify.get("/remove-pages/download/file/:token", removePDFPagesDownloadFile);

  // split pdf online

  fastify.get("/split-pdf", splitPDF);
  fastify.get("/split-pdf/download/:token", splitPDFDownload);
  fastify.get("/split-pdf/download/file/:token", splitPDFDownloadFile);

  fastify.get("/edit-pdf-pages", editPDFPages)

  fastify.get("/word-to-pdf", wordToPDF)
  fastify.get("/word-to-pdf/download/:token", wordToPDFDownload);
  fastify.get("/word-to-pdf/download/file/:token", wordToPDFDownloadFile);

}

module.exports = getRoutes;
