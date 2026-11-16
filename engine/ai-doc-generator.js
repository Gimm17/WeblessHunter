import { buildOutreachMessage, getLeadProfile } from "../utils/lead.js";
import { AI_MODEL_OPTIONS, DEFAULT_SETTINGS } from "../utils/constants.js";

export const DOC_TYPES = Object.freeze([
  {
    key: "prd",
    filename: "PRD.md",
    title: "PRD",
    instruction: `Kamu adalah Senior Product Manager berpengalaman di bidang web development untuk bisnis lokal Indonesia.
Buat Product Requirements Document (PRD) yang lengkap dan actionable untuk membangun website profesional bisnis ini.
Isi setiap bagian secara SPESIFIK berdasarkan data bisnis yang diberikan - JANGAN generik atau pakai placeholder kosong.

Struktur PRD yang WAJIB ada:

1. Executive Summary
   - Deskripsi singkat bisnis dan konteks lokalnya
   - Alasan konkret mengapa bisnis ini butuh website sekarang
   - Value proposition utama website yang akan dibangun
   - Estimasi target selesai: 4 minggu

2. Target Pengguna Website
   - Definisikan 2-3 persona pengguna yang realistis berdasarkan kategori bisnis ini
   - Tiap persona: nama, usia, kebutuhan utama, device yang dipakai, goals saat buka website

3. Goals & Success Metrics
   - 3-5 business goals spesifik untuk bisnis ini (bukan template generik)
   - 3-5 user goals
   - KPI yang terukur (contoh: click-to-call rate, durasi kunjungan, konversi form)

4. Fitur & Halaman Website
   Tentukan halaman berdasarkan kategori bisnis. Untuk tiap halaman:
   - Nama halaman dan URL slug
   - Tujuan spesifik halaman ini
   - Konten yang HARUS ada (detail, bukan "konten relevan")
   - Fitur interaktif jika ada
   Wajib ada: Home, About, Produk/Menu/Layanan, Kontak.
   Tambahkan halaman lain yang relevan dengan kategori bisnis (Reservasi, Jadwal, Galeri, dll).

5. Functional Requirements
   Format user story: "Sebagai [persona], saya ingin [aksi] agar [manfaat]"
   Minimal 10 user stories relevan. Tandai tiap story: [MUST] [SHOULD] [NICE]

6. Non-Functional Requirements
   - Performance: target Lighthouse score
   - SEO: strategi keyword lokal (nama kategori + nama kota)
   - Mobile-first: mayoritas traffic dari HP
   - Aksesibilitas minimum

7. Integrasi yang Dibutuhkan
   - Google Maps embed (tampilkan lokasi bisnis)
   - WhatsApp Business floating button (pakai nomor telepon bisnis)
   - Instagram feed jika ada akun sosmed
   - Google Analytics / Meta Pixel
   - Integrasi lain yang relevan dengan kategori bisnis

8. Konten yang Perlu Disiapkan Klien
   Checklist konkret: foto apa saja, teks apa saja, data apa saja yang harus dikumpulkan dari pemilik bisnis

9. Out of Scope
   Fitur yang TIDAK dibangun di versi pertama - jelaskan alasannya

10. Timeline & Milestone
    Breakdown per minggu (4 minggu), dengan deliverable spesifik tiap minggu`
  },
  {
    key: "erd",
    filename: "ERD.md",
    title: "ERD",
    instruction: `Kamu adalah Senior Backend Developer spesialis database design untuk website bisnis lokal Indonesia.
Buat Entity Relationship Diagram dan definisi struktur data lengkap untuk website bisnis ini.
Semua keputusan (entitas, kolom, relasi) harus SPESIFIK berdasarkan kategori bisnis yang diberikan - bukan template generik.

Struktur ERD yang WAJIB ada:

1. Overview Database
   - Nama database yang direkomendasikan (slug dari nama bisnis)
   - Engine: MySQL 8.x, charset utf8mb4 (support emoji & bahasa Indonesia)
   - Jumlah total tabel dan ringkasan relasi utama

2. Daftar Entitas & Tabel
   Tabel yang WAJIB ada di semua website: settings, pages, gallery, testimonials, contacts.
   Tambahkan tabel SPESIFIK berdasarkan kategori bisnis:
   - Kafe/Restoran -> categories, menu_items, reservations
   - Klinik/Kesehatan -> doctors, services, appointments, schedules
   - Salon/Kecantikan -> services, staff, bookings, price_list
   - Toko/Retail -> products, product_categories, orders
   - Bisnis Jasa -> services, portfolios, testimonials, bookings
   Sesuaikan dengan kategori bisnis yang diberikan.

3. Definisi Tiap Tabel
   Untuk SETIAP tabel berikan DUA hal:
   a) SQL CREATE TABLE statement lengkap dengan tipe data tepat, PRIMARY KEY, FOREIGN KEY, dan INDEX
   b) Markdown table: | Kolom | Tipe | Null | Default | Keterangan |
   Setiap tabel WAJIB punya: id BIGINT UNSIGNED AUTO_INCREMENT, created_at, updated_at.
   Tambahkan is_active/status untuk manajemen konten, slug untuk tabel yang butuh URL-friendly.

4. Diagram Relasi (Mermaid ERD)
   Gambarkan semua relasi antar tabel dalam format Mermaid:
   \`\`\`mermaid
   erDiagram
     TABLE1 ||--o{ TABLE2 : "relasi"
   \`\`\`

5. Seed Data Contoh
   INSERT data awal yang REALISTIS menggunakan data bisnis yang diberikan:
   - Minimal 3 baris per tabel utama
   - Tabel settings diisi dengan nama bisnis, kota, telepon, jam operasional nyata dari data

6. Query SQL Penting
   Tulis 6-8 query SQL yang paling sering dipakai untuk website ini (bukan query generik)`
  },
  {
    key: "implementationPlan",
    filename: "IMPLEMENTATION_PLAN.md",
    title: "Implementation Plan",
    instruction: `Kamu adalah Lead Full-Stack Developer berpengalaman membangun website bisnis lokal Indonesia.
Buat Implementation Plan yang SANGAT DETAIL dan ACTIONABLE untuk website bisnis ini.
Dokumen ini akan langsung dieksekusi oleh developer atau AI coding agent - setiap bagian harus cukup detail sehingga bisa langsung dikerjakan TANPA perlu menebak-nebak.
Semua konten harus SPESIFIK untuk bisnis yang diberikan, bukan template generik.

BAGIAN 1: TECH STACK & TOOLS
Tentukan stack dengan versi dan alasan pemilihan:
- Backend: Laravel 12 (PHP 8.3+), MySQL 8.x, Laravel Breeze untuk auth admin
- File Storage: Spatie Media Library, Cache & Queue sesuai kebutuhan bisnis
- Frontend Public: pilih antara Blade+Alpine.js ATAU Vue 3+Inertia.js - jelaskan alasan berdasarkan kompleksitas bisnis ini
- Styling: Tailwind CSS v4 + Vite
- Admin Panel: Laravel Filament v3 (jelaskan alasan) atau alternatif
- Deploy: cPanel Shared Hosting, PHP 8.3, SSL Let's Encrypt
- List SEMUA Composer packages yang dibutuhkan (nama + versi)
- List SEMUA npm packages yang dibutuhkan

BAGIAN 2: PROJECT STRUCTURE
Tulis struktur folder LENGKAP dan spesifik:
- List semua Controller (Public/ dan Admin/)
- List semua Model yang dibutuhkan
- List semua Migration file (urut dari tidak dependent ke paling dependent)
- List semua View file (public/ dan admin/)
- List semua Service class jika ada

BAGIAN 3: DATABASE MIGRATIONS (urutan lengkap)
Untuk setiap migration file:
- Nama file lengkap dengan timestamp placeholder
- Kode PHP migration lengkap dengan semua kolom, tipe data Laravel, foreign key constraints

BAGIAN 4: ROUTES DEFINITION
Tulis SEMUA routes dalam kode PHP Laravel lengkap:
- Public routes (semua halaman yang bisa diakses pengunjung)
- Admin routes (dalam prefix 'admin' dengan middleware auth)
- Named routes yang konsisten

BAGIAN 5: DETAIL SETIAP HALAMAN PUBLIK
Untuk SETIAP halaman, berikan spesifikasi LENGKAP:
- URL path dan nama route
- Kode controller method yang lengkap (bukan pseudocode)
- Data yang dikirim ke view (variabel apa, query apa)
- Section dan konten UI yang SPESIFIK untuk bisnis ini (bukan "konten relevan")
- Komponen Alpine.js atau Vue yang dibutuhkan di halaman ini
- SEO tags: title, meta description, JSON-LD structured data (LocalBusiness untuk Home)

BAGIAN 6: MODELS & ELOQUENT
Untuk setiap Model, tulis kode PHP LENGKAP:
- $fillable, $casts, $table
- Semua relationship (hasMany, belongsTo, dll)
- Scope yang berguna (scopeAktif, scopePublished, dll)
- Accessor/mutator jika ada

BAGIAN 7: ADMIN PANEL (Filament Resources)
Untuk setiap resource Filament:
- Nama Resource class
- Form schema: semua field dengan tipe Filament input dan validasi rules
- Table columns yang ditampilkan
- Filter dan search yang tersedia
- Custom actions jika ada (selain CRUD default)

BAGIAN 8: BUSINESS LOGIC KHUSUS
Tulis logic SPESIFIK untuk kategori bisnis yang diberikan - yang tidak ada di website generik.
Contoh: status buka/tutup realtime untuk kafe, booking slot untuk klinik/salon, filter menu/produk.
Tulis dalam kode PHP/Laravel yang siap diimplementasikan, bukan pseudocode.

BAGIAN 9: INTEGRASI EKSTERNAL
Untuk setiap integrasi, berikan code snippet yang siap pakai:
1. Google Maps embed - HTML snippet dengan lokasi bisnis ini
2. WhatsApp floating button - HTML + CSS + JS lengkap dengan nomor telepon bisnis
3. Instagram embed - jika ada akun sosmed di data bisnis
4. JSON-LD LocalBusiness structured data - diisi dengan data nyata bisnis ini
5. Google Analytics GA4 - cara implementasi di Laravel

BAGIAN 10: DEPLOYMENT CHECKLIST (cPanel)
Checklist URUT dan LENGKAP untuk deploy ke shared hosting:
- Pre-deploy (build lokal, set environment production)
- Upload & setup (FTP, document root, .env, database)
- Post-upload via SSH/Terminal (composer install, artisan commands)
- Go-live (testing, SSL, Google Search Console, Google Business Profile)

BAGIAN 11: ESTIMASI WAKTU
Tabel estimasi jam kerja per bagian yang realistis untuk freelancer/agency kecil`
  },
  {
    key: "uiUxPrompt",
    filename: "UI_UX_PROMPT_DESIGN.md",
    title: "UI/UX Prompt Design",
    instruction: `Kamu adalah UI/UX Designer berpengalaman yang mahir membuat design specification untuk Google Stitch.
Buat dokumen DESIGN SPEC yang akan digunakan sebagai prompt di Google Stitch untuk men-generate desain UI/UX website bisnis ini.
Google Stitch men-generate desain dari deskripsi teks - jadi prompt harus visual, panjang, konkret, dan naratif. Bukan kode, bukan wireframe ASCII.
Semua pilihan desain (warna, font, mood, layout) harus SPESIFIK dan TEPAT untuk kategori dan kepribadian bisnis yang diberikan.

BAGIAN 1: DESIGN BRIEF
Tulis 4-6 kalimat ringkasan:
- Bisnis bergerak di bidang apa, di mana, melayani siapa
- Kesan/feeling yang ingin diciptakan saat pengunjung membuka website
- Target audiens dan device yang paling sering dipakai
- Design Direction yang dipilih (pilih SATU yang paling tepat dan jelaskan kenapa):
  Warm & Cozy (kafe, bakery, restoran), Clean & Professional (klinik, kantor, jasa profesional),
  Modern & Bold (barbershop, gym, studio), Natural & Organic (spa, herbal, wellness),
  Elegant & Refined (salon premium, butik, hotel), Fresh & Vibrant (minuman, dessert, anak-anak)

BAGIAN 2: COLOR PALETTE
Tentukan 6 warna yang tepat untuk kategori bisnis ini. Untuk tiap warna berikan:
- Nama Peran: Primary / Secondary / Background / Surface / Text Primary / Accent CTA
- Hex code: #XXXXXX
- Digunakan untuk: deskripsi konkret penggunaannya di website
- Mood: 1-2 kata sifat yang menggambarkan warna ini
Panduan: Kafe -> warm tones (coklat, krem, burnt orange); Klinik -> cool clean (biru muda, mint, putih);
Salon -> elegant (rose gold, dusty pink, charcoal); Barbershop -> masculine (navy, hitam, gold)

BAGIAN 3: TYPOGRAPHY
Pilih font pair dari Google Fonts yang punya karakter kuat - HINDARI Inter, Roboto, Arial, Lato (terlalu generik).
Untuk tiap font berikan:
- Nama font + URL Google Fonts
- Digunakan untuk: heading / body text
- Weight yang dipakai
- Karakter/personality font ini
- Alasan cocok untuk bisnis ini

BAGIAN 4: STITCH SCREEN PROMPTS
BAGIAN TERPENTING. Untuk setiap halaman utama website, tulis Stitch prompt dalam BAHASA INGGRIS.
Minimal 150 kata per screen. Harus visual, naratif, dan sangat deskriptif - seolah kamu mendeskripsikan screenshot desain kepada desainer.

Untuk setiap screen sertakan deskripsi:
- Layout keseluruhan (full-width? card grid? split layout? asymmetric?)
- Navbar: tinggi, background, posisi logo, menu items, CTA button, mobile behavior
- Hero section: layout, teks headline suggestion, subheadline, CTA buttons (bentuk, warna, teks), background treatment (foto/gradient/video), overlay, tinggi
- Setiap section di halaman: nama section, layout, konten, visual treatment
- Card components jika ada: shape, shadow, hover effect, grid columns
- Footer: background, kolom, konten
- Warna dominan di halaman ini
- Mood/feeling yang diinginkan
- Elemen dekoratif (pattern, texture, gradient mesh, geometric shapes)
- Mobile adaptation

Halaman yang WAJIB ada promptnya:
1. Homepage - halaman pertama pengunjung
2. Halaman utama sesuai kategori (Menu/Layanan/Produk/Jadwal - sesuaikan)
3. Halaman Kontak - dengan peta, form, info kontak lengkap
Tambahkan halaman lain jika relevan (About, Booking, Galeri, dll)

BAGIAN 5: COMPONENT STYLE GUIDE
Deskripsikan gaya komponen UI dalam kata-kata (BUKAN kode):
- Navigation Bar: tinggi, background, shadow, logo, menu style, mobile behavior
- Hero Section: layout, gambar treatment, headline style, CTA buttons
- Card Components: border radius, shadow, hover effect, grid layout
- Buttons: Primary (warna, radius, padding, hover), Secondary (outline style), WhatsApp CTA (floating, posisi, animasi)
- Footer: background, layout kolom, konten

BAGIAN 6: MOBILE-FIRST SPEC
Spesifikasi khusus tampilan mobile (375px viewport):
- Navbar: bottom navigation atau hamburger - pilih satu dan deskripsikan
- Hero: tinggi, text alignment, button layout di mobile
- Cards: berapa kolom di mobile
- Typography scale di mobile
- Floating WhatsApp button: posisi, ukuran, z-index, animasi pulse

BAGIAN 7: BRAND KEYWORDS
10 kata sifat yang mendeskripsikan brand bisnis ini untuk panduan tone visual Stitch.

PENTING: Semua Stitch prompts di Bagian 4 WAJIB dalam Bahasa Inggris. Bagian lain boleh Bahasa Indonesia.
Gunakan data nyata bisnis (nama, kota, rating, jam operasional) di dalam Stitch prompts.`
  }
]);

