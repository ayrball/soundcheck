import { useEffect, useMemo, useRef, useState } from "react";
import { canSpeak, speak } from "../audio/tts";
import { CARRIER, carrierPhrase, carrierWords } from "../content/carrier";
import { focusIndex, type Contrast, type Drill as DrillItem } from "../content/contrasts";
import { adviceFor, insertionAdvice, nameOf } from "../content/feedback";
import { engine, type Analysis } from "../engine/client";
import type { PhonemizedWord } from "../lib/phones";
import type { PhoneStatus } from "../lib/score";
import { recordScore, update, useSaved } from "../state/store";
import { Heard, MicButton, PhoneRow, pct, placeInsertions } from "./components";
import { usePractice } from "./usePractice";

function shuffle<T>(xs: T[]): T[] {
  const a = xs.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Drill({ contrast }: { contrast: Contrast }) {
  const hasPairs = contrast.drills.some((d) => d.partner);
  const [mode, setMode] = useState<"speak" | "listen">("speak");
  return (
    <>
      <button className="btn ghost back" onClick={() => (location.hash = "")}>
        ← All sounds
      </button>
      <div className="drill-head">
        <h1>
          <span className="ipa">{contrast.label}</span> {contrast.name}
        </h1>
        {hasPairs && (
          <div className="row">
            <div className="tabs" role="tablist">
              <button role="tab" aria-selected={mode === "speak"} onClick={() => setMode("speak")}>
                Say it
              </button>
              <button role="tab" aria-selected={mode === "listen"} onClick={() => setMode("listen")} disabled={!canSpeak}>
                Hear the difference
              </button>
            </div>
          </div>
        )}
      </div>
      {mode === "speak" ? <Speak contrast={contrast} /> : <Listen contrast={contrast} />}
    </>
  );
}

function Speak({ contrast }: { contrast: Contrast }) {
  const saved = useSaved();
  const [order] = useState(() => shuffle(contrast.drills));
  const [idx, setIdx] = useState(0);
  const drill = order[idx % order.length];
  const [tokens, setTokens] = useState<{ word: string[]; partner: string[] } | null>(null);
  /** expected phones for what the learner says: the word alone, or inside the phrase */
  const [expected, setExpected] = useState<PhonemizedWord[] | null>(null);
  const { phase, level, start, stop, reset } = usePractice();

  useEffect(() => {
    let live = true;
    setTokens(null);
    setExpected(null);
    const phonemize = (t: string) => engine.phonemize(t);
    (async () => {
      const [w, p] = await Promise.all([phonemize(drill.word), drill.partner ? phonemize(drill.partner) : []]);
      const word: PhonemizedWord = { ...w[0], text: drill.word };
      const phrase = saved.carrier ? await carrierWords(phonemize, word) : [word];
      if (!live) return;
      setTokens({ word: word.tokens, partner: p[0]?.tokens ?? [] });
      setExpected(phrase);
    })();
    return () => {
      live = false;
    };
  }, [drill, saved.carrier]);

  const phrase = saved.carrier ? carrierPhrase(drill.word) : drill.word;
  const record = () =>
    expected && start(expected, { strict, unreleasedFinals: !contrast.strictFinals }, saved.carrier ? 7 : 5);
  const strict = useMemo(
    () => [...contrast.sounds, ...(tokens?.partner ?? []).filter((t) => !tokens?.word.includes(t))],
    [contrast, tokens],
  );
  const fi = tokens ? focusIndex(tokens.word, drill.focus, contrast.focusAt) : -1;

  const next = () => {
    reset();
    setIdx((i) => i + 1);
  };

  return (
    <div className="stage">
      <div>
        <div className="word">{drill.word}</div>
        <div className="word-ipa" aria-label="pronunciation">
          {tokens && (
            <>
              /
              {tokens.word.map((t, i) => (
                <span key={i} className={i === fi ? "focus" : undefined}>
                  {t}
                </span>
              ))}
              /
            </>
          )}
        </div>
      </div>
      <div className="row" style={{ justifyContent: "center" }}>
        {canSpeak && (
          <>
            <button className="btn" onClick={() => speak(phrase)}>
              ▶ Listen
            </button>
            <button className="btn ghost" onClick={() => speak(phrase, true)}>
              Slowly
            </button>
          </>
        )}
      </div>
      {saved.carrier && (
        <div className="prompt">
          Say: “{CARRIER.before} <b>{drill.word}</b> {CARRIER.after}”
        </div>
      )}

      {phase.kind === "done" ? (
        <DrillResult
          analysis={phase.analysis}
          drill={drill}
          contrast={contrast}
          audioUrl={phase.recording.url}
          phrase={phrase}
          onRetry={() => {
            reset();
            void record();
          }}
          onNext={next}
        />
      ) : (
        <>
          <MicButton
            phase={phase}
            level={level}
            idleLabel="Tap, then say it"
            onStart={() => void record()}
            onStop={stop}
          />
          {phase.kind === "error" && <div className="notice">{phase.message}</div>}
          <div className="row" style={{ justifyContent: "center" }}>
            {drill.partner && (
              <span className="partner">
                Don't let it become <b>{drill.partner}</b>
                {canSpeak && (
                  <button className="btn ghost small" onClick={() => speak(drill.partner!)} aria-label={`Play ${drill.partner}`}>
                    ▶
                  </button>
                )}
              </span>
            )}
            <button className="btn ghost small" onClick={next}>
              Skip →
            </button>
          </div>
        </>
      )}

      <label className="settings">
        <input
          id="carrier"
          type="checkbox"
          checked={saved.carrier}
          onChange={(e) => {
            reset();
            update({ carrier: e.target.checked });
          }}
        />
        Say it in a short phrase. The model judges sounds more reliably in context.
      </label>
    </div>
  );
}

function DrillResult(props: {
  analysis: Analysis;
  drill: DrillItem;
  contrast: Contrast;
  audioUrl: string;
  phrase: string;
  onRetry: () => void;
  onNext: () => void;
}) {
  const { analysis, drill, contrast } = props;
  const a = analysis.result;
  const wi = Math.max(0, a.words.findIndex((w) => w.text?.toLowerCase() === drill.word.toLowerCase()));
  const word = a.words[wi];
  const local = focusIndex(analysis.words[wi].tokens, drill.focus, contrast.focusAt);
  const fi = local >= 0 ? word.phoneStart + local : -1;
  // If the focus sound can't be located, judge the whole word instead.
  const focus = fi >= 0 ? a.phones[fi] : { token: drill.focus, score: word.score, heard: null };

  const { before, after } = placeInsertions(a);
  const extras: { token: string; prev: string | null }[] = [];
  for (let i = word.phoneStart; i < word.phoneEnd; i++) {
    for (const x of before.get(i) ?? []) extras.push({ token: x.token, prev: null });
    for (const x of after.get(i) ?? []) extras.push({ token: x.token, prev: a.phones[i].token });
  }
  const extraHurts = extras.length > 0 && contrast.watchFor === "insertion";

  const score = focus.score * (extraHurts ? 0.5 : 1);
  const status: PhoneStatus = score >= 0.7 ? "good" : score >= 0.35 ? "fair" : "poor";

  const saved = useRef(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!saved.current) {
      saved.current = true;
      recordScore(contrast.id, score);
    }
  }, [contrast.id, score]);
  const sound = nameOf(drill.focus);
  const title = extraHurts
    ? "You added an extra vowel"
    : status === "good"
      ? `Clear ${sound}`
      : status === "fair"
        ? `Almost: ${sound}`
        : focus.heard === ""
          ? `The ${sound} was missing`
          : focus.heard
            ? `That sounded like ${nameOf(focus.heard)}`
            : `${sound[0].toUpperCase()}${sound.slice(1)} wasn't clear`;

  const advice: string[] = [];
  if (status !== "good" && !extraHurts) advice.push(adviceFor(focus.token, focus.heard));
  for (const x of extras) advice.push(insertionAdvice(x.token, x.prev));
  for (let i = word.phoneStart; i < word.phoneEnd && advice.length < 3; i++) {
    const p = a.phones[i];
    if (i !== fi && p.status === "poor") advice.push(adviceFor(p.token, p.heard));
  }

  const others = a.words.filter((_, i) => i !== wi);

  return (
    <div className="result">
      <div className={`verdict ${status}`}>
        <span className="score">{pct(score)}</span>
        <div>
          <h3>{title}</h3>
          <p>
            Whole word: {pct(word.score)}%
            {others.length > 0 && <span className="muted"> · rest of the phrase {pct(others.reduce((s, w) => s + w.score, 0) / others.length)}%</span>}
          </p>
        </div>
      </div>
      <PhoneRow a={a} from={word.phoneStart} to={word.phoneEnd} focus={fi} />
      {advice.map((t, i) => (
        <div key={i} className="advice">
          {t}
        </div>
      ))}
      <Heard a={a} />
      <audio ref={audio} src={props.audioUrl} />
      <div className="actions">
        <button className="btn" onClick={() => void audio.current?.play()}>
          ▶ Your recording
        </button>
        {canSpeak && (
          <button className="btn" onClick={() => speak(props.phrase)}>
            ▶ Model
          </button>
        )}
        <button className="btn" onClick={props.onRetry}>
          Try again
        </button>
        <button className="btn primary" onClick={props.onNext}>
          Next word →
        </button>
      </div>
    </div>
  );
}

