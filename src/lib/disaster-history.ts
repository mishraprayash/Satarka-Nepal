import type { HazardType } from "@/lib/types";

export interface HistoricDisaster {
  id: string;
  hazard: HazardType;
  year: number;
  bsYear: string;
  title: { en: string; ne: string };
  location: { en: string; ne: string; district: string };
  metricHighlight: { en: string; ne: string };
  fatalities: string;
  impact: { en: string; ne: string };
  scientificCause: { en: string; ne: string };
  lessonLearned: { en: string; ne: string };
}

export const HISTORIC_DISASTERS: HistoricDisaster[] = [
  {
    id: "quake-1934",
    hazard: "earthquake",
    year: 1934,
    bsYear: "१९९० वि.सं.",
    title: {
      en: "1934 Great Bihar–Nepal Earthquake",
      ne: "१९९० सालको महाभूकम्प",
    },
    location: {
      en: "Eastern & Central Nepal (Epicentre: Shankhuwasabha/Saptari border)",
      ne: "पूर्वी र मध्य नेपाल (केन्द्रविन्दु: संखुवासभा/सप्तरी सिमाना)",
      district: "Sankhuwasabha",
    },
    metricHighlight: {
      en: "Magnitude ~8.0 M",
      ne: "तीव्रता ~८.० म्याग्निच्युड",
    },
    fatalities: "8,519 in Nepal (10,700+ total)",
    impact: {
      en: "Destroyed 80% of buildings in Kathmandu, Patan, and Bhaktapur. Historic landmarks including Dharahara and parts of Singha Durbar collapsed. Massive soil liquefaction erupted sand and boiling water across Tundikhel and riverbanks.",
      ne: "काठमाडौं, पाटन र भक्तपुरका ८०% भन्दा बढी घरहरू भत्किए। धरहरा, सिंहदरबारका भागहरू लगायतका ऐतिहासिक धरोहरहरू ढले। टुँडिखेल र नदी किनारहरूमा बालुवा र तातो पानी उम्लिने 'माटो तरलकरण' (Liquefaction) भयो।",
    },
    scientificCause: {
      en: "A massive rupture along the Main Frontal Thrust (MFT) where the Indian tectonic plate slips under the Himalayas at ~20mm per year, releasing hundreds of years of stored elastic strain.",
      ne: "भारतीय र यूरेशियन प्लेटको घर्षणका कारण 'मेन फ्रन्टल थ्रस्ट' (MFT) मा सयौं वर्षदेखि सञ्चित शक्ति एकैपटक विष्फोटक रूपमा बाहिर निस्किएको थियो।",
    },
    lessonLearned: {
      en: "Kathmandu's soft lakebed sediments amplify long-period seismic waves by 2x to 4x. Traditional mud-mortar brick structures suffer instant brittle failure without seismic ties.",
      ne: "काठमाडौं उपत्यकाको पुरानो तालको नरम माटोले कम्पनलाई २ देखि ४ गुणासम्म बढाउँछ। जग र बाँधाइ नभएका गाह्रो घरहरू पहिलो केही सेकेन्डमै ढल्छन्।",
    },
  },
  {
    id: "flood-1993",
    hazard: "flood",
    year: 1993,
    bsYear: "२०५० वि.सं.",
    title: {
      en: "1993 Central Nepal Cloudburst & Kulekhani Disaster",
      ne: "२०५० सालको विनाशकारी बाढी र कुलेखानी विपद्",
    },
    location: {
      en: "Makwanpur, Chitwan, Dhading & Bagmati Basin",
      ne: "मकवानपुर, चितवन, धादिङ र बागमती जलाधार",
      district: "Makwanpur",
    },
    metricHighlight: {
      en: "540 mm rainfall in 24 hours (Tistung)",
      ne: "२४ घण्टामा ५४० मि.मि. वर्षा (टिस्टुङ)",
    },
    fatalities: "1,498 confirmed dead",
    impact: {
      en: "Swept away entire settlements, destroyed highway bridges across Prithvi and Tribhuvan highways, damaged the Kulekhani penstock pipe (cutting Nepal's power grid by 50%), and deposited massive sediment loads.",
      ne: "गाउँबस्तीहरू बगायो, पृथ्वी र त्रिभुवन राजमार्गतर्फका पुलहरू ध्वस्त बनायो, कुलेखानी जलविद्युतको पाइप बगाएर देशको आधा बिजुली आपूर्ति हप्तौंसम्म ठप्प बनायो।",
    },
    scientificCause: {
      en: "Extreme orographic cloudburst stalled against the Mahabharat range, saturating the steep slopes to full pore-water pressure, triggering thousands of simultaneous debris flows in less than 8 hours.",
      ne: "महाभारत पर्वत शृंखलामा मनसुन बादल ठोक्किएर 'क्लाउडबर्स्ट' (अतिवृष्टि) भयो। पहाडका भिराला जमिनमा पानीको अत्यधिक चापका कारण ८ घण्टाभित्र हजारौं ठाउँमा एकैसाथ पहिरो र गेग्रान बहाव सुरु भयो।",
    },
    lessonLearned: {
      en: "Proved that mountain reservoirs and culverts must design for extreme debris flows, not just clear water discharge. Spurred the creation of DHM's modern flood forecasting division.",
      ne: "पहाडी पूर्वाधार बनाउँदा पानीको मात्र नभई बग्ने ढुङ्गा र लेदो (Debris) को पनि हिसाब गर्नुपर्छ भन्ने पाठ सिकायो। यसै घटनापछि जल तथा मौसम विज्ञान विभागमा बाढी पूर्वसूचना प्रणालीको जग बस्यो।",
    },
  },
  {
    id: "landslide-2014",
    hazard: "landslide",
    year: 2014,
    bsYear: "२०७१ वि.सं.",
    title: {
      en: "2014 Jure Landslide & Sunkoshi Damming",
      ne: "२०७१ सालको सिन्धुपाल्चोक जुरे पहिरो",
    },
    location: {
      en: "Jure, Sindhupalchok (Arniko Highway)",
      ne: "जुरे, सिन्धुपाल्चोक (अरनिको राजमार्ग)",
      district: "Sindhupalchok",
    },
    metricHighlight: {
      en: "5.5 million m³ rock/mud debris",
      ne: "५५ लाख घनमिटर पहिरोको थुप्रो",
    },
    fatalities: "156 dead / missing",
    impact: {
      en: "Completely dammed the Sunkoshi River creating a 3-kilometer long, 47-meter deep artificial lake that submerged settlements, destroyed the Arniko Highway, damaged the Sunkoshi Hydropower plant, and put downstream Terai districts on red alert.",
      ne: "सुनकोशी नदीलाई पूर्ण रूपमा थुनेर ३ किमी लामो र ४७ मिटर गहिरो ताल बनायो। बस्तीहरू डुबानमा परे, अरनिको राजमार्ग काटियो, जलविद्युत गृह डुब्यो र तल्लो तटीय तराईसम्म उच्च सतर्कता जारी गर्नुपर्यो।",
    },
    scientificCause: {
      en: "Deep-seated wedge and planar failure in highly weathered chlorite schist rocks after days of antecedent monsoon rainfall, lubricated along preexisting tectonic joint planes.",
      ne: "कमजोर र टुक्रिएका पत्रेदार चट्टानहरूमा धेरै दिनको झरीले पानी भरिएपछि भित्री चिप्लन सुरु भई पूरै पहाड नै नदीमा खसेको थियो।",
    },
    lessonLearned: {
      en: "Himalayan river valleys face acute Landslide Dam Outburst Flood (LDOF) risks. Controlled blasting and drainage trenches by the Nepal Army prevented a catastrophic breach.",
      ne: "पहिरोले नदी थुन्दा तल्लो भेगमा 'LDOF' (पहिरो बाँध फुट्ने बाढी) को ठूलो जोखिम हुन्छ। नेपाली सेनाले नियन्त्रित विष्फोट र निकास नाली बनाएर सम्भावित महाविपद् टारेको थियो।",
    },
  },
  {
    id: "quake-2015",
    hazard: "earthquake",
    year: 2015,
    bsYear: "२०७२ वि.सं.",
    title: {
      en: "2015 Gorkha Earthquake Sequence",
      ne: "२०७२ सालको गोर्खा भूकम्प",
    },
    location: {
      en: "Gorkha, Lamjung, Sindhupalchok, Kathmandu & Central Nepal",
      ne: "गोर्खा, लमजुङ, सिन्धुपाल्चोक, काठमाडौं र मध्य नेपाल",
      district: "Gorkha",
    },
    metricHighlight: {
      en: "M 7.8 (Barpak) + M 7.3 (Dolakha)",
      ne: "७.८ म्याग्निच्युड (बारपाक) र ७.३ (दोलखा)",
    },
    fatalities: "8,964 dead, 22,300+ injured",
    impact: {
      en: "Collapsed over 800,000 houses. An avalanche triggered at Langtang village buried 300+ people under rock and ice. Triggered over 22,000 co-seismic landslides that severed road links and buried entire villages in Sindhupalchok and Gorkha.",
      ne: "८ लाखभन्दा बढी घरहरू पूर्ण रूपमा ध्वस्त भए। लाङटाङ गाउँमा हिउँ र ढुङ्गाको हिमपहिरोले ३०० भन्दा बढीलाई पुर्यो। पहाडभरि २२,००० भन्दा बढी पहिरोहरू खसेर गाउँहरू सम्पर्कविहीन बने।",
    },
    scientificCause: {
      en: "Unzipping of a 140-km long section of the Main Himalayan Thrust (MHT) fault plane from Barpak eastward toward Dolakha at 2.8 km per second.",
      ne: "बारपाकदेखि दोलखासम्मको १४० किमी लामो 'मेन हिमालयन थ्रस्ट' (MHT) जमिनमुनि प्रति सेकेन्ड २.८ किलोमिटरको दरले च्यातिएर कम्पन पैदा गरेको थियो।",
    },
    lessonLearned: {
      en: "The rupture stopped blind beneath the Kathmandu Valley without breaking the surface, meaning the southern front toward the Terai remains locked and unruptured.",
      ne: "भूकम्पको धाँजा जमिनको सतहसम्म निस्किएन (Blind rupture), जसको अर्थ महाभारत र चुरे पर्वतमुनिको दक्षिणी भागमा अझै शक्ति सञ्चित छ भन्ने वैज्ञानिक निष्कर्ष निस्कियो।",
    },
  },
  {
    id: "flood-2021",
    hazard: "flood",
    year: 2021,
    bsYear: "२०७८ वि.सं.",
    title: {
      en: "2021 Melamchi Cascade Debris Flow",
      ne: "२०७८ सालको मेलम्ची लेदो र गेग्रान बाढी",
    },
    location: {
      en: "Melamchi, Helambu, Sindhupalchok",
      ne: "मेलम्ची, हेलम्बु, सिन्धुपाल्चोक",
      district: "Sindhupalchok",
    },
    metricHighlight: {
      en: "Multi-stage cascade from 3,500m elevation",
      ne: "३,५०० मिटर उचाइको भेमाथाङबाट सुरु",
    },
    fatalities: "25+ dead/missing, hundreds displaced",
    impact: {
      en: "Buried Melamchi Bazaar in 10 to 15 meters of sediment, destroyed dozens of concrete and suspension bridges, and wrecked the headworks of the multi-billion rupee Melamchi Water Supply Project.",
      ne: "मेलम्ची बजारलाई १० देखि १५ मिटरसम्मको बालुवा-लेदोले पुर्यो, दर्जनौं पक्की र झोलुङ्गे पुल बगायो, र अर्बौंको मेलम्ची खानेपानी आयोजनाको मुहान (Headworks) पूर्ण रूपमा क्षतिग्रस्त बनायो।",
    },
    scientificCause: {
      en: "A multi-hazard cascade: early high-altitude intense rain caused landslides that mobilized the vast ancient glacial sediment plain at Bhemathang (3,500m), creating successive dams and dam-breach waves downstream.",
      ne: "उच्च हिमाली भेग (भेमाथाङ) मा भारी वर्षा हुँदा पुरानो हिमनदीको थुप्रो पहिरोमा परिणत भयो। सो लेदोले ठाउँठाउँमा खोला थुन्दै, बाँध फुट्दै तल्लो भेगमा विनाशकारी रूप लियो।",
    },
    lessonLearned: {
      en: "High-mountain climate warming destabilizes alpine sediment reservoirs miles above inhabited areas. Traditional river gauges at valley bottoms give zero warning for high-altitude cascade failures.",
      ne: "जलवायु परिवर्तनले उच्च हिमाली भेगका थुप्रेका हिउँ र माटो अस्थिर बनाइरहेको छ। केवल नदीको तल्लो भागमा राखिएका गेजले उच्च हिमाली भेगको यस्तो विपद्को पूर्वसूचना दिन सक्दैनन्।",
    },
  },
  {
    id: "glof-1985",
    hazard: "glof",
    year: 1985,
    bsYear: "२०४२ वि.सं.",
    title: {
      en: "1985 Dig Tsho Glacial Lake Outburst (GLOF)",
      ne: "२०४२ सालको दिग्छो हिमताल विष्फोट (GLOF)",
    },
    location: {
      en: "Khumbu / Everest Region, Dudh Koshi Valley",
      ne: "खुम्बु / सगरमाथा क्षेत्र, दूधकोशी उपत्यका",
      district: "Solukhumbu",
    },
    metricHighlight: {
      en: "Peak discharge ~2,000 m³/s",
      ne: "बहाव ~२,००० घनमिटर प्रति सेकेन्ड",
    },
    fatalities: "5 confirmed, catastrophic infrastructure loss",
    impact: {
      en: "A 10-meter surge destroyed the newly completed Namche Small Hydropower plant, swept away 14 bridges, 30 houses, and altered 90 km of the Dudh Koshi river channel down into the plains.",
      ne: "१० मिटर अग्लो बाढीको छालले भर्खरै बनेको नाम्चे साना जलविद्युत गृहलाई पूर्ण रूपमा नामेट पार्यो, १४ वटा पुल, ३० वटा घर बगायो र दूधकोशी नदीको ९० किमी तल्लो भूभागसम्म कटान गर्यो।",
    },
    scientificCause: {
      en: "An ice avalanche fell from Langmoche Peak into Dig Tsho lake, creating a massive displacement wave that overtopped and carved open the loose moraine dam.",
      ne: "लाङमोचे हिमालबाट ठूलो हिमपहिरो दिग्छो तालमा खस्यो, जसले तालमा ठूलो छाल उठाएर कमजोर प्राकृतिक बाँध (Moraine) लाई चिरेर बाढी निस्कियो।",
    },
    lessonLearned: {
      en: "Established GLOFs as one of Nepal's prime catastrophic cryospheric hazards, leading directly to lake-lowering engineering at Tsho Rolpa and Imja Tsho.",
      ne: "यस घटनाले नेपालमा हिमताल विष्फोटको खतरालाई अन्तर्राष्ट्रिय ध्यानाकर्षण गरायो। पछि छो-रोल्पा र इम्जा हिमतालको पानी घटाउने (Siphoning) इन्जिनियरिङ काम यसैको प्रेरणा थियो।",
    },
  },
  {
    id: "quake-2023",
    hazard: "earthquake",
    year: 2023,
    bsYear: "२०८० वि.सं.",
    title: {
      en: "2023 Jajarkot–Rukum Earthquake",
      ne: "२०८० सालको जाजरकोट–पश्चिम रुकुम भूकम्प",
    },
    location: {
      en: "Jajarkot & West Rukum (Epicentre: Ramidanda)",
      ne: "जाजरकोट र पश्चिम रुकुम (केन्द्रविन्दु: रामीडाँडा)",
      district: "Jajarkot",
    },
    metricHighlight: {
      en: "M 5.7 at shallow 12 km depth",
      ne: "५.७ म्याग्निच्युड, १२ किमी कम गहिराइ",
    },
    fatalities: "154 dead, 370+ injured",
    impact: {
      en: "Over 60,000 houses damaged or destroyed across Karnali Province. Exposed the immense vulnerability of traditional unreinforced stone-and-mud masonry construction.",
      ne: "कर्णाली प्रदेशका ६०,००० भन्दा बढी घरहरू भत्किए वा बस्न नहुने भए। परम्परागत ढुङ्गा-माटोका घरहरू मध्यम भूकम्पमा पनि कति जोखिममा छन् भन्ने छर्लङ्ग पार्यो।",
    },
    scientificCause: {
      en: "Shallow intra-plate faulting in the Lesser Himalaya where tectonic stress transferred from the central segment released along secondary faults.",
      ne: "मध्य हिमालयको कम गहिराइमा रहेका स्थानीय फल्टहरूमा भएको कम्पन। जमिन नजिक केन्द्रविन्दु भएकाले सतहमा तीव्र धक्का महसुस भयो।",
    },
    lessonLearned: {
      en: "Magnitude does not equal damage: a moderate M 5.7 shallow quake can kill hundreds if structures lack timber or reinforced corner bands.",
      ne: "म्याग्निच्युड सानो हुँदैमा क्षति कम हुँदैन। बलियो काठ वा कङ्क्रिटको 'ब्यान्ड' नभएका घरहरू मध्यम धक्कामै खस्न सक्छन् भन्ने पुष्टि भयो।",
    },
  },
  {
    id: "flood-2024",
    hazard: "flood",
    year: 2024,
    bsYear: "२०८१ वि.सं.",
    title: {
      en: "2024 Late-Monsoon Cloudburst & Kathmandu Floods",
      ne: "२०८१ असोजको अविरल वर्षा र बागमती उपत्यका बाढी",
    },
    location: {
      en: "Kathmandu Valley, Kavre, Dhading, Makwanpur",
      ne: "काठमाडौं उपत्यका, काभ्रे, धादिङ, मकवानपुर",
      district: "Kathmandu",
    },
    metricHighlight: {
      en: "323 mm in 24h at Lele (Record breaking)",
      ne: "२४ घण्टामा ३२३ मि.मि. वर्षा (लेले, ललितपुर)",
    },
    fatalities: "240+ dead, 30+ missing",
    impact: {
      en: "Submerged entire river corridors of Bagmati, Bishnumati, Dhobikhola, and Nakkhu. Catastrophic landslides buried passenger buses at Jhyaple Khola (Dhading). Roads connecting Kathmandu were severed for days.",
      ne: "बागमती, विष्णुमती, धोबीखोला र नख्खु खोला बस्तीभित्र पसे। धादिङको झ्याप्ले खोलामा पहिरोले यात्रुवाहक बसहरू पुरिए। काठमाडौं जोड्ने सबै मुख्य राजमार्गहरू हप्तौंसम्म अवरुद्ध भए।",
    },
    scientificCause: {
      en: "A late-season depression from the Bay of Bengal interacted with western disturbance troughs directly over central Nepal, holding steady rain clouds for over 48 hours over river basins with saturated soil.",
      ne: "बंगालको खाडीबाट आएको जलवाष्पयुक्त न्यून चापीय प्रणाली र पश्चिमी वायु मध्य नेपालमा एकापसमा ठोक्किँदा ४८ घण्टाभन्दा बढी अविरल वर्षा भयो।",
    },
    lessonLearned: {
      en: "Encroachment of river floodplains and concrete riverbanks eliminate natural water absorption. Climate change is intensifying late-monsoon rain bursts well into late September and October.",
      ne: "नदी किनारका प्राकृतिक बहाव क्षेत्र (Floodplains) मिचेर बस्ती बसाल्दा पानी निकास नभई विपद् निम्तियो। मनसुन असोजसम्म पनि लम्बिने र थप हिंस्रक हुने क्रम बढेको छ।",
    },
  },
];

