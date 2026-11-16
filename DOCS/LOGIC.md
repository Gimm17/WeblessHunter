# LOGIC.md — WeblessHunter Double Check Engine
**Detail teknis logic scraping, validasi, dan klasifikasi**

---

## 1. Content Script — Maps DOM Scraping

### 1.1 Kapan Dijalankan
Content script inject ke semua halaman `maps.google.com`. Script menunggu MutationObserver mendeteksi perubahan DOM (saat hasil pencarian muncul).

```javascript
// Deteksi hasil pencarian Maps sudah render
const observer = new MutationObserver((mutations) => {
  const resultsList = document.querySelector('[role="feed"]')
  if (resultsList) {
    observer.disconnect()
    triggerScan()
  }
})
observer.observe(document.body, { childList: true, subtree: true })
```

### 1.2 Scraping Listing dari Hasil Pencarian

Google Maps menampilkan listing dalam container `[role="feed"]`. Setiap item bisnis di-scrape dengan selector berikut (dengan fallback):

```javascript
function scrapeListing(item) {
  return {
    name: item.querySelector('[class*="fontHeadlineSmall"]')?.innerText
       || item.querySelector('h3')?.innerText
       || null,

    category: item.querySelector('[class*="fontBodyMedium"] > span:first-child')?.innerText
            || null,

    rating: parseFloat(
      item.querySelector('[class*="fontBodyMedium"] > span[aria-label*="bintang"]')
        ?.getAttribute('aria-label')?.match(/[\d.]+/)?.[0]
    ) || null,

    reviewCount: parseInt(
      item.querySelector('[class*="fontBodyMedium"] span[aria-label*="ulasan"]')
        ?.innerText?.replace(/\D/g, '')
    ) || 0,

    mapsUrl: item.querySelector('a[href*="/maps/place/"]')?.href || null,
  }
}
```

### 1.3 Scraping Detail Bisnis (saat panel bisnis dibuka di Maps)

Saat user klik sebuah listing di Maps, panel detail terbuka di kiri. Script membaca panel ini:

```javascript
function scrapeBusinessDetail() {
  return {
    name: document.querySelector('h1[class*="fontHeadlineLarge"]')?.innerText,
    
    address: document.querySelector('[data-item-id="address"] .fontBodyMedium')?.innerText,
    
    phone: document.querySelector('[data-item-id^="phone:tel:"] .fontBodyMedium')?.innerText,
    
    website: document.querySelector('[data-item-id="authority"] .fontBodyMedium')?.innerText || null,
    // null = tidak ada website
    
    instagram: extractSosmedUrl('instagram.com'),
    facebook: extractSosmedUrl('facebook.com'),
    
    hours: scrapeOpeningHours(),
    
    category: document.querySelector('[jsaction*="category"] button')?.innerText,
  }
}

function extractSosmedUrl(domain) {
  const links = document.querySelectorAll(`a[href*="${domain}"]`)
  return links.length > 0 ? links[0].href : null
}

function scrapeOpeningHours() {
  const hoursTable = document.querySelector('[data-hide-tooltip-on-mouse-leave] table')
  if (!hoursTable) return null
  const rows = hoursTable.querySelectorAll('tr')
  return Array.from(rows).map(row => ({
    day: row.querySelector('td:first-child')?.innerText,
    hours: row.querySelector('td:last-child')?.innerText,
  }))
}
```

---

## 2. Layer 1 — Website Field Check (Maps DOM)

```javascript
function layer1Check(businessDetail) {
  if (businessDetail.website && businessDetail.website.trim() !== '') {
    return {
      hasWebsite: true,
      source: 'maps_field',
      url: businessDetail.website,
      verdict: 'SKIP'
    }
  }
  return { hasWebsite: false, verdict: 'CONTINUE_LAYER2' }
}
```

---

## 3. Layer 2 — Sosmed Bio Check

### 3.1 Flow

```
Ada link Instagram/Facebook di Maps?
  YES → Buka tab background → Scrape bio → Extract URL
  NO  → Skip ke Layer 3
```

### 3.2 Buka Tab Background & Scrape