const FALLBACK_MODELS = Object.freeze(AI_MODEL_OPTIONS.map((option) => option.value));

export async function generateAiDocs(prospect = {}, settings = {}) {
  const apiKey = String(settings.aiApiKey || "").trim();
  if (!apiKey) {
    throw new Error("API key AI belum diisi di Pengaturan.");
  }

  const docs = [];
  for (const docType of DOC_TYPES) {
    const content = await generateSingleDoc(docType, prospect, settings, apiKey);
    docs.push({
      type: docType.key,
      filename: buildFilename(prospect, docType.filename),
      title: docType.title,
      content
    });
  }
  return docs;
}

export async function generateAiDoc(prospect = {}, settings = {}, docTypeKey = "prd") {
  const apiKey = String(settings.aiApiKey || "").trim();
  if (!apiKey) {
    throw new Error("API key AI belum diisi di Pengaturan.");
  }

  const docType = DOC_TYPES.find((item) => item.key === docTypeKey);
  if (!docType) throw new Error("Tipe dokumen AI tidak dikenal.");
  const content = await generateSingleDoc(docType, prospect, settings, apiKey);
  return {
    type: docType.key,
    filename: buildFilename(prospect, docType.filename),
    title: docType.title,
    content
  };
}

export async function generateAiDocStream(prospect = {}, settings = {}, docTypeKey = "prd", onChunk = () => {}, options = {}) {
  const apiKey = String(settings.aiApiKey || "").trim();
  if (!apiKey) {
    throw new Error("API key AI belum diisi di Pengaturan.");
  }

  const docType = DOC_TYPES.find((item) => item.key === docTypeKey);
  if (!docType) throw new Error("Tipe dokumen AI tidak dikenal.");
  const content = await generateSingleDocStream(docType, prospect, settings, apiKey, onChunk, options);
  return {
    type: docType.key,
    filename: buildFilename(prospect, docType.filename),
    title: docType.title,
    content
  };
}

