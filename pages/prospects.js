import { MESSAGE_TYPES, STATUS, STATUS_META } from "../utils/constants.js";
import { downloadTextFile } from "../utils/exporter.js";
import { formatDateTime } from "../utils/helpers.js";
import { buildOutreachMessage, getLeadProfile } from "../utils/lead.js";

let prospects = [];
let scanHistory = [];
const selectedIds = new Set();

const refs = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  Object.assign(refs, {
    total: document.getElementById("stat-total"),
    strong: document.getElementById("stat-strong"),
    pending: document.getElementById("stat-pending"),
    search: document.getElementById("prospect-search"),
    status: document.getElementById("prospect-status"),
    city: document.getElementById("prospect-city"),
    sort: document.getElementById("prospect-sort"),
    contactReadyOnly: document.getElementById("contact-ready-only"),
    body: document.getElementById("prospects-body"),
    empty: document.getElementById("prospects-empty"),
    tableCount: document.getElementById("table-count"),
    scanned: document.getElementById("analytics-scanned"),
    validated: document.getElementById("analytics-validated"),
    saved: document.getElementById("analytics-saved"),
    scannedBar: document.getElementById("analytics-scanned-bar"),
    validatedBar: document.getElementById("analytics-validated-bar"),
    savedBar: document.getElementById("analytics-saved-bar"),
    categoryDonut: document.getElementById("prospect-category-donut"),
    categoryTotal: document.getElementById("prospect-category-total"),
    categoryLegend: document.getElementById("prospect-category-legend"),
    historyBody: document.getElementById("history-body"),
    historyEmpty: document.getElementById("history-empty"),
    selectAll: document.getElementById("select-all"),
    deleteSelected: document.getElementById("delete-selected"),
    export: document.getElementById("page-export"),
    exportFormat: document.getElementById("export-format"),
    toast: document.getElementById("page-toast")
  });
  applyInitialQuery();
  bindEvents();
  await loadProspects();
}

function bindEvents() {
  refs.search.addEventListener("input", render);
  refs.status.addEventListener("change", render);
  refs.city.addEventListener("change", render);
  refs.sort.addEventListener("change", render);
  refs.contactReadyOnly.addEventListener("change", render);
  refs.selectAll.addEventListener("change", toggleSelectAll);
  refs.deleteSelected.addEventListener("click", deleteSelected);
  refs.export.addEventListener("click", exportProspects);
}

async function loadProspects() {
  const [prospectsResponse, historyResponse] = await Promise.all([
    sendMessage(MESSAGE_TYPES.getAllProspects),
    sendMessage(MESSAGE_TYPES.getScanHistory)
  ]);
  prospects = prospectsResponse.payload || [];
  scanHistory = historyResponse.payload || [];
  renderCityOptions();
  render();
  renderHistory();
}

function render() {
  const filtered = getFilteredProspects();
  const total = prospects.length;
  refs.total.textContent = prospects.length;
  refs.strong.textContent = prospects.filter((item) => item.status === "PROSPEK_KUAT").length;
  refs.pending.textContent = prospects.filter((item) => !item.notes).length;
  refs.empty.hidden = filtered.length > 0;
  refs.body.replaceChildren(...filtered.map(renderRow));
  refs.tableCount.textContent = `Menampilkan ${filtered.length} dari ${total} hasil`;
  refs.selectAll.checked = filtered.length > 0 && filtered.every((item) => selectedIds.has(item.id));
  renderAnalytics();
  updateBulkState();
}

function getFilteredProspects() {
  const query = refs.search.value.trim().toLowerCase();
  const status = refs.status.value;
  const city = refs.city.value;
  const sorted = [...prospects].filter((prospect) => {
    if (status !== "ALL" && prospect.status !== status) return false;
    if (city !== "ALL" && normalizeFilterValue(prospect.business?.city) !== city) return false;
    if (refs.contactReadyOnly.checked && !getLeadProfile(prospect).contactReady) return false;
    if (!query) return true;
    const business = prospect.business || {};
    return `${business.name || ""} ${business.city || ""} ${business.category || ""}`.toLowerCase().includes(query);
  });

  if (refs.sort.value === "oldest") {
    sorted.sort((a, b) => new Date(a.savedAt) - new Date(b.savedAt));
  } else if (refs.sort.value === "rating") {
    sorted.sort((a, b) => Number(b.business?.rating || 0) - Number(a.business?.rating || 0));
  } else if (refs.sort.value === "score") {
    sorted.sort((a, b) => getLeadProfile(b).score - getLeadProfile(a).score);
  } else {
    sorted.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  }
  return sorted;
}

