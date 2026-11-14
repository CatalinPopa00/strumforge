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
const kData = buildTimelineFromBars(
  [
    ['G', 2, 'Intro'], ['D', 2, 'Intro'], ['Am7', 4, 'Intro'],
    ['G', 2, 'Intro'], ['D', 2, 'Intro'], ['C', 4, 'Intro'],
    ['G', 2, 'Strofa 1'], ['D', 2, 'Strofa 1'], ['Am7', 4, 'Strofa 1'],
    ['G', 2, 'Strofa 1'], ['D', 2, 'Strofa 1'], ['C', 4, 'Strofa 1'],
    ['G', 2, 'Refren'], ['D', 2, 'Refren'], ['C', 4, 'Refren'],
    ['G', 2, 'Refren'], ['D', 2, 'Refren'], ['C', 4, 'Refren'],
  ],
  68,
  0.4
);

// 2. Stand By Me
const sData = buildTimelineFromBars(
  [
    ['A', 4, 'Intro'], ['A', 4, 'Intro'], ['F#m', 4, 'Intro'], ['F#m', 4, 'Intro'],
    ['D', 4, 'Intro'], ['E', 4, 'Intro'], ['A', 4, 'Intro'], ['A', 4, 'Intro'],
    ['A', 4, 'Strofa 1'], ['A', 4, 'Strofa 1'], ['F#m', 4, 'Strofa 1'], ['F#m', 4, 'Strofa 1'],
    ['D', 4, 'Strofa 1'], ['E', 4, 'Strofa 1'], ['A', 4, 'Strofa 1'], ['A', 4, 'Strofa 1'],
    ['A', 4, 'Refren'], ['A', 4, 'Refren'], ['F#m', 4, 'Refren'], ['F#m', 4, 'Refren'],
    ['D', 4, 'Refren'], ['E', 4, 'Refren'], ['A', 4, 'Refren'], ['A', 4, 'Refren'],
  ],
  118,
  0.25
);

// 3. House of the Rising Sun
const rData = buildTimelineFromBars(
  [
    ['Am', 6, 'Intro'], ['C', 6, 'Intro'], ['D', 6, 'Intro'], ['F', 6, 'Intro'],
    ['Am', 6, 'Intro'], ['E7', 6, 'Intro'], ['Am', 6, 'Intro'], ['E7', 6, 'Intro'],
    ['Am', 6, 'Strofa 1'], ['C', 6, 'Strofa 1'], ['D', 6, 'Strofa 1'], ['F', 6, 'Strofa 1'],
    ['Am', 6, 'Strofa 1'], ['C', 6, 'Strofa 1'], ['E7', 6, 'Strofa 1'], ['E7', 6, 'Strofa 1'],
  ],
  116,
  0.3
);

// 4. Riptide
const rpData = buildTimelineFromBars(
  [
    ['Am', 2, 'Intro'], ['G', 2, 'Intro'], ['C', 4, 'Intro'],
    ['Am', 2, 'Intro'], ['G', 2, 'Intro'], ['C', 4, 'Intro'],
    ['Am', 2, 'Strofa 1'], ['G', 2, 'Strofa 1'], ['C', 4, 'Strofa 1'],
    ['Am', 2, 'Strofa 1'], ['G', 2, 'Strofa 1'], ['C', 4, 'Strofa 1'],
    ['Am', 2, 'Refren'], ['G', 2, 'Refren'], ['C', 4, 'Refren'],
    ['Am', 2, 'Refren'], ['G', 2, 'Refren'], ['C', 4, 'Refren'],
    ['Fmaj7', 4, 'Refren'], ['G', 4, 'Refren'], ['C', 4, 'Refren'], ['C', 4, 'Refren'],
  ],
  102,
  0.2
);

// 5. Wonderwall (Oasis - Capo 2, Em7 G Dsus4 A7sus4 / Cadd9)
const wData = buildTimelineFromBars(
  [
    ['F#m7', 2, 'Intro'], ['A', 2, 'Intro'], ['E', 2, 'Intro'], ['B', 2, 'Intro'],
    ['F#m7', 2, 'Intro'], ['A', 2, 'Intro'], ['E', 2, 'Intro'], ['B', 2, 'Intro'],
    ['F#m7', 2, 'Strofa 1'], ['A', 2, 'Strofa 1'], ['E', 2, 'Strofa 1'], ['B', 2, 'Strofa 1'],
    ['F#m7', 2, 'Strofa 1'], ['A', 2, 'Strofa 1'], ['E', 2, 'Strofa 1'], ['B', 2, 'Strofa 1'],
    ['D', 2, 'Pre-Refren'], ['E', 2, 'Pre-Refren'], ['F#m7', 4, 'Pre-Refren'],
    ['D', 4, 'Refren'], ['F#m7', 4, 'Refren'], ['A', 4, 'Refren'], ['F#m7', 4, 'Refren'],
  ],
  87,
  0.2
);

