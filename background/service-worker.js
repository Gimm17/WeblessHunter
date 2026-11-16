import { MESSAGE_TYPES, PAGE_PATHS, STATUS } from "../utils/constants.js";
import { getExportPayload } from "../utils/exporter.js";
import { generateId, getBusinessDedupeKey } from "../utils/helpers.js";
import {
  addScanSession,
  clearProspects,
  deleteProspect,
  ensureDefaults,
  getIgnoredBusinesses,
  getProspects,
  getScanHistory,
  getSettings,
  getStats,
  ignoreBusiness,
  saveProspect,
  saveSettings,
  updateScanSession
} from "../utils/storage.js";
import { runDoubleCheck } from "../engine/double-check.js";
import { generateAiDoc, generateAiDocs, generateAiDocStream } from "../engine/ai-doc-generator.js";

let activeMapsTabId = null;
let lastScanSessionId = null;
let lastCandidates = [];
let pendingSearch = null;

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaults();
});

chrome.runtime.onStartup.addListener(() => {
  ensureDefaults();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  dispatchMessage(message, sender)
    .then((payload) => sendResponse({ ok: true, payload }))
    .catch((error) => sendResponse({ ok: false, error: error?.message || "Unexpected background error" }));
  return true;
});

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== MESSAGE_TYPES.generateAiDocStream) return;

  let disconnected = false;
  let running = false;
  let abortController = null;

  port.onDisconnect.addListener(() => {
    disconnected = true;
    abortController?.abort();
  });

  port.onMessage.addListener(async (message = {}) => {
    if (running || message.type !== MESSAGE_TYPES.generateAiDocStream) return;
    running = true;
    try {
      abortController = new AbortController();
      const payload = message.payload ?? {};
      const settings = await getSettings();
      const prospect = payload.prospect || { business: payload.business || findCandidate(payload.businessId) || {} };
      const result = await generateAiDocStream(prospect, settings, payload.docType || "prd", (chunk, content) => {
        if (disconnected) return;
        port.postMessage({
          type: MESSAGE_TYPES.aiDocChunk,
          payload: { chunk, content }
        });
      }, { signal: abortController.signal });

      if (!disconnected) {
        port.postMessage({
          type: MESSAGE_TYPES.aiDocComplete,
          payload: result
        });
      }
    } catch (error) {
      if (!disconnected) {
        port.postMessage({
          type: MESSAGE_TYPES.aiDocError,
          error: error?.message || "Generate AI gagal."
        });
      }
    } finally {
      running = false;
      abortController = null;
    }
  });
});

async function dispatchMessage(message = {}, sender = {}) {
  switch (message.type) {
    case MESSAGE_TYPES.openSidePanel:
      return openSidePanel(sender);
    case MESSAGE_TYPES.searchMaps:
      return searchMaps(message.payload ?? {}, sender);
    case MESSAGE_TYPES.requestScan:
      return requestScan(message.payload ?? {});
    case MESSAGE_TYPES.scanProgress:
      if (message.payload?.relayed) return message.payload;
      return forwardScanProgress(message.payload ?? {}, sender);
    case MESSAGE_TYPES.requestDoubleCheck:
      return requestDoubleCheck(message.payload);
    case MESSAGE_TYPES.saveProspect:
      return saveProspectFromPayload(message.payload);
    case MESSAGE_TYPES.deleteProspect:
      return deleteProspect(message.payload?.id);
    case MESSAGE_TYPES.clearProspects:
      return clearProspects(message.payload?.ids ?? null);
    case MESSAGE_TYPES.getAllProspects:
      return getProspects();
    case MESSAGE_TYPES.getScanHistory:
      return getScanHistory();
    case MESSAGE_TYPES.getIgnoredBusinesses:
      return getIgnoredBusinesses();
    case MESSAGE_TYPES.ignoreBusiness:
      return ignoreBusinessFromPayload(message.payload ?? {});
    case MESSAGE_TYPES.generateAiDoc:
      return generateAiDocFromPayload(message.payload ?? {});
    case MESSAGE_TYPES.generateAiDocs:
      return generateAiDocsFromPayload(message.payload ?? {});
    case MESSAGE_TYPES.exportProspects:
      return exportProspects(message.payload);
    case MESSAGE_TYPES.getSettings:
      return getSettings();
    case MESSAGE_TYPES.saveSettings:
      return saveSettings(message.payload?.settings ?? {});
    case MESSAGE_TYPES.getStats:
      return getStats();
    case MESSAGE_TYPES.openPage:
      return openExtensionPage(message.payload?.page);
    default:
      throw new Error(`Unknown message type: ${message.type}`);
  }
}

