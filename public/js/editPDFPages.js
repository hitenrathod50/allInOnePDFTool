pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/build/pdf.worker.min.js';


let pdfFile = null;

const RENDER_SCALE = 2.5;

const QUALITY_FACTOR = 2.0;

let pdfDoc = null;
let totalPages = 0;
let currentPage = 1;

let finalShapesArray = [];

let lastDpr = window.devicePixelRatio || 1;

const pageTotal = document.getElementById('page-total');
const pageInput = document.getElementById('page-input');
const pageNav = document.getElementById('page-nav');

const convertBtn = document.getElementById('convertBtn');

const drawer = document.getElementById('drawer');
const drawerOverlay = document.getElementById('drawerOverlay');
const drawerClose = document.getElementById('drawerClose');


const state = {
  pageSize: 'fit',
  orientation: 'portrait',
  margin: 'none'
};



async function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  event.target.value = '';

  const pdf = files.find(f => f.type === 'application/pdf');

  if (pdf) {
    pdfFile = pdf;
    await handlePDFFileSelect(pdfFile);
  } else {
    alert('Please select a PDF file.');
  }

  document.getElementById('pickPDFContainer').classList.add('hidden');
  document.getElementById('editPDFPagesContainer').style.visibility = "visible";

  syncRadioButtons('pageSize', state.pageSize);
  syncRadioButtons('orientation', state.orientation);
  syncRadioButtons('margin', state.margin);
  updateUI();

}


async function handlePDFFileSelect(pdfFile) {

  const arrayBuffer = await pdfFile.arrayBuffer();

  pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  totalPages = pdfDoc.numPages;

  // console.log(totalPages);

  currentPage = 1;

  pageTotal.textContent = '/ ' + totalPages;
  pageInput.value = '1';
  pageInput.max = totalPages;
  pageNav.classList.remove('hidden');

  await renderPage(1);

}

async function renderPage(pageNum) {
  if (!pdfDoc) return;

  const page = await pdfDoc.getPage(pageNum);

  const dpr = window.devicePixelRatio || 1;
  lastDpr = dpr;

  // ─────────────────────────────────────────
  // 1. Logical (original) page size – this is what we want everywhere
  // ─────────────────────────────────────────
  const logicalScale = 1.0;
  const logicalViewport = page.getViewport({ scale: logicalScale });

  // Usually ≈ 595 × 842 for A4 – this becomes your "CSS / logical" size
  const pageWidth = Math.round(logicalViewport.width);
  const pageHeight = Math.round(logicalViewport.height);

  console.log(`Logical page size (CSS pixels): ${pageWidth} × ${pageHeight}`);

  // ─────────────────────────────────────────
  // 2. High-resolution render (for sharpness on retina / zoom)
  // ─────────────────────────────────────────
  const renderScale = logicalScale * dpr * QUALITY_FACTOR;

  const renderViewport = page.getViewport({ scale: renderScale });

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = Math.round(renderViewport.width);
  tempCanvas.height = Math.round(renderViewport.height);

  const ctx = tempCanvas.getContext("2d");

  // White background (helps with transparency / compression artifacts)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  await page.render({
    canvasContext: ctx,
    viewport: renderViewport
  }).promise;

  // ─────────────────────────────────────────
  // 3. Convert high-res render → Fabric Image, scaled down to logical size
  // ─────────────────────────────────────────
  const pdfImage = await new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      // We render at dpr × QUALITY_FACTOR → scale back to logical size
      const downscale = 1 / (dpr * QUALITY_FACTOR);

      resolve(new fabric.Image(img, {
        left: 0,
        top: 0,

        // This makes the image appear at exactly pageWidth × pageHeight
        scaleX: downscale,
        scaleY: downscale,

        selectable: false,
        evented: false,
        hasControls: false,
        hasBorders: false,
        lockMovementX: true,
        lockMovementY: true,
        // Optional: improves rendering quality when scaled down
        objectCaching: false,   // ← often helps on modern browsers
      }));
    };

    img.src = tempCanvas.toDataURL("image/png");
  });

  // ─────────────────────────────────────────
  // 4. Set fabric canvas to logical size
  // ─────────────────────────────────────────
  canvas.clear();

  canvas.setDimensions({
    width: pageWidth,
    height: pageHeight
  });

  canvas.setBackgroundImage(
    pdfImage,
    canvas.renderAll.bind(canvas),
    {
      originX: "left",
      originY: "top"
    }
  );

  // ─────────────────────────────────────────
  // 5. Fit inside container (CSS scaling) – now using logical size
  // ─────────────────────────────────────────
  const container = document.getElementById("container");
  if (!container) return;

  const contRect = container.getBoundingClientRect();
  const contW = contRect.width;
  const contH = contRect.height;

  console.log(`Container size: ${contW} × ${contH}`);

  let fitScale = Math.min(
    contW / pageWidth,
    contH / pageHeight
  );

  // Prevent upscaling above 100%
  fitScale = Math.min(fitScale, 1);

  const displayW = Math.round(pageWidth * fitScale);
  const displayH = Math.round(pageHeight * fitScale);

  const wrapper = document.getElementById("canvas-wrapper");
  if (wrapper) {
    wrapper.style.width = `${displayW}px`;
    wrapper.style.height = `${displayH}px`;
    wrapper.style.margin = "auto";
    wrapper.style.display = "block";
  }

  // Usually helps – especially when browser is scaling the whole canvas
  canvas.lowerCanvasEl.style.imageRendering = "auto";  // or "crisp-edges" / "pixelated"
  canvas.upperCanvasEl.style.imageRendering = "auto";

  loadShapesForPage(pageNum);
  canvas.renderAll();
}

