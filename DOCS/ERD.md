# ERD & DATA STRUCTURE — WeblessHunter
**Storage: chrome.storage.local (tidak ada backend)**

---

## Catatan Arsitektur

WeblessHunter tidak menggunakan database server. Semua data disimpan di `chrome.storage.local` dalam format JSON. Berikut adalah struktur data yang digunakan sebagai pengganti ERD tradisional.

---

## Storage Keys

```
chrome.storage.local
├── "prospects"       → ProspectItem[]
├── "settings"        → UserSettings
└── "scan_history"    → ScanSession[]
```

---

## Struktur Data Lengkap

### 1. ProspectItem

```typescript
interface ProspectItem {
  id: string                    // UUID v4, generated saat save
  savedAt: string               // ISO 8601 datetime
  status: ProspectStatus        // Status klasifikasi akhir
  notes: string                 // Catatan manual user (default: "")
  
  business: BusinessDetail
  validation: ValidationResult
}

type ProspectStatus = 
  | "PROSPEK_KUAT"   // Tidak ada website, rating bagus, punya sosmed
  | "PROSPEK"        // Tidak ada website
  | "UNCERTAIN"      // Tidak yakin, perlu cek manual
  | "SKIP"           // Sudah punya website (jarang di-save, tapi bisa)
```

### 2. BusinessDetail

```typescript
interface BusinessDetail {
  // Identitas
  name: string                  // Nama bisnis
  category: string | null       // Kategori (Kafe, Klinik, dll)
  
  // Reputasi
  rating: number | null         // 1.0 – 5.0
  reviewCount: number           // Jumlah ulasan
  
  // Lokasi & Kontak
  address: string | null        // Alamat lengkap
  city: string | null           // Kota (extracted dari address)
  phone: string | null          // Nomor telepon
  
  // Digital Presence
  website: string | null        // URL website jika ada di Maps
  instagram: string | null      // URL Instagram
  facebook: string | null       // URL Facebook
  tiktok: string | null         // URL TikTok (jika ada)
  
  // Operasional
  hours: OperatingHour[] | null // Jam operasional
  
  // Referensi
  mapsUrl: string               // URL Google Maps bisnis ini
  placeId: string | null        // Google Place ID jika bisa didapat
  
  // Meta
  scrapedAt: string             // ISO 8601 datetime scraping dilakukan
}

interface OperatingHour {
  day: string                   // "Senin", "Selasa", dll
  hours: string                 // "08.00 – 22.00" atau "Tutup"
}
```

### 3. ValidationResult

```typescript
interface ValidationResult {
  completedAt: string           // ISO 8601 datetime validasi selesai
  finalVerdict: FinalVerdict
  
  layer1: Layer1Result
  layer2: Layer2Result
  layer3: Layer3Result
}

type FinalVerdict = "NO_WEBSITE" | "HAS_WEBSITE" | "UNCERTAIN"

interface Layer1Result {
  checked: boolean
  verdict: "NO_WEBSITE_FIELD" | "HAS_WEBSITE"
  websiteUrl: string | null
}

interface Layer2Result {
  checked: boolean
  skipped: boolean              // true jika tidak ada sosmed
  skipReason: string | null     // "NO_SOSMED" | "INACCESSIBLE" | null
  
  sosmedChecked: string | null  // URL sosmed yang dicek
  bioText: string | null        // Teks bio yang ditemukan
  urlsFound: string[]           // Semua URL dalam bio
  
  verdict: 
    | "NO_SOSMED"
    | "NO_URL_IN_BIO"
    | "HAS_OWN_WEBSITE"
    | "HAS_MARKETPLACE_ONLY"
    | "SOSMED_INACCESSIBLE"
  
  websiteUrl: string | null     // URL website jika ditemukan
}

interface Layer3Result {
  checked: boolean
  skipped: boolean
  
  query: string | null          // Query yang digunakan di Google
  resultsFound: number          // Jumlah hasil Google
  
  topResults: GoogleSearchResult[]
  
  verdict:
    | "OWN_WEBSITE_FOUND"
    | "MARKETPLACE_ONLY"
    | "NOT_FOUND"
    | "UNCERTAIN"
    | "CAPTCHA_BLOCKED"
  
  websiteUrl: string | null
  similarityScore: number | null  // 0–100
}

interface GoogleSearchResult {
  title: string
  url: string
  snippet: string
  urlType: "OWN_WEBSITE" | "MARKETPLACE" | "DIRECTORY" | "SOCIAL_MEDIA" | "LINK_AGGREGATOR"
  similarityScore: number | null
}
```