async function openSidePanel(sender) {
  const tabId = sender?.tab?.id ?? await getActiveMapsTabId();
  if (!tabId) throw new Error("Buka Google Maps terlebih dahulu.");
  activeMapsTabId = tabId;

  await chrome.sidePanel.setOptions({
    tabId,
    path: "sidepanel/panel.html",
    enabled: true
  });
  await chrome.sidePanel.open({ tabId });
  return { tabId };
}

async function searchMaps(payload = {}, sender = {}) {
  const query = buildSearchQuery(payload);
  if (!query) throw new Error("Isi keyword atau pilih kategori dulu.");
  const targetCount = normalizeTargetCount(payload.targetCount);
  const location = normalizeQueryPart(payload.location);

  const tab = await getOrCreateMapsTab(sender);
  activeMapsTabId = tab.id;
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
  pendingSearch = {
    query,
    location,
    targetCount,
    tabId: tab.id,
    url,
    createdAt: Date.now()
  };
  await chrome.tabs.update(tab.id, { url, active: true });

  await chrome.sidePanel.setOptions({
    tabId: tab.id,
    path: "sidepanel/panel.html",
    enabled: true
  });

  return { tabId: tab.id, query, location, targetCount, url };
}

async function requestScan(options = {}) {
  const maxWaitMs = Number(options.maxWaitMs ?? 35000);
  const targetCount = normalizeTargetCount(options.targetCount ?? pendingSearch?.targetCount);
  const tabId = await ensureMapsTab(Math.min(8000, maxWaitMs));
  const response = await scanMapsWithRetry(tabId, maxWaitMs, targetCount);
  if (!response?.ok) {
    throw new Error(response?.error || "Gagal membaca hasil Google Maps.");
  }

  const settings = await getSettings();
  const ignored = await getIgnoredBusinesses();
  const ignoredKeys = new Set(ignored.map((item) => item.key));
  const rawItems = response.payload?.items ?? [];
  const candidates = rawItems
    .filter((item) => !ignoredKeys.has(getBusinessDedupeKey(item)))
    .filter((item) => Number(item.rating ?? 0) >= Number(settings.minRating ?? 0))
    .filter((item) => Number(item.reviewCount ?? 0) >= Number(settings.minReviewCount ?? 0))
    .map((item) => ({
      ...item,
      status: STATUS.unchecked,
      checked: false
    }));

  lastCandidates = candidates;
  const session = await addScanSession({
    id: generateId(),
    query: response.payload?.query ?? "",
    location: pendingSearch?.location || extractLocationFromQuery(response.payload?.query ?? ""),
    totalScanned: rawItems.length,
    totalFiltered: candidates.length,
    totalSaved: 0
  });
  lastScanSessionId = session.id;

  return {
    query: response.payload?.query ?? "",
    location: pendingSearch?.location || extractLocationFromQuery(response.payload?.query ?? ""),
    targetCount,
    exhausted: Boolean(response.payload?.exhausted),
    totalScanned: rawItems.length,
    totalFiltered: candidates.length,
    candidates,
    session
  };
}

