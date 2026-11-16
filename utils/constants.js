export const STORAGE_KEYS = Object.freeze({
  prospects: "prospects",
  settings: "settings",
  scanHistory: "scan_history",
  ignoredBusinesses: "ignored_businesses"
});

export const STATUS = Object.freeze({
  strong: "PROSPEK_KUAT",
  prospect: "PROSPEK",
  uncertain: "UNCERTAIN",
  skip: "SKIP",
  unchecked: "BELUM_DICEK"
});

export const FINAL_VERDICT = Object.freeze({
  noWebsite: "NO_WEBSITE",
  hasWebsite: "HAS_WEBSITE",
  uncertain: "UNCERTAIN"
});

export const URL_TYPE = Object.freeze({
  ownWebsite: "OWN_WEBSITE",
  marketplace: "MARKETPLACE",
  directory: "DIRECTORY",
  socialMedia: "SOCIAL_MEDIA",
  linkAggregator: "LINK_AGGREGATOR",
  invalid: "INVALID"
});

export const MESSAGE_TYPES = Object.freeze({
  openSidePanel: "OPEN_SIDE_PANEL",
  searchMaps: "SEARCH_MAPS",
  requestScan: "REQUEST_SCAN",
  startScraping: "START_SCRAPING",
  scanProgress: "SCAN_PROGRESS",
  scrapingComplete: "SCRAPING_COMPLETE",
  scrapeBusinessDetail: "SCRAPE_BUSINESS_DETAIL",
  requestDoubleCheck: "REQUEST_DOUBLE_CHECK",
  checkProgress: "CHECK_PROGRESS",
  checkComplete: "CHECK_COMPLETE",
  saveProspect: "SAVE_PROSPECT",
  deleteProspect: "DELETE_PROSPECT",
  clearProspects: "CLEAR_PROSPECTS",
  getAllProspects: "GET_ALL_PROSPECTS",
  getScanHistory: "GET_SCAN_HISTORY",
  ignoreBusiness: "IGNORE_BUSINESS",
  getIgnoredBusinesses: "GET_IGNORED_BUSINESSES",
  generateAiDoc: "GENERATE_AI_DOC",
  generateAiDocStream: "GENERATE_AI_DOC_STREAM",
  aiDocChunk: "AI_DOC_CHUNK",
  aiDocComplete: "AI_DOC_COMPLETE",
  aiDocError: "AI_DOC_ERROR",
  generateAiDocs: "GENERATE_AI_DOCS",
  exportProspects: "EXPORT_PROSPECTS",
  exportReady: "EXPORT_READY",
  getSettings: "GET_SETTINGS",
  saveSettings: "SAVE_SETTINGS",
  getStats: "GET_STATS",
  openPage: "OPEN_PAGE"
});

export const DEFAULT_SETTINGS = Object.freeze({
  enableLayer2: true,
  enableLayer3: true,
  layer2Timeout: 10000,
  layer3Timeout: 10000,
  minRating: 0,
  minReviewCount: 0,
  panelPosition: "right",
  autoScan: false,
  exportFormat: "csv",
  aiApiKey: "",
  aiBaseUrl: "https://api.tokenrouter.com/v1",
  aiModel: "anthropic/claude-sonnet-4.6",
  aiTemperature: 0.35,
  aiMaxTokens: 8000,
  installedAt: "",
  version: "1.0.0"
});

export const EXPORT_COLUMNS = Object.freeze([
  "id",
  "savedAt",
  "status",
  "name",
  "category",
  "rating",
  "reviewCount",
  "address",
  "city",
  "phone",
  "website",
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "linkedin",
  "x",
  "leadScore",
  "confidence",
  "layer1Verdict",
  "layer2Verdict",
  "layer3Verdict",
  "mapsUrl",
  "notes"
]);

export const FOLLOWUP_EXPORT_COLUMNS = Object.freeze([
  "name",
  "status",
  "leadScore",
  "confidence",
  "phone",
  "instagram",
  "facebook",
  "tiktok",
  "youtube",
  "linkedin",
  "x",
  "city",
  "category",
  "rating",
  "reviewCount",
  "outreachMessage",
  "mapsUrl",
  "notes"
]);

