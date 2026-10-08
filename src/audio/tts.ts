// Model pronunciation through the browser's built-in voices (American English).

const PREFERRED = [/natural/i, /aria|jenny|guy|ava|andrew|emma|brian/i, /google us english/i, /samantha|alex/i];

let cached: SpeechSynthesisVoice | null = null;

function pickVoice(): SpeechSynthesisVoice | null {
  if (cached) return cached;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.replace("_", "-").startsWith("en-US"));
  for (const re of PREFERRED) {
    const v = voices.find((v) => re.test(v.name));
    if (v) return (cached = v);
  }
  return (cached = voices[0] ?? null);
}

if (typeof speechSynthesis !== "undefined") {
  speechSynthesis.onvoiceschanged = () => {
    cached = null;
  };
}

export const canSpeak = typeof speechSynthesis !== "undefined";

export function speak(text: string, slow = false): Promise<void> {
  if (!canSpeak) return Promise.resolve();
  speechSynthesis.cancel();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) u.voice = voice;
    u.lang = "en-US";
    u.rate = slow ? 0.6 : 0.9;
    u.onend = () => resolve();
    u.onerror = () => resolve();
    speechSynthesis.speak(u);
  });
}
