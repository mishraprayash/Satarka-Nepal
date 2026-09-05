# Satarka · सतर्क

> **Nepal Disaster Alerts, Real-Time Hazard Monitoring & Civic Preparedness Platform**

[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Tested_with-Vitest-6E9F18?style=flat-square&logo=vitest)](https://vitest.dev/)
[![i18n](https://img.shields.io/badge/i18n-English_%7C_%E0%A4%A8%E0%A5%87%E0%A4%AA%E0%A4%BE%E0%A4%B2%E0%A5%80-teal?style=flat-square)](#internationalization--accessibility)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## Overview

In Nepal, geohazards and disaster warnings are traditionally scattered across dozens of different government ministries, agencies, languages, and unstructured websites. When extreme rainfall triggers sudden river surges or slope failures, every minute matters.

**Satarka (सतर्क)** is an open-source, civic early-awareness and preparedness aggregator designed specifically for Nepal’s geographic realities. It continuously unifies and normalizes official feeds from hydrology, geology, and meteorological departments into a clean, plain-language interface accessible on mobile and low-bandwidth connections.

> **Important Advisory**: Satarka aggregates open government telemetry to supplement public awareness. It **does not replace** official warnings, sirens, emergency broadcasts, or directives from local authorities, civil protection, and the Nepal Police.

---

## Key Features

### 1. Multi-Agency Hazard Ingestion

Every source is labelled by how honest it can be about its own data — `live`, `recent`, `reference`, or `report-only` — and that label is shown to the user. We never dress up a static dataset or a lagging report as a real-time warning.

| Source | What we ingest | Status | Notes |
| :--- | :--- | :--- | :--- |
| **NDRRMA BIPAD** — DHM warnings | Official flood/hydromet + road (DOR) geohazard alerts | `live` | DOR road closures are classified within the BIPAD alert feed, not a separate API. |
| **DHM Riverwatch** (via BIPAD) | River gauge telemetry — level vs. warning/danger thresholds, rising/falling trend | `live` | Sentinel readings (`-9999`, bogus int64 counts) scrubbed. |
| **DHM Rainwatch** (via BIPAD) | Precipitation stations above their warning threshold | `live` | |
| **NDRRMA BIPAD** — incidents | Recent hydromet/geohazard incident reports | `recent` | Lags events by hours to days — labelled as such, not a warning. |
| **USGS Earthquake Hazards Program** | Seismic events in the Nepal bbox (`26°N–31°N, 80°E–89°E`) | `live` | BIPAD's own quake feed is ~1yr stale, so quakes come from USGS. |
| **GDACS (JRC / UN)** | Flood events affecting Nepal | `live` | Secondary cross-check only; earthquakes deliberately left to USGS. |
| **ICIMOD glacial lakes** | High-risk glacial lake inventory | `reference` | Static curated dataset for the map — **not** a live monitoring feed. |
| **ReliefWeb (UN OCHA)** | Humanitarian situation reports | `report-only` | Requires an approved API `appname` (see setup); falls back to a curated link list until one is configured. |

> **GEOGloWS** (15-day streamflow forecast) is wired but intentionally **not registered** until its river-reach IDs are curated by hand — an empty forecast feed would be noise, not honesty.

### 2. Server Hydration & Performance
* **Fast First Contentful Paint**: Server components fetch datasets in parallel (`loadAllAlerts`, `loadReports`, `loadMapData`) and inject `initialData` into the client hooks, so content is present in the initial HTML rather than fetched after hydration.
* **Minimal Layout Shift**: Above-the-fold content renders directly in the initial payload instead of skeleton placeholders that reflow.
* **Dynamic Code-Splitting**: Dialog and map components (`CommandPalette`, `DisclaimerModal`, `AlertDetailModal`, `AlertMiniMap`, and Leaflet) are loaded on-demand via `next/dynamic`.
* **Next-Gen Image Formats**: Automatic AVIF and WebP optimization for photographic guides.
* **Offline last-known snapshot**: When the network drops, `useAlerts` falls back to the last response persisted in `localStorage` and flags it as stale, so the UI shows "last-known from …" rather than pretending it's current. (Note: this is a `localStorage` fallback, not a service worker — the app is installable via `manifest.webmanifest` but does not yet cache assets offline.)

### 3. Geospatial Monitoring Console (`/map`)
* Interactive Leaflet console mapping Nepal's river basins (Koshi, Gandaki/Narayani, Karnali, Mahakali, Bagmati, Babai, West Rapti, Kankai, Mechi, Kamala, Mohana).
* Live station search with instant pan/zoom and danger-threshold filter toggles.
* Dark mode base-map inversion for nighttime outdoor legibility.

### 4. Global Search & Command Palette (`⌘K` / `Ctrl+K`)
* Instant fuzzy search across **all 77 districts of Nepal**, emergency telephone lines (100, 101, 102, 1155, 1234), historical disaster archives, and preparedness guides.

### 5. Context Slide-Over Drawer
* Desktop slide-over context drawer and mobile bottom sheet for viewing station-specific telemetry, threshold ratios, trend vectors, localized coordinates, and direct emergency call buttons.

### 6. Official Safety Advisory Modal
* First-visit onboarding advisory emphasizing obedience to local authorities and civil protection directives.
* Persisted in `localStorage` (`satarka_disclaimer_ack_v1`) and re-openable anytime from the footer or about page.

---

## Architecture & Data Flow

```
[ External Upstream Sources ]
  DHM Hydrology ──► BIPAD Portal ──┐
  DOR Roadblocks ──► BIPAD Portal ─┼─► [ Next.js Node API Layer (/api/*) ]
  NDRRMA Incidents ────────────────┤     ├─ Next.js data cache (per-source revalidate)
  USGS Earthquake Feed ────────────┤     ├─ Per-instance in-memory SWR snapshot
  GDACS ───────────────────────────┘     ├─ Normalized Schema (Zod Validation)
                                         ├─ Haversine Spatial Deduplication (<5 km)
                                         └─ Severity Rank & Source-Trust Hierarchy
                                                        │
                                                        ▼
                                         [ Server Component Pages ]
                                         (initialData injected into client hooks)
                                                        │
                                                        ▼
                                         [ Reactive UI & Leaflet Map ]

  ICIMOD (glacial lakes)  → static reference layer, map only
  ReliefWeb (UN OCHA)     → report-only list, linked out (not in alert stream)
```

Caching runs at two levels: Next.js's own data cache (`export const revalidate` on each route + `next: { revalidate }` per upstream fetch) is the durable, cross-request layer, while a small per-instance in-memory snapshot in `loadAllAlerts` avoids re-running the fan-out and dedup on rapid hits to the same warm server process. The in-memory layer is best-effort and resets on cold starts — it is not relied upon for correctness.

---

## Tech Stack

* **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack)
* **UI Library**: [React 19](https://react.dev/)
* **Language**: [TypeScript](https://www.typescriptlang.org/) (Strict Mode)
* **Data Fetching & Cache**: [TanStack React Query v5](https://tanstack.com/query/latest)
* **Internationalization**: [next-intl](https://next-intl.dev/)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with pure CSS variable tokens
* **Maps**: [Leaflet](https://leafletjs.com/) & [React-Leaflet](https://react-leaflet.js.org/)
* **Schema Validation**: [Zod](https://zod.dev/)
* **Testing**: [Vitest](https://vitest.dev/)

---

## Getting Started

### Prerequisites
* **Node.js**: `v20.x` or higher
* **Package Manager**: `npm` or `pnpm`

### 1. Clone the Repository
```bash
git clone https://github.com/mishraprayash/Satarka-Nepal.git
cd Satarka-Nepal
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment (optional)
All hazard feeds work with zero configuration. The only optional knob is the ReliefWeb situation-reports feed, which needs an approved API `appname`:
```bash
cp .env.example .env.local
# then set RELIEFWEB_APPNAME to a name approved at https://apidoc.reliefweb.int/
```
Without it, the app falls back to a curated list of situation-report links.

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Run Unit Tests
```bash
npm run test
```

### 6. Build for Production
```bash
npm run build
npm run start
```

---

## Emergency Hotlines in Nepal

| Service | Agency | Number |
| :--- | :--- | :--- |
| **Police** | Nepal Police (नेपाल प्रहरी) | `100` |
| **Fire** | Fire Brigade (दमकल) | `101` |
| **Ambulance** | Emergency Medical Service (एम्बुलेन्स) | `102` |
| **Flood Info** | DHM Flood Monitoring Toll-Free | `1155` |
| **Disaster Hotline** | NDRRMA Emergency Helpline | `1234` |

---

## License

This project is licensed under the [MIT License](LICENSE). Public data feeds remain subject to the terms and licensing of their respective issuing agencies (DHM, NDRRMA, USGS, GDACS, ICIMOD, ReliefWeb).
