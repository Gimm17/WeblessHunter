# STRUCTURE.md — WeblessHunter Chrome Extension
**Struktur file, manifest, dan panduan build untuk AI Agent**

---

## Struktur Folder

```
webless-hunter/
├── manifest.json
├── package.json               ← (opsional, jika pakai build tool)
│
├── background/
│   └── service-worker.js      ← Background service worker (MV3)
│
├── content/
│   ├── content.js             ← Inject ke maps.google.com
│   ├── content.css            ← Style floating button + overlay
│   └── maps-scraper.js        ← Logic scraping DOM Maps
│
├── sidepanel/
│   ├── panel.html             ← HTML side panel
│   ├── panel.js               ← Logic side panel UI
│   └── panel.css              ← Style side panel
│
├── popup/
│   ├── popup.html             ← Popup saat icon diklik
│   ├── popup.js
│   └── popup.css
│
├── pages/
│   ├── prospects.html         ← Full-page daftar prospek
│   ├── prospects.js
│   ├── settings.html          ← Halaman pengaturan
│   └── settings.js
│
├── engine/
│   ├── double-check.js        ← Orchestrator double-check
│   ├── layer1.js              ← Maps field check
│   ├── layer2.js              ← Sosmed bio scraping
│   ├── layer3.js              ← Google Search validation
│   ├── classifier.js          ← Final status classification
│   └── similarity.js          ← String similarity utility
│
├── utils/
│   ├── storage.js             ← chrome.storage wrapper
│   ├── exporter.js            ← CSV/JSON export
│   ├── url-classifier.js      ← Domain blacklist + classifier
│   ├── uuid.js                ← UUID v4 generator
│   └── helpers.js             ← extractCity, extractUrl, dll
│
└── assets/
    ├── icon16.png
    ├── icon48.png
    ├── icon128.png
    └── fonts/                 ← (jika bundle font lokal)
```

---

## manifest.json (Manifest V3)

```json
{
  "manifest_version": 3,
  "name": "WeblessHunter",
  "version": "1.0.0",
  "description": "Temukan bisnis lokal tanpa website langsung dari Google Maps",
  
  "icons": {
    "16": "assets/icon16.png",
    "48": "assets/icon48.png",
    "128": "assets/icon128.png"
  },
  
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "WeblessHunter"
  },
  
  "side_panel": {
    "default_path": "sidepanel/panel.html"
  },
  
  "background": {
    "service_worker": "background/service-worker.js",
    "type": "module"
  },
  
  "content_scripts": [
    {
      "matches": ["https://maps.google.com/*", "https://www.google.com/maps/*"],
      "js": ["content/maps-scraper.js", "content/content.js"],
      "css": ["content/content.css"],
      "run_at": "document_idle"
    }
  ],
  
  "permissions": [
    "activeTab",
    "scripting",
    "storage",
    "tabs",
    "sidePanel"
  ],
  
  "host_permissions": [
    "https://maps.google.com/*",
    "https://www.google.com/*",
    "https://www.google.co.id/*",
    "https://www.instagram.com/*",
    "https://www.facebook.com/*",
    "https://*/*"
  ],
  
  "web_accessible_resources": [
    {
      "resources": ["sidepanel/*", "pages/*", "assets/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

---

## Message Types (Background ↔ Content ↔ Panel)

Semua komunikasi antar bagian extension menggunakan `chrome.runtime.sendMessage` dan `chrome.tabs.sendMessage` dengan format standar:

```javascript
// Format pesan standar
{
  type: MESSAGE_TYPE,    // string constant
  payload: {}            // data
}
```

### Daftar Message Types

```javascript
// Content Script → Background
'MAPS_RESULTS_READY'      // listing Maps sudah tersedia untuk di-scrape
'REQUEST_SCAN'            // user klik tombol scan
'OPEN_SIDE_PANEL'         // minta buka side panel

// Background → Content Script
'START_SCRAPING'          // instruksi mulai scrape
'SCRAPING_COMPLETE'       // scraping selesai, kirim data ke panel

// Panel → Background
'REQUEST_DOUBLE_CHECK'    // user klik "Cek Detail"
'SAVE_PROSPECT'           // user klik simpan
'DELETE_PROSPECT'         // hapus prospek
'EXPORT_PROSPECTS'        // export CSV
'GET_ALL_PROSPECTS'       // minta semua data prospek

