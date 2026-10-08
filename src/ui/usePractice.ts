// Record → analyse → result, shared by word drills and free practice.

import { useCallback, useEffect, useRef, useState } from "react";
import { MicError, Recorder, type Recording } from "../audio/recorder";
import { engine, type Analysis } from "../engine/client";
import type { AssessOptions } from "../lib/score";

export type Phase =
  | { kind: "idle" }
  | { kind: "recording" }
  | { kind: "checking" }
  | { kind: "done"; analysis: Analysis; recording: Recording }
  | { kind: "error"; message: string };

export function usePractice() {
  const recorder = useRef(new Recorder());
  const job = useRef<{ text: string; opts: AssessOptions } | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [level, setLevel] = useState(0);

  const finish = useCallback(async () => {
    if (!recorder.current.active || !job.current) return;
    const { text, opts } = job.current;
    setPhase({ kind: "checking" });
    setLevel(0);
    try {
      const recording = await recorder.current.stop();
      if (!recording.heardSpeech) {
        setPhase({ kind: "error", message: "We didn't hear anything. Check your microphone and speak a little louder." });
        return;
      }
      const analysis = await engine.analyze(recording.audio, text, opts);
      setPhase({ kind: "done", analysis, recording });
    } catch (e) {
      setPhase({ kind: "error", message: e instanceof Error ? e.message : String(e) });
    }
  }, []);

  const start = useCallback(
    async (text: string, opts: AssessOptions = {}, maxSeconds = 6) => {
      job.current = { text, opts };
      engine.load();
      try {
        await recorder.current.start({ maxSeconds, onLevel: setLevel, onAutoStop: () => void finish() });
        setPhase({ kind: "recording" });
      } catch (e) {
        setPhase({ kind: "error", message: e instanceof MicError ? e.message : String(e) });
      }
    },
    [finish],
  );

  const reset = useCallback(() => {
    recorder.current.cancel();
    setPhase({ kind: "idle" });
    setLevel(0);
  }, []);

  useEffect(() => () => recorder.current.cancel(), []);

  return { phase, level, start, stop: finish, reset };
}
