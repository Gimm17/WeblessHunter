import { MESSAGE_TYPES, STATUS, STATUS_META } from "../utils/constants.js";
import { downloadTextFile } from "../utils/exporter.js";
import { formatDateTime } from "../utils/helpers.js";
import { buildOutreachMessage, getLeadKey, getLeadProfile, isHotProspect } from "../utils/lead.js";

const state = {
  activeTab: "candidates",
  candidates: [],
  saved: [],
  query: "",
  selected: null,
  progress: null,
  scanProgress: 0,
  targetCount: 25,
  hasRealtimeScanProgress: false,
  scanMessage: "Menunggu hasil Google Maps...",
  hotOnly: false,
  bulkRunning: false,
  bulkMessage: "",
  loading: false
};

const refs = {};
const selectedCandidateKeys = new Set();
let scanProgressTimer = null;

document.addEventListener("DOMContentLoaded", init);

function init() {
  cacheRefs();
  bindEvents();
  listenRuntimeMessages();
  loadInitialData();
}

function cacheRefs() {
  Object.assign(refs, {
    summary: document.getElementById("scan-summary"),
    scanState: document.getElementById("scan-state"),
    scanDot: document.getElementById("scan-dot"),
    tabCandidates: document.getElementById("tab-candidates"),
    tabSaved: document.getElementById("tab-saved"),
    tabContact: document.getElementById("tab-contact"),
    exportButton: document.getElementById("export-button"),
    settingsButton: document.getElementById("settings-button"),
    closeButton: document.getElementById("close-button"),
    hotFilter: document.getElementById("hot-filter"),
    checkTop: document.getElementById("check-top"),
    checkAll: document.getElementById("check-all"),
    saveSelected: document.getElementById("save-selected"),
    statusFilter: document.getElementById("status-filter"),
    ratingFilter: document.getElementById("rating-filter"),
    searchInput: document.getElementById("search-input"),
    listView: document.getElementById("list-view"),
    detailView: document.getElementById("detail-view"),
    toast: document.getElementById("toast")
  });
}

function bindEvents() {
  refs.tabCandidates.addEventListener("click", () => setActiveTab("candidates"));
  refs.tabSaved.addEventListener("click", () => setActiveTab("saved"));
  refs.tabContact.addEventListener("click", () => setActiveTab("contact"));
  refs.exportButton.addEventListener("click", handleExport);
  refs.hotFilter.addEventListener("click", toggleHotFilter);
  refs.checkTop.addEventListener("click", () => bulkCheck(10));
  refs.checkAll.addEventListener("click", () => bulkCheck(null));
  refs.saveSelected.addEventListener("click", bulkSaveSelected);
  refs.settingsButton.addEventListener("click", () => sendMessage(MESSAGE_TYPES.openPage, { page: "settings" }));
  refs.closeButton.addEventListener("click", () => window.close());
  refs.statusFilter.addEventListener("change", renderList);
  refs.ratingFilter.addEventListener("change", renderList);
  refs.searchInput.addEventListener("input", debounce(renderList, 150));
}

function listenRuntimeMessages() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MESSAGE_TYPES.checkProgress) {
      state.progress = message.payload?.progress ?? null;
      if (state.selected) renderProgress(state.selected);
    }

    if (message.type === MESSAGE_TYPES.checkComplete) {
      const result = message.payload?.result;
      if (result) updateCandidateWithResult(result);
    }

    if (message.type === MESSAGE_TYPES.scanProgress) {
      updateScanProgress(message.payload || {});
    }
  });
}

async function loadInitialData() {
  await refreshSaved();
  await scanMaps();
}

async function scanMaps() {
  setScanState("Scanning...");
  setLoading(true);
  startScanProgress();
  try {
    const response = await sendMessage(MESSAGE_TYPES.requestScan, { maxWaitMs: 25000 });
    const payload = response.payload;
    state.query = payload.query || "";
    state.targetCount = payload.targetCount || state.targetCount;
    state.candidates = payload.candidates || [];
    selectedCandidateKeys.clear();
    refs.summary.textContent = getScanSummary(payload);
    state.scanProgress = 100;
    state.scanMessage = payload.exhausted && payload.totalScanned < state.targetCount
      ? `Scan selesai. Maps hanya menyediakan ${payload.totalScanned}/${state.targetCount} data.`
      : `Scan selesai. Target ${Math.min(payload.totalScanned, state.targetCount)}/${state.targetCount} data terkumpul.`;
    renderScanLoading();
    setScanState("Scan selesai");
  } catch (error) {
    refs.summary.textContent = "Hasil Maps belum bisa dibaca";
    setScanState("Idle");
    renderErrorWithRetry(error.message || "Gagal scan Google Maps.");
    return;
  } finally {
    stopScanProgress();
    setLoading(false);
  }
  renderList();
}

