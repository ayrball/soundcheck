import { CONTRASTS } from "../src/content/contrasts";

const words = new Set<string>();
for (const c of CONTRASTS) for (const d of c.drills) [d.word, d.partner].forEach((w) => w && words.add(w));
console.log(JSON.stringify([...words].sort()));
