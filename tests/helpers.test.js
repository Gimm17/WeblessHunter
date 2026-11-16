import test from "node:test";
import assert from "node:assert/strict";
import { extractCity, extractUrlsFromText, getBusinessDedupeKey, normalizeUrlKey } from "../utils/helpers.js";

test("extractUrlsFromText normalizes urls from social bios", () => {
  assert.deepEqual(extractUrlsFromText("Order via linktr.ee/kopi and website kopi.example.com."), [
    "https://linktr.ee/kopi",
    "https://kopi.example.com/"
  ]);
});

test("extractCity handles comma separated Indonesian address", () => {
  assert.equal(extractCity("Jl. Basuki Rahmat No. 5, Palu, Sulawesi Tengah"), "Palu");
});

test("normalizeUrlKey removes protocol and trailing slash", () => {
  assert.equal(normalizeUrlKey("https://www.example.com/path/"), "example.com/path");
});

test("getBusinessDedupeKey prefers placeId over mapsUrl", () => {
  assert.equal(getBusinessDedupeKey({ placeId: "abc", mapsUrl: "https://maps.google.com/x" }), "place:abc");
});
