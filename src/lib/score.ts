// Pronunciation scoring.
//
// For each expected phone we ask: how much better does the audio fit the expected
// sequence than the same sequence with this phone swapped for another sound, or
// dropped? That ratio, a goodness-of-pronunciation score computed from CTC
// likelihoods, is the phone's score. It tells us both "how right" a sound was and,
// when it was wrong, what it sounded like instead.

import {
  ctcLogLikelihood,
  forcedAlign,
  greedyDecode,
  type Emissions,
  type Span,
} from "./ctc";
import { ACCEPTABLE_VARIANTS, CANDIDATE_TOKENS, displayToken, isVowel, type PhonemizedWord } from "./phones";

export type PhoneStatus = "good" | "fair" | "poor";

export interface PhoneScore {
  token: string;
  wordIndex: number;
  /** 0..1 — probability the expected sound was produced */
  score: number;
  status: PhoneStatus;
  /** What it sounded like when the score is low: a token, "" for "missing", null when it was fine */
  heard: string | null;
  span: Span | null;
}

export interface WordScore {
  text: string | null;
  ipa: string;
  score: number;
  phoneStart: number;
  phoneEnd: number;
}

export interface Insertion {
  /** index into phones; the extra sound came after this phone (-1 = before the first) */
  afterPhone: number;
  token: string;
}

export interface Assessment {
  overall: number;
  words: WordScore[];
  phones: PhoneScore[];
  insertions: Insertion[];
  /** best-path transcription, for "what the model heard" */
  heard: string[];
  /** no speech detected */
  silent: boolean;
}

export const THRESHOLDS = { good: 0.7, fair: 0.35 };

export function statusFor(score: number): PhoneStatus {
  return score >= THRESHOLDS.good ? "good" : score >= THRESHOLDS.fair ? "fair" : "poor";
}

/** Max candidate substitutes tested per phone (the most likely ones in its window). */
const MAX_CANDIDATES = 8;
const CANDIDATE_MIN_PROB = 0.01;

export interface AssessOptions {
  /** Sounds that must stay distinct (the drill's contrast), never accepted as variants. */
  strict?: string[];
  /**
   * Accept a word-final stop that was not released (American "ba' with me"). Turn off
   * when dropping final consonants is the habit being trained.
   */
  unreleasedFinals?: boolean;
}

const STOPS = new Set(["p", "b", "t", "d", "k", "ɡ"]);

export function assess(
  em: Emissions,
  words: PhonemizedWord[],
  vocab: Record<string, number>,
  opts: AssessOptions = {},
): Assessment {
  const strict = new Set(opts.strict ?? []);
  const unreleasedFinals = opts.unreleasedFinals ?? true;
  const wordEnds = new Set<number>();
  words.reduce((end, w) => (wordEnds.add(end + w.tokens.length - 1), end + w.tokens.length), 0);
  const idToToken: string[] = [];
  for (const [tok, id] of Object.entries(vocab)) idToToken[id] = tok;

  const heardTokens = greedyDecode(em);
  const heard = heardTokens.map((h) => displayToken(idToToken[h.id]));

  const flat: { token: string; wordIndex: number }[] = [];
  words.forEach((w, wi) => w.tokens.forEach((token) => flat.push({ token, wordIndex: wi })));
  const labels = flat.map((p) => vocab[p.token]);

  const silent = heardTokens.length === 0;
  const spans = silent ? null : forcedAlign(em, labels);
  if (silent || !spans) {
    const phones = flat.map((p) => ({ ...p, score: 0, status: "poor" as const, heard: "", span: null }));
    return { overall: 0, words: wordScores(words, phones), phones, insertions: [], heard, silent: true };
  }

  const candidateIds = CANDIDATE_TOKENS.map((t) => vocab[t]).filter((id) => id !== undefined);
  const base = ctcLogLikelihood(em, labels);
  const phones: PhoneScore[] = flat.map((p, i) => {
    const target = labels[i];
    const win = windowFor(spans, i, em.T);
    const ok = new Set((ACCEPTABLE_VARIANTS[p.token] ?? []).filter((t) => !strict.has(t)));
    if (unreleasedFinals && STOPS.has(p.token) && wordEnds.has(i)) ok.add("");
    const alts: { token: string; ll: number }[] = [];

    for (const id of topCandidates(em, win, candidateIds, target)) {
      const swapped = labels.slice();
      swapped[i] = id;
      alts.push({ token: idToToken[id], ll: ctcLogLikelihood(em, swapped) });
    }
    if (labels.length > 1) {
      alts.push({ token: "", ll: ctcLogLikelihood(em, labels.filter((_, j) => j !== i)) });
    }

    // P(expected sound or an acceptable variant) among everything that could be here.
    let good = base;
    let all = base;
    for (const a of alts) {
      all = logAdd(all, a.ll);
      if (ok.has(a.token)) good = logAdd(good, a.ll);
    }
    const score = Math.exp(good - all);
    const best = alts.filter((a) => !ok.has(a.token)).reduce<{ token: string; ll: number } | null>(
      (b, a) => (b === null || a.ll > b.ll ? a : b),
      null,
    );
    const status = statusFor(score);
    return {
      ...p,
      score,
      status,
      heard: status !== "good" && best && best.ll > good - 2 ? best.token : null,
      span: spans[i],
    };
  });

  const insertions = findInsertions(heardTokens.map((h) => ({ token: idToToken[h.id], prob: h.prob })), flat);
  const overall = phones.reduce((s, p) => s + p.score, 0) / Math.max(1, phones.length);
  return { overall, words: wordScores(words, phones), phones, insertions, heard, silent: false };
}

