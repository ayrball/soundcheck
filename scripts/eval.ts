// Measures how well scoring separates right from wrong sounds, using TTS recordings.
//   own:   recording of "think" scored as "think"   → focus sound should score high
//   cross: recording of "sink"  scored as "think"   → focus sound should score low, heard as "s"
// Run `python scripts/make-tts.py` first.
import fs from "node:fs";
import path from "node:path";
import { AutoFeatureExtractor, AutoModelForCTC, env } from "@huggingface/transformers";
import { phonemize } from "phonemizer";
import { carrierWords } from "../src/content/carrier";
import { CONTRASTS, focusIndex } from "../src/content/contrasts";
import { analyzeLogits, MODEL_DTYPE, MODEL_ID, phonemizeText } from "../src/engine/model";
import { THRESHOLDS } from "../src/lib/score";

env.cacheDir = "./.model-cache";
const carrier = process.argv.includes("--carrier");
const ROOT = carrier ? "test-audio/tts-carrier" : "test-audio/tts";
const voices = (process.argv.slice(2).find((a) => !a.startsWith("-"))?.split(",") ?? fs.readdirSync(ROOT)).filter((v) => v.startsWith("en-"));
const verbose = process.argv.includes("-v");

function readWav(p: string): Float32Array {
  const b = fs.readFileSync(p);
  let off = 12;
  while (off < b.length) {
    const id = b.toString("ascii", off, off + 4);
    const size = b.readUInt32LE(off + 4);
    if (id === "data") {
      const out = new Float32Array(size / 2);
      for (let i = 0; i < out.length; i++) out[i] = b.readInt16LE(off + 8 + i * 2) / 32768;
      return out;
    }
    off += 8 + size;
  }
  throw new Error("no data chunk in " + p);
}

const fe = await AutoFeatureExtractor.from_pretrained(MODEL_ID);
const model = await AutoModelForCTC.from_pretrained(MODEL_ID, { dtype: MODEL_DTYPE });
const logitCache = new Map<string, { data: unknown; dims: number[] }>();
async function logitsFor(file: string) {
  if (!logitCache.has(file)) {
    const { logits } = await model(await fe(readWav(file)));
    logitCache.set(file, logits);
  }
  return logitCache.get(file)!;
}

const own: number[] = [];
const cross: number[] = [];
let crossHeardRight = 0;
let falseInsertions = 0;
let ms = 0;
const misses: string[] = [];
for (const c of CONTRASTS) {
  for (const d of c.drills) {
    const loneWord = (await phonemizeText(phonemize, d.word))[0];
    const lone = loneWord.tokens;
    const words = carrier ? await carrierWords((t) => phonemizeText(phonemize, t), loneWord) : [loneWord];
    const wi = words.findIndex((w) => w.text?.toLowerCase() === d.word);
    const fi = words.slice(0, wi).reduce((n, w) => n + w.tokens.length, 0) + focusIndex(lone, d.focus, c.focusAt);
    const partnerTokens = d.partner ? (await phonemizeText(phonemize, d.partner))[0].tokens : null;
    const opts = {
      strict: [...c.sounds, ...(partnerTokens ?? []).filter((t) => !lone.includes(t))],
      unreleasedFinals: !c.strictFinals,
    };
    for (const v of voices) {
      const t0 = performance.now();
      const a = analyzeLogits(await logitsFor(path.join(ROOT, v, d.word + ".wav")), words, opts);
      ms += performance.now() - t0;
      own.push(a.phones[fi].score);
      if (a.insertions.length) {
        falseInsertions++;
        misses.push(`EXTRA VOWEL ${v} "${d.word}" ${a.insertions.map((x) => `+${x.token}@${x.afterPhone}`).join(" ")} heard=${a.heard.join(" ")}`);
      }
      if (a.phones[fi].score < THRESHOLDS.fair) misses.push(`FALSE ALARM ${v} "${d.word}" ${a.phones[fi].token}=${a.phones[fi].score.toFixed(2)} heard=${a.heard.join(" ")}`);
      if (!d.partner || !partnerTokens) continue;
      const b = analyzeLogits(await logitsFor(path.join(ROOT, v, d.partner + ".wav")), words, opts);
      const p = b.phones[fi];
      cross.push(p.score);
      const expectedHeard = partnerTokens.find((t) => !lone.includes(t)) ?? "";
      if (p.status !== "good") crossHeardRight += p.heard === expectedHeard || (partnerTokens.length < lone.length && p.heard === "") ? 1 : 0;
      if (p.score >= THRESHOLDS.good) misses.push(`MISSED ${v} "${d.partner}" as "${d.word}" ${p.token}=${p.score.toFixed(2)} heard=${b.heard.join(" ")}`);
      if (verbose) console.log(`${v.padEnd(20)} ${d.word.padEnd(9)} own ${a.phones[fi].score.toFixed(2)}  ${d.partner.padEnd(9)} cross ${p.score.toFixed(2)} heard=${p.heard ?? "-"}`);
    }
  }
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;
console.log(misses.join("\n"));
console.log(`\nvoices: ${voices.join(", ")}`);
console.log(`correct sounds   n=${own.length}  mean=${mean(own).toFixed(3)}  rated good=${pct(own.filter((s) => s >= THRESHOLDS.good).length, own.length)}  flagged poor=${pct(own.filter((s) => s < THRESHOLDS.fair).length, own.length)}`);
console.log(`swapped sounds   n=${cross.length}  mean=${mean(cross).toFixed(3)}  flagged poor=${pct(cross.filter((s) => s < THRESHOLDS.fair).length, cross.length)}  not rated good=${pct(cross.filter((s) => s < THRESHOLDS.good).length, cross.length)}  heard-as correct=${pct(crossHeardRight, cross.filter((s) => s < THRESHOLDS.good).length)}`);
console.log(`extra vowel reported on a correct recording: ${pct(falseInsertions, own.length)}`);
console.log(`scoring time ${(ms / own.length).toFixed(1)} ms per word`);
