---
name: WeblessHunter Design System
colors:
  surface: '#f7f9ff'
  surface-dim: '#c9dcf3'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf4ff'
  surface-container: '#e3efff'
  surface-container-high: '#d9eaff'
  surface-container-highest: '#d1e4fb'
  on-surface: '#091d2e'
  on-surface-variant: '#42474d'
  inverse-surface: '#203243'
  inverse-on-surface: '#e8f2ff'
  outline: '#72787e'
  outline-variant: '#c2c7ce'
  surface-tint: '#3d627f'
  primary: '#3d627f'
  on-primary: '#ffffff'
  primary-container: '#81a6c6'
  on-primary-container: '#113c57'
  inverse-primary: '#a5cbec'
  secondary: '#426370'
  on-secondary: '#ffffff'
  secondary-container: '#c2e5f5'
  on-secondary-container: '#466774'
  tertiary: '#685d4e'
  on-tertiary: '#ffffff'
  tertiary-container: '#aea08f'
  on-tertiary-container: '#40372a'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cbe6ff'
  primary-fixed-dim: '#a5cbec'
  on-primary-fixed: '#001e30'
  on-primary-fixed-variant: '#234a66'
  secondary-fixed: '#c5e8f7'
  secondary-fixed-dim: '#a9ccdb'
  on-secondary-fixed: '#001f28'
  on-secondary-fixed-variant: '#294b58'
  tertiary-fixed: '#f0e0cd'
  tertiary-fixed-dim: '#d3c4b2'
  on-tertiary-fixed: '#221a0f'
  on-tertiary-fixed-variant: '#4f4537'
  background: '#f7f9ff'
  on-background: '#091d2e'
  surface-variant: '#d1e4fb'
  muted-taupe: '#D2C4B4'
  success-green: '#27AE60'
  warning-amber: '#F39C12'
  info-blue: '#3498DB'
  danger-red: '#E74C3C'
  white-surface: '#FFFFFF'
  subtitle-blue: '#6B94B5'
  text-muted: '#6B7A8D'
typography:
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 24px
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 15px
    fontWeight: '600'
    lineHeight: 20px
  body-regular:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  body-small:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  caption:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
  mono-data:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  button-text:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 16px
  badge-text:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
  panel-width: 380px
  popup-width: 320px
---

## Brand & Style

The design system is engineered for a professional B2B productivity tool aimed at web developers and digital agencies. The brand personality is grounded in reliability, efficiency, and precision. It maintains a **Corporate / Modern** aesthetic that prioritizes functional clarity and data density, ensuring users can quickly parse complex business information without cognitive fatigue.

The visual narrative is defined by a "Soft Professionalism" approach: using a warm, approachable base palette to reduce eye strain during long research sessions, contrasted with sharp, high-contrast technical data points. The interface feels like a specialized instrument—trustworthy, clean, and intentionally structured.

**Design Principles:**
- **Clarity over Decoration:** Every visual element must serve a functional purpose in the lead-generation workflow.
- **Trust through Consistency:** High-quality typography and precise alignment reinforce the accuracy of the underlying data.
- **Efficiency:** Minimize interaction costs through clear visual hierarchy and distinct state indicators.

## Colors

