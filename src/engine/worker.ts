/// <reference lib="webworker" />
// Runs the phonemizer and the speech model off the main thread.

import { AutoFeatureExtractor, AutoModelForCTC, env } from "@huggingface/transformers";
import { phonemize } from "phonemizer";
import type { PhonemizedWord } from "../lib/phones";
import type { AssessOptions } from "../lib/score";
import { analyzeLogits, MODEL_DTYPE, MODEL_ID, phonemizeText } from "./model";
import type { Request, Response } from "./protocol";

env.allowLocalModels = false;

type Loaded = {
  fe: Awaited<ReturnType<typeof AutoFeatureExtractor.from_pretrained>>;
  model: Awaited<ReturnType<typeof AutoModelForCTC.from_pretrained>>;
};
let loading: Promise<Loaded> | null = null;

const post = (msg: Response) => self.postMessage(msg);

function load(): Promise<Loaded> {
  loading ??= (async () => {
    const files = new Map<string, { loaded: number; total: number }>();
    const progress_callback = (p: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (p.status !== "progress" || !p.file || !p.total) return;
      files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
      let loaded = 0;
      let total = 0;
      for (const f of files.values()) {
        loaded += f.loaded;
        total += f.total;
      }
      post({ type: "progress", loaded, total });
    };
    const fe = await AutoFeatureExtractor.from_pretrained(MODEL_ID, { progress_callback });
    const model = await AutoModelForCTC.from_pretrained(MODEL_ID, {
      dtype: MODEL_DTYPE,
      device: "wasm",
      progress_callback,
    });
    // Warm up so the first real recording is not slow.
    await model(await fe(new Float32Array(16_000)));
    return { fe, model };
  })();
  return loading;
}

async function analyze(id: number, audio: Float32Array, input: string | PhonemizedWord[], opts: AssessOptions) {
  const { fe, model } = await load();
  const words = typeof input === "string" ? await phonemizeText(phonemize, input) : input;
  const t0 = performance.now();
  const { logits } = await model(await fe(audio));
  const result = analyzeLogits(logits, words, opts);
  post({ type: "result", id, result, words, ms: Math.round(performance.now() - t0) });
}

self.onmessage = async (e: MessageEvent<Request>) => {
  const msg = e.data;
  try {
    switch (msg.type) {
      case "load":
        await load();
        post({ type: "ready", threads: (self as unknown as { crossOriginIsolated: boolean }).crossOriginIsolated });
        break;
      case "phonemize":
        post({ type: "phonemized", id: msg.id, words: await phonemizeText(phonemize, msg.text) });
        break;
      case "analyze":
        await analyze(msg.id, msg.audio, msg.input, msg.opts);
        break;
    }
  } catch (err) {
    if (msg.type === "load") loading = null;
    post({ type: "error", id: "id" in msg ? msg.id : undefined, message: err instanceof Error ? err.message : String(err) });
  }
};
