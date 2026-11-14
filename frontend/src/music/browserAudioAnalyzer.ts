import type { ChordEvent, SongProject, SongSection, StrumSymbol } from '../types';

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

const MAJOR_PROFILE = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const MINOR_PROFILE = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

const CHORD_QUALITIES: Record<string, Record<number, number>> = {
  '': { 0: 1.0, 4: 0.88, 7: 0.85 },
  m: { 0: 1.0, 3: 0.9, 7: 0.85 },
  '7': { 0: 1.0, 4: 0.82, 7: 0.72, 10: 0.58 },
  m7: { 0: 1.0, 3: 0.84, 7: 0.72, 10: 0.58 },
  maj7: { 0: 1.0, 4: 0.82, 7: 0.72, 11: 0.56 },
  sus4: { 0: 1.0, 5: 0.86, 7: 0.82 },
  sus2: { 0: 1.0, 2: 0.84, 7: 0.82 },
};

interface ChordTemplate {
  name: string;
  root: string;
  rootIdx: number;
  quality: string;
  vector: Float32Array;
  penalty: number;
}

const CHORD_TEMPLATES: ChordTemplate[] = (() => {
  const list: ChordTemplate[] = [];
  NOTE_NAMES.forEach((rootName, rootIdx) => {
    for (const [quality, intervals] of Object.entries(CHORD_QUALITIES)) {
      const vec = new Float32Array(12);
      for (const [ivStr, w] of Object.entries(intervals)) {
        vec[(rootIdx + Number(ivStr)) % 12] = w;
      }
      let norm = 0;
      for (let i = 0; i < 12; i++) norm += vec[i] * vec[i];
      norm = Math.sqrt(norm) + 1e-8;
      for (let i = 0; i < 12; i++) vec[i] /= norm;

      let penalty = 0.0;
      if (quality === '7' || quality === 'm7') penalty = 0.048;
      else if (quality !== '' && quality !== 'm') penalty = 0.075;

      list.push({
        name: `${rootName}${quality}`,
        root: rootName,
        rootIdx,
        quality,
        vector: vec,
        penalty,
      });
    }
  });
  return list;
})();

/** In-place radix-2 Cooley-Tukey FFT. real and imag must have length N (power of 2). */
function fftInPlace(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      const tr = real[i];
      const ti = imag[i];
      real[i] = real[j];
      imag[i] = imag[j];
      real[j] = tr;
      imag[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wCos = Math.cos(angle);
    const wSin = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let curCos = 1;
      let curSin = 0;
      for (let j = 0; j < half; j++) {
        const uIdx = i + j;
        const vIdx = uIdx + half;
        const vr = real[vIdx] * curCos - imag[vIdx] * curSin;
        const vi = real[vIdx] * curSin + imag[vIdx] * curCos;
        real[vIdx] = real[uIdx] - vr;
        imag[vIdx] = imag[uIdx] - vi;
        real[uIdx] += vr;
        imag[uIdx] += vi;
        const nextCos = curCos * wCos - curSin * wSin;
        curSin = curCos * wSin + curSin * wCos;
        curCos = nextCos;
      }
    }
  }
}

async function decodeToMono22k(file: File): Promise<{ samples: Float32Array; sampleRate: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtx = window.AudioContext;
  const ctx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(arrayBuffer);
  } finally {
    void ctx.close();
  }

  const targetSr = 22050;
  const maxSec = Math.min(decoded.duration, 360);
  const targetLength = Math.max(targetSr, Math.floor(maxSec * targetSr));

  const offline = new OfflineAudioContext(1, targetLength, targetSr);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start(0);
  const rendered = await offline.startRendering();
  const samples = rendered.getChannelData(0).slice();

  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }
  if (peak > 1e-6) {
    for (let i = 0; i < samples.length; i++) samples[i] /= peak;
  }
  return { samples, sampleRate: targetSr };
}

