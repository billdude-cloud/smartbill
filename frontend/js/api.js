// ============================================
// API CONFIGURATION
// ============================================

// Detect environment and set API base URL
const API_BASE = (() => {
    // Check if running locally
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '') {
        return 'http://localhost:5000/api';
    }
    // For production (if you deploy later)
    return 'https://smartbill.onrender.com/api';
})();

console.log('🔧 API_BASE:', API_BASE);

// ============================================
// HELPER FUNCTIONS
// ============================================

// Generic API request function
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, mergedOptions);
        const data = await response.json();
        
        if (!response.ok) {
            throw { status: response.status, message: data.error || 'API request failed', data };
        }
        
        return { success: true, data };
    } catch (error) {
        console.error(`API Error (${endpoint}):`, error);
        if (error.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (!window.location.pathname.includes('login.html') && 
                !window.location.pathname.includes('signup.html')) {
                window.location.href = 'login.html';
            }
        }
        return {
            success: false,
            error: error.message || 'Network error',
            status: error.status,
            data: error.data || null
        };
    }
}

// ============================================
// AUTH ENDPOINTS
// ============================================

// Register a new user
async function register(name, email, password) {
    const result = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name, email, password })
    });
    
    if (result.success) {
        // Save token and user data
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
    }
    
    return result;
}

// Login user
async function login(email, password) {
    const result = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    
    if (result.success) {
        // Save token and user data
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
    }
    
    return result;
}

// Logout user
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'index.html';
}

// Check if user is logged in
function isAuthenticated() {
    const token = localStorage.getItem('token');
    return !!token;
}

// Get current user
function getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
}

// ============================================
// USER PROFILE ENDPOINTS
// ============================================

// Get user profile
async function getProfile() {
    return apiRequest('/profile');
}

// Update user profile
async function updateProfile(name) {
    return apiRequest('/profile', {
        method: 'PUT',
        body: JSON.stringify({ name })
    });
}

// Change password
async function changePassword(currentPassword, newPassword) {
    return apiRequest('/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword })
    });
}

// ============================================
// GROUPS ENDPOINTS
// ============================================

// Get all groups for current user
async function getGroups() {
    return apiRequest('/groups');
}

// Get single group details
async function getGroup(groupId) {
    return apiRequest(`/groups/${groupId}`);
}

// Create a new group
async function createGroup(name, description = '') {
    return apiRequest('/groups', {
        method: 'POST',
        body: JSON.stringify({ name, description })
    });
}

// Join a group with invite code
async function joinGroup(inviteCode) {
    return apiRequest('/groups/join', {
        method: 'POST',
        body: JSON.stringify({ invite_code: inviteCode })
    });
}

// Add member to group (registered user)
async function addGroupMember(groupId, email) {
    return apiRequest(`/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ email })
    });
}

// Add name-only member to group
async function addNameOnlyMember(groupId, name) {
    return apiRequest(`/groups/${groupId}/name-members`, {
        method: 'POST',
        body: JSON.stringify({ name })
    });
}

// Remove member from group
async function removeGroupMember(groupId, userId) {
    return apiRequest(`/groups/${groupId}/members/${userId}`, {
        method: 'DELETE'
    });
}

// Delete group
async function deleteGroup(groupId) {
    return apiRequest(`/groups/${groupId}`, {
        method: 'DELETE'
    });
}

// ============================================
// BILLS ENDPOINTS
// ============================================

// Get all bills for current user
async function getBills(groupId = null) {
    const url = groupId ? `/bills?group_id=${groupId}` : '/bills';
    return apiRequest(url);
}

// Get single bill details
async function getBill(billId) {
    return apiRequest(`/bills/${billId}`);
}

// Create a new bill
async function createBill(groupId, title, description, items, tax = 0, tip = 0) {
    const billData = {
        group_id: groupId,
        title,
        description: description || '',
        items: items.map(item => ({
            name: item.name,
            amount: parseFloat(item.amount),
            quantity: item.quantity || 1
        })),
        tax: parseFloat(tax) || 0,
        tip: parseFloat(tip) || 0
    };
    
    return apiRequest('/bills', {
        method: 'POST',
        body: JSON.stringify(billData)
    });
}

// Update bill
async function updateBill(billId, title, total, status) {
    return apiRequest(`/bills/${billId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, total, status })
    });
}

// Delete bill
async function deleteBill(billId) {
    return apiRequest(`/bills/${billId}`, {
        method: 'DELETE'
    });
}

// Get payment status for a bill
async function getBillPaymentStatus(billId) {
    return apiRequest(`/bills/${billId}/payment-status`);
}

// ============================================
// PAYMENTS ENDPOINTS
// ============================================

// Record a payment
async function recordPayment(billId, amount, method = 'cash', notes = '') {
    return apiRequest('/payments', {
        method: 'POST',
        body: JSON.stringify({ bill_id: billId, amount, method, notes })
    });
}

// Get payment summary
async function getPaymentSummary() {
    return apiRequest('/payments/summary');
}

// Send payment reminders
async function sendPaymentReminder(billId, userId = null) {
    const body = userId ? { user_id: userId } : {};
    return apiRequest(`/bills/${billId}/reminders`, {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

// ============================================
// DASHBOARD ENDPOINTS
// ============================================

// Get dashboard summary
async function getDashboardSummary() {
    return apiRequest('/dashboard/summary');
}

// ============================================
// NOTIFICATIONS ENDPOINTS
// ============================================

// Get user notifications
async function getNotifications() {
    return apiRequest('/notifications');
}

// Mark notification as read
async function markNotificationRead(notificationId) {
    return apiRequest(`/notifications/${notificationId}/read`, {
        method: 'PUT'
    });
}

// Mark all notifications as read
async function markAllNotificationsRead() {
    return apiRequest('/notifications/read-all', {
        method: 'PUT'
    });
}

// ============================================
// SPENDING ALERTS
// ============================================

// Check spending alert
async function checkSpendingAlert(monthlyBudget) {
    return apiRequest('/spending-alert', {
        method: 'POST',
        body: JSON.stringify({ monthly_budget: monthlyBudget })
    });
}

// ============================================
// EXPORT FUNCTIONS FOR GLOBAL ACCESS
// ============================================

// Make all functions available globally
window.SmartBillAPI = {
    // Config
    API_BASE,
    
    // Helpers
    apiRequest,
    isAuthenticated,
    getCurrentUser,
    logout,
    
    // Auth
    register,
    login,
    
    // Profile
    getProfile,
    updateProfile,
    changePassword,
    
    // Groups
    getGroups,
    getGroup,
    createGroup,
    joinGroup,
    addGroupMember,
    addNameOnlyMember,
    removeGroupMember,
    deleteGroup,
    
    // Bills
    getBills,
    getBill,
    createBill,
    updateBill,
    deleteBill,
    getBillPaymentStatus,
    
    // Payments
    recordPayment,
    getPaymentSummary,
    sendPaymentReminder,
    
    // Dashboard
    getDashboardSummary,
    
    // Notifications
    getNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    
    // Alerts
    checkSpendingAlert
};

// Log that API is ready
console.log('✅ SmartBill API client loaded');
console.log('📡 Connected to:', API_BASE);
