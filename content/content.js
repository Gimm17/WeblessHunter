(function setupWeblessHunterContent() {
  const BUTTON_ID = "weblesshunter-trigger";
  let observer = null;
  let scanButton = null;

  function init() {
    observeMapsResults();
    updateTriggerVisibility();
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      handleMessage(message).then(sendResponse).catch((error) => {
        sendResponse({ ok: false, error: error?.message || "Content script error" });
      });
      return true;
    });
  }

  async function handleMessage(message) {
    const scraper = window.WeblessHunterScraper;
    if (!scraper) return { ok: false, error: "Scraper belum siap" };

    if (message.type === "START_SCRAPING") {
      const result = await scraper.collectListings(message.payload || {});
      return { ok: true, payload: result };
    }

    if (message.type === "SCRAPE_BUSINESS_DETAIL") {
      const detail = await scraper.scrapeBusinessDetailForBusiness(message.payload?.business || {});
      return { ok: true, payload: detail };
    }

    if (message.type === "PING_MAPS") {
      return { ok: true, payload: { active: scraper.hasVisibleBusinessResults(), query: scraper.getCurrentQuery() } };
    }

    return { ok: false, error: "Unknown content message" };
  }

  function observeMapsResults() {
    if (observer) observer.disconnect();
    observer = new MutationObserver(() => {
      window.requestAnimationFrame(updateTriggerVisibility);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function updateTriggerVisibility() {
    const scraper = window.WeblessHunterScraper;
    const visible = Boolean(scraper?.hasVisibleBusinessResults());
    if (visible && !scanButton) {
      scanButton = createTriggerButton();
      document.body.append(scanButton);
    }
    if (scanButton) {
      scanButton.hidden = !visible;
      scanButton.setAttribute("aria-hidden", visible ? "false" : "true");
    }
  }

  function createTriggerButton() {
    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.className = "weblesshunter-trigger";
    button.setAttribute("aria-label", "Scan prospek dengan WeblessHunter");
    const icon = document.createElement("span");
    icon.className = "weblesshunter-trigger__icon";
    icon.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "weblesshunter-trigger__label";
    label.textContent = "Scan Prospek";
    button.append(icon, label);
    button.addEventListener("click", async () => {
      button.classList.add("is-loading");
      try {
        await chrome.runtime.sendMessage({ type: "OPEN_SIDE_PANEL" });
      } finally {
        button.classList.remove("is-loading");
      }
    });
    return button;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
