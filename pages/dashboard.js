import {
  CATEGORY_OPTIONS,
  LOCATION_OPTIONS,
  MESSAGE_TYPES,
  SCAN_TARGET_OPTIONS,
  STATUS
} from "../utils/constants.js";
import { formatDateTime } from "../utils/helpers.js";

const refs = {};
let prospects = [];
let scanHistory = [];

const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

document.addEventListener("DOMContentLoaded", init);

async function init() {
  Object.assign(refs, {
    search: document.getElementById("dashboard-search"),
    totalFound: document.getElementById("stat-total-found"),
    foundTrend: document.getElementById("stat-found-trend"),
    validated: document.getElementById("stat-validated"),
    validatedNote: document.getElementById("stat-validated-note"),
    conversion: document.getElementById("stat-conversion"),
    conversionBar: document.getElementById("stat-conversion-bar"),
    funnelScanned: document.getElementById("funnel-scanned"),
    funnelValidated: document.getElementById("funnel-validated"),
    funnelSaved: document.getElementById("funnel-saved"),
    weeklyChart: document.getElementById("weekly-chart"),
    categoryDonut: document.getElementById("category-donut"),
    categoryTotal: document.getElementById("category-total"),
    categoryLegend: document.getElementById("category-legend"),
    recentBody: document.getElementById("recent-scans-body"),
    recentEmpty: document.getElementById("recent-scans-empty"),
    lastUpdated: document.getElementById("last-updated"),
    scanForm: document.getElementById("dashboard-scan-form"),
    category: document.getElementById("dashboard-category"),
    location: document.getElementById("dashboard-location"),
    locationOptions: document.getElementById("dashboard-location-options"),
    keyword: document.getElementById("dashboard-keyword-input"),
    targetCount: document.getElementById("dashboard-target-count"),
    scanButton: document.getElementById("dashboard-scan-button"),
    toast: document.getElementById("dashboard-toast")
  });

  renderScanOptions();
  bindEvents();
  await loadDashboard();
}

function bindEvents() {
  refs.scanForm.addEventListener("submit", startSearchAndScan);
  refs.search.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    const query = refs.search.value.trim();
    if (query) {
      location.href = `prospects.html?q=${encodeURIComponent(query)}`;
    }
  });
}

function renderScanOptions() {
  refs.category.replaceChildren(...CATEGORY_OPTIONS.map((option) => optionNode(option.value, option.label)));
  refs.locationOptions.replaceChildren(...LOCATION_OPTIONS.filter((option) => option.value).map((option) => {
    const item = document.createElement("option");
    item.value = option.value;
    item.label = option.label;
    return item;
  }));
  refs.targetCount.replaceChildren(...SCAN_TARGET_OPTIONS.map((option) => {
    const item = optionNode(String(option.value), option.label);
    if (option.value === 25) item.selected = true;
    return item;
  }));
}

async function loadDashboard() {
  const [prospectsResponse, historyResponse] = await Promise.all([
    sendMessage(MESSAGE_TYPES.getAllProspects),
    sendMessage(MESSAGE_TYPES.getScanHistory)
  ]);
  prospects = prospectsResponse.payload || [];
  scanHistory = historyResponse.payload || [];
  renderDashboard();
}

