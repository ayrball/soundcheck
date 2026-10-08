import type { Emissions } from "../lib/ctc";
import { logSoftmax } from "../lib/ctc";
import { CANDIDATE_TOKENS, toWords, type PhonemizedWord } from "../lib/phones";
import { assess, type AssessOptions, type Assessment } from "../lib/score";
import vocabJson from "./vocab.json";

/** wav2vec2-large fine-tuned to output eSpeak IPA phones; multilingual, so it also hears non-English sounds. */
export const MODEL_ID = "onnx-community/wav2vec2-lv-60-espeak-cv-ft-ONNX";
/** 8-bit weights: ~318 MB, accuracy close to full precision. */
export const MODEL_DTYPE = "q8";
export const SAMPLE_RATE = 16_000;

export const VOCAB: Record<string, number> = vocabJson;

const ALLOWED_IDS = [VOCAB["<pad>"], ...CANDIDATE_TOKENS.map((t) => VOCAB[t])];

export function emissionsFromLogits(logits: { data: unknown; dims: number[] }): Emissions {
  const [, T, V] = logits.dims;
  return logSoftmax(logits.data as Float32Array, T, V, ALLOWED_IDS);
}

export function analyzeLogits(
  logits: { data: unknown; dims: number[] },
  words: PhonemizedWord[],
  opts?: AssessOptions,
): Assessment {
  return assess(emissionsFromLogits(logits), words, VOCAB, opts);
}

export async function phonemizeText(
  phonemize: (text: string, lang: string) => Promise<string[]>,
  text: string,
): Promise<PhonemizedWord[]> {
  return toWords(await phonemize(text, "en-us"), text);
}
