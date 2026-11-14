import type { ChordEvent, SongProject, SongSection, StrumSymbol } from '../types';
import { PRESET_SONGS } from './presetSongs';

const STORAGE_KEY = 'strumforge_saved_songs_v1';

export function extractYouTubeId(urlOrId: string): string | null {
  const raw = urlOrId.trim();
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) {
    return raw;
  }
  const patterns = [
    /(?:v=|\/v\/|\/embed\/|\/shorts\/|\/live\/|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const pat of patterns) {
    const m = pat.exec(raw);
    if (m && m[1]) return m[1];
  }
  return null;
}

export function parseChordProClient(
  text: string,
  bpm = 96,
  timeSignature = '4/4',
  title = 'Piesă personalizată',
  youtubeUrl = ''
): SongProject {
  const beatsPerBar = timeSignature === '6/8' ? 6 : timeSignature === '3/4' ? 3 : 4;
  const beatSec = 60.0 / Math.max(40, Math.min(220, bpm));

  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  let currentSection = 'Strofa 1';
  const parsedItems: [string, number, string][] = [];

  const chordRegex = /\[([A-G][#b]?(?:maj7|m7|m|7|sus4|sus2|add9|dim|aug)?(?:\/[A-G][#b]?)?)\]/g;
  const plainChordRegex = /^[A-G][#b]?(?:maj7|m7|m|7|sus4|sus2|add9|dim|aug)?$/;

  for (const line of lines) {
    const secMatch = /^\[([A-Za-z0-9ăîâșțĂÎÂȘȚ -]+)\]$/.exec(line);
    if (secMatch && !plainChordRegex.test(secMatch[1])) {
      currentSection = secMatch[1].trim();
      continue;
    }

    const bracketMatches: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = chordRegex.exec(line)) !== null) {
      bracketMatches.push(match[1]);
    }

    if (bracketMatches.length > 0) {
      let beatsEach = Math.max(1, Math.floor(beatsPerBar / Math.min(bracketMatches.length, beatsPerBar)));
      if (bracketMatches.length === 1) {
        beatsEach = beatsPerBar;
      } else if (bracketMatches.length === 2) {
        beatsEach = beatsPerBar >= 4 ? Math.floor(beatsPerBar / 2) : 2;
      }
      for (const ch of bracketMatches) {
        parsedItems.push([ch, beatsEach, currentSection]);
      }
    } else {
      const tokens = line.split(/[\s|]+/).map((t) => t.trim()).filter(Boolean);
      const plainChords = tokens.filter((t) => plainChordRegex.test(t));
      if (plainChords.length > 0) {
        for (const ch of plainChords) {
          parsedItems.push([ch, beatsPerBar, currentSection]);
        }
      }
    }
  }

  const itemsToUse: [string, number, string][] =
    parsedItems.length > 0
      ? parsedItems
      : [
          ['G', beatsPerBar, 'Strofa 1'],
          ['D', beatsPerBar, 'Strofa 1'],
          ['Em', beatsPerBar, 'Strofa 1'],
          ['C', beatsPerBar, 'Strofa 1'],
        ];

  const chords: ChordEvent[] = [];
  const sections: SongSection[] = [];
  let t = 0.0;
  let beatIdx = 0;

  for (const [chordName, nBeats, sectionName] of itemsToUse) {
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

  const uniqueChords = Array.from(new Set(chords.map((c) => c.chord)));
  const defaultStrum: StrumSymbol[] =
    timeSignature === '6/8'
      ? ['D', 'D', 'D', 'U', 'D', 'U']
      : timeSignature === '3/4'
      ? ['D', '-', 'D', 'U', 'D', 'U']
      : ['D', '-', 'D', 'U', '-', 'U', 'D', 'U'];

  const ytId = extractYouTubeId(youtubeUrl);

  return {
    id: `song-${Math.random().toString(36).slice(2, 10)}`,
    title,
    artist: 'Creat în studio',
    youtubeId: ytId || '',
    youtubeUrl: ytId ? `https://www.youtube.com/watch?v=${ytId}` : '',
    bpm,
    beatOffset: 0.0,
    timeSignature,
    key: uniqueChords[0] || 'G',
    capo: 0,
    difficulty: 'Personalizat',
    duration: Number(t.toFixed(2)),
    strummingPattern: defaultStrum,
    strummingHint: 'Click pe orice acord din timeline pentru a-l edita sau adăuga secțiuni.',
    uniqueChords,
    chords,
    sections,
    chordPro: text,
    isPreset: false,
    sourceType: 'chordpro',
  };
}

export function loadLocalCustomSongs(): SongProject[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function saveLocalCustomSong(song: SongProject): SongProject {
  const updatedSong = { ...song, isPreset: false };
  if (!updatedSong.id || updatedSong.id.startsWith('preset-')) {
    updatedSong.id = `song-${Math.random().toString(36).slice(2, 10)}`;
  }
  const list = loadLocalCustomSongs();
  const idx = list.findIndex((s) => s.id === updatedSong.id);
  if (idx >= 0) {
    list[idx] = updatedSong;
  } else {
    list.unshift(updatedSong);
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('LocalStorage save error:', err);
  }
  return updatedSong;
}

export function deleteLocalCustomSong(songId: string): boolean {
  const list = loadLocalCustomSongs();
  const filtered = list.filter((s) => s.id !== songId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

export function getClientAllSongs(): SongProject[] {
  const custom = loadLocalCustomSongs();
  return [...custom, ...PRESET_SONGS];
}
