const state = {
    data: null,
    baseCurrency: "",
    currency: "",
    year: null,
    month: null,
    day: null,
};

const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
];

const elements = {
  pair: document.getElementById("pair"),
  selected: document.getElementById("selected"),
  count: document.getElementById("count"),
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

const setHidden = (el, hidden) => {
    if (!el) return;
    if (hidden) {
        el.setAttribute("hidden", "");
    } else {
        el.removeAttribute("hidden");
    }
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

const getYearKeys = () => Object.keys(state.data || {}).sort();

const getMonthKeys = (year) =>
    Object.keys((state.data || {})[year] || {}).sort();

const getDayKeys = (year, month) =>
    Object.keys(((state.data || {})[year] || {})[month] || {}).sort();

const getEntries = (year, month, day) =>
    ((((state.data || {})[year] || {})[month] || {})[day] || []).slice();

const createOptionButton = ({
    title,
    sub,
    active,
    onClick,
    index = 0,
}) => {
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
            onClick: () => {
                state.month = null;
                state.day = null;
                render();
            },
        });
    }
    if (state.month) {
        crumbs.push({
            label: formatMonth(state.month),
            onClick: () => {
                state.day = null;
                render();
            },
        });
    }
    if (state.day) {
        crumbs.push({
            label: `Day ${state.day}`,
            onClick: () => { },
        });
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

const renderYears = () => {
    const years = getYearKeys();
    elements.options.innerHTML = "";
    years.forEach((year, index) => {
        const monthsCount = getMonthKeys(year).length;
        const btn = createOptionButton({
            title: year,
            sub: `${monthsCount} months`,
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

    if (!years.length) {
        elements.options.textContent = "No data available.";
    }
};

const renderMonths = () => {
    const months = getMonthKeys(state.year);
    elements.options.innerHTML = "";
    months.forEach((month, index) => {
        const daysCount = getDayKeys(state.year, month).length;
        const btn = createOptionButton({
            title: formatMonth(month),
            sub: `${daysCount} days`,
            active: month === state.month,
            onClick: () => {
                state.month = month;
                state.day = null;
                render();
            },
            index,
        });
        elements.options.appendChild(btn);
    });

    if (!months.length) {
        elements.options.textContent = "No months available.";
    }
};

const renderDays = () => {
    const days = getDayKeys(state.year, state.month);
    elements.options.innerHTML = "";
    days.forEach((day, index) => {
        const entries = getEntries(state.year, state.month, day);
        const btn = createOptionButton({
            title: `Day ${day}`,
            sub: `${entries.length} entries`,
            active: day === state.day,
            onClick: () => {
                state.day = day;
                render();
            },
            index,
        });
        elements.options.appendChild(btn);
    });

    if (!days.length) {
        elements.options.textContent = "No days available.";
    }
};

const renderTable = () => {
    if (!state.day) {
        setHidden(elements.tableCard, true);
        return;
    }

    const entries = getEntries(state.year, state.month, state.day).sort((a, b) =>
        a.time.localeCompare(b.time)
    );
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
        rate.textContent = Number.isFinite(rateValue)
            ? rateValue.toFixed(4)
            : "-";
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
    if (!entries.length) return;
    const rates = entries.map((item) => Number(item.rate));
    const total = rates.reduce((sum, value) => sum + value, 0);
    const min = Math.min(...rates);
    const max = Math.max(...rates);
    const avg = total / rates.length;

    const stats = [
        { label: "Min", value: min },
        { label: "Max", value: max },
        { label: "Avg", value: avg },
    ];

    stats.forEach((stat) => {
        const pill = document.createElement("div");
        pill.className = "stat-pill";
        pill.textContent = `${stat.label}: ${stat.value.toFixed(4)}`;
        elements.stats.appendChild(pill);
    });
};

const renderHeader = () => {
    const pairText = state.baseCurrency && state.currency
        // ? `${state.baseCurrency} to ${state.currency}`
        ? `${state.currency} to ${state.baseCurrency}`
        : "-";
    elements.pair.textContent = pairText;
    elements.selected.textContent = formatSelection();

    if (state.day) {
        elements.count.textContent =
            getEntries(state.year, state.month, state.day).length;
    } else if (state.month) {
        elements.count.textContent = getDayKeys(state.year, state.month).length;
    } else if (state.year) {
        elements.count.textContent = getMonthKeys(state.year).length;
    } else {
        elements.count.textContent = "0";
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
    elements.panelNote.textContent = `Select a day in ${formatMonth(state.month)}.`;
    renderDays();
    setHidden(elements.backBtn, false);
    setHidden(elements.resetBtn, false);
};

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
    if (state.day) {
        state.day = null;
        render();
        return;
    }
    if (state.month) {
        state.month = null;
        render();
        return;
    }
    if (state.year) {
        state.year = null;
        render();
    }
};

const showToast = (message) => {
    if (message) elements.toastBody.textContent = message;
    setHidden(elements.toast, false);
    setTimeout(() => {
        setHidden(elements.toast, true);
    }, 5000);
};

// const BASE_PATH = "/Cimb-Rate-Web-Scraper"; # 没有domain name 才用这个 part 1

const loadData = async () => {
    try {
        const response = await fetch("/data/rates.json", { cache: "no-store" });
        // const response = await fetch(`${BASE_PATH}/data/rates.json`, { cache: "no-store" }); # 没有domain name 才用这个 part 2
        if (!response.ok) {
            throw new Error("Failed to fetch rates.json");
        }
        const payload = await response.json();
        state.baseCurrency = payload.base_currency || "";
        state.currency = payload.currency || "";
        state.data = payload.data || {};
        render();
    } catch (error) {
        state.data = {};
        render();
        const detail =
            window.location.protocol === "file:"
                ? "Open this page via a local server (for example: python -m http.server)."
                : "Check that data/rates.json is reachable.";
        showToast(detail);
        console.error(error);
    }
};

elements.backBtn.addEventListener("click", handleBack);
elements.resetBtn.addEventListener("click", reset);

if (elements.currentYear) {
  elements.currentYear.textContent = `${new Date().getFullYear()}`;
}

loadData();