async function generateSingleDoc(docType, prospect, settings, apiKey) {
  const models = getModelCandidates(settings.aiModel);
  let lastError = null;

  for (const model of models) {
    try {
      return await requestSingleDoc(docType, prospect, settings, apiKey, model);
    } catch (error) {
      lastError = error;
      if (!isRetryableModelError(error)) break;
    }
  }

  throw new Error(formatAiError(lastError, models));
}

async function generateSingleDocStream(docType, prospect, settings, apiKey, onChunk, options = {}) {
  const models = getModelCandidates(settings.aiModel);
  let lastError = null;

  for (const model of models) {
    try {
      return await requestSingleDocStream(docType, prospect, settings, apiKey, model, onChunk, options);
    } catch (error) {
      lastError = error;
      if (isRetryableModelError(error)) continue;
      if (isStreamingUnsupportedError(error)) {
        return requestSingleDoc(docType, prospect, settings, apiKey, model, options);
      }
      break;
    }
  }

  throw new Error(formatAiError(lastError, models));
}

async function requestSingleDoc(docType, prospect, settings, apiKey, model, options = {}) {
  const response = await fetch(`${normalizeBaseUrl(settings.aiBaseUrl)}/chat/completions`, {
    method: "POST",
    signal: options.signal,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(buildRequestBody(docType, prospect, settings, model))
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || body?.message || `AI request gagal (${response.status})`;
    throw new Error(message);
  }

  const content = body?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("AI tidak mengembalikan konten dokumen.");
  }
  return normalizeMarkdownTitle(content, docType.title);
}

