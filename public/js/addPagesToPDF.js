/* =============================================================
   PDF + Images to PDF Editor (File Names Below Cards)
   ============================================================= */

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@latest/build/pdf.worker.min.js';

const plusIconImagePicker = document.getElementById('addCardBtn');
const settingsBtn = document.getElementById('settingsBtn');
const drawer = document.getElementById('drawer');
const convertBtn = document.getElementById('convertBtn');
const drawerOverlay = document.getElementById('drawerOverlay');
const drawerClose = document.getElementById('drawerClose');
const imageInput = document.getElementById('imageInput');
const cardsContainer = document.getElementById('cardsContainer');

// Global state
let data = []; // [{ file: File, type: "pdf" | "image", rotation: 0, previewUrl?: string }]

const state = {
  pageSize: 'fit',
  orientation: 'portrait',
  margin: 'none'
};

plusIconImagePicker.addEventListener('click', () => {
  imageInput.click();
});

/* ---------------------------------------------------------
   Helper: Rotate image from original – NOT USED for frontend, only if needed
   --------------------------------------------------------- */
async function rotateImageFromOriginal(originalFile, totalRotation) {
  const img = new Image();
  const url = URL.createObjectURL(originalFile);
  img.src = url;
  await new Promise(resolve => img.onload = resolve);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (totalRotation === 90 || totalRotation === 270) {
    canvas.width = img.height;
    canvas.height = img.width;
  } else {
    canvas.width = img.width;
    canvas.height = img.height;
  }

  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(totalRotation * Math.PI / 180);
  ctx.drawImage(img, -img.width / 2, -img.height / 2);

  const blob = await new Promise(res => canvas.toBlob(res, originalFile.type || 'image/jpeg', 0.95));
  URL.revokeObjectURL(url);

  return new File([blob], originalFile.name, { type: blob.type });
}

/* ---------------------------------------------------------
   Update card numbers only
   --------------------------------------------------------- */
function updateCardNumbers() {
  const cards = cardsContainer.querySelectorAll('.card');
  cards.forEach((card, index) => {
    const badge = card.querySelector('.card-number');
    if (badge) badge.textContent = index + 1;
    card.dataset.index = index + 1;
  });
}

/* ---------------------------------------------------------
   Log current data
   --------------------------------------------------------- */
function logData() {
  console.clear();
  console.log('Current data array:', data.map((item, i) => ({
    position: i + 1,
    name: item.file.name,
    type: item.type,
    rotation: item.rotation + '°'
  })));
}

/* ---------------------------------------------------------
   Handle file selection – Smart append
   --------------------------------------------------------- */
async function handleFileSelect(event) {
  const files = Array.from(event.target.files);
  if (!files.length) return;

  event.target.value = '';

  const pdfFile = files.find(f => f.type === 'application/pdf');
  const imageFiles = files.filter(f => f.type.startsWith('image/'));

  if (pdfFile) {
    data = [{ file: pdfFile, type: "pdf" }];
    cardsContainer.innerHTML = '';
    await renderPDFCard(pdfFile, 1);

    document.getElementById('pickPDFContainer').classList.add('hidden');
    document.getElementById('addPagesToPDFEnableContainer').classList.remove('hidden');

    state.pageSize = 'fit';
    state.orientation = 'portrait';
    state.margin = 'none';
    syncRadioButtons('pageSize', state.pageSize);
    syncRadioButtons('orientation', state.orientation);
    syncRadioButtons('margin', state.margin);
    updateUI();
  }

  if (imageFiles.length > 0) {
    const startVisualIndex = data.length + 1;

    for (let i = 0; i < imageFiles.length; i++) {
      const imgFile = imageFiles[i];
      const item = { file: imgFile, type: "image", rotation: 0 };
      data.push(item);
      await renderImageCard(item, startVisualIndex + i);
    }

    updateCardNumbers();
  }

  logData();
}

/* ---------------------------------------------------------
   Render PDF Card (preview + name below)
   --------------------------------------------------------- */