function saveCurrentPageShapes() {

  // remove old entry if page already exists
  finalShapesArray = finalShapesArray.filter(
    item => item.page !== currentPage
  );

  // store a copy
  finalShapesArray.push({
    page: currentPage,
    shapesArray: [...shapesArray]
  });

}

async function fabricObjectToData(obj) {
  return new Promise((resolve) => {

    // ==================== IMAGE ====================
    if (obj.type === 'image') {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      const scaledWidth = obj.width * obj.scaleX;
      const scaledHeight = obj.height * obj.scaleY;

      canvas.width = scaledWidth;
      canvas.height = scaledHeight;

      // Draw image with current transformation
      ctx.save();
      ctx.translate(scaledWidth / 2, scaledHeight / 2);
      ctx.rotate((obj.angle || 0) * Math.PI / 180);
      ctx.scale(obj.flipX ? -1 : 1, obj.flipY ? -1 : 1);
      ctx.drawImage(
        obj._element,
        -scaledWidth / 2,
        -scaledHeight / 2,
        scaledWidth,
        scaledHeight
      );
      ctx.restore();

      const base64 = canvas.toDataURL('image/png');

      resolve({
        type: 'image',
        dataUrl: base64,
        left: obj.left,
        top: obj.top,
        width: scaledWidth,
        height: scaledHeight,
        opacity: obj.opacity ?? 1,
        angle: obj.angle || 0
      });
      return;
    }

    // ==================== SHAPES / TEXT / PATHS ====================
    obj.clone((cloned) => {
      const padding = 40;   // Important to prevent stroke clipping

      const width = (cloned.width * cloned.scaleX) + padding * 2;
      const height = (cloned.height * cloned.scaleY) + padding * 2;

      cloned.set({
        left: padding,
        top: padding,
        angle: 0,                    // We'll apply rotation on backend if needed
        dirty: true
      });

      const tempCanvas = new fabric.StaticCanvas(null, { width, height });
      tempCanvas.add(cloned);
      tempCanvas.renderAll();

      let svg = tempCanvas.toSVG({ suppressPreamble: true });

      if (!svg.includes('overflow="visible"')) {
        svg = svg.replace('<svg', '<svg overflow="visible"');
      }

      tempCanvas.dispose();

      resolve({
        type: 'shape',
        svg: svg,
        left: obj.left - padding,     // compensate padding
        top: obj.top - padding,
        width: width,
        height: height,
        opacity: obj.opacity ?? 1,
        angle: obj.angle || 0
      });
    });
  });
}

function loadShapesForPage(pageNum) {

  const pageData = finalShapesArray.find(
    item => item.page === pageNum
  );

  shapesArray = [];

  if (!pageData) return;

  pageData.shapesArray.forEach(obj => {

    canvas.add(obj);
    shapesArray.push(obj);

  });

}