// 6. Zombie (The Cranberries - Em C G D/F#)
const zData = buildTimelineFromBars(
  [
    ['Em', 4, 'Intro'], ['C', 4, 'Intro'], ['G', 4, 'Intro'], ['D/F#', 4, 'Intro'],
    ['Em', 4, 'Strofa 1'], ['C', 4, 'Strofa 1'], ['G', 4, 'Strofa 1'], ['D/F#', 4, 'Strofa 1'],
    ['Em', 4, 'Refren'], ['C', 4, 'Refren'], ['G', 4, 'Refren'], ['D/F#', 4, 'Refren'],
    ['Em', 4, 'Refren'], ['C', 4, 'Refren'], ['G', 4, 'Refren'], ['D/F#', 4, 'Refren'],
  ],
  84,
  0.2
);

// 7. Wish You Were Here (Pink Floyd - Em7 G Em7 G Em7 A7sus4 G)
const wywhData = buildTimelineFromBars(
  [
    ['Em7', 4, 'Intro'], ['G', 4, 'Intro'], ['Em7', 4, 'Intro'], ['G', 4, 'Intro'],
    ['Em7', 4, 'Intro'], ['A', 4, 'Intro'], ['Em7', 4, 'Intro'], ['A', 4, 'Intro'], ['G', 4, 'Intro'],
    ['C', 4, 'Strofa 1'], ['D', 4, 'Strofa 1'], ['Am', 4, 'Strofa 1'], ['G', 4, 'Strofa 1'],
    ['D', 4, 'Strofa 1'], ['C', 4, 'Strofa 1'], ['Am', 4, 'Strofa 1'], ['G', 4, 'Strofa 1'],
  ],
  62,
  0.3
);

