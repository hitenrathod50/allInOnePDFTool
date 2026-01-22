// Header functionality
class Header {
    constructor() {
        this.isMobileMenuOpen = false;
        this.isDesktopSubmenuOpen = false;
        this.isMobileSubmenuOpen = false;
        this.focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

        this.initElements();
        this.bindEvents();
    }

    initElements() {
        // Mobile menu elements
        this.mobileMenuButton = document.getElementById('mobile-menu-button');
        this.mobileOverlay = document.getElementById('mobile-overlay');
        this.mobileDrawer = document.getElementById('mobile-drawer');
        this.drawerCloseButton = document.getElementById('drawer-close-button');
        this.hamburgerIcon = document.getElementById('hamburger-icon');

        // Desktop submenu elements
        this.desktopSubmenuContainer = document.getElementById('desktop-submenu-container');
        this.desktopSubmenuTrigger = document.getElementById('desktop-submenu-trigger');
        this.desktopSubmenu = document.getElementById('desktop-submenu');
        this.desktopChevron = document.getElementById('desktop-chevron');

        // Mobile submenu elements
        this.mobileSubmenuTrigger = document.getElementById('mobile-submenu-trigger');
        this.mobileSubmenu = document.getElementById('mobile-submenu');
        this.mobileChevron = document.getElementById('mobile-chevron');
    }