function getScanSummary(payload = {}) {
  const totalScanned = Number(payload.totalScanned ?? 0);
  const targetCount = Number(payload.targetCount || state.targetCount || 25);
  const targetText = payload.exhausted && totalScanned < targetCount
    ? `${totalScanned}/${targetCount} hasil tersedia`
    : `${totalScanned}/${targetCount} hasil`;
  return `"${state.query || "Maps"}" - ${targetText} - ${payload.totalFiltered} kandidat`;
}

async function refreshSaved() {
  const response = await sendMessage(MESSAGE_TYPES.getAllProspects);
  state.saved = response.payload || [];
  updateTabs();
}

function setActiveTab(tab) {
  state.activeTab = tab;
  refs.tabCandidates.classList.toggle("is-active", tab === "candidates");
  refs.tabSaved.classList.toggle("is-active", tab === "saved");
  refs.tabContact.classList.toggle("is-active", tab === "contact");
  renderList();
}

function renderList() {
  refs.detailView.hidden = true;
  refs.listView.hidden = false;
  refs.detailView.replaceChildren();
  updateTabs();

  if (state.loading) {
    renderScanLoading();
    return;
  }

  const source = getActiveListSource();

  const filtered = applyFilters(source);
  if (!filtered.length) {
    refs.listView.replaceChildren(el("div", { className: "empty-state" }, getEmptyMessage()));
    updateBulkState();
    return;
  }

  const list = el("div", { className: "business-list" });
  filtered.forEach((business) => list.append(renderBusinessCard(business)));
  refs.listView.replaceChildren(list);
  updateBulkState();
}

function getActiveListSource() {
  if (state.activeTab === "saved") {
    return state.saved.map((prospect) => ({ ...prospect.business, status: prospect.status, validation: prospect.validation, prospect }));
  }
  if (state.activeTab === "contact") {
    const saved = state.saved.map((prospect) => ({ ...prospect.business, status: prospect.status, validation: prospect.validation, prospect }));
    const checkedCandidates = state.candidates.filter((item) => item.validation);
    return [...checkedCandidates, ...saved].filter((item) => getLeadProfile(item.prospect || item).contactReady);
  }
  return state.candidates;
}

function getEmptyMessage() {
  if (state.activeTab === "saved") return "Belum ada prospek tersimpan.";
  if (state.activeTab === "contact") return "Belum ada prospek siap kontak. Jalankan Check dulu atau simpan prospek.";
  return "Tidak ada kandidat yang cocok.";
}