export const STATUS_META = Object.freeze({
  [STATUS.strong]: { label: "Prospek Kuat", tone: "success" },
  [STATUS.prospect]: { label: "Prospek", tone: "info" },
  [STATUS.uncertain]: { label: "Uncertain", tone: "warning" },
  [STATUS.skip]: { label: "Skip", tone: "muted" },
  [STATUS.unchecked]: { label: "Belum Dicek", tone: "neutral" }
});

export const PAGE_PATHS = Object.freeze({
  dashboard: "pages/dashboard.html",
  prospects: "pages/prospects.html",
  prospectDetail: "pages/prospect-detail.html",
  settings: "pages/settings.html"
});

export const AI_DOC_OPTIONS = Object.freeze([
  { value: "prd", label: "PRD", filename: "PRD.md" },
  { value: "erd", label: "ERD", filename: "ERD.md" },
  { value: "implementationPlan", label: "Implementation Plan", filename: "IMPLEMENTATION_PLAN.md" },
  { value: "uiUxPrompt", label: "UI/UX Prompt Design", filename: "UI_UX_PROMPT_DESIGN.md" }
]);

export const CATEGORY_OPTIONS = Object.freeze([
  { value: "", label: "Pilih Kategori" },
  { value: "cafe", label: "Cafe" },
  { value: "restoran", label: "Restoran" },
  { value: "klinik", label: "Klinik" },
  { value: "salon", label: "Salon" },
  { value: "bengkel", label: "Bengkel" },
  { value: "laundry", label: "Laundry" },
  { value: "hotel", label: "Hotel" },
  { value: "apotek", label: "Apotek" },
  { value: "toko", label: "Toko" },
  { value: "gym", label: "Gym / Fitness" },
  { value: "sekolah", label: "Sekolah" },
  { value: "kontraktor", label: "Kontraktor" }
]);

export const LOCATION_OPTIONS = Object.freeze([
  { value: "", label: "Ketik atau pilih lokasi" },
  { value: "Palu, Sulawesi Tengah", label: "Palu" },
  { value: "Poso, Sulawesi Tengah", label: "Poso" },
  { value: "Luwuk, Sulawesi Tengah", label: "Luwuk" },
  { value: "Toli-Toli, Sulawesi Tengah", label: "Toli-Toli" },
  { value: "Morowali, Sulawesi Tengah", label: "Morowali" },
  { value: "Makassar, Sulawesi Selatan", label: "Makassar" },
  { value: "Manado, Sulawesi Utara", label: "Manado" },
  { value: "Gorontalo", label: "Gorontalo" },
  { value: "Kendari, Sulawesi Tenggara", label: "Kendari" },
  { value: "Balikpapan, Kalimantan Timur", label: "Balikpapan" },
  { value: "Samarinda, Kalimantan Timur", label: "Samarinda" },
  { value: "Banjarmasin, Kalimantan Selatan", label: "Banjarmasin" },
  { value: "Denpasar, Bali", label: "Denpasar" },
  { value: "Surabaya, Jawa Timur", label: "Surabaya" },
  { value: "Bandung, Jawa Barat", label: "Bandung" },
  { value: "Yogyakarta", label: "Yogyakarta" },
  { value: "Jakarta", label: "Jakarta" }
]);

export const SCAN_TARGET_OPTIONS = Object.freeze([
  { value: 10, label: "10 data" },
  { value: 25, label: "25 data" },
  { value: 50, label: "50 data" },
  { value: 100, label: "100 data" }
]);

export const AI_MODEL_OPTIONS = Object.freeze([
  {
    value: "anthropic/claude-sonnet-4.6",
    label: "Claude Sonnet 4.6",
    provider: "Anthropic"
  },
  {
    value: "openai/gpt-5.4",
    label: "GPT-5.4",
    provider: "OpenAI"
  },
  {
    value: "z-ai/glm-5-turbo",
    label: "GLM-5 Turbo",
    provider: "Z.ai"
  },
  {
    value: "qwen/qwen3.6-plus",
    label: "Qwen3.6 Plus",
    provider: "Qwen"
  }
]);
