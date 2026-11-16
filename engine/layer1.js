export function layer1Check(businessDetail = {}) {
  const website = String(businessDetail.website ?? "").trim();
  if (website) {
    return {
      checked: true,
      verdict: "HAS_WEBSITE",
      websiteUrl: website,
      hasWebsite: true,
      source: "maps_field"
    };
  }

  return {
    checked: true,
    verdict: "NO_WEBSITE_FIELD",
    websiteUrl: null,
    hasWebsite: false,
    source: "maps_field"
  };
}
