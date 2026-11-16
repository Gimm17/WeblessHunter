import { URL_TYPE } from "../utils/constants.js";
import { extractUrlsFromText } from "../utils/helpers.js";
import { classifyUrl } from "../utils/url-classifier.js";

export async function layer2Check(businessDetail = {}, options = {}) {
  const timeout = Number(options.timeout ?? 10000);
  const socialUrl = businessDetail.instagram
    || businessDetail.facebook
    || businessDetail.tiktok
    || businessDetail.youtube
    || businessDetail.linkedin
    || businessDetail.x;
  const fallbackBioText = String(options.fallbackBioText || "");
  const socialDiscovery = options.socialDiscovery || null;
  if (!socialUrl) {
    return {
      checked: true,
      skipped: true,
      skipReason: "NO_SOSMED",
      sosmedChecked: null,
      bioText: null,
      urlsFound: [],
      verdict: "NO_SOSMED",
      websiteUrl: null,
      socialDiscovery
    };
  }

  let tab = null;
  try {
    tab = await chrome.tabs.create({ url: socialUrl, active: false });
    await waitForTabLoad(tab.id, timeout);

    const [{ result = "" } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractBioFromSocialPage
    });

    const bioText = String(result || fallbackBioText || "");
    return buildBioVerdict(socialUrl, bioText, {
      socialDiscovery,
      fallbackUsed: !result && Boolean(fallbackBioText)
    });
  } catch (error) {
    if (fallbackBioText) {
      return buildBioVerdict(socialUrl, fallbackBioText, {
        socialDiscovery,
        fallbackUsed: true,
        pageError: error?.message ?? "Social page inaccessible"
      });
    }

    return {
      checked: true,
      skipped: false,
      skipReason: "INACCESSIBLE",
      sosmedChecked: socialUrl,
      bioText: null,
      urlsFound: [],
      verdict: "SOSMED_INACCESSIBLE",
      websiteUrl: null,
      socialDiscovery,
      error: error?.message ?? "Social page inaccessible"
    };
  } finally {
    if (tab?.id) {
      try {
        await chrome.tabs.remove(tab.id);
      } catch {
        // Tab may already be closed by the browser or user.
      }
    }
  }
}

function buildBioVerdict(socialUrl, bioText, meta = {}) {
  const urlsFound = extractUrlsFromText(bioText);

  for (const url of urlsFound) {
    if (classifyUrl(url) === URL_TYPE.ownWebsite) {
      return {
        checked: true,
        skipped: false,
        skipReason: null,
        sosmedChecked: socialUrl,
        bioText,
        urlsFound,
        verdict: "HAS_OWN_WEBSITE",
        websiteUrl: url,
        socialDiscovery: meta.socialDiscovery || null,
        fallbackUsed: Boolean(meta.fallbackUsed),
        pageError: meta.pageError || null
      };
    }
  }

  const hasMarketplaceOnly = urlsFound.some((url) => {
    const type = classifyUrl(url);
    return type === URL_TYPE.marketplace || type === URL_TYPE.linkAggregator || type === URL_TYPE.directory;
  });

  return {
    checked: true,
    skipped: false,
    skipReason: null,
    sosmedChecked: socialUrl,
    bioText,
    urlsFound,
    verdict: urlsFound.length === 0 ? "NO_URL_IN_BIO" : hasMarketplaceOnly ? "HAS_MARKETPLACE_ONLY" : "NO_URL_IN_BIO",
    websiteUrl: null,
    socialDiscovery: meta.socialDiscovery || null,
    fallbackUsed: Boolean(meta.fallbackUsed),
    pageError: meta.pageError || null
  };
}

export function waitForTabLoad(tabId, timeout = 10000) {
  return new Promise((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("TAB_LOAD_TIMEOUT"));
    }, timeout);

    function listener(updatedTabId, changeInfo) {
      if (updatedTabId !== tabId || changeInfo.status !== "complete" || done) return;
      done = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }

    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === "complete" && !done) {
        done = true;
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }).catch((error) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      chrome.tabs.onUpdated.removeListener(listener);
      reject(error);
    });
  });
}

function extractBioFromSocialPage() {
  const textFromSelectors = [
    'meta[name="description"]',
    'meta[property="og:description"]',
    '[data-key="intro_card_bio"]',
    '[class*="profileAboutSection"] span',
    "h1 + div span",
    "main header section div"
  ];

  const chunks = [];
  for (const selector of textFromSelectors) {
    const element = document.querySelector(selector);
    if (!element) continue;
    const value = element.content || element.innerText || element.textContent || "";
    if (value) chunks.push(value);
  }

  const title = document.title || "";
  const loginWall = /login|log in|masuk/i.test(title) && chunks.length === 0;
  return loginWall ? "" : chunks.join("\n").slice(0, 5000);
}
