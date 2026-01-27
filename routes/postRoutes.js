const { imageToPDFPOST, addPagestoPDFPOST, mergePDFPost, addPageNumberToPDF, addPageNumberToPDFPost, rotatePDFAllPagesPost, removePagesFromPDFPost, splitPDFPost, wordToPDFPost, excelToPDFPost, powerpointTOPDFPost } = require("../controllers/postController");

async function postRoutes(fastify, options) {

  fastify.post("/imageToPDFPost", imageToPDFPOST);

  fastify.post("/addPagesToPDF", addPagestoPDFPOST);

  fastify.post("/mergePDFPost", mergePDFPost);

  fastify.post("/addPageNumberToPDFPost", addPageNumberToPDFPost);

  fastify.post("/rotatePDFAllPagesPost", rotatePDFAllPagesPost);

  fastify.post("/removePagesFromPDF", removePagesFromPDFPost);

  fastify.post("/splitPDFPost", splitPDFPost);

  fastify.post("/wordTOPDFPost", wordToPDFPost);

  fastify.post("/excelTOPDFPost", excelToPDFPost);

  fastify.post("/powerpointTOPDFPost", powerpointTOPDFPost);

}

module.exports = postRoutes;
