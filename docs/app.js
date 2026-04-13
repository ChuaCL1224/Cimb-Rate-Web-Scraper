const state = {
    index: null,        // index.json: { base_currency, currency, years: { "2026": ["01","02"] } }
    monthCache: {},     // { "2026-01": { "30": [{time, rate},...] } }
    baseCurrency: "",
    currency: "",
    year: null,
    month: null,
    day: null,
};

const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const elements = {
    pair: document.getElementById("pair"),
    selected: document.getElementById("selected"),
    count: document.getElementById("count"),
    countLabel: document.getElementById("count-label"),
    panelKicker: document.getElementById("panel-kicker"),
    panelTitle: document.getElementById("panel-title"),
    panelNote: document.getElementById("panel-note"),
    options: document.getElementById("options"),
    breadcrumb: document.getElementById("breadcrumb"),
    backBtn: document.getElementById("back-btn"),
    resetBtn: document.getElementById("reset-btn"),
    tableCard: document.getElementById("table-card"),
    tableBody: document.getElementById("table-body"),
    tableSub: document.getElementById("table-sub"),
    stats: document.getElementById("stats"),
    toast: document.getElementById("toast"),
    toastBody: document.getElementById("toast-body"),
    currentYear: document.getElementById("current-year"),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const setHidden = (el, hidden) => {
    if (!el) return;
    hidden ? el.setAttribute("hidden", "") : el.removeAttribute("hidden");
};

const formatMonth = (value) => {
    const index = parseInt(value, 10) - 1;
    const name = monthNames[index] || value;
    return `${name} (${value})`;
};

const formatSelection = () => {
    if (!state.year) return "None";
    if (!state.month) return `${state.year}`;
    if (!state.day) return `${state.year}-${state.month}`;
    return `${state.year}-${state.month}-${state.day}`;
};

const getYears = () =>
    Object.keys(state.index?.years || {}).sort();

const getMonths = (year) =>
    (state.index?.years?.[year] || []).slice().sort();

const getMonthData = (year, month) =>
    state.monthCache[`${year}-${month}`] || {};

const getDays = (year, month) =>
    Object.keys(getMonthData(year, month)).sort();

const getDayEntries = (year, month, day) =>
    (getMonthData(year, month)[day] || []).slice();

const getDayBestRate = (year, month, day) => {
    const entries = getDayEntries(year, month, day);
    const rates = entries.map((e) => Number(e.rate)).filter((r) => Number.isFinite(r));
    if (!rates.length) return null;
    return Math.max(...rates);
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

const loadIndex = async () => {
    try {
        const res = await fetch("/data/index.json", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to fetch index.json");
        const payload = await res.json();
        state.baseCurrency = payload.base_currency || "";
        state.currency = payload.currency || "";
        state.index = payload;
        render();
    } catch (err) {
        state.index = { years: {} };
        render();
        const detail =
            window.location.protocol === "file:"
                ? "Open this page via a local server (e.g. python -m http.server)."
                : "Check that data/index.json is reachable.";
        showToast(detail);
        console.error(err);
    }
};

const loadMonth = async (year, month) => {
    const key = `${year}-${month}`;
    if (state.monthCache[key]) return; // already cached
    try {
        const res = await fetch(`/data/${key}.json`, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to fetch data/${key}.json`);
        state.monthCache[key] = await res.json();
    } catch (err) {
        state.monthCache[key] = {};
        showToast(`Could not load data for ${year}-${month}.`);
        console.error(err);
    }
};

// ─── UI builders ─────────────────────────────────────────────────────────────

const createOptionButton = ({ title, sub, active, onClick, index = 0 }) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "option-btn";
    if (active) btn.classList.add("is-active");
    btn.style.setProperty("--delay", `${index * 40}ms`);

    const titleEl = document.createElement("span");
    titleEl.className = "option-title";
    titleEl.textContent = title;

    const subEl = document.createElement("span");
    subEl.className = "option-sub";
    subEl.textContent = sub;

    btn.appendChild(titleEl);
    btn.appendChild(subEl);
    btn.addEventListener("click", onClick);
    return btn;
};

const updateBreadcrumb = () => {
    elements.breadcrumb.innerHTML = "";
    const crumbs = [];
    if (state.year) {
        crumbs.push({
            label: state.year,
            onClick: () => { state.month = null; state.day = null; render(); },
        });
    }
    if (state.month) {
        crumbs.push({
            label: formatMonth(state.month),
            onClick: () => { state.day = null; render(); },
        });
    }
    if (state.day) {
        crumbs.push({ label: `Day ${state.day}`, onClick: () => {} });
    }

    crumbs.forEach((crumb) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "crumb-btn";
        btn.textContent = crumb.label;
        btn.addEventListener("click", crumb.onClick);
        elements.breadcrumb.appendChild(btn);
    });
};

// ─── Panel renderers ──────────────────────────────────────────────────────────

const renderYears = () => {
    const years = getYears();
    elements.options.innerHTML = "";
    years.forEach((year, index) => {
        const months = getMonths(year);
        const btn = createOptionButton({
            title: year,
            sub: `${months.length} month${months.length !== 1 ? "s" : ""}`,
            active: year === state.year,
            onClick: () => {
                state.year = year;
                state.month = null;
                state.day = null;
                render();
            },
            index,
        });
        elements.options.appendChild(btn);
    });
    if (!years.length) elements.options.textContent = "No data available.";
};

const renderMonths = () => {
    const months = getMonths(state.year);
    elements.options.innerHTML = "";
    months.forEach((month, index) => {
        const cached = getMonthData(state.year, month);
        const daysCount = Object.keys(cached).length;
        const sub = daysCount ? `${daysCount} days` : "Loading…";
        const btn = createOptionButton({
            title: formatMonth(month),
            sub,
            active: month === state.month,
            onClick: async () => {
                state.month = month;
                state.day = null;
                await loadMonth(state.year, month);
                render();
            },
            index,
        });
        elements.options.appendChild(btn);
    });
    if (!months.length) elements.options.textContent = "No months available.";
};

const renderDays = () => {
    const days = getDays(state.year, state.month);
    elements.options.innerHTML = "";
    days.forEach((day, index) => {
        const best = getDayBestRate(state.year, state.month, day);
        const sub = best !== null ? `Best: ${best.toFixed(4)}` : "No data";
        const btn = createOptionButton({
            title: `${parseInt(day, 10)} ${monthNames[parseInt(state.month, 10) - 1]}`,
            sub,
            active: day === state.day,
            onClick: () => { state.day = day; render(); },
            index,
        });
        elements.options.appendChild(btn);
    });
    if (!days.length) elements.options.textContent = "No days available.";
};

const renderTable = () => {
    if (!state.day) { setHidden(elements.tableCard, true); return; }

    const entries = getDayEntries(state.year, state.month, state.day)
        .sort((a, b) => a.time.localeCompare(b.time));
    elements.tableBody.innerHTML = "";

    if (!entries.length) {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.colSpan = 3;
        cell.textContent = "No entries found for this day.";
        row.appendChild(cell);
        elements.tableBody.appendChild(row);
    }

    entries.forEach((entry, index) => {
        const row = document.createElement("tr");
        const number = document.createElement("td");
        number.textContent = `${index + 1}`;
        const time = document.createElement("td");
        time.textContent = entry.time || "-";
        const rate = document.createElement("td");
        const rateValue = Number(entry.rate);
        rate.textContent = Number.isFinite(rateValue) ? rateValue.toFixed(4) : "-";
        if (rateValue === getDayBestRate(state.year, state.month, state.day)) {
            rate.classList.add("rate-best");
        }
        row.appendChild(number);
        row.appendChild(time);
        row.appendChild(rate);
        elements.tableBody.appendChild(row);
    });

    elements.tableSub.textContent = `${state.year}-${state.month}-${state.day}`;
    renderStats(entries);
    setHidden(elements.tableCard, false);
};

const renderStats = (entries) => {
    elements.stats.innerHTML = "";
    const rates = entries.map((item) => Number(item.rate)).filter((r) => Number.isFinite(r));
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const avg = rates.reduce((s, v) => s + v, 0) / rates.length;
    [{ label: "Min", value: min }, { label: "Max", value: max }, { label: "Avg", value: avg }]
        .forEach((stat) => {
            const pill = document.createElement("div");
            pill.className = "stat-pill";
            if (stat.label === "Max") pill.classList.add("stat-best");
            pill.textContent = `${stat.label}: ${stat.value.toFixed(4)}`;
            elements.stats.appendChild(pill);
        });
};

const renderHeader = () => {
    const pairText = state.baseCurrency && state.currency
        ? `${state.currency} to ${state.baseCurrency}`
        : "-";
    elements.pair.textContent = pairText;
    elements.selected.textContent = formatSelection();

    if (state.day) {
        const best = getDayBestRate(state.year, state.month, state.day);
        elements.count.textContent = best !== null ? best.toFixed(4) : "-";
        if (elements.countLabel) elements.countLabel.textContent = "Best Rate";
    } else if (state.month) {
        elements.count.textContent = getDays(state.year, state.month).length;
        if (elements.countLabel) elements.countLabel.textContent = "Days";
    } else if (state.year) {
        elements.count.textContent = getMonths(state.year).length;
        if (elements.countLabel) elements.countLabel.textContent = "Months";
    } else {
        elements.count.textContent = "0";
        if (elements.countLabel) elements.countLabel.textContent = "Entries";
    }
};

const renderPanel = () => {
    if (!state.year) {
        elements.panelKicker.textContent = "Step 1";
        elements.panelTitle.textContent = "Choose a year";
        elements.panelNote.textContent = "Pick a year to continue.";
        renderYears();
        setHidden(elements.backBtn, true);
        setHidden(elements.resetBtn, true);
        return;
    }
    if (!state.month) {
        elements.panelKicker.textContent = "Step 2";
        elements.panelTitle.textContent = "Choose a month";
        elements.panelNote.textContent = `Select a month in ${state.year}.`;
        renderMonths();
        setHidden(elements.backBtn, false);
        setHidden(elements.resetBtn, false);
        return;
    }
    elements.panelKicker.textContent = "Step 3";
    elements.panelTitle.textContent = "Choose a day";
    elements.panelNote.textContent = `Select a day in ${formatMonth(state.month)} ${state.year}.`;
    renderDays();
    setHidden(elements.backBtn, false);
    setHidden(elements.resetBtn, false);
};

// ─── Core ─────────────────────────────────────────────────────────────────────

const render = () => {
    updateBreadcrumb();
    renderHeader();
    renderPanel();
    renderTable();
};

const reset = () => {
    state.year = null;
    state.month = null;
    state.day = null;
    render();
};

const handleBack = () => {
    if (state.day) { state.day = null; render(); return; }
    if (state.month) { state.month = null; render(); return; }
    if (state.year) { state.year = null; render(); }
};

const showToast = (message) => {
    if (message) elements.toastBody.textContent = message;
    setHidden(elements.toast, false);
    setTimeout(() => setHidden(elements.toast, true), 5000);
};

// ─── Init ─────────────────────────────────────────────────────────────────────

elements.backBtn.addEventListener("click", handleBack);
elements.resetBtn.addEventListener("click", reset);
if (elements.currentYear) elements.currentYear.textContent = new Date().getFullYear();

loadIndex();
