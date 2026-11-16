import test from "node:test";
import assert from "node:assert/strict";
import { buildSocialSearchQuery, extractSocialProfilesFromResults } from "../engine/social-discovery.js";

test("buildSocialSearchQuery removes generic Maps listing words", () => {
  const query = buildSocialSearchQuery({
    name: "Coffeeshop/warkop & Workspace to Amor Fati 1"
  }, "Poso");

  assert.equal(query, "coffeeshop warkop workspace to amor fati 1 social media");
});

test("buildSocialSearchQuery uses business name plus social media", () => {
  const query = buildSocialSearchQuery({
    name: "Kimia Farma Apotik",
    category: "Apotek"
  }, "Palu");

  assert.equal(query, "kimia farma apotik social media");
});

test("buildSocialSearchQuery rejects generic Maps heading as business name", () => {
  const query = buildSocialSearchQuery({
    name: "Hasil",
    category: "Apotek"
  }, "Palu");

  assert.equal(query, "");
});

test("extractSocialProfilesFromResults detects matching Instagram profile", () => {
  const candidates = extractSocialProfilesFromResults([
    {
      title: "Amor Fati Kopi Poso (@_amor_fati_kopi)",
      url: "https://www.instagram.com/_amor_fati_kopi/",
      snippet: "4.9K+ followers - Jl. P Bali, Poso Kota"
    },
    {
      title: "Instagram post",
      url: "https://www.instagram.com/p/example/",
      snippet: "Random post"
    },
    {
      title: "Instagram - Login",
      url: "https://www.google.com/url?url=https%3A%2F%2Fwww.instagram.com%2Famor_missing%2F",
      snippet: "Low confidence duplicate"
    }
  ], {
    name: "Coffeeshop/warkop & Workspace to Amor Fati 1",
    city: "Poso"
  });

  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].provider, "instagram");
  assert.equal(candidates[0].url, "https://www.instagram.com/_amor_fati_kopi/");
});

test("extractSocialProfilesFromResults rejects unrelated pharmacy social profile", () => {
  const candidates = extractSocialProfilesFromResults([
    {
      title: "Apotek Mitra Abadi (@apotek.mitraabadi)",
      url: "https://www.instagram.com/apotek.mitraabadi/",
      snippet: "Apotek di Palu, Sulawesi Tengah"
    }
  ], {
    name: "Kimia Farma Apotik",
    category: "Apotek",
    city: "Palu",
    phone: "0811-1067-8245"
  });

  assert.equal(candidates.length, 0);
});

test("extractSocialProfilesFromResults accepts matching multi-platform brand profiles", () => {
  const candidates = extractSocialProfilesFromResults([
    {
      title: "PT Kimia Farma Apotek (@kimiafarmaapotek_id) - Instagram",
      url: "https://www.instagram.com/kimiafarmaapotek_id/",
      snippet: "Akun Resmi Kimia Farma Apotek, solusi kesehatan terpercaya"
    },
    {
      title: "Kimia Farma Apotek (@kimiafarmaapotekid)",
      url: "https://www.facebook.com/kimiafarmaapotekid/",
      snippet: "PT Kimia Farma Apotek bergerak di bidang retail layanan kesehatan"
    },
    {
      title: "Kimia Farma Apotek Official (@kimiafarmaapotek.id)",
      url: "https://www.tiktok.com/@kimiafarmaapotek.id",
      snippet: "Akun resmi PT Kimia Farma Apotek"
    }
  ], {
    name: "Kimia Farma Apotik",
    category: "Apotek",
    city: "Palu"
  });

  assert.equal(candidates.length, 3);
  assert.deepEqual(candidates.map((item) => item.provider), ["instagram", "facebook", "tiktok"]);
});

test("extractSocialProfilesFromResults accepts abbreviated hotel social handle", () => {
  const query = buildSocialSearchQuery({
    name: "Best Western Plus Coco Palu",
    category: "Hotel"
  }, "Palu");

  const candidates = extractSocialProfilesFromResults([
    {
      title: "BW Plus Coco Palu (@bwpluscocopalu) - Instagram",
      url: "https://www.instagram.com/bwpluscocopalu/",
      snippet: "Best Western Plus Coco Palu hotel in Palu, Sulawesi Tengah"
    }
  ], {
    name: "Best Western Plus Coco Palu",
    category: "Hotel",
    city: "Palu"
  });

  assert.equal(query, "best western plus coco palu social media");
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].provider, "instagram");
  assert.equal(candidates[0].url, "https://www.instagram.com/bwpluscocopalu/");
  assert.ok(candidates[0].score >= 60);
});
