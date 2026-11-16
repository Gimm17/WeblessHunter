# DESIGN.md — WeblessHunter Chrome Extension
**Design spec untuk Google Stitch UI Generation**

---

## Project Overview

**Product name**: WeblessHunter  
**Type**: Chrome Extension Side Panel + Popup  
**Purpose**: Tools untuk freelancer/agency web yang membantu menemukan bisnis lokal tanpa website via Google Maps, dilengkapi double-check otomatis dan export data prospek.  
**Target user**: Web developer, digital agency owner, freelancer IT Indonesia  
**Tone**: Professional, clean, trustworthy — seperti tools riset bisnis yang nyaman dipakai sehari-hari

---

## Color Palette

```
Primary Blue    #81A6C6   — Header, tombol utama, badge aktif, progress bar
Secondary Blue  #AACDDC   — Hover state, border accent, highlight row
Warm Cream      #F3E3D0   — Background panel utama, card background
Muted Taupe     #D2C4B4   — Border, divider, teks placeholder, icon sekunder
White           #FFFFFF   — Surface card, input field, area konten
Dark Navy       #2C3E50   — Teks utama, heading, ikon aktif
Success Green   #27AE60   — Badge PROSPEK KUAT, checkmark tersimpan
Warning Amber   #F39C12   — Badge UNCERTAIN, icon peringatan
Info Blue       #3498DB   — Badge PROSPEK
Danger Red      #E74C3C   — Badge SKIP, tombol hapus
```

---

## Typography

```
Font Family 1: 'Plus Jakarta Sans' — Heading, label, nama bisnis, tombol
Font Family 2: 'Inter' — Body text, deskripsi, meta info
Font Family 3: 'JetBrains Mono' — Nomor telepon, URL, data teknis

Scale:
  Heading Large   : 18px / Bold 700 / Plus Jakarta Sans / #2C3E50
  Heading Medium  : 15px / SemiBold 600 / Plus Jakarta Sans / #2C3E50
  Body Regular    : 13px / Regular 400 / Inter / #2C3E50
  Body Small      : 12px / Regular 400 / Inter / #6B7A8D
  Caption         : 11px / Medium 500 / Inter / #D2C4B4
  Mono            : 12px / Regular 400 / JetBrains Mono / #2C3E50
```

---

## Screen 1 — Side Panel (Main View)

**Dimensions**: 380px wide × 100vh tall  
**Background**: #F3E3D0

### Header Bar
```
Background: #81A6C6
Height: 60px
Padding: 0 16px
Content:
  Left: Icon kaca pembesar (white, 20px) + "WeblessHunter" text (white, Bold 16px, Plus Jakarta Sans)
  Right: Settings icon (white, 18px) + Close icon (white, 18px), gap 12px
Border-bottom: none
Box-shadow: 0 2px 8px rgba(0,0,0,0.15)
```

### Subtitle Bar (di bawah header)
```
Background: #6B94B5 (slightly darker dari primary)
Height: 32px
Padding: 0 16px
Content: 
  Left: '"cafe Palu" · 24 hasil · 18 kandidat' (white, 11px, Inter Regular)
  Right: Status dot hijau + "Scan selesai" atau spinner + "Scanning..."
```

### Tab Navigation
```
Background: #FFFFFF
Height: 44px
Border-bottom: 1px solid #D2C4B4
Tabs:
  - "Kandidat (18)" — Active tab: color #2C3E50, border-bottom 2px solid #81A6C6, Bold
  - "Tersimpan (5)"  — Inactive: color #6B7A8D, no border
  - "Export"         — Right-aligned, color #81A6C6, icon download
Tab padding: 0 16px
Font: 13px Plus Jakarta Sans Medium
```

### Filter Bar
```
Background: #FFFFFF
Height: 40px
Padding: 0 12px
Border-bottom: 1px solid #D2C4B4
Content:
  - Dropdown "Semua Status ▾" : border 1px solid #D2C4B4, radius 6px, 12px font
  - Dropdown "Rating 4+ ▾"    : same style
  - Search icon button        : #81A6C6
Gap between elements: 8px
```

### Business Card (Candidate Item)

