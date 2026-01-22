/* =============================================================
   PDF Rotator – Rotate All Pages (True Rotation via PDF.js)
   ============================================================= */

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/build/pdf.worker.min.js';

const settingsBtn = document.getElementById('settingsBtn');
const drawer = document.getElementById('drawer');
const convertBtn = document.getElementById('convertBtn');
const drawerOverlay = document.getElementById('drawerOverlay');
const drawerClose = document.getElementById('drawerClose');
const imageInput = document.getElementById('pdfInputFirst');
const cardsContainer = document.getElementById('cardsContainer');

// Global variables
let pdf = null;               // Selected PDF File object
let pdfDoc = null;            // PDF.js document object (cached for re-rendering)
let pdfPageCount = 0;

// State object
const state = {
  rotation: 90,     // Default: 90° clockwise (relative to original)
  margin: 'none'    // 'none', 'small', 'big'
};

/* ---------------------------------------------------------
   Update card number badges
   --------------------------------------------------------- */
function updateCardNumbers() {
  const cards = cardsContainer.querySelectorAll('.card');
  cards.forEach((card, index) => {
    const badge = card.querySelector('.card-number');
    if (badge) badge.textContent = index + 1;
  });
}

/* ---------------------------------------------------------
   Console log current state
   --------------------------------------------------------- */
function logState() {
  console.clear();
  if (pdf) {
    console.log('Selected PDF:', pdf.name, `(${pdfPageCount} pages)`);
  } else {
    console.log('No PDF selected yet.');
  }
  console.log('Current settings:', state);
}

/* ---------------------------------------------------------
   Handle file selection (PDF only)
   --------------------------------------------------------- */
async function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  event.target.value = '';

  const pdfFile = files.find(f => f.type === 'application/pdf');
  if (!pdfFile) {
    alert('Please select a PDF file.');
    return;
  }

  pdf = pdfFile;
  await loadAndRenderPDF(pdfFile);
}

/* ---------------------------------------------------------
   Load PDF and render all pages with current rotation
   --------------------------------------------------------- */
async function loadAndRenderPDF(file) {
  cardsContainer.innerHTML = '';
  document.getElementById('pickPDFContainer')?.classList.add('hidden');
  document.getElementById('rotateAllPagesEnableContainer')?.classList.remove('hidden');

  // Reset state
  state.rotation = 90;
  state.margin = 'none';
  syncAllControls();

  try {
    const arrayBuffer = await file.arrayBuffer();
    pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    pdfPageCount = pdfDoc.numPages;

    await renderAllPages(); // Initial render with default 90°

    updateCardNumbers();
    logState();
  } catch (err) {
    console.error('PDF loading error:', err);
    alert('Failed to load PDF.');
    pdf = null;
    pdfDoc = null;
  }
}

/* ---------------------------------------------------------
   Render all pages with the current state.rotation
   --------------------------------------------------------- */
async function renderAllPages() {
  if (!pdfDoc) return;

  cardsContainer.innerHTML = ''; // Clear previous previews

  const scale = 1.5;

  for (let pageNum = 1; pageNum <= pdfPageCount; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);

    // Apply rotation relative to original page
    const viewport = page.getViewport({ scale, rotation: state.rotation });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    const imgUrl = canvas.toDataURL('image/png');

    const cardHTML = `
      <div class="card pdf-card relative w-full aspect-[3/4] bg-white rounded-lg shadow-md overflow-hidden group opacity-0 transition-opacity duration-500">
        <img src="${imgUrl}" alt="Page ${pageNum}" class="w-full h-full object-contain">
        <div class="card-number absolute top-2 left-2 bg-[#7100ad] text-white text-xs font-bold flex items-center justify-center w-6 h-6 rounded-full shadow z-10">
          ${pageNum}
        </div>
      </div>`;

    cardsContainer.insertAdjacentHTML('beforeend', cardHTML);
    const newCard = cardsContainer.lastElementChild;
    requestAnimationFrame(() => newCard.style.opacity = '1');
  }

  updateCardNumbers();
}

