const { sendOtp, verifyOtpAndRegister, logOutUser, loginUser, changeUserPassword, deleteUserAccount } = require("../controllers/authController");
const { imageToPDFPOST, addPagestoPDFPOST, mergePDFPost, addPageNumberToPDF, addPageNumberToPDFPost, rotatePDFAllPagesPost, removePagesFromPDFPost, splitPDFPost, wordToPDFPost, excelToPDFPost, powerpointTOPDFPost, odtTOPDFPost, htmlToPDFPost, editPDFPagesPost } = require("../controllers/postController");
const { contactFormSubmit } = require("../services/emailService");

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

  fastify.post("/odtTOPDFPost", odtTOPDFPost)

  fastify.post("/htmlToPDFPost", htmlToPDFPost)

  fastify.post("/editPDFPagesPost", editPDFPagesPost)

  fastify.post("/send-otp", sendOtp);

  fastify.post("/verify-otp", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
        keyGenerator: (req) => req.ip,
        errorResponseBuilder: function (req, context) {
          return {
            statusCode: 429,
            error: 'Too Many Attempts',
            message: `Please try after sometime`
          }
        }
      }
    }
  }, verifyOtpAndRegister);

  fastify.post("/logout", logOutUser)

  fastify.post("/changeUserPassword", {
    config: {
      rateLimit: {
        max: 2,
        timeWindow: '1 minute',
        keyGenerator: (req) => req.ip,
        errorResponseBuilder: function (req, context) {
          return {
            statusCode: 429,
            error: 'Too Many Attempts',
            message: `Please try after sometime`
          }
        }
      }
    }
  }, changeUserPassword)


  fastify.post("/loginUser", {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
        keyGenerator: (req) => req.ip,
        errorResponseBuilder: function (req, context) {
          return {
            statusCode: 429,
            error: 'Too Many Attempts',
            message: `Please try after sometime`
          }
        }
      }
    }
  }, loginUser)

  fastify.post("/contactFormPost", contactFormSubmit)

  fastify.post("/delete-account", deleteUserAccount);


}

module.exports = postRoutes;
