export function generateId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeForCompare(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizePhoneDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeUrl(rawUrl) {
  const value = String(rawUrl ?? "").trim();
  if (!value) return null;
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

export function normalizeUrlKey(rawUrl) {
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) return "";
  try {
    const url = new URL(normalized);
    const pathname = url.pathname.replace(/\/+$/, "");
    return `${url.hostname.replace(/^www\./, "").toLowerCase()}${pathname}`.toLowerCase();
  } catch {
    return normalized.toLowerCase();
  }
}

export function extractUrlsFromText(text) {
  const source = String(text ?? "");
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+(?:\/[^\s<>"']*)?/g;
  const matches = source.match(urlRegex) || [];
  return [...new Set(matches.map((match) => {
    const cleaned = match.replace(/[),.;!?]+$/g, "");
    return normalizeUrl(cleaned);
  }).filter(Boolean))];
}

export function extractCity(addressOrQuery) {
  const value = normalizeText(addressOrQuery);
  if (!value) return null;

  const cityMatch = value.match(/\b(?:Kota|Kabupaten|Kab\.|Kec\.)\s+([A-Za-z .-]+)/i);
  if (cityMatch?.[1]) {
    return normalizeText(cityMatch[1].split(",")[0]);
  }

  const parts = value
    .split(",")
    .map((part) => normalizeText(part))
    .filter(Boolean);

  if (parts.length >= 3) {
    return parts[parts.length - 2];
  }
  if (parts.length >= 2) {
    return parts[parts.length - 1];
  }

  const queryWords = value.split(/\s+/);
  return queryWords.length > 1 ? queryWords[queryWords.length - 1] : null;
}

export function getBusinessDedupeKey(business = {}) {
  if (business.placeId) return `place:${business.placeId}`;
  if (business.mapsUrl) return `maps:${normalizeUrlKey(business.mapsUrl)}`;
  return `name:${normalizeForCompare(business.name)}:${normalizeForCompare(business.city)}`;
}

export function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

export function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Intl.DateTimeFormat("id-ID", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(value));
  } catch {
    return String(value);
  }
}

export function isSameDay(dateValue, baseDate = new Date()) {
  const date = new Date(dateValue);
  return date.getFullYear() === baseDate.getFullYear()
    && date.getMonth() === baseDate.getMonth()
    && date.getDate() === baseDate.getDate();
}