### 4. ScanSession

```typescript
interface ScanSession {
  id: string                    // UUID v4
  startedAt: string             // ISO 8601
  endedAt: string | null
  
  query: string                 // Keyword yang dipakai user di Maps
  location: string | null       // Kota/area dari query
  
  totalScanned: number          // Total listing yang di-scrape
  totalFiltered: number         // Yang lolos filter Layer 1 awal
  totalSaved: number            // Yang di-save user
  
  prospectIds: string[]         // IDs dari ProspectItem yang disave dari sesi ini
}
```

### 5. UserSettings

```typescript
interface UserSettings {
  // Double Check
  enableLayer2: boolean         // Default: true
  enableLayer3: boolean         // Default: true
  layer2Timeout: number         // Default: 10000 (ms)
  layer3Timeout: number         // Default: 10000 (ms)
  
  // Filter Otomatis
  minRating: number             // Default: 0 (tidak filter)
  minReviewCount: number        // Default: 0
  
  // UI
  panelPosition: "right" | "left"  // Default: "right"
  autoScan: boolean             // Default: false
  
  // Export
  exportFormat: "csv" | "json" // Default: "csv"
  
  // Meta
  installedAt: string
  version: string
}
```

---

## Diagram Relasi Data

```
ScanSession (1) ──────────── (N) ProspectItem
    │                               │
    │ prospectIds[]                 │
    │                               ├── BusinessDetail
    │                               │     ├── OperatingHour[]
    │                               │
    │                               └── ValidationResult
    │                                     ├── Layer1Result
    │                                     ├── Layer2Result
    │                                     │     └── GoogleSearchResult[] (jika ada)
    │                                     └── Layer3Result
    │                                           └── GoogleSearchResult[]
    │
UserSettings (singleton)
```

---

## Contoh Data Nyata

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "savedAt": "2026-05-19T10:30:00.000Z",
  "status": "PROSPEK_KUAT",
  "notes": "Buka jam 8, rating bagus, follow up via WA",
  
  "business": {
    "name": "Cafe Tentrem",
    "category": "Kafe",
    "rating": 4.6,
    "reviewCount": 124,
    "address": "Jl. Basuki Rahmat No. 5, Palu, Sulawesi Tengah",
    "city": "Palu",
    "phone": "+62 813-4567-8901",
    "website": null,
    "instagram": "https://www.instagram.com/cafetentrem_palu/",
    "facebook": null,
    "tiktok": null,
    "hours": [
      { "day": "Senin", "hours": "08.00 – 22.00" },
      { "day": "Selasa", "hours": "08.00 – 22.00" }
    ],
    "mapsUrl": "https://maps.google.com/maps/place/Cafe+Tentrem/...",
    "placeId": "ChIJxxxxxxxxxxxxxxxx",
    "scrapedAt": "2026-05-19T10:28:00.000Z"
  },
  
  "validation": {
    "completedAt": "2026-05-19T10:29:45.000Z",
    "finalVerdict": "NO_WEBSITE",
    
    "layer1": {
      "checked": true,
      "verdict": "NO_WEBSITE_FIELD",
      "websiteUrl": null
    },
    
    "layer2": {
      "checked": true,
      "skipped": false,
      "skipReason": null,
      "sosmedChecked": "https://www.instagram.com/cafetentrem_palu/",
      "bioText": "☕ Kafe nyaman di Palu\n📍 Jl. Basuki Rahmat No. 5\n📞 0813-4567-8901\nOrder via WA aja ya!",
      "urlsFound": [],
      "verdict": "NO_URL_IN_BIO",
      "websiteUrl": null
    },
    
    "layer3": {
      "checked": true,
      "skipped": false,
      "query": "\"Cafe Tentrem\" \"Palu\"",
      "resultsFound": 3,
      "topResults": [
        {
          "title": "Cafe Tentrem Palu - GoFood",
          "url": "https://gofood.co.id/palu/restaurant/cafe-tentrem",
          "snippet": "Pesan makanan dari Cafe Tentrem...",
          "urlType": "MARKETPLACE",
          "similarityScore": null
        }
      ],
      "verdict": "MARKETPLACE_ONLY",
      "websiteUrl": null,
      "similarityScore": null
    }
  }
}
```

---

## CSV Export Columns

```
id, savedAt, status, name, category, rating, reviewCount,
address, city, phone, website, instagram, facebook,
layer1Verdict, layer2Verdict, layer3Verdict,
mapsUrl, notes
```
