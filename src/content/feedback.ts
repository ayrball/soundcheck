// Plain-language names for sounds, how to make them, and what to do about common swaps.

export interface SoundInfo {
  /** how a learner would name it: "th as in think" */
  name: string;
  /** a short instruction for making the sound */
  how?: string;
}

export const SOUNDS: Record<string, SoundInfo> = {
  "θ": { name: "th as in think", how: "Put the tip of your tongue lightly between your teeth and blow. No buzz in your throat." },
  "ð": { name: "th as in this", how: "Tongue tip between your teeth, like think, but turn your voice on so your throat buzzes." },
  s: { name: "s as in see", how: "Tongue tip just behind your top teeth, not touching them. A thin hiss, no buzz." },
  z: { name: "z as in zoo", how: "Same as s, with your voice on. Put a hand on your throat and feel it buzz." },
  t: { name: "t as in top", how: "Tongue tip taps the ridge behind your top teeth, then lets out a small puff of air." },
  d: { name: "d as in day", how: "Like t, with your voice on." },
  f: { name: "f as in fan", how: "Top teeth rest on your lower lip. Blow air through. No buzz." },
  v: { name: "v as in very", how: "Top teeth on your lower lip with your voice on: your lip should tickle. Lips don't round." },
  w: { name: "w as in wet", how: "Round your lips like a small 'oo', then open them. Teeth stay off your lip." },
  b: { name: "b as in boy", how: "Close both lips, voice on, then pop them open." },
  p: { name: "p as in pen", how: "Close both lips, then release a strong puff of air. A tissue held in front should move." },
  "ɹ": { name: "r as in red", how: "Curl your tongue tip up and back without touching the roof of your mouth. Round your lips a little. Don't tap or roll it." },
  l: { name: "l as in light", how: "Press your tongue tip firmly on the ridge behind your top teeth and let air flow around the sides." },
  "əl": { name: "l as in people", how: "Finish with your tongue tip on the ridge behind your top teeth. Don't turn it into 'oo' or 'w'." },
  n: { name: "n as in no", how: "Tongue tip on the ridge behind your top teeth; air comes out through your nose." },
  m: { name: "m as in me" },
  "ŋ": { name: "ng as in sing", how: "Raise the back of your tongue against the soft roof of your mouth, air through your nose. Don't add a g or k at the end." },
  h: { name: "h as in hat", how: "Just breathe out softly, like fogging a mirror, then say the vowel. No scraping in your throat." },
  "ʃ": { name: "sh as in she", how: "Push your lips forward and round them; pull your tongue back a little from s. A wide hush." },
  "tʃ": { name: "ch as in chair", how: "Start with your tongue touching the ridge like a t, then release into sh. One short burst." },
  "dʒ": { name: "j as in jet", how: "Like ch with your voice on: tongue touches the ridge, then releases." },
  "ʒ": { name: "s as in measure" },
  j: { name: "y as in yes", how: "Raise your tongue close to the roof of your mouth without touching it, then glide into the vowel." },
  k: { name: "k as in key", how: "Back of the tongue touches the soft roof of your mouth, then releases with a puff of air." },
  "ɡ": { name: "g as in go", how: "Like k, with your voice on." },
  "ɪ": { name: "i as in ship", how: "Short and relaxed. Lips loose, tongue a little lower than for ee." },
  "iː": { name: "ee as in sheep", how: "Long and tense. Spread your lips like a smile and hold the sound." },
  i: { name: "y as in happy" },
  "ɛ": { name: "e as in bed", how: "Jaw half open, tongue in the middle. Less open than the a in cat." },
  "æ": { name: "a as in cat", how: "Drop your jaw and spread your lips; tongue low and forward. Wider than the e in bed." },
  "ʌ": { name: "u as in cup", how: "Short and relaxed, mouth slightly open, tongue in the centre: a quick 'uh'." },
  "ʊ": { name: "oo as in book", how: "Short and relaxed, lips slightly rounded, not pushed forward." },
  "uː": { name: "oo as in food", how: "Long, with lips tightly rounded and pushed forward." },
  "ɜː": { name: "er as in bird", how: "Tongue in the middle of your mouth with the tip slightly curled back. Lips relaxed. Hold it." },
  "ɚ": { name: "er as in water" },
  "ə": { name: "the weak 'uh' in about" },
  "ɐ": { name: "the weak 'uh' in about" },
  "ᵻ": { name: "the weak i in buses" },
  "ɑː": { name: "o as in hot" },
  "ɔː": { name: "aw as in law" },
  "ɔ": { name: "o as in on" },
  "oʊ": { name: "o as in go" },
  "eɪ": { name: "ay as in day" },
  "aɪ": { name: "i as in time" },
  "aʊ": { name: "ow as in now" },
  "ɔɪ": { name: "oy as in boy" },
  "ɑːɹ": { name: "ar as in car" },
  "ɔːɹ": { name: "or as in for" },
  "oːɹ": { name: "or as in more" },
  "ɛɹ": { name: "air as in hair" },
  "ɪɹ": { name: "ear as in near" },
  "ʊɹ": { name: "oor as in poor" },
  "ɾ": { name: "the quick t in water" },
  r: { name: "a rolled r" },
  "ʁ": { name: "a throat r (French/German style)" },
  x: { name: "a scraped h (Spanish j)" },
  "β": { name: "a soft b with lips not quite closed" },
  "ɸ": { name: "an f made with both lips (Japanese fu)" },
  "ʔ": { name: "a catch in the throat" },
};

