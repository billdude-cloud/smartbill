// ============================================
// SMARTBILL DARK MODE THEME MANAGER
// Handles theme switching, persistence, and UI updates
// ============================================

(function () {
    // Storage keys
    const LEGACY_STORAGE_KEY = 'smartbill-theme';
    const STORAGE_KEY = 'darkMode';
    
    // Theme constants
    const THEME = {
        DARK: 'dark',
        LIGHT: 'light'
    };
    
    /**
     * Get the user's preferred theme from storage or system preference
     * @returns {string} 'dark' or 'light'
     */
    function getPreferredTheme() {
        // Check saved preference first (new format)
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved === 'enabled') {
            return THEME.DARK;
        }
        if (saved === 'disabled') {
            return THEME.LIGHT;
        }
        
        // Check legacy storage (old format)
        const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacySaved === THEME.DARK || legacySaved === THEME.LIGHT) {
            // Migrate to new format
            localStorage.setItem(STORAGE_KEY, legacySaved === THEME.DARK ? 'enabled' : 'disabled');
            return legacySaved;
        }
        
        // Use system preference as fallback
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return prefersDark ? THEME.DARK : THEME.LIGHT;
    }
    
    /**
     * Apply the selected theme to the document
     * @param {string} theme - 'dark' or 'light'
     */
    function applyTheme(theme) {
        // Update body class
        document.body.classList.toggle('dark-mode', theme === THEME.DARK);
        
        // Update theme meta tag for mobile browsers
        updateThemeMetaTag(theme);
        
        // Update toggle button icon and text
        updateToggleButton(theme);
        
        // Dispatch custom event for other components
        const event = new CustomEvent('themeChanged', { 
            detail: { theme: theme, isDark: theme === THEME.DARK }
        });
        document.dispatchEvent(event);
        
        // Log theme change (for debugging)
        if (window.SmartBillDebug && window.SmartBillDebug.enabled) {
            console.log(`🎨 Theme changed to: ${theme} mode`);
        }
    }
    
    /**
     * Update theme color meta tag for mobile browsers
     * @param {string} theme - 'dark' or 'light'
     */
    function updateThemeMetaTag(theme) {
        const themeColors = {
            light: '#ffffff',
            dark: '#1a202c'
        };
        
        let metaThemeColor = document.querySelector('meta[name="theme-color"]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');
            metaThemeColor.setAttribute('name', 'theme-color');
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.setAttribute('content', themeColors[theme] || themeColors.light);
        
        // Also update apple status bar
        let appleStatusBar = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
        if (!appleStatusBar) {
            appleStatusBar = document.createElement('meta');
            appleStatusBar.setAttribute('name', 'apple-mobile-web-app-status-bar-style');
            document.head.appendChild(appleStatusBar);
        }
        appleStatusBar.setAttribute('content', theme === THEME.DARK ? 'black-translucent' : 'default');
    }
    
    /**
     * Update the theme toggle button appearance
     * @param {string} theme - 'dark' or 'light'
     */
    function updateToggleButton(theme) {
        const toggle = document.querySelector('#darkModeToggle, [data-theme-toggle]');
        if (!toggle) return;
        
        // Update icon
        const icon = toggle.querySelector('i');
        if (icon) {
            icon.className = theme === THEME.DARK ? 'fas fa-sun' : 'fas fa-moon';
        } else {
            // Create icon if it doesn't exist
            const newIcon = document.createElement('i');
            newIcon.className = theme === THEME.DARK ? 'fas fa-sun' : 'fas fa-moon';
            toggle.appendChild(newIcon);
        }
        
        // Update ARIA label for accessibility
        toggle.setAttribute('aria-label', theme === THEME.DARK ? 'Switch to light mode' : 'Switch to dark mode');
        toggle.title = theme === THEME.DARK ? 'Switch to light mode' : 'Toggle dark mode';
        
        // Update any text in the button
        if (toggle.querySelector('.theme-text')) {
            toggle.querySelector('.theme-text').textContent = theme === THEME.DARK ? 'Light Mode' : 'Dark Mode';
        }
    }
    
    /**
     * Toggle between dark and light mode
     */
    function toggleTheme() {
        const isDarkMode = document.body.classList.contains('dark-mode');
        const nextTheme = isDarkMode ? THEME.LIGHT : THEME.DARK;
        
        // Save to localStorage (new format)
        localStorage.setItem(STORAGE_KEY, nextTheme === THEME.DARK ? 'enabled' : 'disabled');
        
        // Save legacy format for backward compatibility
        localStorage.setItem(LEGACY_STORAGE_KEY, nextTheme);
        
        // Apply theme
        applyTheme(nextTheme);
        
        // Optional: Play a subtle animation
        const container = document.querySelector('.container');
        if (container && !isDarkMode) {
            container.style.transition = 'background-color 0.3s ease';
            setTimeout(() => {
                container.style.transition = '';
            }, 300);
        }
        
        // Trigger confetti for fun? Only if coming from light to dark? (optional)
        // if (nextTheme === THEME.DARK && typeof showConfetti === 'function') {
        //     setTimeout(() => showConfetti(500, 20), 100);
        // }
    }
    
    /**
     * Create and insert the theme toggle button
     */
    function createToggle() {
        // Check if toggle already exists
        const existingToggle = document.querySelector('#darkModeToggle, [data-theme-toggle]');
        if (existingToggle) {
            // Remove existing listeners to avoid duplicates
            const newToggle = existingToggle.cloneNode(true);
            existingToggle.parentNode?.replaceChild(newToggle, existingToggle);
            newToggle.addEventListener('click', toggleTheme);
            return;
        }
        
        // Create toggle button
        const button = document.createElement('button');
        button.className = 'dark-mode-toggle';
        button.id = 'darkModeToggle';
        button.setAttribute('data-theme-toggle', 'true');
        button.setAttribute('aria-label', 'Toggle dark mode');
        button.title = 'Toggle dark mode';
        button.innerHTML = '<i class="fas fa-moon"></i>';
        button.addEventListener('click', toggleTheme);
        
        // Find best position to insert the button
        const userMenu = document.querySelector('.user-menu');
        const navButtons = document.querySelector('.nav-buttons');
        const currencySelector = document.querySelector('.currency-selector');
        
        if (userMenu) {
            // Insert before logout button or at the beginning
            const logoutBtn = userMenu.querySelector('.logout-btn');
            if (logoutBtn) {
                userMenu.insertBefore(button, logoutBtn);
            } else {
                userMenu.insertBefore(button, userMenu.firstChild);
            }
        } else if (navButtons) {
            navButtons.appendChild(button);
        } else {
            // Fallback: add floating button
            button.classList.add('floating');
            document.body.appendChild(button);
        }
        
        // Add keyboard support (Alt + D)
        document.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === 'd') {
                e.preventDefault();
                toggleTheme();
            }
        });
    }
    
    /**
     * Watch for system theme changes
     */
    function watchSystemTheme() {
        if (!window.matchMedia) return;
        
        const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        
        const handleChange = (e) => {
            // Only change if user hasn't manually set a preference
            const hasUserPreference = localStorage.getItem(STORAGE_KEY) !== null;
            if (!hasUserPreference) {
                const newTheme = e.matches ? THEME.DARK : THEME.LIGHT;
                applyTheme(newTheme);
            }
        };
        
        // Modern browsers
        if (darkModeQuery.addEventListener) {
            darkModeQuery.addEventListener('change', handleChange);
        } 
        // Older browsers
        else if (darkModeQuery.addListener) {
            darkModeQuery.addListener(handleChange);
        }
    }
    
    /**
     * Initialize the theme manager
     */
    function init() {
        // Apply initial theme
        const initialTheme = getPreferredTheme();
        applyTheme(initialTheme);
        
        // Create toggle button
        createToggle();
        
        // Watch for system theme changes
        watchSystemTheme();
        
        // Apply theme again after a short delay (for dynamic content)
        setTimeout(() => {
            const currentTheme = getPreferredTheme();
            if (currentTheme !== initialTheme) {
                applyTheme(currentTheme);
            }
        }, 100);
        
        // Log initialization
        console.log(`🎨 Theme manager initialized. Current theme: ${initialTheme} mode`);
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
    
    // Expose functions globally for manual control
    window.ThemeManager = {
        toggle: toggleTheme,
        setDark: () => applyTheme(THEME.DARK),
        setLight: () => applyTheme(THEME.LIGHT),
        getCurrent: () => document.body.classList.contains('dark-mode') ? THEME.DARK : THEME.LIGHT,
        isDark: () => document.body.classList.contains('dark-mode')
    };
    
    // Also expose toggle function for backward compatibility
    window.toggleTheme = toggleTheme;
})();