// Background → Panel
'CHECK_PROGRESS'          // update progress bar
'CHECK_COMPLETE'          // double-check selesai
'PROSPECTS_DATA'          // kirim data prospek ke panel
'EXPORT_READY'            // file CSV siap didownload

// Background → Background (internal engine)
'LAYER2_COMPLETE'
'LAYER3_COMPLETE'
```

---

## Alur Inisialisasi Extension

```
1. content.js inject ke maps.google.com
   └── Setup MutationObserver untuk deteksi hasil pencarian
   └── Inject floating trigger button ke DOM Maps

2. User search di Maps → MutationObserver fire
   └── Tampilkan floating button dengan animasi

3. User klik floating button
   └── content.js → sendMessage(OPEN_SIDE_PANEL) → background
   └── background: chrome.sidePanel.open()
   └── panel.html terbuka

4. Panel ready → panel.js kirim REQUEST_SCAN
   └── background instruksikan content.js untuk scrape
   └── content.js jalankan maps-scraper.js
   └── Hasilkan array BusinessDetail[]
   └── Filter yang tidak punya website (Layer 1)
   └── Kirim hasil ke panel

5. Panel tampilkan list kandidat bisnis

6. User klik "Cek Detail" di card bisnis
   └── panel.js → sendMessage(REQUEST_DOUBLE_CHECK, {businessId})
   └── background jalankan double-check.js
   └── Progress dikirim ke panel secara real-time
   └── Setelah selesai, hasil dikirim ke panel

7. Panel update card bisnis dengan status + detail
```

---

## Panduan Implementasi untuk AI Agent

### Prioritas Build (urutan pengerjaan):

**Phase 1 — Foundation**
1. `manifest.json` — setup permission dan entry points
2. `utils/storage.js` — wrapper chrome.storage dengan helper CRUD
3. `utils/helpers.js` — extractCity, extractUrl, generateId
4. `utils/url-classifier.js` — blacklist + classifyUrl()

**Phase 2 — Scraping Core**
5. `content/maps-scraper.js` — DOM scraping Maps dengan fallback selector
6. `content/content.js` — inject floating button + observer
7. `content/content.css` — style floating button

**Phase 3 — Background Engine**
8. `background/service-worker.js` — message handler + tab management
9. `engine/layer1.js` — website field check
10. `engine/similarity.js` — bigram similarity
11. `engine/layer2.js` — sosmed bio scraping via tab
12. `engine/layer3.js` — Google Search + scoring
13. `engine/classifier.js` — final status logic
14. `engine/double-check.js` — orchestrator semua layer

**Phase 4 — UI**
15. `sidepanel/panel.html + panel.css` — layout side panel
16. `sidepanel/panel.js` — logic panel, message listener, render cards
17. `popup/popup.html + popup.js` — popup statistik

**Phase 5 — Polish**
18. `utils/exporter.js` — CSV generation
19. `pages/prospects.html + js` — full-page prospek list
20. `pages/settings.html + js` — halaman pengaturan

---

## Catatan Penting untuk AI Agent

1. **Semua tab background harus ditutup** setelah selesai digunakan (layer2 dan layer3) — gunakan `chrome.tabs.remove(tabId)` di finally block

2. **Gunakan try-catch di semua chrome.scripting.executeScript** — banyak halaman punya CSP yang ketat

3. **MutationObserver di content.js harus di-disconnect** setelah tidak diperlukan untuk menghindari memory leak

4. **chrome.storage.local.get** mengembalikan object kosong jika key belum ada — selalu sediakan default value:
   ```javascript
   const { prospects = [] } = await chrome.storage.local.get('prospects')
   ```

5. **Side panel hanya bisa dibuka via user gesture** di MV3 — pastikan `chrome.sidePanel.open()` dipanggil dari dalam event handler klik

6. **Instagram mungkin return halaman login** jika tidak login — handle dengan cek URL setelah load atau cek title halaman

7. **Google Search bisa trigger CAPTCHA** jika terlalu sering — implementasikan delay antar request (minimum 2 detik)

8. **Selector Maps bisa berubah** — gunakan fungsi `getElement(selectors[])` dengan multiple fallback, jangan hardcode satu selector
