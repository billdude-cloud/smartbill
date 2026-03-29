// ============================================
// SMARTBILL ANALYTICS MODULE
// Complete analytics for spending insights, trends, and payment tracking
// ============================================

(function () {
    // ============================================
    // CONFIGURATION
    // ============================================
    const MODULE_API_BASE = typeof API_BASE !== 'undefined' ? API_BASE : '/api';
    
    const CATEGORY_RULES = [
        { name: "Food & Dining", keywords: ["food", "dinner", "lunch", "breakfast", "restaurant", "cafe", "pizza", "burger", "meal", "groceries", "supermarket", "market"] },
        { name: "Rent & Utilities", keywords: ["rent", "electric", "electricity", "water", "gas", "wifi", "internet", "utility", "bill", "power", "hydro"] },
        { name: "Transport", keywords: ["uber", "taxi", "fuel", "bus", "matatu", "transport", "fare", "train", "flight", "travel", "gas"] },
        { name: "Entertainment", keywords: ["movie", "cinema", "game", "party", "concert", "netflix", "show", "bar", "club", "event", "ticket"] },
        { name: "Shopping", keywords: ["shop", "store", "amazon", "mall", "purchase", "supplies", "clothes", "shoes", "electronics"] },
        { name: "Health", keywords: ["doctor", "hospital", "clinic", "pharmacy", "medicine", "health", "gym", "fitness"] },
        { name: "Travel", keywords: ["hotel", "airbnb", "hostel", "trip", "vacation", "travel", "flight", "booking", "resort"] }
    ];
    
    const CHART_COLORS = ["#6366f1", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#64748b", "#ec4899", "#14b8a6", "#f97316"];
    const charts = {};
    let currentCurrency = 'KES';

    // ============================================
    // INITIALIZATION
    // ============================================
    document.addEventListener("DOMContentLoaded", initAnalyticsPage);

    async function initAnalyticsPage() {
        // Check authentication
        if (!localStorage.getItem("token")) {
            window.location.href = "login.html";
            return;
        }

        // Load user data
        loadUserData();
        loadUserAvatar();

        // Initialize currency selector if available
        if (typeof initCurrencySelector === "function" && document.getElementById("currencyList")) {
            initCurrencySelector();
        }

        setStatus("Loading analytics...", "info");

        try {
            // Fetch all required data
            const [bills, groups, paymentSummary] = await Promise.all([
                fetchWithAuth("/bills"),
                fetchWithAuth("/groups"),
                fetchWithAuth("/payments/summary").catch(() => ({ paymentsMade: 0, paymentsReceived: 0 }))
            ]);

            // Fetch payment statuses for all bills
            const paymentStatuses = await fetchPaymentStatuses(Array.isArray(bills) ? bills : []);
            
            // Build analytics data
            const analytics = buildAnalytics(
                Array.isArray(bills) ? bills : [],
                Array.isArray(groups) ? groups : [],
                paymentStatuses,
                paymentSummary || {}
            );

            // Render everything
            renderAnalytics(analytics);
            renderInsights(analytics);
            renderCategoryChart(analytics.categorySeries);
            renderMonthlyTrendChart(analytics.monthlySeries);
            renderOutstandingByGroupChart(analytics.outstandingGroupSeries);
            renderTopCreatorsChart(analytics.creatorSeries);

            // Update status
            if (!analytics.bills.length) {
                setStatus("No bills yet. Create a bill to unlock deeper analytics.", "info");
            } else {
                hideStatus();
            }
        } catch (error) {
            console.error("Analytics load failed:", error);
            setStatus("Analytics could not be loaded right now. Please try again in a moment.", "error");
        }
    }

    // ============================================
    // API HELPERS
    // ============================================
    async function fetchWithAuth(path) {
        const response = await fetch(`${MODULE_API_BASE}${path}`, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                localStorage.clear();
                window.location.href = "login.html";
                throw new Error("Session expired");
            }
            throw new Error(`Request failed: ${path} - ${response.status}`);
        }

        return response.json();
    }

    async function fetchPaymentStatuses(bills) {
        const entries = await Promise.all(
            bills.map(async (bill) => {
                try {
                    const statuses = await fetchWithAuth(`/bills/${bill.id}/payment-status`);
                    return [bill.id, Array.isArray(statuses) ? statuses : []];
                } catch (error) {
                    console.error(`Failed to load payment status for bill ${bill.id}:`, error);
                    return [bill.id, []];
                }
            })
        );

        return Object.fromEntries(entries);
    }

    // ============================================
    // DATA PROCESSING
    // ============================================
    function buildAnalytics(bills, groups, paymentStatuses, paymentSummary) {
        const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
        const currentUserId = Number(currentUser.id) || null;
        const categoryTotals = {};
        const monthlyTotals = {};
        const groupOutstanding = {};
        const creatorTotals = {};
        const groupsById = Object.fromEntries((groups || []).map((group) => [String(group.id), group]));

        let totalTrackedAmount = 0;
        let totalOutstandingAmount = 0;
        let yourOpenShare = 0;
        let largestBill = null;
        let busiestMonth = { label: "-", amount: 0 };
        let openBillsCount = 0;
        let paidBillsCount = 0;
        let partialBillsCount = 0;

        bills.forEach((bill) => {
            const total = toAmount(bill.total);
            const title = String(bill.title || "");
            const statuses = paymentStatuses[bill.id] || [];
            const paidAmount = statuses
                .filter((status) => Boolean(status.paid))
                .reduce((sum, status) => sum + toAmount(status.amount), 0);
            const outstanding = Math.max(total - paidAmount, 0);
            const monthKey = toMonthKey(bill.created_at);
            const monthLabel = formatMonthLabel(monthKey);
            const category = detectCategory(title, bill.group_name);
            const creator = String(bill.created_by_name || "Unknown");

            totalTrackedAmount += total;
            totalOutstandingAmount += outstanding;

            // Count bill status
            if (outstanding <= 0.009) {
                paidBillsCount++;
            } else if (paidAmount > 0 && outstanding > 0) {
                partialBillsCount++;
            } else {
                openBillsCount++;
            }

            categoryTotals[category] = (categoryTotals[category] || 0) + total;
            monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + total;
            creatorTotals[creator] = (creatorTotals[creator] || 0) + total;
            groupOutstanding[bill.group_name || "Unknown Group"] =
                (groupOutstanding[bill.group_name || "Unknown Group"] || 0) + outstanding;

            if (!largestBill || total > largestBill.amount) {
                largestBill = {
                    title: title || "Untitled bill",
                    amount: total,
                    groupName: bill.group_name || "Unknown Group"
                };
            }

            if ((monthlyTotals[monthKey] || 0) > busiestMonth.amount) {
                busiestMonth = {
                    label: monthLabel,
                    amount: monthlyTotals[monthKey]
                };
            }

            statuses.forEach((status) => {
                if (currentUserId && Number(status.member_id) === currentUserId && !status.paid) {
                    yourOpenShare += toAmount(status.amount);
                }
            });
        });

        const monthlySeries = Object.entries(monthlyTotals)
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([key, amount]) => ({
                key,
                label: formatMonthLabel(key),
                amount
            }));

        const sortedCategories = sortEntriesDescending(categoryTotals);
        const sortedOutstandingGroups = sortEntriesDescending(groupOutstanding).filter(([, amount]) => amount > 0.009);
        const sortedCreators = sortEntriesDescending(creatorTotals);

        const settlementRate = totalTrackedAmount > 0
            ? ((totalTrackedAmount - totalOutstandingAmount) / totalTrackedAmount) * 100
            : 0;

        const avgBillAmount = bills.length ? totalTrackedAmount / bills.length : 0;
        const topCategory = sortedCategories[0] ? sortedCategories[0][0] : "No data yet";
        const topGroup = sortedOutstandingGroups[0] ? sortedOutstandingGroups[0][0] : "All settled";

        return {
            bills,
            groups,
            paymentSummary,
            totalTrackedAmount,
            totalOutstandingAmount,
            yourOpenShare,
            settlementRate,
            avgBillAmount,
            topCategory,
            topGroup,
            openBillsCount,
            paidBillsCount,
            partialBillsCount,
            trackedBillsCount: bills.length,
            trackedGroupsCount: groups.length,
            largestBill,
            busiestMonth,
            categorySeries: sortedCategories,
            monthlySeries,
            outstandingGroupSeries: sortedOutstandingGroups.slice(0, 6),
            creatorSeries: sortedCreators.slice(0, 6)
        };
    }

    // ============================================
    // RENDERING FUNCTIONS
    // ============================================
    function renderAnalytics(analytics) {
        setMoney("totalTrackedAmount", analytics.totalTrackedAmount);
        setMoney("outstandingAmount", analytics.totalOutstandingAmount);
        setMoney("yourOpenShare", analytics.yourOpenShare);

        text("settlementRate", `${analytics.settlementRate.toFixed(0)}%`);
        text("trackedBillsCount", `${analytics.trackedBillsCount} bill${analytics.trackedBillsCount === 1 ? "" : "s"}`);
        text("trackedGroupsCount", `${analytics.trackedGroupsCount} group${analytics.trackedGroupsCount === 1 ? "" : "s"}`);
        text("totalTrackedMeta", analytics.trackedBillsCount ? `${analytics.trackedBillsCount} bills across ${analytics.trackedGroupsCount} groups` : "No bills tracked yet");
        text("outstandingMeta", analytics.openBillsCount ? `${analytics.openBillsCount} open bill${analytics.openBillsCount === 1 ? "" : "s"} still need attention` : "Everything currently looks settled");
        text("yourOpenShareMeta", analytics.yourOpenShare > 0 ? "Based on unpaid splits assigned to you" : "You have no unpaid personal share right now");
        text(
            "settlementMeta",
            `${formatMoney(analytics.paymentSummary.paymentsMade || 0)} paid, ${formatMoney(analytics.paymentSummary.paymentsReceived || 0)} received`
        );

        if (typeof refreshCurrencyDisplay === "function") {
            refreshCurrencyDisplay();
        }
    }

    function renderInsights(analytics) {
        const quickInsights = [
            {
                label: "Top category",
                value: analytics.topCategory,
                note: analytics.categorySeries.length ? "Your highest share of bill volume" : "Not enough bill data yet"
            },
            {
                label: "Largest bill",
                value: analytics.largestBill ? formatMoney(analytics.largestBill.amount) : "-",
                note: analytics.largestBill ? `${analytics.largestBill.title} in ${analytics.largestBill.groupName}` : "No bill found"
            },
            {
                label: "Average bill size",
                value: formatMoney(analytics.avgBillAmount),
                note: "Average total per tracked bill"
            },
            {
                label: "Bill status",
                value: `${analytics.paidBillsCount} paid / ${analytics.partialBillsCount} partial / ${analytics.openBillsCount} open`,
                note: "Overall payment status across all bills"
            }
        ];

        const groupInsights = [
            {
                label: "Tracked groups",
                value: `${analytics.trackedGroupsCount}`,
                note: analytics.trackedGroupsCount ? "Shared groups included in this view" : "No groups found"
            },
            {
                label: "Most exposed group",
                value: analytics.topGroup,
                note: analytics.outstandingGroupSeries[0] ? `${formatMoney(analytics.outstandingGroupSeries[0][1])} still outstanding` : "No group has unpaid balance"
            },
            {
                label: "Busiest month",
                value: analytics.busiestMonth.label,
                note: analytics.busiestMonth.amount ? `${formatMoney(analytics.busiestMonth.amount)} in bill volume` : "Monthly history will appear here"
            }
        ];

        const paymentHealth = [
            {
                label: "Outstanding total",
                value: formatMoney(analytics.totalOutstandingAmount),
                note: "Unpaid amount still open"
            },
            {
                label: "Your open share",
                value: formatMoney(analytics.yourOpenShare),
                note: analytics.yourOpenShare ? "Needs settlement from your side" : "Nothing pending for you"
            },
            {
                label: "Settlement rate",
                value: `${analytics.settlementRate.toFixed(0)}%`,
                note: "Paid value against tracked bill volume"
            },
            {
                label: "Overall health",
                value: analytics.settlementRate > 80 ? "Excellent" : analytics.settlementRate > 50 ? "Good" : "Needs attention",
                note: analytics.settlementRate > 80 ? "Great job keeping up with payments!" : "Consider following up on unpaid bills"
            }
        ];

        injectInsightList("quickInsights", quickInsights);
        injectInsightList("groupInsights", groupInsights);
        injectInsightList("paymentInsights", paymentHealth);
    }

    function injectInsightList(id, items) {
        const element = document.getElementById(id);
        if (!element) return;

        element.innerHTML = items.map((item) => `
            <div class="insight-item">
                <div>
                    <strong>${escapeHtml(item.label)}</strong>
                    <small>${escapeHtml(item.note)}</small>
                </div>
                <span>${escapeHtml(item.value)}</span>
            </div>
        `).join("");
    }

    // ============================================
    // CHART RENDERING
    // ============================================
    function renderCategoryChart(series) {
        const labels = series.map(([label]) => label);
        const data = series.map(([, amount]) => roundAmount(amount));
        toggleChartEmpty("categoryEmpty", !data.length);
        destroyChart("category");

        if (!data.length) return;

        charts.category = new Chart(document.getElementById("categoryChart"), {
            type: "doughnut",
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: CHART_COLORS.slice(0, data.length),
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: buildChartOptions({
                plugins: {
                    legend: { position: "bottom" },
                    tooltip: {
                        callbacks: {
                            label(context) {
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${formatMoney(value)} (${percentage}%)`;
                            }
                        }
                    }
                }
            })
        });
    }

    function renderMonthlyTrendChart(series) {
        const labels = series.map((item) => item.label);
        const data = series.map((item) => roundAmount(item.amount));
        toggleChartEmpty("trendEmpty", !data.length);
        destroyChart("trend");

        if (!data.length) return;

        charts.trend = new Chart(document.getElementById("trendChart"), {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: "Bill volume",
                    data,
                    borderColor: "#6366f1",
                    backgroundColor: "rgba(99, 102, 241, 0.14)",
                    pointBackgroundColor: "#6366f1",
                    pointRadius: 4,
                    pointHoverRadius: 5,
                    fill: true,
                    tension: 0.35
                }]
            },
            options: buildChartOptions({
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label(context) {
                                return formatMoney(context.parsed.y || 0);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback(value) {
                                return shortMoney(Number(value));
                            }
                        }
                    }
                }
            })
        });
    }

    function renderOutstandingByGroupChart(series) {
        const labels = series.map(([label]) => label);
        const data = series.map(([, amount]) => roundAmount(amount));
        toggleChartEmpty("groupOutstandingEmpty", !data.length);
        destroyChart("outstandingGroups");

        if (!data.length) return;

        charts.outstandingGroups = new Chart(document.getElementById("groupOutstandingChart"), {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Outstanding",
                    data,
                    borderRadius: 10,
                    backgroundColor: "#f59e0b"
                }]
            },
            options: buildChartOptions({
                indexAxis: "y",
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label(context) {
                                return formatMoney(context.parsed.x || 0);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            callback(value) {
                                return shortMoney(Number(value));
                            }
                        }
                    }
                }
            })
        });
    }

    function renderTopCreatorsChart(series) {
        const labels = series.map(([label]) => label);
        const data = series.map(([, amount]) => roundAmount(amount));
        toggleChartEmpty("topSpendersEmpty", !data.length);
        destroyChart("creators");

        if (!data.length) return;

        charts.creators = new Chart(document.getElementById("topSpendersChart"), {
            type: "bar",
            data: {
                labels,
                datasets: [{
                    label: "Bill volume",
                    data,
                    borderRadius: 10,
                    backgroundColor: "#10b981"
                }]
            },
            options: buildChartOptions({
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label(context) {
                                return formatMoney(context.parsed.y || 0);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        ticks: {
                            callback(value) {
                                return shortMoney(Number(value));
                            }
                        }
                    }
                }
            })
        });
    }

    function buildChartOptions(overrides) {
        const darkMode = document.body.classList.contains("dark-mode");
        const textColor = darkMode ? "#e2e8f0" : "#334155";
        const gridColor = darkMode ? "rgba(148, 163, 184, 0.14)" : "rgba(148, 163, 184, 0.18)";

        return mergeDeep({
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: textColor,
                        usePointStyle: true,
                        boxWidth: 8,
                        padding: 18
                    }
                },
                tooltip: {
                    backgroundColor: darkMode ? "#0f172a" : "#111827",
                    titleColor: "#f8fafc",
                    bodyColor: "#f8fafc",
                    padding: 12
                }
            },
            scales: {
                x: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                y: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            }
        }, overrides || {});
    }

    // ============================================
    // UTILITY FUNCTIONS
    // ============================================
    function setMoney(id, amount) {
        const element = document.getElementById(id);
        if (!element) return;

        if (typeof displayBillAmount === "function") {
            displayBillAmount(element, amount, "KES");
        } else {
            element.textContent = formatMoney(amount);
            element.setAttribute("data-amount", amount);
            element.setAttribute("data-currency", "KES");
        }
    }

    function formatMoney(amount) {
        if (typeof formatAmount === "function") {
            return formatAmount(amount, "KES");
        }
        return `KSh ${roundAmount(amount).toFixed(2)}`;
    }

    function shortMoney(amount) {
        const currentCurrency = typeof getCurrentCurrency === "function" ? getCurrentCurrency() : "KES";
        const converted = typeof convertCurrency === "function"
            ? convertCurrency(amount, "KES", currentCurrency)
            : amount;

        if (Math.abs(converted) >= 1000000) {
            return `${currencySymbol(currentCurrency)}${(converted / 1000000).toFixed(1)}M`;
        }
        if (Math.abs(converted) >= 1000) {
            return `${currencySymbol(currentCurrency)}${(converted / 1000).toFixed(1)}k`;
        }
        return `${currencySymbol(currentCurrency)}${Math.round(converted)}`;
    }

    function currencySymbol(code) {
        const symbols = {
            KES: "KSh ",
            USD: "$",
            EUR: "€",
            GBP: "£",
            JPY: "¥",
            UGX: "USh ",
            TZS: "TSh ",
            ZAR: "R "
        };
        return symbols[code] || `${code} `;
    }

    function detectCategory(title, groupName) {
        const haystack = `${title || ""} ${groupName || ""}`.toLowerCase();
        const match = CATEGORY_RULES.find((rule) => rule.keywords.some((keyword) => haystack.includes(keyword)));
        return match ? match.name : "Other";
    }

    function toMonthKey(value) {
        const date = value ? new Date(value) : new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        return `${year}-${month}`;
    }

    function formatMonthLabel(monthKey) {
        const [year, month] = monthKey.split("-").map(Number);
        const date = new Date(year, (month || 1) - 1, 1);
        return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    }

    function sortEntriesDescending(object) {
        return Object.entries(object)
            .filter(([, amount]) => amount > 0.009)
            .sort((left, right) => right[1] - left[1]);
    }

    function roundAmount(value) {
        return Number(toAmount(value).toFixed(2));
    }

    function toAmount(value) {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? parsed : 0;
    }

    function text(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function setStatus(message, type) {
        const status = document.getElementById("analyticsStatus");
        if (!status) return;

        status.className = `analytics-status ${type} show`;
        status.textContent = message;
    }

    function hideStatus() {
        const status = document.getElementById("analyticsStatus");
        if (status) {
            status.className = "analytics-status";
            status.textContent = "";
        }
    }

    function toggleChartEmpty(id, isVisible) {
        const element = document.getElementById(id);
        if (element) element.classList.toggle("show", isVisible);
    }

    function destroyChart(key) {
        if (charts[key]) {
            charts[key].destroy();
            delete charts[key];
        }
    }

    // ============================================
    // USER DATA
    // ============================================
    function loadUserData() {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const userNameEl = document.getElementById("userName");
        if (userNameEl) userNameEl.textContent = user.name || "User";
    }

    async function loadUserAvatar() {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const avatarText = document.getElementById("navbarAvatarText");
        const avatarImage = document.getElementById("navbarAvatarImage");

        if (avatarText) {
            const initials = user.name
                ? user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()
                : "U";
            avatarText.textContent = initials;
        }

        // Try to load avatar from API
        try {
            const res = await fetch(`${MODULE_API_BASE}/profile`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }
            });
            if (res.ok) {
                const profile = await res.json();
                if (profile.avatar && avatarImage) {
                    avatarImage.src = profile.avatar;
                    avatarImage.style.display = "block";
                    if (avatarText) avatarText.style.display = "none";
                }
            }
        } catch (error) {
            console.error("Error loading avatar:", error);
        }
    }

    // ============================================
    // HELPER FUNCTIONS
    // ============================================
    function mergeDeep(target, source) {
        const output = { ...target };
        Object.keys(source || {}).forEach((key) => {
            const sourceValue = source[key];
            const targetValue = output[key];
            if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
                output[key] = mergeDeep(targetValue, sourceValue);
            } else {
                output[key] = sourceValue;
            }
        });
        return output;
    }

    function isPlainObject(value) {
        return value && typeof value === "object" && !Array.isArray(value);
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    // ============================================
    // EXPORT FUNCTIONS
    // ============================================
    window.logout = function logout() {
        localStorage.clear();
        window.location.href = "index.html";
    };

    window.toggleCurrencyDropdown = function toggleCurrencyDropdown() {
        const dropdown = document.getElementById("currencyDropdown");
        if (dropdown) dropdown.classList.toggle("show");
    };
})();
