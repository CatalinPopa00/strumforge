import { getChordMidiNotes, midiToHz } from './chords';

class StudioAudioEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;

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

  public pluckMidi(midi: number, when = 0, duration = 1.25, gainLevel = 0.14): void {
    const ctx = this.ensureContext();
    const startTime = when > 0 ? when : ctx.currentTime;
    const freq = midiToHz(midi);

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    osc1.type = 'triangle';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(freq, startTime);
    osc2.frequency.setValueAtTime(freq * 1.0018, startTime);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(Math.min(4800, freq * 8.5), startTime);
    filter.frequency.exponentialRampToValueAtTime(Math.max(320, freq * 1.8), startTime + duration * 0.7);
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(gainLevel, startTime + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0008, startTime + duration);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.28;

    osc1.connect(filter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.05);
    osc2.stop(startTime + duration + 0.05);
  }

  public playChuck(when = 0, gainLevel = 0.14): void {
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

  public strumChord(chordName: string, direction: 'D' | 'U' | 'x' = 'D', gainScale = 1.0): void {
    const ctx = this.ensureContext();
    if (direction === 'x') {
      this.playChuck(ctx.currentTime, 0.16 * gainScale);
      return;
    }

    const notes = getChordMidiNotes(chordName);
    if (!notes.length) return;
    const ordered = direction === 'U' ? [...notes].reverse() : notes;
    const now = ctx.currentTime;
    const delayStep = direction === 'U' ? 0.015 : 0.022;
    const noteGain = (direction === 'U' ? 0.09 : 0.11) * gainScale;

    ordered.forEach((midi, idx) => {
      this.pluckMidi(midi, now + idx * delayStep, 1.35, noteGain);
    });
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
