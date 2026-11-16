import test from "node:test";
import assert from "node:assert/strict";
import { STATUS } from "../utils/constants.js";
import { buildCsv, buildFollowupCsv, escapeCsv } from "../utils/exporter.js";
import { classifyBusiness } from "../engine/classifier.js";
import { runDoubleCheck } from "../engine/double-check.js";

test("classifyBusiness skips when Maps website exists", () => {
  const result = classifyBusiness({}, { verdict: "HAS_WEBSITE", websiteUrl: "https://example.com" }, {}, {});
  assert.equal(result.status, STATUS.skip);
});

test("classifyBusiness returns strong prospect for good rating with social", () => {
  const result = classifyBusiness(
    { rating: 4.6, reviewCount: 20, instagram: "https://instagram.com/kopi" },
    { verdict: "NO_WEBSITE_FIELD" },
    { verdict: "NO_URL_IN_BIO" },
    { verdict: "MARKETPLACE_ONLY" }
  );
  assert.equal(result.status, STATUS.strong);
});

test("runDoubleCheck keeps detected social when website skips layer2", async () => {
  const result = await runDoubleCheck({
    name: "Lucky Cat Coffee",
    website: "https://example.com",
    instagram: "https://instagram.com/luckycatcoffee",
    rating: 4.5,
    reviewCount: 100
  }, {
    enableLayer2: true,
    enableLayer3: true
  });

  assert.equal(result.status, STATUS.skip);
  assert.equal(result.validation.layer2.verdict, "SOCIAL_FOUND_SKIPPED");
  assert.equal(result.validation.layer2.sosmedChecked, "https://instagram.com/luckycatcoffee");
});

test("runDoubleCheck does not report no social when website skips layer2", async () => {
  const result = await runDoubleCheck({
    name: "Website Only Cafe",
    website: "https://example.com"
  }, {
    enableLayer2: true,
    enableLayer3: true
  });

  assert.equal(result.validation.layer2.verdict, "SKIPPED_HAS_WEBSITE");
  assert.equal(result.validation.layer2.sosmedChecked, null);
});

test("escapeCsv quotes commas and double quotes", () => {
  assert.equal(escapeCsv('Cafe "Raisa", Palu'), '"Cafe ""Raisa"", Palu"');
});

test("buildCsv exports expected columns", () => {
  const csv = buildCsv([
    {
      id: "1",
      savedAt: "2026-05-19T00:00:00.000Z",
      status: STATUS.prospect,
      notes: "Follow up",
      business: {
        name: "Kopi Janji Jiwa",
        category: "Cafe",
        rating: 4.5,
        reviewCount: 10,
        address: "Palu",
        city: "Palu",
        phone: "0812",
        website: null,
        instagram: null,
        facebook: null,
        mapsUrl: "https://maps.google.com"
      },
      validation: {
        layer1: { verdict: "NO_WEBSITE_FIELD" },
        layer2: { verdict: "NO_URL_IN_BIO" },
        layer3: { verdict: "MARKETPLACE_ONLY" }
      }
    }
  ]);
  assert.match(csv, /^id,savedAt,status,name/);
  assert.match(csv, /Kopi Janji Jiwa/);
  assert.match(csv, /leadScore,confidence/);
});

test("buildFollowupCsv exports outreach message", () => {
  const csv = buildFollowupCsv([
    {
      status: STATUS.prospect,
      business: {
        name: "Kopi Janji Jiwa",
        city: "Palu",
        phone: "0812",
        rating: 4.5,
        reviewCount: 10,
        mapsUrl: "https://maps.google.com"
      },
      validation: {
        layer1: { verdict: "NO_WEBSITE_FIELD" }
      }
    }
  ]);
  assert.match(csv, /^name,status,leadScore/);
  assert.match(csv, /Kopi Janji Jiwa/);
  assert.match(csv, /website resmi/);
});