async function requestSingleDocStream(docType, prospect, settings, apiKey, model, onChunk, options = {}) {
  const response = await fetch(`${normalizeBaseUrl(settings.aiBaseUrl)}/chat/completions`, {
    method: "POST",
    signal: options.signal,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      ...buildRequestBody(docType, prospect, settings, model),
      stream: true
    })
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = body?.error?.message || body?.message || `AI request gagal (${response.status})`;
    throw new Error(message);
  }

  if (!response.body?.getReader) {
    throw new Error("Streaming response tidak tersedia dari provider.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      const chunk = parseStreamLine(line);
      if (!chunk) continue;
      content += chunk;
      onChunk(chunk, content);
    }
  }

  if (buffer.trim()) {
    const chunk = parseStreamLine(buffer);
    if (chunk) {
      content += chunk;
      onChunk(chunk, content);
    }
  }

  if (!content.trim()) {
    throw new Error("AI tidak mengembalikan konten dokumen.");
  }

  return normalizeMarkdownTitle(content, docType.title);
}

function parseStreamLine(line) {
  const trimmed = String(line || "").trim();
  if (!trimmed.startsWith("data:")) return "";

  const data = trimmed.replace(/^data:\s*/, "");
  if (!data || data === "[DONE]") return "";

  try {
    const parsed = JSON.parse(data);
    return parsed?.choices?.[0]?.delta?.content
      || parsed?.choices?.[0]?.message?.content
      || "";
  } catch {
    return "";
  }
}

