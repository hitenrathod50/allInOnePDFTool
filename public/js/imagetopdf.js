let imageArray = [];
let cardCounter = 0; // Unique ID for each card
const state = {
	pageSize: 'fit',
	orientation: 'portrait',
	margin: 'none'
};

const settingsBtn = document.getElementById('settingsBtn');
const drawer = document.getElementById('drawer');
const drawerOverlay = document.getElementById('drawerOverlay');
const drawerClose = document.getElementById('drawerClose');
const convertBtn = document.getElementById('convertBtn');
const orientationCardDesktop = document.getElementById('orientationCardDesktop');
const orientationCardMobile = document.getElementById('orientationCardMobile');

const imagePicker = document.getElementById('imageInput');
const plusIconImagePicker = document.getElementById('addCardBtn');
const cardsContainer = document.getElementById('cardsContainer');

function updatePage() {
	const pickImageContainer = document.getElementById('pickImageContainer');
	const imageToPDFEnableContainer = document.getElementById('imageToPDFEnableContainer');

	if (imageArray.length === 0) {
		state.pageSize = 'fit';
		state.orientation = 'portrait';
		state.margin = 'none';

		// Sync UI with reset state
		syncRadioButtons('pageSize', state.pageSize);
		syncRadioButtons('orientation', state.orientation);
		syncRadioButtons('margin', state.margin);
		updateUI();

		pickImageContainer.classList.remove('hidden');
		imageToPDFEnableContainer.classList.add('hidden');
	} else {
		pickImageContainer.classList.add('hidden');
		imageToPDFEnableContainer.classList.remove('hidden');
	}
}

// Update card numbers dynamically
function updateCardNumbers() {
  const wrappers = cardsContainer.querySelectorAll('.card-wrapper');
  wrappers.forEach((wrapper, index) => {
    let badge = wrapper.querySelector('.card-number');
    if (!badge) {
      badge = document.createElement('div');
      badge.className =
        'card-number absolute top-2 left-2 bg-[#7100ad] text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center shadow';
      wrapper.querySelector('.card').appendChild(badge);
    }
    badge.textContent = index + 1;
  });
}


