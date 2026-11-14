import type { ChordEvent, SongProject, SongSection } from '../types';

export const SONG_CATEGORIES = [
  'Acoustic & Folk',
  'Pop & Campfire',
  'Rock & Classic',
  'Blues & Soul',
  'Fingerstyle & Arpegii',
  'Jazz & Bossa',
] as const;

export const DIFFICULTY_LEVELS = ['Începător', 'Mediu', 'Avansat'] as const;

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

// === ÎNCEPĂTOR ===
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

// === MEDIU ===
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

// === AVANSAT ===
const hcData = buildTimelineFromBars(
  [
    ['Bm', 4, 'Intro'], ['F#', 4, 'Intro'], ['A', 4, 'Intro'], ['E', 4, 'Intro'],
    ['G', 4, 'Intro'], ['D', 4, 'Intro'], ['Em', 4, 'Intro'], ['F#7', 4, 'Intro'],
    ['Bm', 4, 'Strofa 1'], ['F#', 4, 'Strofa 1'], ['A', 4, 'Strofa 1'], ['E', 4, 'Strofa 1'],
    ['G', 4, 'Strofa 1'], ['D', 4, 'Strofa 1'], ['Em', 4, 'Strofa 1'], ['F#7', 4, 'Strofa 1'],
    ['G', 4, 'Refren'], ['D', 4, 'Refren'], ['F#7', 4, 'Refren'], ['Bm', 4, 'Refren'],
    ['G', 4, 'Refren'], ['D', 4, 'Refren'], ['Em', 4, 'Refren'], ['F#7', 4, 'Refren'],
  ],
  74,
  0.3
);

const bbData = buildTimelineFromBars(
  [
    ['G', 2, 'Intro'], ['Am7', 1, 'Intro'], ['G/B', 1, 'Intro'], ['G', 4, 'Intro'],
    ['G', 1, 'Strofa 1'], ['Am7', 1, 'Strofa 1'], ['G/B', 2, 'Strofa 1'],
    ['C', 2, 'Strofa 1'], ['A7', 2, 'Strofa 1'], ['D7', 2, 'Strofa 1'], ['G', 2, 'Strofa 1'],
    ['C', 2, 'Strofa 1'], ['Cm', 2, 'Strofa 1'], ['G/B', 2, 'Strofa 1'], ['A7', 2, 'Strofa 1'],
    ['D7', 4, 'Strofa 1'], ['G', 4, 'Strofa 1'],
    ['F', 2, 'Bridge'], ['Em', 2, 'Bridge'], ['Dm', 2, 'Bridge'], ['C', 2, 'Bridge'],
    ['Bb', 2, 'Bridge'], ['A7', 2, 'Bridge'], ['D7', 4, 'Bridge'],
  ],
  94,
  0.2
);

const alData = buildTimelineFromBars(
  [
    ['Am7', 4, 'Partea A'], ['D7', 4, 'Partea A'], ['Gmaj7', 4, 'Partea A'], ['Cmaj7', 4, 'Partea A'],
    ['F#m7', 4, 'Partea A'], ['B7', 4, 'Partea A'], ['Em', 4, 'Partea A'], ['Em', 4, 'Partea A'],
    ['Am7', 4, 'Partea A2'], ['D7', 4, 'Partea A2'], ['Gmaj7', 4, 'Partea A2'], ['Cmaj7', 4, 'Partea A2'],
    ['F#m7', 4, 'Partea A2'], ['B7', 4, 'Partea A2'], ['Em', 4, 'Partea A2'], ['Em', 4, 'Partea A2'],
    ['F#m7', 4, 'Partea B'], ['B7', 4, 'Partea B'], ['Em', 4, 'Partea B'], ['Em', 4, 'Partea B'],
    ['Am7', 4, 'Partea B'], ['D7', 4, 'Partea B'], ['Gmaj7', 4, 'Partea B'], ['Gmaj7', 4, 'Partea B'],
  ],
  120,
  0.25
);

