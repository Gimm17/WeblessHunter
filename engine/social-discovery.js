import { URL_TYPE } from "../utils/constants.js";
import { extractCity, normalizeForCompare, normalizePhoneDigits } from "../utils/helpers.js";
import { classifyUrl } from "../utils/url-classifier.js";
import { waitForTabLoad } from "./layer2.js";
import { stringSimilarity } from "./similarity.js";

const SOCIAL_PROVIDERS = Object.freeze([
  {
    key: "instagram",
    hosts: ["instagram.com"],
    blockedSegments: ["accounts", "about", "developer", "explore", "p", "reel", "reels", "stories", "tv"]
  },
  {
    key: "facebook",
    hosts: ["facebook.com", "fb.com"],
    blockedSegments: ["events", "groups", "marketplace", "people", "photo", "photos", "plugins", "share", "sharer", "story.php", "watch"]
  },
  {
    key: "tiktok",
    hosts: ["tiktok.com"],
    blockedSegments: ["discover", "foryou", "tag", "music", "video"]
  },
  {
    key: "youtube",
    hosts: ["youtube.com", "youtu.be"],
    blockedSegments: ["watch", "shorts", "playlist", "results"]
  },
  {
    key: "linkedin",
    hosts: ["linkedin.com"],
    blockedSegments: ["feed", "jobs", "learning", "pulse", "pub", "school"]
  },
  {
    key: "x",
    hosts: ["x.com", "twitter.com"],
    blockedSegments: ["hashtag", "home", "intent", "i", "search", "share"]
  }
]);

const GENERIC_NAME_WORDS = new Set([
  "and",
  "apotek",
  "apotik",
  "bar",
  "bengkel",
  "cafe",
  "coffee",
  "coffeeshop",
  "dan",
  "di",
  "dokter",
  "farmasi",
  "hasil",
  "kedai",
  "kafe",
  "klinik",
  "kopi",
  "laundry",
  "medical",
  "medika",
  "official",
  "praktik",
  "restaurant",
  "restoran",
  "rumah",
  "salon",
  "shop",
  "space",
  "the",
  "to",
  "warung",
  "warkop",
  "workspace"
]);