```
Background: #FFFFFF
Border-radius: 12px
Border: 1px solid #D2C4B4
Margin: 8px 12px
Padding: 14px
Box-shadow: 0 2px 8px rgba(0,0,0,0.05)

Layout (top to bottom):

ROW 1: [Rating stars ⭐ 4.6 · 124 ulasan] [STATUS BADGE]
  Rating: 12px, Inter Medium, color #F39C12 for star, #2C3E50 for number
  Badge styles per status:
    PROSPEK KUAT : background #27AE60, color white, radius 20px, 10px font, padding 3px 10px
    PROSPEK      : background #81A6C6, color white, radius 20px, 10px font, padding 3px 10px
    UNCERTAIN    : background #F39C12, color white, radius 20px, 10px font, padding 3px 10px
    BELUM DICEK  : background #D2C4B4, color #2C3E50, radius 20px, 10px font, padding 3px 10px

ROW 2: Nama Bisnis
  Font: 15px, Plus Jakarta Sans Bold, color #2C3E50
  Margin-top: 6px

ROW 3: [🏷 tag ikon] Kategori · [📍 pin ikon] Kota
  Font: 12px, Inter Regular, color #6B7A8D
  Icon size: 12px, color #AACDDC
  Margin-top: 4px

ROW 4: [📱 ikon] @instagram_handle (jika ada)
  Font: 12px, Inter Regular, color #81A6C6
  Icon size: 12px
  Margin-top: 4px

ROW 5 (Action Row): [Cek Detail →] [💾 Simpan]
  Margin-top: 12px
  Cek Detail: outline button, border 1.5px solid #81A6C6, color #81A6C6, radius 8px, 12px font, padding 6px 14px
  Simpan: solid button, background #81A6C6, color white, radius 8px, 12px font, padding 6px 14px
  Gap: 8px
```

---

## Screen 2 — Detail View (dalam panel)

**Trigger**: User klik "Cek Detail" pada sebuah bisnis card

```
Background: #F3E3D0
Padding: 16px

HEADER DETAIL:
  [← Kembali] — 13px, color #81A6C6, clickable
  Nama Bisnis — 18px, Plus Jakarta Sans Bold, color #2C3E50, margin-top 12px
  Kategori · Kota — 12px, Inter Regular, color #6B7A8D

INFO CARD:
  Background: #FFFFFF
  Border-radius: 12px
  Border: 1px solid #D2C4B4
  Padding: 14px
  Margin-top: 16px
  
  Rows dalam info card:
    ⭐ 4.6 · 124 ulasan — 13px, icon #F39C12
    📍 Alamat lengkap   — 13px, Inter Regular
    📞 Nomor telp [Copy] — 13px JetBrains Mono + tombol "Copy" kecil, #81A6C6
    🕐 Buka 08.00–22.00 — 13px, color #27AE60 (jika buka), #E74C3C (jika tutup)
  
  Row gap: 10px
  Icon size: 14px, color #AACDDC

SOSMED SECTION:
  Label: "Media Sosial" — 12px, Plus Jakarta Sans SemiBold, color #6B7A8D, margin-top 16px
  Link card Instagram: background #FAFAFA, border 1px solid #D2C4B4, radius 8px, padding 10px
    [📸 ikon] @handle — 13px, color #81A6C6, underline on hover
    Arrow icon → kanan

VALIDATION SECTION:
  Label: "Hasil Validasi" — 12px, Plus Jakarta Sans SemiBold, color #6B7A8D, margin-top 16px
  
  Layer items (vertical list, gap 8px):
    ✅ Layer 1 — Maps field check   : ikon ✅ hijau + teks 13px Inter
    ✅ Layer 2 — Bio Instagram       : ikon ✅ hijau + teks 13px Inter
    ✅ Layer 3 — Google Search       : ikon ✅ hijau + teks 13px Inter
    
    Icon states: ✅ #27AE60, ❌ #E74C3C, 🔄 animated spinner #81A6C6, ⏳ #D2C4B4

STATUS RESULT CARD:
  Margin-top: 16px
  Background gradient per status:
    PROSPEK KUAT: background linear-gradient(135deg, #E8F5E9, #F1F8E9), border-left 4px solid #27AE60
    PROSPEK:      background linear-gradient(135deg, #E3EFF7, #EBF5FB), border-left 4px solid #81A6C6
    UNCERTAIN:    background linear-gradient(135deg, #FEF9E7, #FDEBD0), border-left 4px solid #F39C12
  Border-radius: 10px
  Padding: 14px
  
  Content:
    Status icon + label — Bold 14px Plus Jakarta Sans
    Reason text — 12px Inter Regular, color #6B7A8D, margin-top 4px

NOTES FIELD:
  Label: "Catatan" — 12px Plus Jakarta Sans Medium, margin-top 16px
  Textarea: background white, border 1px solid #D2C4B4, radius 8px, padding 10px, 13px Inter
  Placeholder: "Tambahkan catatan untuk bisnis ini..."
  Min-height: 60px

ACTION BUTTONS:
  Margin-top: 16px
  Layout: 3 button row
  [Buka di Maps] — outline, border #D2C4B4, color #6B7A8D, radius 8px, 12px, padding 8px 12px
  [Skip ✕]       — outline, border #E74C3C, color #E74C3C, radius 8px, 12px, padding 8px 12px  
  [💾 Simpan]    — solid, background #81A6C6, color white, radius 8px, 12px, padding 8px 16px, flex-grow: 1
```

