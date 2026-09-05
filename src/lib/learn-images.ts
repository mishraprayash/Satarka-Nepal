/**
 * Real photographs for the Learn guides, sourced from Wikimedia Commons under
 * their stated licenses (CC BY / CC BY-SA / public domain). Each image carries
 * the required attribution — we never strip a license or claim photos as ours.
 */
import type { HazardType } from "@/lib/types";

export interface GuideImage {
  src: string;
  /** Bilingual alt text (screen readers + broken-image fallback). */
  alt: { en: string; ne: string };
  /** Short bilingual caption shown under the image. */
  caption?: { en: string; ne: string };
  /** Required attribution. */
  credit: string;
  /** Commons file page, for full attribution. */
  link: string;
}

export interface HazardImages {
  hero: GuideImage;
  gallery: GuideImage[];
}

const THUMB = "https://upload.wikimedia.org/wikipedia/commons/thumb";

export const LEARN_IMAGES: Record<HazardType, HazardImages> = {
  flood: {
    hero: {
      src: `${THUMB}/c/c4/Flood_in_nepal_%28terai_region_at_rainy_season%29_%2817%29.jpg/1280px-Flood_in_nepal_%28terai_region_at_rainy_season%29_%2817%29.jpg`,
      alt: {
        en: "Monsoon flood water covering farmland in Nepal's Terai region",
        ne: "नेपालको तराई क्षेत्रमा मनसुनको बाढीले खेतबारी डुबाएको",
      },
      credit: "Beemall.99 · CC BY-SA 4.0",
      link: "https://commons.wikimedia.org/wiki/File:Flood_in_nepal_(terai_region_at_rainy_season)_(17).jpg",
    },
    gallery: [
      {
        src: `${THUMB}/f/f3/Flood_in_nepal_%28terai_region_at_rainy_season%29_%2824%29.jpg/1280px-Flood_in_nepal_%28terai_region_at_rainy_season%29_%2824%29.jpg`,
        alt: {
          en: "Flooded land in Nepal's Terai during the rainy season",
          ne: "वर्षायाममा नेपालको तराईमा डुबान परेको जमिन",
        },
        caption: {
          en: "Monsoon floods regularly cover the Terai lowlands — the country's flood-prone plains",
          ne: "मनसुनको बाढीले प्रायः तराईका तल्लो भूभाग — देशको बाढी-जोखिमयुक्त मैदान — डुबाउँछ",
        },
        credit: "Beemall.99 · CC BY-SA 4.0",
        link: "https://commons.wikimedia.org/wiki/File:Flood_in_nepal_(terai_region_at_rainy_season)_(24).jpg",
      },
      {
        src: `${THUMB}/c/c3/Landsat_Nepal_flood_2026-08-26.png/1280px-Landsat_Nepal_flood_2026-08-26.png`,
        alt: {
          en: "Satellite image of the Bhote Koshi and Trishuli valleys after the August 2026 Rasuwa flood",
          ne: "अगस्ट २०२६ को रसुवा बाढीपछि भोटेकोशी र त्रिशूली उपत्यकाको उपग्रह तस्बिर",
        },
        caption: {
          en: "The Bhote Koshi–Trishuli corridor after the 2026 Rasuwa flood (Landsat 9)",
          ne: "रसुवा २०२६ बाढीपछि भोटेकोशी–त्रिशूली क्षेत्र (Landsat 9)",
        },
        credit: "Landsat 9 / USGS · public domain",
        link: "https://commons.wikimedia.org/wiki/File:Landsat_Nepal_flood_2026-08-26.png",
      },
    ],
  },

  glof: {
    hero: {
      src: `${THUMB}/8/87/Imja_Tsho%2C_Nepal.jpg/1280px-Imja_Tsho%2C_Nepal.jpg`,
      alt: {
        en: "A satellite view of Imja Tsho, a large glacial lake in the Everest region",
        ne: "सगरमाथा क्षेत्रको ठूलो हिमताल इम्जा त्सोको उपग्रह दृश्य",
      },
      credit: "Jesse Allen / NASA · public domain",
      link: "https://commons.wikimedia.org/wiki/File:Imja_Tsho,_Nepal.jpg",
    },
    gallery: [
      {
        src: `${THUMB}/a/af/Tsho_Rolpa_Glacier_Lake.jpg/1280px-Tsho_Rolpa_Glacier_Lake.jpg`,
        alt: {
          en: "Tsho Rolpa glacial lake held back by its moraine, in the Rolwaling valley",
          ne: "रोल्वालिङ उपत्यकामा मोरेनले बाँधिएको त्सो रोल्पा हिमताल",
        },
        caption: {
          en: "Tsho Rolpa — one of Nepal's largest moraine-dammed lakes (Dolakha)",
          ne: "त्सो रोल्पा — नेपालका सबैभन्दा ठूला मोरेन-बाँधिएका हिमतालमध्ये एक (दोलखा)",
        },
        credit: "Hrishav398 · CC BY-SA 4.0",
        link: "https://commons.wikimedia.org/wiki/File:Tsho_Rolpa_Glacier_Lake.jpg",
      },
    ],
  },

  earthquake: {
    hero: {
      src: `${THUMB}/8/83/Dharahara_%28259237090%29_%282%29.jpg/1280px-Dharahara_%28259237090%29_%282%29.jpg`,
      alt: {
        en: "The Dharahara tower in Kathmandu after it collapsed in the 2015 earthquake",
        ne: "सन् २०१५ को भूकम्पमा भत्किएपछि काठमाडौंको धरहरा टावर",
      },
      credit: "Saroj Regmi · CC BY 2.0",
      link: "https://commons.wikimedia.org/wiki/File:Dharahara_(259237090)_(2).jpg",
    },
    gallery: [
      {
        src: `${THUMB}/e/eb/Earthquake_Nepal_2015_10.JPG/1280px-Earthquake_Nepal_2015_10.JPG`,
        alt: {
          en: "Damaged buildings in Kathmandu after the 2015 Gorkha earthquake",
          ne: "सन् २०१५ को गोर्खा भूकम्पपछि काठमाडौंका क्षतिग्रस्त भवनहरू",
        },
        caption: {
          en: "Collapsed and cracked buildings after the 25 April 2015 earthquake",
          ne: "२५ अप्रिल २०१५ को भूकम्पपछि भत्किएका र चर्किएका भवनहरू",
        },
        credit: "Punya · CC BY-SA 4.0",
        link: "https://commons.wikimedia.org/wiki/File:Earthquake_Nepal_2015_10.JPG",
      },
    ],
  },

  landslide: {
    hero: {
      src: `${THUMB}/b/ba/Jure_area_after_landslide.jpg/1280px-Jure_area_after_landslide.jpg`,
      alt: {
        en: "The Jure landslide scar in Sindhupalchok, where a whole slope collapsed",
        ne: "सिन्धुपाल्चोकको जुरे पहिरोको कटान, जहाँ पूरै डाँडो भत्किएको थियो",
      },
      credit: "Ascii002 · CC BY-SA 3.0",
      link: "https://commons.wikimedia.org/wiki/File:Jure_area_after_landslide.jpg",
    },
    gallery: [
      {
        src: `${THUMB}/2/2e/%E0%A4%B8%E0%A4%BF%E0%A4%A8%E0%A5%8D%E0%A4%A7%E0%A5%81%E0%A4%AA%E0%A4%BE%E0%A4%B2%E0%A5%8D%E0%A4%9A%E0%A5%8B%E0%A4%95_%E0%A4%AA%E0%A4%B9%E0%A4%BF%E0%A4%B0%E0%A5%8B.JPG/1280px-%E0%A4%B8%E0%A4%BF%E0%A4%A8%E0%A5%8D%E0%A4%A7%E0%A5%81%E0%A4%AA%E0%A4%BE%E0%A4%B2%E0%A5%8D%E0%A4%9A%E0%A5%8B%E0%A4%95_%E0%A4%AA%E0%A4%B9%E0%A4%BF%E0%A4%B0%E0%A5%8B.JPG`,
        alt: {
          en: "The huge Jure landslide in Sindhupalchok, which blocked the Sunkoshi river",
          ne: "सिन्धुपाल्चोकको विशाल जुरे पहिरो, जसले सुनकोशी नदी थुनेको थियो",
        },
        caption: {
          en: "The Jure landslide (August 2014) dammed the Sunkoshi river — the country's worst landslide disaster",
          ne: "जुरे पहिरो (अगस्ट २०१४) ले सुनकोशी नदी थुन्यो — देशकै सबैभन्दा ठूलो पहिरो प्रकोप",
        },
        credit: "Ananda Adhikari Tanahun · CC BY-SA 4.0",
        link: "https://commons.wikimedia.org/wiki/File:%E0%A4%B8%E0%A4%BF%E0%A4%A8%E0%A5%8D%E0%A4%A7%E0%A5%81%E0%A4%AA%E0%A4%BE%E0%A4%B2%E0%A5%8D%E0%A4%9A%E0%A5%8B%E0%A4%95_%E0%A4%AA%E0%A4%B9%E0%A4%BF%E0%A4%B0%E0%A5%8B.JPG",
      },
    ],
  },
};
