/** Sample-accurate footfall audio for interactive scenes (hooves, paws, boots).
 *
 * - Every buffer is fetched and decoded once in `createFootfallAudio`; nothing is decoded while playing.
 * - Hits are scheduled on the AudioContext clock (`when`), not with timers, so a hit lands on the exact
 *   sample the animation's contact maps to. Callers pass the time from contact markers plus a lookahead.
 * - A fixed pool of voices (gain → stereo pan → shared bus) is built up front and reused round-robin.
 *   Web Audio buffer sources are one-shot by design, so each hit makes one cheap AudioBufferSourceNode;
 *   that is the only object created per hit.
 * - Takes rotate without immediate repeats; each hit gets a small pitch and level variation, so a gallop
 *   never sounds like a loop.
 * - Optional beds: a speed-driven air rush (synthesised noise, band-passed) and periodic one-shots
 *   (breath) that the caller fires in step with the gait.
 */

export interface FootfallBank {
  /** Category → sample URLs (for example `hoof`, `scuff`, `breath`). */
  [category: string]: readonly string[];
}

export interface FootfallHit {
  category: string;
  /** AudioContext time in seconds. */
  when: number;
  /** Linear gain before the master (1 = the take's level). */
  gain: number;
  /** Playback rate (1 = recorded pitch and speed). */
  rate: number;
  /** Stereo position −1 (left) … 1 (right). */
  pan?: number;
  /** Extra random pitch and level spread (default 0.04 and 0.15). */
  pitchJitter?: number;
  gainJitter?: number;
}

export interface FootfallAudio {
  readonly context: AudioContext;
  /** Master level (linear). */
  setVolume(volume: number): void;
  /** Schedule one hit. Hits in the past (by more than 50 ms) are dropped instead of piling up. */
  play(hit: FootfallHit): void;
  /** Air rush level from 0 (still) to 1 (full speed), smoothed on the audio clock. */
  setAirRush(level: number): void;
  /** Resume after a user gesture (browsers start contexts suspended). */
  resume(): Promise<void>;
  dispose(): void;
}

export interface FootfallAudioOptions {
  bank: FootfallBank;
  context?: AudioContext;
  /** Simultaneous voices (default 24: four hooves × a few overlapping tails, plus breath and scuffs). */
  voices?: number;
  volume?: number;
  /** Include the synthesised air-rush bed (default true). */
  airRush?: boolean;
  fetchBuffer?: (url: string) => Promise<ArrayBuffer>;
}

/** Map ground speed to footfall level and playback rate: louder and slightly brighter as the pace rises. */
export function footfallDynamics(speed: number, referenceSpeed: number) {
  const k = Math.max(0, speed / referenceSpeed);
  // Impact force grows with speed; perceived loudness about with its square root. Rate nudges ±8%.
  return { gain: Math.min(1.6, .35 + .65 * Math.sqrt(k)), rate: Math.min(1.12, Math.max(.9, .94 + .06 * k)) };
}

/** Pink-ish noise buffer for the air bed (Paul Kellet's filter), generated once. */
function noiseBuffer(context: AudioContext, seconds = 3): AudioBuffer {
  const length = Math.floor(context.sampleRate * seconds), buffer = context.createBuffer(1, length, context.sampleRate), data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, seed = 22222;
  for (let i = 0; i < length; i++) {
    seed = (seed * 16807) % 2147483647;
    const white = seed / 1073741823.5 - 1;
    b0 = .99765 * b0 + white * .099046; b1 = .963 * b1 + white * .2965164; b2 = .57 * b2 + white * 1.0526913;
    data[i] = (b0 + b1 + b2 + white * .1848) * .11;
  }
  // Crossfade the ends so the loop has no click.
  const fade = Math.floor(context.sampleRate * .05);
  for (let i = 0; i < fade; i++) { const k = i / fade; data[i] = data[i] * k + data[length - fade + i] * (1 - k); }
  return buffer;
}

export async function createFootfallAudio(options: FootfallAudioOptions): Promise<FootfallAudio> {
  const context = options.context ?? new AudioContext({ latencyHint: "interactive" });
  const fetchBuffer = options.fetchBuffer ?? (async (url: string) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Footfall sample ${url}: HTTP ${response.status}`);
    return response.arrayBuffer();
  });
  // Pre-load and decode every take before the first frame.
  const entries = await Promise.all(Object.entries(options.bank).map(async ([category, urls]) =>
    [category, await Promise.all(urls.map(async url => context.decodeAudioData(await fetchBuffer(url))))] as const));
  const buffers = new Map<string, AudioBuffer[]>(entries);
  const last = new Map<string, number>();

  // Bus: voices → glue compressor → master gain → destination.
  const master = context.createGain();
  master.gain.value = options.volume ?? .8;
  const glue = context.createDynamicsCompressor();
  glue.threshold.value = -16; glue.knee.value = 8; glue.ratio.value = 3; glue.attack.value = .004; glue.release.value = .12;
  glue.connect(master).connect(context.destination);
  const voices = Array.from({ length: options.voices ?? 24 }, () => {
    const gain = context.createGain(), pan = context.createStereoPanner();
    gain.connect(pan).connect(glue);
    return { gain, pan };
  });
  let nextVoice = 0, seed = 987654321;
  const random = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  // Air rush: looping noise through a band-pass whose level follows speed.
  let air: { source: AudioBufferSourceNode; gain: GainNode; filter: BiquadFilterNode } | null = null;
  if (options.airRush ?? true) {
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = noiseBuffer(context); source.loop = true;
    filter.type = "bandpass"; filter.frequency.value = 700; filter.Q.value = .5;
    gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(glue);
    source.start();
    air = { source, gain, filter };
  }

  return {
    context,
    setVolume(volume) { master.gain.setTargetAtTime(Math.max(0, volume), context.currentTime, .05); },
    play(hit) {
      const takes = buffers.get(hit.category);
      if (!takes?.length || hit.when < context.currentTime - .05) return;
      // Rotate takes without repeating the previous one.
      let index = Math.floor(random() * takes.length);
      if (takes.length > 1 && index === last.get(hit.category)) index = (index + 1 + Math.floor(random() * (takes.length - 1))) % takes.length;
      last.set(hit.category, index);
      const voice = voices[nextVoice]; nextVoice = (nextVoice + 1) % voices.length;
      const when = Math.max(context.currentTime, hit.when);
      const pj = hit.pitchJitter ?? .04, gj = hit.gainJitter ?? .15;
      const source = context.createBufferSource();
      source.buffer = takes[index];
      source.playbackRate.setValueAtTime(hit.rate * (1 + (random() * 2 - 1) * pj), when);
      voice.gain.gain.setValueAtTime(Math.max(0, hit.gain * (1 + (random() * 2 - 1) * gj)), when);
      voice.pan.pan.setValueAtTime(Math.max(-1, Math.min(1, hit.pan ?? 0)), when);
      source.connect(voice.gain);
      source.start(when);
      source.onended = () => source.disconnect();
    },
    setAirRush(level) {
      if (!air) return;
      const k = Math.max(0, Math.min(1, level)), now = context.currentTime;
      air.gain.gain.setTargetAtTime(.22 * k * k, now, .25);
      air.filter.frequency.setTargetAtTime(450 + 1100 * k, now, .25);
    },
    resume: () => context.resume(),
    dispose() {
      air?.source.stop();
      for (const v of voices) { v.gain.disconnect(); v.pan.disconnect(); }
      glue.disconnect(); master.disconnect();
      if (!options.context) void context.close();
    },
  };
}
