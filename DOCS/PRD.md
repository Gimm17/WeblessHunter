# PRD — WeblessHunter Chrome Extension
**Product**: WeblessHunter  
**Version**: 1.0 MVP  
**Author**: Gimora Digital  
**Last Updated**: 2026-05-19  

---

## 1. Overview

WeblessHunter adalah Chrome Extension yang bekerja di atas Google Maps untuk membantu web agency / freelancer developer menemukan bisnis lokal yang **belum memiliki website**, kemudian mengumpulkan detail bisnis tersebut secara otomatis sebagai data prospek outreach.

Extension ini **tidak menggunakan Google Maps API** — ia bekerja murni dengan meng-inject content script ke halaman `maps.google.com` yang dibuka user di browser-nya sendiri.

---

## 2. Problem Statement

Freelancer dan agency web (seperti Gimora Digital) menghabiskan waktu berjam-jam secara manual untuk:
1. Browsing Google Maps mencari bisnis UMKM lokal
2. Mengecek satu per satu apakah bisnis tersebut sudah punya website
3. Mencatat nomor telepon, sosmed, alamat secara manual
4. Memvalidasi apakah hasil Google benar-benar website bisnis tersebut

WeblessHunter mengotomasi seluruh proses ini menjadi hitungan menit.

---

## 3. Target User

- Freelancer web developer Indonesia
- Owner agency digital / web agency skala kecil-menengah
- Sales / business development yang prospek klien website
- Mahasiswa IT yang baru mulai freelance

---

## 4. Goals & Success Metrics

| Goal | Metric |
|---|---|
| Hemat waktu prospecting | Dari ~3 jam manual → <30 menit |
| Akurasi deteksi no-website | ≥ 85% precision |
| Data prospek lengkap | Minimal 7 field per bisnis |
| Ekspor data siap pakai | CSV / JSON dalam 1 klik |

---

## 5. Scope MVP

### ✅ IN SCOPE
- Content script inject ke `maps.google.com`
- Scraping listing bisnis dari hasil pencarian Maps
- Filter otomatis bisnis tanpa website (Layer 1)
- Side panel UI untuk menampilkan hasil
- Detail view per bisnis (nama, alamat, telp, rating, kategori, jam buka, sosmed link)
- Double-check engine (Layer 2: sosmed bio + Layer 3: Google Search)
- Status badge per bisnis (PROSPEK KUAT / PROSPEK / UNCERTAIN / SKIP)
- Export hasil ke CSV
- Simpan prospek ke local storage (history)

### ❌ OUT OF SCOPE (v1)
- Backend server / database cloud
- Login / user account
- Integrasi CRM
- Auto-kirim WA/email ke bisnis
- Mobile support
- Support browser selain Chrome

---

## 6. Feature List

### F01 — Maps Listener
- Extension aktif otomatis ketika user membuka `maps.google.com`
- Mendeteksi ketika user melakukan pencarian bisnis
- Menampilkan floating trigger button di pojok kanan bawah Maps

### F02 — Listing Scraper
- Setelah user search di Maps (misal: "cafe Palu"), extension scrape semua hasil listing yang tampil
- Data yang diambil per listing:
  - Nama bisnis
  - Kategori
  - Rating + jumlah review
  - Alamat
  - Apakah ada field "website" di Maps atau tidak (Layer 1 check)
  - Link sosmed jika ada (Instagram / Facebook)
  - Nomor telepon
  - Jam operasional
  - Google Maps URL bisnis tersebut

### F03 — Filter No-Website
- Listing yang sudah memiliki website field di Maps langsung ditandai `SKIP`
- Listing tanpa website field dilanjutkan ke panel sebagai kandidat prospek

### F04 — Side Panel UI
- Panel slide dari kanan layar
- Menampilkan list bisnis hasil filter
- Setiap card bisnis menampilkan: nama, kategori, rating, status badge
- Tombol "Cek Detail" per bisnis untuk trigger double-check

### F05 — Double Check Engine
**Layer 1** (sudah di F03): Cek field website di DOM Maps

**Layer 2 — Sosmed Bio Check**:
- Ambil link Instagram/Facebook dari data Maps bisnis
- Buka tab background (tidak aktif / hidden)
- Scrape bio profile sosmed
- Extract URL dari teks bio menggunakan regex
- Validasi URL: apakah domain sendiri, linktree, atau marketplace
- Tutup tab background setelah selesai