async function renderPDFCard(pdfFile, visualIndex) {
  try {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdfDoc.getPage(1);
    const scale = 1.5;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const imgUrl = canvas.toDataURL('image/png');
    const fileName = pdfFile.name;

    const cardHTML = `
      <div class="card-wrapper opacity-0 transition-opacity rounded-lg duration-500" data-index="${visualIndex}">
        <div class="card pdf-card cursor-not-allowed relative w-full aspect-[3/4] bg-white rounded-lg shadow-md overflow-hidden group">
          <img src="${imgUrl}" alt="PDF Preview" class="w-full h-full object-contain">
          <div class="card-number absolute top-2 left-2 bg-[#7100ad] text-white text-xs font-bold flex items-center justify-center w-6 h-6 rounded-full shadow">
            ${visualIndex}
          </div>
        </div>
        <div class="mt-2 text-center text-sm text-gray-700 truncate px-2">
          ${fileName}
        </div>
      </div>`;

    cardsContainer.insertAdjacentHTML('beforeend', cardHTML);
    const wrapper = cardsContainer.lastElementChild;
    requestAnimationFrame(() => wrapper.classList.remove('opacity-0'));
  } catch (err) {
    console.error('PDF Render Error:', err);
    alert('Failed to render PDF.');
    data = [];
    cardsContainer.innerHTML = '';
  }
}

/* ---------------------------------------------------------
   Render Image Card (with name below, CSS rotation)
   --------------------------------------------------------- */
async function renderImageCard(item, visualIndex) {
  const imgUrl = URL.createObjectURL(item.file);
  item.previewUrl = imgUrl; // Store for later revoke
  const fileName = item.file.name;

  const cardHTML = `
    <div class="card-wrapper opacity-0 transition-opacity rounded-lg duration-500" data-index="${visualIndex}">
      <div class="card image-card cursor-move relative w-full aspect-[3/4] bg-white rounded-lg shadow-md overflow-hidden group">
        <img src="${imgUrl}" alt="${fileName}" class="w-full h-full object-contain" style="transform: rotate(${item.rotation}deg);">
        <div class="card-number absolute top-2 left-2 bg-[#7100ad] text-white text-xs font-bold flex items-center justify-center w-6 h-6 rounded-full shadow">
          ${visualIndex}
        </div>

        <button class="cancel-btn absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-gray-100">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[#7100ad]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <button class="rotate-btn absolute bottom-2 right-2 bg-[#7100ad] rounded-full p-1 shadow-sm opacity-100 md:opacity-0 md:group-hover:opacity-100 hover:bg-[#5a008a] focus:outline-none focus:ring-2 focus:ring-[#7100ad]">
						<svg fill="#ffffff" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 486.805 486.805" class="h-3.5 w-3.5" transform="matrix(-1,0,0,1,0,0)rotate(180)">
							<path d="M261.397,17.983c-88.909,0-167.372,51.302-203.909,129.073L32.072,94.282L0,109.73l52.783,109.565l109.565-52.786l-15.451-32.066L89.82,161.934c30.833-65.308,96.818-108.353,171.577-108.353c104.668,0,189.818,85.154,189.818,189.821s-85.15,189.824-189.818,189.824c-61.631,0-119.663-30.109-155.228-80.539l-29.096,20.521c42.241,59.87,111.143,95.613,184.324,95.613c124.286,0,225.407-101.122,225.407-225.419S385.684,17.983,261.397,17.983z"></path>
						</svg>
					</button>

        
      </div>
      <div class="mt-2 text-center text-sm text-gray-700 truncate px-2">
        ${fileName}
      </div>
    </div>`;

  cardsContainer.insertAdjacentHTML('beforeend', cardHTML);
  const wrapper = cardsContainer.lastElementChild;
  requestAnimationFrame(() => wrapper.classList.remove('opacity-0'));
}

/* ---------------------------------------------------------
   Sortable – only allow dragging image cards
   --------------------------------------------------------- */
new Sortable(cardsContainer, {
  animation: 300,
  ghostClass: 'sortable-ghost',
  filter: '.pdf-card',
  delay: isTouchDevice() ? 200 : 0,
  delayOnTouchOnly: true,
  onSort: () => {
    const wrappers = Array.from(cardsContainer.querySelectorAll('.card-wrapper'));
    const newData = [];

    wrappers.forEach((wrapper, newIndex) => {
      const card = wrapper.querySelector('.card');
      const oldIndex = parseInt(card.dataset.index) - 1;
      const item = data[oldIndex];
      if (item) {
        newData.push(item);
        card.dataset.index = newIndex + 1;
      }
    });

    data = newData;
    updateCardNumbers();
    logData();
  }
});

/* ---------------------------------------------------------
   Cancel & Rotate (CSS only)
   --------------------------------------------------------- */
