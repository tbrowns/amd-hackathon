import type { Language } from "@/lib/types";

export const dictionary = {
  en: {
    navCheck: "Check a crop",
    navReports: "My reports",
    navSignals: "Community signals",
    navSafety: "How it works",
    language: "Language",
    demoBanner: "Demo mode — results are simulated and clearly marked.",
    advisory: "Advisory crop triage — not a definitive diagnosis",
    backHome: "Back to home",
    loading: "Loading…",
    retry: "Try again",
    startOver: "Start another assessment",
    crop: "Crop",
    region: "County or region",
    created: "Created",
    confidence: "confidence",
    lowConfidence: "Low confidence",
    moderateConfidence: "Moderate confidence",
    highConfidence: "High confidence",
    lowUrgency: "Low urgency",
    moderateUrgency: "Monitor closely",
    highUrgency: "High urgency",
    simulated: "Simulated demo",
    verified: "Safety checked",
    noReports: "No reports yet",
    errorTitle: "We could not complete that request",
    privacy: "Private by default. No names or exact locations are collected.",
  },
  sw: {
    navCheck: "Kagua zao",
    navReports: "Ripoti zangu",
    navSignals: "Ishara za jamii",
    navSafety: "Jinsi inavyofanya kazi",
    language: "Lugha",
    demoBanner: "Hali ya majaribio — matokeo yameigizwa na yamewekewa alama.",
    advisory: "Ushauri wa awali wa mazao — si utambuzi wa uhakika",
    backHome: "Rudi mwanzo",
    loading: "Inapakia…",
    retry: "Jaribu tena",
    startOver: "Anza ukaguzi mwingine",
    crop: "Zao",
    region: "Kaunti au eneo",
    created: "Imeundwa",
    confidence: "uhakika",
    lowConfidence: "Uhakika mdogo",
    moderateConfidence: "Uhakika wa wastani",
    highConfidence: "Uhakika mkubwa",
    lowUrgency: "Haraka ndogo",
    moderateUrgency: "Fuatilia kwa karibu",
    highUrgency: "Inahitaji hatua ya haraka",
    simulated: "Onyesho la kuigiza",
    verified: "Usalama umekaguliwa",
    noReports: "Bado hakuna ripoti",
    errorTitle: "Hatukuweza kukamilisha ombi hilo",
    privacy: "Faragha ni msingi. Hatukusanyi majina wala mahali kamili.",
  },
} as const;

export type TranslationKey = keyof (typeof dictionary)["en"];

export function t(language: Language, key: TranslationKey): string {
  return dictionary[language][key];
}

export const cropNames: Record<Language, Record<string, string>> = {
  en: { tomato: "Tomato", onion: "Onion", kale: "Kale / sukuma wiki" },
  sw: { tomato: "Nyanya", onion: "Kitunguu", kale: "Sukuma wiki" },
};

export const categoryNames: Record<Language, Record<string, string>> = {
  en: {
    fungal_disease: "Fungal disease",
    bacterial_disease: "Bacterial disease",
    viral_disease: "Viral symptoms",
    pest: "Pest damage",
    nutrient_deficiency: "Nutrient deficiency",
    environmental_stress: "Environmental stress",
  },
  sw: {
    fungal_disease: "Ugonjwa wa kuvu",
    bacterial_disease: "Ugonjwa wa bakteria",
    viral_disease: "Dalili za virusi",
    pest: "Uharibifu wa wadudu",
    nutrient_deficiency: "Upungufu wa virutubisho",
    environmental_stress: "Msongo wa mazingira",
  },
};