const SYSTEM_PROMPTS = {
  prd: [
    "You are a Senior Product Manager specializing in web projects for Indonesian local businesses.",
    "Write entirely in Indonesian.",
    "Return only valid Markdown - no preamble, no closing remarks, start directly with the document title.",
    "Every section must be specific to the provided business data - no generic templates or empty placeholders.",
    "Mark assumptions explicitly with [ASUMSI] tag when business data is insufficient.",
    "The PRD must be immediately actionable for a freelance web developer or small agency."
  ].join(" "),

  erd: [
    "You are a Senior Backend Developer and database architect specializing in MySQL for Indonesian local business websites.",
    "Write entirely in Indonesian.",
    "Return only valid Markdown - no preamble, start directly with the document title.",
    "Every table, column, and relationship must be specific to the provided business category - not generic.",
    "Always include complete SQL CREATE TABLE statements with proper data types, constraints, and indexes.",
    "Always include Mermaid ERD diagram and realistic seed data using the actual business details provided.",
    "Mark assumptions explicitly with [ASUMSI] tag."
  ].join(" "),

  implementationPlan: [
    "You are a Lead Full-Stack Developer specializing in Laravel + Vue.js + MySQL for Indonesian local business websites.",
    "Write entirely in Indonesian.",
    "Return only valid Markdown - no preamble, start directly with the document title.",
    "Every section must be specific to the provided business - not generic boilerplate.",
    "Write actual PHP/Laravel code for controllers, models, routes, and migrations - not pseudocode.",
    "All Filament resources must include complete form schema and table columns.",
    "Business logic section must contain working PHP code tailored to the business category.",
    "Deployment checklist must target cPanel shared hosting.",
    "Mark assumptions explicitly with [ASUMSI] tag."
  ].join(" "),

  uiUxPrompt: [
    "You are a senior UI/UX Designer specializing in design specifications for Google Stitch.",
    "Write section headers and explanations in Indonesian, but ALL Stitch screen prompts in Bagian 4 MUST be in English.",
    "Return only valid Markdown - no preamble, start directly with the document title.",
    "Every design decision (colors, fonts, mood, layout) must be specific and appropriate for the provided business category.",
    "Stitch prompts must be highly visual, narrative, and descriptive - minimum 150 words each.",
    "Use actual business data (name, city, phone, hours, rating) inside the Stitch prompts.",
    "Never choose generic fonts like Inter, Roboto, Arial, or Lato.",
    "Mark assumptions explicitly with [ASUMSI] tag."
  ].join(" ")
};