// 8. Hallelujah (Leonard Cohen - 6/8, C Am C Am F G C G)
const hData = buildTimelineFromBars(
  [
    ['C', 6, 'Intro'], ['Am', 6, 'Intro'], ['C', 6, 'Intro'], ['Am', 6, 'Intro'],
    ['C', 3, 'Strofa 1'], ['Am', 3, 'Strofa 1'], ['C', 3, 'Strofa 1'], ['Am', 3, 'Strofa 1'],
    ['F', 3, 'Strofa 1'], ['G', 3, 'Strofa 1'], ['C', 3, 'Strofa 1'], ['G', 3, 'Strofa 1'],
    ['F', 6, 'Refren'], ['Am', 6, 'Refren'], ['F', 6, 'Refren'], ['C', 3, 'Refren'], ['G', 3, 'Refren'],
  ],
  96,
  0.25
);

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
  {
    id: 'preset-wonderwall',
    title: 'Wonderwall',
    artist: 'Oasis — Capo 2 Acoustic',
    youtubeId: 'bx1Bh8ZvH84',
    youtubeUrl: 'https://www.youtube.com/watch?v=bx1Bh8ZvH84',
    bpm: 87,
    beatOffset: 0.2,
    timeSignature: '4/4',
    key: 'F# minor',
    capo: 2,
    difficulty: 'Începător',
    duration: wData.duration,
    strummingPattern: ['D', '-', 'D', 'U', 'D', 'U', 'D', 'U'],
    strummingHint: 'Capo 2: cânți forme de Em7, G, Dsus4, A7sus4 păstrând degetele 3 și 4 ancorate pe tastele 3 ale corzilor B și e.',
    uniqueChords: ['F#m7', 'A', 'E', 'B', 'D'],
    chords: wData.chords,
    sections: wData.sections,
    chordPro: '[Intro]\n[F#m7] [A] [E] [B]\n[Strofa 1]\n[F#m7]Today is [A]gonna be the day that they\'re [E]gonna throw it back to [B]you',
    isPreset: true,
    sourceType: 'preset',
  },
  {
    id: 'preset-zombie',
    title: 'Zombie',
    artist: 'The Cranberries — Power & Acoustic',
    youtubeId: '6Ejga4kJUts',
    youtubeUrl: 'https://www.youtube.com/watch?v=6Ejga4kJUts',
    bpm: 84,
    beatOffset: 0.2,
    timeSignature: '4/4',
    key: 'E minor',
    capo: 0,
    difficulty: 'Începător',
    duration: zData.duration,
    strummingPattern: ['D', 'D', 'D', 'U', 'D', 'U', 'D', 'U'],
    strummingHint: '4 acorduri ciclice pe toată piesa (Em - C - G - D/F#). Excelentă pentru exersarea acordului D/F# cu degetul mare sau arătătorul.',
    uniqueChords: ['Em', 'C', 'G', 'D/F#'],
    chords: zData.chords,
    sections: zData.sections,
    chordPro: '[Intro]\n[Em] [C] [G] [D/F#]\n[Refren]\nIn your [Em]head, in your [C]head, [G]Zombie, [D/F#]zombie',
    isPreset: true,
    sourceType: 'preset',
  },
  {
    id: 'preset-wish-you-were-here',
    title: 'Wish You Were Here',
    artist: 'Pink Floyd — Acoustic Riff & Chords',
    youtubeId: 'IXdNnw41-fU',
    youtubeUrl: 'https://www.youtube.com/watch?v=IXdNnw41-fU',
    bpm: 62,
    beatOffset: 0.3,
    timeSignature: '4/4',
    key: 'G major',
    capo: 0,
    difficulty: 'Intermediar',
    duration: wywhData.duration,
    strummingPattern: ['D', '-', 'D', 'U', '-', 'U', 'D', 'U'],
    strummingHint: 'Tempo lent (62 BPM). Intro pe Em7–G–A cu note de trecere pe corzile A și D.',
    uniqueChords: ['Em7', 'G', 'A', 'C', 'D', 'Am'],
    chords: wywhData.chords,
    sections: wywhData.sections,
    chordPro: '[Intro]\n[Em7] [G] [Em7] [G] [Em7] [A] [G]\n[Strofa 1]\n[C]So, so you think you can [D]tell Heaven from [Am]Hell',
    isPreset: true,
    sourceType: 'preset',
  },
  {
    id: 'preset-hallelujah',
    title: 'Hallelujah',
    artist: 'Leonard Cohen / Jeff Buckley — 6/8',
    youtubeId: 'YrLk4vdY28Q',
    youtubeUrl: 'https://www.youtube.com/watch?v=YrLk4vdY28Q',
    bpm: 96,
    beatOffset: 0.25,
    timeSignature: '6/8',
    key: 'C major',
    capo: 0,
    difficulty: 'Începător',
    duration: hData.duration,
    strummingPattern: ['D', 'D', 'D', 'U', 'D', 'U'],
    strummingHint: 'Măsură 6/8 clasică: alternează basul acordului pe timpul 1 și ciupește corzile înalte pe 2-3, 4-5-6.',
    uniqueChords: ['C', 'Am', 'F', 'G'],
    chords: hData.chords,
    sections: hData.sections,
    chordPro: '[Intro]\n[C] [Am] [C] [Am]\n[Strofa 1]\nI\'ve [C]heard there was a [Am]secret chord\n[Refren]\nHalle[F]lujah, Halle[Am]lujah',
    isPreset: true,
    sourceType: 'preset',
  },
];

const TITLE_KEYWORDS: { keywords: string[]; presetId: string }[] = [
  { keywords: ['knockin', 'heavens door', "heaven's door"], presetId: 'preset-knockin' },
  { keywords: ['stand by me'], presetId: 'preset-stand-by-me' },
  { keywords: ['rising sun'], presetId: 'preset-rising-sun' },
  { keywords: ['riptide'], presetId: 'preset-riptide' },
  { keywords: ['wonderwall'], presetId: 'preset-wonderwall' },
  { keywords: ['zombie', 'cranberries'], presetId: 'preset-zombie' },
  { keywords: ['wish you were here'], presetId: 'preset-wish-you-were-here' },
  { keywords: ['hallelujah'], presetId: 'preset-hallelujah' },
];

export function matchPresetByTitle(title: string): SongProject | undefined {
  const lower = title.toLowerCase();
  for (const entry of TITLE_KEYWORDS) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return PRESET_SONGS.find((s) => s.id === entry.presetId);
    }
  }
  return undefined;
}
