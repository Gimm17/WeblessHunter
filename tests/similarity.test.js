import test from "node:test";
import assert from "node:assert/strict";
import { scoreSearchSnippet, stringSimilarity } from "../engine/similarity.js";

test("stringSimilarity gives higher score for related strings", () => {
  assert.ok(stringSimilarity("Kopi Janji Jiwa", "Kopi Janji Jiwa Palu") > 0.7);
  assert.ok(stringSimilarity("Kopi Janji Jiwa", "Bengkel Motor") < 0.4);
});

test("scoreSearchSnippet scores phone and city matches", () => {
  const result = scoreSearchSnippet(
    {
      title: "Kopi Janji Jiwa Palu",
      snippet: "Hubungi 081234567890 di Palu",
      url: "https://kopijanjijiwa-palu.com"
    },
    {
      name: "Kopi Janji Jiwa",
      phone: "0812-3456-7890",
      city: "Palu"
    }
  );
  assert.ok(result.score >= 60);
});
