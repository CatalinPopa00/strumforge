import type { ChordEvent, SongProject, SongSection } from '../types';

function buildTimelineFromBars(
  bars: [string, number, string][],
  bpm: number,
  beatOffset = 0.0
): { chords: ChordEvent[]; sections: SongSection[]; duration: number } {
  const beatSec = 60.0 / bpm;
  const chords: ChordEvent[] = [];
  const sections: SongSection[] = [];
  let t = beatOffset;
  let beatIdx = 0;

  for (const [chordName, nBeats, sectionName] of bars) {
    const dur = Number((nBeats * beatSec).toFixed(3));
    let root = chordName[0];
    if (chordName.length > 1 && (chordName[1] === '#' || chordName[1] === 'b')) {
      root = chordName.slice(0, 2);
    }
    const quality = chordName.slice(root.length);
    chords.push({
      time: Number(t.toFixed(3)),
      duration: dur,
      beatIndex: beatIdx,
      beats: nBeats,
      chord: chordName,
      root,
      quality,
      confidence: 1.0,
      section: sectionName,
    });

    if (sections.length === 0 || sections[sections.length - 1].name !== sectionName) {
      sections.push({
        name: sectionName,
        startTime: Number(t.toFixed(3)),
        endTime: Number((t + dur).toFixed(3)),
      });
    } else {
      sections[sections.length - 1].endTime = Number((t + dur).toFixed(3));
    }
    t += dur;
    beatIdx += nBeats;
  }

  return { chords, sections, duration: Number(t.toFixed(2)) };
}

// 1. Knockin' on Heaven's Door
const kBars: [string, number, string][] = [
  ['G', 2, 'Intro'], ['D', 2, 'Intro'], ['Am7', 4, 'Intro'],
  ['G', 2, 'Intro'], ['D', 2, 'Intro'], ['C', 4, 'Intro'],
  ['G', 2, 'Strofa 1'], ['D', 2, 'Strofa 1'], ['Am7', 4, 'Strofa 1'],
  ['G', 2, 'Strofa 1'], ['D', 2, 'Strofa 1'], ['C', 4, 'Strofa 1'],
  ['G', 2, 'Refren'], ['D', 2, 'Refren'], ['C', 4, 'Refren'],
  ['G', 2, 'Refren'], ['D', 2, 'Refren'], ['C', 4, 'Refren'],
];
const kData = buildTimelineFromBars(kBars, 68, 0.4);

// 2. Stand By Me
const sBars: [string, number, string][] = [
  ['A', 4, 'Intro'], ['A', 4, 'Intro'], ['F#m', 4, 'Intro'], ['F#m', 4, 'Intro'],
  ['D', 4, 'Intro'], ['E', 4, 'Intro'], ['A', 4, 'Intro'], ['A', 4, 'Intro'],
  ['A', 4, 'Strofa 1'], ['A', 4, 'Strofa 1'], ['F#m', 4, 'Strofa 1'], ['F#m', 4, 'Strofa 1'],
  ['D', 4, 'Strofa 1'], ['E', 4, 'Strofa 1'], ['A', 4, 'Strofa 1'], ['A', 4, 'Strofa 1'],
  ['A', 4, 'Refren'], ['A', 4, 'Refren'], ['F#m', 4, 'Refren'], ['F#m', 4, 'Refren'],
  ['D', 4, 'Refren'], ['E', 4, 'Refren'], ['A', 4, 'Refren'], ['A', 4, 'Refren'],
];
const sData = buildTimelineFromBars(sBars, 118, 0.25);

// 3. House of the Rising Sun
const rBars: [string, number, string][] = [
  ['Am', 6, 'Intro'], ['C', 6, 'Intro'], ['D', 6, 'Intro'], ['F', 6, 'Intro'],
  ['Am', 6, 'Intro'], ['E7', 6, 'Intro'], ['Am', 6, 'Intro'], ['E7', 6, 'Intro'],
  ['Am', 6, 'Strofa 1'], ['C', 6, 'Strofa 1'], ['D', 6, 'Strofa 1'], ['F', 6, 'Strofa 1'],
  ['Am', 6, 'Strofa 1'], ['C', 6, 'Strofa 1'], ['E7', 6, 'Strofa 1'], ['E7', 6, 'Strofa 1'],
];
const rData = buildTimelineFromBars(rBars, 116, 0.3);

// 4. Riptide
const rpBars: [string, number, string][] = [
  ['Am', 2, 'Intro'], ['G', 2, 'Intro'], ['C', 4, 'Intro'],
  ['Am', 2, 'Intro'], ['G', 2, 'Intro'], ['C', 4, 'Intro'],
  ['Am', 2, 'Strofa 1'], ['G', 2, 'Strofa 1'], ['C', 4, 'Strofa 1'],
  ['Am', 2, 'Strofa 1'], ['G', 2, 'Strofa 1'], ['C', 4, 'Strofa 1'],
  ['Am', 2, 'Refren'], ['G', 2, 'Refren'], ['C', 4, 'Refren'],
  ['Am', 2, 'Refren'], ['G', 2, 'Refren'], ['C', 4, 'Refren'],
  ['Fmaj7', 4, 'Refren'], ['G', 4, 'Refren'], ['C', 4, 'Refren'], ['C', 4, 'Refren'],
];
const rpData = buildTimelineFromBars(rpBars, 102, 0.2);