```javascript
async function layer2Check(businessDetail) {
  const sosmedUrl = businessDetail.instagram || businessDetail.facebook
  if (!sosmedUrl) return { verdict: 'NO_SOSMED', continue: true }

  // Buka tab background (tidak aktif)
  const tab = await chrome.tabs.create({ url: sosmedUrl, active: false })

  // Tunggu tab selesai load (max 10 detik)
  await waitForTabLoad(tab.id, 10000)

  let bioText = ''

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractBioFromPage,
    })
    bioText = results[0]?.result || ''
  } catch (e) {
    // Gagal scrape (private/block)
    await chrome.tabs.remove(tab.id)
    return { verdict: 'SOSMED_INACCESSIBLE', continue: true }
  }

  await chrome.tabs.remove(tab.id)

  // Extract semua URL dari bio
  const urls = extractUrlsFromText(bioText)
  if (urls.length === 0) return { verdict: 'NO_URL_IN_BIO', continue: true }

  // Validasi setiap URL
  for (const url of urls) {
    const urlVerdict = classifyUrl(url)
    if (urlVerdict === 'OWN_WEBSITE') {
      return { hasWebsite: true, url, source: 'sosmed_bio', verdict: 'SKIP' }
    }
    // Linktree, Tokopedia, dll → lanjut, tetap prospek
  }

  return { verdict: 'NO_OWN_WEBSITE_IN_BIO', continue: true }
}
```

### 3.3 Extract Bio dari Halaman Sosmed

```javascript
// Dijalankan di dalam tab sosmed via executeScript
function extractBioFromPage() {
  // Instagram
  const igBio = document.querySelector('meta[name="description"]')?.content
    || document.querySelector('.-vDIg span')?.innerText
    || document.querySelector('h1 + div span')?.innerText
    || ''

  // Facebook
  const fbBio = document.querySelector('[data-key="intro_card_bio"]')?.innerText
    || document.querySelector('[class*="profileAboutSection"] span')?.innerText
    || ''

  return igBio || fbBio || document.querySelector('meta[property="og:description"]')?.content || ''
}
```

### 3.4 Extract URL dari Teks Bio

```javascript
function extractUrlsFromText(text) {
  const urlRegex = /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+(?:\/[^\s]*)?)/g
  const matches = text.match(urlRegex) || []
  return matches.map(url => url.startsWith('http') ? url : `https://${url}`)
}
```

### 3.5 Klasifikasi URL

```javascript
const MARKETPLACE_DOMAINS = [
  'tokopedia.com', 'shopee.co.id', 'shopee.com',
  'gofood.co.id', 'grabfood.com', 'traveloka.com',
  'tiket.com', 'bukalapak.com', 'blibli.com',
  'lazada.co.id', 'zalora.co.id', 'jd.id',
]

const DIRECTORY_DOMAINS = [
  'facebook.com', 'instagram.com', 'tiktok.com',
  'twitter.com', 'x.com', 'youtube.com',
  'google.com', 'maps.google.com',
  'yellowpages.co.id', 'qraved.com',
  'zomato.com', 'tripadvisor.com',
]

const LINK_AGGREGATOR_DOMAINS = [
  'linktree.com', 'linktr.ee', 'bio.link',
  'beacons.ai', 'campsite.bio', 'heylink.me',
]

function classifyUrl(url) {
  const domain = extractRootDomain(url)

  if (MARKETPLACE_DOMAINS.some(d => domain.includes(d))) return 'MARKETPLACE'
  if (DIRECTORY_DOMAINS.some(d => domain.includes(d))) return 'SOCIAL_MEDIA'
  if (LINK_AGGREGATOR_DOMAINS.some(d => domain.includes(d))) return 'LINK_AGGREGATOR'

  // Semua selain itu dianggap website sendiri
  return 'OWN_WEBSITE'
}

function extractRootDomain(url) {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url.toLowerCase()
  }
}
```

---

## 4. Layer 3 — Google Search Validation

### 4.1 Flow

```
Buka Google Search: "[nama bisnis] [kota]"
  → Scrape top 5 hasil
  → Untuk tiap hasil: classifyUrl()
    → MARKETPLACE/DIRECTORY → lanjut (masih PROSPEK)
    → Domain baru → Website Similarity Scoring
      → Score ≥ 60 → OWN_WEBSITE → SKIP
      → Score 30-59 → UNCERTAIN
      → Score < 30 → NOT_THEIR_WEBSITE → PROSPEK
  → Tidak ada hasil konklusif → PROSPEK KUAT
