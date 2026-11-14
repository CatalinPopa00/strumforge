export interface ChordVoicing {
  name: string;
  frets: number[]; // length 6, low E (index 0) to high e (index 5); -1 = muted, 0 = open
  fingers: number[]; // 0 = open/muted, 1..4 = finger
  baseFret: number; // starting fret for diagram (1 = open nut)
  barre?: { fret: number; fromString: number; toString: number };
}

export const CHROMATIC_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const FLAT_TO_SHARP: Record<string, string> = {
  Db: 'C#',
  Eb: 'D#',
  Fb: 'E',
  Gb: 'F#',
  Ab: 'G#',
  Bb: 'A#',
  Cb: 'B',
};

// Standard tuning MIDI numbers: E2, A2, D3, G3, B3, E4
export const STANDARD_TUNING_MIDI = [40, 45, 50, 55, 59, 64];
export const STRING_LABELS = ['E', 'A', 'D', 'G', 'B', 'e'];

const QUALITY_INTERVALS: Record<string, { intervals: number[]; labels: string[] }> = {
  '': { intervals: [0, 4, 7], labels: ['R', '3', '5'] },
  m: { intervals: [0, 3, 7], labels: ['R', 'b3', '5'] },
  '7': { intervals: [0, 4, 7, 10], labels: ['R', '3', '5', 'b7'] },
  m7: { intervals: [0, 3, 7, 10], labels: ['R', 'b3', '5', 'b7'] },
  maj7: { intervals: [0, 4, 7, 11], labels: ['R', '3', '5', '7'] },
  sus4: { intervals: [0, 5, 7], labels: ['R', '4', '5'] },
  sus2: { intervals: [0, 2, 7], labels: ['R', '2', '5'] },
  add9: { intervals: [0, 4, 7, 2], labels: ['R', '3', '5', '9'] },
  dim: { intervals: [0, 3, 6], labels: ['R', 'b3', 'b5'] },
  aug: { intervals: [0, 4, 8], labels: ['R', '3', '#5'] },
};

const OPEN_VOICINGS: Record<string, Omit<ChordVoicing, 'name'>> = {
  C: { frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0], baseFret: 1 },
  Cmaj7: { frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0], baseFret: 1 },
  C7: { frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0], baseFret: 1 },
  Cadd9: { frets: [-1, 3, 2, 0, 3, 3], fingers: [0, 2, 1, 0, 3, 4], baseFret: 1 },
  D: { frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2], baseFret: 1 },
  Dm: { frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1], baseFret: 1 },
  D7: { frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3], baseFret: 1 },
  Dm7: { frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1], baseFret: 1, barre: { fret: 1, fromString: 4, toString: 5 } },
  Dmaj7: { frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 2, 3], baseFret: 1 },
  Dsus2: { frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 3, 0], baseFret: 1 },
  Dsus4: { frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4], baseFret: 1 },
  E: { frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0], baseFret: 1 },
  Em: { frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0], baseFret: 1 },
  E7: { frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0], baseFret: 1 },
  Em7: { frets: [0, 2, 2, 0, 3, 0], fingers: [0, 2, 3, 0, 4, 0], baseFret: 1 },
  F: { frets: [1, 3, 3, 2, 1, 1], fingers: [1, 3, 4, 2, 1, 1], baseFret: 1, barre: { fret: 1, fromString: 0, toString: 5 } },
  Fmaj7: { frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0], baseFret: 1 },
  Fm: { frets: [1, 3, 3, 1, 1, 1], fingers: [1, 3, 4, 1, 1, 1], baseFret: 1, barre: { fret: 1, fromString: 0, toString: 5 } },
  G: { frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3], baseFret: 1 },
  G7: { frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1], baseFret: 1 },
  Gm: { frets: [3, 5, 5, 3, 3, 3], fingers: [1, 3, 4, 1, 1, 1], baseFret: 3, barre: { fret: 3, fromString: 0, toString: 5 } },
  A: { frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0], baseFret: 1 },
  Am: { frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0], baseFret: 1 },
  A7: { frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0], baseFret: 1 },
  Am7: { frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0], baseFret: 1 },
  Amaj7: { frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 2, 1, 3, 0], baseFret: 1 },
  Asus2: { frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0], baseFret: 1 },
  Asus4: { frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0], baseFret: 1 },
  B: { frets: [-1, 2, 4, 4, 4, 2], fingers: [0, 1, 2, 3, 4, 1], baseFret: 2, barre: { fret: 2, fromString: 1, toString: 5 } },
  Bm: { frets: [-1, 2, 4, 4, 3, 2], fingers: [0, 1, 3, 4, 2, 1], baseFret: 2, barre: { fret: 2, fromString: 1, toString: 5 } },
  B7: { frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4], baseFret: 1 },
  Bm7: { frets: [-1, 2, 4, 2, 3, 2], fingers: [0, 1, 3, 1, 2, 1], baseFret: 2, barre: { fret: 2, fromString: 1, toString: 5 } },
};

export function normalizeNote(note: string): string {
  return FLAT_TO_SHARP[note] ?? note;
}