    bindEvents() {
        // Mobile menu events
        this.mobileMenuButton.addEventListener('click', () => this.toggleMobileMenu());
        this.drawerCloseButton.addEventListener('click', () => this.closeMobileMenu());
        this.mobileOverlay.addEventListener('click', () => this.closeMobileMenu());

        // Desktop submenu events
        this.desktopSubmenuContainer.addEventListener('mouseenter', () => this.openDesktopSubmenu());
        this.desktopSubmenuContainer.addEventListener('mouseleave', () => this.closeDesktopSubmenu());

        // Mobile submenu events
        this.mobileSubmenuTrigger.addEventListener('click', () => this.toggleMobileSubmenu());

        // Keyboard events
        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Close submenu when clicking outside
        document.addEventListener('click', (e) => this.handleOutsideClick(e));

        // Close all links in mobile drawer
        this.mobileDrawer.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => this.closeMobileMenu());
        });
    }

    toggleMobileMenu() {
        if (this.isMobileMenuOpen) {
            this.closeMobileMenu();
        } else {
            this.openMobileMenu();
        }
    }

    openMobileMenu() {
        this.isMobileMenuOpen = true;
        document.body.style.overflow = 'hidden';

        // Show overlay
        this.mobileOverlay.classList.remove('invisible', 'opacity-0');
        this.mobileOverlay.classList.add('animate-fade-in');

        // Show drawer
        this.mobileDrawer.classList.remove('translate-x-full');
        this.mobileDrawer.classList.add('animate-drawer-in');

        // Update button state
        this.mobileMenuButton.setAttribute('aria-expanded', 'true');
        this.mobileMenuButton.setAttribute('aria-label', 'Close menu');
        this.hamburgerIcon.classList.add('hamburger-active');

        // Focus trap
        this.setupFocusTrap();
    }

    closeMobileMenu() {
        this.isMobileMenuOpen = false;
        document.body.style.overflow = 'unset';

        // Hide overlay
        this.mobileOverlay.classList.remove('animate-fade-in');
        this.mobileOverlay.classList.add('animate-fade-out');
        setTimeout(() => {
            this.mobileOverlay.classList.add('invisible', 'opacity-0');
            this.mobileOverlay.classList.remove('animate-fade-out');
        }, 300);

        // Hide drawer
        this.mobileDrawer.classList.remove('animate-drawer-in');
        this.mobileDrawer.classList.add('animate-drawer-out');
        setTimeout(() => {
            this.mobileDrawer.classList.add('translate-x-full');
            this.mobileDrawer.classList.remove('animate-drawer-out');
        }, 300);

        // Update button state
        this.mobileMenuButton.setAttribute('aria-expanded', 'false');
        this.mobileMenuButton.setAttribute('aria-label', 'Open menu');
        this.hamburgerIcon.classList.remove('hamburger-active');

        // Return focus to hamburger button
        this.mobileMenuButton.focus();

        // Close mobile submenu if open
        if (this.isMobileSubmenuOpen) {
            this.closeMobileSubmenu();
        }
    }

    openDesktopSubmenu() {
        this.isDesktopSubmenuOpen = true;
        this.desktopSubmenu.classList.remove('opacity-0', 'invisible');
        this.desktopSubmenu.classList.add('animate-dropdown-in');
        this.desktopChevron.style.transform = 'rotate(180deg)';
        this.desktopSubmenuTrigger.setAttribute('aria-expanded', 'true');
    }

    closeDesktopSubmenu() {
        this.isDesktopSubmenuOpen = false;
        this.desktopSubmenu.classList.add('opacity-0', 'invisible');
        this.desktopSubmenu.classList.remove('animate-dropdown-in');
        this.desktopChevron.style.transform = 'rotate(0deg)';
        this.desktopSubmenuTrigger.setAttribute('aria-expanded', 'false');
    }

    toggleMobileSubmenu() {
        if (this.isMobileSubmenuOpen) {
            this.closeMobileSubmenu();
        } else {
            this.openMobileSubmenu();
        }
    }

    openMobileSubmenu() {
        this.isMobileSubmenuOpen = true;
        this.mobileSubmenu.classList.remove('submenu-collapsed');
        this.mobileSubmenu.classList.add('submenu-expanded');
        this.mobileChevron.style.transform = 'rotate(180deg)';
        this.mobileSubmenuTrigger.setAttribute('aria-expanded', 'true');
    }

    closeMobileSubmenu() {
        this.isMobileSubmenuOpen = false;
        this.mobileSubmenu.classList.remove('submenu-expanded');
        this.mobileSubmenu.classList.add('submenu-collapsed');
        this.mobileChevron.style.transform = 'rotate(0deg)';
        this.mobileSubmenuTrigger.setAttribute('aria-expanded', 'false');
    }

    handleKeydown(e) {
        if (e.key === 'Escape') {
            if (this.isMobileMenuOpen) {
                this.closeMobileMenu();
            }
            if (this.isDesktopSubmenuOpen) {
                this.closeDesktopSubmenu();
            }
        }
    }

    handleOutsideClick(e) {
        if (this.isDesktopSubmenuOpen &&
            !this.desktopSubmenuContainer.contains(e.target)) {
            this.closeDesktopSubmenu();
        }
    }

    setupFocusTrap() {
        const focusableEls = this.mobileDrawer.querySelectorAll(this.focusableElements);
        const firstFocusableEl = focusableEls[0];
        const lastFocusableEl = focusableEls[focusableEls.length - 1];

        const handleTabKey = (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusableEl) {
                        lastFocusableEl.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastFocusableEl) {
                        firstFocusableEl.focus();
                        e.preventDefault();
                    }
                }
            }
        };

        // Store the handler so we can remove it later
        this.tabKeyHandler = handleTabKey;
        document.addEventListener('keydown', this.tabKeyHandler);

        // Focus the first element
        if (firstFocusableEl) {
            firstFocusableEl.focus();
        }

        // Clean up when drawer closes
        setTimeout(() => {
            if (!this.isMobileMenuOpen && this.tabKeyHandler) {
                document.removeEventListener('keydown', this.tabKeyHandler);
                this.tabKeyHandler = null;
            }
        }, 350);
    }
}

// Initialize header when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Header();
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
        // Close mobile menu if window becomes larger
        const header = window.headerInstance;
        if (header && header.isMobileMenuOpen) {
            header.closeMobileMenu();
        }
    }
});