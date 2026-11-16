# UI/UX SPEC — WeblessHunter Chrome Extension
**Gambaran lengkap semua layar dan komponen UI**

---

## Design Language

**Nama tema**: Coastal Professional  
**Konsep**: Clean, trustworthy, dan fokus — seperti tools riset profesional yang nyaman dipakai berjam-jam.  
**Palette**:
- `#81A6C6` — Primary Blue (header, tombol utama, badge aktif)
- `#AACDDC` — Secondary Blue (hover state, border, highlight)
- `#F3E3D0` — Warm Cream (background panel, card background)
- `#D2C4B4` — Muted Taupe (border, divider, teks sekunder)
- `#FFFFFF` — White (input field, card surface)
- `#2C3E50` — Dark Navy (teks utama)
- `#E74C3C` — Danger (status SKIP)
- `#27AE60` — Success (status PROSPEK KUAT)
- `#F39C12` — Warning (status UNCERTAIN)
- `#3498DB` — Info (status PROSPEK)

**Font**: 
- Heading: `'Plus Jakarta Sans'` (Bold 700)
- Body: `'Inter'` (Regular 400, Medium 500)
- Mono: `'JetBrains Mono'` (nomor telp, URL)

---

## Layout Utama Extension

Extension terdiri dari **3 surface** utama:

```
┌─────────────────────────────────────────────────────────┐
│  1. FLOATING TRIGGER BUTTON                             │
│     Muncul di kanan bawah halaman maps.google.com       │
│                                                         │
│  2. SIDE PANEL (utama)                                  │
│     Slide dari kanan, lebar 380px, full height          │
│                                                         │
│  3. POPUP (icon extension diklik)                       │
│     Untuk akses ke Prospek List & Settings              │
└─────────────────────────────────────────────────────────┘
```

---

## Surface 1 — Floating Trigger Button

**Posisi**: Fixed bottom-right di dalam halaman Google Maps  
**Ukuran**: 56px × 56px (circle) → expand saat hover  
**Z-index**: 99999 (di atas semua elemen Maps)

```
┌─────┐
│  🔍 │  ← Icon kaca pembesar
│     │  
└─────┘
 WeblessHunter  ← label muncul saat hover (tooltip)
```

**States**:
- Default: Bulat, warna `#81A6C6`, shadow lembut
- Hover: Expand jadi pill `[🔍 Scan Prospek]`, warna `#6B94B5`
- Scanning: Spin animation + warna amber
- Panel Open: Warna berubah jadi `#2C3E50`, icon ganti `✕`

**Kondisi muncul**:
- Hanya muncul ketika Maps menampilkan hasil pencarian bisnis (bukan saat lihat peta kosong)

---

## Surface 2 — Side Panel

**Lebar**: 380px  
**Tinggi**: 100vh  
**Posisi**: Fixed right: 0  
**Background**: `#F3E3D0`  
**Animasi masuk**: slide-in dari kanan 300ms ease-out  
**Border kiri**: 1px solid `#D2C4B4`  
**Box shadow**: -4px 0 20px rgba(0,0,0,0.1)

### 2.1 Panel Header

```
┌─────────────────────────────────────────────┐
│  🔍 WeblessHunter           [⚙] [✕]         │
│  ─────────────────────────────────────────  │
│  "cafe Palu" · 24 hasil · 18 kandidat       │
│  [████████████████░░░░] Scanning...  (saat) │
└─────────────────────────────────────────────┘
```

- Logo + nama kiri
- Tombol Settings (⚙) dan Close (✕) kanan
- Subtitle: query aktif + jumlah hasil + jumlah kandidat
- Progress bar (hanya saat scanning berlangsung)

**Background Header**: `#81A6C6`  
**Teks Header**: `#FFFFFF`

### 2.2 Tab Bar

```
┌─────────────────────────────────────────────┐
│  [Kandidat (18)]  [Tersimpan (5)]  [Export] │
└─────────────────────────────────────────────┘
```

- Tab aktif: border-bottom 2px `#2C3E50`, font bold
- Tab background: `#F3E3D0`
- Tab border-bottom: 1px solid `#D2C4B4`

### 2.3 Filter Bar

```
┌─────────────────────────────────────────────┐
│  Filter:  [Semua ▾]  [Rating 4+ ▾]  [🔍]  │
└─────────────────────────────────────────────┘
```

- Filter by status (Semua / Prospek Kuat / Prospek / Uncertain)
- Filter by rating (Semua / 4.0+ / 4.5+)
- Search by nama bisnis

**Background**: `#FFFFFF`  
**Border**: 1px solid `#D2C4B4`

### 2.4 Business Card (List Item)

```
┌─────────────────────────────────────────────┐
│  ⭐ 4.6  (124 ulasan)      [PROSPEK KUAT]  │
│                                             │
│  Cafe Tentrem                               │
│  🏷 Kafe                                   │
│  📍 Jl. Basuki Rahmat, Palu                │
│                                             │
│  📱 @cafetentrem_palu                       │
│                                             │
│  [Cek Detail →]              [Simpan ✓]    │
└─────────────────────────────────────────────┘
```

**Card styles**:
- Background: `#FFFFFF`
- Border: 1px solid `#D2C4B4`
- Border-radius: 12px
- Padding: 16px
- Margin: 8px 12px
- Shadow: 0 2px 8px rgba(0,0,0,0.06)

**Status badge colors**:
- `PROSPEK KUAT` 🌟: background `#27AE60`, text white
- `PROSPEK` ✅: background `#81A6C6`, text white
- `UNCERTAIN` ⚠️: background `#F39C12`, text white
- `SKIP` ❌: background `#D2C4B4`, text `#2C3E50`