export function parseChordName(chordName: string): { root: string; quality: string } {
  const clean = chordName.split('/')[0].trim();
  const match = /^([A-G][#b]?)(.*)$/.exec(clean);
  if (!match) return { root: 'C', quality: '' };
  return {
    root: normalizeNote(match[1]),
    quality: match[2] || '',
  };
}

export function transposeChord(chordName: string, semitones: number): string {
  if (!semitones) return chordName;
  const [mainPart, bassPart] = chordName.split('/');
  const { root, quality } = parseChordName(mainPart);
  const idx = CHROMATIC_SHARP.indexOf(root as (typeof CHROMATIC_SHARP)[number]);
  if (idx === -1) return chordName;
  const newRoot = CHROMATIC_SHARP[(idx + semitones + 120) % 12];
  if (bassPart) {
    const bassNorm = normalizeNote(bassPart.trim());
    const bIdx = CHROMATIC_SHARP.indexOf(bassNorm as (typeof CHROMATIC_SHARP)[number]);
    if (bIdx !== -1) {
      return `${newRoot}${quality}/${CHROMATIC_SHARP[(bIdx + semitones + 120) % 12]}`;
    }
  }
  return `${newRoot}${quality}`;
}

export function getChordVoicing(chordName: string): ChordVoicing {
  const { root, quality } = parseChordName(chordName);
  const canonical = `${root}${quality}`;
  if (OPEN_VOICINGS[canonical]) {
    return { name: chordName, ...OPEN_VOICINGS[canonical] };
  }

  // Generate movable E-shape or A-shape barre voicing
  const rootIdx = CHROMATIC_SHARP.indexOf(root as (typeof CHROMATIC_SHARP)[number]);
  const eRootFret = (rootIdx - CHROMATIC_SHARP.indexOf('E') + 12) % 12 || 12;
  const aRootFret = (rootIdx - CHROMATIC_SHARP.indexOf('A') + 12) % 12 || 12;

  const useAShape = aRootFret <= 7 && aRootFret < eRootFret;
  if (useAShape) {
    const f = aRootFret;
    const shapes: Record<string, { offsets: number[]; fingers: number[] }> = {
      '': { offsets: [-1, 0, 2, 2, 2, 0], fingers: [0, 1, 2, 3, 4, 1] },
      m: { offsets: [-1, 0, 2, 2, 1, 0], fingers: [0, 1, 3, 4, 2, 1] },
      '7': { offsets: [-1, 0, 2, 0, 2, 0], fingers: [0, 1, 3, 1, 4, 1] },
      m7: { offsets: [-1, 0, 2, 0, 1, 0], fingers: [0, 1, 3, 1, 2, 1] },
      maj7: { offsets: [-1, 0, 2, 1, 2, 0], fingers: [0, 1, 3, 2, 4, 1] },
      sus4: { offsets: [-1, 0, 2, 2, 3, 0], fingers: [0, 1, 2, 3, 4, 1] },
      sus2: { offsets: [-1, 0, 2, 2, 0, 0], fingers: [0, 1, 3, 4, 1, 1] },
    };
    const shape = shapes[quality] ?? shapes[''];
    return {
      name: chordName,
      frets: shape.offsets.map((o) => (o < 0 ? -1 : f + o)),
      fingers: shape.fingers,
      baseFret: f,
      barre: { fret: f, fromString: 1, toString: 5 },
    };
  }

  const f = eRootFret;
  const eShapes: Record<string, { offsets: number[]; fingers: number[] }> = {
    '': { offsets: [0, 2, 2, 1, 0, 0], fingers: [1, 3, 4, 2, 1, 1] },
    m: { offsets: [0, 2, 2, 0, 0, 0], fingers: [1, 3, 4, 1, 1, 1] },
    '7': { offsets: [0, 2, 0, 1, 0, 0], fingers: [1, 3, 1, 2, 1, 1] },
    m7: { offsets: [0, 2, 0, 0, 0, 0], fingers: [1, 3, 1, 1, 1, 1] },
    maj7: { offsets: [0, 2, 1, 1, 0, -1], fingers: [1, 4, 2, 3, 1, 0] },
    sus4: { offsets: [0, 2, 2, 2, 0, 0], fingers: [1, 2, 3, 4, 1, 1] },
  };
  const shape = eShapes[quality] ?? eShapes[''];
  return {
    name: chordName,
    frets: shape.offsets.map((o) => (o < 0 ? -1 : f + o)),
    fingers: shape.fingers,
    baseFret: f,
    barre: { fret: f, fromString: 0, toString: 5 },
  };
}

export function getChordMidiNotes(chordName: string): number[] {
  const voicing = getChordVoicing(chordName);
  const notes: number[] = [];
  voicing.frets.forEach((fret, stringIdx) => {
    if (fret >= 0) {
      notes.push(STANDARD_TUNING_MIDI[stringIdx] + fret);
    }
  });
  return notes;
}

export function getChordNoteRole(chordName: string, midiNote: number): string | null {
  const { root, quality } = parseChordName(chordName);
  const rootIdx = CHROMATIC_SHARP.indexOf(root as (typeof CHROMATIC_SHARP)[number]);
  if (rootIdx === -1) return null;
  const def = QUALITY_INTERVALS[quality] ?? QUALITY_INTERVALS[''];
  const semitone = ((midiNote % 12) - rootIdx + 12) % 12;
  const matchIdx = def.intervals.indexOf(semitone);
  return matchIdx >= 0 ? def.labels[matchIdx] : null;
}

export function midiToNoteName(midi: number): string {
  return CHROMATIC_SHARP[midi % 12];
}

export function midiToHz(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
