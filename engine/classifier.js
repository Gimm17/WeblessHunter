import { FINAL_VERDICT, STATUS } from "../utils/constants.js";

export function classifyBusiness(businessDetail = {}, layer1 = {}, layer2 = {}, layer3 = {}) {
  if (layer1.verdict === "HAS_WEBSITE") {
    return {
      status: STATUS.skip,
      finalVerdict: FINAL_VERDICT.hasWebsite,
      reason: "Punya website di Google Maps.",
      url: layer1.websiteUrl ?? null
    };
  }

  if (layer2.verdict === "HAS_OWN_WEBSITE") {
    return {
      status: STATUS.skip,
      finalVerdict: FINAL_VERDICT.hasWebsite,
      reason: "Ada website resmi di bio media sosial.",
      url: layer2.websiteUrl ?? null
    };
  }

  if (layer3.verdict === "OWN_WEBSITE_FOUND") {
    return {
      status: STATUS.skip,
      finalVerdict: FINAL_VERDICT.hasWebsite,
      reason: "Website resmi ditemukan dari Google Search.",
      url: layer3.websiteUrl ?? null
    };
  }

  if (layer3.verdict === "UNCERTAIN" || layer3.verdict === "CAPTCHA_BLOCKED" || layer2.verdict === "SOSMED_INACCESSIBLE") {
    return {
      status: STATUS.uncertain,
      finalVerdict: FINAL_VERDICT.uncertain,
      reason: "Validasi belum konklusif. Perlu cek manual.",
      url: layer3.websiteUrl ?? layer2.websiteUrl ?? null
    };
  }

  const rating = Number(businessDetail.rating ?? 0);
  const reviewCount = Number(businessDetail.reviewCount ?? 0);
  const hasSocial = Boolean(businessDetail.instagram || businessDetail.facebook || businessDetail.tiktok);
  const strong = rating >= 4 && reviewCount >= 10 && hasSocial;

  return {
    status: strong ? STATUS.strong : STATUS.prospect,
    finalVerdict: FINAL_VERDICT.noWebsite,
    reason: strong
      ? `Rating ${rating} dengan ${reviewCount} ulasan dan punya media sosial.`
      : "Tidak ditemukan website resmi.",
    url: null
  };
}