function renderBusinessCard(business) {
  const status = business.status || STATUS.unchecked;
  const leadProfile = getLeadProfile(business.prospect || business);
  const leadKey = getLeadKey(business.prospect || business);
  const checked = isBusinessChecked(business);
  const card = el("article", { className: "card business-card" });
  const header = el("div", { className: "business-card-header" });

  if (state.activeTab === "candidates") {
    const selector = el("input", { type: "checkbox", "aria-label": `Pilih ${business.name || "kandidat"}` });
    selector.checked = selectedCandidateKeys.has(leadKey);
    selector.addEventListener("change", () => {
      if (selector.checked) selectedCandidateKeys.add(leadKey);
      else selectedCandidateKeys.delete(leadKey);
      updateBulkState();
    });
    header.append(selector);
  }

  header.append(
    el("div", { className: "rating-line" }, `${business.rating ?? "-"} `, el("span", {}, `- ${business.reviewCount ?? 0} ulasan`)),
    renderBadge(status)
  );

  card.append(
    header,
    el("h2", { className: "business-name" }, business.name || "Tanpa nama"),
    el("div", { className: "business-meta" }, `${business.category || "Kategori tidak tersedia"} - ${business.city || "Kota belum diketahui"}`),
    renderLeadMeta(leadProfile)
  );

  const socialUrls = getSocialUrls(business);
  if (socialUrls.length) {
    card.append(el("div", { className: "business-social" }, socialUrls[0]));
  }

  const actions = el("div", { className: "card-actions" });
  const detailButton = el("button", { className: "button button-secondary", type: "button" }, checked ? "Detail" : "Lihat Data");
  detailButton.addEventListener("click", () => openPanelDetail(business));

  const saveButton = el("button", { className: "button button-primary", type: "button" }, checked ? "Simpan" : "Check & Simpan");
  saveButton.addEventListener("click", () => saveBusiness(business));
  if (business.prospect) {
    saveButton.textContent = "Tersimpan";
    saveButton.disabled = true;
  }

  if (state.activeTab === "candidates" && !checked) {
    actions.append(actionButton("Check", "button-primary", () => runCheck(business)), detailButton, saveButton);
  } else {
    actions.append(detailButton);
    if (!business.prospect) actions.append(saveButton);
  }

  if (state.activeTab === "contact") {
    actions.replaceChildren(detailButton);
    actions.append(actionButton("Copy Pesan", "button-secondary", () => copyOutreach(business.prospect || business)));
  }
  if (state.activeTab === "candidates") {
    actions.append(actionButton("Ignore", "button-muted", () => ignoreCandidate(business)));
  }
  card.append(actions);
  return card;
}

function openPanelDetail(business) {
  if (business.prospect) {
    showDetailFromProspect(business.prospect);
    return;
  }
  if (isBusinessChecked(business)) {
    showDetail({
      business,
      status: business.status,
      reason: business.reason,
      validation: business.validation
    });
    return;
  }
  showUncheckedDetail(business);
}

function isBusinessChecked(business = {}) {
  const prospect = business.prospect || business;
  return hasValidationResult(prospect.validation)
    || hasValidationResult(business.validation)
    || ((business.status || prospect.status) && (business.status || prospect.status) !== STATUS.unchecked);
}

function hasValidationResult(validation = {}) {
  return Boolean(validation.layer1?.verdict || validation.layer2?.verdict || validation.layer3?.verdict || validation.finalVerdict);
}

function showUncheckedDetail(business) {
  state.selected = business;
  refs.listView.hidden = true;
  refs.detailView.hidden = false;

  const view = el("div", {});
  view.append(
    el("header", { className: "detail-header" },
      actionButton("Kembali", "button-text", renderList),
      el("h1", { className: "detail-title" }, business.name || "Detail Kandidat"),
      el("div", { className: "business-meta" }, `${business.category || "-"} - ${business.city || "-"}`),
      renderLeadMeta(getLeadProfile(business))
    ),
    el("section", { className: "card unchecked-notice", role: "status" },
      el("strong", {}, "Belum dilakukan checking"),
      el("p", {}, "Data ini baru hasil scan listing Google Maps. Jalankan Check untuk memvalidasi website resmi, media sosial, dan status prospek sebelum membuka detail AI atau menyimpan sebagai lead final.")
    ),
    el("section", { className: "card info-list", "aria-label": "Data awal kandidat" },
      infoRow("Rating", `${business.rating ?? "-"} - ${business.reviewCount ?? 0} ulasan`),
      infoRow("Kategori", business.category || "-"),
      infoRow("Kota", business.city || "-"),
      infoRow("Alamat", business.address || "-"),
      infoRow("Telepon", business.phone || "-")
    ),
    el("h2", { className: "detail-section-title" }, "Status Validasi"),
    renderValidationResult({}),
    el("div", { className: "detail-actions precheck-actions" },
      actionButton("Map", "button-muted", () => business.mapsUrl && chrome.tabs.create({ url: business.mapsUrl })),
      actionButton("Ignore", "button-danger", () => ignoreCandidate(business)),
      actionButton("Check Sekarang", "button-primary", () => runCheck(business))
    )
  );

  refs.detailView.replaceChildren(view);
}