const SYSTEM_PROMPT_DEFAULT = [
  "You are a senior product strategist, software architect, and UI/UX designer.",
  "Write in Indonesian.",
  "Return only valid Markdown.",
  "Be specific to the provided local business context.",
  "Do not invent unverifiable facts. Mark assumptions explicitly.",
  "The document must be practical for a freelance/web agency team to implement."
].join(" ");

function buildRequestBody(docType, prospect, settings, model) {
  return {
    model,
    temperature: Number(settings.aiTemperature ?? 0.35),
    max_tokens: Number(settings.aiMaxTokens ?? 8000),
    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPTS[docType.key] || SYSTEM_PROMPT_DEFAULT
      },
      {
        role: "user",
        content: buildPrompt(docType, prospect)
      }
    ]
  };
}

function getModelCandidates(primaryModel) {
  const primary = String(primaryModel || DEFAULT_SETTINGS.aiModel).trim();
  return [...new Set([primary, ...FALLBACK_MODELS])].filter(Boolean);
}

function isRetryableModelError(error) {
  const message = String(error?.message || "");
  return /no available channel|model .*not available|model .*not found|invalid model|provider.*unavailable/i.test(message);
}

function isStreamingUnsupportedError(error) {
  const message = String(error?.message || "");
  return /stream|streaming|sse|readablestream|readable stream/i.test(message);
}

