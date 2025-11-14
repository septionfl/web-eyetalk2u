// audio.ts
// Advanced concat-based Indonesian TTS (TypeScript)

const audioContext = new AudioContext();
const audioBuffers: Record<string, AudioBuffer | undefined> = {};
let silenceBuffer: AudioBuffer | null = null;

// Configs
const SAMPLE_CHANNELS = 1; // we synth to mono
const SILENCE_SECONDS = 0.12; // pause for whitespace
const MAX_SPEEDUP = 1.45; // max playbackRate multiplier
const SPEEDUP_PER_TOKEN = 0.01; // how much speed increases per token

// Helper: decode arrayBuffer to mono AudioBuffer
async function decodeToMono(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
  const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
  if (decoded.numberOfChannels === SAMPLE_CHANNELS) return decoded;
  // mixdown to mono by averaging channels
  const out = audioContext.createBuffer(
    SAMPLE_CHANNELS,
    decoded.length,
    decoded.sampleRate
  );
  const outData = out.getChannelData(0);
  for (let c = 0; c < decoded.numberOfChannels; c++) {
    const ch = decoded.getChannelData(c);
    for (let i = 0; i < decoded.length; i++) {
      outData[i] += ch[i] / decoded.numberOfChannels;
    }
  }
  return out;
}

