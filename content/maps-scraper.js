(function setupWeblessHunterScraper() {
  const SELECTORS = {
    feed: ['[role="feed"]', 'div[aria-label][role="feed"]'],
    listingAnchor: 'a[href*="/maps/place/"]',
    listingName: ['[class*="fontHeadlineSmall"]', 'h3', '[aria-label]'],
    detailName: ['h1[class*="fontHeadlineLarge"]', 'h1[jstcache]', 'h1'],
    address: ['[data-item-id="address"] .fontBodyMedium', '[data-item-id="address"]', 'button[data-item-id="address"]'],
    phone: [
      'a[href^="tel:"]',
      '[data-item-id^="phone:tel:"] .fontBodyMedium',
      '[data-item-id^="phone:tel:"]',
      'button[aria-label*="Phone"]',
      'button[aria-label*="Telepon"]',
      'button[aria-label*="Call"]',
      'button[data-tooltip*="phone"]',
      'button[data-tooltip*="telepon"]'
    ],
    website: [
      '[data-item-id*="authority"] a',
      '[data-item-id*="authority"]',
      'a[data-item-id*="authority"]',
      'button[data-item-id*="authority"]',
      'a[aria-label*="Website"]',
      'button[aria-label*="Website"]',
      'a[aria-label*="Situs"]',
      'button[aria-label*="Situs"]'
    ],
    category: ['button[jsaction*="category"]', '[jsaction*="category"] button'],
    hours: ['[data-hide-tooltip-on-mouse-leave] table', 'table[aria-label*="Jam"]', 'table[aria-label*="Hours"]'],
    searchInput: ['#searchboxinput', 'input[aria-label*="Search Google Maps"]', 'input[aria-label*="Telusuri"]']
  };
  const GENERIC_DETAIL_TITLES = new Set(["hasil", "results", "result"]);
  const BUSINESS_GENERIC_WORDS = new Set([
    "apotek", "apotik", "bengkel", "cafe", "coffee", "coffeeshop", "dokter", "farmasi",
    "hasil", "kafe", "kedai", "klinik", "kopi", "medical", "restaurant", "restoran",
    "rumah", "salon", "shop", "toko", "warung", "warkop"
  ]);
  const NON_WEBSITE_DOMAINS = [
    "agoda.com",
    "airbnb.com",
    "beacons.ai",
    "bio.link",
    "bit.ly",
    "bluepillow.id",
    "booking.com",
    "campsite.bio",
    "expedia.com",
    "facebook.com",
    "fb.com",
    "goo.gl",
    "google.com",
    "google.co.id",
    "googleapis.com",
    "googleusercontent.com",
    "gstatic.com",
    "heylink.me",
    "hotels.com",
    "hotelscombined.com",
    "instagram.com",
    "kayak.com",
    "linktr.ee",
    "linktree.com",
    "linkedin.com",
    "maps.app.goo.gl",
    "maps.google.com",
    "tiket.com",
    "trip.com",
    "tiktok.com",
    "traveloka.com",
    "trivago.com",
    "tripadvisor.com",
    "twitter.com",
    "wa.me",
    "whatsapp.com",
    "x.com",
    "youtube.com",
    "youtu.be"
  ];

  function getElement(selectors, context = document) {
    for (const selector of selectors) {
      const element = context.querySelector(selector);
      if (element) return element;
    }
    return null;
  }

  function getText(element) {
    return (element?.innerText || element?.textContent || element?.getAttribute?.("aria-label") || "").trim();
  }

  function cleanText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function getResultsFeed() {
    return getElement(SELECTORS.feed);
  }

  function hasVisibleBusinessResults() {
    return Boolean(getResultsFeed()?.querySelector(SELECTORS.listingAnchor));
  }

  function getCurrentQuery() {
    const input = getElement(SELECTORS.searchInput);
    const inputValue = cleanText(input?.value || input?.getAttribute("value") || "");
    if (inputValue) return inputValue;
    const match = location.pathname.match(/\/maps\/search\/([^/]+)/);
    return match ? decodeURIComponent(match[1].replace(/\+/g, " ")) : "";
  }

  function scrapeListings() {
    const feed = getResultsFeed();
    const query = getCurrentQuery();
    if (!feed) {
      return { query, total: 0, items: [] };
    }

    const anchors = Array.from(feed.querySelectorAll(SELECTORS.listingAnchor));
    const seen = new Set();
    const items = [];

    for (const anchor of anchors) {
      const mapsUrl = anchor.href;
      if (!mapsUrl || seen.has(mapsUrl)) continue;
      seen.add(mapsUrl);
      const card = getListingCard(anchor);
      const item = scrapeListing(card, anchor, query);
      if (item.name) items.push(item);
    }

    return { query, total: items.length, items };
  }

  async function collectListings(options = {}) {
    const targetCount = clampNumber(options.targetCount, 25, 1, 100);
    const maxScrolls = clampNumber(options.maxScrolls, Math.max(14, Math.ceil(targetCount * 1.4)), 1, 160);
    const settleMs = clampNumber(options.settleMs, 900, 250, 3000);
    const initialWaitMs = clampNumber(options.initialWaitMs, 9000, 1000, 20000);
    const collected = new Map();
    let scrolls = 0;
    let idleScrolls = 0;
    let exhausted = false;

    reportScanProgress({
      phase: "waiting",
      query: getCurrentQuery(),
      collected: 0,
      targetCount,
      scrolls,
      maxScrolls,
      message: `Menunggu daftar bisnis Maps tampil...`
    });

    await waitFor(() => hasVisibleBusinessResults() || Boolean(getResultsFeed()), initialWaitMs, 250);

    while (true) {
      const scraped = scrapeListings();
      const before = collected.size;
      for (const item of scraped.items) {
        const key = getListingKey(item);
        if (!key) continue;
        collected.set(key, mergeListingData(collected.get(key), item));
      }

      const added = collected.size - before;
      if (scrolls > 0) {
        idleScrolls = added > 0 ? 0 : idleScrolls + 1;
      }

      const collectedCount = collected.size;
      reportScanProgress({
        phase: "collecting",
        query: scraped.query,
        collected: collectedCount,
        targetCount,
        scrolls,
        maxScrolls,
        message: `Mengumpulkan ${Math.min(collectedCount, targetCount)}/${targetCount} listing Maps...`
      });

      if (collectedCount >= targetCount) break;
      if (isEndOfResultsVisible()) {
        exhausted = true;
        break;
      }
      if (idleScrolls >= 5) {
        exhausted = true;
        break;
      }
      if (scrolls >= maxScrolls) break;

      const container = getResultsScrollContainer();
      if (!container) {
        exhausted = true;
        break;
      }

      const beforeScrollTop = container.scrollTop;
      const beforeScrollHeight = container.scrollHeight;
      scrollResults(container);
      scrolls += 1;

      await waitFor(() => {
        if (isEndOfResultsVisible()) return true;
        if (container.scrollTop !== beforeScrollTop || container.scrollHeight !== beforeScrollHeight) return true;
        return scrapeListings().items.some((item) => !collected.has(getListingKey(item)));
      }, settleMs + 1600, 250);
      await delay(settleMs);
    }

    const finalItems = Array.from(collected.values()).slice(0, targetCount);
    reportScanProgress({
      phase: "done",
      query: getCurrentQuery(),
      collected: finalItems.length,
      targetCount,
      scrolls,
      maxScrolls,
      exhausted,
      message: exhausted && finalItems.length < targetCount
        ? `Maps hanya menyediakan ${finalItems.length}/${targetCount} listing.`
        : `Target ${finalItems.length}/${targetCount} listing terpenuhi.`
    });

    return {
      query: getCurrentQuery(),
      total: finalItems.length,
      items: finalItems,
      targetCount,
      exhausted,
      scrolls
    };
  }

  function getResultsScrollContainer() {
    const feed = getResultsFeed();
    if (!feed) return null;
    let current = feed;
    while (current && current !== document.body && current !== document.documentElement) {
      if (isScrollable(current)) return current;
      current = current.parentElement;
    }
    return isScrollable(feed) ? feed : null;
  }

  function isScrollable(element) {
    if (!element) return false;
    return element.scrollHeight > element.clientHeight + 40;
  }

  function scrollResults(container) {
    const distance = Math.max(360, Math.floor((container.clientHeight || 600) * 0.85));
    const nextTop = Math.min(container.scrollTop + distance, container.scrollHeight);
    if (typeof container.scrollBy === "function") {
      container.scrollBy({ top: distance, behavior: "auto" });
    }
    if (container.scrollTop < nextTop) {
      container.scrollTop = nextTop;
    }
  }

  function isEndOfResultsVisible() {
    const feedText = cleanText(getResultsFeed()?.innerText || "");
    return /(you'?ve reached the end of the list|end of the list|anda telah mencapai akhir daftar|akhir daftar)/i.test(feedText);
  }

  function getListingKey(item = {}) {
    if (item.placeId) return `place:${item.placeId}`;
    const normalizedUrl = normalizeComparableUrl(item.mapsUrl);
    if (normalizedUrl) return `url:${normalizedUrl}`;
    const name = cleanText(item.name).toLowerCase();
    const city = cleanText(item.city).toLowerCase();
    return name ? `name:${name}|${city}` : "";
  }

  function mergeListingData(existing = {}, item = {}) {
    if (!existing) return item;
    const cleanEntries = Object.entries(item)
      .filter(([, value]) => value !== null && value !== "" && value !== undefined);
    return { ...existing, ...Object.fromEntries(cleanEntries) };
  }

  function getListingCard(anchor) {
    let current = anchor;
    for (let depth = 0; depth < 8 && current; depth += 1) {
      if (current.getAttribute("role") === "article") return current;
      const hasName = current.querySelector?.('[class*="fontHeadlineSmall"], h3');
      const hasPlaceLink = current.querySelector?.(SELECTORS.listingAnchor);
      if (hasName && hasPlaceLink) return current;
      current = current.parentElement;
    }
    return anchor.parentElement || anchor;
  }

  function scrapeListing(card, anchor, query) {
    const name = cleanText(getText(getElement(SELECTORS.listingName, card)) || anchor.getAttribute("aria-label"));
    const fullText = cleanText(card.innerText || "");
    const rating = parseRating(fullText, card);
    const reviewCount = parseReviewCount(fullText, card);
    const category = extractCategory(fullText, name);
    const city = extractCityFromText(fullText) || extractCityFromText(query);

    return {
      name,
      category,
      rating,
      reviewCount,
      address: null,
      city,
      phone: null,
      website: null,
      instagram: null,
      facebook: null,
      tiktok: null,
      hours: null,
      mapsUrl: anchor.href,
      placeId: extractPlaceId(anchor.href),
      scrapedAt: new Date().toISOString(),
      query
    };
  }

  function parseRating(text, context) {
    const aria = Array.from(context.querySelectorAll("[aria-label]"))
      .map((element) => element.getAttribute("aria-label"))
      .join(" ");
    const source = `${text} ${aria}`.replace(/,/g, ".");
    const match = source.match(/([0-5](?:\.\d)?)\s*(?:stars?|bintang)/i) || source.match(/\b([0-5]\.\d)\b/);
    return match ? Number(match[1]) : null;
  }

  function parseReviewCount(text, context) {
    const aria = Array.from(context.querySelectorAll("[aria-label]"))
      .map((element) => element.getAttribute("aria-label"))
      .join(" ");
    const source = `${text} ${aria}`;
    const match = source.match(/([\d.,]+)\s*(?:reviews?|ulasan)/i) || source.match(/\(([\d.,]+)\)/);
    if (!match) return 0;
    return Number(String(match[1]).replace(/\D/g, "")) || 0;
  }

  function extractCategory(text, name) {
    const lines = String(text || "")
      .split(/\n+/)
      .map(cleanText)
      .filter(Boolean)
      .filter((line) => line !== name)
      .filter((line) => !/(stars?|bintang|ulasan|reviews?|open|closed|buka|tutup|km|m$)/i.test(line));
    return lines[0] || null;
  }

  function extractCityFromText(value) {
    const parts = String(value || "").split(",").map(cleanText).filter(Boolean);
    if (parts.length >= 2) return parts[parts.length - 1];
    const words = cleanText(value).split(/\s+/);
    return words.length > 1 ? words[words.length - 1] : null;
  }

  async function scrapeBusinessDetailForBusiness(business) {
    const anchor = findListingAnchor(business);
    if (anchor) {
      anchor.click();
      await waitForBusinessDetailReady(business);
    }

    await waitForContactFields(business);
    const detail = scrapeBusinessDetail(business);
    return mergeBusiness(business, detail);
  }

  async function waitForBusinessDetailReady(business) {
    await waitFor(() => {
      const detail = scrapeBusinessDetail(business);
      return detail.name
        && isNameCompatible(detail.name, business.name)
        && hasUsefulDetailData(detail);
    }, 10000);
    await waitForContactFields(business);
  }

  async function waitForContactFields(business) {
    let lastSignature = "";
    let stableSince = Date.now();
    await waitFor(() => {
      const detail = scrapeBusinessDetail(business);
      if (!detail.name || (business.name && !isNameCompatible(detail.name, business.name))) return false;
      if (hasContactDetailData(detail)) return true;

      const signature = getDetailTextSignature(detail.name);
      if (signature && signature !== lastSignature) {
        lastSignature = signature;
        stableSince = Date.now();
        return false;
      }

      return Boolean(detail.address && Date.now() - stableSince >= 1200);
    }, 6500, 250);
  }

  function findListingAnchor(business = {}) {
    const anchors = Array.from(document.querySelectorAll(SELECTORS.listingAnchor));
    const targetUrl = normalizeComparableUrl(business.mapsUrl);
    if (targetUrl) {
      const exact = anchors.find((anchor) => normalizeComparableUrl(anchor.href) === targetUrl);
      if (exact) return exact;
    }
    const targetName = String(business.name || "").toLowerCase();
    if (!targetName) return null;
    return anchors.find((anchor) => {
      const label = `${anchor.getAttribute("aria-label") || ""} ${anchor.innerText || ""}`.toLowerCase();
      return label.includes(targetName);
    }) || null;
  }

  function normalizeComparableUrl(value) {
    try {
      const url = new URL(value);
      url.hash = "";
      return `${url.origin}${url.pathname}`.replace(/\/+$/, "").toLowerCase();
    } catch {
      return "";
    }
  }

  function scrapeBusinessDetail(expectedBusiness = {}) {
    const name = getDetailName(expectedBusiness);
    const detailRoot = getDetailRoot(name);
    const context = detailRoot || (name ? document : null);
    const address = context ? cleanText(getText(getElement(SELECTORS.address, context))) || null : null;
    const phone = context ? extractPhone(context) : null;
    const websiteElement = context ? getElement(SELECTORS.website, context) : null;
    const website = context ? extractWebsiteUrl(websiteElement, context) : null;
    const category = context ? cleanText(getText(getElement(SELECTORS.category, context))) || null : null;
    const socials = context ? extractSocialLinks(name || expectedBusiness.name, context) : {};
    const mapsUrl = location.href.includes("/maps/place/") ? location.href : "";

    return {
      name,
      category,
      rating: scrapeDetailRating(),
      reviewCount: scrapeDetailReviewCount(),
      address,
      city: extractCityFromText(address),
      phone,
      website,
      instagram: socials.instagram,
      facebook: socials.facebook,
      tiktok: socials.tiktok,
      youtube: socials.youtube,
      linkedin: socials.linkedin,
      x: socials.x,
      hours: scrapeOpeningHours(),
      mapsUrl,
      placeId: extractPlaceId(mapsUrl),
      scrapedAt: new Date().toISOString(),
      query: getCurrentQuery()
    };
  }

  function getDetailName(expectedBusiness = {}) {
    const candidates = [];
    for (const selector of SELECTORS.detailName) {
      for (const element of Array.from(document.querySelectorAll(selector))) {
        if (!isVisible(element)) continue;
        const text = cleanText(getText(element));
        if (!text || isGenericDetailTitle(text)) continue;
        if (!candidates.includes(text)) candidates.push(text);
      }
    }

    const expectedName = cleanText(expectedBusiness.name);
    if (expectedName) {
      const match = candidates.find((candidate) => isNameCompatible(candidate, expectedName));
      if (match) return match;
    }

    return candidates[0] || "";
  }

  function getDetailRoot(detailName) {
    if (!detailName) return null;
    const heading = Array.from(document.querySelectorAll("h1"))
      .find((element) => isVisible(element) && cleanText(getText(element)) === detailName);
    let current = heading;
    for (let depth = 0; depth < 8 && current; depth += 1) {
      if (current.querySelector?.('[data-item-id="address"], [data-item-id*="authority"], [data-item-id^="phone:tel:"]')) {
        return current;
      }
      current = current.parentElement;
    }
    return heading?.closest?.('[role="main"], [aria-label]') || null;
  }

  function extractWebsiteUrl(element, context = document) {
    const candidates = [];
    if (element) collectWebsiteCandidatesFromElement(element, candidates, 100);

    const specificSelectors = [
      '[data-item-id*="authority"]',
      'a[aria-label*="Website"]',
      'button[aria-label*="Website"]',
      'a[aria-label*="Situs"]',
      'button[aria-label*="Situs"]'
    ];
    for (const selector of specificSelectors) {
      for (const node of Array.from(context.querySelectorAll(selector))) {
        collectWebsiteCandidatesFromElement(node, candidates, 90);
      }
    }

    for (const anchor of Array.from(context.querySelectorAll("a[href]"))) {
      collectWebsiteCandidatesFromElement(anchor, candidates, 35);
    }
    collectWebsiteCandidatesFromText(context.innerText || context.textContent || "", candidates, 25);

    return rankWebsiteCandidates(candidates)[0]?.url || null;
  }

  function collectWebsiteCandidatesFromElement(element, candidates, priority) {
    if (!element || !isVisible(element)) return;
    const sources = [
      element.href,
      element.getAttribute?.("href"),
      element.getAttribute?.("aria-label"),
      element.getAttribute?.("data-item-id"),
      element.getAttribute?.("title"),
      getText(element)
    ];
    for (const source of sources) {
      for (const url of extractWebsiteUrlsFromText(source)) {
        candidates.push({
          url,
          priority,
          label: cleanText(`${element.getAttribute?.("aria-label") || ""} ${getText(element)}`)
        });
      }
    }
  }

  function collectWebsiteCandidatesFromText(text, candidates, priority) {
    const lines = String(text || "")
      .split(/\n+/)
      .map(cleanText)
      .filter(Boolean);
    for (const line of lines) {
      if (!/\.[a-z]{2,}/i.test(line)) continue;
      for (const url of extractWebsiteUrlsFromText(line)) {
        candidates.push({ url, priority, label: line });
      }
    }
  }

  function extractWebsiteUrlsFromText(value) {
    const rawValue = unwrapGoogleUrl(String(value || "").trim());
    if (!rawValue) return [];

    const direct = normalizePotentialWebsiteUrl(rawValue);
    if (direct) return [direct];

    const matches = rawValue.match(/(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z]{2,})+(?:\/[^\s<>"']*)?/gi) || [];
    return matches
      .map((match) => normalizePotentialWebsiteUrl(match))
      .filter(Boolean);
  }

  function normalizePotentialWebsiteUrl(rawValue) {
    const value = String(rawValue || "").trim().replace(/[),.;!?]+$/g, "");
    if (!value || /^(tel|mailto|javascript):/i.test(value)) return null;
    if (!/^https?:\/\//i.test(value) && !/^(?:www\.)?[a-z0-9-]+(?:\.[a-z]{2,})+/i.test(value)) return null;

    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      url.hash = "";
      if (!isOwnWebsiteCandidate(url.href)) return null;
      return url.href;
    } catch {
      return null;
    }
  }

  function rankWebsiteCandidates(candidates = []) {
    const seen = new Map();
    for (const candidate of candidates) {
      if (!candidate.url || !isOwnWebsiteCandidate(candidate.url)) continue;
      const key = normalizeComparableUrl(candidate.url);
      const score = Number(candidate.priority || 0)
        + (/website|situs|authority/i.test(candidate.label || "") ? 20 : 0);
      const existing = seen.get(key);
      if (!existing || score > existing.score) {
        seen.set(key, { url: candidate.url, score });
      }
    }
    return Array.from(seen.values()).sort((first, second) => second.score - first.score);
  }

  function isOwnWebsiteCandidate(rawUrl) {
    try {
      const url = new URL(unwrapGoogleUrl(rawUrl));
      const host = url.hostname.replace(/^www\./, "").toLowerCase();
      if (!host || !host.includes(".")) return false;
      if (url.protocol !== "http:" && url.protocol !== "https:") return false;
      if (/^(?:maps\.)?google\./i.test(host)) return false;
      return !NON_WEBSITE_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
    } catch {
      return false;
    }
  }

  function extractPhone(context = document) {
    const phoneElement = getElement(SELECTORS.phone, context);
    const fromElement = extractPhoneFromText([
      phoneElement?.href || "",
      phoneElement?.getAttribute?.("href") || "",
      phoneElement?.getAttribute?.("aria-label") || "",
      phoneElement?.getAttribute?.("data-item-id") || "",
      getText(phoneElement)
    ].join(" "));
    if (fromElement) return fromElement;

    const phoneNodes = Array.from(context.querySelectorAll('a[href^="tel:"], button, [role="button"]'));
    for (const node of phoneNodes) {
      const label = [
        node.href || "",
        node.getAttribute?.("href") || "",
        node.getAttribute?.("aria-label") || "",
        node.getAttribute?.("data-item-id") || "",
        node.getAttribute?.("data-tooltip") || "",
        getText(node)
      ].join(" ");
      if (!/(tel:|phone|telepon|call|panggil)/i.test(label)) continue;
      const phone = extractPhoneFromText(label);
      if (phone) return phone;
    }

    return extractPhoneFromText(context.innerText || context.textContent || "");
  }

  function extractPhoneFromText(text) {
    const source = String(text || "")
      .replace(/phone:tel:/gi, " ")
      .replace(/tel:/gi, " ")
      .replace(/(?:phone|telepon|call|panggil)\s*:?/gi, " ");
    const matches = source.match(/(?:\+?62|0|\(\s*0\d{1,4}\s*\))[\d\s().-]{6,}\d/g) || [];
    for (const match of matches) {
      const cleaned = cleanText(match).replace(/\s*-\s*/g, "-");
      const digits = cleaned.replace(/\D/g, "");
      if (digits.length >= 7 && digits.length <= 15) return cleaned;
    }
    return null;
  }

  function extractSocialLinks(businessName, context = document) {
    const links = Array.from(context.querySelectorAll("a[href]"))
      .map((anchor) => ({
        href: unwrapGoogleUrl(anchor.href),
        text: cleanText(getText(anchor))
      }))
      .filter((link) => isSocialLinkCompatible(link.href, link.text, businessName))
      .map((link) => link.href);
    return {
      instagram: links.find((href) => /instagram\.com/i.test(href)) || null,
      facebook: links.find((href) => /facebook\.com/i.test(href)) || null,
      tiktok: links.find((href) => /tiktok\.com/i.test(href)) || null,
      youtube: links.find((href) => /(?:youtube\.com|youtu\.be)/i.test(href)) || null,
      linkedin: links.find((href) => /linkedin\.com/i.test(href)) || null,
      x: links.find((href) => /(?:x\.com|twitter\.com)/i.test(href)) || null
    };
  }

  function isSocialLinkCompatible(href, text, businessName) {
    if (!/(instagram\.com|facebook\.com|tiktok\.com|youtube\.com|youtu\.be|linkedin\.com|twitter\.com|x\.com)/i.test(href || "")) return false;
    const tokens = importantNameTokens(businessName);
    if (!tokens.length) return false;
    const combined = normalizeForTokens(`${href || ""} ${text || ""}`);
    const matched = tokens.filter((token) => combined.includes(token));
    const required = tokens.length >= 2 ? 2 : 1;
    return matched.length >= required;
  }

  function unwrapGoogleUrl(rawHref) {
    try {
      const url = new URL(rawHref);
      const nested = url.searchParams.get("q") || url.searchParams.get("url");
      return nested || rawHref;
    } catch {
      return rawHref || "";
    }
  }

  function scrapeDetailRating() {
    const body = document.body.innerText || "";
    const match = body.replace(/,/g, ".").match(/([0-5](?:\.\d)?)\s*(?:stars?|bintang)/i);
    return match ? Number(match[1]) : null;
  }

  function scrapeDetailReviewCount() {
    const body = document.body.innerText || "";
    const match = body.match(/([\d.,]+)\s*(?:reviews?|ulasan)/i);
    return match ? Number(String(match[1]).replace(/\D/g, "")) || 0 : 0;
  }

  function scrapeOpeningHours() {
    const table = getElement(SELECTORS.hours);
    if (!table) return null;
    const rows = Array.from(table.querySelectorAll("tr")).map((row) => ({
      day: cleanText(row.querySelector("td:first-child")?.innerText),
      hours: cleanText(row.querySelector("td:last-child")?.innerText)
    })).filter((row) => row.day || row.hours);
    return rows.length ? rows : null;
  }

  function extractPlaceId(url) {
    const value = String(url || "");
    const match = value.match(/!1s([^!]+)/) || value.match(/[?&]cid=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function mergeBusiness(base = {}, detail = {}) {
    const detailName = cleanText(detail.name);
    const detailIsCompatible = !detailName
      || isGenericDetailTitle(detailName)
      || !base.name
      || isGenericDetailTitle(base.name)
      || isNameCompatible(detailName, base.name);
    const safeDetail = detailIsCompatible ? detail : {};
    const safeDetailName = cleanText(safeDetail.name);
    return {
      ...base,
      ...Object.fromEntries(Object.entries(safeDetail).filter(([, value]) => value !== null && value !== "" && value !== undefined)),
      name: safeDetailName && !isGenericDetailTitle(safeDetailName) ? safeDetailName : base.name || "",
      category: safeDetail.category || base.category || null,
      rating: safeDetail.rating ?? base.rating ?? null,
      reviewCount: safeDetail.reviewCount || base.reviewCount || 0,
      mapsUrl: safeDetail.mapsUrl || base.mapsUrl || "",
      placeId: safeDetail.placeId || base.placeId || null,
      query: safeDetail.query || base.query || getCurrentQuery()
    };
  }

  function hasUsefulDetailData(detail = {}) {
    return Boolean(detail.website || detail.address || detail.phone || detail.instagram || detail.facebook || detail.tiktok || detail.youtube || detail.linkedin || detail.x);
  }

  function hasContactDetailData(detail = {}) {
    return Boolean(detail.website || detail.phone || detail.instagram || detail.facebook || detail.tiktok || detail.youtube || detail.linkedin || detail.x);
  }

  function getDetailTextSignature(detailName) {
    const root = getDetailRoot(detailName);
    return cleanText((root?.innerText || root?.textContent || "").slice(0, 3000));
  }

  function isVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) return false;
    const style = getComputedStyle(element);
    return style.visibility !== "hidden" && style.display !== "none";
  }

  function isGenericDetailTitle(value) {
    return GENERIC_DETAIL_TITLES.has(normalizeForTokens(value));
  }

  function isNameCompatible(detailName, expectedName) {
    const detail = normalizeForTokens(detailName);
    const expected = normalizeForTokens(expectedName);
    if (!detail || isGenericDetailTitle(detail) || !expected) return false;
    if (detail.includes(expected) || expected.includes(detail)) return true;
    const detailTokens = importantNameTokens(detail);
    const expectedTokens = importantNameTokens(expected);
    if (!detailTokens.length || !expectedTokens.length) return false;
    const matched = expectedTokens.filter((token) => detailTokens.includes(token));
    return matched.length >= Math.min(2, expectedTokens.length);
  }

  function importantNameTokens(value) {
    return normalizeForTokens(value)
      .split(/\s+/)
      .filter((token) => token.length > 1)
      .filter((token) => !/^\d+$/.test(token))
      .filter((token) => !BUSINESS_GENERIC_WORDS.has(token));
  }

  function normalizeForTokens(value) {
    return cleanText(value)
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function waitFor(predicate, timeout = 5000, interval = 250) {
    const startedAt = Date.now();
    return new Promise((resolve) => {
      const tick = () => {
        if (predicate()) {
          resolve(true);
          return;
        }
        if (Date.now() - startedAt >= timeout) {
          resolve(false);
          return;
        }
        setTimeout(tick, interval);
      };
      tick();
    });
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function clampNumber(value, fallback, min, max) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(Math.max(parsed, min), max);
  }

  function reportScanProgress(payload = {}) {
    try {
      chrome.runtime.sendMessage({
        type: "SCAN_PROGRESS",
        payload
      }).catch(() => {});
    } catch {
      // Progress is best-effort; scraping should continue even if the panel is closed.
    }
  }

  window.WeblessHunterScraper = {
    hasVisibleBusinessResults,
    scrapeListings,
    collectListings,
    scrapeBusinessDetail,
    scrapeBusinessDetailForBusiness,
    getCurrentQuery
  };
})();