// Detect touch devices
function isTouchDevice() {
	return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

// Prevent long press context menu on images for touch devices
if (isTouchDevice()) {
	cardsContainer.addEventListener('contextmenu', (e) => {
		if (e.target.tagName === 'IMG') e.preventDefault();
	});
}

// Initialize Sortable
new Sortable(cardsContainer, {
	animation: 300,
	ghostClass: 'sortable-ghost',
	chosenClass: 'sortable-chosen',
	dragClass: 'sortable-drag',
	easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
	swapThreshold: 0.65,
	fallbackTolerance: 3,
	forceFallback: false,
	scroll: true,
	delay: isTouchDevice() ? 200 : 0,
	delayOnTouchOnly: true,
	onSort: () => {
		const newOrder = Array.from(cardsContainer.querySelectorAll('.card-wrapper')).map(card => {
			const cardId = card.dataset.id;
			return imageArray.find(file => `card-${file.cardId}` === cardId);
		});
		imageArray = newOrder.filter(file => file !== undefined);
		updateCardNumbers();
		console.log("🔄 Order changed, updated imageArray:", imageArray);
	}
});

plusIconImagePicker.addEventListener('click', () => {
	imagePicker.click();
});

// Function to rotate an image and return a new blob
async function rotateImage(file, rotation) {
	const img = new Image();
	const blobUrl = URL.createObjectURL(file);
	img.src = blobUrl;

	await new Promise(resolve => {
		img.onload = resolve;
	});

	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');

	// Adjust canvas size based on rotation
	if (rotation === 90 || rotation === 270) {
		canvas.width = img.height;
		canvas.height = img.width;
	} else {
		canvas.width = img.width;
		canvas.height = img.height;
	}

	// Translate and rotate
	ctx.translate(canvas.width / 2, canvas.height / 2);
	ctx.rotate((rotation * Math.PI) / 180);
	ctx.drawImage(img, -img.width / 2, -img.height / 2);

	// Convert canvas to blob
	const blob = await new Promise(resolve => {
		canvas.toBlob(resolve, file.type);
	});

	URL.revokeObjectURL(blobUrl);
	return blob;
}

async function addCardOnCardViewSection(files) {

	const newCards = files.map(file => ({
		file,
		cardId: cardCounter++,
		rotation: 0
	}));

	imageArray = [...imageArray, ...newCards];
	updatePage();

	// Progressive rendering: rotate + render one by one
	for (const { file, cardId, rotation } of newCards) {
		// Insert spinner HTML first
		const spinnerHtml = `
  <div class="
   opacity-0 transition-opacity rounded-lg duration-500" data-id="card-${cardId}">
    <div class="card cursor-move relative w-full aspect-[3/4] bg-white rounded-lg shadow-md overflow-hidden group">
      <div role="status" class="flex items-center justify-center w-full h-full">
        <svg aria-hidden="true" class="inline w-8 h-8 text-gray-200 animate-spin fill-black-600"
          viewBox="0 0 100 101">
          <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908Z"
            fill="currentColor"/>
          <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539"
            fill="currentFill"/>
        </svg>
      </div>
    </div>

    <!-- IMAGE NAME -->
    <div class="mt-2 text-center text-sm text-gray-700 truncate px-2">
      ${file.name}
    </div>
  </div>
`;

		cardsContainer.insertAdjacentHTML("beforeend", spinnerHtml);

		// Process image
		// const blob = await rotateImage(file, rotation);
		const imgUrl = URL.createObjectURL(file);

		// Card HTML
		const cardHtml = `
  <div class="card-wrapper opacity-0 transition-opacity rounded-lg duration-500" data-id="card-${cardId}">
    <div class="card cursor-move relative w-full aspect-[3/4] bg-white rounded-lg shadow-md overflow-hidden group">
      <img src="${imgUrl}" alt="${file.name}" class="w-full h-full object-contain">

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

    <!-- IMAGE NAME -->
    <div class="mt-2 text-center text-sm text-gray-700 truncate px-2">
      ${file.name}
    </div>
  </div>
`;


		// Replace spinner with card
		const spinnerCard = cardsContainer.querySelector(`[data-id="card-${cardId}"]`);
		spinnerCard.outerHTML = cardHtml;

		updateCardNumbers();

		// Smooth fade-in for each card
		const newCard = cardsContainer.querySelector(`[data-id="card-${cardId}"]`);
		requestAnimationFrame(() => newCard.classList.remove("opacity-0"));

		// Yield control briefly so UI updates
		await new Promise(r => setTimeout(r, 50));
	}

	console.log("✅ Cards added progressively, updated imageArray:", imageArray);
}



imagePicker.addEventListener('change', (event) => {
	const files = Array.from(event.target.files);
	addCardOnCardViewSection(files);
	imagePicker.value = '';
});

function handleFileSelect(event) {
	const files = Array.from(event.target.files);
	addCardOnCardViewSection(files).then(() => {
		console.log("All cards rendered...");
	});
}

function handleDrop(event) {
	event.preventDefault();
	const files = Array.from(event.dataTransfer.files).filter(file => file.type.startsWith('image/'));
	addCardOnCardViewSection(files);
}

// Handle cancel and rotate button clicks (event delegation)
cardsContainer.addEventListener('click', async (event) => {
	const cancelBtn = event.target.closest('.cancel-btn');
	const rotateBtn = event.target.closest('.rotate-btn');

	if (cancelBtn) {
    const wrapper = cancelBtn.closest('.card-wrapper');
    const id = wrapper.dataset.id;

    wrapper.style.opacity = '0';
    setTimeout(() => {
      wrapper.remove();
      imageArray = imageArray.filter(img => `card-${img.cardId}` !== id);
      updateCardNumbers();
      updatePage();
    }, 300);
  } else if (rotateBtn) {
    const wrapper = rotateBtn.closest('.card-wrapper');
    const card = wrapper.querySelector('.card');
    const img = card.querySelector('img');
    const item = imageArray.find(i => `card-${i.cardId}` === wrapper.dataset.id);

    if (!item) return;

    item.rotation = (item.rotation + 90) % 360;
    img.style.transform = `rotate(${item.rotation}deg)`;
  }
	}
);

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
document.addEventListener('keydown', (e) => {
	if (e.key === 'Escape' && drawer.classList.contains('translate-x-0')) {
		closeDrawer();
	}
});

drawer?.addEventListener('click', (e) => {
	e.stopPropagation();
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

function initializeRadioListeners() {
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
}

async function handleConvert() {

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

	const formData = new FormData();

	// Compression of the images

	try {
		// Compress all images concurrently
		const compressedResults = await Promise.all(
			imageArray.map(async (item, index) => {
				return new Promise((resolve, reject) => {
					// console.log(`Compressing image for cardId ${item.cardId}...`);
					// console.log('Original size:', item.file.size, 'bytes');

					new Compressor(item.file, {
						quality: 0.4, // Compress to 40% quality
						success(compressedBlob) {
							// console.log(`Compressed size for cardId ${item.cardId}:`, compressedBlob.size, 'bytes');
							resolve({
								cardId: item.cardId,
								file: compressedBlob,
								rotation: item.rotation
							});
						},
						error(err) {
							console.error(`Compression error for cardId ${item.cardId}:`, err);
							reject(err);
						}
					});
				});
			})
		);

		// Append compressed images and metadata to FormData
		compressedResults.forEach((result, index) => {
			// Append compressed image file (use unique field names or array-like naming)
			formData.append(`images[${index}][file]`, result.file, `compressed_${result.cardId}.jpg`);
			formData.append(`images[${index}][cardId]`, result.cardId);
			formData.append(`images[${index}][rotation]`, result.rotation);
		});

		formData.append('settings', JSON.stringify(state));

		// Log FormData contents (for debugging, FormData can't be directly logged)
		// console.log('FormData prepared with', compressedResults.length, 'images');

		// Send POST request to /imageToPDF
		const response = await fetch('/imageToPDFPost', {
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
	}

}

convertBtn?.addEventListener('click', handleConvert);

function getSettings() {
	return {
		pageSize: state.pageSize,
		orientation: state.orientation,
		margin: state.margin
	};
}

window.getPageSettings = getSettings;

document.addEventListener('DOMContentLoaded', () => {
	initializeRadioListeners();
	updateUI();
	console.log('Image to PDF Converter initialized');
	console.log('Current settings:', getSettings());
});