---

## Screen 3 — Validation Progress State

**Trigger**: Saat double-check sedang berjalan (setelah klik "Cek Detail")

```
Background overlay: rgba(243, 227, 208, 0.9) — semi-transparent cream
Content di tengah panel:

BISNIS CARD MINI (collapsed):
  Nama bisnis + kategori saja
  Background white, radius 12px, padding 12px, margin-bottom 16px

PROGRESS SECTION:
  Label: "Memvalidasi bisnis..." — 14px Plus Jakarta Sans SemiBold, color #2C3E50

  Layer Progress Items:
    [✅] Layer 1 — Cek field website di Maps
    [🔄] Layer 2 — Membuka Instagram... (sedang berjalan — spinner animated)
    [⏳] Layer 3 — Google Search (menunggu)
    
    Item layout: icon (20px) + teks (13px Inter) + gap 12px
    Item spacing: 16px
    ✅ = solid circle hijau #27AE60 + checkmark white
    🔄 = spinning circle #81A6C6 (CSS animation rotate 1s linear infinite)
    ⏳ = empty circle outline #D2C4B4

  Progress Bar:
    Margin-top: 20px
    Track: background #D2C4B4, height 6px, radius 3px
    Fill: background #81A6C6, animated width transition
    Below bar: "~8 detik tersisa" — 11px Inter, color #6B7A8D, text-align right

  Cancel button:
    Margin-top: 16px
    Text: "Batalkan"
    Style: text button, color #6B7A8D, underline, 12px
```

---

## Screen 4 — Popup (Icon Extension Diklik)

**Dimensions**: 320px × auto (min 380px)  
**Background**: #F3E3D0

```
HEADER:
  Background: #81A6C6
  Padding: 16px
  Content:
    Left: [🔍] "WeblessHunter" — white, Bold 16px Plus Jakarta Sans
    Right: "v1.0.0" — white, 11px Inter, opacity 0.8

STATS SECTION:
  Background: #FFFFFF
  Margin: 12px
  Border-radius: 12px
  Border: 1px solid #D2C4B4
  Padding: 16px
  
  Label: "Hari Ini" — 11px Plus Jakarta Sans SemiBold, color #6B7A8D, uppercase letter-spacing 0.5px
  
  Stats row (3 columns, equal width):
    [Discan]    [Prospek]   [Tersimpan]
      47            31           8
    
    Number: 24px Plus Jakarta Sans Bold, color #81A6C6
    Label:  11px Inter Regular, color #6B7A8D
    Divider: 1px vertical #D2C4B4

MENU SECTION:
  Margin: 0 12px
  
  Menu items (vertical list):
    [📋] Lihat Semua Prospek  → opens prospects.html in new tab
    [📤] Export CSV           → trigger download
    [⚙]  Pengaturan          → opens settings.html in new tab
    
    Item style:
      Background: #FFFFFF
      Border-radius: 10px
      Border: 1px solid #D2C4B4
      Padding: 14px 16px
      Margin-bottom: 8px
      Display: flex, align-items center, gap 12px
      Icon: 18px, color #81A6C6
      Text: 14px Plus Jakarta Sans Medium, color #2C3E50
      Arrow: → right, color #D2C4B4
      Hover: background #AACDDC20, border-color #AACDDC

STATUS FOOTER:
  Padding: 12px 16px
  Border-top: 1px solid #D2C4B4
  Content: 
    Left: Status indicator dot (8px circle) + teks status
      Aktif: dot #27AE60 + "Aktif di Google Maps"
      Tidak aktif: dot #D2C4B4 + "Buka Google Maps untuk mulai"
    
    Font: 12px Inter Regular, color #6B7A8D
```

---

## Component Library

### Buttons

