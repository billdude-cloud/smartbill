// ============================================
// SMARTBILL CURRENCY MANAGER
// ============================================

// Supported currencies with their exchange rate (1 unit of this currency = ? KES)
// Example: 1 USD = 129.5 KES, so rate = 129.5
const SUPPORTED_CURRENCIES = [
    { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', flag: '🇰🇪', rate: 1 },
    { code: 'USD', name: 'US Dollar', symbol: '$', flag: '🇺🇸', rate: 129.5 },
    { code: 'EUR', name: 'Euro', symbol: '€', flag: '🇪🇺', rate: 140.2 },
    { code: 'GBP', name: 'British Pound', symbol: '£', flag: '🇬🇧', rate: 164.8 },
    { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh', flag: '🇺🇬', rate: 0.035 },  // 1 UGX = 0.035 KES
    { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', flag: '🇹🇿', rate: 0.051 },
    { code: 'ZAR', name: 'South African Rand', symbol: 'R', flag: '🇿🇦', rate: 7.2 }
];

let currentCurrency = 'KES';

// ============================================
// CONVERSION FUNCTIONS
// ============================================

// Convert amount from KES to the current currency
function convertFromKES(amountKES) {
    const targetCurrency = SUPPORTED_CURRENCIES.find(c => c.code === currentCurrency);
    if (!targetCurrency) return amountKES;
    // For KES to other currency: divide by the rate (because rate is how many KES per 1 unit)
    // Example: 129.5 KES / 129.5 = 1 USD
    return amountKES / targetCurrency.rate;
}

// Convert amount from any currency to KES
function convertToKES(amount, fromCurrency) {
    const source = SUPPORTED_CURRENCIES.find(c => c.code === fromCurrency);
    if (!source) return amount;
    // Multiply by the rate (e.g., 1 USD * 129.5 = 129.5 KES)
    return amount * source.rate;
}

// Format amount with current currency
function formatAmount(amountKES) {
    const converted = convertFromKES(amountKES);
    const currency = SUPPORTED_CURRENCIES.find(c => c.code === currentCurrency);
    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency: currentCurrency,
        minimumFractionDigits: 2
    }).format(converted).replace(currentCurrency, currency?.symbol || currentCurrency);
}

// ============================================
// UI FUNCTIONS
// ============================================

function populateCurrencyDropdown() {
    const container = document.getElementById('currencyList');
    if (!container) return;
    container.innerHTML = '';
    SUPPORTED_CURRENCIES.forEach(curr => {
        const item = document.createElement('div');
        item.className = `currency-item ${curr.code === currentCurrency ? 'active' : ''}`;
        item.innerHTML = `
            <span class="currency-flag">${curr.flag}</span>
            <div class="currency-info">
                <span class="currency-code">${curr.code}</span>
                <span class="currency-name">${curr.name}</span>
            </div>
            <span class="currency-symbol">${curr.symbol}</span>
        `;
        item.onclick = () => changeCurrency(curr.code);
        container.appendChild(item);
    });
}

function updateCurrencyDisplay() {
    const curr = SUPPORTED_CURRENCIES.find(c => c.code === currentCurrency);
    const flagEl = document.getElementById('selectedCurrencyFlag');
    const codeEl = document.getElementById('selectedCurrencyCode');
    if (flagEl) flagEl.textContent = curr.flag;
    if (codeEl) codeEl.textContent = curr.code;
}

function refreshAllAmounts() {
    document.querySelectorAll('[data-amount-kes]').forEach(el => {
        const kes = parseFloat(el.getAttribute('data-amount-kes'));
        if (!isNaN(kes)) {
            el.textContent = formatAmount(kes);
        }
    });
    // Also scan for common amount classes
    document.querySelectorAll('.stat-number, .bill-amount, .activity-amount, .highlight-value').forEach(el => {
        const text = el.textContent;
        const match = text.match(/[\d,]+\.?\d*/);
        if (match) {
            const raw = parseFloat(match[0].replace(/,/g, ''));
            if (!isNaN(raw)) {
                // Assume it's in KES; we need to store it
                if (!el.hasAttribute('data-amount-kes')) {
                    el.setAttribute('data-amount-kes', raw);
                }
                const kes = parseFloat(el.getAttribute('data-amount-kes'));
                el.textContent = formatAmount(kes);
            }
        }
    });
}

function changeCurrency(currencyCode) {
    if (currencyCode === currentCurrency) return;
    currentCurrency = currencyCode;
    localStorage.setItem('preferredCurrency', currencyCode);
    updateCurrencyDisplay();
    populateCurrencyDropdown();
    refreshAllAmounts();

    if (typeof showToast === 'function') {
        const curr = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode);
        showToast(`Currency changed to ${curr.symbol} ${curr.code}`, 'success');
    }
}

function toggleCurrencyDropdown() {
    const dropdown = document.getElementById('currencyDropdown');
    if (dropdown) dropdown.classList.toggle('show');
}

function closeCurrencyDropdown() {
    const dropdown = document.getElementById('currencyDropdown');
    if (dropdown) dropdown.classList.remove('show');
}

// ============================================
// INITIALIZATION
// ============================================
function initCurrencyManager() {
    const saved = localStorage.getItem('preferredCurrency');
    if (saved && SUPPORTED_CURRENCIES.some(c => c.code === saved)) {
        currentCurrency = saved;
    }
    updateCurrencyDisplay();
    populateCurrencyDropdown();
    refreshAllAmounts();
    console.log('💱 Currency manager initialized:', currentCurrency);
}

document.addEventListener('DOMContentLoaded', initCurrencyManager);
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('currencyDropdown');
    const selector = document.querySelector('.currency-selector');
    if (dropdown && selector && !selector.contains(e.target)) {
        closeCurrencyDropdown();
    }
});

// Expose for inline onclick
window.changeCurrency = changeCurrency;
window.toggleCurrencyDropdown = toggleCurrencyDropdown;
window.formatAmount = formatAmount;