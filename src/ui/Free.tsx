import { useEffect, useRef, useState } from "react";
import { canSpeak, speak } from "../audio/tts";
import { adviceFor, insertionAdvice } from "../content/feedback";
import { engine } from "../engine/client";
import type { PhonemizedWord } from "../lib/phones";
import type { Assessment, WordScore } from "../lib/score";
import { Heard, MicButton, PhoneRow, pct, placeInsertions } from "./components";
import { usePractice } from "./usePractice";

const SAMPLES = [
  "I think three of them are free on Thursday.",
  "Very well, we will visit the village.",
  "She sells sea shells by the sea shore.",
  "I'd really like rice with lemon.",
  "Could you pull the door, please?",
  "My first word was bird.",
];

export function Free({ initial }: { initial: string }) {
  const [text, setText] = useState(initial || SAMPLES[0]);
  const [preview, setPreview] = useState<PhonemizedWord[]>([]);
  const { phase, level, start, stop, reset } = usePractice();
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      if (text.trim()) engine.phonemize(text).then((w) => live && setPreview(w));
      else setPreview([]);
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [text]);

  const words = text.trim().split(/\s+/).length;
  const maxSeconds = Math.min(30, 4 + words * 0.8);

  return (
    <>
      <button className="btn ghost back" onClick={() => (location.hash = "")}>
        ← All sounds
      </button>
      <div className="drill-head">
        <h1>Practise anything</h1>
        <span className="muted">Type what you need to say: a name, a sentence for a meeting, a word you always trip on.</span>
      </div>
      <div className="stage" style={{ justifyItems: "stretch", textAlign: "left" }}>
        <textarea
          id="free-input"
          className="textarea"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            reset();
          }}
          maxLength={240}
        />
        <div className="samples">
          {SAMPLES.map((s) => (
            <button
              key={s}
              className="chip"
              onClick={() => {
                setText(s);
                reset();
              }}
            >
              {s}
            </button>
          ))}
        </div>
        {preview.length > 0 && (
          <div className="ipa muted" style={{ fontSize: 20 }}>
            /{preview.map((w) => w.tokens.join("")).join(" ")}/
          </div>
        )}
        <div className="row" style={{ justifyContent: "center" }}>
          {canSpeak && (
            <>
              <button className="btn" onClick={() => speak(text)}>
                ▶ Listen
              </button>
              <button className="btn ghost" onClick={() => speak(text, true)}>
                Slowly
              </button>
            </>
          )}
        </div>
        {phase.kind === "done" ? (
          <>
            <FreeResult a={phase.analysis.result} />
            <audio ref={audio} src={phase.recording.url} />
            <div className="actions">
              <button className="btn" onClick={() => void audio.current?.play()}>
                ▶ Your recording
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  reset();
                  void start(text, {}, maxSeconds);
                }}
              >
                Try again
              </button>
            </div>
          </>
        ) : (
          <>
            <MicButton
              phase={phase}
              level={level}
              idleLabel="Tap, then read it aloud"
              onStart={() => text.trim() && start(text, {}, maxSeconds)}
              onStop={stop}
            />
            {phase.kind === "error" && <div className="notice">{phase.message}</div>}
          </>
        )}
      </div>
    </>
  );
}

function FreeResult({ a }: { a: Assessment }) {
  // A word needs work if it scores low overall or has any clearly wrong sound in it.
  const needsWork = (w: WordScore) =>
    w.score < 0.7 || a.phones.slice(w.phoneStart, w.phoneEnd).some((p) => p.status === "poor");
  const worst = a.words.reduce((m, w, i) => (w.score < a.words[m].score ? i : m), 0);
  const firstWeak = a.words.findIndex(needsWork);
  const [sel, setSel] = useState(firstWeak >= 0 ? (needsWork(a.words[worst]) ? worst : firstWeak) : -1);
  const weak = a.words.filter(needsWork).length;
  const status = weak === 0 ? "good" : a.overall >= 0.35 ? "fair" : "poor";
  const { before, after } = placeInsertions(a);

  const w = sel >= 0 ? a.words[sel] : null;
  const advice: string[] = [];
  if (w) {
    for (let i = w.phoneStart; i < w.phoneEnd; i++) {
      const p = a.phones[i];
      for (const x of before.get(i) ?? []) advice.push(insertionAdvice(x.token, null));
      if (p.status !== "good") advice.push(adviceFor(p.token, p.heard));
      for (const x of after.get(i) ?? []) advice.push(insertionAdvice(x.token, p.token));
    }
  }

  return (
    <div className="result">
      <div className={`verdict ${status}`}>
        <span className="score">{pct(a.overall)}</span>
        <div>
          <h3>{weak === 0 ? "Every word came through clearly" : `${weak} ${weak === 1 ? "word needs" : "words need"} work`}</h3>
          <p>Tap a word to see which sounds to fix.</p>
        </div>
      </div>
      <div className="words">
        {a.words.map((word, i) => (
          <button
            key={i}
            className={`wblock${!needsWork(word) && sel !== i ? " dim" : ""}`}
            aria-pressed={sel === i}
            onClick={() => setSel(sel === i ? -1 : i)}
          >
            <span className="wtext">
              {word.text ?? `/${word.ipa}/`}
              <small style={{ color: `var(--${word.score >= 0.7 ? "good" : word.score >= 0.35 ? "fair" : "poor"})` }}>
                {pct(word.score)}
              </small>
            </span>
            <PhoneRow a={a} from={word.phoneStart} to={word.phoneEnd} />
          </button>
        ))}
      </div>
      {advice.slice(0, 4).map((t, i) => (
        <div key={i} className="advice">
          {t}
        </div>
      ))}
      <Heard a={a} />
    </div>
  );
}