**Layer 3 — Google Search Check**:
- Hanya dijalankan jika Layer 2 tidak konklusif atau tidak ada sosmed
- Buka Google Search: `"[nama bisnis]" "[kota]"`
- Ambil top 5 hasil pencarian
- Untuk setiap hasil, jalankan Website Similarity Scoring:
  - Cek apakah domain masuk blacklist marketplace/direktori → langsung PROSPEK
  - Scrape halaman (jika bukan blacklist): cek nama bisnis, nomor telp, kota
  - Hitung similarity score (0–100)
  - Score ≥ 60 → `OWN_WEBSITE` → SKIP
  - Score 30–59 → `UNCERTAIN`
  - Score < 30 → `NOT_THEIR_WEBSITE` → PROSPEK

### F06 — Status Classification

| Status | Kondisi | Badge Color |
|---|---|---|
| PROSPEK KUAT 🌟 | Tidak ada website, sosmed aktif, rating ≥ 4.0 | Hijau |
| PROSPEK ✅ | Tidak ada website sendiri | Biru |
| UNCERTAIN ⚠️ | Validasi tidak konklusif | Kuning |
| SKIP ❌ | Sudah punya website | Abu |

### F07 — Detail View
Setelah double-check selesai, tampilkan detail card:
- Nama bisnis + kategori
- Rating + jumlah review
- Alamat lengkap
- Nomor telepon (klik-to-copy)
- Jam operasional
- Link sosmed (Instagram / Facebook)
- URL website jika ada (untuk UNCERTAIN)
- Status final + alasan
- Tombol: Simpan ke List / Skip / Buka di Maps

### F08 — Prospek List (History)
- Simpan bisnis yang di-save ke `chrome.storage.local`
- Halaman khusus (popup atau tab baru) untuk melihat semua prospek tersimpan
- Filter by: status, kategori, tanggal
- Hapus individual atau bulk

### F09 — Export
- Export semua prospek tersimpan ke CSV
- Field CSV: Nama, Kategori, Alamat, Kota, Telepon, Rating, Review Count, Instagram, Facebook, Status, Tanggal Disimpan, Maps URL
- Tombol export di panel header

---

## 7. User Flow Utama

```
1. User buka maps.google.com
2. User search "cafe Palu" / "klinik Manado" dll
3. Extension deteksi → floating button muncul "Scan Prospek"
4. User klik → Side panel terbuka
5. Extension scrape semua listing → filter yang tidak punya website
6. Panel tampilkan list kandidat prospek (belum diverifikasi penuh)
7. User klik "Cek Detail" pada salah satu bisnis
8. Double-check engine berjalan (progress indicator)
   a. Cek sosmed bio (jika ada)
   b. Google Search validation
9. Status final muncul + detail lengkap
10. User klik "Simpan ke List"
11. User bisa export CSV kapan saja
```

---

## 8. Edge Cases & Handling

| Case | Handling |
|---|---|
| Instagram private account | Skip Layer 2, lanjut Layer 3 |
| Bisnis tidak punya sosmed | Skip Layer 2, langsung Layer 3 |
| Google Search di-block/captcha | Tandai UNCERTAIN, minta user cek manual |
| Maps update DOM structure | Fallback ke multiple selector, error boundary |
| Website di bio adalah Linktree | Tetap PROSPEK (tidak punya domain sendiri) |
| Website di bio adalah Tokopedia/Shopee | Tetap PROSPEK |
| Nama bisnis sangat umum di Google | Gunakan nama + kota + kategori untuk refine |
| Tab background gagal load | Timeout 10 detik, skip layer tersebut |

---

## 9. Permissions yang Dibutuhkan (manifest.json)

```json
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
  "https://www.instagram.com/*",
  "https://www.facebook.com/*",
  "https://*/*"
]
```

---

## 10. Tech Stack

| Layer | Technology |
|---|---|
| Extension | Chrome Extension Manifest V3 |
| Content Script | Vanilla JavaScript |
| Side Panel | HTML + CSS + Vanilla JS |
| Background | Service Worker (background.js) |
| Storage | chrome.storage.local |
| Export | Client-side CSV generation |
| Scraping | DOM querySelector + MutationObserver |

---

## 11. Non-Functional Requirements

- Extension tidak boleh memperlambat loading Maps secara signifikan
- Double-check per bisnis maksimal 15 detik total
- Tidak ada data yang dikirim ke server eksternal (privacy-first)
- Semua data tersimpan lokal di browser user
- UI harus tidak mengganggu penggunaan Maps normal