function renderRow(prospect) {
  const business = prospect.business || {};
  const leadProfile = getLeadProfile(prospect);
  const row = document.createElement("tr");
  row.append(
    cell(checkbox(prospect.id), "checkbox-col"),
    cell(el("div", { className: "business-cell" }, el("strong", {}, business.name || "-"), el("span", {}, business.category || "-"))),
    cell(business.city || "-"),
    cell(renderRating(business)),
    cell(renderLeadScore(leadProfile)),
    cell(renderBadge(prospect.status)),
    cell(renderSocial(business)),
    cell(renderActions(prospect), "text-right")
  );
  return row;
}

function renderRating(business) {
  return el("div", { className: "rating-cell" },
    el("span", { className: "star-icon", "aria-hidden": "true" }),
    el("strong", {}, business.rating ?? "-"),
    el("span", {}, `(${business.reviewCount ?? 0})`)
  );
}

function renderLeadScore(profile) {
  return el("div", { className: "score-cell" },
    el("strong", {}, String(profile.score)),
    el("span", { className: `confidence-text ${profile.confidenceTone}` }, profile.confidence)
  );
}

function checkbox(id) {
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = selectedIds.has(id);
  input.setAttribute("aria-label", "Pilih prospek");
  input.addEventListener("change", () => {
    if (input.checked) selectedIds.add(id);
    else selectedIds.delete(id);
    updateBulkState();
  });
  return input;
}

function renderSocial(business) {
  const url = getSocialUrls(business)[0];
  if (!url) return el("span", { className: "muted-cell" }, "Tidak ada");
  const anchor = el("a", { className: "social-link", href: url, target: "_blank", rel: "noreferrer" }, cleanUrlLabel(url));
  return anchor;
}

function getSocialUrls(business = {}) {
  return [
    business.instagram,
    business.facebook,
    business.tiktok,
    business.youtube,
    business.linkedin,
    business.x
  ].filter(Boolean);
}

function renderActions(prospect) {
  const wrap = el("div", { className: "table-actions" });
  const detail = el("button", { className: "link-button primary-action", type: "button" }, "Detail");
  detail.addEventListener("click", () => openDetailPage(prospect));
  const maps = el("button", { className: "link-button", type: "button" }, "Maps");
  maps.addEventListener("click", () => {
    if (prospect.business?.mapsUrl) chrome.tabs.create({ url: prospect.business.mapsUrl });
  });
  const remove = el("button", { className: "link-button danger-action", type: "button", "aria-label": "Hapus prospek" }, "Hapus");
  remove.addEventListener("click", async () => {
    await sendMessage(MESSAGE_TYPES.deleteProspect, { id: prospect.id });
    selectedIds.delete(prospect.id);
    await loadProspects();
  });
  const copy = el("button", { className: "link-button", type: "button" }, "Copy");
  copy.addEventListener("click", () => copyOutreach(prospect));
  wrap.append(detail, maps, copy, remove);
  return wrap;
}

function renderAnalytics() {
  const totalScanned = scanHistory.reduce((sum, item) => sum + Number(item.totalScanned || 0), 0) || prospects.length;
  const validated = prospects.filter((item) => item.status === STATUS.strong || item.status === STATUS.prospect).length;
  const saved = prospects.length;
  refs.scanned.textContent = formatNumber(totalScanned);
  refs.validated.textContent = formatNumber(validated);
  refs.saved.textContent = formatNumber(saved);
  setBar(refs.scannedBar, 100);
  setBar(refs.validatedBar, totalScanned ? (validated / totalScanned) * 100 : 0);
  setBar(refs.savedBar, totalScanned ? (saved / totalScanned) * 100 : saved ? 100 : 0);
  renderCategoryAnalytics();
}

