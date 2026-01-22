/* =============================================================
   PDF Page Preview Tool – HIGH QUALITY (no removal functionality)
   ============================================================= */

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/build/pdf.worker.min.js';

/* ---------------------------------------------------------
   DOM references
--------------------------------------------------------- */
const dom = {
  settingsBtn: document.getElementById('settingsBtn'),
  drawer: document.getElementById('drawer'),
  convertBtn: document.getElementById('convertBtn'),
  drawerOverlay: document.getElementById('drawerOverlay'),
  drawerClose: document.getElementById('drawerClose'),
  pdfInput: document.getElementById('pdfInput'),
  cardsContainer: document.getElementById('cardsContainer'),
  pickPDFBtn: document.getElementById('pickPDFBtn'),
  pickPDFContainer: document.getElementById('pickPDFContainer'),
  removeEnableContainer: document.getElementById('splitPDFEnableContainer'),
};

const rangesContainer = document.getElementById('rangesContainer');
const rangesContainerMobile = document.getElementById('rangesContainerMobile');
const addRangeBtn = document.getElementById('addRangeBtn');
const addRangeBtnMobile = document.getElementById('addRangeBtnMobile');


const separateDesktop = document.getElementById('separatePdfs');
const separateMobile = document.getElementById('separatePdfsMobile');

/* ---------------------------------------------------------
   Range template (FIXED, NOT REMOVED)
--------------------------------------------------------- */
const rangeTemplate = document.createElement('template');
rangeTemplate.innerHTML = `
  <div class="range-card group relative flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition-colors">
    <div class="flex-1 grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">From</label>
        <input type="number"
          class="range-from w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">To</label>
        <input type="number"
          class="range-to w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
      </div>
    </div>
    <button class="cancel-btn absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-gray-100 transition-opacity">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[#7100ad]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
`;

/* ---------------------------------------------------------
   Global state
--------------------------------------------------------- */
let pdfFile = null;
let totalPages = 0;
let MAX_END_PAGE = 1;
let keepDifferentPDF = false;

let splitPagesArray = [{ startPage: 1, endPage: 1 }];

const state = { margin: 'none' };

/* ---------------------------------------------------------
   Open file picker
--------------------------------------------------------- */
dom.pickPDFBtn?.addEventListener('click', () => dom.pdfInput.click());

/* ---------------------------------------------------------
   Handle PDF selection
--------------------------------------------------------- */

async function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  event.target.value = '';

  const selectedPdfFile = files.find(f => f.type === 'application/pdf');
  if (!selectedPdfFile) {
    alert('Please select a PDF file.');
    return;
  }

  pdfFile = selectedPdfFile;
  dom.cardsContainer.innerHTML = '';

  dom.pickPDFContainer?.classList.add('hidden');
  dom.removeEnableContainer?.classList.remove('hidden');

  await loadAndRenderAllPages(pdfFile);

  dom.convertBtn.disabled = false;
  syncRadioButtons('margin', state.margin);
}

dom.pdfInput?.addEventListener('change', handleFileSelect);

/* ---------------------------------------------------------
   Load & render all pages (HIGH QUALITY)
--------------------------------------------------------- */
async function loadAndRenderAllPages(file) {
  try {
    const buffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: buffer }).promise;

    totalPages = pdfDoc.numPages;
    MAX_END_PAGE = totalPages;

    splitPagesArray = [{ startPage: 1, endPage: MAX_END_PAGE }];
    renderAllRanges();

    const scale = 1.5;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;

      dom.cardsContainer.appendChild(
        createPageCard(pageNum, canvas.toDataURL('image/png'))
      );
    }
  } catch (err) {
    console.error(err);
    alert('Failed to load PDF.');
  }
}

/* ---------------------------------------------------------
   Page ranges logic (UNCHANGED)
--------------------------------------------------------- */
function createRangeCard(range, index) {
  const card = rangeTemplate.content.firstElementChild.cloneNode(true);
  const from = card.querySelector('.range-from');
  const to = card.querySelector('.range-to');

  from.min = to.min = 1;
  from.max = to.max = MAX_END_PAGE;

  from.value = range.startPage;
  to.value = range.endPage;

  from.onchange = () => updateRange(index, from.value, null);
  to.onchange = () => updateRange(index, null, to.value);

  card.querySelector('.cancel-btn').onclick = () => removeRange(index);
  return card;
}

function renderAllRanges() {
  if (!rangesContainer || !rangesContainerMobile) return;
  rangesContainer.innerHTML = '';
  rangesContainerMobile.innerHTML = '';

  splitPagesArray.forEach((r, i) => {
    rangesContainer.appendChild(createRangeCard(r, i));
    rangesContainerMobile.appendChild(createRangeCard(r, i));
  });
}

