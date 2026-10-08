// Main-thread handle on the worker: one shared engine for the whole app.

import { useSyncExternalStore } from "react";
import type { PhonemizedWord } from "../lib/phones";
import type { AssessOptions, Assessment } from "../lib/score";
import type { Request, Response } from "./protocol";

export type EngineState =
  | { status: "idle" }
  | { status: "loading"; loaded: number; total: number }
  | { status: "ready"; threads: boolean }
  | { status: "error"; message: string };

export interface Analysis {
  result: Assessment;
  words: PhonemizedWord[];
  ms: number;
}

type Pending = { resolve: (v: never) => void; reject: (e: Error) => void };

class Engine {
  private worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
  private nextId = 1;
  private pending = new Map<number, Pending>();
  private listeners = new Set<() => void>();
  state: EngineState = { status: "idle" };

  constructor() {
    this.worker.onmessage = (e: MessageEvent<Response>) => this.receive(e.data);
  }

  private set(state: EngineState) {
    this.state = state;
    this.listeners.forEach((l) => l());
  }

  private receive(msg: Response) {
    switch (msg.type) {
      case "progress":
        this.set({ status: "loading", loaded: msg.loaded, total: msg.total });
        return;
      case "ready":
        this.set({ status: "ready", threads: msg.threads });
        return;
      case "error":
        if (msg.id === undefined) this.set({ status: "error", message: msg.message });
        else this.settle(msg.id, null, new Error(msg.message));
        return;
      case "phonemized":
        this.settle(msg.id, msg.words);
        return;
      case "result":
        this.settle(msg.id, { result: msg.result, words: msg.words, ms: msg.ms });
        return;
    }
  }

  private settle(id: number, value: unknown, error?: Error) {
    const p = this.pending.get(id);
    if (!p) return;
    this.pending.delete(id);
    if (error) p.reject(error);
    else p.resolve(value as never);
  }

  private call<T>(msg: Request & { id: number }, transfer: Transferable[] = []): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.pending.set(msg.id, { resolve: resolve as (v: never) => void, reject });
      this.worker.postMessage(msg, transfer);
    });
  }

  load() {
    if (this.state.status === "idle" || this.state.status === "error") {
      this.set({ status: "loading", loaded: 0, total: 0 });
      this.worker.postMessage({ type: "load" } satisfies Request);
    }
  }

  phonemize(text: string): Promise<PhonemizedWord[]> {
    return this.call({ type: "phonemize", id: this.nextId++, text });
  }

  analyze(audio: Float32Array, input: string | PhonemizedWord[], opts: AssessOptions = {}): Promise<Analysis> {
    this.load();
    const copy = audio.slice();
    return this.call({ type: "analyze", id: this.nextId++, audio: copy, input, opts }, [copy.buffer]);
  }

  subscribe = (l: () => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
}

export const engine = new Engine();

export function useEngineState(): EngineState {
  return useSyncExternalStore(engine.subscribe, () => engine.state);
}
