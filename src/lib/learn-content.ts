/**
 * Bilingual hazard guides, authored in English and Nepali. Safety instructions
 * follow the guidance of NDRRMA, DHM, USGS and FEMA/Ready.gov (see `sources`
 * per hazard). Content is intentionally plain-language and local.
 */
import type { HazardType } from "@/lib/types";

export interface LocalizedItem {
  en: string;
  ne?: string;
}

export interface HazardGuide {
  intro: LocalizedItem;
  causes: LocalizedItem[];
  signs: LocalizedItem[];
  before: LocalizedItem[];
  during: LocalizedItem[];
  after: LocalizedItem[];
  sources: { name: string; url: string }[];
}

export const LEARN_CONTENT: Record<HazardType, HazardGuide> = {
  flood: {
    intro: {
      en: "Floods are the most frequent disaster in Nepal. During the monsoon (June–September) rivers regularly leave their banks, and flash floods in steep valleys can rise within minutes.",
      ne: "बाढी नेपालमा सबैभन्दा धेरै हुने प्रकोप हो। मनसुन (असार–भदौ) मा नदीहरू प्रायः किनाराभन्दा माथि उक्लिन्छन्, र भिराला उपत्यकाहरूमा आकस्मिक बाढी मिनेटभित्रै आउन सक्छ।",
    },
    causes: [
      {
        en: "Heavy monsoon rain exceeding what rivers and drains can carry.",
        ne: "नदी र नालीले धान्न सक्नेभन्दा बढी भारी मनसुन वर्षा।",
      },
      {
        en: "Flash floods in short, steep catchments after intense bursts of rain.",
        ne: "छोटा र भिराला जलाधारहरूमा चर्को वर्षापछि आकस्मिक बाढी।",
      },
      {
        en: "River-bank erosion, or debris and road/bridge culverts blocking the flow.",
        ne: "नदी किनारको कटान, वा मलबा र सडक/पुलका नालीले बगाब रोक्नु।",
      },
      {
        en: "A breach of an embankment or of a temporary natural dam — as in Rasuwa, August 2026, when a rock/ice avalanche dammed a river and then burst.",
        ne: "बाँध वा अस्थायी प्राकृतिक बाँध फुट्नु — रसुवा, अगस्ट २०२६ मा जस्तै, जब ढुङ्गा/हिउँको पहिरोले नदी थुनेर फुट्यो।",
      },
      {
        en: "Urban storm-water drains overwhelmed in low-lying towns.",
        ne: "तल्लो भेगका सहरहरूमा आँधीको पानी बगाउने नालीहरू थेगिन नसक्नु।",
      },
    ],
    signs: [
      {
        en: "Sustained heavy rain, and riverwatch readings at or above the warning level.",
        ne: "लगातार भारी वर्षा, र रिभरवाचले चेतावनी तह वा त्यसभन्दा माथिको पानी देखाउनु।",
      },
      {
        en: "The river rising fast and turning muddy and turbulent.",
        ne: "नदी छिटो बढ्नु र पानी मैलो, बलियो बग्न थाल्नु।",
      },
      {
        en: "Water flowing over roads and bridges, or the water level climbing at nearby gauges.",
        ne: "सडक र पुलमा पानी बग्नु, वा नजिकका गेजमा पानी बढ्दै जानु।",
      },
      {
        en: "Announcements or sirens from the ward office or District Emergency Operation Centre (DEOC).",
        ne: "वडा कार्यालय वा जिल्ला आपत्कालीन कार्य सञ्चालन केन्द्र (DEOC) बाट सूचना वा साइरन।",
      },
    ],
    before: [
      {
        en: "Know whether you live near a river, in a low-lying area, or on a flood drainage path.",
        ne: "तपाईं नदी नजिक, तल्लो भेगमा, वा बाढीको बहाव मार्गमा बस्नुहुन्छ कि थाहा पाउनुहोस्।",
      },
      {
        en: "Prepare a go-bag and keep important documents in a waterproof packet.",
        ne: "गो-ब्याग तयार राख्नुहोस् र महत्त्वपूर्ण कागजात पानी नछिर्ने खाममा राख्नुहोस्।",
      },
      {
        en: "Learn the evacuation route to high ground and agree a family meeting point.",
        ne: "अग्लो ठाउँसम्म पुग्ने बाटो सिक्नुहोस् र परिवारको भेट्ने ठाउँ तय गर्नुहोस्।",
      },
      {
        en: "Save the official numbers: police 100, fire 101, ambulance 102, disaster hotline 1234.",
        ne: "आधिकारिक नम्बरहरू राख्नुहोस्: प्रहरी १००, दमकल १०१, एम्बुलेन्स १०२, प्रकोप हटलाइन १२३४।",
      },
    ],
    during: [
      {
        en: "Move to high ground immediately — do not wait for a warning before leaving.",
        ne: "तुरुन्तै अग्लो ठाउँमा जानुहोस् — जानुअघि चेतावनी कुर्नु हुँदैन।",
      },
      {
        en: "Never walk or drive through flowing water. Water at knee height can sweep a person away.",
        ne: "बगिरहेको पानीमा हिँड्नु वा गाडी चलाउनु कहिल्यै हुँदैन। घुँडासम्मको पानीले पनि मानिसलाई बगाउन सक्छ।",
      },
      {
        en: "Keep children and older people with you. Do not cross bridges over a swollen river.",
        ne: "बालबालिका र वृद्धवृद्धालाई सँगै राख्नुहोस्। बढेको नदीका पुल पार गर्नु हुँदैन।",
      },
      {
        en: "Follow the instructions of local authorities and emergency workers.",
        ne: "स्थानीय अधिकारी र आपत्कालीन कर्मचारीको निर्देशन पालना गर्नुहोस्।",
      },
    ],
    after: [
      {
        en: "Do not return home until authorities say it is safe.",
        ne: "अधिकारीले सुरक्षित भनेपछि मात्र घर फर्किनुहोस्।",
      },
      {
        en: "Beware of contaminated water, snakes, and weakened buildings.",
        ne: "दूषित पानी, सर्प र कमजोर भएका भवनबाट सतर्क रहनुहोस्।",
      },
      {
        en: "Report injuries and damage; collect food and water from relief points.",
        ne: "घाइते र क्षतिको जानकारी दिनुहोस्; राहत केन्द्रबाट खाना र पानी लिनुहोस्।",
      },
      {
        en: "Check on neighbours, especially elderly and disabled households.",
        ne: "छिमेकी, विशेष गरी वृद्ध र अपाङ्गता भएका घरपरिवारको खबर लिनुहोस्।",
      },
    ],
    sources: [
      { name: "DHM — Department of Hydrology and Meteorology", url: "https://www.dhm.gov.np/" },
      { name: "NDRRMA", url: "https://www.ndrrma.gov.np/" },
      { name: "BIPAD Portal (NDRRMA)", url: "https://bipadportal.gov.np/" },
      { name: "Ready.gov — Floods (FEMA)", url: "https://www.ready.gov/floods" },
    ],
  },

  glof: {
    intro: {
      en: "A glacial lake outburst flood (GLOF) happens when a lake held back by a glacial moraine suddenly releases. GLOFs are rare, but in narrow valleys they can be catastrophic with very little warning.",
      ne: "हिमनदीको मोरेनले बाँधिएको हिमताल अचानक फुट्दा हिमताल विस्फोट बाढी (GLOF) हुन्छ। GLOF दुर्लभ छ, तर साँघुरा उपत्यकामा एकदमै कम चेतावनीमा विनाशकारी हुन सक्छ।",
    },
    causes: [
      {
        en: "A moraine-dammed lake overtopping or breaching its walls.",
        ne: "मोरेनले बाँधिएको हिमतालको पर्खाल नाघ्नु वा फुट्नु।",
      },
      {
        en: "A rock/ice avalanche, landslide, or earthquake pushing water out of the lake.",
        ne: "ढुङ्गा/हिउँ पहिरो, पहिरो, वा भूकम्पले तालको पानी बाहिर धकेल्नु।",
      },
      {
        en: "Lakes growing for decades as glaciers retreat under a warming climate.",
        ne: "जलवायु तातिँदा हिमनदी पछि हट्दा हिमतालहरू दशकौंदेखि ठूलो हुँदै जानु।",
      },
      {
        en: "Not every valley flood from a glacier is a GLOF: the Rasuwa event of August 2026 was a rock/ice avalanche damming a river, then the dam bursting — a flash flood, not a lake outburst.",
        ne: "हिमनदीबाट आउने हरेक बाढी GLOF होइन: अगस्ट २०२६ को रसुवा घटना ढुङ्गा/हिउँ पहिरोले नदी थुनेर, त्यो फुटेर आएको बाढी थियो — हिमताल फुटेको होइन।",
      },
    ],
    signs: [
      {
        en: "An official GLOF warning from DHM/NDRRMA for a known at-risk valley.",
        ne: "DHM/NDRRMA बाट जोखिमयुक्त उपत्यकाका लागि आधिकारिक GLOF चेतावनी।",
      },
      {
        en: "A sudden loud noise upstream, or the river dropping then surging — the signature of a dam or lake release.",
        ne: "माथिबाट अचानक चर्को आवाज, वा नदीको पानी घटेर फेरि उफ्रनु — ताल वा बाँध फुटेको संकेत।",
      },
      {
        en: "Rapidly rising, debris-laden water with a roar before the wave arrives.",
        ne: "छाल आउनुअघि नै मलबासहितको पानी गर्जनसहित छिटो बढ्नु।",
      },
      {
        en: "Do not rely on watching the lake yourself — the surge travels far faster than you can.",
        ne: "आफैँ ताल हेरेर अनुमान नगर्नुहोस् — बाढीको छाल तपाईंभन्दा धेरै छिटो आउँछ।",
      },
    ],
    before: [
      {
        en: "Know the at-risk valleys (e.g. Bhote Koshi, Seti, Marsyangdi) and the routes to high ground.",
        ne: "जोखिमयुक्त उपत्यका (जस्तै: भोटेकोशी, सेती, मर्स्याङ्दी) र अग्लो ठाउँसम्मका बाटो थाहा पाउनुहोस्।",
      },
      {
        en: "Keep a go-bag ready and plan to move to high ground well away from the valley floor and tributaries.",
        ne: "गो-ब्याग तयार राख्नुहोस् र उपत्यकाको भुइँ र सहायक खोलाबाट टाढा अग्लो ठाउँमा जाने योजना बनाउनुहोस्।",
      },
      {
        en: "Learn where the community early-warning sirens and meeting points are.",
        ne: "समुदायको पूर्व-चेतावनी साइरन र भेट्ने ठाउँहरू कहाँ छन् सिक्नुहोस्।",
      },
    ],
    during: [
      {
        en: "Move to high ground immediately, away from the valley bottom and any side streams.",
        ne: "तुरुन्तै अग्लो ठाउँमा जानुहोस्, उपत्यकाको तल र कुनै पनि सहायक खोलाबाट टाढा।",
      },
      {
        en: "Do not stop to watch — the surge can arrive within minutes.",
        ne: "हेर्न रोकिनु हुँदैन — छाल केही मिनेटमै आउन सक्छ।",
      },
      {
        en: "Do not try to outrun the flood along the valley road.",
        ne: "उपत्यकाको सडकसँगै बाढीसँग दौडिएर भाग्ने प्रयास नगर्नुहोस्।",
      },
    ],
    after: [
      {
        en: "Wait for the official all-clear; the river can carry hazards for days.",
        ne: "आधिकारिक सुरक्षित घोषणा कुर्नुहोस्; नदी दिनौंसम्म खतरा बोक्न सक्छ।",
      },
      {
        en: "Watch for blocked roads, bridges, and freshly eroded banks.",
        ne: "बन्द सडक, पुल र भर्खरै कटान भएका किनाराबाट सतर्क रहनुहोस्।",
      },
      {
        en: "Report to the ward or DEOC and follow relief instructions.",
        ne: "वडा वा DEOC लाई जानकारी दिनुहोस् र राहत निर्देशन पालना गर्नुहोस्।",
      },
    ],
    sources: [
      { name: "ICIMOD — GLOF risk assessments", url: "https://www.icimod.org/" },
      { name: "DHM — Department of Hydrology and Meteorology", url: "https://www.dhm.gov.np/" },
      { name: "NDRRMA", url: "https://www.ndrrma.gov.np/" },
    ],
  },

  earthquake: {
    intro: {
      en: "Nepal sits on the boundary of the Indian and Eurasian plates, where the Indian plate slides beneath Tibet. Large earthquakes have struck before — 1934 and 2015 — and will again. Preparedness is the only defence, because there is no reliable prediction.",
      ne: "नेपाल भारतीय र युरेसियन प्लेटको सीमामा अवस्थित छ, जहाँ भारतीय प्लेट तिब्बतमुनि छिर्छ। ठूला भूकम्पहरू पहिले पनि गएका छन् — १९३४ र २०१५ — र फेरि आउनेछन्। भरपर्दो पूर्वानुमान नभएकाले तयारी नै एक मात्र बचाव हो।",
    },
    causes: [
      {
        en: "Sudden slip on the Main Himalayan Thrust — the plate boundary under Nepal.",
        ne: "नेपालमुनिको प्लेट सीमा — मुख्य हिमालयी थ्रस्टमा अचानक चिप्लिएर।",
      },
      {
        en: "Energy built up over centuries of plates pushing together, released in seconds.",
        ne: "शताब्दीयौंदेखि प्लेटहरू थिचिएर जम्मा भएको ऊर्जा सेकेन्डमै निस्किनु।",
      },
      {
        en: "Nepal is one of the most seismically active countries on Earth.",
        ne: "नेपाल पृथ्वीकै सबैभन्दा भूकम्पीय गतिविधि भएका देशमध्ये एक हो।",
      },
    ],
    signs: [
      {
        en: "Ground shaking itself is the warning — act the moment you feel it.",
        ne: "जमिन काम्नु नै चेतावनी हो — अनुभव हुनेबित्तिकै काम गर्नुहोस्।",
      },
      {
        en: "There is no reliable short-term prediction. Ignore anyone claiming they can predict quakes.",
        ne: "छोटो अवधिको भरपर्दो पूर्वानुमान हुँदैन। भूकम्पको भविष्यवाणी गर्छु भन्ने जोकोहीलाई विश्वास नगर्नुहोस्।",
      },
    ],
    before: [
      {
        en: "Secure tall, heavy furniture and shelves to the wall; store breakables low.",
        ne: "अग्ला, भारी फर्निचर र र्याक पर्खालमा बाँध्नुहोस्; फुट्ने वस्तु तल राख्नुहोस्।",
      },
      {
        en: "Pick a drop-cover-hold spot in every room and know how to turn off the gas.",
        ne: "हरेक कोठामा झुक्ने-ओत-थाम्ने ठाउँ छान्नुहोस् र ग्यास कसरी बन्द गर्ने जान्नुहोस्।",
      },
      {
        en: "Keep a go-bag, water, and documents ready; know your safe exits.",
        ne: "गो-ब्याग, पानी र कागजात तयार राख्नुहोस्; सुरक्षित निस्कने ढोका थाहा राख्नुहोस्।",
      },
      {
        en: "Identify open ground away from buildings as a family meeting point.",
        ne: "भवनबाट टाढाको खुला चौरलाई परिवारको भेट्ने ठाउँ बनाउनुहोस्।",
      },
    ],
    during: [
      {
        en: "Indoors: DROP, COVER, HOLD ON — take cover under sturdy furniture and stay until the shaking stops.",
        ne: "घरभित्र: झुक्नुहोस्, ओत खोज्नुहोस्, समात्नुहोस् — बलियो फर्निचरमुनि ओत लिएर कम्पन रोकिएसम्म रहनुहोस्।",
      },
      {
        en: "Outdoors: move to open ground, away from buildings, poles, and wires.",
        ne: "घरबाहिर: भवन, पोल र तारबाट टाढा खुला ठाउँमा जानुहोस्।",
      },
      {
        en: "Do not run outside during the shaking, and do not stand in doorways — they are not safer.",
        ne: "कम्पनका बेला बाहिर नभाग्नुहोस् र ढोकामुनि नउभिनुहोस् — त्यो सुरक्षित होइन।",
      },
      {
        en: "Near a hillside, stay alert for landslides and rockfall after the shaking.",
        ne: "डाँडाको छेउमा, कम्पनपछि पहिरो र ढुङ्गा खस्नेबाट सतर्क रहनुहोस्।",
      },
    ],
    after: [
      {
        en: "Expect aftershocks and keep clear of damaged buildings.",
        ne: "पछिल्ला कम्पनहरू आउन सक्छन्, क्षतिग्रस्त भवनबाट टाढा रहनुहोस्।",
      },
      {
        en: "Check for injuries; use the stairs, never the lift.",
        ne: "घाइतेको जाँच गर्नुहोस्; लिफ्ट होइन, सिँढी प्रयोग गर्नुहोस्।",
      },
      {
        en: "Watch for fallen wires, gas leaks, and damaged roads.",
        ne: "ढलेका तार, ग्यास चुहावट र क्षतिग्रस्त सडकबाट सतर्क रहनुहोस्।",
      },
      {
        en: "Use text messages instead of calls to keep emergency lines free.",
        ne: "आपत्कालीन लाइन खाली राख्न कलभन्दा सन्देश प्रयोग गर्नुहोस्।",
      },
    ],
    sources: [
      { name: "USGS Earthquake Hazards Program", url: "https://earthquake.usgs.gov/" },
      { name: "National Society for Earthquake Technology (NSET)", url: "https://www.nset.org.np/" },
      { name: "Ready.gov — Earthquakes (FEMA)", url: "https://www.ready.gov/earthquakes" },
    ],
  },

  landslide: {
    intro: {
      en: "Landslides and debris flows are common in Nepal's steep terrain, especially during and after heavy rain. They can strike quickly and often re-mobilise along the same slopes.",
      ne: "नेपालको भिरालो भूभागमा पहिरो र मलबा बहाव सामान्य हो, विशेष गरी भारी वर्षाका बेला र पछि। ती छिटो आउन सक्छन् र प्रायः उही डाँडामा फेरि सक्रिय हुन्छन्।",
    },
    causes: [
      {
        en: "Heavy or prolonged rain saturating steep, unstable slopes.",
        ne: "भारी वा लामो वर्षाले भिराला, अस्थिर डाँडाहरू भिजेर।",
      },
      {
        en: "Deforestation, road cutting, and construction on or under slopes.",
        ne: "डाँडामा वन फँडानी, सडक कटान र निर्माण।",
      },
      {
        en: "Earthquakes, or rivers undercutting the base of a slope.",
        ne: "भूकम्प, वा नदीले डाँडाको फेद काट्नु।",
      },
      {
        en: "Debris flows rushing down steep drainage gullies in heavy rain.",
        ne: "भारी वर्षामा भिराला नालीहरूबाट मलबा बहाव बग्नु।",
      },
    ],
    signs: [
      {
        en: "New cracks appearing in the ground, walls, or roads.",
        ne: "जमिन, पर्खाल वा सडकमा नयाँ चिरा देखिनु।",
      },
      {
        en: "Tilting trees, fence posts, or poles; sagging or bulging ground.",
        ne: "रुख, कम्पाउन्डको पोल वा खम्बा ढल्कनु; जमिन धस्नु वा उठ्नु।",
      },
      {
        en: "A stream or river suddenly turning muddy, or its flow rising sharply.",
        ne: "खोला अचानक मैलो हुनु, वा यसको बहाव एक्कासि बढ्नु।",
      },
      {
        en: "Sounds of cracking trees, or of rocks rolling downhill.",
        ne: "रुख चर्किएको, वा ढुङ्गा बग्दै आएको आवाज।",
      },
    ],
    before: [
      {
        en: "Know whether your home is on or below a steep slope.",
        ne: "तपाईंको घर भिरालो डाँडामा वा मुनि छ कि थाहा पाउनुहोस्।",
      },
      {
        en: "Plan an escape route away from the slope and keep drains clear.",
        ne: "डाँडाबाट टाढा भाग्ने बाटो योजना बनाउनुहोस् र नाली खुला राख्नुहोस्।",
      },
      {
        en: "Keep a go-bag ready, and stay watchful after heavy rain.",
        ne: "गो-ब्याग तयार राख्नुहोस् र भारी वर्षापछि सतर्क रहनुहोस्।",
      },
    ],
    during: [
      {
        en: "If you are near a slope, move away quickly and at an angle to the slide path.",
        ne: "डाँडाको छेउमा हुनुहुन्छ भने छिटो र पहिरोको दिशाबाट अलग भई हट्नुहोस्।",
      },
      {
        en: "If you cannot leave, shelter under sturdy furniture on the side away from the slope.",
        ne: "निस्कन नसके, डाँडाबाट टाढाको छेउमा बलियो फर्निचरमुनि ओत लिनुहोस्।",
      },
      {
        en: "Never walk or drive across a slide area, especially during rain.",
        ne: "पहिरो भएको ठाउँ पार गरेर हिँड्नु वा गाडी चलाउनु कहिल्यै हुँदैन, विशेष गरी वर्षामा।",
      },
    ],
    after: [
      {
        en: "Stay away from the slide area — it can reactivate.",
        ne: "पहिरो क्षेत्रबाट टाढा रहनुहोस् — यो फेरि सक्रिय हुन सक्छ।",
      },
      {
        en: "Watch for damaged roads, and for gas or water line breaks.",
        ne: "क्षतिग्रस्त सडक, ग्यास वा पानीको पाइप फुटेकाबाट सतर्क रहनुहोस्।",
      },
      {
        en: "Report to the ward or DEOC and check on neighbours.",
        ne: "वडा वा DEOC लाई जानकारी दिनुहोस् र छिमेकीको खबर लिनुहोस्।",
      },
    ],
    sources: [
      { name: "DHM — Department of Hydrology and Meteorology", url: "https://www.dhm.gov.np/" },
      { name: "NDRRMA", url: "https://www.ndrrma.gov.np/" },
      { name: "Ready.gov — Landslides (FEMA)", url: "https://www.ready.gov/landslides-debris-flow" },
    ],
  },
};
