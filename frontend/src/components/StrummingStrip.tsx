import React, { useRef } from 'react';
import { ArrowDown, ArrowUp, Hand, Minus, Volume2, Zap } from 'lucide-react';
import type { StrumSymbol } from '../types';
import { audioEngine } from '../music/audioEngine';

interface StrummingStripProps {
  pattern: StrumSymbol[];
  timeSignature: string;
  bpm: number;
  activeSlotIndex: number; // -1 if paused
  activeChord: string;
  hint?: string;
  metronomeEnabled: boolean;
  synthEnabled: boolean;
  onToggleMetronome: () => void;
  onToggleSynth: () => void;
  onChangePattern: (next: StrumSymbol[]) => void;
  onChangeBpm: (nextBpm: number) => void;
}

const GROOVE_PRESETS: { label: string; timeSig: string; pattern: StrumSymbol[] }[] = [
  { label: 'Campfire (4/4)', timeSig: '4/4', pattern: ['D', '-', 'D', 'U', '-', 'U', 'D', 'U'] },
  { label: 'Pop Pulse (4/4)', timeSig: '4/4', pattern: ['D', '-', 'D', 'U', 'x', 'U', 'D', 'U'] },
  { label: 'Baladă (4/4)', timeSig: '4/4', pattern: ['D', '-', 'D', '-', 'D', 'U', 'D', 'U'] },
  { label: 'Vals (3/4)', timeSig: '3/4', pattern: ['D', '-', 'D', 'U', 'D', 'U'] },
  { label: '6/8 Arpeggio', timeSig: '6/8', pattern: ['D', 'D', 'D', 'U', 'D', 'U'] },
];

const CYCLE_ORDER: StrumSymbol[] = ['D', 'U', 'x', '-'];

export const StrummingStrip: React.FC<StrummingStripProps> = ({
  pattern,
  timeSignature,
  bpm,
  activeSlotIndex,
  activeChord,
  hint,
  metronomeEnabled,
  synthEnabled,
  onToggleMetronome,
  onToggleSynth,
  onChangePattern,
  onChangeBpm,
}) => {
  const tapTimesRef = useRef<number[]>([]);

  const handleSlotClick = (idx: number) => {
    const cur = pattern[idx];
    const nextSym = CYCLE_ORDER[(CYCLE_ORDER.indexOf(cur) + 1) % CYCLE_ORDER.length];
    const updated = [...pattern];
    updated[idx] = nextSym;
    onChangePattern(updated);
    if (nextSym !== '-') {
      audioEngine.strumChord(activeChord, nextSym);
    }
  };

  const handleTapTempo = () => {
    const now = performance.now();
    const recent = tapTimesRef.current.filter((t) => now - t < 2500);
    recent.push(now);
    tapTimesRef.current = recent;
    if (recent.length >= 2) {
      const diffs = [];
      for (let i = 1; i < recent.length; i++) {
        diffs.push(recent[i] - recent[i - 1]);
      }
      const avgMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const estimated = Math.round(60000 / avgMs);
      onChangeBpm(Math.max(45, Math.min(200, estimated)));
    }
  };

  const getBeatLabel = (idx: number): string => {
    if (timeSignature === '6/8') {
      return String(idx + 1);
    }
    return idx % 2 === 0 ? String(Math.floor(idx / 2) + 1) : '&';
  };

  const renderSymbolIcon = (sym: StrumSymbol) => {
    if (sym === 'D') return <ArrowDown size={20} strokeWidth={2.6} />;
    if (sym === 'U') return <ArrowUp size={20} strokeWidth={2.6} />;
    if (sym === 'x') return <Hand size={17} strokeWidth={2.2} />;
    return <Minus size={16} strokeWidth={2} />;
  };

  const getSymbolLabel = (sym: StrumSymbol): string => {
    if (sym === 'D') return 'Jos';
    if (sym === 'U') return 'Sus';
    if (sym === 'x') return 'Mute';
    return 'Pauză';
  };

  return (
    <div className="strumming-panel">
      <div className="strumming-header">
        <div>
          <span className="section-eyebrow">Ritm, Măsură & Strumming Pattern</span>
          <div className="strumming-meta-row">
            <span className="tempo-badge">{bpm} BPM</span>
            <span className="meter-badge">{timeSignature}</span>
            <button type="button" className="tap-tempo-btn" onClick={handleTapTempo}>
              <Zap size={13} /> Tap Tempo
            </button>
          </div>
        </div>

        <div className="rhythm-toggles">
          <button
            type="button"
            className={`studio-toggle-btn ${metronomeEnabled ? 'is-on' : ''}`}
            onClick={onToggleMetronome}
          >
            <Volume2 size={14} /> Metronom {metronomeEnabled ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            className={`studio-toggle-btn ${synthEnabled ? 'is-on' : ''}`}
            onClick={onToggleSynth}
            title="Redă ritmul pe chitară sintetizată sincronizată cu pattern-ul"
          >
            Chitară Ghid {synthEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      <div className="strum-grid" style={{ gridTemplateColumns: `repeat(${pattern.length}, minmax(0, 1fr))` }}>
        {pattern.map((sym, idx) => {
          const isCurrent = activeSlotIndex === idx;
          const isDownbeat = timeSignature === '6/8' ? idx === 0 || idx === 3 : idx % 2 === 0;
          return (
            <button
              key={`slot-${idx}`}
              type="button"
              onClick={() => handleSlotClick(idx)}
              title="Click pentru a schimba lovitura (Jos → Sus → Mute → Pauză)"
              className={`strum-slot sym-${sym} ${isCurrent ? 'is-active-beat' : ''} ${
                isDownbeat ? 'is-downbeat' : 'is-upbeat'
              }`}
            >
              <span className="strum-beat-count">{getBeatLabel(idx)}</span>
              <span className="strum-arrow-box">{renderSymbolIcon(sym)}</span>
              <span className="strum-word">{getSymbolLabel(sym)}</span>
            </button>
          );
        })}
      </div>

      <div className="strumming-footer">
        <p className="strumming-hint">
          {hint || 'Click pe orice căsuță de mai sus pentru a edita direcția penei (Jos / Sus / Mute / Pauză).'}
        </p>
        <div className="groove-presets">
          {GROOVE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className="groove-chip"
              onClick={() => onChangePattern(preset.pattern)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
