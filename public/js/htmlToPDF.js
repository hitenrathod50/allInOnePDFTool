// html-to-pdf.js

// ────────────────────────────────────────────────
// State – contains all settings that will be sent to backend
// ────────────────────────────────────────────────
const state = {
    url:         webURL,
    screen_size: "desktop",     // default value
    pageSize:    "fit",
    orientation: "portrait",
    margin:      "none"
};

// ────────────────────────────────────────────────
// DOM Elements
// ────────────────────────────────────────────────
const elements = {
    // URL input & validation
    urlInput:      document.getElementById('urlInput'),
    validateBtn:   document.getElementById('validateUrlBtn') || document.getElementById('addUrlBtn'),

    // Screen Size (both desktop and mobile)
    screenSizeSelect:     document.querySelector('select[name="screenSize"]'),
    screenSizeMobile:     document.querySelector('select[name="screenSizeMobile"]'),

    // Settings UI
    settingsBtn:   document.getElementById('settingsBtn'),
    drawer:        document.getElementById('drawer'),
    drawerOverlay: document.getElementById('drawerOverlay'),
    drawerClose:   document.getElementById('drawerClose'),

    // Convert button
    convertBtn:    document.getElementById('convertBtn'),

    // Orientation cards
    orientationCardDesktop: document.getElementById('orientationCardDesktop'),
    orientationCardMobile:  document.getElementById('orientationCardMobile'),
};

// ────────────────────────────────────────────────
// Drawer Controls
// ────────────────────────────────────────────────
function openDrawer() {
    elements.drawer?.classList.remove('translate-x-full');
    elements.drawer?.classList.add('translate-x-0');
    elements.drawerOverlay?.classList.remove('opacity-0', 'invisible');
    elements.drawerOverlay?.classList.add('opacity-100');
    document.body.style.overflow = 'hidden';
}

function closeDrawer() {
    elements.drawer?.classList.add('translate-x-full');
    elements.drawer?.classList.remove('translate-x-0');
    elements.drawerOverlay?.classList.add('opacity-0', 'invisible');
    document.body.style.overflow = '';
}

elements.settingsBtn?.addEventListener('click', openDrawer);
elements.drawerClose?.addEventListener('click', closeDrawer);
elements.drawerOverlay?.addEventListener('click', closeDrawer);

// Close drawer with Escape key
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && elements.drawer?.classList.contains('translate-x-0')) {
        closeDrawer();
    }
});

// ────────────────────────────────────────────────
// URL Validation
// ────────────────────────────────────────────────
let isValidUrl = false;

function isValidHttpUrl(string) {
    try {
        const url = new URL(string);
        return url.protocol === "http:" || url.protocol === "https:";
    } catch {
        return false;
    }
}

elements.urlInput?.addEventListener('input', () => {
    isValidUrl = false;
    
    state.url = null;
});

elements.validateBtn?.addEventListener('click', () => {
    const value = elements.urlInput.value.trim();
    if (!value) {
        
        return;
    }

    let fullUrl = value;
    

    if (isValidHttpUrl(fullUrl)) {
        state.url = fullUrl;
        isValidUrl = true;
        
    } else {
        isValidUrl = false;
        state.url = null;
        
    }
});

// ────────────────────────────────────────────────
// Update state from UI
// ────────────────────────────────────────────────
function updateStateFromUI() {
    // Screen size – take from whichever is visible
    state.screen_size = elements.screenSizeSelect?.value ||
                       elements.screenSizeMobile?.value ||
                       "desktop";

    // Page Size
    const pageSizeRadios = document.querySelectorAll('input[name="pageSize"], input[name="pageSizeMobile"]');
    for (const radio of pageSizeRadios) {
        if (radio.checked) {
            state.pageSize = radio.value;
            break;
        }
    }

    // Orientation (only if pageSize is not 'fit')
    if (state.pageSize !== 'fit') {
        const orientationRadios = document.querySelectorAll('input[name="orientation"], input[name="orientationMobile"]');
        for (const radio of orientationRadios) {
            if (radio.checked) {
                state.orientation = radio.value;
                break;
            }
        }
    }

    // Margin
    const marginRadios = document.querySelectorAll('input[name="margin"], input[name="marginMobile"]');
    for (const radio of marginRadios) {
        if (radio.checked) {
            state.margin = radio.value;
            break;
        }
    }
}

