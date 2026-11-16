<div align="center">

# 🎯 WeblessHunter

### Chrome Extension (Manifest V3) for Finding Local Businesses Without Websites on Google Maps

[![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ESM-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/)
[![Tests](https://img.shields.io/badge/Tests-29%20Passing-22C55E?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)

*Automates local business lead discovery directly inside Google Maps — filtering out businesses that already have websites, discovering social media presence, scoring hot prospects, and exporting outreach-ready CSV/JSON lists.*

</div>

---

## ✨ Key Features

- **In-Browser Google Maps Scraping** — Works directly on `maps.google.com` via content scripts (`content/maps-scraper.js`) with zero Google Maps API billing.
- **Multi-Layer Website & Social Detection Engine**
  - `engine/layer1.js`, `layer2.js`, `layer3.js` + `engine/double-check.js` verify whether a business genuinely lacks its own domain vs only having marketplaces or link aggregators (`utils/url-classifier.js`).
  - `engine/social-discovery.js` + `engine/similarity.js` locate and match Instagram/Facebook profiles against business names, phone numbers, and cities.
- **Smart Prospect Scoring & Outreach Prep** — `utils/lead.js` scores contact-ready no-website businesses and `engine/ai-doc-generator.js` / `utils/exporter.js` prepare follow-up messages and CSV exports.
- **Complete Extension UI** — Quick Popup (`popup/`), live Side Panel (`sidepanel/`), and full multi-page workspace (`pages/dashboard.html`, `prospects.html`, `prospect-detail.html`, `settings.html`).

---

## 📁 Project Structure

```text
WeblessHunter/
├── manifest.json            # Chrome Extension Manifest V3 config
├── background/
│   └── service-worker.js    # Background coordinator & state messaging
├── content/
│   ├── maps-scraper.js      # Google Maps DOM extraction
│   └── content.js / .css    # In-page extraction hooks
├── engine/
│   ├── layer1.js / 2 / 3.js # Multi-stage website & search verification
│   ├── classifier.js        # Business prospect classification
│   ├── double-check.js      # Secondary verification pass
│   ├── social-discovery.js  # Instagram / Facebook profile matching
│   ├── similarity.js        # Fuzzy string similarity scoring
│   └── ai-doc-generator.js  # Outreach brief & AI doc generation
├── pages/                   # Dashboard, Prospects, Prospect Detail, Settings
├── popup/ & sidepanel/      # Chrome Action Popup & Side Panel UI
├── utils/                   # Storage, CSV exporter, URL classifier, lead scoring
├── tests/                   # 29 unit tests (node --test)
└── DOCS/                    # PRD, Architecture, ERD, Logic, UI/UX specs
```

---

## 🚀 Setup & Testing

### Run Unit Tests
```bash
npm test
```
Runs Node's built-in test runner (`node --test`) across all 29 tests in `tests/`.

### Load Extension in Chrome
1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select the `WeblessHunter` root folder.
3. Open `https://www.google.com/maps`, search for a local business category, and launch **WeblessHunter** from the extension popup or Side Panel.
