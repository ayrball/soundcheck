// CTC helpers over a [T, V] matrix of log-probabilities (row-major).

export interface Emissions {
  T: number;
  V: number;
  /** log-softmax of the model logits, row-major [T, V] */
  logp: Float32Array;
}

export const BLANK = 0;
const NEG_INF = -Infinity;

/** Log-softmax per frame. With `allowed`, other tokens get -Infinity and the rest renormalise. */
export function logSoftmax(logits: Float32Array, T: number, V: number, allowed?: number[]): Emissions {
  const logp = new Float32Array(T * V).fill(NEG_INF);
  const ids = allowed ?? Array.from({ length: V }, (_, v) => v);
  for (let t = 0; t < T; t++) {
    const row = t * V;
    let max = NEG_INF;
    for (const v of ids) if (logits[row + v] > max) max = logits[row + v];
    let sum = 0;
    for (const v of ids) sum += Math.exp(logits[row + v] - max);
    const lse = max + Math.log(sum);
    for (const v of ids) logp[row + v] = logits[row + v] - lse;
  }
  return { T, V, logp };
}

function lae(a: number, b: number): number {
  if (a === NEG_INF) return b;
  if (b === NEG_INF) return a;
  return a > b ? a + Math.log1p(Math.exp(b - a)) : b + Math.log1p(Math.exp(a - b));
}

export interface DecodedToken {
  id: number;
  /** frame of the highest-probability emission of this token */
  frame: number;
  prob: number;
}

/** Best-path decoding: argmax per frame, collapse repeats, drop blanks. */
export function greedyDecode(em: Emissions): DecodedToken[] {
  const { T, V, logp } = em;
  const out: DecodedToken[] = [];
  let prev = -1;
  for (let t = 0; t < T; t++) {
    let best = 0;
    for (let v = 1; v < V; v++) if (logp[t * V + v] > logp[t * V + best]) best = v;
    const p = Math.exp(logp[t * V + best]);
    if (best !== BLANK && best !== prev) out.push({ id: best, frame: t, prob: p });
    else if (best !== BLANK && best === prev && p > out[out.length - 1].prob) {
      out[out.length - 1].frame = t;
      out[out.length - 1].prob = p;
    }
    prev = best;
  }
  return out;
}

/** Total log-likelihood of a label sequence under CTC (forward algorithm). */
export function ctcLogLikelihood(em: Emissions, labels: number[]): number {
  const { T, V, logp } = em;
  const S = labels.length * 2 + 1;
  if (labels.length === 0) {
    let sum = 0;
    for (let t = 0; t < T; t++) sum += logp[t * V + BLANK];
    return sum;
  }
  const ext = new Int32Array(S);
  for (let s = 0; s < S; s++) ext[s] = s % 2 === 0 ? BLANK : labels[(s - 1) >> 1];
  let prev = new Float64Array(S).fill(NEG_INF);
  let cur = new Float64Array(S);
  prev[0] = logp[BLANK];
  prev[1] = logp[ext[1]];
  for (let t = 1; t < T; t++) {
    const row = t * V;
    // States that cannot reach the end in the remaining frames are skipped.
    const minS = Math.max(0, S - 2 * (T - t));
    for (let s = 0; s < S; s++) {
      if (s < minS) {
        cur[s] = NEG_INF;
        continue;
      }
      let a = prev[s];
      if (s > 0) a = lae(a, prev[s - 1]);
      if (s > 1 && ext[s] !== BLANK && ext[s] !== ext[s - 2]) a = lae(a, prev[s - 2]);
      cur[s] = a === NEG_INF ? NEG_INF : a + logp[row + ext[s]];
    }
    [prev, cur] = [cur, prev];
  }
  return lae(prev[S - 1], prev[S - 2]);
}

export interface Span {
  start: number;
  end: number;
}

/**
 * Viterbi forced alignment. Returns, for each label, the frames where the best path
 * sits on that label. Null when the audio is too short for the sequence.
 */
export function forcedAlign(em: Emissions, labels: number[]): Span[] | null {
  const { T, V, logp } = em;
  const n = labels.length;
  if (n === 0) return [];
  const S = 2 * n + 1;
  const ext = new Int32Array(S);
  for (let s = 0; s < S; s++) ext[s] = s % 2 === 0 ? BLANK : labels[(s - 1) >> 1];
  const score = new Float64Array(T * S).fill(NEG_INF);
  const back = new Int8Array(T * S); // 0 stay, 1 from s-1, 2 from s-2
  score[0] = logp[BLANK];
  score[1] = logp[ext[1]];
  for (let t = 1; t < T; t++) {
    const row = t * V;
    for (let s = 0; s < S; s++) {
      let best = score[(t - 1) * S + s];
      let from = 0;
      if (s > 0 && score[(t - 1) * S + s - 1] > best) {
        best = score[(t - 1) * S + s - 1];
        from = 1;
      }
      if (s > 1 && ext[s] !== BLANK && ext[s] !== ext[s - 2] && score[(t - 1) * S + s - 2] > best) {
        best = score[(t - 1) * S + s - 2];
        from = 2;
      }
      if (best === NEG_INF) continue;
      score[t * S + s] = best + logp[row + ext[s]];
      back[t * S + s] = from;
    }
  }
  let s = score[(T - 1) * S + S - 1] >= score[(T - 1) * S + S - 2] ? S - 1 : S - 2;
  if (score[(T - 1) * S + s] === NEG_INF) return null;
  const spans: Span[] = Array.from({ length: n }, () => ({ start: -1, end: -1 }));
  for (let t = T - 1; t >= 0; t--) {
    if (s % 2 === 1) {
      const i = (s - 1) >> 1;
      if (spans[i].end < 0) spans[i].end = t;
      spans[i].start = t;
    }
    s -= back[t * S + s];
  }
  return spans;
}