// ────────────────────────────────────────────────
// Show/hide orientation section
// ────────────────────────────────────────────────
function updateOrientationVisibility() {
    const show = state.pageSize === 'a4' || state.pageSize === 'usletter';
    elements.orientationCardDesktop?.classList.toggle('hidden', !show);
    elements.orientationCardMobile?.classList.toggle('hidden', !show);
}

// ────────────────────────────────────────────────
// Sync radio buttons (visual checked state)
// ────────────────────────────────────────────────
function syncRadios(name, value) {
    document.querySelectorAll(`input[name="${name}"], input[name="${name}Mobile"]`)
        .forEach(radio => {
            const isChecked = radio.value === value;
            radio.checked = isChecked;
            const label = radio.closest('label') || radio.parentElement;
            if (label) {
                label.classList.toggle('checked', isChecked);
                label.classList.toggle('border-purple-600', isChecked);
                label.classList.toggle('bg-purple-50', isChecked);
            }
        });
}

// ────────────────────────────────────────────────
// Initialize all listeners
// ────────────────────────────────────────────────
function initListeners() {
    // Screen Size (desktop + mobile)
    [elements.screenSizeSelect, elements.screenSizeMobile]
        .filter(el => el)
        .forEach(select => {
            select.addEventListener('change', () => {
                state.screen_size = select.value;
                console.log('Screen size changed to:', state.screen_size);
            });
        });

    // Page Size
    document.querySelectorAll('input[name="pageSize"], input[name="pageSizeMobile"]')
        .forEach(radio => {
            radio.addEventListener('change', e => {
                if (e.target.checked) {
                    state.pageSize = e.target.value;
                    syncRadios('pageSize', state.pageSize);
                    updateOrientationVisibility();
                }
            });
        });

    // Orientation
    document.querySelectorAll('input[name="orientation"], input[name="orientationMobile"]')
        .forEach(radio => {
            radio.addEventListener('change', e => {
                if (e.target.checked) {
                    state.orientation = e.target.value;
                    syncRadios('orientation', state.orientation);
                }
            });
        });

    // Margin
    document.querySelectorAll('input[name="margin"], input[name="marginMobile"]')
        .forEach(radio => {
            radio.addEventListener('change', e => {
                if (e.target.checked) {
                    state.margin = e.target.value;
                    syncRadios('margin', state.margin);
                }
            });
        });
}

// ────────────────────────────────────────────────
// Convert to PDF – send to backend
// ────────────────────────────────────────────────
async function handleConvert() {
    updateStateFromUI();

    if (!state.url || !isValidUrl) {
        alert("Please enter and validate a valid URL first.");
        return;
    }

    // Show loading overlay
    const loading = document.createElement('div');
    loading.id = 'loadingOverlay';
    loading.className = 'fixed inset-0 bg-black/70 flex items-center justify-center z-50';
    loading.innerHTML = `
        <div role="status">
      <svg aria-hidden="true" class="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-purple-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
      </svg>
      <span class="sr-only">Loading...</span>
    </div>
    `;
    document.body.appendChild(loading);

    try {
        const payload = {
            url:         state.url,
            screen_size: state.screen_size,
            page_size:   state.pageSize,
            orientation: state.pageSize === 'fit' ? undefined : state.orientation,
            margin:      state.margin
        };

        console.log('Sending to backend:', payload);

        const response = await fetch('/htmlToPDFPost', {  // ← change to your actual endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`Server error: ${response.status} - ${errorText}`);
        }

        // Handle response (two common patterns)

        // 1. Redirect to download link
        if (response.redirected) {
            window.location.href = response.url;
        }

        

    } catch (err) {
        console.error('PDF generation failed:', err);
        alert('Failed to generate PDF.\n' + (err.message || 'Unknown error'));
    } finally {
        document.getElementById('loadingOverlay')?.remove();
    }
}

elements.convertBtn?.addEventListener('click', handleConvert);

// ────────────────────────────────────────────────
// Initialize everything on page load
// ────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initListeners();

    // Set initial values in UI
    if (elements.screenSizeSelect)   elements.screenSizeSelect.value = state.screen_size;
    if (elements.screenSizeMobile)   elements.screenSizeMobile.value = state.screen_size;

    syncRadios('pageSize',    state.pageSize);
    syncRadios('orientation', state.orientation);
    syncRadios('margin',      state.margin);

    updateOrientationVisibility();

    console.log('HTML to PDF converter initialized');
    console.log('Current state:', { ...state });
});