/** Specific advice when we heard `heard` where `expected` should be. "" = sound missing. */
const SWAPS: Record<string, string> = {
  "θ>s": "That came out as s. Let your tongue tip touch your top teeth, then blow.",
  "θ>t": "That came out as t: your tongue stopped the air. Keep the air flowing between your teeth.",
  "θ>f": "That came out as f, made with your lip. Use your tongue between your teeth instead.",
  "ð>d": "That came out as d. Don't stop the air; let it flow over your tongue between your teeth.",
  "ð>z": "That came out as z. Bring your tongue forward until it touches your teeth.",
  "s>θ": "That came out as th. Keep your tongue behind your teeth.",
  "t>θ": "That came out as th. Tap the ridge behind your teeth instead of touching your teeth.",
  "f>θ": "That came out as th. Use your top teeth on your lower lip.",
  "d>ð": "That came out as th. Tap the ridge behind your teeth for a quick d.",
  "z>ð": "That came out as th. Keep your tongue behind your teeth.",
  "ɹ>l": "That sounded like l. Pull your tongue tip back so it doesn't touch the roof of your mouth.",
  "l>ɹ": "That sounded like r. Press your tongue tip firmly on the ridge behind your top teeth.",
  "ɹ>r": "That was a rolled r. English r doesn't vibrate: curl your tongue back and hold it still.",
  "ɹ>ɾ": "That was a tapped r. Don't let your tongue touch the roof of your mouth; curl it back and hold it.",
  "ɹ>ʁ": "That r came from your throat. Make it with your tongue tip curled back instead.",
  "ɹ>w": "That sounded like w. Curl your tongue tip back as well as rounding your lips.",
  "v>w": "That came out as w. Touch your top teeth to your lower lip.",
  "w>v": "That came out as v. Keep your teeth off your lip and round your lips instead.",
  "v>b": "That came out as b. Don't close your lips; let air buzz between your teeth and lower lip.",
  "v>β": "Your lips came together. Use your top teeth on your lower lip.",
  "v>f": "No buzz: that was f. Turn your voice on.",
  "b>v": "That came out as v. Close your lips fully, then pop them open.",
  "b>β": "Your lips didn't fully close. Press them together, then pop them open.",
  "f>p": "That came out as p. Don't close your lips: teeth on your lower lip, then blow.",
  "f>ɸ": "That f was made with both lips. Use your top teeth on your lower lip.",
  "f>v": "That buzzed like v. Turn your voice off.",
  "p>f": "That came out as f. Close both lips completely first.",
  "p>b": "That sounded like b. Add a strong puff of air when your lips open.",
  "b>p": "That sounded like p. Turn your voice on before your lips open.",
  "ɪ>iː": "Too long and tense: that sounded like ee. Relax your lips and keep it short.",
  "iː>ɪ": "Too short: that sounded like the i in ship. Smile and stretch the sound.",
  "æ>ɛ": "Not open enough: that sounded like the e in bed. Drop your jaw more.",
  "ɛ>æ": "Too open: that sounded like the a in cat. Raise your jaw a little.",
  "æ>ʌ": "That sounded like the u in cut. Spread your lips and open wider.",
  "ʌ>æ": "Too wide: that sounded like the a in cat. Relax your lips; keep it a short 'uh'.",
  "ʊ>uː": "Too long: that sounded like oo in food. Relax your lips and keep it short.",
  "uː>ʊ": "Too short. Round and push your lips forward, and hold the sound.",
  "ʃ>s": "That came out as s. Round your lips and pull your tongue back a little.",
  "s>ʃ": "That came out as sh. Spread your lips and move your tongue tip forward.",
  "ʃ>tʃ": "There was a stop at the start, which makes ch. Let the air flow from the beginning.",
  "tʃ>ʃ": "There was no stop, which makes sh. Start with your tongue touching the ridge, like t.",
  "tʃ>t": "That came out as t. Let the release slide into sh.",
  "dʒ>j": "That came out as y. Start with your tongue touching the roof of your mouth, like d.",
  "dʒ>z": "That came out as z. Start with your tongue touching the ridge, like d.",
  "j>dʒ": "That came out as j. Don't let your tongue touch the roof of your mouth.",
  "z>s": "No buzz: that came out as s. Turn your voice on and feel your throat vibrate.",
  "z>dʒ": "That came out as j. Keep your tongue off the ridge: just a buzzing hiss.",
  "s>z": "That buzzed like z. Turn your voice off.",
  "d>t": "No buzz at the end: that sounded like t. Keep your voice on, and make the vowel before it a little longer.",
  "ɡ>k": "No buzz at the end: that sounded like k. Keep your voice on, and make the vowel before it a little longer.",
  "t>d": "That buzzed like d. Keep the end crisp and voiceless.",
  "k>ɡ": "That buzzed like g. Keep the end crisp and voiceless.",
  "n>l": "That sounded like l. Let air come out through your nose.",
  "l>n": "That sounded like n. Air goes around the sides of your tongue, not through your nose.",
  "ŋ>n": "That came out as n. Use the back of your tongue, not the tip.",
  "n>ŋ": "That came out as ng. Use your tongue tip, on the ridge behind your teeth.",
  "h>x": "Too much scrape in your throat. English h is just a soft breath.",
  "ɜː>ɑː": "Too open. Keep your mouth half closed and curl your tongue tip back.",
  "ɜː>ɔː": "Your lips rounded. Keep them relaxed and curl your tongue tip back.",
  "əl>ʊ": "That l turned into oo. Finish with your tongue tip on the ridge behind your teeth.",
  "l>ʊ": "That l turned into oo. Finish with your tongue tip on the ridge behind your teeth.",
  "l>w": "That l turned into w. Finish with your tongue tip on the ridge behind your teeth.",
};

export function nameOf(tok: string): string {
  return SOUNDS[tok]?.name ?? `/${tok}/`;
}

export function adviceFor(expected: string, heard: string | null): string {
  if (heard === "") {
    if (expected === "h") return "The h was missing. Breathe out softly before the vowel.";
    return `The ${nameOf(expected)} sound was missing. Make sure you say it, even at the end of the word.`;
  }
  if (heard) {
    const swap = SWAPS[`${expected}>${heard}`];
    if (swap) return swap;
    const how = SOUNDS[expected]?.how;
    return `That sounded more like ${nameOf(heard)}.${how ? " " + how : ""}`;
  }
  return SOUNDS[expected]?.how ?? `Listen to the model again and copy the ${nameOf(expected)} sound.`;
}

export function insertionAdvice(token: string, before: string | null): string {
  return before
    ? `You added an extra vowel (${nameOf(token)}) after the ${nameOf(before)}. Go straight on to the next sound.`
    : `You added an extra vowel (${nameOf(token)}) at the start. Begin directly with the consonant.`;
}