// Load single wav file from /syllable/{name}.wav (caches result)
export async function loadAudioByName(name: string): Promise<AudioBuffer> {
  if (name === "{silence}") {
    if (!silenceBuffer) {
      const sr = audioContext.sampleRate;
      const len = Math.ceil(sr * SILENCE_SECONDS);
      silenceBuffer = audioContext.createBuffer(SAMPLE_CHANNELS, len, sr);
      // default silence (zeros) is fine
    }
    return silenceBuffer;
  }

  const key = name.toLowerCase();
  if (audioBuffers[key]) return audioBuffers[key] as AudioBuffer;

  const url = `/syllable/${encodeURIComponent(key)}.wav`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Syllable audio not found: ${url}`);
  }
  const ab = await res.arrayBuffer();
  const decoded = await decodeToMono(ab);
  audioBuffers[key] = decoded;
  return decoded;
}

// Optionally preload a list of syllables
export async function preloadSyllables(list: string[]) {
  await Promise.all(
    list.map(async (name) => {
      try {
        await loadAudioByName(name);
      } catch (e) {
        console.warn("Failed to preload", name, e);
      }
    })
  );
}

// Concatenate mono AudioBuffers (all sampleRates must match)
function concatBuffers(buffers: AudioBuffer[]): AudioBuffer {
  if (buffers.length === 0) {
    // return an empty tiny buffer
    return audioContext.createBuffer(
      SAMPLE_CHANNELS,
      1,
      audioContext.sampleRate
    );
  }
  const sampleRate = buffers[0].sampleRate;
  let totalLen = 0;
  for (const b of buffers) {
    if (b.sampleRate !== sampleRate) {
      // naive handling, but we assume same sample rates in repository of syllables
      console.warn("Sample rate mismatch in buffers", b.sampleRate, sampleRate);
    }
    totalLen += b.length;
  }
  const out = audioContext.createBuffer(SAMPLE_CHANNELS, totalLen, sampleRate);
  const outData = out.getChannelData(0);
  let offset = 0;
  for (const b of buffers) {
    const ch = b.getChannelData(0);
    outData.set(ch, offset);
    offset += b.length;
  }
  return out;
}

// Parser implementing priority rules
// Priority order (greedy):
// 1) 3-letter combos: "nga, ngi, ngu, nge, ngo" and "nya, nyi, nyu, nye, nyo"
// 2) 2-letter combos: "ng" (if not matched as 3-letter), then consonant+vowel (like "wa", "co")
// 3) Single-letter tokens
// Also whitespace -> token "{silence}"
const VOWELS = ["a", "i", "u", "e", "o"];
const PRIORITY_TRIPLE = [
  // ng + vowel
  "nga",
  "ngi",
  "ngu",
  "nge",
  "ngo",
  // ny + vowel
  "nya",
  "nyi",
  "nyu",
  "nye",
  "nyo",
];
const PRIORITY_DOUBLE = [
  "ng", // special consonant cluster
  // note: consonant+vowel handled dynamically
];
const CONSONANTS = "bcdfghjklmnpqrstvwxyz".split("");

// sanitize and split text into tokens
export function parseTextToTokens(input: string): string[] {
  const normalized = input
    .toLowerCase()
    // keep letters and spaces only (you can extend to keep punctuation -> silence)
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens: string[] = [];
  let i = 0;
  while (i < normalized.length) {
    const ch = normalized[i];
    if (ch === " ") {
      // add a silence token at spaces (but avoid consecutive silence tokens)
      if (tokens.length === 0 || tokens[tokens.length - 1] !== "{silence}") {
        tokens.push("{silence}");
      }
      i++;
      continue;
    }

    // Try 3-letter priority tokens
    const three = normalized.substr(i, 3);
    if (three.length === 3 && PRIORITY_TRIPLE.includes(three)) {
      tokens.push(three);
      i += 3;
      continue;
    }

    // Try 2-letter "ng"
    const two = normalized.substr(i, 2);
    if (two.length === 2 && PRIORITY_DOUBLE.includes(two)) {
      tokens.push(two);
      i += 2;
      continue;
    }

    // Try consonant + vowel (2 letters)
    if (two.length === 2) {
      const c = two[0];
      const v = two[1];
      if (CONSONANTS.includes(c) && VOWELS.includes(v)) {
        tokens.push(two);
        i += 2;
        continue;
      }
    }

    // Fallback single letter
    tokens.push(ch);
    i += 1;
  }

  // Trim leading/trailing silence token
  if (tokens[0] === "{silence}") tokens.shift();
  if (tokens[tokens.length - 1] === "{silence}") tokens.pop();

  return tokens;
}

// Public speak function: parse input, load required audio buffers, concatenate and play
export async function speak(rawText: string) {
  // Ensure audioContext resumed (user gesture required in many browsers)
  if (audioContext.state === "suspended") {
    try {
      await audioContext.resume();
    } catch (e) {
      console.warn("AudioContext resume failed:", e);
    }
  }

  const tokens = parseTextToTokens(rawText);
  if (tokens.length === 0) return;

  // Load all required buffers (on demand)
  const buffers: AudioBuffer[] = [];
  for (const t of tokens) {
    try {
      const buf = await loadAudioByName(t);
      buffers.push(buf);
    } catch (e) {
      console.warn(
        `Missing syllable for token "${t}" — falling back to splitting letters`,
        e
      );
      // fallback: split into single characters and try again
      if (t.length > 1) {
        for (const ch of t.split("")) {
          try {
            const b2 = await loadAudioByName(ch);
            buffers.push(b2);
          } catch (err) {
            console.error("Missing fallback syllable for char:", ch, err);
            // insert silence so timing stays consistent
            buffers.push(await loadAudioByName("{silence}"));
          }
        }
      } else {
        // unknown single token -> silence
        buffers.push(await loadAudioByName("{silence}"));
      }
    }
  }

  const final = concatBuffers(buffers);

  // Compute playbackRate: longer sentences slightly faster
  const lengthFactor = Math.min(
    MAX_SPEEDUP,
    1 + tokens.length * SPEEDUP_PER_TOKEN
  );

  const src = audioContext.createBufferSource();
  src.buffer = final;
  src.playbackRate.value = lengthFactor;

  src.connect(audioContext.destination);
  src.start();
  return new Promise<void>((resolve) => {
    src.onended = () => resolve();
  });
}

// Utility: parse -> return tokens and optionally preload them
export async function parseAndPreload(text: string) {
  const tokens = parseTextToTokens(text);
  await preloadSyllables(tokens);
  return tokens;
}