function renderDashboard() {
  const totalScanned = scanHistory.reduce((sum, item) => sum + Number(item.totalScanned || 0), 0);
  const totalFiltered = scanHistory.reduce((sum, item) => sum + Number(item.totalFiltered || 0), 0);
  const foundTotal = totalFiltered || prospects.length;
  const validatedTotal = prospects.filter((item) => isValidated(item)).length;
  const passedValidation = prospects.filter((item) => item.status === STATUS.strong || item.status === STATUS.prospect).length;
  const conversionRate = foundTotal ? Math.round((prospects.length / foundTotal) * 1000) / 10 : 0;
  const validationRate = prospects.length ? Math.round((validatedTotal / prospects.length) * 100) : 0;

  refs.totalFound.textContent = formatNumber(foundTotal);
  refs.foundTrend.textContent = `${formatNumber(scanHistory.length)} hasil scan tersimpan`;
  refs.validated.textContent = formatNumber(validatedTotal);
  refs.validatedNote.textContent = `${validationRate}% dari prospek tersimpan`;
  refs.conversion.textContent = `${conversionRate}%`;
  setPercentAttr(refs.conversionBar, conversionRate);
  refs.funnelScanned.textContent = formatNumber(totalScanned || foundTotal);
  refs.funnelValidated.textContent = formatNumber(passedValidation || validatedTotal);
  refs.funnelSaved.textContent = formatNumber(prospects.length);
  refs.lastUpdated.textContent = prospects.length || scanHistory.length
    ? `Update terakhir ${formatDateTime(getLatestDate())}`
    : "Belum ada data scan";

  renderWeeklyChart();
  renderCategoryChart();
  renderRecentScans();
}

function renderWeeklyChart() {
  const days = getLastSevenDays();
  const maxScanned = Math.max(1, ...days.map((day) => day.scanned));
  const maxStrong = Math.max(1, ...days.map((day) => day.strong));
  refs.weeklyChart.replaceChildren(...days.map((day) => {
    const scannedHeight = Math.max(4, Math.round((day.scanned / maxScanned) * 100));
    const strongHeight = Math.max(4, Math.round((day.strong / maxStrong) * 100));
    return el("div", { className: "weekly-day", title: `${day.label}: ${day.scanned} discan, ${day.strong} prospek kuat` },
      el("div", { className: "weekly-bars" },
        el("span", { className: "weekly-bar scanned", "data-height": bucketPercent(scannedHeight) }),
        el("span", { className: "weekly-bar strong", "data-height": bucketPercent(strongHeight) })
      ),
      el("span", { className: "weekly-label" }, day.label)
    );
  }));
}

function renderCategoryChart() {
  const categories = getCategoryDistribution();
  refs.categoryTotal.textContent = formatNumber(prospects.length);
  if (!categories.length) {
    renderDonut(refs.categoryDonut, []);
    refs.categoryLegend.replaceChildren(el("div", { className: "empty-state compact-empty" }, "Belum ada kategori."));
    return;
  }

  const total = categories.reduce((sum, item) => sum + item.count, 0) || 1;
  renderDonut(refs.categoryDonut, categories);
  refs.categoryLegend.replaceChildren(...categories.map((item, index) => {
    const percent = Math.round((item.count / total) * 100);
    return el("div", { className: "category-item" },
      el("span", { className: "category-name" },
        el("span", { className: `category-dot chart-color-${index % 5}` }),
        el("span", {}, item.name)
      ),
      el("strong", {}, `${percent}%`)
    );
  }));
}

function renderDonut(root, categories) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 42 42");
  svg.setAttribute("aria-hidden", "true");

  const track = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  track.setAttribute("class", "donut-track");
  track.setAttribute("cx", "21");
  track.setAttribute("cy", "21");
  track.setAttribute("r", "15.915");
  svg.append(track);

  const total = categories.reduce((sum, item) => sum + item.count, 0);
  let offset = 0;
  categories.forEach((item, index) => {
    const segment = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    const percent = total ? (item.count / total) * 100 : 0;
    segment.setAttribute("class", `donut-segment chart-color-${index % 5}`);
    segment.setAttribute("cx", "21");
    segment.setAttribute("cy", "21");
    segment.setAttribute("r", "15.915");
    segment.setAttribute("stroke-dasharray", `${percent} ${100 - percent}`);
    segment.setAttribute("stroke-dashoffset", String(-offset));
    svg.append(segment);
    offset += percent;
  });

  const label = el("span", {}, formatNumber(total));
  root.replaceChildren(svg, label);
}

