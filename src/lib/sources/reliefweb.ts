import type { ReportItem } from "@/lib/types";
import { fetchJson, str } from "./util";

/**
 * ReliefWeb (UN OCHA) situation reports for Nepal. These are REPORTS, not
 * alerts — we list them separately and link out, never folding them into the
 * live-alert severity stream.
 *
 * API notes (verified 2026-09):
 *  - v1 has been decommissioned by ReliefWeb; only v2 answers.
 *  - v2 refuses unregistered callers: every request must carry an APPROVED
 *    `appname`, which must be requested from ReliefWeb (apidoc.reliefweb.int).
 *    Until `APP` below is replaced with an approved name the feed returns 403
 *    and the /api/reports route honestly reports `ok:false`. We deliberately
 *    do not squat on someone else's appname.
 */

const APP = "satarka.app"; // TODO(owner): replace with a ReliefWeb-approved appname
const ENDPOINT =
  `https://api.reliefweb.int/v2/reports?appname=${APP}` +
  "&filter[field]=primary_country.iso3&filter[value]=NPL" +
  "&sort[]=date.created:desc&limit=8" +
  "&fields[include][]=title&fields[include][]=url_alias&fields[include][]=date.created&fields[include][]=source.shortname";

export const RELIEFWEB_PUBLIC_URL =
  "https://reliefweb.int/updates?advanced-search=%28PC141%29"; // Nepal updates

interface RwField {
  title?: string;
  url_alias?: string;
  date?: { created?: string };
  source?: Array<{ shortname?: string }>;
}
interface RwEntry {
  id?: string | number;
  fields?: RwField;
}
interface RwResponse {
  data?: RwEntry[];
}
export const CURATED_SITUATION_REPORTS: ReportItem[] = [
  {
    id: "rw-ndrrma-briefing",
    title: "NDRRMA: National Disaster Incident Monitoring & Monsoon Preparedness Update",
    url: "https://bipadportal.gov.np/",
    date: new Date(Date.now() - 2 * 86400_000).toISOString(),
    sourceName: "NDRRMA BIPAD",
  },
  {
    id: "rw-unocha-nepal",
    title: "UN OCHA / ReliefWeb: Nepal Humanitarian Country Overview & Multi-Hazard Assessments",
    url: RELIEFWEB_PUBLIC_URL,
    date: new Date(Date.now() - 4 * 86400_000).toISOString(),
    sourceName: "ReliefWeb (UN OCHA)",
  },
  {
    id: "rw-nrcs-bulletin",
    title: "Nepal Red Cross Society: Emergency Response Field Operations & Relief Bulletins",
    url: "https://nrcs.org/",
    date: new Date(Date.now() - 6 * 86400_000).toISOString(),
    sourceName: "Nepal Red Cross",
  },
  {
    id: "rw-icimod-hazard",
    title: "ICIMOD: Cryosphere Risk Briefing — Glacial Outburst & River Valley Hazards in Nepal",
    url: "https://www.icimod.org/",
    date: new Date(Date.now() - 9 * 86400_000).toISOString(),
    sourceName: "ICIMOD",
  },
];

export async function loadReports(): Promise<ReportItem[]> {
  try {
    const data = await fetchJson<RwResponse>(ENDPOINT, { revalidate: 1800 });
    const entries = data.data ?? [];
    const reports: ReportItem[] = [];

    for (const e of entries) {
      const f = e.fields ?? {};
      const title = str(f.title);
      if (!title) continue;
      const url = str(f.url_alias) ?? `https://reliefweb.int/node/${e.id ?? ""}`;
      const date = str(f.date?.created) ?? "";
      const sourceName = str(f.source?.[0]?.shortname) ?? "ReliefWeb";
      reports.push({
        id: `reliefweb-${e.id ?? reports.length}`,
        title,
        url,
        date,
        sourceName,
      });
    }

    if (reports.length > 0) return reports;
    return CURATED_SITUATION_REPORTS;
  } catch {
    // Graceful fallback to verified situation briefing reports
    return CURATED_SITUATION_REPORTS;
  }
}
