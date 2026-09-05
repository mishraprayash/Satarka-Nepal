/**
 * Nepal's major river basins as SIMPLIFIED outlines for orientation on the
 * map. These are approximate drainage extents hand-traced from published
 * watershed maps — NOT survey-grade boundaries. Every feature that renders
 * them says so ("simplified drainage outline — for orientation only"), and the
 * risk label is an editorial, monsoon-flood framing, not a model output.
 */

export type BasinRisk = "low" | "moderate" | "high";

export interface Basin {
  id: string;
  name: string;
  nameNe: string;
  risk: BasinRisk;
  /** Polygon ring, [lng, lat]. */
  points: [number, number][];
}

export const BASINS: Basin[] = [
  {
    id: "mahakali",
    name: "Mahakali",
    nameNe: "महाकाली",
    risk: "moderate",
    points: [
      [80.06, 28.6],
      [80.35, 29.1],
      [80.75, 29.7],
      [80.95, 29.0],
      [80.9, 28.2],
      [80.65, 28.0],
      [80.5, 27.5],
      [80.2, 27.4],
      [80.06, 27.5],
      [80.06, 28.6],
    ],
  },
  {
    id: "karnali",
    name: "Karnali",
    nameNe: "कर्णाली",
    risk: "high",
    points: [
      [80.9, 28.2],
      [80.95, 29.0],
      [81.4, 29.9],
      [81.9, 30.3],
      [82.5, 30.4],
      [83.0, 30.1],
      [83.1, 29.4],
      [82.9, 28.9],
      [82.7, 28.3],
      [82.3, 28.2],
      [81.8, 28.4],
      [81.3, 28.2],
      [80.9, 28.2],
    ],
  },
  {
    id: "babai",
    name: "Babai",
    nameNe: "बबई",
    risk: "moderate",
    points: [
      [81.5, 28.3],
      [81.8, 28.2],
      [82.0, 28.4],
      [82.3, 28.3],
      [82.4, 27.9],
      [82.1, 27.6],
      [81.8, 27.5],
      [81.6, 27.6],
      [81.5, 27.9],
      [81.5, 28.3],
    ],
  },
  {
    id: "west-rapti",
    name: "West Rapti",
    nameNe: "पश्चिम राप्ती",
    risk: "moderate",
    points: [
      [82.3, 28.3],
      [82.6, 28.6],
      [83.0, 28.6],
      [83.1, 28.1],
      [82.9, 27.7],
      [82.5, 27.5],
      [82.2, 27.5],
      [82.1, 27.9],
      [82.3, 28.3],
    ],
  },
  {
    id: "narayani",
    name: "Narayani (Gandaki)",
    nameNe: "नारायणी (गण्डकी)",
    risk: "high",
    points: [
      [83.1, 28.3],
      [83.1, 29.0],
      [83.5, 29.6],
      [84.2, 30.2],
      [85.0, 30.3],
      [85.4, 29.8],
      [85.6, 29.2],
      [85.3, 28.5],
      [84.9, 28.1],
      [84.3, 27.8],
      [83.8, 27.7],
      [83.4, 27.9],
      [83.1, 28.3],
    ],
  },
  {
    id: "koshi",
    name: "Koshi",
    nameNe: "कोशी",
    risk: "high",
    points: [
      [85.4, 29.8],
      [85.9, 30.4],
      [86.6, 30.5],
      [87.3, 30.2],
      [87.8, 29.6],
      [87.9, 28.9],
      [87.8, 28.2],
      [87.6, 27.5],
      [87.3, 27.2],
      [86.8, 27.0],
      [86.3, 26.9],
      [85.9, 27.1],
      [85.6, 27.4],
      [85.5, 27.8],
      [85.4, 28.2],
      [85.4, 28.7],
      [85.4, 29.8],
    ],
  },
  {
    id: "kankai-mechi",
    name: "Kankai–Mechi",
    nameNe: "कन्काई–मेची",
    risk: "moderate",
    points: [
      [87.6, 27.5],
      [87.9, 27.9],
      [88.2, 28.1],
      [88.2, 27.4],
      [88.0, 27.0],
      [87.7, 26.9],
      [87.5, 27.0],
      [87.5, 27.4],
      [87.6, 27.5],
    ],
  },
];
