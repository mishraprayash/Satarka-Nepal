/**
 * Seismic context for the map: the plate-boundary trace and two historical
 * rupture areas. These are SIMPLIFIED, for orientation — not a fault model and
 * not a forecast. Labelled as such in the UI.
 */

export interface SeismicFeature {
  id: string;
  name: string;
  nameNe?: string;
  kind: "thrust" | "rupture";
  /** Line or polygon ring, [lng, lat]. */
  points: [number, number][];
  note: { en: string; ne?: string };
}

export const SEISMIC: SeismicFeature[] = [
  {
    id: "mht",
    name: "Main Himalayan Thrust",
    nameNe: "मुख्य हिमालयी थ्रस्ट",
    kind: "thrust",
    points: [
      [80.35, 29.85],
      [80.9, 29.5],
      [81.6, 29.35],
      [82.2, 29.2],
      [82.9, 29.15],
      [83.6, 28.95],
      [84.2, 28.75],
      [84.9, 28.55],
      [85.6, 28.3],
      [86.2, 28.05],
      [86.9, 27.8],
      [87.6, 27.6],
      [88.1, 27.35],
    ],
    note: {
      en: "Plate boundary where the Indian plate underthrusts Tibet. Simplified trace — the source zone for Nepal's large earthquakes.",
      ne: "भारतीय प्लेट तिब्बतमुनि छिर्ने प्लेट सीमा। सरलीकृत रेखा — नेपालका ठूला भूकम्पहरूको स्रोत क्षेत्र।",
    },
  },
  {
    id: "gorkha-2015",
    name: "Gorkha earthquake rupture (2015, Mw 7.8)",
    nameNe: "गोर्खा भूकम्प भत्किएको क्षेत्र (२०१५, Mw ७.८)",
    kind: "rupture",
    points: [
      [84.2, 28.4],
      [84.9, 28.6],
      [85.8, 28.5],
      [86.5, 28.0],
      [86.3, 27.6],
      [85.6, 27.3],
      [84.9, 27.4],
      [84.3, 27.7],
      [84.1, 28.1],
      [84.2, 28.4],
    ],
    note: {
      en: "Approximate footprint of the 25 April 2015 rupture zone (USGS).",
      ne: "२५ अप्रिल २०१५ को भूकम्पको भत्किएको क्षेत्रको अनुमानित क्षेत्र (USGS)।",
    },
  },
  {
    id: "nepal-bihar-1934",
    name: "Nepal–Bihar earthquake rupture (1934, Mw 8.1)",
    nameNe: "नेपाल–बिहार भूकम्प भत्किएको क्षेत्र (१९३४, Mw ८.१)",
    kind: "rupture",
    points: [
      [85.4, 27.7],
      [86.3, 27.8],
      [87.2, 27.6],
      [87.9, 27.2],
      [87.7, 26.8],
      [87.0, 26.5],
      [86.2, 26.4],
      [85.5, 26.7],
      [85.2, 27.2],
      [85.4, 27.7],
    ],
    note: {
      en: "Approximate footprint of the 15 January 1934 earthquake rupture — the largest known Himalayan event in Nepal.",
      ne: "१५ जनवरी १९३४ को भूकम्पको भत्किएको क्षेत्रको अनुमानित क्षेत्र — नेपालमा चिनिएकै सबैभन्दा ठूलो हिमालयी घटना।",
    },
  },
];