async function scanMapsWithRetry(tabId, maxWaitMs, targetCount) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < maxWaitMs) {
    try {
      await waitForTabComplete(tabId, 5000);
      const response = await chrome.tabs.sendMessage(tabId, {
        type: MESSAGE_TYPES.startScraping,
        payload: { targetCount }
      });
      if (response?.ok && Number(response.payload?.total ?? 0) > 0) {
        return response;
      }
      lastError = new Error("Hasil Maps belum siap.");
    } catch (error) {
      lastError = error;
    }
    await delay(800);
  }

  try {
    return await chrome.tabs.sendMessage(tabId, {
      type: MESSAGE_TYPES.startScraping,
      payload: { targetCount }
    });
  } catch (error) {
    throw lastError || error;
  }
}

async function requestDoubleCheck(payload = {}) {
  const business = payload.business ?? findCandidate(payload.businessId);
  if (!business) throw new Error("Data bisnis tidak ditemukan.");
  const detailedBusiness = await getBusinessDetailFromMaps(business);
  const settings = await getSettings();
  const result = await runDoubleCheck(detailedBusiness, { ...settings, query: business.query }, (progress) => {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.checkProgress,
      payload: {
        businessId: payload.businessId || business.mapsUrl || business.name,
        progress
      }
    }).catch(() => {});
  });

  const completed = {
    ...result,
    business: {
      ...detailedBusiness,
      ...result.business,
      website: result.websiteUrl || detailedBusiness.website || null
    }
  };

  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.checkComplete,
    payload: {
      businessId: payload.businessId || business.mapsUrl || business.name,
      result: completed
    }
  }).catch(() => {});

  return completed;
}

async function saveProspectFromPayload(payload = {}) {
  let prospect = payload.prospect;
  if (!prospect?.validation && payload.business) {
    const checked = await requestDoubleCheck({ business: payload.business });
    prospect = {
      status: checked.status,
      notes: payload.notes ?? "",
      business: checked.business,
      validation: checked.validation
    };
  }

  if (!prospect) throw new Error("Data prospek kosong.");
  const saved = await saveProspect({
    ...prospect,
    notes: payload.notes ?? prospect.notes ?? ""
  });

  if (lastScanSessionId) {
    const prospects = await getProspects();
    await updateScanSession(lastScanSessionId, {
      totalSaved: prospects.length,
      prospectIds: prospects.map((item) => item.id)
    });
  }

  return saved;
}

async function exportProspects(payload = {}) {
  const settings = await getSettings();
  const prospects = Array.isArray(payload.prospects) ? payload.prospects : await getProspects();
  return getExportPayload(prospects, payload.format || settings.exportFormat || "csv");
}

async function ignoreBusinessFromPayload(payload = {}) {
  const business = payload.business ?? findCandidate(payload.businessId) ?? {};
  const ignored = await ignoreBusiness(business);
  lastCandidates = lastCandidates.filter((item) => getBusinessDedupeKey(item) !== getBusinessDedupeKey(business));
  return ignored;
}

async function generateAiDocsFromPayload(payload = {}) {
  const settings = await getSettings();
  const prospect = payload.prospect || { business: payload.business || findCandidate(payload.businessId) || {} };
  return generateAiDocs(prospect, settings);
}

async function generateAiDocFromPayload(payload = {}) {
  const settings = await getSettings();
  const prospect = payload.prospect || { business: payload.business || findCandidate(payload.businessId) || {} };
  return generateAiDoc(prospect, settings, payload.docType || "prd");
}

async function forwardScanProgress(payload = {}, sender = {}) {
  if (sender?.tab?.id && activeMapsTabId && sender.tab.id !== activeMapsTabId) {
    return payload;
  }
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.scanProgress,
    payload: {
      ...payload,
      relayed: true,
      tabId: sender?.tab?.id ?? payload.tabId ?? activeMapsTabId
    }
  }).catch(() => {});
  return payload;
}

