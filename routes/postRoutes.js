const { imageToPDFPOST, addPagestoPDFPOST, mergePDFPost, addPageNumberToPDF, addPageNumberToPDFPost, rotatePDFAllPagesPost, removePagesFromPDFPost, splitPDFPost, wordToPDFPost } = require("../controllers/postController");

async function postRoutes(fastify, options) {

  fastify.post("/imageToPDFPost", imageToPDFPOST);

  fastify.post("/addPagesToPDF", addPagestoPDFPOST);

  fastify.post("/mergePDFPost", mergePDFPost);

  fastify.post("/addPageNumberToPDFPost", addPageNumberToPDFPost);

  fastify.post("/rotatePDFAllPagesPost", rotatePDFAllPagesPost);

  fastify.post("/removePagesFromPDF", removePagesFromPDFPost);

  fastify.post("/splitPDFPost", splitPDFPost);

  fastify.post("/wordTOPDFPost", wordToPDFPost)

}

module.exports = postRoutes;