function Listen({ contrast }: { contrast: Contrast }) {
  const pairs = useMemo(() => contrast.drills.filter((d) => d.partner), [contrast]);
  const [round, setRound] = useState(() => pick(pairs));
  const [answer, setAnswer] = useState<string | null>(null);
  const [tally, setTally] = useState({ right: 0, total: 0 });

  function pick(list: DrillItem[]) {
    const d = list[Math.floor(Math.random() * list.length)];
    const choices = shuffle([d.word, d.partner!]);
    return { target: d.word, choices };
  }

  const play = () => speak(round.target);
  const choose = (c: string) => {
    if (answer) return;
    setAnswer(c);
    setTally((t) => ({ right: t.right + (c === round.target ? 1 : 0), total: t.total + 1 }));
  };
  const nextRound = () => {
    setAnswer(null);
    const r = pick(pairs);
    setRound(r);
    void speak(r.target);
  };

  return (
    <div className="stage quiz">
      <p className="muted" style={{ margin: 0 }}>
        Training your ear comes first: if you can hear the difference, you can learn to make it.
      </p>
      <button className="btn primary" onClick={play}>
        ▶ Play a word
      </button>
      <div className="choices">
        {round.choices.map((c) => (
          <button
            key={c}
            className={`choice${answer ? (c === round.target ? " right" : c === answer ? " wrong" : "") : ""}`}
            onClick={() => choose(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="row" style={{ justifyContent: "center" }}>
        <span className="tally muted">
          {tally.right} of {tally.total} right
        </span>
        {answer && (
          <button className="btn" onClick={nextRound}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
