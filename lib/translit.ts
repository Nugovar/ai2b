// Lightweight Georgian -> Latin transliteration for ADMIN display only (expert
// names, cities) when the admin UI language is English. Admin-only, so minor
// imperfections are acceptable. NEVER used on customer-entered data (lead names,
// what the user typed, advice, transcripts) - only on curated expert fields.

const MAP: Record<string, string> = {
  ა: "a", ბ: "b", გ: "g", დ: "d", ე: "e", ვ: "v", ზ: "z", თ: "t", ი: "i",
  კ: "k", ლ: "l", მ: "m", ნ: "n", ო: "o", პ: "p", ჟ: "zh", რ: "r", ს: "s",
  ტ: "t", უ: "u", ფ: "p", ქ: "k", ღ: "gh", ყ: "q", შ: "sh", ჩ: "ch", ც: "ts",
  ძ: "dz", წ: "ts", ჭ: "ch", ხ: "kh", ჯ: "j", ჰ: "h",
};

// Known city overrides for clean, expected spellings.
const CITIES: Record<string, string> = {
  თბილისი: "Tbilisi",
  ბათუმი: "Batumi",
  ქუთაისი: "Kutaisi",
  რუსთავი: "Rustavi",
  ზუგდიდი: "Zugdidi",
  გორი: "Gori",
  ფოთი: "Poti",
};

function capitalizeWords(s: string): string {
  return s.replace(/(^|\s)([a-z])/g, (_, sp, ch) => sp + ch.toUpperCase());
}

// Transliterate any Georgian string to Latin (non-Georgian chars pass through).
export function translit(input: string | undefined | null): string {
  if (!input) return "";
  let out = "";
  for (const ch of input) out += MAP[ch] ?? ch;
  return capitalizeWords(out);
}

// City with a known-name override, else transliteration.
export function translitCity(input: string | undefined | null): string {
  if (!input) return "";
  return CITIES[input.trim()] ?? translit(input);
}
