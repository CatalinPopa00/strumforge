import React, { useState } from 'react';
import {
  STANDARD_TUNING_MIDI,
  STRING_LABELS,
  getChordNoteRole,
  getChordVoicing,
  midiToNoteName,
} from '../music/chords';
import { audioEngine } from '../music/audioEngine';

interface FretboardProps {
  chordName: string;
  capo?: number;
}

const TOTAL_FRETS = 12;
const INLAY_FRETS = new Set([3, 5, 7, 9, 12]);

export const Fretboard: React.FC<FretboardProps> = ({ chordName, capo = 0 }) => {
  const [showAllChordTones, setShowAllChordTones] = useState(false);
  const voicing = getChordVoicing(chordName);

  // Display high e at top (index 5) down to low E at bottom (index 0) — standard TAB orientation
  const stringIndices = [5, 4, 3, 2, 1, 0];

  return (
    <div className="fretboard-panel">
      <div className="fretboard-toolbar">
        <div className="fretboard-title-group">
          <span className="section-eyebrow">Griful Chitarei (TAB View · Click pe taste pentru sunet)</span>
          <div className="fretboard-legend">
            <span className="legend-item">
              <span className="legend-dot dot-root" /> Fundamentală (R)
            </span>
            <span className="legend-item">
              <span className="legend-dot dot-tone" /> Terță / Cvintă / Septimă
            </span>
          </div>
        </div>

        <div className="fretboard-mode-switch">
          <button
            type="button"
            className={`pill-toggle ${!showAllChordTones ? 'is-active' : ''}`}
            onClick={() => setShowAllChordTones(false)}
          >
            Forma activă
          </button>
          <button
            type="button"
            className={`pill-toggle ${showAllChordTones ? 'is-active' : ''}`}
            onClick={() => setShowAllChordTones(true)}
          >
            Toate notele acordului
          </button>
        </div>
      </div>

      <div className="fretboard-scroll">
        <div className="fretboard-neck">
          {/* Fret numbers row */}
          <div className="fret-numbers-row">
            <div className="fret-num-cell is-nut">0</div>
            {Array.from({ length: TOTAL_FRETS }).map((_, i) => {
              const f = i + 1;
              return (
                <div key={`fn-${f}`} className={`fret-num-cell ${INLAY_FRETS.has(f) ? 'has-inlay' : ''}`}>
                  {f}
                </div>
              );
            })}
          </div>

          {/* 6 Strings */}
          <div className="fretboard-strings-box">
            {capo > 0 && (
              <div
                className="capo-bar"
                style={{ left: `calc(${(capo / (TOTAL_FRETS + 1)) * 100}% + 6px)` }}
                title={`Capodastru pe tasta ${capo}`}
              >
                <span>CAPO {capo}</span>
              </div>
            )}

            {stringIndices.map((sIdx) => {
              const activeFret = voicing.frets[sIdx];
              const isMuted = activeFret === -1;

              return (
                <div key={`row-${sIdx}`} className="fret-string-row">
                  <div className="string-label-badge">{STRING_LABELS[sIdx]}</div>

                  {/* Fret 0 (Open) + Frets 1..12 */}
                  {Array.from({ length: TOTAL_FRETS + 1 }).map((_, fret) => {
                    const midi = STANDARD_TUNING_MIDI[sIdx] + fret + capo;
                    const noteName = midiToNoteName(midi);
                    const role = getChordNoteRole(chordName, STANDARD_TUNING_MIDI[sIdx] + fret);
                    const isActiveShapeNote = activeFret === fret;
                    const shouldHighlight = isActiveShapeNote || (showAllChordTones && role !== null);
                    const isRoot = role === 'R';
                    const showInlayDot = sIdx === 3 && INLAY_FRETS.has(fret);
                    const showDoubleInlay = (sIdx === 4 || sIdx === 1) && fret === 12;

                    return (
                      <button
                        key={`cell-${sIdx}-${fret}`}
                        type="button"
                        onClick={() => audioEngine.pluckMidi(midi)}
                        title={`Coarda ${STRING_LABELS[sIdx]} · Tasta ${fret} (${noteName})`}
                        className={`fret-cell ${fret === 0 ? 'is-open-nut' : ''} ${
                          isMuted && fret === 0 ? 'is-muted-string' : ''
                        }`}
                      >
                        <span
                          className="string-wire"
                          style={{ height: `${1 + (5 - sIdx) * 0.35}px` }}
                        />

                        {(showInlayDot && fret !== 12) || showDoubleInlay ? (
                          <span className="fret-inlay-dot" />
                        ) : null}

                        {isMuted && fret === 0 && <span className="fret-muted-x">×</span>}

                        {shouldHighlight && (
                          <span
                            className={`fret-note-pill ${isRoot ? 'is-root' : 'is-tone'} ${
                              isActiveShapeNote ? 'is-primary-voicing' : 'is-secondary-voicing'
                            }`}
                          >
                            {noteName}
                            {role && <small>{role}</small>}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