function renderCategoryAnalytics() {
  const categories = getCategoryDistribution();
  refs.categoryTotal.textContent = formatNumber(prospects.length);
  if (!categories.length) {
    renderDonut(refs.categoryDonut, []);
    refs.categoryLegend.replaceChildren(el("span", { className: "muted-cell" }, "Belum ada kategori."));
    return;
  }
  const total = categories.reduce((sum, item) => sum + item.count, 0) || 1;
  renderDonut(refs.categoryDonut, categories);
  refs.categoryLegend.replaceChildren(...categories.map((item, index) => {
    return el("div", { className: "category-legend-row" },
      el("span", { className: "category-legend-name" },
        el("i", { className: `chart-color-${index % 5}` }),
        item.name
      ),
      el("strong", {}, String(item.count))
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
    const percent = total ? (item.count / total) * 100 : 0;
    const segment = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    segment.setAttribute("class", `donut-segment chart-color-${index % 5}`);
    segment.setAttribute("cx", "21");
    segment.setAttribute("cy", "21");
    segment.setAttribute("r", "15.915");
    segment.setAttribute("stroke-dasharray", `${percent} ${100 - percent}`);
    segment.setAttribute("stroke-dashoffset", String(-offset));
    svg.append(segment);
    offset += percent;
  });

  root.replaceChildren(
    svg,
    el("strong", {}, formatNumber(total)),
    el("span", {}, "Total")
  );
}

function renderCityOptions() {
  const current = refs.city.value || "ALL";
  const cities = [...new Set(prospects.map((item) => item.business?.city).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  refs.city.replaceChildren(
    optionNode("ALL", "Semua Kota"),
    ...cities.map((city) => optionNode(normalizeFilterValue(city), city))
  );
  refs.city.value = [...refs.city.options].some((option) => option.value === current) ? current : "ALL";
}

function renderBadge(status) {
  const meta = STATUS_META[status] || { label: status || "-", tone: "neutral" };
  return el("span", { className: `badge badge-${meta.tone}`, role: "status" }, meta.label);
}

function toggleSelectAll() {
  const filtered = getFilteredProspects();
  if (refs.selectAll.checked) {
    filtered.forEach((item) => selectedIds.add(item.id));
  } else {
    filtered.forEach((item) => selectedIds.delete(item.id));
  }
  render();
}

async function deleteSelected() {
  if (!selectedIds.size) return;
  await sendMessage(MESSAGE_TYPES.clearProspects, { ids: [...selectedIds] });
  selectedIds.clear();
  await loadProspects();
}

async function exportProspects() {
  const response = await sendMessage(MESSAGE_TYPES.exportProspects, {
    prospects: getFilteredProspects(),
    format: refs.exportFormat.value
  });
  downloadTextFile(response.payload);
}

function renderHistory() {
  const recent = [...scanHistory].slice(0, 12);
  refs.historyEmpty.hidden = recent.length > 0;
  refs.historyBody.replaceChildren(...recent.map((session) => {
    const row = document.createElement("tr");
    row.append(
      cell(formatDateTime(session.startedAt)),
      cell(session.query || "-"),
      cell(session.location || "-"),
      cell(session.totalScanned ?? 0),
      cell(session.totalFiltered ?? 0),
      cell(session.totalSaved ?? 0)
    );
    return row;
  }));
}

async function copyOutreach(prospect) {
  const message = buildOutreachMessage(prospect);
  try {
    await navigator.clipboard.writeText(message);
    showToast("Template pesan disalin.");
  } catch {
    showToast(message);
  }
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    refs.toast.hidden = true;
  }, 2600);
}

function openDetailPage(prospect) {
  chrome.tabs.create({
    url: chrome.runtime.getURL(`pages/prospect-detail.html?id=${encodeURIComponent(prospect.id)}`)
  });
}

function updateBulkState() {
  refs.deleteSelected.disabled = selectedIds.size === 0;
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
  if (sorted.length <= 3) return sorted;
  const top = sorted.slice(0, 2);
  const otherCount = sorted.slice(2).reduce((sum, item) => sum + item.count, 0);
  return [...top, { name: "Lainnya", count: otherCount }];
}

function setBar(node, value) {
  node.dataset.pct = bucketPercent(Math.max(4, Number(value) || 0));
}

function applyInitialQuery() {
  const query = new URLSearchParams(location.search).get("q");
  if (query) refs.search.value = query;
}

function optionNode(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

function normalizeFilterValue(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeLabel(value) {
  const text = String(value || "").trim();
  return text ? text[0].toUpperCase() + text.slice(1) : "Lainnya";
}

function cleanUrlLabel(url) {
  return String(url || "").replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
}

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(Number(value || 0));
}

function bucketPercent(value) {
  const number = Number(value) || 0;
  return String(Math.max(0, Math.min(100, Math.round(number / 5) * 5)));
}

function cell(content, className = "") {
  const td = document.createElement("td");
  if (className) td.className = className;
  if (content instanceof Node) td.append(content);
  else td.textContent = String(content ?? "");
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

function sendMessage(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, payload }).then((response) => {
    if (!response?.ok) throw new Error(response?.error || "Operasi gagal.");
    return response;
  });
}