function updateRange(i, s, e) {
  const r = splitPagesArray[i];
  if (!r) return;

  if (s !== null) r.startPage = Math.max(1, Math.min(+s, MAX_END_PAGE));
  if (e !== null) r.endPage = Math.max(r.startPage, Math.min(+e, MAX_END_PAGE));

  renderAllRanges();
}

function removeRange(i) {
  if (splitPagesArray.length <= 1) {
    alert('You must keep at least one page range!');
    return;
  }
  splitPagesArray.splice(i, 1);
  renderAllRanges();
}

function addNewRange() {
  const last = splitPagesArray.at(-1);
  const start = Math.min(last.endPage + 1, MAX_END_PAGE);
  splitPagesArray.push({ startPage: start, endPage: MAX_END_PAGE });
  renderAllRanges();
}

/* ---------------------------------------------------------
   Convert handler (unchanged)
--------------------------------------------------------- */
async function handleConvert() {
  if (!pdfFile) return alert('No PDF loaded');

  if (splitPagesArray.length === 0) {
    alert("No range is defined");
    return;
  }

  const spinner = document.createElement('div');
  spinner.id = 'spinner';
  spinner.className = 'fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50';
  spinner.innerHTML = `
    <div role="status">
      <svg aria-hidden="true" class="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-purple-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
      </svg>
      <span class="sr-only">Loading...</span>
    </div>`;
  
  document.body.appendChild(spinner);

  try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);
      formData.append('splitPagesArray', JSON.stringify(splitPagesArray));
      formData.append('settings', JSON.stringify(state));
      formData.append('keepDifferentPDF', JSON.stringify(keepDifferentPDF));

    const res = await fetch('/splitPDFPost', {
      method: 'POST',
      body: formData
    });

    console.log(res);

    if (res.status === 413) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'File size is too large. Max allowed is 30MB.');
      return;
    }

    if (!res.ok) throw new Error(res.status);
    if (res.redirected) window.location.href = res.url;

  } catch (err) {
    console.error(err);
    alert('Failed to Split PDF');
  } finally {
    spinner.remove();
  }
}

dom.convertBtn?.addEventListener('click', handleConvert);

addRangeBtn?.addEventListener('click', addNewRange);
addRangeBtnMobile?.addEventListener('click', addNewRange);

/* ---------------------------------------------------------
   Page preview card (PAGE NUMBER RESTORED)
--------------------------------------------------------- */
function createPageCard(pageNum, imgUrl) {
  const wrapper = document.createElement('div');
  wrapper.className =
    'card-wrapper opacity-0 transition-opacity rounded-lg duration-500';
  wrapper.dataset.page = pageNum;

  wrapper.innerHTML = `
    <div class="card pdf-card relative w-full aspect-[3/4] bg-white rounded-lg shadow-md overflow-hidden">
      <img src="${imgUrl}" class="w-full h-full object-contain" />

      <div class="card-number absolute top-2 left-2 bg-[#7100ad] text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full shadow">
        ${pageNum}
      </div>
    </div>

    <div class="mt-2 text-center text-sm text-gray-700 truncate px-2">
      Page ${pageNum}
    </div>
  `;

  requestAnimationFrame(() => wrapper.classList.remove('opacity-0'));
  return wrapper;
}

/* ---------------------------------------------------------
   Drawer & settings
--------------------------------------------------------- */

function openDrawer() {
  dom.drawer.classList.remove('translate-x-full');
  dom.drawerOverlay.classList.remove('opacity-0', 'invisible');
  dom.drawerOverlay.classList.add('opacity-100');
}

function closeDrawer() {
  dom.drawer.classList.add('translate-x-full');
  dom.drawerOverlay.classList.remove('opacity-100');
  dom.drawerOverlay.classList.add('opacity-0', 'invisible');
}

dom.settingsBtn?.addEventListener('click', openDrawer);
dom.drawerClose?.addEventListener('click', closeDrawer);
dom.drawerOverlay?.addEventListener('click', closeDrawer);

function syncRadioButtons(name, value) {
  document
    .querySelectorAll(`input[name="${name}"], input[name="${name}Mobile"]`)
    .forEach(r => (r.checked = r.value === value));
}

document
  .querySelectorAll('#separatePdfs, #separatePdfsMobile')
  .forEach(checkbox => {
    checkbox.addEventListener('change', (e) => {
      keepDifferentPDF = e.target.checked;

      // sync both checkboxes
      document
        .querySelectorAll('#separatePdfs, #separatePdfsMobile')
        .forEach(cb => (cb.checked = keepDifferentPDF));
    });
  });

document
  .querySelectorAll('input[name="margin"], input[name="marginMobile"]')
  .forEach(radio => {
    radio.addEventListener('change', (e) => {
      state.margin = e.target.value;
      syncRadioButtons('margin', state.margin);
    });
  });

syncRadioButtons('margin', state.margin);

console.log('PDF Preview Tool – HIGH QUALITY (page numbers preserved)');
