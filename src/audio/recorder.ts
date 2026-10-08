// Microphone capture: raw PCM via an AudioWorklet, a live level for the UI, automatic
// stop after the speaker goes quiet, then trimmed and resampled to 16 kHz for the model.

export interface Recording {
  /** mono 16 kHz samples, silence trimmed */
  audio: Float32Array;
  /** playable WAV of the same audio */
  url: string;
  seconds: number;
  /** false when nothing louder than background noise was captured */
  heardSpeech: boolean;
}

export interface RecordOptions {
  maxSeconds: number;
  /** 0..1 loudness, about 20 times a second */
  onLevel?: (level: number) => void;
  /** called when the recorder stops by itself (silence or time limit) */
  onAutoStop?: () => void;
}

const WORKLET = `
class Capture extends AudioWorkletProcessor {
  constructor() { super(); this.buf = new Float32Array(1024); this.n = 0; }
  process(inputs) {
    const ch = inputs[0][0];
    if (ch) for (let i = 0; i < ch.length; i++) {
      this.buf[this.n++] = ch[i];
      if (this.n === this.buf.length) { this.port.postMessage(this.buf.slice()); this.n = 0; }
    }
    return true;
  }
}
registerProcessor("capture", Capture);
`;

const TARGET_RATE = 16_000;
const SILENCE_TO_STOP = 1.0; // seconds of quiet after speech
const MARGIN = 0.25; // seconds kept around speech when trimming

export class MicError extends Error {}

export class Recorder {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private node: AudioWorkletNode | null = null;
  private chunks: Float32Array[] = [];
  private levels: number[] = [];
  private stopping: Promise<Recording> | null = null;

  async start(opts: RecordOptions): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      throw new MicError(
        name === "NotAllowedError"
          ? "Microphone access is blocked. Allow it in your browser's site settings, then try again."
          : name === "NotFoundError"
            ? "No microphone found. Plug one in or check your system sound settings."
            : "Couldn't open the microphone. Check that no other app is using it.",
      );
    }
    this.ctx = new AudioContext();
    const url = URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }));
    await this.ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    const source = this.ctx.createMediaStreamSource(this.stream);
    this.node = new AudioWorkletNode(this.ctx, "capture");
    this.chunks = [];
    this.levels = [];
    this.stopping = null;

    const chunkSec = 1024 / this.ctx.sampleRate;
    let floor = Infinity;
    let loudRun = 0;
    let quiet = 0;
    let spoke = false;
    this.node.port.onmessage = (e: MessageEvent<Float32Array>) => {
      const chunk = e.data;
      this.chunks.push(chunk);
      const level = rms(chunk);
      this.levels.push(level);
      opts.onLevel?.(Math.min(1, level * 8));

      floor = Math.min(floor, Math.max(level, 0.002));
      const threshold = Math.max(0.015, floor * 4);
      if (level > threshold) {
        loudRun++;
        quiet = 0;
        if (loudRun * chunkSec > 0.08) spoke = true;
      } else {
        loudRun = 0;
        quiet += chunkSec;
      }
      const elapsed = this.chunks.length * chunkSec;
      if ((spoke && quiet >= SILENCE_TO_STOP) || elapsed >= opts.maxSeconds) {
        if (!this.stopping) opts.onAutoStop?.();
      }
    };
    source.connect(this.node);
  }

  get active(): boolean {
    return this.ctx !== null;
  }

  stop(): Promise<Recording> {
    this.stopping ??= this.finish();
    return this.stopping;
  }

  cancel(): void {
    this.release();
  }

  private async finish(): Promise<Recording> {
    const rate = this.ctx?.sampleRate ?? 48_000;
    const chunks = this.chunks;
    const levels = this.levels;
    this.release();

    const raw = concat(chunks);
    const { start, end, heardSpeech } = speechBounds(levels, 1024, rate);
    const trimmed = raw.subarray(start, end);
    const audio = await resample(trimmed.length ? trimmed : raw, rate, TARGET_RATE);
    return {
      audio,
      url: URL.createObjectURL(toWav(audio, TARGET_RATE)),
      seconds: audio.length / TARGET_RATE,
      heardSpeech,
    };
  }

  private release() {
    this.node?.port.close();
    this.node?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.node = null;
    this.stream = null;
    this.ctx = null;
  }
}

function rms(x: Float32Array): number {
  let s = 0;
  for (let i = 0; i < x.length; i++) s += x[i] * x[i];
  return Math.sqrt(s / x.length);
}

function concat(chunks: Float32Array[]): Float32Array {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

/** Sample range from just before the first loud chunk to just after the last one. */
function speechBounds(levels: number[], chunk: number, rate: number) {
  const sorted = [...levels].sort((a, b) => a - b);
  const floor = sorted[Math.floor(sorted.length * 0.1)] ?? 0;
  const threshold = Math.max(0.015, floor * 4);
  const first = levels.findIndex((l) => l > threshold);
  const last = levels.length - 1 - [...levels].reverse().findIndex((l) => l > threshold);
  const total = levels.length * chunk;
  if (first < 0) return { start: 0, end: total, heardSpeech: false };
  const margin = Math.round(MARGIN * rate);
  return {
    start: Math.max(0, first * chunk - margin),
    end: Math.min(total, (last + 1) * chunk + margin),
    heardSpeech: true,
  };
}

async function resample(x: Float32Array, from: number, to: number): Promise<Float32Array> {
  if (from === to) return x.slice();
  const length = Math.max(1, Math.ceil((x.length * to) / from));
  const off = new OfflineAudioContext(1, length, to);
  const buf = off.createBuffer(1, x.length, from);
  buf.copyToChannel(new Float32Array(x), 0);
  const src = off.createBufferSource();
  src.buffer = buf;
  src.connect(off.destination);
  src.start();
  return (await off.startRendering()).getChannelData(0).slice();
}

function toWav(x: Float32Array, rate: number): Blob {
  const view = new DataView(new ArrayBuffer(44 + x.length * 2));
  const str = (o: number, s: string) => [...s].forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF");
  view.setUint32(4, 36 + x.length * 2, true);
  str(8, "WAVE");
  str(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  str(36, "data");
  view.setUint32(40, x.length * 2, true);
  for (let i = 0; i < x.length; i++) view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, x[i])) * 0x7fff, true);
  return new Blob([view], { type: "audio/wav" });
}
