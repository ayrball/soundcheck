import { useState } from "react";
import { CONTRASTS, CONTRAST_BY_ID, type Contrast } from "../content/contrasts";
import { LANGUAGE_BY_ID } from "../content/languages";
import { mastery, useSaved } from "../state/store";
import { Meter } from "./components";

function example(c: Contrast): string {
  const d = c.drills[0];
  return d.partner ? `${d.word} · ${d.partner}` : c.drills.slice(0, 3).map((x) => x.word).join(" · ");
}

export function Home() {
  const saved = useSaved();
  const lang = saved.lang ? LANGUAGE_BY_ID[saved.lang] : undefined;
  const focus = lang ? lang.focus.map((id) => CONTRAST_BY_ID[id]) : [];
  const rest = CONTRASTS.filter((c) => !focus.includes(c));
  const [text, setText] = useState("");

  const open = (id: string) => (location.hash = `drill/${id}`);

  return (
    <>
      {lang && (
        <section className="section">
          <header>
            <h2>Your sounds</h2>
            <span className="muted small">The contrasts {lang.name} speakers most often merge, most important first.</span>
          </header>
          <div className="cards">
            {focus.map((c) => (
              <button key={c.id} className="card" onClick={() => open(c.id)}>
                <span className="pair">{c.label}</span>
                <span className="name">{c.name}</span>
                <span className="eg">{example(c)}</span>
                <Meter value={mastery(saved.scores[c.id])} attempts={saved.scores[c.id]?.length ?? 0} />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="section">
        <header>
          <h2>Practise anything</h2>
          <span className="muted small">Type a word or sentence you need, then say it.</span>
        </header>
        <form
          className="free-entry"
          onSubmit={(e) => {
            e.preventDefault();
            location.hash = `free/${encodeURIComponent(text.trim())}`;
          }}
        >
          <input
            id="free-text"
            className="textarea"
            style={{ minHeight: 0 }}
            placeholder="e.g. I'd like a thirty-minute meeting on Thursday"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="row">
            <button className="btn primary" type="submit">
              Practise this
            </button>
          </div>
        </form>
      </section>

      <section className="section">
        <header>
          <h2>{lang ? "More sounds" : "All sounds"}</h2>
        </header>
        <div className="list">
          {rest.map((c) => {
            const m = mastery(saved.scores[c.id]);
            return (
              <button key={c.id} onClick={() => open(c.id)}>
                <span className="ipa">{c.label}</span>
                <span>
                  {c.name}
                  <br />
                  <span className="muted small">{example(c)}</span>
                </span>
                <span className="muted small">{m === null ? "" : `${Math.round(m * 100)}%`}</span>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}
