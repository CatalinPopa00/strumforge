export type StrumSymbol = 'D' | 'U' | 'x' | '-';

export interface ChordEvent {
  time: number;
  duration: number;
  beatIndex: number;
  beats: number;
  chord: string;
  root: string;
  quality: string;
  confidence?: number;
  section?: string;
}

export interface SongSection {
  name: string;
  startTime: number;
  endTime: number;
}

export interface SongProject {
  id: string;
  title: string;
  artist: string;
  youtubeId: string;
  youtubeUrl: string;
  bpm: number;
  beatOffset: number;
  timeSignature: '4/4' | '3/4' | '6/8' | string;
  key: string;
  capo: number;
  difficulty: 'Începător' | 'Mediu' | 'Avansat' | string;
  category?: string;
  techniqueFocus?: string;
  duration: number;
  strummingPattern: StrumSymbol[];
  strummingHint?: string;
  uniqueChords: string[];
  chords: ChordEvent[];
  sections: SongSection[];
  chordPro?: string;
  waveform?: number[];
  isPreset?: boolean;
  sourceType?: string;
}

export type PlaybackMode = 'youtube' | 'local-audio' | 'synth';
