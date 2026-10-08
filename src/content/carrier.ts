// Drill words are said inside a short phrase. The model judges sounds more reliably with
// some speech around them, and a following consonant ("with") keeps final t/d from
// turning into a flap and keeps an added vowel ("desk-u") audible.
// scripts/make-tts.py uses the same phrase for test recordings.
export const CARRIER = { before: "Say", after: "with me." };

export const carrierPhrase = (word: string) => `${CARRIER.before} ${word} ${CARRIER.after}`;
