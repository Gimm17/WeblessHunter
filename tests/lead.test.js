import test from "node:test";
import assert from "node:assert/strict";
import { STATUS } from "../utils/constants.js";
import { buildOutreachMessage, getLeadProfile, isHotProspect } from "../utils/lead.js";
import { generateAiDoc, generateAiDocs } from "../engine/ai-doc-generator.js";

test("getLeadProfile scores contact-ready no-website prospects", () => {
  const profile = getLeadProfile({
    status: STATUS.strong,
    business: {
      name: "Kopi Contoh",
      rating: 4.7,
      reviewCount: 40,
      phone: "0812",
      instagram: "https://instagram.com/kopi",
      category: "Cafe"
    },
    validation: {
      layer1: { verdict: "NO_WEBSITE_FIELD" },
      layer3: { verdict: "MARKETPLACE_ONLY" }
    }
  });

  assert.ok(profile.score >= 75);
  assert.equal(profile.confidence, "High");
  assert.equal(profile.contactReady, true);
});

test("isHotProspect rejects skipped website results", () => {
  assert.equal(isHotProspect({
    status: STATUS.skip,
    business: { rating: 5, reviewCount: 100, phone: "0812" },
    validation: { layer1: { verdict: "HAS_WEBSITE" } }
  }), false);
});

test("buildOutreachMessage includes business name and city", () => {
  const message = buildOutreachMessage({
    business: { name: "Kopi Contoh", city: "Palu", rating: 4.8 }
  });
  assert.match(message, /Kopi Contoh/);
  assert.match(message, /Palu/);
});

test("generateAiDocs requires API key", async () => {
  await assert.rejects(
    () => generateAiDocs({ business: { name: "Kopi Contoh" } }, { aiApiKey: "" }),
    /API key AI/
  );
});

test("generateAiDoc requires API key", async () => {
  await assert.rejects(
    () => generateAiDoc({ business: { name: "Kopi Contoh" } }, { aiApiKey: "" }, "prd"),
    /API key AI/
  );
});
