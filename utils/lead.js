import { STATUS } from "./constants.js";
import { getBusinessDedupeKey } from "./helpers.js";

export function getLeadProfile(input = {}) {
  const business = input.business || input;
  const validation = input.validation || {};
  const status = input.status || STATUS.unchecked;
  const rating = Number(business.rating || 0);
  const reviewCount = Number(business.reviewCount || 0);
  const hasPhone = Boolean(business.phone);
  const hasSocial = Boolean(business.instagram || business.facebook || business.tiktok || business.youtube || business.linkedin || business.x);
  const hasWebsite = Boolean(business.website)
    || validation.layer1?.verdict === "HAS_WEBSITE"
    || validation.layer2?.verdict === "HAS_OWN_WEBSITE"
    || validation.layer3?.verdict === "OWN_WEBSITE_FOUND"
    || status === STATUS.skip;

  if (hasWebsite) {
    return {
      score: 0,
      confidence: "Skip",
      confidenceTone: "muted",
      contactReady: false,
      hot: false,
      reasons: ["Sudah punya website atau perlu dilewati"]
    };
  }

  let score = 20;
  const reasons = ["Belum terdeteksi website resmi"];

  if (rating >= 4.5) {
    score += 15;
    reasons.push("Rating sangat baik");
  } else if (rating >= 4) {
    score += 10;
    reasons.push("Rating baik");
  }

  if (reviewCount >= 50) {
    score += 15;
    reasons.push("Review kuat");
  } else if (reviewCount >= 10) {
    score += 10;
    reasons.push("Review cukup");
  }

  if (hasSocial) {
    score += 20;
    reasons.push("Punya media sosial");
  }
  if (hasPhone) {
    score += 15;
    reasons.push("Nomor telepon tersedia");
  }
  if (business.category) score += 5;
  if (status === STATUS.strong) score += 10;
  else if (status === STATUS.prospect) score += 6;
  else if (status === STATUS.uncertain) score -= 10;
  if (validation.layer3?.verdict === "MARKETPLACE_ONLY" || validation.layer2?.verdict === "HAS_MARKETPLACE_ONLY") {
    score += 4;
    reasons.push("Belum ada domain resmi");
  }

  const normalizedScore = Math.max(0, Math.min(100, score));
  const contactReady = Boolean((hasPhone || hasSocial) && normalizedScore >= 55 && status !== STATUS.uncertain);
  const hot = isHotProspect({ business, status, validation, score: normalizedScore });
  const confidence = normalizedScore >= 75 ? "High" : normalizedScore >= 50 ? "Medium" : "Low";

  return {
    score: normalizedScore,
    confidence,
    confidenceTone: confidence === "High" ? "success" : confidence === "Medium" ? "info" : "warning",
    contactReady,
    hot,
    reasons
  };
}

export function isHotProspect(input = {}) {
  const business = input.business || input;
  const status = input.status || STATUS.unchecked;
  const score = Number(input.score ?? getLeadProfile(input).score);
  const rating = Number(business.rating || 0);
  const reviewCount = Number(business.reviewCount || 0);
  const hasContact = Boolean(business.phone || business.instagram || business.facebook || business.tiktok || business.youtube || business.linkedin || business.x);
  return status !== STATUS.skip
    && status !== STATUS.uncertain
    && score >= 70
    && rating >= 4
    && reviewCount >= 10
    && hasContact;
}

export function buildOutreachMessage(input = {}) {
  const business = input.business || input;
  const name = business.name || "bisnis kakak";
  const rating = business.rating ? ` rating ${business.rating}` : "";
  const city = business.city ? ` di ${business.city}` : "";
  return [
    `Halo kak, saya lihat ${name}${city} punya${rating} yang bagus di Google Maps.`,
    "Saya bantu bisnis lokal punya website resmi yang rapi, cepat dibuka, dan memudahkan calon pelanggan melihat layanan, lokasi, kontak, serta promo.",
    `Kalau berkenan, saya bisa kirim contoh konsep singkat untuk ${name}.`
  ].join(" ");
}

export function getLeadKey(input = {}) {
  const business = input.business || input;
  return getBusinessDedupeKey(business);
}