function buildChromaFilterbank(
  sampleRate: number,
  nFft: number,
  tuningSemitones = 0,
  minFreq = 75,
  maxFreq = 1800
): Float32Array[] {
  const nBins = nFft / 2 + 1;
  const fb = Array.from({ length: 12 }, () => new Float32Array(nBins));
  const centerFreq = maxFreq <= 260 ? 135 : 280;

  for (let b = 1; b < nBins; b++) {
    const freq = (b * sampleRate) / nFft;
    if (freq < minFreq || freq > maxFreq) continue;
    const midi = 69 + 12 * Math.log2(freq / 440) - tuningSemitones;
    const pcVal = ((midi % 12) + 12) % 12;
    const freqWeight = Math.exp(-0.5 * Math.pow(Math.log2(freq / centerFreq) / 1.45, 2));

    for (let pc = 0; pc < 12; pc++) {
      let dist = Math.abs(pcVal - pc);
      dist = Math.min(dist, 12 - dist);
      fb[pc][b] = Math.exp(-0.5 * Math.pow(dist / 0.32, 2)) * freqWeight;
    }
  }

  for (let pc = 0; pc < 12; pc++) {
    let sum = 1e-8;
    for (let b = 0; b < nBins; b++) sum += fb[pc][b];
    for (let b = 0; b < nBins; b++) fb[pc][b] /= sum;
  }
  return fb;
}

function correlateKey(globalChroma: Float32Array): string {
  let norm = 0;
  for (let i = 0; i < 12; i++) norm += globalChroma[i] * globalChroma[i];
  if (norm < 1e-10) return 'C major';

  const pearson = (a: Float32Array, b: number[]) => {
    let ma = 0;
    let mb = 0;
    for (let i = 0; i < 12; i++) {
      ma += a[i];
      mb += b[i];
    }
    ma /= 12;
    mb /= 12;
    let num = 0;
    let da = 0;
    let db = 0;
    for (let i = 0; i < 12; i++) {
      const xa = a[i] - ma;
      const xb = b[i] - mb;
      num += xa * xb;
      da += xa * xa;
      db += xb * xb;
    }
    return num / (Math.sqrt(da * db) + 1e-8);
  };

  let bestKey = 'C major';
  let bestScore = -10;
  for (let root = 0; root < 12; root++) {
    const majRot = new Array<number>(12);
    const minRot = new Array<number>(12);
    for (let i = 0; i < 12; i++) {
      majRot[(i + root) % 12] = MAJOR_PROFILE[i];
      minRot[(i + root) % 12] = MINOR_PROFILE[i];
    }
    const cm = pearson(globalChroma, majRot);
    const cn = pearson(globalChroma, minRot);
    if (cm > bestScore) {
      bestScore = cm;
      bestKey = `${NOTE_NAMES[root]} major`;
    }
    if (cn > bestScore) {
      bestScore = cn;
      bestKey = `${NOTE_NAMES[root]} minor`;
    }
  }
  return bestKey;
}

