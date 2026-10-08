import type { PhonemizedWord } from "../lib/phones";

// Drill words are said inside a short phrase. The model judges sounds more reliably with
// some speech around them, and a following consonant ("with") keeps final t/d from
// turning into a flap and keeps an added vowel ("desk-u") audible.
// scripts/make-tts.py uses the same phrase for test recordings.
export const CARRIER = { before: "Say", after: "with me." };

export const carrierPhrase = (word: string) => `${CARRIER.before} ${word} ${CARRIER.after}`;

/**
 * Expected phones for the phrase, using the word's own pronunciation (the one on screen).
 * Phonemizing the whole phrase can change it: "Say live with me" reads as /laɪv/.
 */
export async function carrierWords(
  phonemize: (text: string) => Promise<PhonemizedWord[]>,
  word: PhonemizedWord,
): Promise<PhonemizedWord[]> {
  const [before, after] = await Promise.all([phonemize(CARRIER.before), phonemize(CARRIER.after)]);
  return [...before, word, ...after];
}
