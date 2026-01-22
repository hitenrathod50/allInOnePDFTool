pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/build/pdf.worker.min.js';

const plusIconImagePicker = document.getElementById('addCardBtn');
const settingsBtn = document.getElementById('settingsBtn');
const drawer = document.getElementById('drawer');
const convertBtn = document.getElementById('convertBtn');
const drawerOverlay = document.getElementById('drawerOverlay');
const drawerClose = document.getElementById('drawerClose');
const pdfInput = document.getElementById('pdfInput');
const cardsContainer = document.getElementById('cardsContainer');

// Global state
let pdfArray = []; // Array of { file: File, name: string, id: string }
const state = {
  margin: 'none'
};

/* ---------------------------------------------------------
   Touch device detection
   --------------------------------------------------------- */
function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/* ---------------------------------------------------------
   Prevent context menu on touch devices (long press)
   --------------------------------------------------------- */
if (isTouchDevice()) {
  cardsContainer.addEventListener('contextmenu', e => {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });
}

/* ---------------------------------------------------------
   Add PDFs trigger
   --------------------------------------------------------- */
plusIconImagePicker?.addEventListener('click', () => pdfInput.click());

/* ---------------------------------------------------------
   Update card number badges
   --------------------------------------------------------- */
function updateCardNumbers() {
  const wrappers = cardsContainer.querySelectorAll('.card-wrapper');
  wrappers.forEach((wrapper, index) => {
    const badge = wrapper.querySelector('.card-number');
    if (badge) badge.textContent = index + 1;
  });
}

/* ---------------------------------------------------------
   Debug: Log current PDF order
   --------------------------------------------------------- */
function logPdfArray() {
  console.clear();
  console.table(pdfArray.map(item => ({ fileName: item.name, id: item.id })));
}

/* ---------------------------------------------------------
   Render PDF preview (first page)
   --------------------------------------------------------- */
async function renderPdfFirstPage(pdfFile, cardId) {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    if (pdfDoc.numPages === 0) throw new Error('Empty PDF');

    const page = await pdfDoc.getPage(1);
    const viewport = page.getViewport({ scale: 1.5 });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');

    await page.render({ canvasContext: ctx, viewport }).promise;

    const imgUrl = canvas.toDataURL('image/png');

    const cardHTML = `
      <div class="card-wrapper opacity-0 transition-opacity rounded-lg duration-500" data-id="${cardId}">
        <div class="card pdf-card cursor-move relative w-full aspect-[3/4] bg-white rounded-lg shadow-md overflow-hidden group">
          <img src="${imgUrl}" alt="Preview of ${pdfFile.name}" class="w-full h-full object-contain">
          
          <div class="card-number absolute top-2 left-2 bg-[#7100ad] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow">
            ${cardsContainer.children.length + 1}
          </div>

          <button class="cancel-btn absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#7100ad]">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[#7100ad]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        </div>
        <div class="mt-2 text-center text-sm text-gray-700 truncate px-2">${pdfFile.name}</div>
      </div>`;

    cardsContainer.insertAdjacentHTML('beforeend', cardHTML);
    requestAnimationFrame(() => cardsContainer.lastElementChild.classList.remove('opacity-0'));
  } catch (err) {
    console.error('Preview failed:', err);
    alert(`Could not preview: ${pdfFile.name}`);
  }
}

/* ---------------------------------------------------------
   Handle file selection (multiple PDFs)
   --------------------------------------------------------- */
async function handleFileSelect(e) {
  const files = Array.from(e.target.files).filter(f => f.type === 'application/pdf');
  if (files.length === 0) {
    alert('Please select one or more PDF files.');
    return;
  }

  e.target.value = ''; // Reset input

  document.getElementById('pickPDFContainer')?.classList.add('hidden');
  document.getElementById('mergePDFEnableContainer')?.classList.remove('hidden');

  for (const file of files) {
    const id = `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    pdfArray.push({ file, name: file.name, id });
    await renderPdfFirstPage(file, id);
  }

  updateCardNumbers();
  logPdfArray();
}

pdfInput.addEventListener('change', handleFileSelect);

/* ---------------------------------------------------------
   Margin radio sync & listeners
   --------------------------------------------------------- */
function syncMarginRadios(value) {
  document.querySelectorAll('input[name="margin"], input[name="marginMobile"]').forEach(radio => {
    radio.checked = radio.value === value;
  });
}

function initializeRadioListeners() {
  document.querySelectorAll('input[name="margin"], input[name="marginMobile"]').forEach(radio => {
    radio.addEventListener('change', () => {
      state.margin = radio.value;
      syncMarginRadios(state.margin);
    });
  });
}

/* ---------------------------------------------------------
   Get current settings
   --------------------------------------------------------- */
function getSettings() {
  return { margin: state.margin };
}
window.getPageSettings = getSettings;

/* ---------------------------------------------------------
   Delete card
   --------------------------------------------------------- */
cardsContainer.addEventListener('click', e => {
  const btn = e.target.closest('.cancel-btn');
  if (!btn) return;

  const wrapper = btn.closest('.card-wrapper');
  const id = wrapper.dataset.id;

  wrapper.style.opacity = '0';
  wrapper.style.transition = 'opacity 0.4s ease';

  setTimeout(() => {
    wrapper.remove();
    pdfArray = pdfArray.filter(item => item.id !== id);
    updateCardNumbers();
    logPdfArray();

    if (pdfArray.length === 0) {
      document.getElementById('pickPDFContainer')?.classList.remove('hidden');
      document.getElementById('mergePDFEnableContainer')?.classList.add('hidden');
    }
  }, 400);
});

/* ---------------------------------------------------------
   Drag & Drop Reordering (with touch delay)
   --------------------------------------------------------- */
new Sortable(cardsContainer, {
  animation: 300,
  handle: '.card',
  ghostClass: 'sortable-ghost',
  chosenClass: 'sortable-chosen',
  dragClass: 'sortable-drag',
  delay: isTouchDevice() ? 200 : 0,
  delayOnTouchOnly: true,
  onSort: () => {
    const newOrder = [];
    cardsContainer.querySelectorAll('.card-wrapper').forEach(wrapper => {
      const item = pdfArray.find(p => p.id === wrapper.dataset.id);
      if (item) newOrder.push(item);
    });
    pdfArray = newOrder;
    updateCardNumbers();
    logPdfArray();
  }
});

/* ---------------------------------------------------------
   Merge PDFs
   --------------------------------------------------------- */
async function handleConvert() {
  if (pdfArray.length < 2) {
    alert('Please add at least two PDF files to merge.');
    return;
  }

  const spinner = document.createElement('div');
  spinner.id = 'spinnerContainer';
  spinner.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
  spinner.innerHTML = `
    <div role="status">
      <svg aria-hidden="true" class="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-purple-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
      </svg>
      <span class="sr-only">Loading...</span>
    </div>
  `;
  document.body.appendChild(spinner);

  closeDrawer();

  const formData = new FormData();
  pdfArray.forEach((item, i) => formData.append(`pdfs[${i}]`, item.file));
  formData.append('settings', JSON.stringify(state));

  try {
    const res = await fetch('/mergePDFPost', { method: 'POST', body: formData });

    if (!res.ok) throw new Error('Server error');

    console.log(res);

    if (res.redirected) {
      window.location.href = res.url;
    }
  } catch (err) {
    console.error(err);
    alert('Merge failed. Please try again.');
  } finally {
    spinner.remove();
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

/* ---------------------------------------------------------
   Init
   --------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initializeRadioListeners();
  syncMarginRadios(state.margin);
  console.log('PDF Merger (Margins Only) Ready');
});