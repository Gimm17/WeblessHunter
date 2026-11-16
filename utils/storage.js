import { AI_MODEL_OPTIONS, DEFAULT_SETTINGS, STORAGE_KEYS } from "./constants.js";
import { generateId, getBusinessDedupeKey, isSameDay } from "./helpers.js";
import { getLeadProfile } from "./lead.js";

function chromeStorageGet(keys) {
  return chrome.storage.local.get(keys);
}

function chromeStorageSet(value) {
  return chrome.storage.local.set(value);
}

export async function getSettings() {
  const result = await chromeStorageGet(STORAGE_KEYS.settings);
  const saved = result[STORAGE_KEYS.settings] ?? {};
  return {
    ...DEFAULT_SETTINGS,
    installedAt: saved.installedAt || DEFAULT_SETTINGS.installedAt || new Date().toISOString(),
    ...saved
  };
}

export async function saveSettings(settings) {
  const current = await getSettings();
  const next = {
    ...current,
    ...settings,
    enableLayer2: Boolean(settings.enableLayer2),
    enableLayer3: Boolean(settings.enableLayer3),
    autoScan: Boolean(settings.autoScan),
    layer2Timeout: Number(settings.layer2Timeout) || DEFAULT_SETTINGS.layer2Timeout,
    layer3Timeout: Number(settings.layer3Timeout) || DEFAULT_SETTINGS.layer3Timeout,
    minRating: Number(settings.minRating) || 0,
    minReviewCount: Number(settings.minReviewCount) || 0,
    exportFormat: settings.exportFormat === "json" ? "json" : "csv",
    aiApiKey: typeof settings.aiApiKey === "string" ? settings.aiApiKey.trim() : current.aiApiKey || "",
    aiBaseUrl: typeof settings.aiBaseUrl === "string" && settings.aiBaseUrl.trim() ? settings.aiBaseUrl.trim().replace(/\/+$/, "") : DEFAULT_SETTINGS.aiBaseUrl,
    aiModel: normalizeAiModel(settings.aiModel || current.aiModel),
    aiTemperature: clampNumber(settings.aiTemperature, 0, 1, DEFAULT_SETTINGS.aiTemperature),
    aiMaxTokens: clampNumber(settings.aiMaxTokens, 1000, 20000, DEFAULT_SETTINGS.aiMaxTokens),
    panelPosition: settings.panelPosition === "left" ? "left" : "right"
  };
  await chromeStorageSet({ [STORAGE_KEYS.settings]: next });
  return next;
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function normalizeAiModel(value) {
  const model = String(value || "").trim();
  return AI_MODEL_OPTIONS.some((option) => option.value === model) ? model : DEFAULT_SETTINGS.aiModel;
}

export async function ensureDefaults() {
  const result = await chromeStorageGet([
    STORAGE_KEYS.settings,
    STORAGE_KEYS.prospects,
    STORAGE_KEYS.scanHistory,
    STORAGE_KEYS.ignoredBusinesses
  ]);

  const updates = {};
  if (!result[STORAGE_KEYS.settings]) {
    updates[STORAGE_KEYS.settings] = {
      ...DEFAULT_SETTINGS,
      installedAt: new Date().toISOString()
    };
  }
  if (!Array.isArray(result[STORAGE_KEYS.prospects])) {
    updates[STORAGE_KEYS.prospects] = [];
  }
  if (!Array.isArray(result[STORAGE_KEYS.scanHistory])) {
    updates[STORAGE_KEYS.scanHistory] = [];
  }
  if (!Array.isArray(result[STORAGE_KEYS.ignoredBusinesses])) {
    updates[STORAGE_KEYS.ignoredBusinesses] = [];
  }
  if (Object.keys(updates).length) {
    await chromeStorageSet(updates);
  }
}

export async function getProspects() {
  const result = await chromeStorageGet(STORAGE_KEYS.prospects);
  return Array.isArray(result[STORAGE_KEYS.prospects]) ? result[STORAGE_KEYS.prospects] : [];
}

export async function saveProspect(prospect) {
  const prospects = await getProspects();
  const now = new Date().toISOString();
  const leadProfile = getLeadProfile(prospect);
  const nextProspect = {
    id: prospect.id || generateId(),
    savedAt: prospect.savedAt || now,
    status: prospect.status,
    notes: prospect.notes ?? "",
    leadScore: prospect.leadScore ?? leadProfile.score,
    confidence: prospect.confidence ?? leadProfile.confidence,
    business: {
      ...prospect.business,
      scrapedAt: prospect.business?.scrapedAt || now
    },
    validation: prospect.validation
  };

  const nextKey = getBusinessDedupeKey(nextProspect.business);
  const existingIndex = prospects.findIndex((item) => getBusinessDedupeKey(item.business) === nextKey);
  const nextProspects = [...prospects];
  if (existingIndex >= 0) {
    nextProspects[existingIndex] = {
      ...nextProspects[existingIndex],
      ...nextProspect,
      id: nextProspects[existingIndex].id,
      savedAt: nextProspects[existingIndex].savedAt
    };
  } else {
    nextProspects.unshift(nextProspect);
  }

  await chromeStorageSet({ [STORAGE_KEYS.prospects]: nextProspects });
  return nextProspect;
}

export async function deleteProspect(id) {
  const prospects = await getProspects();
  const nextProspects = prospects.filter((item) => item.id !== id);
  await chromeStorageSet({ [STORAGE_KEYS.prospects]: nextProspects });
  return nextProspects;
}

export async function clearProspects(ids = null) {
  if (!Array.isArray(ids) || ids.length === 0) {
    await chromeStorageSet({ [STORAGE_KEYS.prospects]: [] });
    return [];
  }
  const prospects = await getProspects();
  const selected = new Set(ids);
  const nextProspects = prospects.filter((item) => !selected.has(item.id));
  await chromeStorageSet({ [STORAGE_KEYS.prospects]: nextProspects });
  return nextProspects;
}

export async function getScanHistory() {
  const result = await chromeStorageGet(STORAGE_KEYS.scanHistory);
  return Array.isArray(result[STORAGE_KEYS.scanHistory]) ? result[STORAGE_KEYS.scanHistory] : [];
}

export async function addScanSession(session) {
  const history = await getScanHistory();
  const nextSession = {
    id: session.id || generateId(),
    startedAt: session.startedAt || new Date().toISOString(),
    endedAt: session.endedAt ?? null,
    query: session.query ?? "",
    location: session.location ?? null,
    totalScanned: Number(session.totalScanned ?? 0),
    totalFiltered: Number(session.totalFiltered ?? 0),
    totalSaved: Number(session.totalSaved ?? 0),
    prospectIds: Array.isArray(session.prospectIds) ? session.prospectIds : []
  };
  await chromeStorageSet({ [STORAGE_KEYS.scanHistory]: [nextSession, ...history].slice(0, 100) });
  return nextSession;
}

export async function updateScanSession(id, patch) {
  const history = await getScanHistory();
  const nextHistory = history.map((item) => item.id === id ? { ...item, ...patch } : item);
  await chromeStorageSet({ [STORAGE_KEYS.scanHistory]: nextHistory });
  return nextHistory.find((item) => item.id === id) ?? null;
}

export async function getIgnoredBusinesses() {
  const result = await chromeStorageGet(STORAGE_KEYS.ignoredBusinesses);
  return Array.isArray(result[STORAGE_KEYS.ignoredBusinesses]) ? result[STORAGE_KEYS.ignoredBusinesses] : [];
}

export async function ignoreBusiness(business = {}) {
  const ignored = await getIgnoredBusinesses();
  const key = getBusinessDedupeKey(business);
  if (!key || key === "name::") return ignored;
  const nextItem = {
    key,
    ignoredAt: new Date().toISOString(),
    name: business.name || "",
    city: business.city || "",
    category: business.category || "",
    mapsUrl: business.mapsUrl || ""
  };
  const nextIgnored = [nextItem, ...ignored.filter((item) => item.key !== key)].slice(0, 500);
  await chromeStorageSet({ [STORAGE_KEYS.ignoredBusinesses]: nextIgnored });
  return nextIgnored;
}

export async function getStats() {
  const [prospects, history] = await Promise.all([getProspects(), getScanHistory()]);
  const todayProspects = prospects.filter((item) => isSameDay(item.savedAt));
  const todayHistory = history.filter((item) => isSameDay(item.startedAt));

  return {
    totalProspects: prospects.length,
    strongProspects: prospects.filter((item) => item.status === "PROSPEK_KUAT").length,
    todayScanned: todayHistory.reduce((sum, item) => sum + Number(item.totalScanned || 0), 0),
    todayProspects: todayProspects.length,
    todaySaved: todayProspects.length,
    historyCount: history.length
  };
}