**Tombol "Cek Detail"**:
- Outline style, border `#81A6C6`, text `#81A6C6`
- Hover: filled `#81A6C6`, text white

**Tombol "Simpan"**:
- Solid `#81A6C6`, text white
- Saat sudah tersimpan: checkmark hijau, disabled

**State sebelum double-check** (status belum diketahui):
- Badge: `[Belum Dicek]` abu-abu
- Tombol "Cek Detail" prominent

### 2.5 Detail View (Expanded / In-Panel)

Saat user klik "Cek Detail", card expand atau panel switch ke view detail:

```
┌─────────────────────────────────────────────┐
│  [← Kembali]                                │
│                                             │
│  Cafe Tentrem                               │
│  Kafe · Palu, Sulawesi Tengah               │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  ⭐ 4.6 · 124 ulasan               │    │
│  │  📍 Jl. Basuki Rahmat No. 5, Palu  │    │
│  │  📞 0813-4567-8901  [Copy]         │    │
│  │  🕐 Buka · 08.00 – 22.00           │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Sosmed:                                    │
│  [📸 Instagram: @cafetentrem_palu →]        │
│                                             │
│  ──── Hasil Validasi ────                   │
│                                             │
│  ✅ Layer 1: Tidak ada website di Maps      │
│  ✅ Layer 2: Bio Instagram tidak ada URL    │
│  ✅ Layer 3: Hanya ditemukan di GoFood      │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  🌟 PROSPEK KUAT                   │    │
│  │  Rating bagus · Sosmed aktif        │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Catatan:                                   │
│  [________________________]                 │
│                                             │
│  [Buka di Maps]  [Skip]  [💾 Simpan]       │
└─────────────────────────────────────────────┘
```

### 2.6 Validation Progress (saat double-check berjalan)

```
┌─────────────────────────────────────────────┐
│  Memvalidasi Cafe Tentrem...                │
│                                             │
│  ✅ Layer 1 — Maps field check              │
│  🔄 Layer 2 — Cek bio Instagram...         │
│  ⏳ Layer 3 — Google Search (menunggu)     │
│                                             │
│  [████████████░░░░░░░░] 60%                │
└─────────────────────────────────────────────┘
```

- Tiap layer punya icon status: ✅ selesai, 🔄 sedang, ⏳ menunggu, ❌ gagal
- Progress bar animated `#81A6C6`
- Estimated time: "~8 detik tersisa"

### 2.7 Tab Tersimpan (Prospek List)

```
┌─────────────────────────────────────────────┐
│  5 Prospek Tersimpan        [Export CSV ↓] │
│  ─────────────────────────────────────────  │
│  Filter: [Semua ▾]  [Sort: Terbaru ▾]     │
│                                             │
│  [card prospek 1...]                        │
│  [card prospek 2...]                        │
│  ...                                        │
│                                             │
│  [Hapus Semua]                              │
└─────────────────────────────────────────────┘
```

---

## Surface 3 — Popup (icon extension diklik)

Ukuran popup: 320px × 420px

```
┌───────────────────────────────────────┐
│  🔍 WeblessHunter            v1.0.0  │
│  by Gimora Digital                   │
│  ─────────────────────────────────── │
│                                       │
│  📊 Statistik Hari Ini               │
│  ┌───────────┬───────────┬─────────┐ │
│  │  Discan   │  Prospek  │ Saved   │ │
│  │    47     │    31     │   8     │ │
│  └───────────┴───────────┴─────────┘ │
│                                       │
│  ─────────────────────────────────── │
│                                       │
│  [📋 Lihat Semua Prospek]            │
│  [📤 Export CSV]                     │
│  [⚙  Pengaturan]                    │
│                                       │
│  ─────────────────────────────────── │
│  Status: Aktif di Google Maps ✅      │
└───────────────────────────────────────┘
```

---

## Surface 4 — Settings Page (tab baru)

```
WeblessHunter — Pengaturan
─────────────────────────────────────────────

Double Check Engine
  [✓] Aktifkan Layer 2 (Cek bio sosmed)
  [✓] Aktifkan Layer 3 (Google Search)
  Timeout per layer: [10] detik

Filter Otomatis
  Rating minimum: [0.0] (0 = tidak filter)
  Minimum ulasan: [0]

Tampilan
  Posisi panel: (•) Kanan  ( ) Kiri
  [ ] Auto-scan saat hasil Maps muncul

Export
  Format default: (•) CSV  ( ) JSON

[Simpan Pengaturan]              [Reset Default]
```

---

## Animasi & Micro-interaction

| Elemen | Animasi |
|---|---|
| Panel buka | slide-in-right 300ms ease-out |
| Panel tutup | slide-out-right 250ms ease-in |
| Card muncul | fade-in + translateY(8px) staggered 50ms |
| Status badge | fade-in scale(0.8→1) 200ms |
| Progress bar | width transition linear |
| Tombol klik | scale(0.97) 100ms |
| Copy telp | Badge "Tersalin!" muncul 2 detik |
| Scan button hover | Expand pill 200ms ease |

---

## Responsive Behavior

Side panel memiliki minimum width 320px dan maximum 420px. Di layar kecil (<768px screen width — laptop kecil), panel menampilkan konten terkondensasi:
- Card bisnis menjadi lebih ringkas (hilangkan deskripsi panjang)
- Detail view menggunakan accordion untuk section validasi

---

## Accessibility

- Semua tombol memiliki `aria-label`
- Status badge memiliki `role="status"`
- Panel dapat ditutup dengan `Escape` key
- Focus trap saat panel terbuka
- Contrast ratio semua teks ≥ 4.5:1 (WCAG AA)
- Loading state memiliki `aria-live="polite"`