function renderRecentScans() {
  const recent = scanHistory.slice(0, 5);
  refs.recentEmpty.hidden = recent.length > 0;
  refs.recentBody.replaceChildren(...recent.map((session) => {
    const row = document.createElement("tr");
    row.append(
      cell(formatDateTime(session.startedAt)),
      cell(session.location || "-"),
      cell(session.query || "-"),
      cell(formatNumber(Number(session.totalFiltered || session.totalScanned || 0)), "text-right")
    );
    return row;
  }));
}

async function startSearchAndScan(event) {
  event.preventDefault();
  const payload = {
    keyword: refs.keyword.value.trim(),
    category: refs.category.value,
    location: refs.location.value.trim(),
    targetCount: Number(refs.targetCount.value || 25)
  };
  if (!payload.keyword && !payload.category) {
    showToast("Pilih kategori atau isi keyword bisnis.", false);
    return;
  }

  refs.scanButton.disabled = true;
  refs.scanButton.textContent = "Membuka panel...";
  try {
    if (chrome.sidePanel?.open) {
      await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    }
    refs.scanButton.textContent = "Membuka Maps...";
    await sendMessage(MESSAGE_TYPES.searchMaps, payload);
    showToast("Pencarian dibuka di Google Maps. Panel akan mulai scan saat hasil siap.", true);
  } catch (error) {
    showToast(error.message || "Gagal memulai scan.", false);
  } finally {
    refs.scanButton.disabled = false;
    refs.scanButton.textContent = "Mulai Scan";
  }
}

function getCategoryDistribution() {
  const counts = new Map();
  prospects.forEach((prospect) => {
    const category = normalizeLabel(prospect.business?.category || "Lainnya");
    counts.set(category, (counts.get(category) || 0) + 1);
  });
  const sorted = [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  if (sorted.length <= 4) return sorted;
  const top = sorted.slice(0, 4);
  const otherCount = sorted.slice(4).reduce((sum, item) => sum + item.count, 0);
  return [...top, { name: "Lainnya", count: otherCount }];
}

function getLastSevenDays() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    const key = dateKey(date);
    const scanned = scanHistory
      .filter((item) => dateKey(item.startedAt) === key)
      .reduce((sum, item) => sum + Number(item.totalScanned || 0), 0);
    const strong = prospects.filter((item) => dateKey(item.savedAt) === key && item.status === STATUS.strong).length;
    return { label: DAY_LABELS[date.getDay()], scanned, strong };
  });
}

function getLatestDate() {
  const dates = [...prospects.map((item) => item.savedAt), ...scanHistory.map((item) => item.startedAt)]
    .map((value) => new Date(value))
    .filter((date) => Number.isFinite(date.getTime()))
    .sort((a, b) => b - a);
  return dates[0] || new Date();
}

function isValidated(prospect) {
  return Boolean(prospect.validation) || (prospect.status && prospect.status !== STATUS.unchecked);
}

function dateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function normalizeLabel(value) {
  const text = String(value || "").trim();
  return text ? text[0].toUpperCase() + text.slice(1) : "Lainnya";
}

function optionNode(value, label) {
  const item = document.createElement("option");
  item.value = value;
  item.textContent = label;
  return item;
}

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function bucketPercent(value) {
  const number = Number(value) || 0;
  return String(Math.max(0, Math.min(100, Math.round(number / 5) * 5)));
}

function setPercentAttr(node, value) {
  node.dataset.pct = bucketPercent(value);
}

function cell(content, className = "") {
  const td = document.createElement("td");
  if (className) td.className = className;
  td.textContent = String(content ?? "");
  return td;
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "className") node.className = value;
    else if (key.startsWith("data-")) node.setAttribute(key, value);
    else node.setAttribute(key, value);
  });
  children.flat().forEach((child) => {
    if (child === null || child === undefined) return;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return node;
}

function showToast(message, success) {
  refs.toast.textContent = message;
  refs.toast.classList.toggle("is-success", Boolean(success));
  refs.toast.classList.toggle("is-error", !success);
  refs.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    refs.toast.hidden = true;
  }, 2800);
}

function sendMessage(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, payload }).then((response) => {
    if (!response?.ok) throw new Error(response?.error || "Operasi gagal.");
    return response;
  });
}
