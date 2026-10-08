import { describe, expect, it } from "vitest";
import { ctcLogLikelihood, forcedAlign, greedyDecode, logSoftmax } from "../ctc";
import { assess, findInsertions } from "../score";
import vocab from "../../engine/vocab.json";

const V = 392;
const id = (t: string) => (vocab as Record<string, number>)[t];

/** Fake model output: each entry is one frame dominated by a token ("" = blank). */
function emissions(frames: string[], confidence = 8) {
  const logits = new Float32Array(frames.length * V);
  frames.forEach((tok, t) => (logits[t * V + (tok ? id(tok) : 0)] = confidence));
  return logSoftmax(logits, frames.length, V);
}

const word = (tokens: string[]) => [{ text: "w", ipa: tokens.join(""), tokens }];

describe("ctc", () => {
  it("decodes and aligns a clean sequence", () => {
    const em = emissions(["", "θ", "θ", "", "ɪ", "", "ŋ", "k", ""]);
    expect(greedyDecode(em).map((d) => d.id)).toEqual(["θ", "ɪ", "ŋ", "k"].map(id));
    expect(forcedAlign(em, ["θ", "ɪ", "ŋ", "k"].map(id))).toEqual([
      { start: 1, end: 2 },
      { start: 4, end: 4 },
      { start: 6, end: 6 },
      { start: 7, end: 7 },
    ]);
  });

  it("prefers the sequence that was actually said", () => {
    const em = emissions(["", "s", "", "ɪ", "ŋ", "k", ""]);
    expect(ctcLogLikelihood(em, ["s", "ɪ", "ŋ", "k"].map(id))).toBeGreaterThan(
      ctcLogLikelihood(em, ["θ", "ɪ", "ŋ", "k"].map(id)),
    );
  });
});

describe("assess", () => {
  it("scores a correct word high", () => {
    const a = assess(emissions(["", "θ", "", "ɪ", "", "ŋ", "k", ""]), word(["θ", "ɪ", "ŋ", "k"]), vocab);
    expect(a.phones.every((p) => p.status === "good")).toBe(true);
    expect(a.overall).toBeGreaterThan(0.9);
  });

  it("names the substituted sound", () => {
    const a = assess(emissions(["", "s", "", "ɪ", "", "ŋ", "k", ""]), word(["θ", "ɪ", "ŋ", "k"]), vocab);
    expect(a.phones[0]).toMatchObject({ status: "poor", heard: "s" });
    expect(a.phones.slice(1).every((p) => p.status === "good")).toBe(true);
  });

  it("reports a dropped sound as missing", () => {
    const a = assess(emissions(["", "b", "", "aɪ", "aɪ", "", ""]), word(["b", "aɪ", "k"]), vocab);
    expect(a.phones[2]).toMatchObject({ status: "poor", heard: "" });
  });

  it("accepts normal variants but not the drilled contrast", () => {
    const em = emissions(["", "k", "", "ɑː", "", "t", ""]);
    expect(assess(em, word(["k", "ʌ", "t"]), vocab).phones[1].status).toBe("good");
    expect(assess(em, word(["k", "ʌ", "t"]), vocab, { strict: ["ɑː"] }).phones[1].status).toBe("poor");
  });

  it("flags silence", () => {
    expect(assess(emissions(["", "", "", ""]), word(["θ", "ɪ", "ŋ", "k"]), vocab).silent).toBe(true);
  });
});

describe("findInsertions", () => {
  it("finds an added vowel", () => {
    const heard = ["ɛ", "s", "k", "uː", "l"].map((token) => ({ token, prob: 0.9 }));
    expect(findInsertions(heard, ["s", "k", "uː", "l"].map((token) => ({ token })))).toEqual([{ afterPhone: -1, token: "ɛ" }]);
  });
});