function logAdd(a: number, b: number): number {
  if (a === -Infinity) return b;
  if (b === -Infinity) return a;
  return a > b ? a + Math.log1p(Math.exp(b - a)) : b + Math.log1p(Math.exp(a - b));
}

/** Frames between the previous and next phones, i.e. where this phone could plausibly be. */
function windowFor(spans: Span[], i: number, T: number): Span {
  const start = i > 0 ? spans[i - 1].end : 0;
  const end = i < spans.length - 1 ? spans[i + 1].start : T - 1;
  return { start: Math.max(0, start), end: Math.min(T - 1, Math.max(end, start)) };
}

function topCandidates(em: Emissions, win: Span, ids: number[], exclude: number): number[] {
  const peaks: { id: number; p: number }[] = [];
  for (const id of ids) {
    if (id === exclude) continue;
    let max = -Infinity;
    for (let t = win.start; t <= win.end; t++) max = Math.max(max, em.logp[t * em.V + id]);
    const p = Math.exp(max);
    if (p >= CANDIDATE_MIN_PROB) peaks.push({ id, p });
  }
  return peaks
    .sort((a, b) => b.p - a.p)
    .slice(0, MAX_CANDIDATES)
    .map((c) => c.id);
}

function wordScores(words: PhonemizedWord[], phones: PhoneScore[]): WordScore[] {
  let k = 0;
  return words.map((w) => {
    const start = k;
    k += w.tokens.length;
    const slice = phones.slice(start, k);
    const score = slice.reduce((s, p) => s + p.score, 0) / Math.max(1, slice.length);
    return { text: w.text, ipa: w.ipa, score, phoneStart: start, phoneEnd: k };
  });
}

/** Added vowels are short and quiet, so the model is rarely confident about them. */
const INSERTION_MIN_PROB = 0.15;

/**
 * Where learners add vowels: after a consonant that is followed by another consonant or
 * the end ("desk-u", "mil-u-k"), or before an "s + consonant" start ("e-school").
 * Elsewhere an extra vowel is more likely noise than a habit worth correcting.
 */
function isEpenthesisSite(expected: { token: string }[], after: number): boolean {
  const prev = expected[after]?.token;
  const next = expected[after + 1]?.token;
  const next2 = expected[after + 2]?.token;
  const consonant = (t: string | undefined) => t !== undefined && !isVowel(t);
  if (next === "s" && consonant(next2)) return true;
  return consonant(prev) && (next === undefined || consonant(next));
}

/**
 * Extra vowels the learner added (e.g. "e-school", "milk-u"), found by aligning the
 * best-path transcription against the expected phones.
 */
export function findInsertions(
  heard: { token: string; prob: number }[],
  expected: { token: string }[],
): Insertion[] {
  const n = heard.length;
  const m = expected.length;
  const cost = (a: string, b: string) => (a === b ? 0 : isVowel(a) === isVowel(b) ? 0.6 : 1.2);
  const d = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  for (let i = 1; i <= n; i++) d[i][0] = i;
  for (let j = 1; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++)
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost(heard[i - 1].token, expected[j - 1].token),
      );

  const out: Insertion[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + cost(heard[i - 1].token, expected[j - 1].token)) {
      i--;
      j--;
    } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) {
      const h = heard[i - 1];
      if (isVowel(h.token) && h.prob > INSERTION_MIN_PROB && isEpenthesisSite(expected, j - 1)) {
        out.push({ afterPhone: j - 1, token: h.token });
      }
      i--;
    } else {
      j--;
    }
  }
  return out.reverse();
}