The palette is built on a foundation of **Warm Cream (#F3E3D0)** for primary backgrounds, which provides a sophisticated, paper-like quality that is easier on the eyes than pure white. 

- **Primary Blue (#81A6C6)** serves as the main functional color for primary actions, progress indicators, and active states.
- **Dark Navy (#2C3E50)** is utilized for maximum legibility in headings and primary body text.
- **Status Colors:** A semantic system is used for business validation:
    - **Success Green:** High-intent leads ("Prospek Kuat").
    - **Warning Amber:** Uncertain data or warnings.
    - **Danger Red:** Skip actions or deletions.
    - **Info Blue:** Standard potential leads.
- **Muted Taupe (#D2C4B4)** is the designated color for structural elements like borders and dividers, ensuring they remain subtle and non-distracting.

## Typography

This system uses a three-tier font strategy to separate concerns:
1. **Plus Jakarta Sans:** Used for all brand-facing and structural text including headings, labels, and buttons. Its modern, slightly rounded geometry provides a professional yet contemporary feel.
2. **Inter:** The primary workhorse for UI text, descriptions, and metadata. It is chosen for its exceptional legibility at small sizes (11px–13px).
3. **JetBrains Mono:** Reserved exclusively for technical data points like phone numbers, URLs, and code-like data strings to ensure character distinctness and a "data-rich" utility aesthetic.

**Hierarchy Rules:**
- Use **Bold (700)** only for primary business names and main headers.
- Use **SemiBold (600)** for secondary headers and emphasized metadata.
- Technical data in Mono should always use the primary text color (#2C3E50) to maintain high contrast.

## Layout & Spacing

The layout is designed as a **Fixed Side Panel** (380px wide) for the main extension interface and a **Compact Popup** (320px wide) for quick stats. 

**Spacing Philosophy:**
- The system follows a **4px base unit** (4/8/12/16/20/24).
- **16px (LG)** is the standard container padding for all major views.
- **12px (MD)** is the internal padding for cards and major component groupings.
- **8px (SM)** is used for internal element spacing within cards (e.g., gap between text and buttons).

**Grid Model:**
The side panel uses a single-column vertical stack. Components are fluid within the fixed width of the panel. Elements should be anchored with consistent margins (12px-16px) from the panel edges to prevent visual crowding.

## Elevation & Depth

This design system uses a combination of **Tonal Layers** and **Ambient Shadows** to create a structured hierarchy without looking heavy.

- **Surface Layer:** The base application background uses the Warm Cream (#F3E3D0) color.
- **Object Layer:** All interactive cards and input fields use a White (#FFFFFF) surface. This creates a clear distinction between the "canvas" and the "tools."
- **Borders:** Low-contrast outlines in Muted Taupe (#D2C4B4) are mandatory for all cards and inputs to define boundaries on the light background.
- **Shadows:** 
    - **Standard Card:** `0 2px 8px rgba(0,0,0,0.06)` — A subtle lift to indicate interactivity.
    - **Side Panel:** `-4px 0 20px rgba(0,0,0,0.10)` — Stronger depth to separate the extension from the underlying web content.
    - **Action Buttons:** `0 2px 6px rgba(129,166,198,0.30)` — Tinted shadows using the primary blue to make actions feel "pressed" or "active."

## Shapes

The shape language balances modern softness with professional structure. 
- **Business Cards:** Use a **12px (rounded-lg)** radius to make them feel like distinct, approachable objects.
- **Buttons & Inputs:** Use an **8px (Standard)** radius to maintain a more controlled, professional appearance than the larger cards.
- **Status Badges:** Use a **20px (Pill)** radius to distinguish them from other UI elements and make them instantly recognizable as status indicators.
- **Progress Bars:** Use a **3px (Soft)** radius for a clean, technical look.

## Components

### Buttons
- **Primary:** Solid #81A6C6 with white text. Used for "Save" or main scan triggers.
- **Secondary (Outline):** 1.5px border #81A6C6. Used for "Cek Detail" or secondary navigation.
- **Danger:** Outline #E74C3C for "Skip" or "Delete" actions.
- **Interactions:** On press, buttons should scale to `0.97` for tactile feedback.

### Business Cards
Cards must feature a white background with a 1px #D2C4B4 border and 12px radius. Internal layout follows a 5-row vertical stack:
1. Meta (Rating + Status Badge)
2. Business Name (Heading MD)
3. Category & Location (Body Small)
4. Social Handle (Primary Blue Link)
5. Action Row (Horizontal Button Group)

### Status Badges
Badges are uppercase, bold, 10px Plus Jakarta Sans. 
- **Prospek Kuat:** Green #27AE60
- **Prospek:** Primary Blue #81A6C6
- **Uncertain:** Amber #F39C12
- **Skip:** Muted Taupe background with Dark Navy text.

### Input Fields
White background, 8px radius, 1px taupe border. Focus state requires the border to change to Primary Blue with a subtle 3px glow (`rgba(129, 166, 198, 0.15)`).

### Progress Indicators
The progress track uses #D2C4B4 with a #81A6C6 fill. Validation layers should use icons:
- **Success:** Green CheckCircle.
- **Processing:** Animated Primary Blue Spinner.
- **Pending:** Empty Taupe Circle.