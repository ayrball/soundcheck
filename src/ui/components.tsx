import type { CSSProperties, ReactNode } from "react";
import { engine, useEngineState } from "../engine/client";
import { displayToken, isVowel } from "../lib/phones";
import type { Assessment, Insertion, PhoneScore, PhoneStatus } from "../lib/score";
import type { Phase } from "./usePractice";

export const pct = (x: number) => Math.round(x * 100);

export function EngineStatus() {
  const s = useEngineState();
  if (s.status === "idle")
    return (
      <span className="engine">
        <span className="dot off" /> Speech model not loaded
      </span>
    );
  if (s.status === "error")
    return (
      <span className="engine">
        <span className="dot err" /> Model failed to load.
        <button className="btn ghost small" onClick={() => engine.load()}>
          Retry
        </button>
      </span>
    );
  if (s.status === "loading") {
    const p = s.total ? s.loaded / s.total : 0;
    const label = s.total
      ? `Downloading speech model ${pct(p)}% · ${(s.loaded / 1e6).toFixed(0)} of ${(s.total / 1e6).toFixed(0)} MB`
      : "Preparing speech model…";
    return (
      <span className="engine" title="Downloaded once, then kept in your browser">
        <span className="bar">
          <i style={{ width: `${pct(p)}%` }} />
        </span>
        {label}
      </span>
    );
  }
  return (
    <span className="engine" title={s.threads ? "Running on several CPU threads" : "Running on one CPU thread"}>
      <span className="dot" /> Ready · runs on this device
    </span>
  );
}

const MicIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" />
    <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
  </svg>
);
const StopIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
  </svg>
);

export function MicButton(props: { phase: Phase; level: number; onStart: () => void; onStop: () => void; idleLabel: string }) {
  const { phase, level } = props;
  const recording = phase.kind === "recording";
  const checking = phase.kind === "checking";
  const s = useEngineState();
  const label = recording
    ? "Listening… stops when you pause"
    : checking
      ? s.status === "loading"
        ? "Recorded. Waiting for the speech model to finish downloading…"
        : "Checking each sound…"
      : props.idleLabel;
  return (
    <div className="mic">
      <button
        className={`mic-btn${recording ? " on" : ""}`}
        style={{ "--level": level } as CSSProperties}
        onClick={recording ? props.onStop : props.onStart}
        disabled={checking}
        aria-label={recording ? "Stop recording" : "Start recording"}
      >
        {checking ? <span className="spinner" /> : recording ? <StopIcon /> : <MicIcon />}
      </button>
      <span className="mic-label" aria-live="polite">
        {label}
      </span>
    </div>
  );
}

export function Phone({ p, focus }: { p: PhoneScore; focus?: boolean }) {
  return (
    <span className={`phone ${p.status}${focus ? " focus" : ""}`} title={`${pct(p.score)}% match`}>
      <span className="sym">{p.token}</span>
      <span className="pct">{pct(p.score)}</span>
      {p.heard !== null && <span className="heard">{p.heard === "" ? "missing" : `→ ${displayToken(p.heard)}`}</span>}
    </span>
  );
}

/**
 * Which phone each extra vowel belongs next to. At a word boundary, a vowel before
 * "s + consonant" belongs to the next word ("e-school"); otherwise to the previous
 * one ("desk-u").
 */
export function placeInsertions(a: Assessment) {
  const before = new Map<number, Insertion[]>();
  const after = new Map<number, Insertion[]>();
  const starts = new Set(a.words.map((w) => w.phoneStart));
  const add = (m: Map<number, Insertion[]>, i: number, x: Insertion) => m.set(i, [...(m.get(i) ?? []), x]);
  for (const x of a.insertions) {
    const next = x.afterPhone + 1;
    const sCluster =
      a.phones[next]?.token === "s" && a.phones[next + 1] && !isVowel(a.phones[next + 1].token);
    if (x.afterPhone < 0 || (starts.has(next) && sCluster)) add(before, next, x);
    else add(after, x.afterPhone, x);
  }
  return { before, after };
}

function Extra({ x }: { x: Insertion }) {
  return (
    <span className="phone extra" title="Extra sound you added">
      <span className="sym">{displayToken(x.token)}</span>
      <span className="pct">extra</span>
    </span>
  );
}

/** Phones of one word, with any extra vowels the speaker added shown in place. */
export function PhoneRow({ a, from, to, focus }: { a: Assessment; from: number; to: number; focus?: number }) {
  const { before, after } = placeInsertions(a);
  const items: ReactNode[] = [];
  for (let i = from; i < to; i++) {
    before.get(i)?.forEach((x, k) => items.push(<Extra key={`b${i}-${k}`} x={x} />));
    items.push(<Phone key={i} p={a.phones[i]} focus={i === focus} />);
    after.get(i)?.forEach((x, k) => items.push(<Extra key={`a${i}-${k}`} x={x} />));
  }
  return <div className="phones">{items}</div>;
}

export function Meter({ value, attempts }: { value: number | null; attempts: number }) {
  const status: PhoneStatus | null = value === null ? null : value >= 0.7 ? "good" : value >= 0.35 ? "fair" : "poor";
  return (
    <div className="meter">
      <span className="track">
        <i style={{ width: `${value === null ? 0 : pct(value)}%`, background: status ? `var(--${status})` : undefined }} />
      </span>
      {value === null ? "Not tried yet" : `${pct(value)}% · ${attempts} tries`}
    </div>
  );
}

export function Heard({ a }: { a: Assessment }) {
  if (!a.heard.length) return null;
  return (
    <div className="heardline">
      What the model heard: <span className="ipa">/{a.heard.join(" ")}/</span>
    </div>
  );
}
