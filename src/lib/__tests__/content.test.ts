import { phonemize } from "phonemizer";
import { describe, expect, it } from "vitest";
import { CONTRASTS, focusIndex } from "../../content/contrasts";
import { LANGUAGES } from "../../content/languages";
import { tokenizeWord, toWords } from "../phones";

async function tokens(word: string) {
  const words = toWords(await phonemize(word, "en-us"), word);
  expect(words, `"${word}" should be one word`).toHaveLength(1);
  return words[0].tokens;
}

describe("content", () => {
  it("every language points at real contrasts", () => {
    const ids = new Set(CONTRASTS.map((c) => c.id));
    for (const l of LANGUAGES) for (const f of l.focus) expect(ids.has(f), `${l.id} → ${f}`).toBe(true);
  });

  for (const c of CONTRASTS) {
    it(`${c.id}: drills contain their focus sound and differ from their partner`, async () => {
      for (const d of c.drills) {
        const t = await tokens(d.word);
        expect(focusIndex(t, d.focus, c.focusAt), `${d.word} /${t.join(" ")}/ lacks ${d.focus}`).toBeGreaterThanOrEqual(0);
        if (d.partner) {
          const p = await tokens(d.partner);
          expect(p.join(" "), `${d.word} vs ${d.partner}`).not.toBe(t.join(" "));
        }
      }
    });
  }
});

describe("tokenizeWord", () => {
  it("splits r-coloured vowels only before consonants", () => {
    expect(tokenizeWord("vˈɛɹi")).toEqual(["v", "ɛ", "ɹ", "i"]);
    expect(tokenizeWord("kˈɑːɹ")).toEqual(["k", "ɑːɹ"]);
    expect(tokenizeWord("pəlˈaɪt")).toEqual(["p", "ə", "l", "aɪ", "t"]);
    expect(tokenizeWord("pˈiːpəl")).toEqual(["p", "iː", "p", "əl"]);
    expect(tokenizeWord("kˈæts")).toEqual(["k", "æ", "t", "s"]);
  });

  it("covers common English text", async () => {
    const text =
      "The quick brown fox jumps over the lazy dog. She sells seashells by the seashore. " +
      "I would like a cup of coffee and a bottle of water, please. Where are you from? " +
      "Thank you very much for your help yesterday. My brother's birthday party was fantastic. " +
      "Could you tell me how to get to the nearest train station? Our hour-long meeting finished early. " +
      "Usually measure the pleasure of a beautiful journey through the mountains. Button, kitten, little, fire, hire, poor, tour, near, chair.";
    const words = toWords(await phonemize(text, "en-us"), text);
    expect(words.length).toBeGreaterThan(50);
  });
});
