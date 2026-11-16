import { normalizeForCompare, normalizePhoneDigits } from "../utils/helpers.js";
import { classifyUrl } from "../utils/url-classifier.js";
import { URL_TYPE } from "../utils/constants.js";

export function stringSimilarity(firstValue, secondValue) {
  const first = normalizeForCompare(firstValue);
  const second = normalizeForCompare(secondValue);
  if (!first || !second) return 0;
  if (first === second) return 1;

  const firstBigrams = getBigrams(first);
  const secondBigrams = getBigrams(second);
  if (!firstBigrams.size || !secondBigrams.size) return 0;

  let intersection = 0;
  for (const item of firstBigrams) {
    if (secondBigrams.has(item)) intersection += 1;
  }
  return (2 * intersection) / (firstBigrams.size + secondBigrams.size);
}

function getBigrams(value) {
  const result = new Set();
  const input = ` ${value} `;
  for (let index = 0; index < input.length - 1; index += 1) {
    result.add(input.slice(index, index + 2));
  }
  return result;
}

export function scoreSearchSnippet(searchResult, business) {
  const urlType = classifyUrl(searchResult?.url);
  if (urlType !== URL_TYPE.ownWebsite) {
    return { score: 0, verdict: urlType, urlType };
  }

  const combined = normalizeForCompare(`${searchResult?.title ?? ""} ${searchResult?.snippet ?? ""}`);
  const nameScore = stringSimilarity(business?.name, combined);
  const phone = normalizePhoneDigits(business?.phone);
  const city = normalizeForCompare(business?.city);
  let score = 0;

  if (nameScore > 0.5 || combined.includes(normalizeForCompare(business?.name))) score += 25;
  if (phone && combined.includes(phone.slice(-8))) score += 30;
  if (city && combined.includes(city)) score += 15;

  return { score, verdict: score >= 60 ? "OWN_WEBSITE" : score >= 30 ? "UNCERTAIN" : "LOW_MATCH", urlType };
}

export function scorePageText(baseScore, pageText, business) {
  const combined = normalizeForCompare(pageText);
  let score = baseScore;
  const phone = normalizePhoneDigits(business?.phone);
  if (stringSimilarity(business?.name, combined) > 0.6 || combined.includes(normalizeForCompare(business?.name))) {
    score += 20;
  }
  if (phone && combined.includes(phone.slice(-8))) score += 15;
  return Math.min(100, score);
}