export async function analyzeAudioInBrowser(file: File, titleOverride?: string): Promise<SongProject> {
  const { samples, sampleRate } = await decodeToMono22k(file);
  const duration = samples.length / sampleRate;

  const nFft = 8192;
  const hopLength = 1024;
  const nBins = nFft / 2 + 1;
  const frameRate = sampleRate / hopLength;

  // Precompute Hann window
  const hann = new Float32Array(nFft);
  for (let i = 0; i < nFft; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (nFft - 1)));
  }

  const numFrames = Math.max(1, Math.floor((samples.length - nFft) / hopLength) + 1);
  const frameTimes = new Float32Array(numFrames);
  const magFrames: Float32Array[] = new Array(numFrames);
  const meanSpec = new Float32Array(nBins);

  const real = new Float32Array(nFft);
  const imag = new Float32Array(nFft);

  for (let f = 0; f < numFrames; f++) {
    const start = f * hopLength;
    frameTimes[f] = (start + nFft * 0.5) / sampleRate;
    for (let i = 0; i < nFft; i++) {
      real[i] = (samples[start + i] ?? 0) * hann[i];
      imag[i] = 0;
    }
    fftInPlace(real, imag);

    const mag = new Float32Array(nBins);
    for (let b = 0; b < nBins; b++) {
      const m = Math.hypot(real[b], imag[b]);
      mag[b] = m;
      meanSpec[b] += m / numFrames;
    }
    magFrames[f] = mag;
  }

  // Estimate tuning offset
  let bestTuning = 0;
  let bestContrast = -1;
  for (const offset of [-0.35, -0.2, -0.1, 0, 0.1, 0.2, 0.35]) {
    const fbTest = buildChromaFilterbank(sampleRate, nFft, offset);
    const c = new Float32Array(12);
    for (let pc = 0; pc < 12; pc++) {
      let s = 0;
      for (let b = 0; b < nBins; b++) s += fbTest[pc][b] * meanSpec[b];
      c[pc] = s;
    }
    const sorted = Array.from(c).sort((a, b) => a - b);
    const norm = Math.hypot(...c) + 1e-8;
    const score = (sorted[11] - sorted[6]) / norm;
    if (score > bestContrast) {
      bestContrast = score;
      bestTuning = offset;
    }
  }

  const fbMid = buildChromaFilterbank(sampleRate, nFft, bestTuning, 75, 1800);
  const fbBass = buildChromaFilterbank(sampleRate, nFft, bestTuning, 75, 220);

  const chromaFrames: Float32Array[] = new Array(numFrames);
  const bassFrames: Float32Array[] = new Array(numFrames);
  const globalChroma = new Float32Array(12);

  const onsetEnv = new Float32Array(numFrames);
  const hiOnset = new Float32Array(numFrames);
  const hiStartBin = Math.floor((1800 * nFft) / sampleRate);
  const hiEndBin = Math.min(nBins - 1, Math.floor((8000 * nFft) / sampleRate));
  let prevLogSpec: Float32Array | null = null;

  for (let f = 0; f < numFrames; f++) {
    const mag = magFrames[f];
    const c = new Float32Array(12);
    const bc = new Float32Array(12);

    for (let pc = 0; pc < 12; pc++) {
      let s = 0;
      let bs = 0;
      const rowMid = fbMid[pc];
      const rowBass = fbBass[pc];
      for (let b = 1; b < nBins; b++) {
        s += rowMid[b] * mag[b];
        bs += rowBass[b] * mag[b];
      }
      c[pc] = s;
      bc[pc] = bs;
      globalChroma[pc] += s;
    }
    chromaFrames[f] = c;
    bassFrames[f] = bc;

    const curLog = new Float32Array(nBins);
    let sumDiff = 0;
    let hiDiff = 0;
    for (let b = 0; b < nBins; b++) {
      const lv = Math.log1p(12 * mag[b]);
      curLog[b] = lv;
      if (prevLogSpec) {
        const d = Math.max(0, lv - prevLogSpec[b]);
        sumDiff += d;
        if (b >= hiStartBin && b <= hiEndBin) hiDiff += d;
      }
    }
    onsetEnv[f] = sumDiff / nBins;
    hiOnset[f] = hiDiff / Math.max(1, hiEndBin - hiStartBin + 1);
    prevLogSpec = curLog;
  }

  // Normalize onset curves
  const winHalf = Math.max(2, Math.floor((frameRate * 0.4) / 2));
  const onsetNorm = new Float32Array(numFrames);
  let maxOnset = 1e-8;
  let maxHi = 1e-8;
  for (let f = 0; f < numFrames; f++) {
    let sum = 0;
    let cnt = 0;
    for (let k = Math.max(0, f - winHalf); k <= Math.min(numFrames - 1, f + winHalf); k++) {
      sum += onsetEnv[k];
      cnt++;
    }
    const v = Math.max(0, onsetEnv[f] - sum / cnt);
    onsetNorm[f] = v;
    if (v > maxOnset) maxOnset = v;
    if (hiOnset[f] > maxHi) maxHi = hiOnset[f];
  }
  for (let f = 0; f < numFrames; f++) {
    onsetNorm[f] /= maxOnset;
    hiOnset[f] /= maxHi;
  }

  // Autocorrelation BPM estimation (62 - 176 BPM)
  const maxLag = Math.min(numFrames - 1, Math.ceil((60 / 62) * frameRate * 2.1));
  const ac = new Float32Array(maxLag + 1);
  for (let lag = 1; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = 0; i < numFrames - lag; i++) {
      s += onsetNorm[i] * onsetNorm[i + lag];
    }
    ac[lag] = s;
  }

  let bestBpm = 100;
  let bestBpmScore = -1;
  for (let bpm = 62; bpm <= 176; bpm++) {
    const period = (60 / bpm) * frameRate;
    const l1 = Math.round(period);
    const l2 = Math.round(period * 2);
    const lh = Math.round(period * 0.5);
    if (l2 > maxLag) continue;
    const raw = ac[l1] + 0.55 * ac[l2] + 0.25 * ac[lh];
    const prior = Math.exp(-0.5 * Math.pow((bpm - 104) / 38, 2));
    const weighted = raw * (0.78 + 0.22 * prior);
    if (weighted > bestBpmScore) {
      bestBpmScore = weighted;
      bestBpm = bpm;
    }
  }

  // Phase-lock beat grid
  const beatSec = 60 / bestBpm;
  let bestPhase = 0;
  let bestPhaseScore = -1;
  for (let i = 0; i < 40; i++) {
    const phase = (i / 40) * beatSec;
    let sum = 0;
    let cnt = 0;
    for (let t = phase; t < duration; t += beatSec) {
      const idx = Math.min(numFrames - 1, Math.max(0, Math.round(t * frameRate)));
      sum += onsetNorm[idx];
      cnt++;
    }
    const avg = cnt > 0 ? sum / cnt : 0;
    if (avg > bestPhaseScore) {
      bestPhaseScore = avg;
      bestPhase = phase;
    }
  }
  while (bestPhase - beatSec >= 0) bestPhase -= beatSec;
  const beats: number[] = [];
  for (let t = bestPhase; t < duration; t += beatSec) beats.push(t);
  if (beats.length === 0) beats.push(0);

  // Beat-synchronous Viterbi chord detection
  const nBeats = beats.length;
  const nChords = CHORD_TEMPLATES.length;
  const emissions: Float32Array[] = new Array(nBeats);
  const beatDurs = new Float32Array(nBeats);

  for (let bi = 0; bi < nBeats; bi++) {
    const bStart = beats[bi];
    const bEnd = bi + 1 < nBeats ? beats[bi + 1] : Math.min(duration, bStart + beatSec);
    beatDurs[bi] = Math.max(0.15, bEnd - bStart);

    const avgMid = new Float32Array(12);
    const avgBass = new Float32Array(12);
    let cnt = 0;
    for (let f = 0; f < numFrames; f++) {
      if (frameTimes[f] >= bStart && frameTimes[f] < bEnd) {
        for (let pc = 0; pc < 12; pc++) {
          avgMid[pc] += chromaFrames[f][pc];
          avgBass[pc] += bassFrames[f][pc];
        }
        cnt++;
      }
    }
    if (cnt === 0) {
      let nearest = 0;
      let minDist = Infinity;
      for (let f = 0; f < numFrames; f++) {
        const d = Math.abs(frameTimes[f] - bStart);
        if (d < minDist) {
          minDist = d;
          nearest = f;
        }
      }
      avgMid.set(chromaFrames[nearest]);
      avgBass.set(bassFrames[nearest]);
    }

    let nMid = 0;
    let nBass = 0;
    for (let pc = 0; pc < 12; pc++) {
      nMid += avgMid[pc] * avgMid[pc];
      nBass += avgBass[pc] * avgBass[pc];
    }
    nMid = Math.sqrt(nMid) + 1e-8;
    nBass = Math.sqrt(nBass) + 1e-8;
    for (let pc = 0; pc < 12; pc++) {
      avgMid[pc] /= nMid;
      avgBass[pc] /= nBass;
    }

    const em = new Float32Array(nChords);
    for (let c = 0; c < nChords; c++) {
      const tpl = CHORD_TEMPLATES[c];
      let dot = 0;
      for (let pc = 0; pc < 12; pc++) dot += avgMid[pc] * tpl.vector[pc];
      em[c] = dot + 0.18 * avgBass[tpl.rootIdx] - tpl.penalty;
    }
    emissions[bi] = em;
  }

  // Viterbi DP
  const stayBonus = 0.22;
  const dp: Float32Array[] = Array.from({ length: nBeats }, () => new Float32Array(nChords));
  const back: Int32Array[] = Array.from({ length: nBeats }, () => new Int32Array(nChords));
  dp[0].set(emissions[0]);

  for (let t = 1; t < nBeats; t++) {
    const prev = dp[t - 1];
    let bestPrevIdx = 0;
    let bestPrevVal = prev[0];
    for (let c = 1; c < nChords; c++) {
      if (prev[c] > bestPrevVal) {
        bestPrevVal = prev[c];
        bestPrevIdx = c;
      }
    }
    for (let c = 0; c < nChords; c++) {
      const stayVal = prev[c] + stayBonus;
      if (stayVal >= bestPrevVal) {
        dp[t][c] = stayVal + emissions[t][c];
        back[t][c] = c;
      } else {
        dp[t][c] = bestPrevVal + emissions[t][c];
        back[t][c] = bestPrevIdx;
      }
    }
  }

  const path = new Int32Array(nBeats);
  let lastBest = 0;
  for (let c = 1; c < nChords; c++) {
    if (dp[nBeats - 1][c] > dp[nBeats - 1][lastBest]) lastBest = c;
  }
  path[nBeats - 1] = lastBest;
  for (let t = nBeats - 2; t >= 0; t--) {
    path[t] = back[t + 1][path[t + 1]];
  }

  const chords: ChordEvent[] = [];
  for (let i = 0; i < nBeats; i++) {
    const tpl = CHORD_TEMPLATES[path[i]];
    const conf = Math.min(1, Math.max(0, emissions[i][path[i]] + tpl.penalty));
    const prevEv = chords[chords.length - 1];
    if (prevEv && prevEv.chord === tpl.name && prevEv.beats < 8) {
      prevEv.duration = Number((prevEv.duration + beatDurs[i]).toFixed(3));
      prevEv.beats += 1;
      prevEv.confidence = Number((((prevEv.confidence ?? conf) + conf) * 0.5).toFixed(2));
    } else {
      chords.push({
        time: Number(beats[i].toFixed(3)),
        duration: Number(beatDurs[i].toFixed(3)),
        beatIndex: i,
        beats: 1,
        chord: tpl.name,
        root: tpl.root,
        quality: tpl.quality,
        confidence: Number(conf.toFixed(2)),
      });
    }
  }

  // Infer 8th-note strumming pattern
  const slotEnergies = new Float32Array(8);
  const slotCounts = new Float32Array(8);
  for (let bi = 0; bi < beats.length - 1; bi++) {
    const barSlot = (bi % 4) * 2;
    const b0 = beats[bi];
    const mid = (b0 + beats[bi + 1]) * 0.5;
    for (let sub = 0; sub < 2; sub++) {
      const t = sub === 0 ? b0 : mid;
      const fIdx = Math.round(t * frameRate);
      let pk = 0;
      for (let k = Math.max(0, fIdx - 2); k <= Math.min(numFrames - 1, fIdx + 2); k++) {
        if (hiOnset[k] > pk) pk = hiOnset[k];
      }
      slotEnergies[barSlot + sub] += pk;
      slotCounts[barSlot + sub] += 1;
    }
  }
  const slotAvg = Array.from(slotEnergies, (v, i) => v / Math.max(1, slotCounts[i]));
  const meanSlot = slotAvg.reduce((a, b) => a + b, 0) / 8;
  let strummingPattern: StrumSymbol[] = slotAvg.map((v, i) => {
    if (i === 0) return 'D';
    if (v >= meanSlot * 0.72) return i % 2 === 0 ? 'D' : 'U';
    return '-';
  });
  if (strummingPattern.filter((s) => s !== '-').length < 3) {
    strummingPattern = ['D', '-', 'D', 'U', '-', 'U', 'D', 'U'];
  }

  // Waveform peaks (180 bins)
  const numBins = 180;
  const chunkSize = Math.max(1, Math.floor(samples.length / numBins));
  const waveform: number[] = [];
  for (let i = 0; i < numBins; i++) {
    const start = i * chunkSize;
    const end = Math.min(samples.length, start + chunkSize);
    if (start >= end) break;
    let pk = 0;
    for (let j = start; j < end; j++) {
      const a = Math.abs(samples[j]);
      if (a > pk) pk = a;
    }
    waveform.push(Number(pk.toFixed(3)));
  }

  // Sections
  const sections: SongSection[] = [];
  const sectionLabels = ['Intro', 'Strofa 1', 'Refren 1', 'Strofa 2', 'Refren 2', 'Bridge', 'Outro'];
  for (let i = 0; i < chords.length; i += 8) {
    const chunk = chords.slice(i, i + 8);
    const label = sectionLabels[Math.min(sections.length, sectionLabels.length - 1)];
    const startTime = chunk[0].time;
    const endTime = Number((chunk[chunk.length - 1].time + chunk[chunk.length - 1].duration).toFixed(3));
    sections.push({ name: label, startTime, endTime });
    chunk.forEach((ev) => {
      ev.section = label;
    });
  }

  const uniqueChords = Array.from(new Set(chords.map((c) => c.chord)));
  const cleanTitle = titleOverride?.trim() || file.name.replace(/\.[^/.]+$/, '');

  return {
    id: `analyzed-${Math.random().toString(36).slice(2, 10)}`,
    title: cleanTitle,
    artist: 'Analiză Audio în Browser (AI DSP)',
    youtubeId: '',
    youtubeUrl: '',
    bpm: bestBpm,
    beatOffset: Number(bestPhase.toFixed(3)),
    timeSignature: '4/4',
    key: correlateKey(globalChroma),
    capo: 0,
    difficulty: 'Detectat automat',
    duration: Number(duration.toFixed(2)),
    strummingPattern,
    strummingHint: `Ritm detectat din atacurile percusive (${bestBpm} BPM, 4/4). Poți ajusta sincronizarea sau edita orice acord.`,
    uniqueChords,
    chords,
    sections,
    waveform,
    isPreset: false,
    sourceType: 'browser_analyzed_audio',
  };
}
