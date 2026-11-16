import { AI_DOC_OPTIONS, MESSAGE_TYPES, STATUS, STATUS_META } from "../utils/constants.js";
import { downloadTextFile } from "../utils/exporter.js";
import { formatDateTime } from "../utils/helpers.js";
import { buildOutreachMessage, getLeadProfile } from "../utils/lead.js";

const state = {
  prospect: null,
  checking: false,
  checkProgress: null,
  documents: new Map(),
  generating: new Set(),
  activeStreams: new Map()
};

const refs = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  Object.assign(refs, {
    root: document.getElementById("detail-root"),
    toast: document.getElementById("detail-toast")
  });

  listenRuntimeMessages();
  await loadProspect();
}

function listenRuntimeMessages() {
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type !== MESSAGE_TYPES.checkProgress || !state.checking) return;
    state.checkProgress = message.payload?.progress || null;
    renderDetail();
  });
}

async function loadProspect() {
  const params = new URLSearchParams(location.search);
  const id = params.get("id");
  const data = params.get("data");

  if (id) {
    const response = await sendMessage(MESSAGE_TYPES.getAllProspects);
    state.prospect = (response.payload || []).find((item) => item.id === id) || null;
  } else if (data) {
    state.prospect = decodeProspect(data);
  }

  if (!state.prospect) {
    refs.root.replaceChildren(el("div", { className: "empty-state" }, "Data prospek tidak ditemukan."));
    return;
  }

  renderDetail();
}

function renderDetail() {
  const prospect = state.prospect;
  const business = prospect.business || {};
  const profile = getLeadProfile(prospect);
  const checked = isProspectChecked(prospect);

  refs.root.replaceChildren(
    el("div", { className: "detail-layout" },
      el("section", { className: "card detail-card" },
        el("span", { className: "stat-label" }, "Detail Cafe / Bisnis"),
        el("h1", {}, business.name || "Tanpa nama"),
        el("p", { className: "page-subtitle" }, `${business.category || "-"} - ${business.city || "-"}`),
        renderLeadSummary(profile, prospect),
        el("h2", {}, "Informasi Bisnis"),
        renderInfoGrid(prospect),
        renderDetailActions(prospect, checked),
        state.checking && checked ? renderCheckProgress() : null
      ),
      checked ? renderAiSideStack(prospect) : renderPrecheckStack(prospect),
      checked ? renderAiOutputSection() : null
    )
  );
}

function renderAiSideStack(prospect) {
  return el("div", { className: "ai-side-stack" },
    el("aside", { className: "card ai-card" },
      el("span", { className: "stat-label" }, "AI Generator"),
      el("h2", {}, "Generate Dokumen"),
      el("div", { className: "ai-doc-list" }, AI_DOC_OPTIONS.map(renderDocButton)),
      el("p", { className: "ai-status", id: "ai-status" }, "Pilih dokumen yang mau dibuat. Hasilnya akan muncul besar di section bawah.")
    ),
    el("section", { className: "card prospect-copy-card" },
      el("span", { className: "stat-label" }, "Lead Copy"),
      el("h2", {}, "Teks Prospek"),
      el("div", { className: "prospect-text" }, buildProspectText(prospect)),
      el("h2", {}, "Template Outreach"),
      el("div", { className: "prospect-text" }, buildOutreachMessage(prospect))
    )
  );
}

function renderPrecheckStack(prospect) {
  return el("aside", { className: "card ai-card precheck-card" },
    el("span", { className: "stat-label" }, "Validasi Diperlukan"),
    el("h2", {}, state.checking ? "Checking Berjalan" : "Check Dulu Sebelum AI"),
    el("p", {}, "Detail ini masih berisi data awal dari Google Maps. Jalankan checking untuk memastikan apakah bisnis punya website resmi, menemukan sosial media, dan menentukan status prospek."),
    state.checking ? renderCheckProgress() : renderUncheckedChecklist(),
    el("div", { className: "precheck-actions-row" },
      actionButton(state.checking ? "Checking..." : "Check Sekarang", "button-primary", runCheckFromDetail, state.checking),
      actionButton("Kembali ke Prospek", "button-secondary", () => { location.href = "prospects.html"; }, false)
    )
  );
}

