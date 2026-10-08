import { useEffect, useState } from "react";
import { CONTRAST_BY_ID } from "../content/contrasts";
import { LANGUAGE_BY_ID } from "../content/languages";
import { engine } from "../engine/client";
import { useSaved } from "../state/store";
import { EngineStatus } from "./components";
import { Drill } from "./Drill";
import { Free } from "./Free";
import { Home } from "./Home";
import { Welcome } from "./Welcome";

function useHash(): string {
  const [hash, setHash] = useState(location.hash.slice(1));
  useEffect(() => {
    const on = () => {
      setHash(location.hash.slice(1));
      window.scrollTo(0, 0);
    };
    addEventListener("hashchange", on);
    return () => removeEventListener("hashchange", on);
  }, []);
  return hash;
}

export function App() {
  const saved = useSaved();
  const hash = useHash();

  useEffect(() => {
    if (saved.lang) engine.load();
  }, [saved.lang]);

  const [route, arg = ""] = hash.split(/\/(.*)/s);
  let screen;
  if (!saved.lang || route === "language") screen = <Welcome current={saved.lang} />;
  else if (route === "drill" && CONTRAST_BY_ID[arg]) screen = <Drill key={arg} contrast={CONTRAST_BY_ID[arg]} />;
  else if (route === "free") screen = <Free key={arg} initial={decodeURIComponent(arg)} />;
  else screen = <Home />;

  const lang = saved.lang && saved.lang !== "other" ? LANGUAGE_BY_ID[saved.lang]?.name : saved.lang ? "Any language" : null;

  return (
    <div className="shell">
      <header className="topbar">
        <button className="wordmark" onClick={() => (location.hash = "")}>
          SoundCheck <span className="ipa">/saʊnd tʃɛk/</span>
        </button>
        <span className="spacer" />
        {saved.lang && <EngineStatus />}
        {lang && (
          <button className="chip" onClick={() => (location.hash = "language")} title="Change first language">
            {lang} ▾
          </button>
        )}
      </header>
      <main>{screen}</main>
      <footer className="foot">
        Scores come from a speech model listening for each expected sound. It's a practice guide, not a test result,
        and it compares you with a standard American accent.
      </footer>
    </div>
  );
}
