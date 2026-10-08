"""Generate test recordings of every drill word with neural TTS voices (for `npm run eval`).

Usage: python scripts/make-tts.py [--carrier] [voices...]  (needs `pip install edge-tts` and ffmpeg on PATH)
Writes test-audio/tts[-carrier]/<voice>/<word>.wav at 16 kHz mono. --carrier says "Say <word> with me."
"""
import asyncio, json, pathlib, subprocess, sys
import edge_tts

ROOT = pathlib.Path(__file__).resolve().parent.parent
CARRIER = "--carrier" in sys.argv
VOICES = [a for a in sys.argv[1:] if not a.startswith("--")] or ["en-US-AriaNeural", "en-US-GuyNeural", "en-US-AndrewNeural"]
words = json.loads(subprocess.run(["npx", "tsx", "scripts/list-words.ts"], cwd=ROOT, capture_output=True, text=True, shell=True, encoding="utf8").stdout)
sem = asyncio.Semaphore(8)

async def one(voice: str, word: str):
    out = ROOT / "test-audio" / ("tts-carrier" if CARRIER else "tts") / voice / f"{word}.wav"
    if out.exists():
        return
    out.parent.mkdir(parents=True, exist_ok=True)
    mp3 = out.with_suffix(".mp3")
    async with sem:
        await edge_tts.Communicate(f"Say {word} with me." if CARRIER else word, voice, rate="-10%").save(str(mp3))
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(mp3), "-ac", "1", "-ar", "16000", str(out)], check=True)
    mp3.unlink()

async def main():
    await asyncio.gather(*(one(v, w) for v in VOICES for w in words))
    print(f"{len(words)} words x {len(VOICES)} voices")

asyncio.run(main())
