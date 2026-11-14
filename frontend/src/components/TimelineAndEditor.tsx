import React, { useState } from 'react';
import { Edit3, FileText, Plus, Repeat, Save, Trash2 } from 'lucide-react';
import type { ChordEvent, SongSection } from '../types';
import { transposeChord } from '../music/chords';

interface TimelineAndEditorProps {
  chords: ChordEvent[];
  sections: SongSection[];
  activeChordIndex: number;
  currentTime: number;
  transposeSemitones: number;
  loopRange: { a: number | null; b: number | null };
  chordProDraft: string;
  onSeekTo: (time: number) => void;
  onSetLoopA: (time: number | null) => void;
  onSetLoopB: (time: number | null) => void;
  onUpdateChordAt: (index: number, nextChord: string) => void;
  onDuplicateChordAt: (index: number) => void;
  onDeleteChordAt: (index: number) => void;
  onApplyChordPro: (text: string) => Promise<void>;
  onSaveSong: () => Promise<void>;
  isSaving: boolean;
}

function formatSec(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const mins = Math.floor(s / 60);
  const rem = s % 60;
  return `${mins}:${rem.toString().padStart(2, '0')}`;
}

export const TimelineAndEditor: React.FC<TimelineAndEditorProps> = ({
  chords,
  sections,
  activeChordIndex,
  currentTime,
  transposeSemitones,
  loopRange,
  chordProDraft,
  onSeekTo,
  onSetLoopA,
  onSetLoopB,
  onUpdateChordAt,
  onDuplicateChordAt,
  onDeleteChordAt,
  onApplyChordPro,
  onSaveSong,
  isSaving,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [showChordPro, setShowChordPro] = useState(false);
  const [draftText, setDraftText] = useState(chordProDraft);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editingVal, setEditingVal] = useState('');

  React.useEffect(() => {
    setDraftText(chordProDraft);
  }, [chordProDraft]);

  return (
    <div className="timeline-panel">
      <div className="timeline-header">
        <div className="timeline-title-wrap">
          <span className="section-eyebrow">Cronologie Acorduri & Secțiuni</span>
          {sections.length > 0 && (
            <div className="section-pills">
              {sections.map((sec, i) => (
                <button
                  key={`${sec.name}-${i}`}
                  type="button"
                  className={`section-pill ${
                    currentTime >= sec.startTime && currentTime < sec.endTime ? 'is-active' : ''
                  }`}
                  onClick={() => onSeekTo(sec.startTime)}
                >
                  {sec.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="timeline-actions">
          <button
            type="button"
            className={`studio-toggle-btn ${editMode ? 'is-on' : ''}`}
            onClick={() => setEditMode((v) => !v)}
          >
            <Edit3 size={14} /> {editMode ? 'Gata Editare' : 'Editează Acorduri'}
          </button>
          <button
            type="button"
            className={`studio-toggle-btn ${showChordPro ? 'is-on' : ''}`}
            onClick={() => setShowChordPro((v) => !v)}
          >
            <FileText size={14} /> ChordPro / Text
          </button>
          <button type="button" className="btn-save-song" onClick={() => void onSaveSong()} disabled={isSaving}>
            <Save size={14} /> {isSaving ? 'Salvez...' : 'Salvează Piesa'}
          </button>
        </div>
      </div>

      {showChordPro && (
        <div className="chordpro-drawer">
          <div className="chordpro-drawer-info">
            <strong>Editor Rapid ChordPro / Progresie</strong>
            <span>
              Scrie acorduri în paranteze pătrate cu versuri (ex. <code>[G]Mama take this [D]badge</code>) sau simplu pe linii (ex. <code>G D Am7 C</code>).
            </span>
          </div>
          <div className="groove-presets">
            {[
              { label: 'Pop 4-Chord (G D Em C)', text: '[Intro]\nG D Em C\n[Strofa 1]\nG D Em C\n[Refren]\nC G D Em' },
              { label: 'Baladă Minoră (Am F C G)', text: '[Intro]\nAm F C G\n[Strofa 1]\nAm F C G\n[Refren]\nF G Am C' },
              { label: 'Rock Clasic (A D E)', text: '[Intro]\nA D E A\n[Strofa 1]\nA D E A\n[Refren]\nD E A A' },
              { label: 'Blues 12-Bar (E7 A7 B7)', text: '[Strofa 1]\nE7 E7 E7 E7\nA7 A7 E7 E7\nB7 A7 E7 B7' },
            ].map((tpl) => (
              <button
                key={tpl.label}
                type="button"
                className="groove-chip"
                onClick={() => setDraftText(tpl.text)}
              >
                {tpl.label}
              </button>
            ))}
          </div>
          <textarea
            className="chordpro-textarea"
            rows={5}
            value={draftText}
            onChange={(e) => setDraftText(e.target.value)}
            placeholder="[Intro]&#10;G D Am7 C&#10;&#10;[Strofa 1]&#10;[G]Versuri cu [D]acorduri [Am7]sincronizate"
          />
          <div className="chordpro-drawer-actions">
            <button
              type="button"
              className="btn-primary-sm"
              onClick={() => {
                void onApplyChordPro(draftText);
                setShowChordPro(false);
              }}
            >
              Generează Timeline din Text
            </button>
            <button type="button" className="btn-secondary-sm" onClick={() => setShowChordPro(false)}>
              Închide
            </button>
          </div>
        </div>
      )}

      <div className="chord-blocks-grid">
        {chords.map((ev, idx) => {
          const isCurrent = idx === activeChordIndex;
          const displayChord = transposeChord(ev.chord, transposeSemitones);
          const progress = isCurrent
            ? Math.min(100, Math.max(0, ((currentTime - ev.time) / Math.max(0.1, ev.duration)) * 100))
            : 0;
          const inLoop =
            loopRange.a !== null &&
            loopRange.b !== null &&
            ev.time >= loopRange.a - 0.05 &&
            ev.time < loopRange.b;

          return (
            <div
              key={`${ev.time}-${idx}`}
              className={`chord-block ${isCurrent ? 'is-current' : ''} ${inLoop ? 'is-in-loop' : ''}`}
            >
              {isCurrent && <div className="chord-block-progress" style={{ width: `${progress}%` }} />}

              <button
                type="button"
                className="chord-block-main"
                onClick={() => {
                  if (editMode) {
                    setEditingIdx(idx);
                    setEditingVal(ev.chord);
                  } else {
                    onSeekTo(ev.time);
                  }
                }}
              >
                <div className="chord-block-top">
                  <span className="chord-block-time">{formatSec(ev.time)}</span>
                  <span className="chord-block-beats">{ev.beats}t</span>
                </div>

                {editMode && editingIdx === idx ? (
                  <input
                    type="text"
                    className="chord-inline-input"
                    value={editingVal}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setEditingVal(e.target.value)}
                    onBlur={() => {
                      if (editingVal.trim()) onUpdateChordAt(idx, editingVal.trim());
                      setEditingIdx(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        if (editingVal.trim()) onUpdateChordAt(idx, editingVal.trim());
                        setEditingIdx(null);
                      } else if (e.key === 'Escape') {
                        setEditingIdx(null);
                      }
                    }}
                  />
                ) : (
                  <div className="chord-block-name">{displayChord}</div>
                )}

                {ev.section && <div className="chord-block-section">{ev.section}</div>}
              </button>

              {editMode ? (
                <div className="chord-block-edit-bar">
                  <button
                    type="button"
                    title="Dublează măsura"
                    onClick={() => onDuplicateChordAt(idx)}
                  >
                    <Plus size={12} />
                  </button>
                  <button
                    type="button"
                    title="Șterge acordul"
                    onClick={() => onDeleteChordAt(idx)}
                    disabled={chords.length <= 1}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ) : (
                <div className="chord-block-loop-bar">
                  <button
                    type="button"
                    title="Setează început Loop A"
                    className={loopRange.a !== null && Math.abs(loopRange.a - ev.time) < 0.05 ? 'is-set' : ''}
                    onClick={() => onSetLoopA(ev.time)}
                  >
                    A
                  </button>
                  <button
                    type="button"
                    title="Setează sfârșit Loop B"
                    className={
                      loopRange.b !== null && Math.abs(loopRange.b - (ev.time + ev.duration)) < 0.05
                        ? 'is-set'
                        : ''
                    }
                    onClick={() => onSetLoopB(ev.time + ev.duration)}
                  >
                    <Repeat size={10} /> B
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