/* ---------------------------------------------------------
   Sync controls (desktop + mobile)
   --------------------------------------------------------- */
function syncSelect(name, value) {
  document.querySelectorAll(`select[name="${name}"], select[name="${name}Mobile"]`).forEach(select => {
    select.value = value;
  });
}

function syncRadioButtons(name, value) {
  document.querySelectorAll(`input[name="${name}"], input[name="${name}Mobile"]`).forEach(radio => {
    radio.checked = radio.value === value;
    const label = radio.closest('.radio-option');
    if (label) {
      if (radio.checked) label.classList.add('checked');
      else label.classList.remove('checked');
    }
  });
}

function syncAllControls() {
  syncSelect('rotation', state.rotation);
  syncRadioButtons('margin', state.margin);
}

/* ---------------------------------------------------------
   Initialize event listeners
   --------------------------------------------------------- */
function initializeListeners() {
  // Rotation change → re-render all pages
  document.querySelectorAll('select[name="rotation"], select[name="rotationMobile"]').forEach(select => {
    select.addEventListener('change', async (e) => {
      const newRotation = parseInt(e.target.value);
      if (state.rotation !== newRotation && pdfDoc) {
        state.rotation = newRotation;
        syncSelect('rotation', newRotation);
        await renderAllPages(); // True rotation re-render
        logState();
      }
    });
  });

  // Margin change
  document.querySelectorAll('input[type="radio"][name="margin"], input[type="radio"][name="marginMobile"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.margin = e.target.value;
      syncRadioButtons('margin', state.margin);
      logState();
    });
  });
}

/* ---------------------------------------------------------
   Get current settings
   --------------------------------------------------------- */
function getSettings() {
  return { ...state };
}
window.getPageSettings = getSettings;

/* ---------------------------------------------------------
   Handle Convert – Send to backend
   --------------------------------------------------------- */
async function handleConvert() {
  if (!pdf) {
    alert('No PDF file selected!');
    return;
  }

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
    </div>`;
  document.body.appendChild(spinnerContainer);

  closeDrawer();

  const formData = new FormData();
  formData.append('pdf', pdf);
  formData.append('settings', JSON.stringify(state));

  try {
    const response = await fetch('/rotatePDFAllPagesPost', {
      method: 'POST',
      body: formData
    });

    if (response.status === 413) {
      const data = await response.json().catch(() => ({}));
      alert(data.error || 'File size is too large. Max allowed is 30MB.');
      return;
    }

    if (!response.ok) throw new Error(`Server error: ${response.status}`);

    if (response.redirected) {
      window.location.href = response.url;
    }

  } catch (error) {
    console.error('Rotation failed:', error);
    alert('Failed to rotate PDF. Please try again.');
  } finally {
    spinnerContainer.remove();
  }
}

convertBtn?.addEventListener('click', handleConvert);

/* ---------------------------------------------------------
   Drawer controls
   --------------------------------------------------------- */
function openDrawer() {
  drawer.classList.remove('translate-x-full');
  drawer.classList.add('translate-x-0');
  drawerOverlay.classList.remove('opacity-0', 'invisible');
  drawerOverlay.classList.add('opacity-100', 'visible');
  document.body.style.overflow = 'hidden';
}

function closeDrawer() {
  drawer.classList.add('translate-x-full');
  drawer.classList.remove('translate-x-0');
  drawerOverlay.classList.add('opacity-0', 'invisible');
  drawerOverlay.classList.remove('opacity-100', 'visible');
  document.body.style.overflow = '';
}

settingsBtn?.addEventListener('click', openDrawer);
drawerClose?.addEventListener('click', closeDrawer);
drawerOverlay?.addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && drawer.classList.contains('translate-x-0')) closeDrawer();
});
drawer?.addEventListener('click', e => e.stopPropagation());

/* ---------------------------------------------------------
   Initialization
   --------------------------------------------------------- */
imageInput?.addEventListener('change', handleFileSelect);

document.addEventListener('DOMContentLoaded', () => {
  initializeListeners();
  syncAllControls();
  console.log('PDF Rotator initialized – True rotation enabled');
});