function formatAiError(error, models) {
  const message = String(error?.message || "AI request gagal.");
  if (isRetryableModelError(error)) {
    return `Model AI tidak tersedia untuk akun/group TokenRouter saat ini. Sudah dicoba: ${models.join(", ")}. Detail: ${message}`;
  }
  return message;
}

function buildPrompt(docType, prospect = {}) {
  const business = prospect.business || prospect;
  const validation = prospect.validation || {};
  const leadProfile = getLeadProfile(prospect);
  const context = {
    business: {
      name: business.name || "",
      category: business.category || "",
      rating: business.rating ?? null,
      reviewCount: business.reviewCount ?? 0,
      address: business.address || "",
      city: business.city || "",
      phone: business.phone || "",
      website: business.website || "",
      instagram: business.instagram || "",
      facebook: business.facebook || "",
      tiktok: business.tiktok || "",
      mapsUrl: business.mapsUrl || "",
      hours: business.hours || null
    },
    lead: {
      status: prospect.status || business.status || "",
      score: prospect.leadScore ?? leadProfile.score,
      confidence: prospect.confidence ?? leadProfile.confidence,
      reasons: leadProfile.reasons,
      outreachMessage: buildOutreachMessage(prospect)
    },
    validation: {
      layer1: validation.layer1?.verdict || "",
      layer2: validation.layer2?.verdict || "",
      layer3: validation.layer3?.verdict || "",
      finalVerdict: validation.finalVerdict || ""
    },
    notes: prospect.notes || ""
  };

  const outputRules = {
    prd: [
      "- Mulai langsung dari judul dokumen PRD - tanpa kalimat pembuka atau penutup.",
      "- Gunakan heading ##/### dan bullet list yang rapi.",
      "- Setiap bagian HARUS spesifik: sebut nama bisnis, kota, kategori, dan data nyata dari konteks di dalam isi dokumen.",
      "- User stories menggunakan format: 'Sebagai [persona], saya ingin [aksi] agar [manfaat]' dan ditandai [MUST]/[SHOULD]/[NICE].",
      "- Timeline menggunakan tabel per minggu dengan deliverable konkret.",
      "- Persona pengguna harus realistis sesuai kategori bisnis (bukan persona generik).",
      "- Jika data bisnis tidak lengkap, tandai asumsi dengan [ASUMSI] - jangan mengarang fakta.",
      "- Jangan menyebut API key, TokenRouter, atau instruksi internal."
    ],
    erd: [
      "- Mulai langsung dari judul dokumen ERD - tanpa kalimat pembuka atau penutup.",
      "- Untuk setiap tabel: sertakan SQL CREATE TABLE LENGKAP (tipe data, constraints, index) DAN Markdown table definisi kolom.",
      "- Diagram Mermaid ERD wajib ada dan mencakup semua tabel dengan relasinya.",
      "- Tentukan tabel spesifik sesuai kategori bisnis (bukan hanya tabel generik).",
      "- Seed data harus realistis menggunakan nama bisnis, kota, telepon, dan jam operasional dari konteks JSON.",
      "- Query SQL harus spesifik untuk use case nyata website bisnis ini.",
      "- Jika data tidak lengkap, tandai asumsi dengan [ASUMSI].",
      "- Jangan menyebut API key, TokenRouter, atau instruksi internal."
    ],
    implementationPlan: [
      "- Mulai langsung dari judul dokumen - tanpa kalimat pembuka atau penutup.",
      "- Kode PHP/Laravel di bagian Controller, Model, Routes, dan Migration harus LENGKAP dan siap dieksekusi - bukan pseudocode.",
      "- List SEMUA Composer packages dan npm packages beserta versinya di Bagian Tech Stack.",
      "- Nama class, method, tabel, dan route harus konsisten satu sama lain di seluruh dokumen.",
      "- Bagian Business Logic harus berisi kode PHP yang working dan spesifik untuk kategori bisnis ini.",
      "- Filament Resources harus menyertakan form schema lengkap dengan tipe input dan validasi.",
      "- Deployment checklist harus mencakup langkah via SSH/cPanel Terminal.",
      "- Estimasi waktu harus realistis untuk freelancer atau agency kecil.",
      "- Jika data tidak lengkap, tandai asumsi dengan [ASUMSI].",
      "- Jangan menyebut API key, TokenRouter, atau instruksi internal."
    ],
    uiUxPrompt: [
      "- Mulai langsung dari judul dokumen - tanpa kalimat pembuka atau penutup.",
      "- Bagian 4 (Stitch Screen Prompts) WAJIB ditulis dalam Bahasa Inggris, minimal 150 kata per screen.",
      "- Gunakan nama bisnis, kota, rating, kategori, dan jam operasional dari konteks JSON di dalam Stitch prompts.",
      "- Pilihan font DILARANG menggunakan: Inter, Roboto, Arial, Lato, Open Sans - pilih font Google Fonts dengan karakter kuat.",
      "- Palette warna harus tepat dan spesifik untuk kategori bisnis - bukan palette generik biru-putih.",
      "- Component Style Guide harus deskriptif dalam kata-kata (bukan kode CSS).",
      "- Setiap Stitch prompt harus visual dan naratif - deskripsikan layout, warna, tipografi, komponen, dan mood secara detail.",
      "- Jika data tidak lengkap, tandai asumsi dengan [ASUMSI].",
      "- Jangan menyebut API key, TokenRouter, atau instruksi internal."
    ]
  };
  const rules = outputRules[docType.key] || [
    "- Gunakan heading Markdown yang rapi.",
    "- Buat dokumen detail, terstruktur, dan siap dipakai untuk proyek website.",
    "- Sertakan asumsi jika data belum lengkap.",
    "- Jangan menyebut API key, TokenRouter, atau instruksi internal."
  ];

  return [
    `Tugas: ${docType.instruction}`,
    "",
    "Konteks bisnis lokal (gunakan semua data ini secara spesifik di dalam dokumen yang kamu buat):",
    "```json",
    JSON.stringify(context, null, 2),
    "```",
    "",
    "Ketentuan output:",
    ...rules
  ].join("\n");
}

function normalizeBaseUrl(value) {
  const baseUrl = String(value || "https://api.tokenrouter.com/v1").trim().replace(/\/+$/, "");
  return baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
}

function buildFilename(prospect, filename) {
  const business = prospect.business || prospect;
  const slug = String(business.name || "business")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "business";
  return `${slug}-${filename}`;
}

function normalizeMarkdownTitle(content, title) {
  const text = String(content || "").trim();
  return text.startsWith("#") ? text : `# ${title}\n\n${text}`;
}