cardsContainer.addEventListener('click', async e => {
  const cancelBtn = e.target.closest('.cancel-btn');
  const rotateBtn = e.target.closest('.rotate-btn');

  if (cancelBtn) {
    const wrapper = cancelBtn.closest('.card-wrapper');
    const card = cancelBtn.closest('.card');
    if (!card || card.classList.contains('pdf-card')) return;

    const index = parseInt(card.dataset.index) - 1;
    const item = data[index];
    const img = card.querySelector('img');

    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }

    wrapper.style.opacity = '0';
    setTimeout(() => {
      wrapper.remove();
      data.splice(index, 1);
      updateCardNumbers();
      logData();
    }, 500);
  }

  if (rotateBtn) {
    const card = rotateBtn.closest('.card');
    if (!card || card.classList.contains('pdf-card')) return;

    const index = parseInt(card.dataset.index) - 1;
    const item = data[index];
    if (!item || item.type !== "image") return;

    item.rotation = (item.rotation + 90) % 360;

    const img = card.querySelector('img');
    img.style.transform = `rotate(${item.rotation}deg)`;

    logData();
  }
});

/* ---------------------------------------------------------
   Convert – Compress unrotated originals, send rotation metadata
   --------------------------------------------------------- */
async function handleConvert() {
  const pdfItem = data.find(d => d.type === "pdf");
  
  if (data.length < 2) {
    alert('There must be at least one image to Perform Operation');
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

  closeDrawer();

  const formData = new FormData();
  const imageItems = data.filter(d => d.type === "image");

  const compressedImages = await Promise.all(
    imageItems.map(async (item) => {
      return new Promise((resolve, reject) => {
        new Compressor(item.file, {
          quality: 0.4,
          success(blob) {
            const compressedFile = new File([blob], item.file.name, { type: blob.type });
            resolve({ file: compressedFile, rotation: item.rotation });
          },
          error: reject
        });
      });
    })
  );

  const pages = [];
  data.forEach((item, index) => {
    if (item.type === "pdf") {
      pages.push({ file: item.file, type: "pdf", rotation: 0, index: index + 1 });
    } else {
      const imgData = compressedImages.shift();
      pages.push({ file: imgData.file, type: "image", rotation: imgData.rotation, index: index + 1 });
    }
  });

  pages.forEach((page, i) => {
    formData.append(`pages[${i}][file]`, page.file);
    formData.append(`pages[${i}][type]`, page.type);
    formData.append(`pages[${i}][index]`, page.index);
    formData.append(`pages[${i}][rotation]`, page.rotation);
  });

  formData.append('settings', JSON.stringify(state));

  try {
    const response = await fetch('/addPagesToPDF', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error(`Server error: ${response.status}`);
    if (response.redirected) window.location.href = response.url;
  } catch (err) {
    console.error('Add Pages failed:', err);
    document.getElementById('spinnerContainer')?.remove();
    alert('Failed to add pages to PDF. Please try again.');
  }
}

convertBtn?.addEventListener('click', handleConvert);

/* ---------------------------------------------------------
   Drawer & Settings (unchanged)
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

function syncRadioButtons(name, value) {
  document.querySelectorAll(`input[name="${name}"], input[name="${name}Mobile"]`).forEach(radio => {
    radio.checked = radio.value === value;
    const label = radio.nextElementSibling;
    if (radio.checked) label?.classList.add('checked');
    else label?.classList.remove('checked');
  });
}

function updateUI() {
  const show = state.pageSize === 'a4' || state.pageSize === 'usletter';
  document.getElementById('orientationCardDesktop')?.classList.toggle('hidden', !show);
  document.getElementById('orientationCardMobile')?.classList.toggle('hidden', !show);
}

function initializeRadioListeners() {
  document.querySelectorAll('input[name="pageSize"], input[name="pageSizeMobile"], input[name="orientation"], input[name="orientationMobile"], input[name="margin"], input[name="marginMobile"]').forEach(radio => {
    radio.addEventListener('change', e => {
      const name = e.target.name.replace('Mobile', '');
      state[name] = e.target.value;
      syncRadioButtons(name, state[name]);
      if (name === 'pageSize') updateUI();
    });
  });
}

window.getPageSettings = () => ({ ...state });

function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

if (isTouchDevice()) {
  cardsContainer.addEventListener('contextmenu', e => {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });
}

imageInput.addEventListener('change', handleFileSelect);

document.addEventListener('DOMContentLoaded', () => {
  initializeRadioListeners();
  updateUI();
  console.log('PDF + Images Editor with Names Below Cards Ready');
});