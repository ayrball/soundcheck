# SoundCheck

A pronunciation coach that hears **each sound** you make in English, not just whether the
word was understood. It tells you "your *th* came out as *s*", shows how to fix it, and
drills the sound contrasts that speakers of your first language find hardest.

Everything runs in the browser. Recordings never leave the device.

## Why this, and not another English app

General English learning is saturated (Duolingo, ELSA Speak, BoldVoice, Speak, plus ChatGPT
voice). A generic "rate my pronunciation" app has no edge, because speech-scoring APIs make
the basic feature cheap to copy. SoundCheck takes a narrower position:

| Decision | Why |
|---|---|
| **Sound-level diagnosis** ("θ came out as s") | Word-level checks (Web Speech API, "did it understand you") can't tell you *what* to change. Chatbot tutors can't reliably hear phonemes. This is the feedback learners pay coaches for. |
| **First-language profiles** (16 languages) | Learners' errors are predictable from their native language: Spanish merges *ship/sheep*, Japanese *right/light*, Vietnamese drops final consonants. A plan built around your 6–10 known problems beats a generic course. |
| **Minimal-pair drills** | The standard method in pronunciation teaching. It also makes scoring checkable: if you say *sink* when the target is *think*, we expect to hear /s/. |
| **On-device model** | No per-minute API cost (cloud pronunciation assessment bills per audio hour), works for any number of users at zero marginal cost, and "your voice stays on your device" is a real selling point. |
| **Listening practice too** | If you can't hear a contrast you can't produce it, so each pair has a "hear the difference" quiz. |

Who it's for: adult intermediate learners who are understood *most* of the time but trip on
specific sounds: professionals, students, people preparing for interviews or the IELTS
speaking test.

## How the recognition works

1. **Expected sounds.** The text is converted to phonemes with eSpeak NG
   (`phonemizer`, WebAssembly), e.g. *think* → `θ ɪ ŋ k`.
2. **What you said.** A wav2vec2 model fine-tuned to output phonemes
   ([`wav2vec2-lv-60-espeak-cv-ft`](https://huggingface.co/facebook/wav2vec2-lv-60-espeak-cv-ft),
   8-bit ONNX, ~320 MB, run with Transformers.js in a Web Worker) produces per-frame
   probabilities over ~390 phone labels from many languages.
3. **Scoring.** For every expected phone we compare the CTC likelihood of the expected
   sequence with the same sequence where that phone is **swapped** for each plausible
   alternative, or **deleted**. The phone's score is the probability that the expected
   sound (or an accepted variant) was produced. The best alternative is what it "sounded
   like". This is a goodness-of-pronunciation (GOP) score computed without a separate
   alignment model. Extra vowels ("e-school", "desk-u") are found by aligning the model's
   free transcription against the expected phones.
4. **Guard rails** found by testing:
   - The model may only choose among English sounds plus a few revealing foreign ones
     (rolled r, French r, Spanish j, Spanish soft b, Japanese f). Otherwise it labels
     native English vowels as generic "a/o/e" on short clips.
   - Normal variation (cot/caught, flapped t, reduced vowels) counts as correct, except
     where it *is* the contrast being drilled.
   - Drill words are said in a carrier phrase, "Say ___ with me." The model is much more
     reliable with speech around the word, and the following *w* keeps final consonants
     and added vowels audible. The phrase is scored against the word's own pronunciation,
     so "live" stays /lɪv/ even though eSpeak reads the phrase as /laɪv/.
   - An unreleased final stop ("ba' with me") counts as correct, except in the drills
     where dropping final consonants is the habit being trained.

## Accuracy (synthetic test set)

`npm run eval` scores neural-TTS recordings of every drill word against itself ("correct")
and against its minimal-pair partner ("swapped", e.g. the *sink* recording scored as
*think*). Generate recordings first with `python scripts/make-tts.py --carrier`.

| | Voices used while tuning (Aria, Guy) | Held-out voice (Andrew) |
|---|---|---|
| Correct target sound rated **good** | 93.0% | 85.0% |
| Correct target sound wrongly flagged **poor** | 1.8% | 8.8% |
| Swapped sound flagged **poor** | 99.1% | 96.8% |
| Swapped sound *not* rated good | 100% | 98.2% |
| Feedback names the actual substitute ("sounded like s") | 92.1% | 84.4% |
| Extra vowel wrongly reported | 0% | 0% |

For comparison, scoring isolated words (no carrier phrase) wrongly flagged 12–15% of correct
sounds on the tuning voices. Scoring takes about 0.1 s per phrase on a desktop CPU.

Words read by Spanish-, Japanese- and Mandarin-locale voices (a rough stand-in for
accented speech) trigger the textbook errors: "**e**school", "s**i**p" for *ship*,
"**b**ery" for *very*, "desk-**u**", Japanese r heard as a tap, "**f**ree" for *three*.
Extra vowels were found in 11 of 16 consonant-final words from the Japanese voice and
0 of 48 from the native voices.

Weakest spots on the held-out voice: *th* heard as *f* (θ/f are acoustically close),
the *cat/bed* vowels (æ/ɛ), and short *i* before a final t.

These are synthetic native voices. They show the scoring separates right from wrong
sounds, but **real learner recordings are the next validation step** (see Roadmap).

## Running it

```bash
npm install
npm run dev        # http://localhost:5199
npm test           # content + scoring unit tests
npm run eval       # accuracy on TTS recordings (see above)
npm run build      # static site in dist/
```

The dev and preview servers send `Cross-Origin-Opener-Policy`/`Cross-Origin-Embedder-Policy`
headers so ONNX Runtime can use multiple threads. Any static host you deploy to needs the
same two headers (otherwise it still works, single-threaded and slower).

The first visit downloads the model (~320 MB) from Hugging Face. The browser then keeps
it in Cache Storage.

## Layout

```
src/lib/phones.ts        phone inventory, eSpeak → model tokens, accepted variants
src/lib/ctc.ts           CTC forward / Viterbi / greedy decoding
src/lib/score.ts         per-phone GOP scoring, insertion detection
src/engine/              model loading + inference in a Web Worker
src/audio/               mic capture with auto-stop, 16 kHz resampling, TTS playback
src/content/             contrasts, first-language profiles, coaching text
src/ui/                  React screens
scripts/eval.ts          accuracy evaluation
```

## Known limits

- **Predictable phrases hide errors.** In free practice, a sentence like "I think…" can be
  scored as correct even when said "I sink…": the model has learned common word sequences
  and partly "hears" what it expects. Drills avoid this with the neutral carrier phrase.
- **Some contrasts are weaker.** Vowels (*full/fool*, *cat/bed*, *cat/cut*) and *th/f*
  are less reliable than other consonants; see the accuracy section.
- **American English only**, compared against one standard pronunciation.
- **Licensing:** `phonemizer` bundles eSpeak NG, which is GPL-3.0. Check what that means
  for a closed-source commercial release, or swap in a pronunciation dictionary
  (e.g. CMUdict) for the word lists.

## Roadmap

1. Collect 20–50 real learner recordings per first language and calibrate thresholds on them.
2. Fine-tune the phoneme model on non-native speech (L2-ARCTIC, speechocean762) to sharpen
   vowel contrasts and reduce context bias.
3. Stress and intonation feedback; British English option.
4. Accounts and synced progress, then a paid tier (more drills, professional vocabulary
   packs: medical, tech interviews, customer support).
