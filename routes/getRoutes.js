const { homePage, aboutPage, imageToPDF, imageToPDFDownload, imageToPDFDownloadFile, addPagesToPDF, addPagesToPDFDownload, addPagesToPDFDownloadFile, mergePDF, mergePDFDownload, mergePDFDownloadFile, addPageNumberToPDF, addPageNumberToPDFDownload, addPageNumberToPDFDownloadFile, rotateAllPages, rotateAllPagesDownload, rotateAllPagesDownloadFile, removePDFPages, removePDFPagesDownload, removePDFPagesDownloadFile, splitPDF, splitPDFDownload, splitPDFDownloadFile, editPDFPages, wordToPDF, wordToPDFDownload, wordToPDFDownloadFile, excelToPDF, excelToPDFDownload, excelToPDFDownloadFile, powerPointToPDF, powerPointToPDFDownload, powerPointToPDFDownloadFile, odtTOPDF, odtTOPDFDownload, odtTOPDFDownloadFile, htmlToPDF, htmlToPDFDownload, htmlToPDFDownloadFile, editPDFPagesDownload, editPDFPagesDownloadFile, signUpRoute, loginRoute } = require("../controllers/getController");

const axios = require('axios');
const User = require("../models/User");

const jwt = require("jsonwebtoken");

async function getRoutes(fastify, options) {

  fastify.get("/", homePage);        // Calls homePage controller

  // Authentication routes are herez

  fastify.get('/auth/google/callback', async (request, reply) => {

    console.log("here it is");

    try {
      const token = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);

      console.log("Token is : ");
      console.log(token);

      const userInfo = await axios.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${token.token.access_token}`
          }
        }
      );

      console.log("User Data : ");

      console.log(userInfo.data);

      let user = await User.findOne({ email: userInfo.data.email });

      console.log("Again user is ");
      console.log(user);

      let JWTtoken = "";

      if (user) {

        if (!user.googleId) {
          user.googleId = userInfo.data.id;
          user.provider = "Google";
          user.name = userInfo.data.name;
          await user.save();
        }

        JWTtoken = jwt.sign({
          id: user._id,
          provider: "Google",
          email: user.email
        }, process.env.JWT_SECRET);

        reply.setCookie("token", JWTtoken, {
          httpOnly: true,
          sameSite: "strict",
          path: "/"
        });
      } else {

        const user = await User.create({
          email: userInfo.data.email,
          provider: "Google",
          googleId: userInfo.data.id,
          name: userInfo.data.name
        });

        JWTtoken = jwt.sign({
          id: user._id,
          provider: user.provider,
          email: user.email
        }, process.env.JWT_SECRET);

        reply.setCookie("token", JWTtoken, {
          httpOnly: true,
          sameSite: "strict",
          path: "/"
        });


        console.log(user)

      }

      return reply.view("pages/redirecting.ejs");



    } catch (err) {
      console.error(err);
      return reply.view("pages/redirecting.ejs");
    }
  });

  fastify.get("/login", loginRoute)

  fastify.get("/register", signUpRoute);

  fastify.get("/about", async (request, reply) => {

    return reply.view("pages/about-us.ejs");

  });

  fastify.get("/contact", async (request, reply) => {

    return reply.view("pages/contact-us.ejs");

  });

  fastify.get("/privacy", async (request, reply) => {

    return reply.view("pages/privacy-policy.ejs");

  });

  fastify.get("/terms-conditions", async (request, reply) => {

    return reply.view("pages/terms-conditions.ejs");

  });



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

  fastify.get("/edit-pdf-pages", editPDFPages);
  fastify.get("/edit-pdf-pages/download/:token", editPDFPagesDownload);
  fastify.get("/edit-pdf-pages/download/file/:token", editPDFPagesDownloadFile);

  fastify.get("/word-to-pdf", wordToPDF)
  fastify.get("/word-to-pdf/download/:token", wordToPDFDownload);
  fastify.get("/word-to-pdf/download/file/:token", wordToPDFDownloadFile);

  fastify.get("/excel-to-pdf", excelToPDF)
  fastify.get("/excel-to-pdf/download/:token", excelToPDFDownload);
  fastify.get("/excel-to-pdf/download/file/:token", excelToPDFDownloadFile);

  fastify.get("/powerpoint-to-pdf", powerPointToPDF)
  fastify.get("/powerpoint-to-pdf/download/:token", powerPointToPDFDownload);
  fastify.get("/powerpoint-to-pdf/download/file/:token", powerPointToPDFDownloadFile);

  fastify.get("/odt-to-pdf", odtTOPDF)
  fastify.get("/odt-to-pdf/download/:token", odtTOPDFDownload);
  fastify.get("/odt-to-pdf/download/file/:token", odtTOPDFDownloadFile);

  fastify.get("/html-to-pdf", htmlToPDF)
  fastify.get("/html-to-pdf/download/:token", htmlToPDFDownload);
  fastify.get("/html-to-pdf/download/file/:token", htmlToPDFDownloadFile);

}

module.exports = getRoutes;