function renderAiOutputSection() {
  return el("section", { className: "card ai-output-section", "aria-labelledby": "ai-output-title" },
    el("div", { className: "ai-output-section-header" },
      el("div", {},
        el("span", { className: "stat-label" }, "AI Document Preview"),
        el("h2", { id: "ai-output-title" }, "Hasil Generate")
      ),
      el("p", {}, "Klik beberapa generator untuk menumpuk hasil sebagai editor dokumen terpisah.")
    ),
    el("div", { className: "ai-output-stack", id: "ai-output-stack", "aria-live": "polite" })
  );
}

function renderLeadSummary(profile, prospect) {
  const meta = STATUS_META[prospect.status] || { label: prospect.status || "-", tone: "neutral" };
  return el("div", { className: "lead-summary" },
    el("div", { className: "lead-summary-item" }, el("span", { className: "stat-label" }, "Score"), el("strong", {}, String(profile.score))),
    el("div", { className: "lead-summary-item" }, el("span", { className: "stat-label" }, "Confidence"), el("strong", {}, profile.confidence)),
    el("div", { className: "lead-summary-item" }, el("span", { className: "stat-label" }, "Status"), el("strong", {}, meta.label))
  );
}

function renderInfoGrid(prospect) {
  const business = prospect.business || {};
  const validation = prospect.validation || {};
  const rows = [
    detailRow("Rating", `${business.rating ?? "-"} (${business.reviewCount ?? 0} ulasan)`),
    detailRow("Alamat", business.address || "-"),
    detailRow("Telepon", business.phone || "-"),
    detailRow("Website", renderUrlLink(business.website, "Buka website")),
    detailRow("Instagram", renderUrlLink(business.instagram, "Buka Instagram")),
    detailRow("Facebook", renderUrlLink(business.facebook, "Buka Facebook")),
    detailRow("TikTok", renderUrlLink(business.tiktok, "Buka TikTok")),
    detailRow("YouTube", renderUrlLink(business.youtube, "Buka YouTube")),
    detailRow("LinkedIn", renderUrlLink(business.linkedin, "Buka LinkedIn")),
    detailRow("X/Twitter", renderUrlLink(business.x, "Buka X/Twitter")),
    detailRow("Maps", renderMapsLink(business.mapsUrl)),
    detailRow("Disimpan", prospect.savedAt ? formatDateTime(prospect.savedAt) : "-"),
    detailRow("Validasi", isProspectChecked(prospect) ? renderValidationStack(validation) : el("span", { className: "pending-validation-text" }, "Belum dicek. Klik Check Sekarang."))
  ];
  if (prospect.notes) rows.push(detailRow("Catatan", prospect.notes));
  return el("div", { className: "detail-grid" }, rows);
}

function renderDetailActions(prospect, checked) {
  return el("div", { className: "detail-page-actions" },
    actionButton(checked ? "Check Ulang" : "Check Sekarang", checked ? "button-secondary" : "button-primary", runCheckFromDetail, state.checking),
    checked && !prospect.id ? actionButton("Simpan Hasil", "button-primary", saveCurrentProspect, false) : null,
    prospect.id ? el("span", { className: "saved-inline-badge" }, "Tersimpan") : null
  );
}

function detailRow(label, value) {
  const valueNode = value instanceof Node ? value : el("span", {}, value);
  return el("div", { className: "detail-row" }, el("strong", {}, label), valueNode);
}

function renderUrlLink(url, label) {
  if (!url) return el("span", {}, "-");
  return el("a", {
    className: "detail-link",
    href: normalizeHref(url),
    target: "_blank",
    rel: "noreferrer"
  }, label || simplifyUrl(url));
}

function renderMapsLink(url) {
  if (!url) return el("span", {}, "-");
  return el("a", {
    className: "map-pin-link",
    href: normalizeHref(url),
    target: "_blank",
    rel: "noreferrer",
    title: "Buka lokasi di Google Maps",
    "aria-label": "Buka lokasi di Google Maps"
  }, el("span", { className: "map-pin-icon", "aria-hidden": "true" }, ""), el("span", {}, "Buka Maps"));
}

