import { CATEGORY_OPTIONS, LOCATION_OPTIONS, MESSAGE_TYPES, SCAN_TARGET_OPTIONS } from "../utils/constants.js";
import { downloadTextFile } from "../utils/exporter.js";

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindEvents();
  await Promise.all([loadStats(), updateMapsStatus()]);
}

function bindEvents() {
  renderCategoryOptions();
  renderLocationOptions();
  renderTargetOptions();
  document.getElementById("search-form").addEventListener("submit", startSearchAndScan);
  document.getElementById("open-dashboard").addEventListener("click", () => {
    sendMessage(MESSAGE_TYPES.openPage, { page: "dashboard" });
  });
  document.getElementById("open-prospects").addEventListener("click", () => {
    sendMessage(MESSAGE_TYPES.openPage, { page: "prospects" });
  });
  document.getElementById("open-settings").addEventListener("click", () => {
    sendMessage(MESSAGE_TYPES.openPage, { page: "settings" });
  });
  document.getElementById("export-csv").addEventListener("click", exportCsv);
}

function renderCategoryOptions() {
  const select = document.getElementById("category-select");
  select.replaceChildren(...CATEGORY_OPTIONS.map((option) => {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = option.label;
    return item;
  }));
}

function renderLocationOptions() {
  const list = document.getElementById("location-options");
  list.replaceChildren(...LOCATION_OPTIONS.filter((option) => option.value).map((option) => {
    const item = document.createElement("option");
    item.value = option.value;
    item.label = option.label;
    return item;
  }));
}

function renderTargetOptions() {
  const select = document.getElementById("target-count-select");
  select.replaceChildren(...SCAN_TARGET_OPTIONS.map((option) => {
    const item = document.createElement("option");
    item.value = String(option.value);
    item.textContent = option.label;
    if (option.value === 25) item.selected = true;
    return item;
  }));
}

async function startSearchAndScan(event) {
  event.preventDefault();
  const keyword = document.getElementById("keyword-input").value.trim();
  const category = document.getElementById("category-select").value;
  const location = document.getElementById("location-input").value.trim();
  const targetCount = Number(document.getElementById("target-count-select").value || 25);
  if (!keyword && !category) {
    showToast("Pilih kategori atau isi keyword bisnis.", false);
    return;
  }

  const button = document.getElementById("scan-button");
  button.disabled = true;
  button.textContent = "Membuka panel...";
  try {
    await chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
    button.textContent = "Membuka Maps...";
    await sendMessage(MESSAGE_TYPES.searchMaps, { keyword, category, location, targetCount });
    window.close();
  } catch (error) {
    const message = /sidePanel\.open|user gesture/i.test(error.message || "")
      ? "Klik tombol Cari & Scan sekali lagi."
      : /Unknown message type: SEARCH_MAPS/i.test(error.message || "")
      ? "Reload extension dulu di chrome://extensions."
      : error.message || "Gagal memulai scan.";
    showToast(message, false);
    button.disabled = false;
    button.textContent = "Cari & Scan";
  }
}

async function loadStats() {
  const response = await sendMessage(MESSAGE_TYPES.getStats);
  const stats = response.payload;
  document.getElementById("today-scanned").textContent = stats.todayScanned ?? 0;
  document.getElementById("today-prospects").textContent = stats.todayProspects ?? 0;
  document.getElementById("today-saved").textContent = stats.todaySaved ?? 0;
}

async function updateMapsStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isMaps = /^https:\/\/(www\.)?google\.[^/]+\/maps\//.test(tab?.url || "")
    || /^https:\/\/maps\.google\.com\//.test(tab?.url || "");
  document.getElementById("maps-status").textContent = isMaps ? "Aktif di Google Maps" : "Siap cari dari extension";
  document.getElementById("maps-dot").classList.toggle("is-success", isMaps);
  document.getElementById("maps-dot").classList.toggle("is-muted", !isMaps);
}

async function exportCsv() {
  try {
    const prospectsResponse = await sendMessage(MESSAGE_TYPES.getAllProspects);
    const prospects = prospectsResponse.payload || [];
    if (!prospects.length) {
      showToast("Belum ada data untuk diekspor.", false);
      return;
    }
    const response = await sendMessage(MESSAGE_TYPES.exportProspects, { prospects, format: "csv" });
    downloadTextFile(response.payload);
    showToast("Data berhasil diekspor.", true);
  } catch (error) {
    showToast(error.message || "Gagal export.", false);
  }
}

function showToast(message, success) {
  const toast = document.getElementById("popup-toast");
  toast.textContent = message;
  toast.classList.toggle("is-success", Boolean(success));
  toast.classList.toggle("is-error", !success);
  toast.hidden = false;
  setTimeout(() => {
    toast.hidden = true;
  }, 2400);
}

function sendMessage(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, payload }).then((response) => {
    if (!response?.ok) throw new Error(response?.error || "Operasi gagal.");
    return response;
  });
}