async function openExtensionPage(page) {
  const path = PAGE_PATHS[page] || PAGE_PATHS.prospects;
  const tab = await chrome.tabs.create({ url: chrome.runtime.getURL(path), active: true });
  return { tabId: tab.id };
}

async function getBusinessDetailFromMaps(business) {
  try {
    const tabId = await ensureMapsTab();
    const response = await chrome.tabs.sendMessage(tabId, {
      type: MESSAGE_TYPES.scrapeBusinessDetail,
      payload: { business }
    });
    if (response?.ok && response.payload?.name) {
      return response.payload;
    }
  } catch {
    // Fall back to existing listing data if Maps detail scraping fails.
  }
  return business;
}

function findCandidate(businessId) {
  return lastCandidates.find((item) => item.mapsUrl === businessId || item.placeId === businessId || item.name === businessId) ?? null;
}

async function ensureMapsTab(timeout = 0) {
  const startedAt = Date.now();
  do {
    if (activeMapsTabId) {
      try {
        const tab = await chrome.tabs.get(activeMapsTabId);
        if (isMapsUrl(tab.url)) return activeMapsTabId;
      } catch {
        activeMapsTabId = null;
      }
    }

    const tabId = await getActiveMapsTabId();
    if (tabId) {
      activeMapsTabId = tabId;
      return tabId;
    }

    if (Date.now() - startedAt >= timeout) break;
    await delay(250);
  } while (true);

  throw new Error("Buka halaman Google Maps dengan hasil pencarian bisnis.");
}

async function getActiveMapsTabId() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return isMapsUrl(tab?.url) ? tab.id : null;
}

async function getOrCreateMapsTab(sender = {}) {
  if (sender.tab?.id && isMapsUrl(sender.tab.url)) return sender.tab;

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.id && isMapsUrl(activeTab.url)) return activeTab;

  if (activeMapsTabId) {
    try {
      const tab = await chrome.tabs.get(activeMapsTabId);
      if (tab?.id) return tab;
    } catch {
      activeMapsTabId = null;
    }
  }

  return chrome.tabs.create({ url: "https://www.google.com/maps", active: true });
}

function isMapsUrl(url) {
  return /^https:\/\/(www\.)?google\.[^/]+\/maps\//.test(url || "")
    || /^https:\/\/maps\.google\.com\//.test(url || "");
}

function buildSearchQuery(payload = {}) {
  const keyword = normalizeQueryPart(payload.keyword);
  const category = normalizeQueryPart(payload.category);
  const location = normalizeQueryPart(payload.location);
  const searchTerm = combineSearchTerms(category, keyword);
  if (!searchTerm) return "";
  if (location && !containsQueryPart(searchTerm, location) && !containsQueryPart(searchTerm, getPrimaryLocation(location))) {
    return `${searchTerm} ${location}`;
  }
  return searchTerm;
}

function combineSearchTerms(category, keyword) {
  if (keyword && category && !containsQueryPart(keyword, category)) {
    return `${category} ${keyword}`;
  }
  return keyword || category;
}

function normalizeQueryPart(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function containsQueryPart(source, part) {
  if (!part) return true;
  return normalizeForQueryCompare(source).includes(normalizeForQueryCompare(part));
}

function normalizeForQueryCompare(value) {
  return normalizeQueryPart(value).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function getPrimaryLocation(location) {
  return normalizeQueryPart(location).split(",")[0] || "";
}

function normalizeTargetCount(value) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 25;
  return Math.min(Math.max(parsed, 1), 100);
}

function waitForTabComplete(tabId, timeout = 5000) {
  return new Promise((resolve) => {
    const timer = setTimeout(cleanup, timeout);

    function cleanup() {
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        cleanup();
      }
    }

    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === "complete") cleanup();
    }).catch(cleanup);
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractLocationFromQuery(query) {
  const parts = String(query || "").trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : null;
}
