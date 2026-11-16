import { URL_TYPE } from "./constants.js";
import { normalizeUrl } from "./helpers.js";

export const MARKETPLACE_DOMAINS = Object.freeze([
  "tokopedia.com",
  "shopee.co.id",
  "shopee.com",
  "gofood.co.id",
  "grabfood.com",
  "traveloka.com",
  "tiket.com",
  "bukalapak.com",
  "blibli.com",
  "lazada.co.id",
  "zalora.co.id",
  "jd.id"
]);

export const DIRECTORY_DOMAINS = Object.freeze([
  "yellowpages.co.id",
  "qraved.com",
  "zomato.com",
  "tripadvisor.com",
  "pergikuliner.com",
  "foursquare.com",
  "google.com",
  "maps.google.com"
]);

export const SOCIAL_DOMAINS = Object.freeze([
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "twitter.com",
  "x.com",
  "youtube.com",
  "linkedin.com"
]);

export const LINK_AGGREGATOR_DOMAINS = Object.freeze([
  "linktree.com",
  "linktr.ee",
  "bio.link",
  "beacons.ai",
  "campsite.bio",
  "heylink.me"
]);

export function extractRootDomain(rawUrl) {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) return "";
  try {
    return new URL(normalized).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return String(rawUrl ?? "").toLowerCase();
  }
}

function domainMatches(domain, list) {
  return list.some((entry) => domain === entry || domain.endsWith(`.${entry}`));
}

export function classifyUrl(rawUrl) {
  const domain = extractRootDomain(rawUrl);
  if (!domain) return URL_TYPE.invalid;
  if (domainMatches(domain, MARKETPLACE_DOMAINS)) return URL_TYPE.marketplace;
  if (domainMatches(domain, SOCIAL_DOMAINS)) return URL_TYPE.socialMedia;
  if (domainMatches(domain, LINK_AGGREGATOR_DOMAINS)) return URL_TYPE.linkAggregator;
  if (domainMatches(domain, DIRECTORY_DOMAINS)) return URL_TYPE.directory;
  return URL_TYPE.ownWebsite;
}

export function isOwnWebsiteUrl(rawUrl) {
  return classifyUrl(rawUrl) === URL_TYPE.ownWebsite;
}
