import { AI_MODEL_OPTIONS, DEFAULT_SETTINGS, MESSAGE_TYPES } from "../utils/constants.js";

const refs = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  Object.assign(refs, {
    form: document.getElementById("settings-form"),
    enableLayer2: document.getElementById("enable-layer2"),
    enableLayer3: document.getElementById("enable-layer3"),
    layer2Timeout: document.getElementById("layer2-timeout"),
    layer3Timeout: document.getElementById("layer3-timeout"),
    minRating: document.getElementById("min-rating"),
    minReviewCount: document.getElementById("min-review-count"),
    autoScan: document.getElementById("auto-scan"),
    exportFormat: document.getElementById("export-format"),
    aiBaseUrl: document.getElementById("ai-base-url"),
    aiModel: document.getElementById("ai-model"),
    aiTemperature: document.getElementById("ai-temperature"),
    aiMaxTokens: document.getElementById("ai-max-tokens"),
    aiApiKey: document.getElementById("ai-api-key"),
    reset: document.getElementById("reset-settings"),
    toast: document.getElementById("settings-toast")
  });

  refs.form.addEventListener("submit", save);
  refs.reset.addEventListener("click", resetDefaults);
  renderAiModelOptions();
  await load();
}

function renderAiModelOptions() {
  refs.aiModel.replaceChildren(...AI_MODEL_OPTIONS.map((option) => {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = `${option.label} - ${option.provider}`;
    return item;
  }));
}

async function load() {
  const response = await sendMessage(MESSAGE_TYPES.getSettings);
  fillForm(response.payload);
}

function fillForm(settings) {
  refs.enableLayer2.checked = Boolean(settings.enableLayer2);
  refs.enableLayer3.checked = Boolean(settings.enableLayer3);
  refs.layer2Timeout.value = settings.layer2Timeout;
  refs.layer3Timeout.value = settings.layer3Timeout;
  refs.minRating.value = settings.minRating;
  refs.minReviewCount.value = settings.minReviewCount;
  refs.autoScan.checked = Boolean(settings.autoScan);
  refs.exportFormat.value = settings.exportFormat || "csv";
  refs.aiBaseUrl.value = settings.aiBaseUrl || DEFAULT_SETTINGS.aiBaseUrl;
  refs.aiModel.value = AI_MODEL_OPTIONS.some((option) => option.value === settings.aiModel)
    ? settings.aiModel
    : DEFAULT_SETTINGS.aiModel;
  refs.aiTemperature.value = settings.aiTemperature ?? DEFAULT_SETTINGS.aiTemperature;
  refs.aiMaxTokens.value = settings.aiMaxTokens ?? DEFAULT_SETTINGS.aiMaxTokens;
  refs.aiApiKey.value = settings.aiApiKey || "";
}

async function save(event) {
  event.preventDefault();
  const settings = collectForm();
  await sendMessage(MESSAGE_TYPES.saveSettings, { settings });
  showToast("Pengaturan tersimpan.");
}

async function resetDefaults() {
  fillForm(DEFAULT_SETTINGS);
  await sendMessage(MESSAGE_TYPES.saveSettings, {
    settings: {
      ...DEFAULT_SETTINGS,
      installedAt: new Date().toISOString()
    }
  });
  showToast("Pengaturan direset.");
}

function collectForm() {
  return {
    enableLayer2: refs.enableLayer2.checked,
    enableLayer3: refs.enableLayer3.checked,
    layer2Timeout: Number(refs.layer2Timeout.value),
    layer3Timeout: Number(refs.layer3Timeout.value),
    minRating: Number(refs.minRating.value),
    minReviewCount: Number(refs.minReviewCount.value),
    autoScan: refs.autoScan.checked,
    exportFormat: refs.exportFormat.value,
    aiBaseUrl: refs.aiBaseUrl.value,
    aiModel: refs.aiModel.value,
    aiTemperature: Number(refs.aiTemperature.value),
    aiMaxTokens: Number(refs.aiMaxTokens.value),
    aiApiKey: refs.aiApiKey.value
  };
}

function showToast(message) {
  refs.toast.textContent = message;
  refs.toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    refs.toast.hidden = true;
  }, 2400);
}

function sendMessage(type, payload = {}) {
  return chrome.runtime.sendMessage({ type, payload }).then((response) => {
    if (!response?.ok) throw new Error(response?.error || "Operasi gagal.");
    return response;
  });
}