```
PRIMARY: background #81A6C6, color white, radius 8px, padding 8px 20px, 13px Plus Jakarta Sans Medium
  Hover: background #6B94B5
  Active: scale(0.97)

SECONDARY: background transparent, border 1.5px solid #81A6C6, color #81A6C6, radius 8px, padding 8px 20px
  Hover: background #81A6C620

DANGER: background transparent, border 1.5px solid #E74C3C, color #E74C3C, radius 8px
  Hover: background #E74C3C10

TEXT: no border no background, color #81A6C6, underline on hover
```

### Status Badges

```
Semua badge: radius 20px, padding 3px 10px, font-size 10px, Plus Jakarta Sans Bold, uppercase

PROSPEK KUAT : background #27AE60, color #FFFFFF
PROSPEK      : background #81A6C6, color #FFFFFF
UNCERTAIN    : background #F39C12, color #FFFFFF
SKIP         : background #D2C4B4, color #2C3E50
BELUM DICEK  : background #F3E3D0, color #6B7A8D, border 1px solid #D2C4B4
```

### Input Fields

```
Background: #FFFFFF
Border: 1px solid #D2C4B4
Border-radius: 8px
Padding: 10px 14px
Font: 13px Inter Regular, color #2C3E50
Placeholder: color #D2C4B4

Focus:
  Border-color: #81A6C6
  Box-shadow: 0 0 0 3px rgba(129, 166, 198, 0.15)
  Outline: none
```

### Dividers

```
Horizontal: 1px solid #D2C4B4, margin: 12px 0
Section label above divider: 11px Plus Jakarta Sans SemiBold, color #6B7A8D, uppercase, letter-spacing 0.5px
```

---

## Iconography

Gunakan icon set **Phosphor Icons** atau **Lucide Icons** (outline style, stroke 1.5).

Key icons:
- 🔍 Search / scan → `MagnifyingGlass`
- 📍 Alamat → `MapPin`
- 📞 Telepon → `Phone`
- 🕐 Jam → `Clock`
- 📸 Instagram → `InstagramLogo`
- 👤 Facebook → `FacebookLogo`
- ⭐ Rating → `Star` (filled, #F39C12)
- 💾 Simpan → `FloppyDisk`
- 📤 Export → `Export`
- ⚙ Settings → `Gear`
- ✕ Close → `X`
- ← Back → `ArrowLeft`
- ✅ Check → `CheckCircle` (filled, #27AE60)
- ❌ Skip → `XCircle` (filled, #E74C3C)
- ⚠️ Warning → `Warning` (#F39C12)

---

## Spacing System

```
Base unit: 4px

4px   — XS: icon gap, tight elements
8px   — SM: card internal gap, badge padding
12px  — MD: card padding, section gap
16px  — LG: panel padding, major section gap
20px  — XL: between major sections
24px  — 2XL: section titles margin
```

---

## Shadow System

```
Card shadow     : 0 2px 8px rgba(0,0,0,0.06)
Panel shadow    : -4px 0 20px rgba(0,0,0,0.10)
Button shadow   : 0 2px 6px rgba(129,166,198,0.30)
Floating button : 0 4px 16px rgba(0,0,0,0.15)
```

---

## Animation Spec

```
Panel open    : transform translateX(100%) → translateX(0), duration 300ms, ease-out
Panel close   : transform translateX(0) → translateX(100%), duration 250ms, ease-in
Card appear   : opacity 0 → 1 + translateY(8px) → 0, stagger 50ms per card, duration 200ms
Badge appear  : opacity 0 + scale(0.8) → scale(1), duration 200ms
Progress fill : width transition, duration 400ms, linear
Spinner       : rotate 360deg, duration 1s, linear, infinite
Button press  : scale(0.97), duration 100ms
Copy feedback : "Tersalin!" badge fade-in then fade-out, duration 2s
```

---

## Notes untuk Stitch

- Gunakan color palette persis seperti di atas (`#81A6C6`, `#AACDDC`, `#F3E3D0`, `#D2C4B4`)
- Panel width 380px, bukan full-width — simulasikan sebagai floating panel di sisi kanan layar
- Background belakang panel bisa digambarkan sebagai Google Maps (screenshot/blur)
- Tunjukkan minimal 3–4 business card dalam list view untuk menunjukkan density informasi
- Satu card dalam state "sedang di-check" (dengan progress indicator) untuk menunjukkan interaksi
- Font utama Plus Jakarta Sans + Inter (Google Fonts)
- Corner radius konsisten: card 12px, button 8px, badge 20px
- Desain harus terasa seperti tool produktivitas profesional, bukan consumer app
```
