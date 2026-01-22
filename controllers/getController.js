// Controller functions for GET routes

const { pdfStorage } = require("./postController");

async function homePage(request, reply) {
  return reply.view("pages/index.ejs");
}

async function imageToPDF(request, reply) {
  return reply.view("pages/imageToPDF.ejs");
}

async function imageToPDFDownload(request, reply) {

  try {
    const { token } = request.params;
    const endPoint = "imageToPDF";

    // Validate token
    if (!token || !pdfStorage.has(token)) {
      return reply.redirect('/imagetopdf');
    }

    // Render the downloadPDF.ejs view with the token
    return reply.view('pages/downloadPDF.ejs', { token, endPoint, title: "Image to PDF" });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error.message });
  }

}

async function imageToPDFDownloadFile(request, reply) {

  try {
    const { token } = request.params;

    // Validate token
    if (!token || !pdfStorage.has(token)) {
      return reply.status(400).send({ error: 'Invalid or expired token' });
    }

    // Retrieve PDF buffer
    const pdfBuffer = pdfStorage.get(token);

    // Delete the PDF from storage after retrieval
    pdfStorage.delete(token);

    // Send PDF response
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="output.pdf"`);
    reply.send(pdfBuffer);
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error.message });
  }

}

async function addPagesToPDF(request, reply) {
  return reply.view("pages/addPagesPDF.ejs");
}

async function addPagesToPDFDownload(request, reply) {

  try {
    const { token } = request.params;

    console.log(token);
    const endPoint = "add-pages-pdf";

    // Validate token
    if (!token || !pdfStorage.has(token)) {
      return reply.redirect('/add-pages-pdf');
    }

    // Render the downloadPDF.ejs view with the token
    return reply.view('pages/downloadPDF.ejs', { token, endPoint, title: "Add Pages to PDF" });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error.message });
  }

}

async function addPagesToPDFDownloadFile(request, reply) {

  try {
    const { token } = request.params;

    console.log(token);

    // Validate token
    if (!token || !pdfStorage.has(token)) {
      return reply.status(400).send({ error: 'Invalid or expired token' });
    }

    // Retrieve PDF buffer
    const pdfBuffer = pdfStorage.get(token);

    // Delete the PDF from storage after retrieval
    pdfStorage.delete(token);

    // Send PDF response
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="output.pdf"`);
    reply.send(pdfBuffer);
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error.message });
  }

}

async function mergePDF(request, reply) {
  return reply.view("pages/mergePDF.ejs");
}

async function mergePDFDownload(request, reply) {

  try {
    const { token } = request.params;

    console.log(token);
    const endPoint = "merge-pdf";

    // Validate token
    if (!token || !pdfStorage.has(token)) {
      return reply.redirect('/merge-pdf');
    }

    // Render the downloadPDF.ejs view with the token
    return reply.view('pages/downloadPDF.ejs', { token, endPoint, title: "Merge PDF" });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error.message });
  }

}

async function mergePDFDownloadFile(request, reply) {

  try {
    const { token } = request.params;

    console.log(token);

    // Validate token
    if (!token || !pdfStorage.has(token)) {
      return reply.status(400).send({ error: 'Invalid or expired token' });
    }

    // Retrieve PDF buffer
    const pdfBuffer = pdfStorage.get(token);

    // Delete the PDF from storage after retrieval
    pdfStorage.delete(token);

    // Send PDF response
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="output.pdf"`);
    reply.send(pdfBuffer);
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error.message });
  }

}

async function addPageNumberToPDF(request, reply) {
  return reply.view("pages/addPageNumberToPDF.ejs");
}

async function addPageNumberToPDFDownload(request, reply) {

  try {
    const { token } = request.params;

    console.log(token);
    const endPoint = "add-page-numbers";

    // Validate token
    if (!token || !pdfStorage.has(token)) {
      return reply.redirect('/add-page-numbers');
    }

    // Render the downloadPDF.ejs view with the token
    return reply.view('pages/downloadPDF.ejs', { token, endPoint, title: "Add Page Number to PDF" });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error.message });
  }

}

async function addPageNumberToPDFDownloadFile(request, reply) {

  try {
    const { token } = request.params;

    console.log(token);

    // Validate token
    if (!token || !pdfStorage.has(token)) {
      return reply.status(400).send({ error: 'Invalid or expired token' });
    }

    // Retrieve PDF buffer
    const pdfBuffer = pdfStorage.get(token);

    // Delete the PDF from storage after retrieval
    pdfStorage.delete(token);

    // Send PDF response
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="output.pdf"`);
    reply.send(pdfBuffer);
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error.message });
  }

}

async function rotateAllPages(request, reply) {
  return reply.view("pages/rotateAllPages.ejs");
}

