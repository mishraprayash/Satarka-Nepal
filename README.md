# Satarka · सतर्क

> **Nepal Disaster Alerts, Real-Time Hazard Monitoring & Civic Preparedness Platform**

[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-Passed_17%2F17-6E9F18?style=flat-square&logo=vitest)](https://vitest.dev/)
[![i18n](https://img.shields.io/badge/i18n-English_%7C_%E0%A4%A8%E0%A5%87%E0%A4%AA%E0%A4%BE%E0%A4%B2%E0%A5%80-teal?style=flat-square)](#internationalization--accessibility)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

---

## Overview

In Nepal, geohazards and disaster warnings are traditionally scattered across dozens of different government ministries, agencies, languages, and unstructured websites. When extreme rainfall triggers sudden river surges or slope failures, every minute matters.

**Satarka (सतर्क)** is an open-source, civic early-awareness and preparedness aggregator designed specifically for Nepal’s geographic realities. It continuously unifies and normalizes official feeds from hydrology, geology, and meteorological departments into a clean, plain-language interface accessible on mobile and low-bandwidth connections.

> **Important Advisory**: Satarka aggregates open government telemetry to supplement public awareness. It **does not replace** official warnings, sirens, emergency broadcasts, or directives from local authorities, civil protection, and the Nepal Police.

---

## Key Features

### 1. Real-Time Multi-Agency Hazard Ingestion
* **Department of Hydrology & Meteorology (DHM)**: Live river gauge telemetry (water levels, warning thresholds, danger levels, rising/falling trends) and real-time precipitation stations.
* **National Disaster Risk Reduction & Management Authority (NDRRMA BIPAD)**: National incident reporting across all 77 districts, flood warnings, and emergency incident tracking.
* **Department of Roads (DOR)**: Live national highway closures (e.g., Karnali Highway NH58, Koshi Highway) caused by landslides and washouts.
* **USGS Earthquake Hazards Program**: Continuous seismic monitoring in the Nepal bounding box (`26°N–31°N, 80°E–89°E`).
* **GDACS (UN / European Commission)**: Regional multi-hazard flood & tropical storm confirmation layer.
* **ICIMOD**: Comprehensive inventory and monitoring of high-risk glacial lakes across Himalayan river basins.
* **ReliefWeb (UN OCHA)**: Curated humanitarian situation reports and agency briefings.

### 2. Zero-Waterfall Server Hydration & Extreme Performance
* **Instant First Contentful Paint**: Preloads in-memory cached datasets on the server in parallel (`loadAllAlerts`, `loadReports`, `loadMapData`), injecting `initialData` into client hooks.
* **0 Cumulative Layout Shift (CLS = 0)**: Content renders directly in the initial HTML payload without skeleton placeholder flashes.
* **Dynamic Code-Splitting**: Dialog components (`CommandPalette`, `DisclaimerModal`, `AlertDetailModal`, `AlertMiniMap`, and Leaflet) are loaded on-demand via `next/dynamic`.
* **Next-Gen Image Formats**: Automatic AVIF and WebP optimization for photographic guides.

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
  DOR Roadblocks ──► BIPAD Portal ─┼─► [ Next.js Edge / Node API Layer ]
  NDRRMA Incidents ────────────────┤     ├─ Server-side In-Memory SWR Cache
  USGS Earthquake Feed ────────────┤     ├─ Normalized Schema (Zod Validation)
  GDACS / ICIMOD / ReliefWeb ──────┘     ├─ Haversine Spatial Deduplication (<5km)
                                         └─ Severity Rank & Trust Hierarchy
                                                        │
                                                        ▼
                                         [ Server Component Pages ]
                                         (Zero-Waterfall initialData Injection)
                                                        │
                                                        ▼
                                         [ Reactive UI & Leaflet Map ]
```

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

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Run Unit Tests
```bash
npm run test
```

### 5. Build for Production
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