export interface HardFact {
  id: string;
  topic: { en: string; ne: string };
  headline: { en: string; ne: string };
  explanation: { en: string; ne: string };
  takeaway: { en: string; ne: string };
}

export const HARD_SCIENTIFIC_FACTS: HardFact[] = [
  {
    id: "seismic-gap",
    topic: { en: "Seismic Reality", ne: "भूकम्पीय यथार्थ" },
    headline: {
      en: "Western Nepal has an 800-km 'Seismic Gap' unruptured for 520 years",
      ne: "पश्चिम नेपालमा ५२० वर्षदेखि ठूलो भूकम्प नगएको 'सिस्मिक ग्याप' छ",
    },
    explanation: {
      en: "Between Gorkha in Nepal and Dehradun in India, no megaquake (M > 8.0) has struck since 1505. Because the Indian plate pushes into the Himalayas at ~20 mm per year, this locked section has accumulated over 10 meters of slip deficit — storing immense strain energy.",
      ne: "गोर्खादेखि भारतको देहरादुनसम्मको करिब ८०० किलोमिटर क्षेत्रमा सन् १५०५ यता (५२० वर्षदेखि) महाभूकम्प गएको छैन। जमिन हरेक वर्ष २० मिलिमिटरका दरले घचेटिइरहेकाले त्यहाँ १० मिटरभन्दा बढीको तनाव सञ्चित भइसकेको छ।",
    },
    takeaway: {
      en: "Building strictly to seismic building codes in western Nepal is an urgent matter of life and death, not future speculation.",
      ne: "कर्णाली र सुदूरपश्चिममा भूकम्प प्रतिरोधी भवन बनाउनु भविष्यको कुरा नभई जीवन रक्षाको पहिलो शर्त हो।",
    },
  },
  {
    id: "lakebed-amplification",
    topic: { en: "Geology", ne: "भू-संरचना" },
    headline: {
      en: "Kathmandu's ancient lakebed amplifies ground shaking by 200% to 400%",
      ne: "काठमाडौंको पुरानो तालको माटोले भूकम्पको कम्पन २ देखि ४ गुणा बढाउँछ",
    },
    explanation: {
      en: "Kathmandu Valley sits on up to 500 meters of soft clay and silt from an ancient prehistoric lake ('Nagdaha'). When seismic energy travels from hard bedrock into loose waterlogged silt, the seismic waves slow down and their amplitude shoots up, causing structures to shake far longer and harder.",
      ne: "काठमाडौं उपत्यका ५०० मिटरसम्म गहिरो पुरानो तालको लेदो र माटोमाथि छ। जब चट्टानबाट कम्पन यो नरम माटोमा छिर्छ, भूकम्पीय छालको गति घटेर उचाइ (Amplitude) बढ्छ, जसले गर्दा पहाडको तुलनामा उपत्यकामा धेरै गुणा बढी कम्पन हुन्छ।",
    },
    takeaway: {
      en: "Soil testing and raft/pile foundations are mandatory in Kathmandu; structures built on former riverbanks face liquefaction during severe shaking.",
      ne: "काठमाडौंमा माटो परीक्षण नगरी जग हाल्नु हुँदैन; नदी किनार र बलौटे जमिनमा भासिने जोखिम अत्यधिक हुन्छ।",
    },
  },
  {
    id: "debris-flow-difference",
    topic: { en: "Hydrology", ne: "जलविज्ञान" },
    headline: {
      en: "A debris flow exerts 3x the force of normal flood water",
      ne: "गेग्रान बहाव (Debris Flow) को शक्ति सामान्य बाढीभन्दा ३ गुणा बढी हुन्छ",
    },
    explanation: {
      en: "In steep mountain valleys, high-velocity flash floods pick up trees, sediment, and multi-ton boulders, turning into a dense slurry known as a debris flow. The high density (up to 2.2 tons/m³) can lift and crush reinforced concrete pillars that would otherwise easily withstand clean water.",
      ne: "पहाडमा बाढी केवल पानीको हुँदैन; यसले हजारौं टन ढुङ्गा, रूख र लेदो बोकेको हुन्छ। यसको घनत्व सामान्य पानीभन्दा दोब्बर बढी हुने भएकाले यसले पक्की पुल र कङ्क्रिटका पिल्लरहरूलाई पनि सजिलै उखेलेर फ्याँक्छ।",
    },
    takeaway: {
      en: "Never attempt to cross or watch from bridges when a mountain river turns thick, muddy, and rumbles like thunder.",
      ne: "जब खोला कालो-मैलो लेदो बनेर ढुङ्गा बज्दै आउँछ, कुनै पनि पुल वा किनारमा बस्नु मृत्युलाई निम्त्याउनु हो।",
    },
  },
  {
    id: "upstream-dam-sign",
    topic: { en: "Early Warning", ne: "पूर्वचेतावनी संकेत" },
    headline: {
      en: "If a swollen river suddenly recedes during heavy rain, EVACUATE IMMEDIATELY",
      ne: "झरीको बेला खोलाको पानी अचानक घटेमा तुरुन्तै सुरक्षित अग्लो ठाउँ जानुहोस्",
    },
    explanation: {
      en: "A sudden drop in river discharge while heavy rain continues upstream is almost always caused by a massive landslide blocking the river gorge. Minutes or hours later, the temporary dam breaches under hydrostatic pressure, sending a catastrophic wall of water downstream.",
      ne: "भारी वर्षा भइरहेको बेला खोलाको पानी अचानक घट्नुको अर्थ पानी सुकेको होइन; माथिल्लो भेगमा ठूलो पहिरोले नदी थुनेको हो। केही बेरमै सो बाँध फुट्दा विशाल छाल आएर तल्लो भेग सखाप पार्छ।",
    },
    takeaway: {
      en: "Do not wait for an official broadcast: a sudden river drop during a storm is a critical life-safety alarm.",
      ne: "रेडियो वा साइरन नकुर्नुहोस्; झरीमा खोला अचानक घट्नु आफैंमा आपत्कालीन भाग्ने संकेत हो।",
    },
  },
];
