import test from "node:test";
import assert from "node:assert/strict";
import { URL_TYPE } from "../utils/constants.js";
import { classifyUrl, extractRootDomain } from "../utils/url-classifier.js";

test("classifyUrl detects marketplaces", () => {
  assert.equal(classifyUrl("https://gofood.co.id/palu/restaurant/kopi"), URL_TYPE.marketplace);
});

test("classifyUrl detects social media and link aggregators", () => {
  assert.equal(classifyUrl("https://instagram.com/kopi"), URL_TYPE.socialMedia);
  assert.equal(classifyUrl("https://linktr.ee/kopi"), URL_TYPE.linkAggregator);
});

test("classifyUrl treats custom domains as own website", () => {
  assert.equal(classifyUrl("https://kopijanjijiwa-palu.com"), URL_TYPE.ownWebsite);
  assert.equal(classifyUrl("https://www.bestwestern.com/en_US/book/hotel-rooms.99042.html"), URL_TYPE.ownWebsite);
});

test("extractRootDomain strips www", () => {
  assert.equal(extractRootDomain("https://www.example.co.id/page"), "example.co.id");
});
