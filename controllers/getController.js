// Controller functions for GET routes

const { pdfStorage } = require("./postController");

const main_url = "https://www.pdfversatile.com";

async function homePage(request, reply) {

  return reply.view("pages/index.ejs");
}

async function loginRoute(request, reply) {

  if (request.user) {
    return reply.redirect("/");
  }

  return reply.view("pages/login.ejs");
}

async function signUpRoute(request, reply) {

  if (request.user) {
    return reply.redirect("/");
  }

  return reply.view("pages/signup.ejs");
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
    return reply.view('pages/downloadPDF.ejs', {
      token, endPoint,

      title: "Image to PDF",


    });
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

async function editPDFPagesDownload(request, reply) {

  try {
    const { token } = request.params;

    console.log(token);
    const endPoint = "edit-pdf-pages";

    // Validate token
    if (!token || !pdfStorage.has(token)) {
      return reply.redirect('/edit-pdf-pages');
    }

    // Render the downloadPDF.ejs view with the token
    return reply.view('pages/downloadPDF.ejs', { token, endPoint, title: "Edit PDF Pages Online" });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error.message });
  }

}

async function editPDFPagesDownloadFile(request, reply) {

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

async function linearizePDF(request, reply) {
  return reply.view("pages/linearize-pdf.ejs");
}

async function linearizePDFDownload(request, reply) {

  try {
    const { token } = request.params;
    const endPoint = "pdf-linearization";

    // Validate token exists
    if (!token || !pdfStorage.has(token)) {
      // Redirect back to the tool page if token is invalid/expired
      return reply.redirect('/pdf-linearization');
    }

    // console.log(request.query.filename)

    // Optional: you can check query param to know if it's a zip
    const isZip = request.query.type === 'zip';

    // console.log("Iszip "+isZip);

    // Render the same download view you use for remove-pages
    return reply.view('pages/downloadPDF.ejs', {
      token,
      endPoint,
      title: "Linearized PDF",
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

async function linearizePDFDownloadFile(request, reply) {


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
        .header('Content-Disposition', 'attachment; filename="linearized-pdf.zip"')
        .header('Content-Length', fileBuffer.length)
        .send(fileBuffer);
    } else {
      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', 'attachment; filename="linearized-pdf.pdf"')
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

async function wordToPDF(request, reply) {
  return reply.view("pages/wordToPDF.ejs");
}

async function wordToPDFDownload(request, reply) {

  try {
    const { token } = request.params;
    const endPoint = "word-to-pdf";

    // Validate token exists
    if (!token || !pdfStorage.has(token)) {
      // Redirect back to the tool page if token is invalid/expired
      return reply.redirect('/word-to-pdf');
    }

    // console.log(request.query.filename)

    // Optional: you can check query param to know if it's a zip
    const isZip = request.query.type === 'zip';

    // console.log("Iszip "+isZip);

    // Render the same download view you use for remove-pages
    return reply.view('pages/downloadPDF.ejs', {
      token,
      endPoint,
      title: "Word to PDF",
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

async function wordToPDFDownloadFile(request, reply) {

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
        .header('Content-Disposition', 'attachment; filename="word-to-pdfs.zip"')
        .header('Content-Length', fileBuffer.length)
        .send(fileBuffer);
    } else {
      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', 'attachment; filename="word-to-pdfs.pdf"')
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

async function excelToPDF(request, reply) {
  return reply.view("pages/excelToPDF.ejs");
}

async function excelToPDFDownload(request, reply) {

  try {
    const { token } = request.params;
    const endPoint = "excel-to-pdf";

    // Validate token exists
    if (!token || !pdfStorage.has(token)) {
      // Redirect back to the tool page if token is invalid/expired
      return reply.redirect('/excel-to-pdf');
    }

    // console.log(request.query.filename)

    // Optional: you can check query param to know if it's a zip
    const isZip = request.query.type === 'zip';

    // console.log("Iszip "+isZip);

    // Render the same download view you use for remove-pages
    return reply.view('pages/downloadPDF.ejs', {
      token,
      endPoint,
      title: "Excel to PDF",
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

async function excelToPDFDownloadFile(request, reply) {

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
        .header('Content-Disposition', 'attachment; filename="excel-to-pdfs.zip"')
        .header('Content-Length', fileBuffer.length)
        .send(fileBuffer);
    } else {
      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', 'attachment; filename="excel-to-pdfs.pdf"')
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

async function powerPointToPDF(request, reply) {
  return reply.view("pages/powerPointToPDF.ejs");
}

async function powerPointToPDFDownload(request, reply) {

  try {
    const { token } = request.params;
    const endPoint = "powerpoint-to-pdf";

    // Validate token exists
    if (!token || !pdfStorage.has(token)) {
      // Redirect back to the tool page if token is invalid/expired
      return reply.redirect('/powerpoint-to-pdf');
    }

    // console.log(request.query.filename)

    // Optional: you can check query param to know if it's a zip
    const isZip = request.query.type === 'zip';

    // console.log("Iszip "+isZip);

    // Render the same download view you use for remove-pages
    return reply.view('pages/downloadPDF.ejs', {
      token,
      endPoint,
      title: "Powerpoint to PDF",
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

async function powerPointToPDFDownloadFile(request, reply) {

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
        .header('Content-Disposition', 'attachment; filename="ppt-to-pdfs.zip"')
        .header('Content-Length', fileBuffer.length)
        .send(fileBuffer);
    } else {
      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', 'attachment; filename="ppt-to-pdfs.pdf"')
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


async function odtTOPDF(request, reply) {
  return reply.view("pages/odtToPDF.ejs");
}

async function odtTOPDFDownload(request, reply) {

  try {
    const { token } = request.params;
    const endPoint = "odt-to-pdf";

    // Validate token exists
    if (!token || !pdfStorage.has(token)) {
      // Redirect back to the tool page if token is invalid/expired
      return reply.redirect('/odt-to-pdf');
    }

    // console.log(request.query.filename)

    // Optional: you can check query param to know if it's a zip
    const isZip = request.query.type === 'zip';

    // console.log("Iszip "+isZip);

    // Render the same download view you use for remove-pages
    return reply.view('pages/downloadPDF.ejs', {
      token,
      endPoint,
      title: "ODT to PDF",
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

async function odtTOPDFDownloadFile(request, reply) {

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
        .header('Content-Disposition', 'attachment; filename="odt-to-pdfs.zip"')
        .header('Content-Length', fileBuffer.length)
        .send(fileBuffer);
    } else {
      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', 'attachment; filename="odt-to-pdfs.pdf"')
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

async function htmlToPDF(request, reply) {
  return reply.view("pages/htmlToPDF.ejs");
}



async function htmlToPDFDownload(request, reply) {

  try {
    const { token } = request.params;
    const endPoint = "html-to-pdf";

    // Validate token
    if (!token || !pdfStorage.has(token)) {
      return reply.redirect('/html-to-pdf');
    }

    // Render the downloadPDF.ejs view with the token
    return reply.view('pages/downloadPDF.ejs', { token, endPoint, title: "HTML to PDF" });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error.message });
  }

}

async function htmlToPDFDownloadFile(request, reply) {

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


async function extractPDFPages(request, reply) {
  return reply.view("pages/extract-pages.ejs");
}

async function extractPDFPagesDownload(request, reply) {

  try {
    const { token } = request.params;

    if (!token || !pdfStorage.has(token)) {
      // You can redirect to a common page or home
      return reply.redirect('/extract-pdf-pages');
    }

    const stored = pdfStorage.get(token);   // Buffer or {path, filename, type}

    const isZip = request.query.type === 'zip' ||
      (typeof stored === 'object' && stored.type === 'zip');

    const filename = request.query.filename || 'download.zip';

    return reply.view('pages/downloadPDF.ejs', {
      token,
      endPoint: "extract-pdf-pages",           // or dynamically pass tool name if needed
      title: "Extract PDF Pages",
      isZip,
      filename                     // pass original filename
    });

  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }

}

async function extractPDFPagesDownloadFile(request, reply) {

  try {
    const { token } = request.params;

    if (!token || !pdfStorage.has(token)) {
      return reply.status(400).send({ error: 'Invalid or expired token' });
    }

    const storedData = pdfStorage.get(token);
    pdfStorage.delete(token);        // Clean up immediately

    let fileBuffer;
    let isZip = false;
    let downloadFilename = 'download.pdf';

    // Handle both simple Buffer and Object cases
    if (Buffer.isBuffer(storedData)) {
      fileBuffer = storedData;
      // Try to detect from query
      isZip = request.query.type === 'zip';
    }
    else if (typeof storedData === 'object' && storedData !== null) {
      // New improved structure (recommended)
      fileBuffer = storedData.buffer || storedData.path ? await fs.readFile(storedData.path) : null;
      isZip = storedData.type === 'zip' || request.query.type === 'zip';
      downloadFilename = storedData.filename || (isZip ? 'export.zip' : 'export.pdf');
    }

    if (!fileBuffer) {
      return reply.status(500).send({ error: 'File data corrupted' });
    }

    if (isZip) {
      reply
        .header('Content-Type', 'application/zip')
        .header('Content-Disposition', `attachment; filename="${downloadFilename}"`)
        .header('Content-Length', fileBuffer.length)
        .send(fileBuffer);
    } else {
      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${downloadFilename}"`)
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


async function compressPDF(request, reply) {
  return reply.view("pages/compress-pdf.ejs");
}

async function compressPDFDownload(request, reply) {

  try {
    const { token } = request.params;

    if (!token || !pdfStorage.has(token)) {
      // You can redirect to a common page or home
      return reply.redirect('/compress-pdf');
    }

    const stored = pdfStorage.get(token);   // Buffer or {path, filename, type}

    const isZip = request.query.type === 'zip' ||
      (typeof stored === 'object' && stored.type === 'zip');

    const filename = request.query.filename || 'download.zip';

    return reply.view('pages/downloadPDF.ejs', {
      token,
      endPoint: "compress-pdf",           // or dynamically pass tool name if needed
      title: "Compress PDF",
      isZip,
      filename                     // pass original filename
    });

  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }

}

async function compressPDFDownloadFile(request, reply) {

  try {
    const { token } = request.params;

    if (!token || !pdfStorage.has(token)) {
      return reply.status(400).send({ error: 'Invalid or expired token' });
    }

    const storedData = pdfStorage.get(token);
    pdfStorage.delete(token);        // Clean up immediately

    let fileBuffer;
    let isZip = false;
    let downloadFilename = 'download.pdf';

    // Handle both simple Buffer and Object cases
    if (Buffer.isBuffer(storedData)) {
      fileBuffer = storedData;
      // Try to detect from query
      isZip = request.query.type === 'zip';
    }
    else if (typeof storedData === 'object' && storedData !== null) {
      // New improved structure (recommended)
      fileBuffer = storedData.buffer || storedData.path ? await fs.readFile(storedData.path) : null;
      isZip = storedData.type === 'zip' || request.query.type === 'zip';
      downloadFilename = storedData.filename || (isZip ? 'export.zip' : 'export.pdf');
    }

    if (!fileBuffer) {
      return reply.status(500).send({ error: 'File data corrupted' });
    }

    if (isZip) {
      reply
        .header('Content-Type', 'application/zip')
        .header('Content-Disposition', `attachment; filename="${downloadFilename}"`)
        .header('Content-Length', fileBuffer.length)
        .send(fileBuffer);
    } else {
      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${downloadFilename}"`)
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


async function addWatermarkPDF(request, reply) {
  return reply.view("pages/add-watermark.ejs");
}

async function addWatermarkPDFDownload(request, reply) {

  try {
    const { token } = request.params;

    console.log(token);
    const endPoint = "add-watermark";

    // Validate token
    if (!token || !pdfStorage.has(token)) {
      return reply.redirect('/add-watermark');
    }

    // Render the downloadPDF.ejs view with the token
    return reply.view('pages/downloadPDF.ejs', { token, endPoint, title: "Add Watermark to PDF" });
  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error', message: error.message });
  }

}

async function addWatermarkPDFDownloadFile(request, reply) {

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


async function protectPDF(request, reply) {
  return reply.view("pages/protect-pdf.ejs");
}


async function protectPDFDownload(request, reply) {

  try {
    const { token } = request.params;
    const endPoint = "protect-pdf";

    // Validate token exists
    if (!token || !pdfStorage.has(token)) {
      // Redirect back to the tool page if token is invalid/expired
      return reply.redirect('/protect-pdf');
    }

    // console.log(request.query.filename)

    // Optional: you can check query param to know if it's a zip
    const isZip = request.query.type === 'zip';

    // console.log("Iszip "+isZip);

    // Render the same download view you use for remove-pages
    return reply.view('pages/downloadPDF.ejs', {
      token,
      endPoint,
      title: "Protected PDFs",
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

async function protectPDFDownloadFile(request, reply) {

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
        .header('Content-Disposition', 'attachment; filename="protected-pdfs.zip"')
        .header('Content-Length', fileBuffer.length)
        .send(fileBuffer);
    } else {
      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', 'attachment; filename="protected-pdfs.pdf"')
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


async function unlockPDF(request, reply) {
  return reply.view("pages/unlock-pdf.ejs");
}

async function unlockPDFDownload(request, reply) {

  try {
    const { token } = request.params;
    const endPoint = "unlock-pdf";

    // Validate token exists
    if (!token || !pdfStorage.has(token)) {
      // Redirect back to the tool page if token is invalid/expired
      return reply.redirect('/unlock-pdf');
    }

    // console.log(request.query.filename)

    // Optional: you can check query param to know if it's a zip
    const isZip = request.query.type === 'zip';

    // console.log("Iszip "+isZip);

    // Render the same download view you use for remove-pages
    return reply.view('pages/downloadPDF.ejs', {
      token,
      endPoint,
      title: "Unlocked PDFs",
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

async function unlockPDFDownloadFile(request, reply) {

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
        .header('Content-Disposition', 'attachment; filename="unlocked-pdfs.zip"')
        .header('Content-Length', fileBuffer.length)
        .send(fileBuffer);
    } else {
      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', 'attachment; filename="unlocked-pdfs.pdf"')
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


async function PDFImageExtractor(request, reply) {
  return reply.view("pages/pdf-image-extractor.ejs");
}

async function PDFImageExtractorDownload(request, reply) {

  try {
    const { token } = request.params;

    if (!token || !pdfStorage.has(token)) {
      // You can redirect to a common page or home
      return reply.redirect('/pdf-image-extractor');
    }

    const stored = pdfStorage.get(token);   // Buffer or {path, filename, type}

    const isZip = request.query.type === 'zip' ||
      (typeof stored === 'object' && stored.type === 'zip');

    const filename = request.query.filename || 'download.zip';

    return reply.view('pages/downloadPDF.ejs', {
      token,
      endPoint: "pdf-image-extractor",           // or dynamically pass tool name if needed
      title: "Extracted Images",
      isZip,
      filename                     // pass original filename
    });

  } catch (error) {
    fastify.log.error(error);
    return reply.status(500).send({ error: 'Internal server error' });
  }

}


async function PDFImageExtractorDownloadFile(request, reply) {


  try {
    const { token } = request.params;

    if (!token || !pdfStorage.has(token)) {
      return reply.status(400).send({ error: 'Invalid or expired token' });
    }

    const storedData = pdfStorage.get(token);
    pdfStorage.delete(token);        // Clean up immediately

    let fileBuffer;
    let isZip = false;
    let downloadFilename = 'download.pdf';

    // Handle both simple Buffer and Object cases
    if (Buffer.isBuffer(storedData)) {
      fileBuffer = storedData;
      // Try to detect from query
      isZip = request.query.type === 'zip';
    }
    else if (typeof storedData === 'object' && storedData !== null) {
      // New improved structure (recommended)
      fileBuffer = storedData.buffer || storedData.path ? await fs.readFile(storedData.path) : null;
      isZip = storedData.type === 'zip' || request.query.type === 'zip';
      downloadFilename = storedData.filename || (isZip ? 'export.zip' : 'export.pdf');
    }

    if (!fileBuffer) {
      return reply.status(500).send({ error: 'File data corrupted' });
    }

    if (isZip) {
      reply
        .header('Content-Type', 'application/zip')
        .header('Content-Disposition', `attachment; filename="${downloadFilename}"`)
        .header('Content-Length', fileBuffer.length)
        .send(fileBuffer);
    } else {
      reply
        .header('Content-Type', 'application/pdf')
        .header('Content-Disposition', `attachment; filename="${downloadFilename}"`)
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


async function pageNotFound(request, reply) {
  return reply.status(404).view("pages/404.ejs");
}



module.exports = {
  homePage,
  loginRoute,
  signUpRoute,
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
  wordToPDF,
  wordToPDFDownload,
  wordToPDFDownloadFile,
  excelToPDF,
  excelToPDFDownload,
  excelToPDFDownloadFile,
  powerPointToPDF,
  powerPointToPDFDownload,
  powerPointToPDFDownloadFile,
  odtTOPDF,
  odtTOPDFDownload,
  odtTOPDFDownloadFile,
  htmlToPDF,
  htmlToPDFDownload,
  htmlToPDFDownloadFile,
  editPDFPagesDownload,
  editPDFPagesDownloadFile,
  extractPDFPages,
  extractPDFPagesDownload,
  extractPDFPagesDownloadFile,
  compressPDF,
  compressPDFDownload,
  compressPDFDownloadFile,
  addWatermarkPDF,
  addWatermarkPDFDownload,
  addWatermarkPDFDownloadFile,
  protectPDF,
  protectPDFDownload,
  protectPDFDownloadFile,
  unlockPDF,
  unlockPDFDownload,
  unlockPDFDownloadFile,
  linearizePDF,
  linearizePDFDownload,
  linearizePDFDownloadFile,
  PDFImageExtractor,
  PDFImageExtractorDownload,
  PDFImageExtractorDownloadFile
};