export async function discoverSocialProfiles(businessDetail = {}, options = {}) {
  const existingLinks = pickSocialLinks(businessDetail);
  const timeout = Number(options.timeout ?? 10000);
  const city = businessDetail.city || extractCity(businessDetail.address) || extractCity(options.query);
  const query = buildSocialSearchQuery(businessDetail, city);
  const mapsCandidates = socialLinksToCandidates(existingLinks, businessDetail);
  if (!query) {
    return mapsCandidates.length ? buildDiscoveryResult({
      query,
      topResults: [],
      candidates: mapsCandidates,
      source: "maps_detail"
    }) : emptyDiscovery("NO_QUERY", query);
  }

  let tab = null;
  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=20`;
    tab = await chrome.tabs.create({ url: searchUrl, active: false });
    await waitForTabLoad(tab.id, timeout);

    const [{ result = {} } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeGoogleResultsForSocials
    });

    if (result.captcha) {
      return {
        ...emptyDiscovery("CAPTCHA_BLOCKED", query),
        checked: true,
        skipped: false
      };
    }

    const topResults = Array.isArray(result.items) ? result.items.slice(0, 20) : [];
    const searchCandidates = extractSocialProfilesFromResults(topResults, { ...businessDetail, city });
    const candidates = mergeCandidates([...mapsCandidates, ...searchCandidates]);
    const validatedCandidates = await validateSocialCandidates(candidates, { ...businessDetail, city }, {
      timeout,
      maxProfiles: Number(options.maxSocialProfiles ?? 8)
    });

    return buildDiscoveryResult({
      query,
      topResults,
      candidates: validatedCandidates.length ? validatedCandidates : mapsCandidates,
      source: "google_search"
    });
  } catch (error) {
    if (mapsCandidates.length) {
      return {
        ...buildDiscoveryResult({ query, topResults: [], candidates: mapsCandidates, source: "maps_detail" }),
        error: error?.message ?? "Social discovery failed"
      };
    }
    return {
      ...emptyDiscovery("UNCERTAIN", query),
      error: error?.message ?? "Social discovery failed"
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

export function buildSocialSearchQuery(businessDetail = {}, city = null) {
  const name = getSearchName(businessDetail.name, {
    city,
    category: businessDetail.category
  });
  return name ? `${name} social media` : "";
}

export function extractSocialProfilesFromResults(searchResults = [], businessDetail = {}) {
  return searchResults
    .map((result) => buildSocialCandidate(result, businessDetail))
    .filter(Boolean)
    .filter((candidate) => candidate.score >= 45)
    .sort((first, second) => second.score - first.score);
}

function buildSocialCandidate(result = {}, businessDetail = {}) {
  if (classifyUrl(result.url) !== URL_TYPE.socialMedia) return null;

  const profile = normalizeSocialProfileUrl(result.url);
  if (!profile) return null;

  const score = scoreSocialCandidate(result, businessDetail, profile);
  return {
    provider: profile.provider,
    url: profile.url,
    handle: profile.handle,
    title: result.title || "",
    snippet: result.snippet || "",
    score,
    source: result.source || "google_search",
    bioText: null,
    validation: {
      opened: false,
      addressMatched: false,
      phoneMatched: false,
      mapsMatched: false,
      nameMatched: score >= 60
    }
  };
}

function scoreSocialCandidate(result = {}, businessDetail = {}, profile = {}) {
  const combined = normalizeForCompare(`${result.title || ""} ${result.snippet || ""} ${profile.handle || ""}`);
  const businessName = normalizeForCompare(businessDetail.name);
  const city = normalizeForCompare(businessDetail.city || extractCity(businessDetail.address));
  const brandTokens = getBrandTokens(businessDetail.name, {
    city,
    category: businessDetail.category
  });
  const phone = normalizePhoneDigits(businessDetail.phone);
  const matchedBrandTokens = brandTokens.filter((token) => combined.includes(token));
  const exactNameMatch = Boolean(businessName && combined.includes(businessName));
  const abbreviationMatch = hasBrandAbbreviationMatch(brandTokens, profile.handle || combined);
  const phoneMatch = Boolean(phone && combined.includes(phone.slice(-8)));
  if (!hasStrongIdentityMatch({
    brandTokens,
    matchedBrandTokens,
    exactNameMatch,
    abbreviationMatch,
    phoneMatch,
    combined,
    businessName
  })) {
    return 0;
  }

  let score = 0;

  if (brandTokens.length) {
    score += Math.round((matchedBrandTokens.length / brandTokens.length) * 60);
  }

  if (exactNameMatch || (businessName && stringSimilarity(businessName, combined) > 0.58)) {
    score += 20;
  }

  if (abbreviationMatch) score += 25;
  if (city && combined.includes(city)) score += 10;
  if (phoneMatch) score += 25;
  if (profile.handle && matchedBrandTokens.some((token) => profile.handle.includes(token))) score += 15;

  return Math.min(score, 100);
}

function hasStrongIdentityMatch({ brandTokens, matchedBrandTokens, exactNameMatch, abbreviationMatch, phoneMatch, combined, businessName }) {
  if (phoneMatch || exactNameMatch || abbreviationMatch) return true;
  if (!brandTokens.length) return false;
  const requiredMatches = brandTokens.length >= 2 ? 2 : 1;
  if (matchedBrandTokens.length >= requiredMatches) return true;
  return Boolean(businessName && brandTokens.length >= 2 && stringSimilarity(businessName, combined) > 0.7);
}

function hasBrandAbbreviationMatch(brandTokens = [], rawHandle = "") {
  if (brandTokens.length < 2) return false;
  const handle = normalizeForCompare(rawHandle).replace(/\s+/g, "");
  if (!handle) return false;

  const initials = brandTokens.map((token) => token[0]).join("");
  if (initials.length >= 3 && handle.includes(initials)) return true;

  for (let split = 2; split <= Math.min(4, brandTokens.length); split += 1) {
    const prefix = brandTokens.slice(0, split).map((token) => token[0]).join("");
    const suffixTokens = brandTokens.slice(split);
    const compactPattern = `${prefix}${suffixTokens.join("")}`;
    if (compactPattern.length >= 5 && handle.includes(compactPattern)) return true;
    if (handle.startsWith(prefix) && suffixTokens.length) {
      const matchedSuffixes = suffixTokens.filter((token) => handle.includes(token));
      if (matchedSuffixes.length >= Math.min(2, suffixTokens.length)) return true;
    }
  }

  return false;
}

async function validateSocialCandidates(candidates = [], businessDetail = {}, options = {}) {
  const limit = Math.max(1, Math.min(Number(options.maxProfiles || 8), candidates.length));
  const timeout = Math.max(2500, Math.min(Number(options.timeout || 10000), 7000));
  const selected = candidates
    .filter((candidate) => candidate.score >= 35 || candidate.source === "maps_detail")
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  const validated = [];

  for (const candidate of selected) {
    const enriched = await openAndValidateSocialCandidate(candidate, businessDetail, timeout);
    if (enriched.score >= 60 || enriched.validation.addressMatched || enriched.validation.phoneMatched || enriched.validation.mapsMatched) {
      validated.push(enriched);
    }
  }

  return mergeCandidates(validated).sort((a, b) => b.score - a.score);
}

async function openAndValidateSocialCandidate(candidate, businessDetail, timeout) {
  let tab = null;
  try {
    tab = await chrome.tabs.create({ url: candidate.url, active: false });
    await waitForTabLoad(tab.id, timeout);
    const [{ result = {} } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeSocialProfileContext
    });
    return enrichSocialCandidate(candidate, businessDetail, result);
  } catch (error) {
    return {
      ...candidate,
      validation: {
        ...(candidate.validation || {}),
        opened: false,
        error: error?.message || "SOCIAL_PROFILE_OPEN_FAILED"
      }
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

function enrichSocialCandidate(candidate, businessDetail, profileContext = {}) {
  const bioText = [
    profileContext.title,
    profileContext.description,
    profileContext.bodyText
  ].filter(Boolean).join("\n").slice(0, 5000);
  const combined = normalizeForCompare(`${candidate.title} ${candidate.snippet} ${candidate.handle} ${bioText}`);
  const addressScore = scoreAddressMatch(bioText, businessDetail.address);
  const phone = normalizePhoneDigits(businessDetail.phone);
  const phoneMatched = Boolean(phone && normalizePhoneDigits(bioText).includes(phone.slice(-8)));
  const mapsMatched = Boolean((profileContext.urls || []).some((url) => isSameMapsTarget(url, businessDetail.mapsUrl)));
  const nameScore = scoreSocialCandidate({
    title: `${candidate.title} ${profileContext.title || ""}`,
    snippet: `${candidate.snippet} ${profileContext.description || ""} ${profileContext.bodyText || ""}`,
    url: candidate.url
  }, businessDetail, {
    provider: candidate.provider,
    url: candidate.url,
    handle: candidate.handle
  });
  const city = normalizeForCompare(businessDetail.city || extractCity(businessDetail.address));
  const cityMatched = Boolean(city && combined.includes(city));
  const score = Math.min(100, Math.max(candidate.score, nameScore) + addressScore + (phoneMatched ? 25 : 0) + (mapsMatched ? 25 : 0) + (cityMatched ? 5 : 0));

  return {
    ...candidate,
    score,
    bioText,
    validation: {
      opened: true,
      nameMatched: nameScore >= 60 || candidate.score >= 60,
      addressMatched: addressScore >= 15,
      phoneMatched,
      mapsMatched,
      cityMatched,
      loginWall: Boolean(profileContext.loginWall)
    }
  };
}

function normalizeSocialProfileUrl(rawUrl) {
  try {
    const url = new URL(unwrapGoogleUrl(rawUrl));
    const host = url.hostname.replace(/^www\.|^m\./, "").toLowerCase();
    const provider = SOCIAL_PROVIDERS.find((item) => item.hosts.some((domain) => host === domain || host.endsWith(`.${domain}`)));
    if (!provider) return null;

    const segments = url.pathname.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment).trim());
    let firstSegment = segments[0] || "";
    if ((provider.key === "youtube" && ["@", "c", "channel", "user"].some((prefix) => firstSegment.startsWith(prefix))) || provider.key === "linkedin") {
      firstSegment = provider.key === "linkedin" && segments[0] === "company" ? segments[1] || "" : firstSegment;
    }
    if (!firstSegment) return null;
    if (provider.blockedSegments.includes(firstSegment.toLowerCase())) return null;

    const path = (provider.key === "youtube" || provider.key === "tiktok") && firstSegment.startsWith("@")
      ? firstSegment
      : firstSegment.replace(/^@/, "");
    const normalized = new URL(`https://www.${provider.hosts[0]}/${provider.key === "linkedin" ? "company/" : ""}${path}/`);
    const handle = normalizeForCompare(firstSegment.replace(/^@/, ""));
    return { provider: provider.key, url: normalized.href, handle };
  } catch {
    return null;
  }
}

function unwrapGoogleUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.searchParams.get("q") || url.searchParams.get("url") || rawUrl;
  } catch {
    return rawUrl || "";
  }
}

function pickSocialLinks(businessDetail = {}) {
  return Object.entries({
    instagram: businessDetail.instagram,
    facebook: businessDetail.facebook,
    tiktok: businessDetail.tiktok,
    youtube: businessDetail.youtube,
    linkedin: businessDetail.linkedin,
    x: businessDetail.x || businessDetail.twitter
  }).reduce((links, [key, value]) => {
    if (value) links[key] = value;
    return links;
  }, {});
}

function socialLinksToCandidates(socialLinks = {}, businessDetail = {}) {
  return Object.entries(socialLinks)
    .map(([provider, url]) => {
      const profile = normalizeSocialProfileUrl(url);
      if (!profile) return null;
      const score = scoreSocialCandidate({
        title: businessDetail.name || "",
        snippet: `${businessDetail.address || ""} ${businessDetail.city || ""} ${businessDetail.phone || ""}`,
        url
      }, businessDetail, profile);
      return {
        provider: profile.provider || provider,
        url: profile.url,
        handle: profile.handle,
        title: businessDetail.name || "",
        snippet: businessDetail.address || "",
        score: Math.max(70, score),
        source: "maps_detail",
        bioText: null,
        validation: {
          opened: false,
          addressMatched: false,
          phoneMatched: false,
          mapsMatched: false,
          nameMatched: true
        }
      };
    })
    .filter(Boolean);
}

