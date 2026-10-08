import type { PhonemizedWord } from "../lib/phones";
import type { AssessOptions, Assessment } from "../lib/score";

export type Request =
  | { type: "load" }
  | { type: "phonemize"; id: number; text: string }
  | { type: "analyze"; id: number; audio: Float32Array; text: string; opts: AssessOptions };

export type Response =
  | { type: "progress"; loaded: number; total: number }
  | { type: "ready"; threads: boolean }
  | { type: "phonemized"; id: number; words: PhonemizedWord[] }
  | { type: "result"; id: number; result: Assessment; words: PhonemizedWord[]; ms: number }
  | { type: "error"; id?: number; message: string };