async function rotateAllPagesDownload(request, reply) {

  try {
    const { token } = request.params;

    console.log(token);
    const endPoint = "rotate-pages";

    // Validate token
    if (!token || !pdfStorage.has(token)) {
      return reply.redirect('/rotate-pages');
    }

    // Render the downloadPDF.ejs view with the token
    return reply.view('pages/downloadPDF.ejs', { token, endPoint, title: "Rotate PDF all pages" });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error.message });
  }

}

async function rotateAllPagesDownloadFile(request, reply) {

  try {
    const { token } = request.params;

    console.log(token);

    // Validate token
    if (!token || !pdfStorage.has(token)) {
      return reply.status(400).send({ error: 'Invalid or expired token' });
    }

    // Retrieve PDF buffer
    const pdfBuffer = pdfStorage.get(token);

    // Delete the PDF from storage after retrieval
    pdfStorage.delete(token);

    // Send PDF response
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="output.pdf"`);
    reply.send(pdfBuffer);
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error.message });
  }

}

async function removePDFPages(request, reply) {
  return reply.view("pages/removePagesFromPDF.ejs");
}

async function removePDFPagesDownload(request, reply) {

  try {
    const { token } = request.params;

    console.log(token);
    const endPoint = "remove-pages";

    // Validate token
    if (!token || !pdfStorage.has(token)) {
      return reply.redirect('/remove-pages');
    }

    // Render the downloadPDF.ejs view with the token
    return reply.view('pages/downloadPDF.ejs', { token, endPoint, title: "Remove PDF Pages Online" });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error.message });
  }

}

async function removePDFPagesDownloadFile(request, reply) {

  try {
    const { token } = request.params;

    console.log(token);

    // Validate token
    if (!token || !pdfStorage.has(token)) {
      return reply.status(400).send({ error: 'Invalid or expired token' });
    }

    // Retrieve PDF buffer
    const pdfBuffer = pdfStorage.get(token);

    // Delete the PDF from storage after retrieval
    pdfStorage.delete(token);

    // Send PDF response
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="output.pdf"`);
    reply.send(pdfBuffer);
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error.message });
  }

}

async function splitPDF(request, reply) {
  return reply.view("pages/splitPDF.ejs");
}

async function splitPDFDownload(request, reply) {

  try {
    const { token } = request.params;
    const endPoint = "split-pdf";

    // Validate token exists
    if (!token || !pdfStorage.has(token)) {
      // Redirect back to the tool page if token is invalid/expired
      return reply.redirect('/split-pdf');
    }

    // console.log(request.query.filename)

    // Optional: you can check query param to know if it's a zip
    const isZip = request.query.type === 'zip';

    // console.log("Iszip "+isZip);

    // Render the same download view you use for remove-pages
    return reply.view('pages/downloadPDF.ejs', {
      token,
      endPoint,
      title: "Split PDF",
      isZip
    });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({
      error: 'Internal server error',
      message: error.message
    });
  }

}

async function splitPDFDownloadFile(request, reply) {

  try {
    const { token } = request.params;

    // Validate token
    if (!token || !pdfStorage.has(token)) {
      return reply.status(400).send({
        error: 'Invalid or expired token'
      });
    }

    // Get the stored buffer (can be PDF or ZIP)
    const fileBuffer = pdfStorage.get(token);

    // Clean up storage immediately (good practice)
    pdfStorage.delete(token);

    // Determine file type from previous processing
    // (we used ?type=zip in redirect when keepDifferentPDF=true)
    const isZip = request.query.type === 'zip';

    if (isZip) {
      reply
        .header('Content-Type', 'application/zip')
        .header('Content-Disposition', 'attachment; filename="split-pdfs.zip"')
        .header('Content-Length', fileBuffer.length)
        .send(fileBuffer);
    } else {
      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', 'attachment; filename="split-result.pdf"')
        .header('Content-Length', fileBuffer.length)
        .send(fileBuffer);
    }
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({
      error: 'Internal server error',
      message: error.message
    });
  }

}

async function editPDFPages(request, reply) {
    return reply.view("pages/editPDFPages.ejs");
}

async function wordToPDF(request, reply) {
  return reply.view("pages/wordToPDF.ejs");
}

async function pageNotFound(request, reply) {
  return reply.status(404).view("pages/404.ejs");
}

module.exports = {
  homePage,
  imageToPDF,
  imageToPDFDownload,
  imageToPDFDownloadFile,
  pageNotFound,
  addPagesToPDF,
  addPagesToPDFDownload,
  addPagesToPDFDownloadFile,
  mergePDF,
  mergePDFDownload,
  mergePDFDownloadFile,
  addPageNumberToPDF,
  addPageNumberToPDFDownload,
  addPageNumberToPDFDownloadFile,
  rotateAllPages,
  rotateAllPagesDownload,
  rotateAllPagesDownloadFile,
  removePDFPages,
  removePDFPagesDownload,
  removePDFPagesDownloadFile,
  splitPDF,
  splitPDFDownload,
  splitPDFDownloadFile,
  editPDFPages,
  wordToPDF
};