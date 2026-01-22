/* =============================================================
   PDF Editor with Page Number Settings – Updated with Start From Page
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
let pdf = null;               // Stores the selected PDF File object
let pdfPageCount = 0;

// State object – now includes startFromPage
const state = {
  pageSize: 'fit',
  pageNumberFormat: 'arabic',
  position: 'bottom-center',
  pageNumberStart: 1,
  startFromPage: 1,         // NEW: From which page numbering begins
  orientation: 'portrait',
  margin: 'small'
};

/* ---------------------------------------------------------
   Update card number badges (visual only)
   --------------------------------------------------------- */
function updateCardNumbers() {
  const cards = cardsContainer.querySelectorAll('.card');
  cards.forEach((card, index) => {
    const badge = card.querySelector('.card-number');
    if (badge) {
      badge.textContent = index + 1;
    }
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
   handleFileSelect – supports only PDF
   --------------------------------------------------------- */
async function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  event.target.value = '';

  const pdfFile = files.find(f => f.type === 'application/pdf');

  if (pdfFile) {
    pdf = pdfFile;
    await handlePDFFile(pdfFile);
  } else {
    alert('Please select a PDF file.');
  }
}

/* ---------------------------------------------------------
   Handle PDF File – resets everything
   --------------------------------------------------------- */
async function handlePDFFile(file) {
  pdfPageCount = 0;
  cardsContainer.innerHTML = '';

  document.getElementById('pickPDFContainer').classList.add('hidden');
  document.getElementById('addPagesToPDFEnableContainer').classList.remove('hidden');

  // Reset state to defaults
  state.pageSize = 'fit';
  state.pageNumberFormat = 'arabic';
  state.position = 'bottom-center';
  state.pageNumberStart = 1;
  state.startFromPage = 1;        // Reset new field
  state.orientation = 'portrait';
  state.margin = 'small';

  syncAllControls();
  updateUI();

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    pdfPageCount = pdfDoc.numPages;

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: ctx, viewport }).promise;
      const imgUrl = canvas.toDataURL('image/png');

      const cardId = `card-${pageNum}`;
      const cardHTML = `
        <div class="card pdf-card cursor-not-allowed relative w-full aspect-[3/4] bg-white rounded-lg shadow-md overflow-hidden group opacity-0 transition-opacity duration-500" data-id="${cardId}">
          <img src="${imgUrl}" alt="PDF Page ${pageNum}" class="w-full h-full object-contain">
          <div class="card-number absolute top-2 left-2 bg-[#7100ad] text-white text-xs font-bold flex items-center justify-center w-6 h-6 rounded-full shadow">
            ${pageNum}
          </div>
        </div>`;

      cardsContainer.insertAdjacentHTML('beforeend', cardHTML);
      const newCard = cardsContainer.lastElementChild;
      requestAnimationFrame(() => newCard.style.opacity = '1');
    }

    updateCardNumbers();
    logState();
  } catch (err) {
    console.error('PDF Error:', err);
    alert('Failed to load PDF.');
    pdf = null;
  }
}

/* ---------------------------------------------------------
   Sync Controls – Desktop & Mobile
   --------------------------------------------------------- */
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

function syncSelect(name, value) {
  document.querySelectorAll(`select[name="${name}"], select[name="${name}Mobile"]`).forEach(select => {
    select.value = value;
  });
}

function syncNumberInput(value) {
  document.querySelectorAll('input[name="startingPageNumber"], input[name="startingPageNumberMobile"]').forEach(input => {
    input.value = value;
  });
}

// NEW: Sync Start From Page input (desktop + mobile)
function syncStartFromPageInput(value) {
  document.querySelectorAll('input[name="startFromPage"], input[name="startFromPageMobile"]').forEach(input => {
    input.value = value;
  });
}