function normalizeHref(url) {
  const value = String(url || "").trim();
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function renderValidationStack(validation = {}) {
  return el("div", { className: "validation-stack" },
    validationLine("Layer 1", validation.layer1?.verdict),
    validationLine("Layer 2", validation.layer2?.verdict),
    validationLine("Layer 3", validation.layer3?.verdict)
  );
}

function validationLine(label, verdict) {
  return el("div", { className: "validation-line" },
    el("span", { className: `validation-dot ${verdict ? "complete" : "pending"}`, "aria-hidden": "true" }, ""),
    el("strong", {}, label),
    el("span", {}, verdict || "-")
  );
}

function simplifyUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function renderDocButton(option) {
  const button = el("button", { className: "button button-secondary ai-doc-button", type: "button" },
    el("span", {}, option.label),
    el("span", {}, option.filename)
  );
  button.addEventListener("click", () => generateDoc(option, button));
  return button;
}

async function generateDoc(option, triggerButton) {
  if (!isProspectChecked(state.prospect)) {
    showToast("Jalankan Check Sekarang dulu sebelum generate AI docs.");
    return;
  }
  if (state.generating.has(option.value)) return;
  state.generating.add(option.value);
  triggerButton.disabled = true;
  triggerButton?.setAttribute("aria-busy", "true");
  const panel = prepareInlineDocument(option);
  setAiStatus(`Generate ${option.label}... menunggu token pertama.`);
  try {
    const result = await generateDocWithStream(option, panel);
    if (result.stopped) {
      updateInlineDocument(panel, {
        content: result.content || getDocumentTextarea(panel).value,
        status: "Dihentikan",
        readOnly: false
      });
      state.documents.set(option.value, result);
      setAiStatus(`${option.label} dihentikan. Konten parsial bisa diedit/download.`);
      return;
    }
    updateInlineDocument(panel, {
      content: result.content || getDocumentTextarea(panel).value,
      status: "Selesai",
      readOnly: true
    });
    state.documents.set(option.value, result);
    setAiStatus(`${option.label} selesai dibuat. Field siap diedit/download.`);
  } catch (error) {
    updateInlineDocument(panel, {
      status: "Gagal",
      error: error.message || `Gagal generate ${option.label}.`
    });
    showToast(error.message || `Gagal generate ${option.label}.`);
    setAiStatus("Generate gagal. Cek API key, model, atau saldo/channel TokenRouter.");
  } finally {
    state.generating.delete(option.value);
    triggerButton.disabled = false;
    triggerButton?.removeAttribute("aria-busy");
  }
}

async function runCheckFromDetail() {
  if (state.checking || !state.prospect?.business) return;
  state.checking = true;
  state.checkProgress = {
    step: "layer1",
    status: "running",
    progress: 10,
    message: "Memulai validasi"
  };
  renderDetail();

  try {
    const response = await sendMessage(MESSAGE_TYPES.requestDoubleCheck, {
      businessId: state.prospect.business.mapsUrl || state.prospect.business.placeId || state.prospect.business.name,
      business: state.prospect.business
    });
    const result = response.payload || {};
    state.prospect = {
      ...state.prospect,
      status: result.status || state.prospect.status || STATUS.prospect,
      leadScore: getLeadProfile(result).score,
      confidence: getLeadProfile(result).confidence,
      business: {
        ...state.prospect.business,
        ...(result.business || {})
      },
      validation: result.validation || {},
      reason: result.reason || ""
    };
    if (state.prospect.id) {
      await saveCurrentProspect({ silent: true });
    }
    showToast("Checking selesai. AI Generator sudah aktif.");
  } catch (error) {
    showToast(error.message || "Checking gagal.");
  } finally {
    state.checking = false;
    state.checkProgress = null;
    renderDetail();
  }
}

async function saveCurrentProspect(options = {}) {
  if (!isProspectChecked(state.prospect)) {
    showToast("Check dulu sebelum menyimpan hasil.");
    return;
  }
  const response = await sendMessage(MESSAGE_TYPES.saveProspect, {
    prospect: state.prospect,
    notes: state.prospect.notes || ""
  });
  state.prospect = response.payload || state.prospect;
  if (!options.silent) {
    showToast("Prospek tersimpan.");
    renderDetail();
  }
}

function renderUncheckedChecklist() {
  return el("div", { className: "unchecked-checklist" },
    el("div", {}, el("span", {}, "1"), "Validasi website resmi"),
    el("div", {}, el("span", {}, "2"), "Cari Instagram/Facebook dari bio dan Google"),
    el("div", {}, el("span", {}, "3"), "Hitung status prospek dan lead score")
  );
}

function renderCheckProgress() {
  const progress = state.checkProgress || {};
  return el("div", { className: "detail-check-progress", "aria-live": "polite" },
    validationProgressLine("layer1", "Layer 1 - Maps field check", progress),
    validationProgressLine("layer2", "Layer 2 - Bio media sosial", progress),
    validationProgressLine("layer3", "Layer 3 - Google Search", progress),
    el("div", { className: "detail-progress-bar", "aria-label": `Progress ${Number(progress.progress || 0)} persen` },
      el("span", { "data-pct": bucketPercent(Math.max(8, Number(progress.progress || 0))) })
    ),
    el("p", {}, progress.message || "Memvalidasi bisnis...")
  );
}

function validationProgressLine(step, label, progress) {
  const order = ["layer1", "layer2", "layer3", "complete"];
  const stateName = progress.step === step ? "running" : order.indexOf(step) < order.indexOf(progress.step) ? "complete" : "pending";
  return el("div", { className: "validation-progress-line" },
    el("span", { className: `validation-dot ${stateName}`, "aria-hidden": "true" }),
    el("strong", {}, label)
  );
}

function isProspectChecked(prospect = {}) {
  return hasValidationResult(prospect.validation)
    || (prospect.status && prospect.status !== STATUS.unchecked);
}

function hasValidationResult(validation = {}) {
  return Boolean(validation.layer1?.verdict || validation.layer2?.verdict || validation.layer3?.verdict || validation.finalVerdict);
}

function actionButton(text, variant, onClick, disabled = false) {
  const button = el("button", { className: `button ${variant}`, type: "button" }, text);
  button.disabled = Boolean(disabled);
  button.addEventListener("click", onClick);
  return button;
}

function bucketPercent(value) {
  const number = Number(value) || 0;
  return String(Math.max(0, Math.min(100, Math.round(number / 5) * 5)));
}

function prepareInlineDocument(option) {
  const stack = document.getElementById("ai-output-stack");
  let panel = stack?.querySelector(`[data-doc-type="${option.value}"]`);
  const draft = {
    type: option.value,
    title: option.label,
    filename: option.filename,
    content: ""
  };
  state.documents.set(option.value, draft);

  if (!panel) {
    panel = createInlineDocumentPanel(option);
    stack?.prepend(panel);
  }

  updateInlineDocument(panel, {
    content: "Menyiapkan streaming AI...\n\n",
    status: "Generating",
    readOnly: true
  });
  panel.scrollIntoView({ block: "nearest", behavior: "smooth" });
  return panel;
}

function createInlineDocumentPanel(option) {
  const textarea = el("textarea", {
    className: "textarea ai-output-text",
    readonly: "",
    "aria-label": `${option.label} generated document`
  });

  const status = el("span", { className: "ai-output-status" }, "Generating");
  const edit = el("button", { className: "button button-secondary ai-output-action", type: "button" }, "Edit");
  const stop = el("button", { className: "button button-danger ai-output-action", type: "button" }, "Stop Generating");
  const download = el("button", { className: "button button-primary ai-output-action", type: "button" }, "Download MD");

  edit.addEventListener("click", () => {
    textarea.readOnly = false;
    textarea.focus();
    edit.textContent = "Editing";
    showToast(`${option.label} bisa diedit sebelum download.`);
  });
  stop.addEventListener("click", () => stopGenerating(option, textarea));
  download.addEventListener("click", () => downloadInlineDocument(option, textarea));

  return el("article", { className: "ai-output-card", "data-doc-type": option.value },
    el("header", { className: "ai-output-header" },
      el("div", {},
        el("span", { className: "stat-label" }, "Generated Document"),
        el("h3", {}, `${option.label} Preview`)
      ),
      status
    ),
    textarea,
    el("footer", { className: "ai-output-actions" }, edit, stop, download)
  );
}

function updateInlineDocument(panel, updates = {}) {
  if (!panel) return;
  const textarea = getDocumentTextarea(panel);
  const status = panel.querySelector(".ai-output-status");

  if (typeof updates.content === "string") {
    textarea.value = updates.content;
    textarea.scrollTop = textarea.scrollHeight;
  }
  if (typeof updates.readOnly === "boolean") {
    textarea.readOnly = updates.readOnly;
  }
  if (status && updates.status) {
    status.textContent = updates.status;
    status.dataset.state = String(updates.status).toLowerCase();
  }
  if (updates.error) {
    textarea.value = updates.error;
  }
}

function getDocumentTextarea(panel) {
  return panel.querySelector(".ai-output-text");
}

function generateDocWithStream(option, panel) {
  return new Promise((resolve, reject) => {
    let settled = false;
    let content = "";
    const port = chrome.runtime.connect({ name: MESSAGE_TYPES.generateAiDocStream });
    state.activeStreams.set(option.value, { port, stopped: false });

    port.onMessage.addListener((message = {}) => {
      if (message.type === MESSAGE_TYPES.aiDocChunk) {
        content = message.payload?.content || `${content}${message.payload?.chunk || ""}`;
        updateInlineDocument(panel, {
          content,
          status: "Generating",
          readOnly: true
        });
        setAiStatus(`Generate ${option.label}... ${content.length.toLocaleString("id-ID")} karakter diterima.`);
        return;
      }

      if (message.type === MESSAGE_TYPES.aiDocComplete) {
        settled = true;
        state.activeStreams.delete(option.value);
        port.disconnect();
        resolve(message.payload);
        return;
      }

      if (message.type === MESSAGE_TYPES.aiDocError) {
        settled = true;
        state.activeStreams.delete(option.value);
        port.disconnect();
        reject(new Error(message.error || "Generate AI gagal."));
      }
    });

    port.onDisconnect.addListener(() => {
      if (!settled) {
        const stream = state.activeStreams.get(option.value);
        state.activeStreams.delete(option.value);
        if (stream?.stopped) {
          resolve({
            type: option.value,
            title: option.label,
            filename: option.filename,
            content: getDocumentTextarea(panel).value,
            stopped: true
          });
          return;
        }
        reject(new Error("Koneksi streaming AI terputus."));
      }
    });

    port.postMessage({
      type: MESSAGE_TYPES.generateAiDocStream,
      payload: {
        prospect: state.prospect,
        docType: option.value
      }
    });
  });
}

function stopGenerating(option, textarea) {
  const stream = state.activeStreams.get(option.value);
  if (!stream) return;
  stream.stopped = true;
  state.documents.set(option.value, {
    type: option.value,
    title: option.label,
    filename: option.filename,
    content: textarea.value
  });
  updateInlineDocument(textarea.closest(".ai-output-card"), {
    status: "Dihentikan",
    readOnly: false
  });
  stream.port.disconnect();
  showToast(`${option.label} dihentikan. Konten parsial tetap bisa diedit/download.`);
}

function downloadInlineDocument(option, textarea) {
  const doc = state.documents.get(option.value);
  downloadTextFile({
    content: textarea.value,
    mime: "text/markdown",
    filename: doc?.filename || option.filename || "weblesshunter-ai-doc.md"
  });
  showToast(`${option.label} didownload.`);
}

function buildProspectText(prospect) {
  const business = prospect.business || {};
  const profile = getLeadProfile(prospect);
  return [
    `${business.name || "Bisnis ini"} adalah ${business.category || "bisnis lokal"} di ${business.city || "area target"}.`,
    `Lead score ${profile.score}/100 dengan confidence ${profile.confidence}.`,
    `Status validasi: ${prospect.status || "-"}.`,
    profile.reasons.length ? `Alasan: ${profile.reasons.join(", ")}.` : "",
    business.phone ? `Kontak telepon tersedia: ${business.phone}.` : "Kontak telepon belum tersedia.",
    business.instagram || business.facebook || business.tiktok || business.youtube || business.linkedin || business.x ? "Media sosial ditemukan." : "Media sosial belum ditemukan."
  ].filter(Boolean).join(" ");
}

function setAiStatus(message) {
  const status = document.getElementById("ai-status");
  if (status) status.textContent = message;
}

function decodeProspect(value) {
  try {
    return JSON.parse(decodeURIComponent(atob(value)));
  } catch {
    return null;
  }
}

function showToast(message) {
  refs.toast.textContent = message;
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

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([key, value]) => {
    if (key === "className") node.className = value;
    else if (key === "textContent") node.textContent = value;
    else if (key.startsWith("data-")) node.setAttribute(key, value);
    else node.setAttribute(key, value);
  });
  children.flat().forEach((child) => {
    if (child === null || child === undefined) return;
    if (Array.isArray(child)) node.append(...child);
    else node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  });
  return node;
}
