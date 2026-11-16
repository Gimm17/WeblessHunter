import { STATUS } from "../utils/constants.js";
import { extractCity } from "../utils/helpers.js";
import { classifyBusiness } from "./classifier.js";
import { layer1Check } from "./layer1.js";
import { layer2Check } from "./layer2.js";
import { layer3Check } from "./layer3.js";
import { discoverSocialProfiles } from "./social-discovery.js";

export async function runDoubleCheck(rawBusiness, settings = {}, onProgress = () => {}) {
  let business = normalizeBusiness(rawBusiness);

  onProgress({
    step: "layer1",
    status: "running",
    progress: 15,
    message: "Cek field website di Maps"
  });
  const layer1 = layer1Check(business);
  onProgress({
    step: "layer1",
    status: "complete",
    progress: 30,
    message: layer1.verdict
  });

  let layer2 = skippedLayer2(settings.enableLayer2 ? "WAITING" : "DISABLED", business);
  let layer3 = skippedLayer3(settings.enableLayer3 ? "WAITING" : "DISABLED");
  let socialDiscovery = null;
  const layer2Enabled = settings.enableLayer2 !== false;

  if (layer2Enabled && !hasSocialLink(business) && canDiscoverSocialProfiles()) {
    onProgress({
      step: "layer2",
      status: "running",
      progress: 38,
      message: "Cari media sosial di Google"
    });
    socialDiscovery = await discoverSocialProfiles(business, {
      timeout: settings.layer2Timeout,
      query: settings.query
    });
    business = mergeDiscoveredSocials(business, socialDiscovery.socialLinks);
  }

  if (layer1.verdict === "HAS_WEBSITE") {
    layer2 = skippedLayer2(layer2Enabled ? "HAS_WEBSITE" : "DISABLED", business, socialDiscovery);
    if (layer2Enabled) {
      onProgress({
        step: "layer2",
        status: "complete",
        progress: 65,
        message: layer2.verdict
      });
    }
  } else if (layer2Enabled) {

    onProgress({
      step: "layer2",
      status: "running",
      progress: 45,
      message: hasSocialLink(business) ? "Cek bio media sosial" : "Media sosial tidak ditemukan"
    });
    layer2 = await layer2Check(business, {
      timeout: settings.layer2Timeout,
      fallbackBioText: socialDiscovery?.bioText,
      socialDiscovery
    });
    onProgress({
      step: "layer2",
      status: "complete",
      progress: 65,
      message: layer2.verdict
    });
  }

  const shouldRunLayer3 = layer1.verdict !== "HAS_WEBSITE"
    && layer2.verdict !== "HAS_OWN_WEBSITE"
    && settings.enableLayer3 !== false;

  if (shouldRunLayer3) {
    onProgress({
      step: "layer3",
      status: "running",
      progress: 78,
      message: "Google Search validation"
    });
    layer3 = await layer3Check(business, {
      timeout: settings.layer3Timeout,
      query: settings.query
    });
    onProgress({
      step: "layer3",
      status: "complete",
      progress: 95,
      message: layer3.verdict
    });
  }

  const classification = classifyBusiness(business, layer1, layer2, layer3);
  const completedAt = new Date().toISOString();
  const validation = {
    completedAt,
    finalVerdict: classification.finalVerdict,
    layer1,
    layer2,
    layer3
  };

  onProgress({
    step: "complete",
    status: "complete",
    progress: 100,
    message: classification.status
  });

  return {
    business,
    status: classification.status || STATUS.uncertain,
    reason: classification.reason,
    websiteUrl: classification.url,
    validation
  };
}

function hasSocialLink(business = {}) {
  return Boolean(business.instagram || business.facebook || business.tiktok || business.youtube || business.linkedin || business.x);
}

function mergeDiscoveredSocials(business = {}, socialLinks = {}) {
  return {
    ...business,
    instagram: business.instagram || socialLinks.instagram || null,
    facebook: business.facebook || socialLinks.facebook || null,
    tiktok: business.tiktok || socialLinks.tiktok || null,
    youtube: business.youtube || socialLinks.youtube || null,
    linkedin: business.linkedin || socialLinks.linkedin || null,
    x: business.x || socialLinks.x || null
  };
}

function canDiscoverSocialProfiles() {
  return Boolean(globalThis.chrome?.tabs?.create && globalThis.chrome?.scripting?.executeScript);
}

function normalizeBusiness(business = {}) {
  const city = business.city || extractCity(business.address) || extractCity(business.query);
  return {
    name: business.name ?? "",
    category: business.category ?? null,
    rating: business.rating ?? null,
    reviewCount: Number(business.reviewCount ?? 0),
    address: business.address ?? null,
    city,
    phone: business.phone ?? null,
    website: business.website ?? null,
    instagram: business.instagram ?? null,
    facebook: business.facebook ?? null,
    tiktok: business.tiktok ?? null,
    youtube: business.youtube ?? null,
    linkedin: business.linkedin ?? null,
    x: business.x ?? business.twitter ?? null,
    hours: business.hours ?? null,
    mapsUrl: business.mapsUrl ?? "",
    placeId: business.placeId ?? null,
    scrapedAt: business.scrapedAt || new Date().toISOString(),
    query: business.query ?? null
  };
}

function skippedLayer2(reason, business = {}, socialDiscovery = null) {
  const socialUrl = business.instagram || business.facebook || business.tiktok || business.youtube || business.linkedin || business.x || null;
  const hasSocial = Boolean(socialUrl);
  return {
    checked: false,
    skipped: true,
    skipReason: reason,
    sosmedChecked: socialUrl,
    bioText: socialDiscovery?.bioText || null,
    urlsFound: [],
    verdict: hasSocial ? "SOCIAL_FOUND_SKIPPED" : reason === "HAS_WEBSITE" ? "SKIPPED_HAS_WEBSITE" : "NO_SOSMED",
    websiteUrl: null
  };
}

function skippedLayer3(reason) {
  return {
    checked: false,
    skipped: true,
    query: null,
    resultsFound: 0,
    topResults: [],
    verdict: reason === "DISABLED" ? "NOT_FOUND" : "NOT_FOUND",
    websiteUrl: null,
    similarityScore: null
  };
}