function emptyDiscovery(verdict, query = null) {
  return {
    checked: true,
    skipped: false,
    skipReason: verdict,
    query,
    resultsFound: 0,
    topResults: [],
    candidates: [],
    socialLinks: {},
    bioText: null,
    verdict
  };
}

function buildDiscoveryResult({ query, topResults = [], candidates = [], source = null }) {
  const sorted = mergeCandidates(candidates).sort((first, second) => second.score - first.score);
  const socialLinks = sorted.reduce((links, candidate) => {
    if (!links[candidate.provider]) links[candidate.provider] = candidate.url;
    return links;
  }, {});
  return {
    checked: true,
    skipped: false,
    skipReason: null,
    query,
    resultsFound: topResults.length,
    topResults,
    candidates: sorted,
    socialLinks,
    bioText: sorted.map((candidate) => `${candidate.title}\n${candidate.snippet}\n${candidate.bioText || ""}`).join("\n\n").slice(0, 5000) || null,
    source,
    verdict: sorted.length ? "SOCIAL_FOUND" : "NO_SOSMED"
  };
}

function getSearchName(name, context = {}) {
  const normalized = normalizeForCompare(name);
  const importantTokens = getBrandTokens(name, context);
  if (!importantTokens.length) return "";
  return normalized;
}