function syncAllControls() {
  syncRadioButtons('pageSize', state.pageSize);
  syncRadioButtons('orientation', state.orientation);
  syncRadioButtons('margin', state.margin);
  syncSelect('pageNumberFormat', state.pageNumberFormat);
  syncSelect('pageNumberPosition', state.position);
  syncNumberInput(state.pageNumberStart);
  syncStartFromPageInput(state.startFromPage);  // Sync new field
}

/* ---------------------------------------------------------
   Update UI – Show/hide orientation card
   --------------------------------------------------------- */
function updateUI() {
  const showOrientation = state.pageSize === 'a4' || state.pageSize === 'usletter';
  const orientationCardDesktop = document.getElementById('orientationCardDesktop');
  const orientationCardMobile = document.getElementById('orientationCardMobile');

  [orientationCardDesktop, orientationCardMobile].forEach(card => {
    if (card) {
      if (showOrientation) {
        card.classList.remove('hidden');
        card.classList.add('fade-in');
      } else {
        card.classList.add('hidden');
      }
    }
  });
}

/* ---------------------------------------------------------
   Initialize Event Listeners
   --------------------------------------------------------- */
function initializeListeners() {
  // Page Size, Orientation, Margin (radios)
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      const baseName = e.target.name.replace('Mobile', '');
      if (baseName === 'pageSize') state.pageSize = e.target.value;
      else if (baseName === 'orientation') state.orientation = e.target.value;
      else if (baseName === 'margin') state.margin = e.target.value;

      syncRadioButtons(baseName, state[baseName]);
      if (baseName === 'pageSize') updateUI();
    });
  });

  // Page Number Format & Position (selects)
  document.querySelectorAll('select').forEach(select => {
    select.addEventListener('change', (e) => {
      const baseName = e.target.name.replace('Mobile', '');
      if (baseName === 'pageNumberFormat') {
        state.pageNumberFormat = e.target.value;
        syncSelect('pageNumberFormat', state.pageNumberFormat);
      } else if (baseName === 'pageNumberPosition') {
        state.position = e.target.value;
        syncSelect('pageNumberPosition', state.position);
      }
    });
  });

  // Starting Page Number
  document.querySelectorAll('input[name="startingPageNumber"], input[name="startingPageNumberMobile"]').forEach(input => {
    input.addEventListener('input', (e) => {
      let val = parseInt(e.target.value);
      if (isNaN(val) || val < 1) val = 1;
      state.pageNumberStart = val;
      syncNumberInput(state.pageNumberStart);
    });
  });

  // NEW: Start From Page (both desktop and mobile)
  document.querySelectorAll('input[name="startFromPage"], input[name="startFromPageMobile"]').forEach(input => {
    input.addEventListener('input', (e) => {
      let val = parseInt(e.target.value);
      if (isNaN(val) || val < 1) val = 1;
      state.startFromPage = val;
      syncStartFromPageInput(state.startFromPage);
    });
  });
}

function getSettings() {
  return { ...state };
}

window.getPageSettings = getSettings;

/* ---------------------------------------------------------
   handleConvert – Send PDF + all settings (including startFromPage)
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
    </div>
  `;
  document.body.appendChild(spinnerContainer);

  if (typeof closeDrawer === 'function') closeDrawer();

  const formData = new FormData();
  formData.append('pdf', pdf);
  formData.append('settings', JSON.stringify(state));  // Includes startFromPage

  try {
    const response = await fetch('/addPageNumberToPDFPost', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} ${response.statusText}`);
    }

    if (response.redirected) {
      window.location.href = response.url;
    }
  } catch (error) {
    console.error('Processing failed:', error);
    const spinner = document.getElementById('spinnerContainer');
    if (spinner) spinner.remove();
    alert('Failed to process PDF. Please try again.');
  }
}

convertBtn?.addEventListener('click', handleConvert);

/* ---------------------------------------------------------
   Drawer Controls
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
imageInput.addEventListener('change', handleFileSelect);

document.addEventListener('DOMContentLoaded', () => {
  initializeListeners();
  syncAllControls();
  updateUI();
  console.log('PDF Editor initialized');
  console.log('Current settings:', getSettings());
});