function renderLeadMeta(profile) {
  return el("div", { className: "lead-meta" },
    el("span", { className: "score-pill" }, `Score ${profile.score}`),
    el("span", { className: `confidence-pill ${profile.confidenceTone}` }, profile.confidence),
    profile.hot ? el("span", { className: "hot-pill" }, "Prospek Bagus") : null
  );
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

async function runCheck(business) {
  state.selected = business;
  state.progress = {
    step: "layer1",
    status: "running",
    progress: 10,
    message: "Memulai validasi"
  };
  renderProgress(business);

  try {
    const result = await checkBusiness(business);
    showDetail(result);
  } catch (error) {
    showToast(error.message || "Validasi gagal.");
    renderList();
  }
}

async function checkBusiness(business) {
  const response = await sendMessage(MESSAGE_TYPES.requestDoubleCheck, {
    businessId: business.mapsUrl || business.placeId || business.name,
    business
  });
  const result = response.payload;
  updateCandidateWithResult(result);
  return result;
}

async function bulkCheck(limit = null) {
  if (state.bulkRunning) return;
  const candidates = getBulkCheckCandidates(limit);
  if (!candidates.length) {
    showToast("Tidak ada kandidat yang perlu dicek.");
    return;
  }

  state.bulkRunning = true;
  state.selected = null;
  refs.summary.textContent = `Bulk check 0/${candidates.length}`;
  setScanState("Bulk check");
  renderList();
  try {
    for (const [index, candidate] of candidates.entries()) {
      refs.summary.textContent = `Bulk check ${index + 1}/${candidates.length}: ${candidate.name || "Bisnis"}`;
      await checkBusiness(candidate);
    }
    showToast(`Bulk check selesai: ${candidates.length} kandidat.`);
  } catch (error) {
    showToast(error.message || "Bulk check berhenti karena error.");
  } finally {
    state.bulkRunning = false;
    setScanState("Scan selesai");
    renderList();
  }
}

function getBulkCheckCandidates(limit = null) {
  const candidates = applyFilters(state.candidates)
    .filter((item) => !item.validation && !item.prospect && (item.status || STATUS.unchecked) !== STATUS.skip)
    .sort((a, b) => getLeadProfile(b).score - getLeadProfile(a).score);
  return typeof limit === "number" ? candidates.slice(0, limit) : candidates;
}

function renderProgress(business) {
  refs.listView.hidden = true;
  refs.detailView.hidden = false;
  const progress = state.progress || {};
  const percent = Number(progress.progress || 0);
  const view = el("div", { className: "progress-view", "aria-live": "polite" });
  const fill = el("div", { className: "progress-fill" });
  fill.dataset.pct = bucketPercent(percent);

  view.append(
    el("article", { className: "card business-card" },
      el("h2", { className: "business-name" }, business.name || "Bisnis"),
      el("div", { className: "business-meta" }, `${business.category || "-"} - ${business.city || "-"}`)
    ),
    el("h2", { className: "detail-section-title" }, "Memvalidasi bisnis..."),
    renderValidationProgress(progress),
    el("div", { className: "progress-bar", "aria-label": `Progress ${percent} persen` }, fill),
    el("button", { className: "button button-text", type: "button", onclick: renderList }, "Batalkan")
  );
  refs.detailView.replaceChildren(view);
}

function renderValidationProgress(progress) {
  const list = el("div", { className: "validation-list" });
  ["layer1", "layer2", "layer3"].forEach((step) => {
    const stateName = progress.step === step ? progress.status : stepComplete(step, progress.step) ? "complete" : "pending";
    list.append(el("div", { className: "validation-item" },
      el("span", { className: `validation-icon ${stateName === "running" ? "running" : stateName === "complete" ? "complete" : ""}`, "aria-hidden": "true" }),
      el("span", {}, `${labelForStep(step)}${progress.step === step && progress.message ? ` - ${progress.message}` : ""}`)
    ));
  });
  return list;
}

function stepComplete(step, currentStep) {
  const order = ["layer1", "layer2", "layer3", "complete"];
  return order.indexOf(step) < order.indexOf(currentStep);
}

function labelForStep(step) {
  return {
    layer1: "Layer 1 - Maps field check",
    layer2: "Layer 2 - Bio media sosial",
    layer3: "Layer 3 - Google Search"
  }[step] || step;
}

function showDetailFromProspect(prospect) {
  showDetail({
    business: prospect.business,
    status: prospect.status,
    reason: prospect.validation?.finalVerdict || "Data tersimpan.",
    validation: prospect.validation,
    prospect
  });
}

function showDetail(result) {
  const business = result.business || result;
  const leadProfile = getLeadProfile(result);
  state.selected = result;
  refs.listView.hidden = true;
  refs.detailView.hidden = false;

  const view = el("div", {});
  view.append(
    el("header", { className: "detail-header" },
      actionButton("Kembali", "button-text", renderList),
      el("h1", { className: "detail-title" }, business.name || "Detail Bisnis"),
      el("div", { className: "business-meta" }, `${business.category || "-"} - ${business.city || "-"}`),
      renderLeadMeta(leadProfile)
    ),
    el("section", { className: "card info-list", "aria-label": "Informasi bisnis" },
      infoRow("Rating", `${business.rating ?? "-"} - ${business.reviewCount ?? 0} ulasan`),
      infoRow("Alamat", business.address || "-"),
      infoRow("Telepon", business.phone || "-", "mono"),
      infoRow("Website", renderInlineLink(business.website, "Buka website")),
      infoRow("Jam", renderHours(business.hours))
    )
  );

  view.append(el("h2", { className: "detail-section-title" }, "Media Sosial"));
  view.append(el("section", { className: "card info-list" }, infoRow("Link", renderSocialLinks(business))));

  view.append(el("h2", { className: "detail-section-title" }, "Hasil Validasi"));
  view.append(renderValidationResult(result.validation));
  view.append(renderResultCard(result));

  view.append(el("h2", { className: "detail-section-title" }, "Template Outreach"));
  view.append(el("section", { className: "card outreach-card" },
    el("p", {}, buildOutreachMessage(result)),
    actionButton("Copy Pesan", "button-secondary", () => copyOutreach(result)),
    actionButton("Buka Detail + AI", "button-primary", () => openDetailPage(normalizeProspectForDetail(result)))
  ));

  const notesId = "detail-notes";
  view.append(
    el("label", { className: "label detail-section-title", for: notesId }, "Catatan"),
    el("textarea", { className: "textarea", id: notesId, placeholder: "Tambahkan catatan...", value: result.prospect?.notes || "" })
  );

  const actions = el("div", { className: "detail-actions" });
  const mapsButton = actionButton("Map", "button-muted", () => business.mapsUrl && chrome.tabs.create({ url: business.mapsUrl }));
  const skipButton = actionButton(result.prospect?.id ? "Kembali" : "Skip", "button-danger", renderList);
  const saveButton = actionButton(result.prospect?.id ? "Tersimpan" : "Simpan", "button-primary", () => saveCheckedResult(result));
  if (result.prospect?.id) saveButton.disabled = true;
  actions.append(mapsButton, skipButton, saveButton);
  view.append(actions);

  refs.detailView.replaceChildren(view);
}

function renderValidationResult(validation = {}) {
  const list = el("div", { className: "validation-list" });
  [
    ["Layer 1", validation.layer1?.verdict],
    ["Layer 2", validation.layer2?.verdict],
    ["Layer 3", validation.layer3?.verdict]
  ].forEach(([label, verdict]) => {
    list.append(el("div", { className: "validation-item" },
      el("span", { className: `validation-icon ${verdict ? "complete" : ""}`, "aria-hidden": "true" }),
      el("span", {}, `${label} - ${verdict || "Belum dicek"}`)
    ));
  });
  return list;
}

function renderResultCard(result) {
  const meta = STATUS_META[result.status] || STATUS_META[STATUS.unchecked];
  return el("section", { className: `card result-card ${meta.tone}` },
    renderBadge(result.status),
    el("p", {}, result.reason || "Tidak ada alasan validasi.")
  );
}

function infoRow(label, value, className = "") {
  const valueNode = value instanceof Node ? value : el("span", { className }, value || "-");
  return el("div", { className: "info-row" },
    el("strong", {}, label),
    valueNode
  );
}

function renderInlineLink(url, label) {
  if (!url) return el("span", {}, "-");
  return el("a", {
    className: "detail-link",
    href: normalizeHref(url),
    target: "_blank",
    rel: "noreferrer"
  }, label || simplifyUrl(url));
}

function renderSocialLinks(business = {}) {
  const urls = getSocialUrls(business);
  if (!urls.length) return el("span", {}, "-");
  return el("div", { className: "social-link-stack" }, urls.map((url) => renderInlineLink(url, simplifyUrl(url))));
}

function normalizeHref(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function simplifyUrl(url) {
  try {
    const parsed = new URL(normalizeHref(url));
    return `${parsed.hostname.replace(/^www\./, "")}${parsed.pathname === "/" ? "" : parsed.pathname}`.replace(/\/$/, "");
  } catch {
    return String(url || "");
  }
}

function renderHours(hours) {
  if (!Array.isArray(hours) || !hours.length) return "-";
  const today = hours[0];
  return `${today.day || ""} ${today.hours || ""}`.trim();
}

async function saveBusiness(business) {
  if (!isBusinessChecked(business) && !business.prospect) {
    state.selected = business;
    state.progress = {
      step: "layer1",
      status: "running",
      progress: 10,
      message: "Check dulu sebelum simpan"
    };
    renderProgress(business);
    const result = await checkBusiness(business);
    const saved = await saveProspectResult(result);
    await refreshSaved();
    showToast("Prospek tersimpan.");
    showDetailFromProspect(saved);
    return;
  }
  if (business.prospect) return;
  await saveCheckedResult(business);
}

async function saveCheckedResult(result) {
  const notes = document.getElementById("detail-notes")?.value ?? "";
  const saved = await saveProspectResult(result, notes);
  await refreshSaved();
  updateCandidateWithResult({ ...result, status: result.status || STATUS.prospect });
  showToast("Prospek tersimpan.");
  showDetailFromProspect(saved);
}

async function saveProspectResult(result, notes = "") {
  const leadProfile = getLeadProfile(result);
  const prospect = {
    status: result.status || STATUS.prospect,
    notes,
    leadScore: leadProfile.score,
    confidence: leadProfile.confidence,
    business: result.business || result,
    validation: result.validation
  };
  const response = await sendMessage(MESSAGE_TYPES.saveProspect, { prospect, notes });
  return response.payload || prospect;
}

async function bulkSaveSelected() {
  if (!selectedCandidateKeys.size || state.bulkRunning) return;
  const candidates = state.candidates.filter((item) => selectedCandidateKeys.has(getLeadKey(item)));
  if (!candidates.length) return;

  state.bulkRunning = true;
  state.selected = null;
  setScanState("Bulk save");
  try {
    for (const [index, candidate] of candidates.entries()) {
      refs.summary.textContent = `Simpan ${index + 1}/${candidates.length}: ${candidate.name || "Bisnis"}`;
      const result = candidate.validation ? { ...candidate, business: candidate } : await checkBusiness(candidate);
      await saveProspectResult(result);
    }
    selectedCandidateKeys.clear();
    await refreshSaved();
    showToast(`Tersimpan: ${candidates.length} prospek.`);
  } catch (error) {
    showToast(error.message || "Bulk save gagal.");
  } finally {
    state.bulkRunning = false;
    setScanState("Scan selesai");
    renderList();
  }
}

function updateCandidateWithResult(result) {
  const resultBusiness = result.business || {};
  const key = resultBusiness.placeId || resultBusiness.mapsUrl || resultBusiness.name;
  state.candidates = state.candidates.map((item) => {
    const itemKeys = [item.placeId, item.mapsUrl, item.name].filter(Boolean);
    const matched = itemKeys.includes(key) || (item.name && resultBusiness.name && item.name === resultBusiness.name);
    return matched ? { ...item, ...resultBusiness, status: result.status, validation: result.validation, reason: result.reason, checked: true } : item;
  });
}

async function ignoreCandidate(business) {
  await sendMessage(MESSAGE_TYPES.ignoreBusiness, { business });
  const key = getLeadKey(business);
  state.candidates = state.candidates.filter((item) => getLeadKey(item) !== key);
  selectedCandidateKeys.delete(key);
  showToast("Kandidat di-ignore.");
  renderList();
}

async function copyOutreach(input) {
  const message = buildOutreachMessage(input);
  try {
    await navigator.clipboard.writeText(message);
    showToast("Template pesan disalin.");
  } catch {
    showToast(message);
  }
}

function normalizeProspectForDetail(input = {}) {
  if (input.prospect) return input.prospect;
  if (input.id && input.business) return input;
  const checked = hasValidationResult(input.validation);
  return {
    status: input.status || (checked ? STATUS.prospect : STATUS.unchecked),
    notes: input.notes || "",
    leadScore: getLeadProfile(input).score,
    confidence: getLeadProfile(input).confidence,
    business: input.business || input,
    validation: input.validation || {}
  };
}

function openDetailPage(prospect) {
  if (prospect?.id) {
    chrome.tabs.create({
      url: chrome.runtime.getURL(`pages/prospect-detail.html?id=${encodeURIComponent(prospect.id)}`)
    });
    return;
  }

  const encoded = btoa(encodeURIComponent(JSON.stringify(prospect)));
  chrome.tabs.create({
    url: chrome.runtime.getURL(`pages/prospect-detail.html?data=${encodeURIComponent(encoded)}`)
  });
}

function applyFilters(items) {
  const status = refs.statusFilter.value;
  const rating = Number(refs.ratingFilter.value || 0);
  const query = refs.searchInput.value.trim().toLowerCase();
  return items.filter((item) => {
    if (status !== "ALL" && (item.status || STATUS.unchecked) !== status) return false;
    if (rating && Number(item.rating || 0) < rating) return false;
    if (state.hotOnly && !isHotProspect(item.prospect || item)) return false;
    if (!query) return true;
    return `${item.name || ""} ${item.city || ""} ${item.category || ""}`.toLowerCase().includes(query);
  });
}

function toggleHotFilter() {
  state.hotOnly = !state.hotOnly;
  refs.hotFilter.classList.toggle("is-active", state.hotOnly);
  renderList();
}

async function handleExport() {
  await refreshSaved();
  if (!state.saved.length) {
    showToast("Belum ada prospek untuk diekspor.");
    return;
  }
  const response = await sendMessage(MESSAGE_TYPES.exportProspects, { prospects: state.saved });
  downloadTextFile(response.payload);
  showToast("Data berhasil diekspor.");
}

function renderBadge(status) {
  const meta = STATUS_META[status] || STATUS_META[STATUS.unchecked];
  return el("span", { className: `badge badge-${meta.tone}`, role: "status" }, meta.label);
}

function renderError(message) {
  refs.listView.replaceChildren(el("div", { className: "error-state", role: "alert" }, message));
}

function renderErrorWithRetry(message) {
  const wrapper = el("div", { className: "error-state", role: "alert" },
    el("p", {}, message),
    actionButton("Coba Scan Lagi", "button-secondary", scanMaps)
  );
  refs.listView.replaceChildren(wrapper);
}

function updateScanProgress(payload = {}) {
  if (!state.loading) return;
  const targetCount = Number(payload.targetCount || state.targetCount || 25);
  const collected = Number(payload.collected || 0);
  const scrolls = Number(payload.scrolls || 0);
  state.targetCount = targetCount;
  state.hasRealtimeScanProgress = true;
  const collectedRatio = targetCount > 0 ? Math.min(collected / targetCount, 1) : 0;
  const realtimePercent = payload.phase === "done"
    ? 96
    : Math.min(94, 12 + Math.round(collectedRatio * 78) + Math.min(scrolls, 4));
  state.scanProgress = Math.max(state.scanProgress, realtimePercent);
  state.scanMessage = payload.message || `Mengumpulkan ${Math.min(collected, targetCount)}/${targetCount} listing Maps...`;
  renderScanLoading();
}

function renderScanLoading() {
  const fill = el("div", { className: "progress-fill" });
  fill.dataset.pct = bucketPercent(state.scanProgress);
  refs.listView.replaceChildren(
    el("div", { className: "progress-view scan-loading-view", "aria-live": "polite" },
      el("article", { className: "card business-card" },
        el("h2", { className: "business-name" }, "Scanning Google Maps..."),
        el("div", { className: "business-meta" }, state.scanMessage)
      ),
      renderScanSteps(),
      el("div", { className: "progress-bar", "aria-label": `Progress scan ${state.scanProgress} persen` }, fill),
      el("div", { className: "business-meta" }, `${state.scanProgress}%`)
    )
  );
}

function renderScanSteps() {
  const steps = [
    ["maps", "Membuka hasil Maps"],
    ["render", "Menunggu listing bisnis tampil"],
    ["scrape", `Mengumpulkan listing sampai target ${state.targetCount} data`],
    ["filter", "Menerapkan filter rating dan ulasan"]
  ];
  const currentIndex = Math.min(steps.length - 1, Math.floor(state.scanProgress / 25));
  const list = el("div", { className: "validation-list" });
  steps.forEach(([key, label], index) => {
    const className = index < currentIndex ? "complete" : index === currentIndex ? "running" : "";
    list.append(el("div", { className: "validation-item" },
      el("span", { className: `validation-icon ${className}`, "aria-hidden": "true" }),
      el("span", {}, label)
    ));
  });
  return list;
}

function startScanProgress() {
  stopScanProgress();
  state.scanProgress = 6;
  state.hasRealtimeScanProgress = false;
  state.scanMessage = "Membuka atau menunggu hasil Google Maps...";
  renderScanLoading();
  scanProgressTimer = setInterval(() => {
    if (!state.loading) return;
    if (state.hasRealtimeScanProgress) {
      renderScanLoading();
      return;
    }
    if (state.scanProgress < 35) {
      state.scanMessage = "Menunggu halaman Maps selesai dimuat...";
      state.scanProgress += 7;
    } else if (state.scanProgress < 70) {
      state.scanMessage = "Menunggu daftar bisnis muncul di panel Maps...";
      state.scanProgress += 5;
    } else if (state.scanProgress < 92) {
      state.scanMessage = "Membaca listing bisnis yang sudah tampil...";
      state.scanProgress += 3;
    }
    renderScanLoading();
  }, 850);
}

function stopScanProgress() {
  if (scanProgressTimer) {
    clearInterval(scanProgressTimer);
    scanProgressTimer = null;
  }
}

function updateTabs() {
  refs.tabCandidates.textContent = `Kandidat (${state.candidates.length})`;
  refs.tabSaved.textContent = `Tersimpan (${state.saved.length})`;
  const contactReady = getActiveContactCount();
  refs.tabContact.textContent = `Siap Kontak (${contactReady})`;
  updateBulkState();
}

function getActiveContactCount() {
  const saved = state.saved.map((prospect) => ({ ...prospect.business, status: prospect.status, validation: prospect.validation, prospect }));
  const checkedCandidates = state.candidates.filter((item) => item.validation);
  return [...checkedCandidates, ...saved].filter((item) => getLeadProfile(item.prospect || item).contactReady).length;
}

function updateBulkState() {
  const hasSelected = selectedCandidateKeys.size > 0;
  refs.saveSelected.disabled = !hasSelected || state.bulkRunning;
  refs.checkTop.disabled = state.bulkRunning || state.loading;
  refs.checkAll.disabled = state.bulkRunning || state.loading;
  refs.hotFilter.classList.toggle("is-active", state.hotOnly);
  refs.saveSelected.textContent = hasSelected ? `Simpan (${selectedCandidateKeys.size})` : "Simpan Terpilih";
}

function setScanState(text) {
  refs.scanState.textContent = text;
}

function setLoading(value) {
  state.loading = value;
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    refs.toast.hidden = true;
  }, 2600);
}

function actionButton(text, variant, onClick) {
  const button = el("button", { className: `button ${variant}`, type: "button" }, text);
  button.addEventListener("click", onClick);
  return button;
}

function bucketPercent(value) {
  const number = Number(value) || 0;
  return String(Math.max(0, Math.min(100, Math.round(number / 5) * 5)));
}

function sendMessage(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, payload }).then((response) => {
    if (!response?.ok) throw new Error(response?.error || "Operasi gagal.");
    return response;
  });
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "className") node.className = value;
    else if (key === "textContent") node.textContent = value;
    else if (key === "value") node.value = value;
    else if (key.startsWith("data-")) node.setAttribute(key, value);
    else if (key.startsWith("aria-") || key === "role" || key === "for" || key === "id" || key === "type" || key === "placeholder" || key === "tabindex" || key === "href" || key === "target" || key === "rel" || key === "title") node.setAttribute(key, value);
    else if (key === "onclick") node.addEventListener("click", value);
  });
  children.flat().forEach((child) => {
    if (child === null || child === undefined) return;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return node;
}

function debounce(fn, delay) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