pageInput.addEventListener('keydown', async (e) => {
  if (e.key !== 'Enter') return;

  let page = parseInt(pageInput.value, 10);
  if (isNaN(page) || page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  // SAVE current page shapes
  saveCurrentPageShapes();

  currentPage = page;
  pageInput.value = page;

  await renderPage(page);
});


async function handleConvert() {

  saveCurrentPageShapes();

  const spinnerContainer = document.createElement('div');
  spinnerContainer.id = 'spinnerContainer';
  spinnerContainer.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
  spinnerContainer.innerHTML = `
		<div role="status">
      <svg aria-hidden="true" class="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-purple-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
      </svg>
      <span class="sr-only">Loading...</span>
    </div>
	`;
  document.body.appendChild(spinnerContainer);


  const settings = {
    pageSize: state.pageSize,
    orientation: state.orientation,
    margin: state.margin
  };
  console.log('Converting with settings:', settings);
  let message = `Converting to PDF...\n\nSettings:\n`;
  message += `Page Size: ${settings.pageSize.toUpperCase()}\n`;
  if (settings.pageSize === 'a4' || settings.pageSize === 'usletter') {
    message += `Orientation: ${settings.orientation.charAt(0).toUpperCase() + settings.orientation.slice(1)}\n`;
  }
  message += `Margin: ${settings.margin.charAt(0).toUpperCase() + settings.margin.slice(1)}`;
  // alert(message);
  closeDrawer();

  // creating formData Object

  const updatedShapes = await Promise.all(
    finalShapesArray.map(async (pageObj) => ({
      page: pageObj.page,
      shapesArray: await Promise.all(
        pageObj.shapesArray.map(obj => fabricObjectToData(obj))
      )
    }))
  );

  // console.log("updated shapes are : "+JSON.stringify(updatedShapes, null, 2));

  const formData = new FormData();

  // Compression of the images

  try {

    console.log(finalShapesArray)

    formData.append('pdf', pdfFile);

    formData.append('annotations', JSON.stringify(updatedShapes));

    // Send POST request to /imageToPDF
    const response = await fetch('/editPDFPagesPost', {
      method: 'POST',
      body: formData
    });

    console.log(response)

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    if (response.redirected) {
      window.location.href = response.url;
    }



    // const pdfBlob = await response.blob();

    // const url = URL.createObjectURL(pdfBlob);

    // const a = document.createElement("a");

    // a.href = url;

    // a.download = "output.pdf";

    // a.click();

  } catch (error) {
    console.error('Error:', error);
    document.getElementById('spinnerContainer')?.remove();
    alert('Failed to edit PDF Page. Please try again.');
  }

}

convertBtn?.addEventListener('click', handleConvert);


/* ---------------------------------------------------------
   Drawer Controls
   --------------------------------------------------------- */
function openDrawer() {
  drawer.classList.replace('translate-x-full', 'translate-x-0');
  drawerOverlay.classList.replace('opacity-0', 'opacity-100');
  drawerOverlay.classList.remove('invisible');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  drawer.classList.replace('translate-x-0', 'translate-x-full');
  drawerOverlay.classList.replace('opacity-100', 'opacity-0');
  setTimeout(() => drawerOverlay.classList.add('invisible'), 300);
  document.body.style.overflow = '';
}

settingsBtn?.addEventListener('click', openDrawer);
drawerClose?.addEventListener('click', closeDrawer);
drawerOverlay?.addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && drawer.classList.contains('translate-x-0')) closeDrawer();
});

function syncRadioButtons(name, value) {
  document.querySelectorAll(`input[name="${name}"], input[name="${name}Mobile"]`).forEach(radio => {
    radio.checked = radio.value === value;
    const label = radio.nextElementSibling;
    if (radio.checked) {
      label?.classList.add('checked');
    } else {
      label?.classList.remove('checked');
    }
  });
}

function updateUI() {
  const showOrientation = state.pageSize === 'a4' || state.pageSize === 'usletter';
  if (showOrientation) {
    orientationCardDesktop?.classList.remove('hidden');
    orientationCardDesktop?.classList.add('fade-in');
    orientationCardMobile?.classList.remove('hidden');
    orientationCardMobile?.classList.add('fade-in');
  } else {
    orientationCardDesktop?.classList.add('hidden');
    orientationCardMobile?.classList.add('hidden');
  }
}

document.querySelectorAll('input[name="pageSize"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    state.pageSize = e.target.value;
    syncRadioButtons('pageSize', state.pageSize);
    updateUI();
  });
});

document.querySelectorAll('input[name="pageSizeMobile"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    state.pageSize = e.target.value;
    syncRadioButtons('pageSize', state.pageSize);
    updateUI();
  });
});

document.querySelectorAll('input[name="orientation"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    state.orientation = e.target.value;
    syncRadioButtons('orientation', state.orientation);
  });
});

document.querySelectorAll('input[name="orientationMobile"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    state.orientation = e.target.value;
    syncRadioButtons('orientation', state.orientation);
  });
});

document.querySelectorAll('input[name="margin"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    state.margin = e.target.value;
    syncRadioButtons('margin', state.margin);
  });
});

document.querySelectorAll('input[name="marginMobile"]').forEach(radio => {
  radio.addEventListener('change', (e) => {
    state.margin = e.target.value;
    syncRadioButtons('margin', state.margin);
  });
});