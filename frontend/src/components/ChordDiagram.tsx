import React from 'react';
import { ArrowDown, ArrowUp, Music, Play, Volume2 } from 'lucide-react';
import { STANDARD_TUNING_MIDI, getChordVoicing } from '../music/chords';
import { audioEngine, type AuditionStyle } from '../music/audioEngine';
import type { StrumSymbol } from '../types';

interface ChordDiagramProps {
  chordName: string;
  size?: 'sm' | 'lg';
  highlight?: boolean;
  subtitle?: string;
  capo?: number;
  auditionStyle?: AuditionStyle;
  strummingPattern?: StrumSymbol[];
  bpm?: number;
  timeSignature?: string;
}

export const ChordDiagram: React.FC<ChordDiagramProps> = ({
  chordName,
  size = 'lg',
  highlight = false,
  subtitle,
  capo = 0,
  auditionStyle = 'D',
  strummingPattern,
  bpm,
  timeSignature,
}) => {
  const voicing = getChordVoicing(chordName);
  const fretCount = 4;
  const width = size === 'lg' ? 176 : 116;
  const height = size === 'lg' ? 198 : 134;
  const padX = size === 'lg' ? 30 : 20;
  const padTop = size === 'lg' ? 32 : 24;
  const padBottom = size === 'lg' ? 20 : 14;

  const gridW = width - padX * 2;
  const gridH = height - padTop - padBottom;
  const stringSpacing = gridW / 5;
  const fretSpacing = gridH / fretCount;

  const showNut = voicing.baseFret <= 1;
  const startFret = showNut ? 1 : voicing.baseFret;

  const playWithStyle = (style: AuditionStyle) => {
    audioEngine.auditionChord(chordName, style, {
      pattern: strummingPattern,
      bpm,
      timeSignature,
      semitoneShift: capo,
    });
  };

  return (
    <div
      className={`chord-diagram-card ${size === 'sm' ? 'chord-diagram-sm' : 'chord-diagram-lg'} ${
        highlight ? 'is-highlighted' : ''
      }`}
    >
      <div className="chord-diagram-header">
        <div>
          <span className="chord-diagram-name">{chordName}</span>
          {subtitle && <span className="chord-diagram-subtitle">{subtitle}</span>}
        </div>
        <button
          type="button"
          className="chord-quick-listen-btn"
          title={`Ascultă acordul ${chordName}`}
          onClick={() => playWithStyle(auditionStyle)}
        >
          <Volume2 size={size === 'lg' ? 15 : 13} />
        </button>
      </div>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="chord-svg"
        aria-label={`Diagramă acord ${chordName}`}
      >
        {/* Fret number label for barre/higher positions */}
        {!showNut && (
          <text
            x={padX - 10}
            y={padTop + fretSpacing * 0.65}
            textAnchor="end"
            className="chord-fret-label"
          >
            {startFret}fr
          </text>
        )}

        {/* Nut or top fret line */}
        <line
          x1={padX}
          y1={padTop}
          x2={padX + gridW}
          y2={padTop}
          stroke={showNut ? '#f3ede2' : 'rgba(243, 237, 226, 0.35)'}
          strokeWidth={showNut ? 4.5 : 1.5}
          strokeLinecap="round"
        />

        {/* Horizontal frets */}
        {Array.from({ length: fretCount }).map((_, idx) => {
          const y = padTop + (idx + 1) * fretSpacing;
          return (
            <line
              key={`f-${idx}`}
              x1={padX}
              y1={y}
              x2={padX + gridW}
              y2={y}
              stroke="rgba(243, 237, 226, 0.22)"
              strokeWidth={1.2}
            />
          );
        })}

        {/* Vertical strings (clickable individually!) */}
        {Array.from({ length: 6 }).map((_, sIdx) => {
          const x = padX + sIdx * stringSpacing;
          const thickness = 2.0 - sIdx * 0.22;
          const fret = voicing.frets[sIdx];
          const isPlayable = fret >= 0;
          return (
            <g
              key={`s-${sIdx}`}
              className={isPlayable ? 'chord-string-clickable' : undefined}
              onClick={() => {
                if (isPlayable) {
                  audioEngine.pluckMidi(STANDARD_TUNING_MIDI[sIdx] + fret + capo);
                }
              }}
            >
              <line
                x1={x}
                y1={padTop}
                x2={x}
                y2={padTop + gridH}
                stroke="rgba(243, 237, 226, 0.45)"
                strokeWidth={thickness}
              />
              {/* Invisible wider hit target for individual string audition */}
              <rect
                x={x - stringSpacing * 0.42}
                y={padTop - 8}
                width={stringSpacing * 0.84}
                height={gridH + 16}
                fill="transparent"
              >
                <title>
                  {isPlayable
                    ? `Click pentru a ciupi coarda ${sIdx + 1} (tasta ${fret})`
                    : `Coarda ${sIdx + 1} este mutată (×)`}
                </title>
              </rect>
            </g>
          );
        })}

        {/* Barre indicator */}
        {voicing.barre && (
          <rect
            x={padX + voicing.barre.fromString * stringSpacing - (size === 'lg' ? 8 : 5.5)}
            y={
              padTop +
              (voicing.barre.fret - startFret + 0.5) * fretSpacing -
              (size === 'lg' ? 8 : 5.5)
            }
            width={
              (voicing.barre.toString - voicing.barre.fromString) * stringSpacing +
              (size === 'lg' ? 16 : 11)
            }
            height={size === 'lg' ? 16 : 11}
            rx={size === 'lg' ? 8 : 5.5}
            fill="rgba(224, 142, 69, 0.88)"
            pointerEvents="none"
          />
        )}

        {/* Open / Muted / Finger dots */}
        {voicing.frets.map((fret, sIdx) => {
          const x = padX + sIdx * stringSpacing;
          if (fret < 0) {
            return (
              <text
                key={`m-${sIdx}`}
                x={x}
                y={padTop - 10}
                textAnchor="middle"
                className="chord-muted-mark"
                pointerEvents="none"
              >
                ×
              </text>
            );
          }
          if (fret === 0) {
            return (
              <circle
                key={`o-${sIdx}`}
                cx={x}
                cy={padTop - 13}
                r={size === 'lg' ? 4.5 : 3.4}
                fill="none"
                stroke="#d9c6a5"
                strokeWidth={1.6}
                pointerEvents="none"
              />
            );
          }

          const relFret = fret - startFret + 1;
          if (relFret < 1 || relFret > fretCount) return null;
          const y = padTop + (relFret - 0.5) * fretSpacing;
          const finger = voicing.fingers[sIdx];
          const r = size === 'lg' ? 8.5 : 6;

          return (
            <g key={`d-${sIdx}`} pointerEvents="none">
              <circle cx={x} cy={y} r={r} fill="#e08e45" stroke="#18120e" strokeWidth={1.5} />
              {finger > 0 && (
                <text
                  x={x}
                  y={y + (size === 'lg' ? 3.5 : 2.8)}
                  textAnchor="middle"
                  className={size === 'lg' ? 'chord-finger-num' : 'chord-finger-num-sm'}
                >
                  {finger}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Per-chord simulation controls right inside the card */}
      <div className="chord-audition-strip">
        <button
          type="button"
          title="Strum în jos (↓)"
          onClick={() => playWithStyle('D')}
        >
          <ArrowDown size={12} /> {size === 'lg' ? 'Jos' : ''}
        </button>
        <button
          type="button"
          title="Strum în sus (↑)"
          onClick={() => playWithStyle('U')}
        >
          <ArrowUp size={12} /> {size === 'lg' ? 'Sus' : ''}
        </button>
        <button
          type="button"
          title="Arpegiu coardă cu coardă"
          onClick={() => playWithStyle('arp')}
        >
          <Music size={11} /> Arp
        </button>
        {size === 'lg' && strummingPattern && (
          <button
            type="button"
            title="Simulează o măsură pe ritmul piesei"
            onClick={() => playWithStyle('groove')}
          >
            <Play size={11} /> Ritm
          </button>
        )}
      </div>
    </div>
  );
};