const ipanemaData = buildTimelineFromBars(
  [
    ['Fmaj7', 4, 'Tema A'], ['Fmaj7', 4, 'Tema A'], ['G7', 4, 'Tema A'], ['G7', 4, 'Tema A'],
    ['Gm7', 4, 'Tema A'], ['Gb7', 4, 'Tema A'], ['Fmaj7', 4, 'Tema A'], ['Gb7', 4, 'Tema A'],
    ['F#maj7', 4, 'Bridge'], ['F#maj7', 4, 'Bridge'], ['B7', 4, 'Bridge'], ['B7', 4, 'Bridge'],
    ['F#m7', 4, 'Bridge'], ['F#m7', 4, 'Bridge'], ['D7', 4, 'Bridge'], ['D7', 4, 'Bridge'],
    ['Gm7', 4, 'Bridge'], ['Gm7', 4, 'Bridge'], ['Eb7', 4, 'Bridge'], ['Am7', 4, 'Bridge'], ['D7', 4, 'Bridge'],
  ],
  130,
  0.2
);

export const PRESET_SONGS: SongProject[] = [
  // === ÎNCEPĂTOR ===
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
    category: 'Acoustic & Folk',
    techniqueFocus: 'Acorduri deschise lente (G, D, Am7, C) + ritm lejer de campfire',
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
    category: 'Pop & Campfire',
    techniqueFocus: '3 acorduri de bază (Am, G, C) + constanță pe mâna dreaptă',
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
    category: 'Blues & Soul',
    techniqueFocus: 'Capo 2 cu forme de G-Em-C-D + palm mute pe timpii 2 și 4',
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
    category: 'Rock & Classic',
    techniqueFocus: '4 acorduri repetitive + introducere în acordul D/F#',
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

  // === MEDIU ===
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
    difficulty: 'Mediu',
    category: 'Fingerstyle & Arpegii',
    techniqueFocus: 'Măsură ternară 6/8 + trecere fluentă prin bareul F',
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
    difficulty: 'Mediu',
    category: 'Pop & Campfire',
    techniqueFocus: 'Sincope pe mâna dreaptă + degete pivot ancorate (Capo 2)',
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
    difficulty: 'Mediu',
    category: 'Acoustic & Folk',
    techniqueFocus: 'Alternare riff pe corzile grave cu acorduri Em7–G–A–C–D',
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
    difficulty: 'Mediu',
    category: 'Fingerstyle & Arpegii',
    techniqueFocus: 'Schimbări rapide la jumătate de măsură în 6/8 (3 timpi/acord)',
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

  // === AVANSAT ===
  {
    id: 'preset-hotel-california',
    title: 'Hotel California',
    artist: 'Eagles — Acoustic 12-String Arpeggio',
    youtubeId: '09839DpTctU',
    youtubeUrl: 'https://www.youtube.com/watch?v=09839DpTctU',
    bpm: 74,
    beatOffset: 0.3,
    timeSignature: '4/4',
    key: 'B minor',
    capo: 0,
    difficulty: 'Avansat',
    category: 'Rock & Classic',
    techniqueFocus: 'Lanț lung de bareuri (Bm–F#–A–E–G–D–Em–F#7) + linie cromatică descendentă',
    duration: hcData.duration,
    strummingPattern: ['D', '-', 'D', 'U', 'x', 'U', 'D', 'U'],
    strummingHint: 'Progresie emblematică de 8 măsuri cu bareuri consecutive. Poți pune Capo 7 (forme de Em-B7-D-A-C-G-Am-B7) sau exersa bareurile integrale.',
    uniqueChords: ['Bm', 'F#', 'A', 'E', 'G', 'D', 'Em', 'F#7'],
    chords: hcData.chords,
    sections: hcData.sections,
    chordPro: '[Intro]\n[Bm] [F#] [A] [E]\n[G] [D] [Em] [F#7]\n[Strofa 1]\nOn a [Bm]dark desert highway, [F#]cool wind in my hair',
    isPreset: true,
    sourceType: 'preset',
  },
  {
    id: 'preset-blackbird',
    title: 'Blackbird',
    artist: 'The Beatles — Fingerstyle & Voice Leading',
    youtubeId: 'Man4Xw8Xypo',
    youtubeUrl: 'https://www.youtube.com/watch?v=Man4Xw8Xypo',
    bpm: 94,
    beatOffset: 0.2,
    timeSignature: '4/4',
    key: 'G major',
    capo: 0,
    difficulty: 'Avansat',
    category: 'Fingerstyle & Arpegii',
    techniqueFocus: 'Mișcare de bas + melodie simultană (G/B, Cm, A7, Bb) în stil McCartney',
    duration: bbData.duration,
    strummingPattern: ['D', 'U', 'D', 'U', 'D', 'U', 'D', 'U'],
    strummingHint: 'Degetul mare ciupește basul alternativ pe corzile E/A/D, iar arătătorul ciupește coarda B/G sincronizat.',
    uniqueChords: ['G', 'Am7', 'G/B', 'C', 'A7', 'D7', 'Cm', 'F', 'Em', 'Dm', 'Bb'],
    chords: bbData.chords,
    sections: bbData.sections,
    chordPro: '[Intro]\n[G] [Am7] [G/B] [G]\n[Strofa 1]\n[G]Blackbird [Am7]singing in the [G/B]dead of [G]night\n[C]Take these [A7]broken [D7]wings and learn to [G]fly',
    isPreset: true,
    sourceType: 'preset',
  },
  {
    id: 'preset-autumn-leaves',
    title: 'Autumn Leaves',
    artist: 'Jazz Standard — II-V-I Progression',
    youtubeId: 'Gsz3mrnIRdU',
    youtubeUrl: 'https://www.youtube.com/watch?v=Gsz3mrnIRdU',
    bpm: 120,
    beatOffset: 0.25,
    timeSignature: '4/4',
    key: 'E minor',
    capo: 0,
    difficulty: 'Avansat',
    category: 'Jazz & Bossa',
    techniqueFocus: 'Cadențe II–V–I majore și minore cu septime (Am7–D7–Gmaj7–Cmaj7–F#m7–B7)',
    duration: alData.duration,
    strummingPattern: ['D', '-', 'x', 'U', '-', 'U', 'x', '-'],
    strummingHint: 'Comping swing „four-to-the-bar” sau ritm sincer de bossa: accent pe timpii slabi (&) și muting scurt pe 2 și 4.',
    uniqueChords: ['Am7', 'D7', 'Gmaj7', 'Cmaj7', 'F#m7', 'B7', 'Em'],
    chords: alData.chords,
    sections: alData.sections,
    chordPro: '[Partea A]\n[Am7]The falling [D7]leaves drift by my [Gmaj7]window [Cmaj7]\nThe autumn [F#m7]leaves of [B7]red and [Em]gold',
    isPreset: true,
    sourceType: 'preset',
  },
  {
    id: 'preset-girl-from-ipanema',
    title: 'The Girl from Ipanema',
    artist: 'Tom Jobim — Bossa Nova Groove',
    youtubeId: 'c5QfXjsoNe4',
    youtubeUrl: 'https://www.youtube.com/watch?v=c5QfXjsoNe4',
    bpm: 130,
    beatOffset: 0.2,
    timeSignature: '4/4',
    key: 'F major',
    capo: 0,
    difficulty: 'Avansat',
    category: 'Jazz & Bossa',
    techniqueFocus: 'Ritm Bossa Nova sincopat + modulație la jumătate de ton (Gb7 → Fmaj7)',
    duration: ipanemaData.duration,
    strummingPattern: ['D', '-', 'x', 'U', '-', 'U', 'D', 'x'],
    strummingHint: 'Groove Bossa Nova: degetul mare menține pulsația pe timpii 1 și 3, iar degetele trag acordul cu sincope.',
    uniqueChords: ['Fmaj7', 'G7', 'Gm7', 'Gb7', 'F#maj7', 'B7', 'F#m7', 'D7', 'Eb7', 'Am7'],
    chords: ipanemaData.chords,
    sections: ipanemaData.sections,
    chordPro: '[Tema A]\n[Fmaj7]Tall and tan and young and lovely\nThe [G7]girl from Ipanema goes walking\n[Gm7]And when she [Gb7]passes each one she [Fmaj7]passes goes ah [Gb7]',
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
  { keywords: ['hotel california'], presetId: 'preset-hotel-california' },
  { keywords: ['blackbird'], presetId: 'preset-blackbird' },
  { keywords: ['autumn leaves'], presetId: 'preset-autumn-leaves' },
  { keywords: ['ipanema'], presetId: 'preset-girl-from-ipanema' },
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
