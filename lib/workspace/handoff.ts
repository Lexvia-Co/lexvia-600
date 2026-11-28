import type { AnswerKey, Answers } from "./model";

export const transferLabels = {
  familyName: "Family name",
  givenNames: "Given names",
  birthDate: "Date of birth",
  passportExpiry: "Date of expiry",
  email: "Email address",
  arrivalDate: "Planned arrival date",
  departureDate: "Planned final departure date",
  travelHistory: "Travel history",
  accommodation: "Accommodation arrangements",
  fundingDetails: "Funds available for the visit",
  occupation: "Occupation",
} as const satisfies Partial<Record<AnswerKey, string>>;

export const wordingKeys = ["travelHistory", "accommodation", "fundingDetails", "occupation"] as const;
export type WordingKey = typeof wordingKeys[number];
export type EnglishEntry = { text: string; confirmed: boolean };
export type EnglishWording = Partial<Record<WordingKey, EnglishEntry>>;

export function needsEnglishReview(key: AnswerKey): key is WordingKey {
  return wordingKeys.some(field => field === key);
}

// Applicants confirm the meaning. Screen out blank or visibly untranslated Mandarin.
export function canConfirmEnglish(text: string) {
  return text.trim().length > 0 && !/\p{Script=Han}/u.test(text);
}

export function validEnglishWording(value: unknown): value is EnglishWording {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.entries(value).every(([key, entry]) => wordingKeys.some(field => field === key)
    && entry !== null && typeof entry === "object" && !Array.isArray(entry)
    && Object.keys(entry).every(part => part === "text" || part === "confirmed")
    && typeof entry.text === "string" && entry.text.length <= 4000 && typeof entry.confirmed === "boolean"
    && (!entry.confirmed || canConfirmEnglish(entry.text)));
}

export function invalidateChangedWording(wording: EnglishWording, previous: Answers, next: Answers) {
  const updated = { ...wording };
  for (const key of wordingKeys) {
    const entry = updated[key];
    if (entry && previous[key] !== next[key]) updated[key] = { ...entry, confirmed: false };
  }
  return updated;
}
