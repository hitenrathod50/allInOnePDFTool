// ===============================
// Elements
// ===============================
const plusIconImagePicker = document.getElementById('addCardBtn');
const settingsBtn        = document.getElementById('settingsBtn');
const drawer             = document.getElementById('drawer');
const convertBtn         = document.getElementById('convertBtn');
const drawerOverlay      = document.getElementById('drawerOverlay');
const drawerClose        = document.getElementById('drawerClose');
const excelFileInput     = document.getElementById('excelFileInput');
const cardsContainer     = document.getElementById('cardsContainerExcel');

// ===============================
// Global State
// ===============================
let excelArray = [];
let mergeIntoSingle = false;

// ===============================
// Utils
// ===============================
function isTouchDevice() {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Disable long-press menu on mobile
if (isTouchDevice()) {
  cardsContainer.addEventListener('contextmenu', e => {
    if (e.target.tagName === 'IMG') e.preventDefault();
  });
}

// ===============================
// File Picker
// ===============================
plusIconImagePicker?.addEventListener('click', () => excelFileInput.click());

// ===============================
// Card Number Update
// ===============================
function updateCardNumbers() {
  cardsContainer.querySelectorAll('.card-wrapper').forEach((wrapper, i) => {
    const badge = wrapper.querySelector('.card-number');
    if (badge) badge.textContent = i + 1;
  });
}

// ===============================
// Debug
// ===============================
function logExcelArray() {
  console.clear();
  console.table(excelArray.map(i => ({ name: i.name, id: i.id })));
}

// ===============================
// ✅ SAFE CARD RENDER (NO OPACITY BUG)
// ===============================
function renderExcelCard(excelFile, cardId) {
  const wrapper = document.createElement('div');
  wrapper.className =
    'card-wrapper opacity-0 transition-opacity duration-300 rounded-lg';
  wrapper.dataset.id = cardId;

  wrapper.innerHTML = `
    <div class="card excel-card cursor-move
                w-full h-[220px]
                bg-white rounded-lg shadow-md
                flex items-center justify-center
                relative group">

      <img src="/images/excel_file.svg"
           class="w-20 h-20 object-contain pointer-events-none"
           alt="Excel file"/>

      <div class="card-number absolute top-2 left-2 bg-[#7100ad] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow">
        ${cardsContainer.children.length + 1}
      </div>

      <button class="cancel-btn absolute top-2 right-2
                     bg-white rounded-full p-1 shadow-sm
                     opacity-100 md:opacity-0 md:group-hover:opacity-100
                     hover:bg-gray-100">
       <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[#7100ad]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
      </button>
    </div>

    <div class="mt-2 text-center text-sm text-gray-700 truncate px-2">
      ${excelFile.name}
    </div>
  `;

  cardsContainer.appendChild(wrapper);

  requestAnimationFrame(() => {
    wrapper.classList.remove('opacity-0');
  });
}

// ===============================
// File Select
// ===============================
function handleFileSelect(e) {
  const files = [...e.target.files].filter(f =>
    /\.(xlsx|xls)$/i.test(f.name)
  );

  if (!files.length) {
    alert('Please select Excel files (.xlsx or .xls)');
    return;
  }

  e.target.value = '';

  document.getElementById('pickExcelContainer')?.classList.add('hidden');
  document.getElementById('excelToPDFEnableContainer')?.classList.remove('hidden');

  files.forEach(file => {
    const id = `excel-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    excelArray.push({ file, name: file.name, id });
    renderExcelCard(file, id);
  });

  updateCardNumbers();
  logExcelArray();
}

excelFileInput?.addEventListener('change', handleFileSelect);

// ===============================
// Merge Toggle
// ===============================
document.querySelectorAll('#mergePDF, #mergePDFMobile').forEach(cb => {
  cb.addEventListener('change', e => {
    mergeIntoSingle = e.target.checked;
    document.querySelectorAll('#mergePDF, #mergePDFMobile')
      .forEach(x => (x.checked = mergeIntoSingle));
  });
});

// ===============================
// Delete Card
// ===============================
cardsContainer.addEventListener('click', e => {
  const btn = e.target.closest('.cancel-btn');
  if (!btn) return;

  const wrapper = btn.closest('.card-wrapper');
  const id = wrapper.dataset.id;

  wrapper.classList.add('opacity-0');

  setTimeout(() => {
    wrapper.remove();
    excelArray = excelArray.filter(i => i.id !== id);
    updateCardNumbers();
    logExcelArray();

    if (!excelArray.length) {
      document.getElementById('pickExcelContainer')?.classList.remove('hidden');
      document.getElementById('excelToPDFEnableContainer')?.classList.add('hidden');
    }
  }, 300);
});

// ===============================
// Drag & Drop
// ===============================
new Sortable(cardsContainer, {
  animation: 200,
  handle: '.card',
  ghostClass: 'sortable-ghost',
  chosenClass: 'sortable-chosen',
  dragClass: 'sortable-drag',
  delay: isTouchDevice() ? 200 : 0,
  delayOnTouchOnly: true,
  onSort: () => {
    excelArray = [...cardsContainer.querySelectorAll('.card-wrapper')]
      .map(w => excelArray.find(i => i.id === w.dataset.id))
      .filter(Boolean);

    updateCardNumbers();
    logExcelArray();
  }
});

// ===============================
// Convert → Backend
// ===============================
async function handleConvert() {
  if (!excelArray.length) {
    alert('Add at least one Excel document');
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
  excelArray.forEach((item, i) =>
    formData.append(`files[${i}]`, item.file)
  );
  formData.append('mergeIntoSingle', JSON.stringify(mergeIntoSingle));

  try {
    const res = await fetch('/excelTOPDFPost', {
      method: 'POST',
      body: formData
    });

    if (res.status === 413) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || 'File size is too large. Max allowed is 30MB.');
      return;
    }

    if (!res.ok) throw new Error(res.status);
    if (res.redirected) window.location.href = res.url;

  } catch (err) {
    alert('Conversion failed');
    console.error(err);
  } finally {
    spinner.remove();
  }
}

convertBtn?.addEventListener('click', handleConvert);

// ===============================
// Drawer Controls
// ===============================
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
  if (e.key === 'Escape' && drawer.classList.contains('translate-x-0')) {
    closeDrawer();
  }
});