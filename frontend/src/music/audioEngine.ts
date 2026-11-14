import { getChordMidiNotes, midiToHz } from './chords';
import type { StrumSymbol } from '../types';

export type GuitarTone = 'acoustic' | 'nylon' | 'clean';
export type AuditionStyle = 'D' | 'U' | 'arp' | 'groove';

class StudioAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private stringCache = new Map<string, AudioBuffer>();
  private grooveTimers: number[] = [];
  private tone: GuitarTone = 'acoustic';

  public setTone(tone: GuitarTone): void {
    this.tone = tone;
  }

  public getTone(): GuitarTone {
    return this.tone;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new window.AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    if (!this.noiseBuffer) {
      const len = Math.floor(this.ctx.sampleRate * 0.12);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.25));
      }
      this.noiseBuffer = buf;
    }
    return this.ctx;
  }

  /** Synthesize a physical Karplus-Strong plucked guitar string buffer for a given MIDI note & tone. */
  private getKarplusStrongBuffer(midi: number, durationSec = 2.0): AudioBuffer {
    const ctx = this.ensureContext();
    const cacheKey = `${this.tone}:${midi}`;
    const cached = this.stringCache.get(cacheKey);
    if (cached) return cached;

    const sr = ctx.sampleRate;
    const totalSamples = Math.floor(sr * durationSec);
    const freq = midiToHz(midi);
    const periodFloat = sr / freq;
    const delayLen = Math.max(2, Math.floor(periodFloat));

    const buf = ctx.createBuffer(1, totalSamples, sr);
    const out = buf.getChannelData(0);

    // Tone parameters
    const brightness = this.tone === 'acoustic' ? 0.496 : this.tone === 'clean' ? 0.498 : 0.475;
    const decay = this.tone === 'nylon' ? 0.9925 : this.tone === 'clean' ? 0.9968 : 0.9955;
    const pickPos = this.tone === 'nylon' ? 0.28 : 0.18;

    // Initial string excitation (filtered white noise + soft fundamental impulse for warm body)
    const ring = new Float32Array(delayLen);
    let lp = 0;
    const lpAlpha = this.tone === 'nylon' ? 0.28 : this.tone === 'clean' ? 0.55 : 0.48;
    for (let i = 0; i < delayLen; i++) {
      const rawNoise = Math.random() * 2 - 1;
      lp = lp + lpAlpha * (rawNoise - lp);
      const comb = Math.sin((Math.PI * i) / Math.max(2, delayLen * pickPos));
      ring[i] = lp * 0.72 + 0.28 * comb * Math.sin((2 * Math.PI * i) / delayLen);
    }

    let idx = 0;
    let prev = ring[delayLen - 1];
    for (let n = 0; n < totalSamples; n++) {
      const cur = ring[idx];
      out[n] = cur;

      // Two-point averaging lowpass + decay (Karplus-Strong loop)
      const nextVal = decay * (brightness * cur + (1 - brightness) * prev);
      ring[idx] = nextVal;
      prev = cur;
      idx = (idx + 1) % delayLen;
    }

    // Gentle fade out at the tail
    const tailSamples = Math.min(totalSamples, Math.floor(sr * 0.08));
    for (let i = 0; i < tailSamples; i++) {
      out[totalSamples - 1 - i] *= i / tailSamples;
    }

    if (this.stringCache.size > 160) {
      this.stringCache.clear();
    }
    this.stringCache.set(cacheKey, buf);
    return buf;
  }

  public pluckMidi(midi: number, when = 0, duration = 1.65, gainLevel = 0.28): void {
    const ctx = this.ensureContext();
    const startTime = when > 0 ? when : ctx.currentTime;
    const buf = this.getKarplusStrongBuffer(midi, Math.max(1.6, duration));

    const src = ctx.createBufferSource();
    src.buffer = buf;

    // Acoustic body warmth (slight resonant peak around 120Hz + smooth high rolloff)
    const body = ctx.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.setValueAtTime(this.tone === 'nylon' ? 105 : 128, startTime);
    body.Q.value = 1.4;
    body.gain.value = this.tone === 'clean' ? 1.5 : 4.0;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(gainLevel, startTime + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    src.connect(body);
    body.connect(gain);
    gain.connect(ctx.destination);

    src.start(startTime);
    src.stop(startTime + duration + 0.04);
  }

  public playChuck(when = 0, gainLevel = 0.16): void {
    const ctx = this.ensureContext();
    if (!this.noiseBuffer) return;
    const startTime = when > 0 ? when : ctx.currentTime;

    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1400, startTime);
    bp.Q.value = 1.6;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);

    src.connect(bp);
    bp.connect(gain);
    gain.connect(ctx.destination);
    src.start(startTime);
  }

  public stopGrooveSimulation(): void {
    for (const id of this.grooveTimers) {
      window.clearTimeout(id);
    }
    this.grooveTimers = [];
  }

  public strumChord(
    chordName: string,
    direction: 'D' | 'U' | 'x' | 'arp' = 'D',
    gainScale = 1.0,
    semitoneShift = 0
  ): void {
    const ctx = this.ensureContext();
    if (direction === 'x') {
      this.playChuck(ctx.currentTime, 0.18 * gainScale);
      return;
    }

    const notes = getChordMidiNotes(chordName).map((m) => m + semitoneShift);
    if (!notes.length) return;
    const ordered = direction === 'U' ? [...notes].reverse() : notes;
    const now = ctx.currentTime;

    const delayStep = direction === 'arp' ? 0.13 : direction === 'U' ? 0.016 : 0.024;
    const duration = direction === 'arp' ? 1.85 : 1.55;
    const noteGain = (direction === 'U' ? 0.2 : direction === 'arp' ? 0.26 : 0.23) * gainScale;

    ordered.forEach((midi, idx) => {
      this.pluckMidi(midi, now + idx * delayStep, duration, noteGain);
    });
  }

  /** Simulate 1 full measure of a chord using the song's exact strumming pattern & BPM. */
  public simulateChordGroove(
    chordName: string,
    pattern: StrumSymbol[],
    bpm: number,
    timeSignature: string,
    semitoneShift = 0
  ): void {
    this.stopGrooveSimulation();
    const beatMs = (60 / Math.max(45, bpm)) * 1000;
    const slotMs = timeSignature === '6/8' ? beatMs : beatMs / 2;

    pattern.forEach((sym, idx) => {
      if (sym === '-') return;
      const timerId = window.setTimeout(() => {
        this.strumChord(chordName, sym, 0.95, semitoneShift);
      }, idx * slotMs);
      this.grooveTimers.push(timerId);
    });
  }

  public auditionChord(
    chordName: string,
    style: AuditionStyle,
    options?: {
      pattern?: StrumSymbol[];
      bpm?: number;
      timeSignature?: string;
      semitoneShift?: number;
    }
  ): void {
    const shift = options?.semitoneShift ?? 0;
    if (style === 'groove' && options?.pattern) {
      this.simulateChordGroove(
        chordName,
        options.pattern,
        options.bpm ?? 96,
        options.timeSignature ?? '4/4',
        shift
      );
      return;
    }
    this.stopGrooveSimulation();
    this.strumChord(chordName, style === 'groove' ? 'D' : style, 1.0, shift);
  }

  public playMetronomeClick(accent: boolean, volume = 0.4): void {
    const ctx = this.ensureContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(accent ? 1320 : 880, now);
    osc.frequency.exponentialRampToValueAtTime(accent ? 760 : 520, now + 0.035);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume * (accent ? 0.55 : 0.34), now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + 0.055);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.06);
  }
}

export const audioEngine = new StudioAudioEngine();
