import { EXPORT_COLUMNS, FOLLOWUP_EXPORT_COLUMNS } from "./constants.js";
import { buildOutreachMessage, getLeadProfile } from "./lead.js";

export function prospectToExportRow(prospect) {
  const business = prospect?.business ?? {};
  const validation = prospect?.validation ?? {};
  const leadProfile = getLeadProfile(prospect);
  return {
    id: prospect?.id ?? "",
    savedAt: prospect?.savedAt ?? "",
    status: prospect?.status ?? "",
    name: business.name ?? "",
    category: business.category ?? "",
    rating: business.rating ?? "",
    reviewCount: business.reviewCount ?? "",
    address: business.address ?? "",
    city: business.city ?? "",
    phone: business.phone ?? "",
    website: business.website ?? "",
    instagram: business.instagram ?? "",
    facebook: business.facebook ?? "",
    tiktok: business.tiktok ?? "",
    youtube: business.youtube ?? "",
    linkedin: business.linkedin ?? "",
    x: business.x ?? "",
    leadScore: prospect?.leadScore ?? leadProfile.score,
    confidence: prospect?.confidence ?? leadProfile.confidence,
    layer1Verdict: validation.layer1?.verdict ?? "",
    layer2Verdict: validation.layer2?.verdict ?? "",
    layer3Verdict: validation.layer3?.verdict ?? "",
    mapsUrl: business.mapsUrl ?? "",
    notes: prospect?.notes ?? "",
    outreachMessage: buildOutreachMessage(prospect)
  };
}

export function escapeCsv(value) {
  const stringValue = String(value ?? "");
  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, "\"\"")}"`;
  }
  return stringValue;
}

export function buildCsv(prospects) {
  return buildCsvWithColumns(prospects, EXPORT_COLUMNS);
}

export function buildFollowupCsv(prospects) {
  return buildCsvWithColumns(prospects, FOLLOWUP_EXPORT_COLUMNS);
}

function buildCsvWithColumns(prospects, columns) {
  const header = columns.join(",");
  const rows = prospects.map((prospect) => {
    const row = prospectToExportRow(prospect);
    return columns.map((column) => escapeCsv(row[column])).join(",");
  });
  return [header, ...rows].join("\r\n");
}

export function buildJson(prospects) {
  return JSON.stringify(prospects, null, 2);
}

export function getExportFilename(format = "csv", date = new Date()) {
  const stamp = date.toISOString().slice(0, 10);
  const extension = format === "json" ? "json" : "csv";
  return `weblesshunter-prospects-${format}-${stamp}.${extension}`;
}

export function getExportPayload(prospects, format = "csv") {
  if (format === "json") {
    return {
      content: buildJson(prospects),
      mime: "application/json",
      filename: getExportFilename("json")
    };
  }

  if (format === "followup") {
    return {
      content: buildFollowupCsv(prospects),
      mime: "text/csv",
      filename: getExportFilename("followup")
    };
  }

  return {
    content: buildCsv(prospects),
    mime: "text/csv",
    filename: getExportFilename("csv")
  };
}

export function downloadTextFile({ content, mime, filename }) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