function getBrandTokens(name, context = {}) {
  const ignored = new Set([
    ...GENERIC_NAME_WORDS,
    ...normalizeForCompare(context.city).split(/\s+/).filter(Boolean),
    ...normalizeForCompare(context.category).split(/\s+/).filter(Boolean)
  ]);
  return normalizeForCompare(name)
    .split(/\s+/)
    .filter((token) => token.length > 1)
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !ignored.has(token));
}

function scrapeGoogleResultsForSocials() {
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
      snippet: block?.innerText?.trim()?.slice(0, 500) || "",
      source: "google_anchor"
    };
  }).filter((item) => item.url && item.title);

  const seen = new Set();
  const items = [...organicItems, ...anchorItems].filter((item) => {
    const key = item.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { captcha: false, items: items.slice(0, 40) };

  function unwrapGoogleResultUrl(rawHref) {
    try {
      const url = new URL(rawHref);
      return url.searchParams.get("q") || url.searchParams.get("url") || rawHref;
    } catch {
      return rawHref || "";
    }
  }
}

function mergeCandidates(candidates = []) {
  const map = new Map();
  candidates.forEach((candidate) => {
    if (!candidate?.url) return;
    const existing = map.get(candidate.url);
    if (!existing || Number(candidate.score || 0) > Number(existing.score || 0)) {
      map.set(candidate.url, {
        ...existing,
        ...candidate,
        validation: {
          ...(existing?.validation || {}),
          ...(candidate.validation || {})
        }
      });
    }
  });
  return [...map.values()];
}

function scoreAddressMatch(text, address) {
  const addressTokens = getAddressTokens(address);
  if (!addressTokens.length) return 0;
  const source = normalizeForCompare(text);
  const matched = addressTokens.filter((token) => source.includes(token));
  if (matched.length >= Math.min(3, addressTokens.length)) return 25;
  if (matched.length >= 2) return 15;
  if (matched.length >= 1) return 8;
  return 0;
}

function getAddressTokens(address) {
  return normalizeForCompare(address)
    .split(/\s+/)
    .filter((token) => token.length > 2)
    .filter((token) => !/^\d+$/.test(token))
    .filter((token) => !["jalan", "jln", "kota", "kec", "kel", "bar", "tim", "sulawesi", "tengah", "indonesia"].includes(token));
}

function isSameMapsTarget(rawUrl, mapsUrl) {
  if (!rawUrl || !mapsUrl) return false;
  try {
    const url = new URL(rawUrl);
    if (!/(google\.[^/]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(url.hostname + url.pathname)) return false;
    const source = normalizeForCompare(rawUrl);
    const target = normalizeForCompare(mapsUrl);
    return source && target && (source.includes(target.slice(0, 32)) || target.includes(source.slice(0, 32)));
  } catch {
    return false;
  }
}

function scrapeSocialProfileContext() {
  const selectors = [
    'meta[name="description"]',
    'meta[property="og:description"]',
    'meta[property="og:title"]',
    '[data-key="intro_card_bio"]',
    '[class*="profileAboutSection"] span',
    "h1 + div span",
    "main header section div",
    "main"
  ];
  const chunks = [];
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (!element) continue;
    const value = element.content || element.innerText || element.textContent || "";
    if (value) chunks.push(value);
  }
  const title = document.title || "";
  const bodyText = chunks.join("\n").replace(/\s+/g, " ").slice(0, 5000);
  const urls = Array.from(document.querySelectorAll("a[href]"))
    .map((anchor) => anchor.href)
    .filter(Boolean)
    .slice(0, 200);
  return {
    title,
    description: chunks.slice(0, 3).join("\n").slice(0, 1000),
    bodyText,
    urls,
    loginWall: /login|log in|masuk|sign in/i.test(title) && bodyText.length < 200
  };
}
