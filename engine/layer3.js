import { URL_TYPE } from "../utils/constants.js";
import { extractCity, normalizeForCompare } from "../utils/helpers.js";
import { classifyUrl } from "../utils/url-classifier.js";
import { scorePageText, scoreSearchSnippet, stringSimilarity } from "./similarity.js";
import { waitForTabLoad } from "./layer2.js";

export async function layer3Check(businessDetail = {}, options = {}) {
  const timeout = Number(options.timeout ?? 10000);
  const city = businessDetail.city || extractCity(businessDetail.address) || extractCity(options.query);
  const query = buildSearchQuery(businessDetail, city);
  if (!businessDetail.name) {
    return emptyLayer3("UNCERTAIN", query);
  }

  let tab = null;
  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10`;
    tab = await chrome.tabs.create({ url: searchUrl, active: false });
    await waitForTabLoad(tab.id, timeout);

    const [{ result = {} } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeGoogleResults
    });

    if (result.captcha) {
      return {
        ...emptyLayer3("CAPTCHA_BLOCKED", query),
        checked: true,
        skipped: false
      };
    }

    const topResults = Array.isArray(result.items) ? result.items.slice(0, 10) : [];
    if (topResults.length === 0) {
      return {
        checked: true,
        skipped: false,
        query,
        resultsFound: 0,
        topResults: [],
        verdict: "NOT_FOUND",
        websiteUrl: null,
        similarityScore: null
      };
    }

    return await validateSearchResults(topResults, { ...businessDetail, city }, timeout);
  } catch (error) {
    return {
      ...emptyLayer3("UNCERTAIN", query),
      error: error?.message ?? "Google Search validation failed"
    };
  } finally {
    if (tab?.id) {
      try {
        await chrome.tabs.remove(tab.id);
      } catch {
        // Tab may already be closed.
      }
    }
  }
}

function buildSearchQuery(businessDetail, city) {
  const category = businessDetail.category ? ` ${businessDetail.category}` : "";
  const location = city ? ` "${city}"` : "";
  return `"${businessDetail.name ?? ""}"${location}${category}`.trim();
}

function emptyLayer3(verdict, query = null) {
  return {
    checked: true,
    skipped: false,
    query,
    resultsFound: 0,
    topResults: [],
    verdict,
    websiteUrl: null,
    similarityScore: null
  };
}

async function validateSearchResults(searchResults, businessDetail, timeout) {
  let uncertainMatch = null;
  let marketplaceOrDirectoryCount = 0;
  const topResults = [];

  for (const result of searchResults) {
    const urlType = classifyUrl(result.url);
    const enriched = {
      ...result,
      urlType,
      similarityScore: null
    };

    if (urlType !== URL_TYPE.ownWebsite) {
      marketplaceOrDirectoryCount += 1;
      topResults.push(enriched);
      continue;
    }

    let scoreResult = scoreSearchSnippet(result, businessDetail);
    let score = scoreResult.score;
    if (score >= 30) {
      const pageText = await fetchPageText(result.url, Math.min(timeout, 8000));
      if (pageText) {
        score = scorePageText(score, pageText, businessDetail);
      }
    } else if (isLikelyBrandDomain(result.url, businessDetail.name)) {
      score += 20;
    }

    enriched.similarityScore = score;
    topResults.push(enriched);

    if (score >= 60) {
      return {
        checked: true,
        skipped: false,
        query: buildSearchQuery(businessDetail, businessDetail.city),
        resultsFound: searchResults.length,
        topResults,
        verdict: "OWN_WEBSITE_FOUND",
        websiteUrl: result.url,
        similarityScore: score
      };
    }

    if (score >= 30 && !uncertainMatch) {
      uncertainMatch = { url: result.url, score };
    }
  }

  if (uncertainMatch) {
    return {
      checked: true,
      skipped: false,
      query: buildSearchQuery(businessDetail, businessDetail.city),
      resultsFound: searchResults.length,
      topResults,
      verdict: "UNCERTAIN",
      websiteUrl: uncertainMatch.url,
      similarityScore: uncertainMatch.score
    };
  }

  return {
    checked: true,
    skipped: false,
    query: buildSearchQuery(businessDetail, businessDetail.city),
    resultsFound: searchResults.length,
    topResults,
    verdict: marketplaceOrDirectoryCount > 0 ? "MARKETPLACE_ONLY" : "NOT_FOUND",
    websiteUrl: null,
    similarityScore: null
  };
}

async function fetchPageText(url, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      credentials: "omit"
    });
    if (!response.ok) return "";
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("text/plain")) return "";
    const text = await response.text();
    return text.replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .slice(0, 20000);
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

function isLikelyBrandDomain(rawUrl, businessName) {
  try {
    const host = new URL(rawUrl).hostname.replace(/^www\./, "");
    const hostName = normalizeForCompare(host.split(".")[0]);
    const name = normalizeForCompare(businessName).replace(/\b(cafe|kafe|restaurant|restoran|warung|toko)\b/g, "").trim();
    return Boolean(hostName && name && stringSimilarity(hostName, name) > 0.55);
  } catch {
    return false;
  }
}

function scrapeGoogleResults() {
  const title = document.title || "";
  const bodyText = document.body?.innerText || "";
  const captcha = /unusual traffic|not a robot|captcha/i.test(title + " " + bodyText);
  if (captcha) {
    return { captcha: true, items: [] };
  }

  const selectors = ["#search .g", "div[data-sokoban-container] div[jscontroller]", "div.g", "div[jsname]"];
  let nodes = [];
  for (const selector of selectors) {
    nodes = Array.from(document.querySelectorAll(selector));
    if (nodes.length) break;
  }

  const organicItems = nodes.map((item) => {
    const anchor = item.querySelector("a[href]");
    const titleElement = item.querySelector("h3");
    const snippetElement = item.querySelector(".VwiC3b, [data-sncf], .IsZvec");
    return {
      title: titleElement?.innerText?.trim() || anchor?.innerText?.trim() || "",
      url: unwrapGoogleResultUrl(anchor?.href || ""),
      snippet: snippetElement?.innerText?.trim() || ""
    };
  }).filter((item) => item.url && item.title);

  const anchorItems = Array.from(document.querySelectorAll("a[href]")).map((anchor) => {
    const block = anchor.closest("div");
    return {
      title: anchor.innerText?.trim() || anchor.getAttribute("aria-label") || "",
      url: unwrapGoogleResultUrl(anchor.href || ""),
      snippet: block?.innerText?.trim()?.slice(0, 500) || ""
    };
  }).filter((item) => item.url && item.title);

  const seen = new Set();
  const items = [...organicItems, ...anchorItems].filter((item) => {
    const key = item.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { captcha: false, items: items.slice(0, 10) };

  function unwrapGoogleResultUrl(rawHref) {
    try {
      const url = new URL(rawHref);
      return url.searchParams.get("q") || url.searchParams.get("url") || rawHref;
    } catch {
      return rawHref || "";
    }
  }
}