export const PRESET_SONGS: SongProject[] = [
  {
    id: 'preset-knockin',
    title: "Knockin' on Heaven's Door",
    artist: 'Bob Dylan — Acoustic Lesson',
    youtubeId: 'rm9coqlk8fY',
    youtubeUrl: 'https://www.youtube.com/watch?v=rm9coqlk8fY',
    bpm: 68,
    beatOffset: 0.4,
    timeSignature: '4/4',
    key: 'G major',
    capo: 0,
    difficulty: 'Începător',
    duration: kData.duration,
    strummingPattern: ['D', '-', 'D', 'U', '-', 'U', 'D', 'U'],
    strummingHint: 'Jos · · Jos Sus · Sus Jos Sus — lasă ultimele două lovituri lejere pe tranziție.',
    uniqueChords: ['G', 'D', 'Am7', 'C'],
    chords: kData.chords,
    sections: kData.sections,
    chordPro: '[Intro]\n[G] [D] [Am7]\n[G] [D] [C]\n\n[Strofa 1]\n[G]Mama take this [D]badge off of [Am7]me\n[G]I can\'t [D]use it any[C]more',
    isPreset: true,
    sourceType: 'preset',
  },
  {
    id: 'preset-stand-by-me',
    title: 'Stand By Me',
    artist: 'Ben E. King — Guitar Rhythm',
    youtubeId: 'hwZNL7QVJjE',
    youtubeUrl: 'https://www.youtube.com/watch?v=hwZNL7QVJjE',
    bpm: 118,
    beatOffset: 0.25,
    timeSignature: '4/4',
    key: 'A major',
    capo: 2,
    difficulty: 'Începător',
    duration: sData.duration,
    strummingPattern: ['D', '-', 'D', 'U', 'x', 'U', 'D', 'U'],
    strummingHint: 'Capo 2 (cânți cu forme de G, Em, C, D) sau bareuri pe A, F#m, D, E. Accent pe timpul 2 și 4 (palm mute).',
    uniqueChords: ['A', 'F#m', 'D', 'E'],
    chords: sData.chords,
    sections: sData.sections,
    chordPro: '[Intro]\n[A] [F#m] [D] [E] [A]\n\n[Strofa 1]\nWhen the [A]night has come and the [F#m]land is dark\nAnd the [D]moon is the [E]only light we\'ll [A]see',
    isPreset: true,
    sourceType: 'preset',
  },
  {
    id: 'preset-rising-sun',
    title: 'House of the Rising Sun',
    artist: 'The Animals — 6/8 Arpeggio & Strum',
    youtubeId: '4-43lLKaqBQ',
    youtubeUrl: 'https://www.youtube.com/watch?v=4-43lLKaqBQ',
    bpm: 116,
    beatOffset: 0.3,
    timeSignature: '6/8',
    key: 'A minor',
    capo: 0,
    difficulty: 'Intermediar',
    duration: rData.duration,
    strummingPattern: ['D', 'D', 'D', 'U', 'D', 'U'],
    strummingHint: 'Măsură ternară 6/8: accentuează timpul 1 și timpul 4 (1-2-3, 4-5-6).',
    uniqueChords: ['Am', 'C', 'D', 'F', 'E7'],
    chords: rData.chords,
    sections: rData.sections,
    chordPro: '[Strofa 1]\nThere [Am]is a [C]house in [D]New Or[F]leans\nThey [Am]call the [C]Rising [E7]Sun',
    isPreset: true,
    sourceType: 'preset',
  },
  {
    id: 'preset-riptide',
    title: 'Riptide',
    artist: 'Vance Joy — Campfire Groove',
    youtubeId: 'uJ_1HMAGb4k',
    youtubeUrl: 'https://www.youtube.com/watch?v=uJ_1HMAGb4k',
    bpm: 102,
    beatOffset: 0.2,
    timeSignature: '4/4',
    key: 'C major',
    capo: 1,
    difficulty: 'Începător',
    duration: rpData.duration,
    strummingPattern: ['D', '-', 'D', '-', 'D', 'U', 'D', 'U'],
    strummingHint: 'Ritm rapid, constant: Jos - Jos - Jos Sus Jos Sus. Folosește Capo 1 pentru tonalitatea originală (Am7-G-C).',
    uniqueChords: ['Am', 'G', 'C', 'Fmaj7'],
    chords: rpData.chords,
    sections: rpData.sections,
    chordPro: '[Strofa 1]\n[Am]I was scared of [G]dentists and the [C]dark\n[Am]I was scared of [G]pretty girls and [C]starting conversations',
    isPreset: true,
    sourceType: 'preset',
  },
];
