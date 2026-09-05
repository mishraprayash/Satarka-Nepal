/**
 * Potentially dangerous glacial lakes of Nepal — a CURATED REFERENCE SUBSET.
 *
 * These points come from published ICIMOD / DHM GLOF inventories and are
 * provided for orientation only. They are NOT live monitoring: a lake's risk
 * changes with the seasons, and only the responsible agencies (DHM, NDRRMA)
 * issue warnings. The map renders this layer with that caveat visible.
 *
 * Risk labels are editorial, drawn from documented GLOF-potential assessments
 * (high = moraine-dammed, rapidly growing and/or with a documented outburst
 * history; moderate = monitored but currently assessed as lower likelihood).
 */
import type { BasinRisk } from "./basins";

export interface GlacialLake {
  id: string;
  name: string;
  district: string;
  lat: number;
  lng: number;
  risk: BasinRisk;
  /** Short, factual note — never a prediction. */
  note?: { en: string; ne?: string };
}

export const GLACIAL_LAKES: GlacialLake[] = [
  {
    id: "tsho-rolpa",
    name: "Tsho Rolpa",
    district: "Dolakha",
    lat: 27.869,
    lng: 86.475,
    risk: "high",
    note: {
      en: "Rolwaling valley — one of Nepal's largest moraine-dammed lakes, with a documented GLOF risk.",
      ne: "रोल्वालिङ उपत्यका — नेपालका सबैभन्दा ठूला हिमतालमध्ये एक, दस्तावेजीकृत जीएलओएफ जोखिमसहित।",
    },
  },
  {
    id: "dig-tsho",
    name: "Dig Tsho (Langmoche)",
    district: "Solukhumbu",
    lat: 27.858,
    lng: 86.593,
    risk: "high",
    note: {
      en: "Bhote Koshi headwaters — burst in 1985; the lake has re-formed.",
      ne: "भोटेकोशी उपरिमाथि — सन् १९८५ मा फुटेको; हिमताल पुनः बनेको छ।",
    },
  },
  {
    id: "imja",
    name: "Imja Tsho",
    district: "Solukhumbu",
    lat: 27.899,
    lng: 86.917,
    risk: "high",
    note: {
      en: "Below Imja Glacier — long studied; lowered in 2016–2019 by mitigation works.",
      ne: "इम्जा हिमनदीमुनि — लामो समयदेखि अध्ययन; सन् २०१६–२०१९ मा न्यूनीकरण कार्यद्वारा घटाइएको।",
    },
  },
  {
    id: "lower-barun",
    name: "Lower Barun",
    district: "Sankhuwasabha",
    lat: 27.794,
    lng: 87.103,
    risk: "high",
    note: {
      en: "Barun valley — one of the largest high-risk lakes in the Himalaya.",
      ne: "वरुण उपत्यका — हिमालयकै ठूला उच्च-जोखिम हिमतालमध्ये एक।",
    },
  },
  {
    id: "thulagi",
    name: "Thulagi",
    district: "Manang",
    lat: 28.484,
    lng: 84.363,
    risk: "high",
    note: {
      en: "Marsyangdi catchment — moraine-dammed, among the most studied lakes in Nepal.",
      ne: "मर्स्याङ्दी जलाधार — मोरेनले बाँधिएको, नेपालका सबैभन्दा अध्ययन गरिएका हिमतालमध्ये एक।",
    },
  },
  {
    id: "lumding",
    name: "Lumding Tsho",
    district: "Taplejung",
    lat: 27.83,
    lng: 88.2,
    risk: "high",
    note: {
      en: "Kangchenjunga region — a cross-border lake assessed as potentially dangerous.",
      ne: "कञ्चनजङ्घा क्षेत्र — सीमापारिको हिमताल, सम्भावित रूपमा खतरनाक भनी मूल्याङ्कन।",
    },
  },
  {
    id: "raphstreng",
    name: "Raphstreng Tsho",
    district: "Manang",
    lat: 28.64,
    lng: 84.02,
    risk: "moderate",
    note: {
      en: "Above Manang village — monitored; assessed at lower likelihood than Thulagi.",
      ne: "मनाङ गाउँमाथि — अनुगमन गरिएको; थुलागीभन्दा कम सम्भावना भनी मूल्याङ्कन।",
    },
  },
  {
    id: "chamlang-south",
    name: "Chamlang South",
    district: "Sankhuwasabha",
    lat: 27.72,
    lng: 87.16,
    risk: "moderate",
    note: {
      en: "Barun catchment — periodically assessed in ICIMOD GLOF screening.",
      ne: "वरुण जलाधार — ICIMOD GLOF स्क्रिनिङमा समयसमयमा मूल्याङ्कन।",
    },
  },
];
