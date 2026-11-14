import React from 'react';
import { Volume2 } from 'lucide-react';
import { getChordVoicing } from '../music/chords';
import { audioEngine } from '../music/audioEngine';

interface ChordDiagramProps {
  chordName: string;
  size?: 'sm' | 'lg';
  highlight?: boolean;
  subtitle?: string;
}

export const ChordDiagram: React.FC<ChordDiagramProps> = ({
  chordName,
  size = 'lg',
  highlight = false,
  subtitle,
}) => {
  const voicing = getChordVoicing(chordName);
  const fretCount = 4;
  const width = size === 'lg' ? 168 : 112;
  const height = size === 'lg' ? 196 : 132;
  const padX = size === 'lg' ? 28 : 20;
  const padTop = size === 'lg' ? 32 : 24;
  const padBottom = size === 'lg' ? 22 : 16;

  const gridW = width - padX * 2;
  const gridH = height - padTop - padBottom;
  const stringSpacing = gridW / 5;
  const fretSpacing = gridH / fretCount;

  const showNut = voicing.baseFret <= 1;
  const startFret = showNut ? 1 : voicing.baseFret;

  return (
    <button
      type="button"
      onClick={() => audioEngine.strumChord(chordName, 'D')}
      title={`Ascultă acordul ${chordName}`}
      className={`chord-diagram-card ${size === 'sm' ? 'chord-diagram-sm' : 'chord-diagram-lg'} ${
        highlight ? 'is-highlighted' : ''
      }`}
    >
      <div className="chord-diagram-header">
        <div>
          <span className="chord-diagram-name">{chordName}</span>
          {subtitle && <span className="chord-diagram-subtitle">{subtitle}</span>}
        </div>
        <Volume2 className="chord-sound-icon" size={size === 'lg' ? 15 : 12} />
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

        {/* Vertical strings */}
        {Array.from({ length: 6 }).map((_, sIdx) => {
          const x = padX + sIdx * stringSpacing;
          const thickness = 2.0 - sIdx * 0.22;
          return (
            <line
              key={`s-${sIdx}`}
              x1={x}
              y1={padTop}
              x2={x}
              y2={padTop + gridH}
              stroke="rgba(243, 237, 226, 0.45)"
              strokeWidth={thickness}
            />
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
              />
            );
          }

          const relFret = fret - startFret + 1;
          if (relFret < 1 || relFret > fretCount) return null;
          const y = padTop + (relFret - 0.5) * fretSpacing;
          const finger = voicing.fingers[sIdx];
          const r = size === 'lg' ? 8.5 : 6;

          return (
            <g key={`d-${sIdx}`}>
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
    </button>
  );
};