```

### 4.2 Google Search Scraping

```javascript
async function layer3Check(businessDetail) {
  const { name, address, phone } = businessDetail
  const city = extractCity(address)
  const query = `"${name}" "${city}"`

  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=5`
  const tab = await chrome.tabs.create({ url: searchUrl, active: false })

  await waitForTabLoad(tab.id, 10000)

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: scrapeGoogleResults,
  })

  await chrome.tabs.remove(tab.id)

  const searchResults = results[0]?.result || []
  if (searchResults.length === 0) {
    return { verdict: 'PROSPEK_KUAT', reason: 'Tidak ditemukan di Google' }
  }

  return await validateSearchResults(searchResults, businessDetail)
}

// Dijalankan di dalam tab Google Search
function scrapeGoogleResults() {
  const items = document.querySelectorAll('#search .g')
  return Array.from(items).slice(0, 5).map(item => ({
    title: item.querySelector('h3')?.innerText || '',
    url: item.querySelector('a')?.href || '',
    snippet: item.querySelector('.VwiC3b')?.innerText || '',
  }))
}
```

### 4.3 Website Similarity Scoring

```javascript
async function scoreWebsite(searchResult, businessDetail) {
  const { url, title, snippet } = searchResult
  const { name, phone, address } = businessDetail
  const city = extractCity(address)

  const urlType = classifyUrl(url)
  if (urlType !== 'OWN_WEBSITE') return { score: 0, verdict: urlType }

  // Cek dari title + snippet dulu (tanpa buka halaman)
  let score = 0
  const combined = (title + ' ' + snippet).toLowerCase()

  if (stringSimilarity(name.toLowerCase(), combined) > 0.5) score += 25
  if (phone && combined.includes(phone.replace(/\D/g, '').slice(-8))) score += 30
  if (city && combined.toLowerCase().includes(city.toLowerCase())) score += 15

  // Jika score sudah ≥ 60 dari snippet → langsung verdict
  if (score >= 60) return { score, verdict: 'OWN_WEBSITE', url }
  if (score >= 30) {
    // Buka halaman untuk konfirmasi lebih lanjut
    const pageText = await fetchPageText(url)
    if (pageText) {
      if (stringSimilarity(name.toLowerCase(), pageText.toLowerCase()) > 0.6) score += 20
      if (phone && pageText.includes(phone.replace(/\D/g, '').slice(-8))) score += 15
    }
  }

  if (score >= 60) return { score, verdict: 'OWN_WEBSITE', url }
  if (score >= 30) return { score, verdict: 'UNCERTAIN', url }
  return { score, verdict: 'NOT_THEIR_WEBSITE' }
}
```

### 4.4 String Similarity (Simple)

```javascript
function stringSimilarity(str1, str2) {
  // Bigram similarity sederhana
  const getBigrams = s => {
    const bigrams = new Set()
    for (let i = 0; i < s.length - 1; i++) bigrams.add(s.slice(i, i + 2))
    return bigrams
  }
  const a = getBigrams(str1)
  const b = getBigrams(str2)
  const intersection = [...a].filter(x => b.has(x)).length
  return (2 * intersection) / (a.size + b.size)
}
```

---

## 5. Final Classification

```javascript
function classifyBusiness(businessDetail, layer1, layer2, layer3) {
  // Layer 1: Sudah punya website di Maps
  if (layer1.verdict === 'SKIP') {
    return { status: 'SKIP', reason: 'Punya website di Maps', url: layer1.url }
  }

  // Layer 2: Ada website di bio sosmed
  if (layer2.verdict === 'SKIP') {
    return { status: 'SKIP', reason: 'Ada website di bio sosmed', url: layer2.url }
  }

  // Layer 3: Website ditemukan di Google
  if (layer3.verdict === 'OWN_WEBSITE') {
    return { status: 'SKIP', reason: 'Website ditemukan di Google', url: layer3.url }
  }

  if (layer3.verdict === 'UNCERTAIN') {
    return { status: 'UNCERTAIN', reason: 'Mungkin punya website, perlu cek manual', url: layer3.url }
  }

  // Tidak ada website → tentukan kekuatan prospek
  const rating = businessDetail.rating || 0
  const reviewCount = businessDetail.reviewCount || 0
  const hasSosmed = !!(businessDetail.instagram || businessDetail.facebook)

  const isStrong = rating >= 4.0 && reviewCount >= 10 && hasSosmed
  
  return {
    status: isStrong ? 'PROSPEK_KUAT' : 'PROSPEK',
    reason: isStrong
      ? `Rating ${rating} ⭐ · ${reviewCount} ulasan · Punya sosmed aktif`
      : 'Tidak ditemukan website sendiri',
  }
}
```

---

## 6. Storage Schema (chrome.storage.local)

```javascript
// Key: "prospects"
// Value: array of ProspectItem

{
  prospects: [
    {
      id: "uuid-v4",
      savedAt: "2026-05-19T10:30:00Z",
      status: "PROSPEK_KUAT", // PROSPEK_KUAT | PROSPEK | UNCERTAIN | SKIP
      
      business: {
        name: "Cafe Raisa",
        category: "Kafe",
        rating: 4.5,
        reviewCount: 87,
        address: "Jl. Diponegoro No. 12, Palu, Sulawesi Tengah",
        city: "Palu",
        phone: "+62 812-3456-7890",
        website: null,
        instagram: "https://instagram.com/caferaisa_palu",
        facebook: null,
        mapsUrl: "https://maps.google.com/maps/place/...",
        hours: [
          { day: "Senin", hours: "08.00 – 22.00" },
          // ...
        ]
      },
      
      validation: {
        layer1: { checked: true, verdict: "NO_WEBSITE" },
        layer2: { checked: true, verdict: "NO_URL_IN_BIO" },
        layer3: { checked: true, verdict: "NOT_THEIR_WEBSITE" }
      },
      
      notes: "" // user bisa tambah catatan manual
    }
  ]
}
```

---

## 7. Message Passing (Content Script ↔ Background ↔ Side Panel)

```javascript
// Content Script → Background: minta buka tab background
chrome.runtime.sendMessage({
  type: 'OPEN_BG_TAB',
  url: 'https://instagram.com/caferaisa_palu'
})

// Background → Side Panel: update progress
chrome.runtime.sendMessage({
  type: 'CHECK_PROGRESS',
  step: 'layer2',
  status: 'running',
  businessId: 'uuid'
})

// Background → Side Panel: hasil akhir
chrome.runtime.sendMessage({
  type: 'CHECK_COMPLETE',
  businessId: 'uuid',
  result: { status: 'PROSPEK_KUAT', ... }
})
```

---

## 8. Error Handling

| Kondisi | Handling |
|---|---|
| Tab background gagal load | Timeout 10 detik → skip layer, lanjut layer berikutnya |
| Instagram return login wall | Coba ambil meta og:description → jika gagal, skip |
| Google Search return CAPTCHA | Deteksi judul "unusual traffic" → tandai UNCERTAIN |
| Maps DOM tidak ditemukan | Retry 3x dengan interval 500ms → jika tetap gagal, tampilkan error |
| chrome.scripting gagal (CSP) | Catch error → skip layer tersebut |
| Semua layer gagal | Default ke UNCERTAIN dengan note "Validasi manual diperlukan" |

---

## 9. Selector Fallback Strategy

Karena Google Maps sering update DOM, setiap selector menggunakan strategi fallback:

```javascript
function getElement(selectors, context = document) {
  for (const selector of selectors) {
    const el = context.querySelector(selector)
    if (el) return el
  }
  return null
}

// Contoh penggunaan:
const nameEl = getElement([
  'h1[class*="fontHeadlineLarge"]',   // Primary
  'h1[jstcache]',                      // Fallback 1
  '[data-attrid="title"] h1',          // Fallback 2
  '.section-hero-header-title',        // Fallback 3 (legacy)
])
```

---

## 10. Timing & Performance

| Operasi | Target Waktu |
|---|---|
| Scrape listing halaman Maps | < 1 detik |
| Layer 1 check | < 100ms |
| Layer 2 (buka + scrape sosmed) | 3 – 8 detik |
| Layer 3 (Google Search) | 3 – 8 detik |
| Total double-check per bisnis | < 15 detik |
| Export CSV (100 item) | < 500ms |
