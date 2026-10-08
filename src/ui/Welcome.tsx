import { useEffect, useState } from "react";
import { LANGUAGES } from "../content/languages";
import { engine } from "../engine/client";
import { update } from "../state/store";

const SPECIMEN = ["θ", "ð", "ɹ", "l", "v", "w", "ɪ", "iː", "æ", "ʌ", "ʃ", "tʃ", "ŋ", "ɜː"];

export function Welcome({ current }: { current: string | null }) {
  const [lit, setLit] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setLit((i) => (i + 1) % SPECIMEN.length), 700);
    return () => clearInterval(t);
  }, []);

  const choose = (id: string) => {
    update({ lang: id });
    engine.load();
    location.hash = "";
  };

  return (
    <>
      <section className="hero">
        <div className="specimen" aria-hidden="true">
          {SPECIMEN.map((s, i) => (
            <span key={s} className={i === lit || i === (lit + 1) % SPECIMEN.length ? "on" : ""}>
              {s}
            </span>
          ))}
        </div>
        <h1>Hear exactly which sound you got wrong.</h1>
        <p>
          SoundCheck listens to every sound in a word, not just whether the word was understood. It tells
          you when your <i>th</i> came out as an <i>s</i>, and drills the sounds that speakers of your
          language find hardest.
        </p>
      </section>

      <section className="section">
        <header>
          <h2>What's your first language?</h2>
          {current && (
            <button className="btn ghost" onClick={() => (location.hash = "")}>
              Cancel
            </button>
          )}
        </header>
        <div className="langs">
          {LANGUAGES.map((l) => (
            <button key={l.id} className="lang" onClick={() => choose(l.id)} aria-pressed={current === l.id}>
              <b>{l.name}</b>
              <span>{l.native}</span>
            </button>
          ))}
          <button className="lang" onClick={() => choose("other")} aria-pressed={current === "other"}>
            <b>Something else</b>
            <span>Show me every sound</span>
          </button>
        </div>
      </section>

      <div className="facts">
        <div>
          <b>Private by design</b>
          Your voice is analysed in this browser tab. Recordings never leave your device.
        </div>
        <div>
          <b>One download</b>
          The speech model is about 320 MB. It downloads once and is kept by your browser.
        </div>
        <div>
          <b>American English</b>
          Feedback compares you to a standard American pronunciation.
        </div>
      </div>
    </>
  );
}
