// Phone inventory and tokenisation for the wav2vec2-lv-60-espeak-cv-ft model.
// The model emits eSpeak-style IPA tokens (some multi-character, e.g. "aɪ", "ɑːɹ").
// We turn eSpeak strings from the phonemizer into the same tokens it was trained on.

/** Tokens eSpeak en-us produces. Used to tokenise expected pronunciations. */
export const ENGLISH_TOKENS = [
  // consonants
  "p", "b", "t", "d", "k", "ɡ", "f", "v", "θ", "ð", "s", "z", "ʃ", "ʒ", "h",
  "tʃ", "dʒ", "m", "n", "ŋ", "l", "ɹ", "w", "j", "ɾ", "ʔ", "n̩",
  // vowels and diphthongs
  "ɪ", "iː", "i", "ɛ", "æ", "ʌ", "ʊ", "uː", "ə", "ɚ", "ɜː", "ɑː", "ɔː", "oː",
  "ɔ", "oʊ", "eɪ", "aɪ", "aʊ", "ɔɪ", "ᵻ", "ɐ", "əl",
  // r-coloured / triphthong tokens
  "ɑːɹ", "ɔːɹ", "oːɹ", "ɛɹ", "ɪɹ", "ʊɹ", "aɪɚ", "aɪə",
] as const;

/**
 * The sounds the model may choose between: English, plus a few non-English consonants
 * that reveal a first-language habit (rolled r, French r, Spanish j, Spanish soft b,
 * Japanese f). Everything else the multilingual model knows is masked out: on isolated
 * words it otherwise labels native English vowels as generic "a", "o", "e" and cries wolf.
 */
export const CANDIDATE_TOKENS = [...ENGLISH_TOKENS, "r", "ʁ", "x", "β", "ɸ"] as const;

/**
 * Pronunciations that count as correct for an expected sound: normal American variation
 * (cot/caught merger, flapped or glottal t, reduced vowels) and labels the model uses
 * interchangeably for the same sound. A drill's own contrast sounds are never accepted.
 */
export const ACCEPTABLE_VARIANTS: Record<string, string[]> = {
  "ʊ": ["ʌ", "ɔ", "oː", "ə", "əl"],
  "ʌ": ["ɐ", "ə", "ɑː", "ɔ"],
  "ə": ["ɐ", "ɪ", "ᵻ", "ʌ", "ɚ"],
  "ɐ": ["ə", "ʌ", "ɑː"],
  "ᵻ": ["ɪ", "ə", "i"],
  "i": ["iː", "ɪ"],
  "ɜː": ["ɚ"],
  "ɚ": ["ɜː", "ə"],
  "ɑː": ["ɔː", "ɔ"],
  "ɔː": ["ɑː", "ɔ"],
  "ɔ": ["ɑː", "ɔː"],
  "oːɹ": ["ɔːɹ"],
  "ɔːɹ": ["oːɹ"],
  "əl": ["l"],
  "n̩": ["n"],
  "ɾ": ["t", "d"],
  "t": ["ɾ", "ʔ"],
  "d": ["ɾ"],
  "ʔ": ["t"],
};

const VOWEL_CHARS = new Set("aeiouɐɑɒæɛəɚɜɪɔʊʌᵻyøœɨʉɯɤɘɵ");

/** Merged tokens that only apply when the r / l is not followed by a vowel (r-coloured vowels, syllabic l). */
const NEEDS_NON_VOWEL_AFTER = new Set(["ɑːɹ", "ɔːɹ", "oːɹ", "ɛɹ", "ɪɹ", "ʊɹ", "əl"]);

const SORTED = [...CANDIDATE_TOKENS].sort((a, b) => b.length - a.length);

/** Split one eSpeak word (stress marks allowed) into model tokens. Unknown characters are skipped. */
export function tokenizeWord(ipa: string): string[] {
  const s = ipa.replace(/[ˈˌ‿-]/g, "").normalize("NFC");
  const out: string[] = [];
  let i = 0;
  outer: while (i < s.length) {
    for (const tok of SORTED) {
      if (!s.startsWith(tok, i)) continue;
      if (NEEDS_NON_VOWEL_AFTER.has(tok)) {
        const next = s[i + tok.length];
        if (next !== undefined && VOWEL_CHARS.has(next)) continue;
      }
      out.push(tok);
      i += tok.length;
      continue outer;
    }
    i++;
  }
  return out;
}

export interface PhonemizedWord {
  /** The written word this group of phones belongs to, if we could match it up. */
  text: string | null;
  ipa: string;
  tokens: string[];
}

/**
 * Turn phonemizer output (one or more eSpeak strings) into words of tokens.
 * When the number of eSpeak words matches the written words we label each group.
 */
export function toWords(espeak: string[], written: string): PhonemizedWord[] {
  const ipaWords = espeak.join(" ").split(/\s+/).filter(Boolean);
  const writtenWords = written
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, ""))
    .filter(Boolean);
  const labelled = ipaWords.length === writtenWords.length;
  return ipaWords.map((ipa, i) => ({
    text: labelled ? writtenWords[i] : null,
    ipa: ipa.replace(/[ˈˌ]/g, ""),
    tokens: tokenizeWord(ipa),
  }));
}

/** Map a raw model token to something worth showing (drops tone digits and junk). */
export function displayToken(tok: string): string {
  return tok.replace(/[0-9.^[\]"]/g, "") || tok;
}

export const VOWEL_TOKENS: ReadonlySet<string> = new Set<string>(
  CANDIDATE_TOKENS.filter((t) => VOWEL_CHARS.has(t[0]) && t !== "əl"),
);

export function isVowel(tok: string): boolean {
  return VOWEL_TOKENS.has(tok);
}
