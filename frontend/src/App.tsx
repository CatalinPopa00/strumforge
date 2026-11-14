import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Guitar,
  Link2,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import type { ChordEvent, PlaybackMode, SongProject, StrumSymbol } from './types';
import { transposeChord } from './music/chords';
import { audioEngine } from './music/audioEngine';
import {
  deleteLocalCustomSong,
  extractYouTubeId,
  getClientAllSongs,
  loadLocalCustomSongs,
  parseChordProClient,
  saveLocalCustomSong,
} from './music/clientStudio';
import { ChordDiagram } from './components/ChordDiagram';
import { Fretboard } from './components/Fretboard';
import { StrummingStrip } from './components/StrummingStrip';
import { YouTubeStage } from './components/YouTubeStage';
import { TimelineAndEditor } from './components/TimelineAndEditor';

function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export function App() {
  const [songs, setSongs] = useState<SongProject[]>([]);
  const [activeSong, setActiveSong] = useState<SongProject | null>(null);
  const [youtubeInput, setYoutubeInput] = useState('');
  const [statusBanner, setStatusBanner] = useState<{ type: 'info' | 'error' | 'success'; text: string } | null>(
    null
  );

  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('youtube');
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekRequest, setSeekRequest] = useState<{ time: number; nonce: number } | null>(null);

  const [transposeSemitones, setTransposeSemitones] = useState(0);
  const [syncOffset, setSyncOffset] = useState(0);
  const [loopRange, setLoopRange] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });

  const [metronomeEnabled, setMetronomeEnabled] = useState(false);
  const [synthEnabled, setSynthEnabled] = useState(false);

  const lastSlotRef = useRef<number>(-1);
  const lastFrameTimeRef = useRef<number>(0);

  // Load initial library (from FastAPI if available, or localStorage & bundled presets on Vercel)
  useEffect(() => {
    void (async () => {
      try {
        const resp = await fetch('/api/songs');
        if (!resp.ok) throw new Error('API server indisponibil');
        const data = (await resp.json()) as { songs: SongProject[] };
        const local = loadLocalCustomSongs();
        const merged = [...local.filter((l) => !data.songs.some((s) => s.id === l.id)), ...data.songs];
        setSongs(merged);
        if (merged.length > 0) {
          selectSong(merged[0]);
        }
      } catch {
        // Vercel static deployment or backend offline: use bundled presets + localStorage
        const clientList = getClientAllSongs();
        setSongs(clientList);
        if (clientList.length > 0) {
          selectSong(clientList[0]);
        }
      }
    })();
  }, []);

  const selectSong = useCallback((song: SongProject) => {
    setIsPlaying(false);
    setActiveSong(song);
    setCurrentTime(0);
    setSeekRequest({ time: 0, nonce: Date.now() });
    setYoutubeInput(song.youtubeUrl || '');
    setTransposeSemitones(song.capo ? -song.capo : 0);
    setSyncOffset(0);
    setLoopRange({ a: null, b: null });
    lastSlotRef.current = -1;
    if (song.youtubeId) {
      setPlaybackMode('youtube');
    } else {
      setPlaybackMode('synth');
    }
  }, []);

  const triggerSeek = useCallback((time: number) => {
    const safeTime = Math.max(0, time);
    setCurrentTime(safeTime);
    setSeekRequest({ time: safeTime, nonce: Date.now() + Math.random() });
    lastSlotRef.current = -1;
  }, []);

  // Autonomous clock when in Synth Practice Mode
  useEffect(() => {
    if (!isPlaying || playbackMode !== 'synth' || !activeSong) return;
    lastFrameTimeRef.current = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const dt = (now - lastFrameTimeRef.current) / 1000;
      lastFrameTimeRef.current = now;
      setCurrentTime((prev) => {
        let next = prev + dt * playbackRate;
        if (loopRange.a !== null && loopRange.b !== null && next >= loopRange.b) {
          next = loopRange.a;
        } else if (next >= activeSong.duration) {
          next = 0;
        }
        return next;
      });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, playbackMode, playbackRate, activeSong, loopRange]);

  // Enforce A-B Loop for YouTube and Local Audio modes
  useEffect(() => {
    if (!isPlaying || playbackMode === 'synth') return;
    if (loopRange.a !== null && loopRange.b !== null && currentTime >= loopRange.b) {
      triggerSeek(loopRange.a);
    }
  }, [currentTime, isPlaying, playbackMode, loopRange, triggerSeek]);

  // Spacebar play/pause shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Compute effective musical time (adjusted by syncOffset)
  const effectiveTime = Math.max(0, currentTime + syncOffset);

  const activeChordIndex = useMemo(() => {
    if (!activeSong || activeSong.chords.length === 0) return 0;
    const list = activeSong.chords;
    for (let i = list.length - 1; i >= 0; i--) {
      if (effectiveTime >= list[i].time) return i;
    }
    return 0;
  }, [activeSong, effectiveTime]);

  const activeChordEvent: ChordEvent | null = activeSong?.chords[activeChordIndex] ?? null;
  const nextChordEvents = activeSong ? activeSong.chords.slice(activeChordIndex + 1, activeChordIndex + 3) : [];

  const displayActiveChord = activeChordEvent
    ? transposeChord(activeChordEvent.chord, transposeSemitones)
    : 'G';

  // With Capo (negative transposeSemitones), the guitarist fingers displayActiveChord but the sounding pitch stays original
  const soundingActiveChord =
    transposeSemitones < 0 ? (activeChordEvent?.chord ?? 'G') : displayActiveChord;

  const beatsRemaining = useMemo(() => {
    if (!activeChordEvent || !activeSong) return 0;
    const end = activeChordEvent.time + activeChordEvent.duration;
    const beatSec = 60 / activeSong.bpm;
    return Math.max(0, Math.ceil((end - effectiveTime) / beatSec));
  }, [activeChordEvent, activeSong, effectiveTime]);

  // Subdivision slot index in the current bar
  const { globalSlotIndex, activeSlotInBar } = useMemo(() => {
    if (!activeSong) return { globalSlotIndex: -1, activeSlotInBar: -1 };
    const patternLen = activeSong.strummingPattern.length || 8;
    const beatSec = 60 / activeSong.bpm;
    const slotSec = activeSong.timeSignature === '6/8' ? beatSec : beatSec / 2;
    const elapsed = effectiveTime - activeSong.beatOffset;
    if (elapsed < 0) return { globalSlotIndex: -1, activeSlotInBar: -1 };
    const gSlot = Math.floor(elapsed / slotSec);
    return {
      globalSlotIndex: gSlot,
      activeSlotInBar: gSlot % patternLen,
    };
  }, [activeSong, effectiveTime]);

  // Trigger Metronome & Synth Guitar on subdivision transitions
  useEffect(() => {
    if (!isPlaying || !activeSong || globalSlotIndex < 0) {
      if (!isPlaying) lastSlotRef.current = -1;
      return;
    }
    if (globalSlotIndex === lastSlotRef.current) return;
    lastSlotRef.current = globalSlotIndex;

    const pattern = activeSong.strummingPattern;
    const slotSym = pattern[activeSlotInBar] ?? '-';

    const isBeatBoundary = activeSong.timeSignature === '6/8' ? true : activeSlotInBar % 2 === 0;
    if (metronomeEnabled && isBeatBoundary) {
      audioEngine.playMetronomeClick(activeSlotInBar === 0);
    }
    if (synthEnabled && slotSym !== '-') {
      audioEngine.strumChord(soundingActiveChord, slotSym, 0.85);
    }
  }, [
    isPlaying,
    activeSong,
    globalSlotIndex,
    activeSlotInBar,
    metronomeEnabled,
    synthEnabled,
    soundingActiveChord,
  ]);

  const handleLoadYoutubeUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeInput.trim()) return;

    const ytId = extractYouTubeId(youtubeInput);
    if (!ytId) {
      setStatusBanner({
        type: 'error',
        text: 'Link YouTube invalid. Te rugăm să introduci un URL YouTube (youtube.com / youtu.be) sau un ID de 11 caractere.',
      });
      return;
    }

    setStatusBanner({ type: 'info', text: 'Se încarcă detaliile videoclipului YouTube...' });

    // Check if we already have a song with this youtubeId
    const existing = songs.find((s) => s.youtubeId === ytId);
    if (existing) {
      selectSong(existing);
      setStatusBanner({ type: 'success', text: `Am încărcat piesa salvată pentru „${existing.title}”.` });
      return;
    }

    let meta = {
      title: `Videoclip YouTube (${ytId})`,
      artist: 'YouTube',
      youtubeUrl: `https://www.youtube.com/watch?v=${ytId}`,
    };

    try {
      const resp = await fetch(`/api/youtube/metadata?url=${encodeURIComponent(youtubeInput.trim())}`);
      if (resp.ok) {
        const d = await resp.json();
        meta = {
          title: d.title || meta.title,
          artist: d.artist || meta.artist,
          youtubeUrl: d.youtubeUrl || meta.youtubeUrl,
        };
      }
    } catch {
      // Fallback for static Vercel hosting
    }

    let starterSong: SongProject;
    try {
      const starterResp = await fetch('/api/parse-chordpro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: meta.title,
          bpm: 96,
          timeSignature: '4/4',
          youtubeUrl: meta.youtubeUrl,
          text: '[Intro]\nG D Em C\n\n[Strofa 1]\nG D Em C\nG D Em C\n\n[Refren]\nC G D Em\nC G D G',
        }),
      });
      if (starterResp.ok) {
        starterSong = (await starterResp.json()) as SongProject;
      } else {
        throw new Error('API error');
      }
    } catch {
      starterSong = parseChordProClient(
        '[Intro]\nG D Em C\n\n[Strofa 1]\nG D Em C\nG D Em C\n\n[Refren]\nC G D Em\nC G D G',
        96,
        '4/4',
        meta.title,
        meta.youtubeUrl
      );
    }

    starterSong.artist = meta.artist;
    starterSong.youtubeId = ytId;
    starterSong.youtubeUrl = meta.youtubeUrl;
    starterSong.strummingHint =
      'Videoclip încărcat! Poți exersa imediat acordurile sincronizate sau edita progresia în ChordPro.';

    setActiveSong(starterSong);
    setPlaybackMode('youtube');
    setCurrentTime(0);
    setIsPlaying(false);
    setStatusBanner({
      type: 'success',
      text: `Video încărcat: „${meta.title}”. Poți începe să cânți imediat!`,
    });
  };

  const handleAudioFileSelected = async (file: File) => {
    setIsAnalyzing(true);
    setStatusBanner({
      type: 'info',
      text: `Analizez „${file.name}” (detecție BPM, tonalitate, acorduri și pattern ritmic)...`,
    });

    const objectUrl = URL.createObjectURL(file);
    setLocalAudioUrl(objectUrl);

    try {
      const form = new FormData();
      form.append('file', file);
      if (activeSong?.title && !activeSong.isPreset) {
        form.append('title', activeSong.title);
      }
      if (activeSong?.youtubeUrl) {
        form.append('youtube_url', activeSong.youtubeUrl);
      }

      const resp = await fetch('/api/analyze-audio', {
        method: 'POST',
        body: form,
      });
      const analyzed = await resp.json();
      if (!resp.ok) {
        throw new Error(analyzed.detail || 'Analiza audio a eșuat.');
      }

      setActiveSong(analyzed as SongProject);
      setPlaybackMode('local-audio');
      setCurrentTime(0);
      setIsPlaying(false);
      setTransposeSemitones(0);
      setSyncOffset(0);
      setLoopRange({ a: null, b: null });
      setStatusBanner({
        type: 'success',
        text: `Analiză completă: ${analyzed.bpm} BPM · Tonalitate ${analyzed.key} · ${analyzed.uniqueChords.length} acorduri detectate!`,
      });
    } catch (err) {
      setStatusBanner({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Nu s-a putut analiza fișierul audio (analiza DSP avansată necesită backend-ul Python activ).',
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyChordPro = async (text: string) => {
    if (!activeSong) return;
    try {
      const resp = await fetch('/api/parse-chordpro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          bpm: activeSong.bpm,
          timeSignature: activeSong.timeSignature,
          title: activeSong.title,
          youtubeUrl: activeSong.youtubeUrl || undefined,
        }),
      });
      if (resp.ok) {
        const parsed = (await resp.json()) as SongProject;
        setActiveSong({
          ...activeSong,
          chords: parsed.chords,
          sections: parsed.sections,
          uniqueChords: parsed.uniqueChords,
          duration: parsed.duration,
          chordPro: text,
        });
        setStatusBanner({ type: 'success', text: 'Timeline-ul de acorduri a fost regenerat din ChordPro!' });
        return;
      }
    } catch {
      // Fallback
    }

    const clientParsed = parseChordProClient(
      text,
      activeSong.bpm,
      activeSong.timeSignature,
      activeSong.title,
      activeSong.youtubeUrl
    );
    setActiveSong({
      ...activeSong,
      chords: clientParsed.chords,
      sections: clientParsed.sections,
      uniqueChords: clientParsed.uniqueChords,
      duration: clientParsed.duration,
      chordPro: text,
    });
    setStatusBanner({ type: 'success', text: 'Timeline-ul de acorduri a fost regenerat din ChordPro!' });
  };

  const handleSaveSong = async () => {
    if (!activeSong) return;
    setIsSaving(true);
    try {
      let saved = activeSong;
      try {
        const resp = await fetch('/api/songs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(activeSong),
        });
        if (resp.ok) {
          saved = (await resp.json()) as SongProject;
        }
      } catch {
        // Offline / Vercel fallback
      }

      saved = saveLocalCustomSong(saved);
      setActiveSong(saved);
      setSongs((prev) => {
        const filtered = prev.filter((s) => s.id !== saved.id);
        return [saved, ...filtered];
      });
      setStatusBanner({ type: 'success', text: `Piesa „${saved.title}” a fost salvată în bibliotecă.` });
    } catch {
      setStatusBanner({ type: 'error', text: 'Eroare la salvarea piesei.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSong = async (songId: string) => {
    deleteLocalCustomSong(songId);
    try {
      await fetch(`/api/songs/${songId}`, { method: 'DELETE' });
    } catch {
      // Offline fallback
    }
    setSongs((prev) => {
      const next = prev.filter((s) => s.id !== songId);
      if (activeSong?.id === songId && next.length > 0) {
        selectSong(next[0]);
      }
      return next;
    });
  };

  const handleChangeBpm = (nextBpm: number) => {
    if (!activeSong) return;
    const ratio = activeSong.bpm / nextBpm;
    const rescaledChords = activeSong.chords.map((c) => ({
      ...c,
      time: Number((c.time * ratio).toFixed(3)),
      duration: Number((c.duration * ratio).toFixed(3)),
    }));
    const rescaledSections = activeSong.sections.map((s) => ({
      ...s,
      startTime: Number((s.startTime * ratio).toFixed(3)),
      endTime: Number((s.endTime * ratio).toFixed(3)),
    }));
    setActiveSong({
      ...activeSong,
      bpm: nextBpm,
      duration: Number((activeSong.duration * ratio).toFixed(2)),
      chords: rescaledChords,
      sections: rescaledSections,
    });
  };

  const handleUpdateChordAt = (index: number, nextChord: string) => {
    if (!activeSong) return;
    const updated = activeSong.chords.map((c, idx) => (idx === index ? { ...c, chord: nextChord } : c));
    const unique = Array.from(new Set(updated.map((c) => c.chord)));
    setActiveSong({ ...activeSong, chords: updated, uniqueChords: unique });
  };

  const handleDuplicateChordAt = (index: number) => {
    if (!activeSong) return;
    const target = activeSong.chords[index];
    const nextList = [...activeSong.chords];
    nextList.splice(index + 1, 0, { ...target });
    // Recompute sequential times
    let t = activeSong.beatOffset;
    const recomputed = nextList.map((ev) => {
      const nextEv = { ...ev, time: Number(t.toFixed(3)) };
      t += ev.duration;
      return nextEv;
    });
    setActiveSong({ ...activeSong, chords: recomputed, duration: Number(t.toFixed(2)) });
  };

  const handleDeleteChordAt = (index: number) => {
    if (!activeSong || activeSong.chords.length <= 1) return;
    const filtered = activeSong.chords.filter((_, idx) => idx !== index);
    let t = activeSong.beatOffset;
    const recomputed = filtered.map((ev) => {
      const nextEv = { ...ev, time: Number(t.toFixed(3)) };
      t += ev.duration;
      return nextEv;
    });
    const unique = Array.from(new Set(recomputed.map((c) => c.chord)));
    setActiveSong({
      ...activeSong,
      chords: recomputed,
      uniqueChords: unique,
      duration: Number(t.toFixed(2)),
    });
  };

  const uniqueDisplayChords = useMemo(() => {
    if (!activeSong) return [];
    return Array.from(new Set(activeSong.uniqueChords.map((c) => transposeChord(c, transposeSemitones))));
  }, [activeSong, transposeSemitones]);

  return (
    <div className="app-shell">
      {/* Top Studio Header */}
      <header className="studio-header">
        <div className="brand-block">
          <div className="brand-mark">
            <Guitar size={22} />
          </div>
          <div>
            <h1 className="brand-title">StrumForge</h1>
            <p className="brand-sub">Studio interactiv de chitară · YouTube & Analiză Audio</p>
          </div>
        </div>

        <form className="youtube-url-form" onSubmit={(e) => void handleLoadYoutubeUrl(e)}>
          <div className="url-input-wrap">
            <Link2 size={16} className="url-input-icon" />
            <input
              type="text"
              value={youtubeInput}
              onChange={(e) => setYoutubeInput(e.target.value)}
              placeholder="Lipește un link de YouTube (ex. https://www.youtube.com/watch?v=...)"
              aria-label="Link YouTube"
            />
          </div>
          <button type="submit" className="btn-load-yt">
            <Sparkles size={15} /> Încarcă Piesa
          </button>
        </form>
      </header>

      {/* Library Bar */}
      <section className="library-strip" aria-label="Bibliotecă piese">
        <span className="library-label">Piese gata de cântat:</span>
        <div className="library-chips">
          {songs.map((song) => {
            const isSelected = activeSong?.id === song.id;
            return (
              <div key={song.id} className={`library-chip-wrap ${isSelected ? 'is-selected' : ''}`}>
                <button
                  type="button"
                  className="library-chip"
                  onClick={() => selectSong(song)}
                >
                  <span className="chip-title">{song.title}</span>
                  <span className="chip-meta">
                    {song.bpm} BPM · {song.timeSignature}
                  </span>
                </button>
                {!song.isPreset && (
                  <button
                    type="button"
                    className="chip-delete"
                    title="Șterge piesa salvată"
                    onClick={() => void handleDeleteSong(song.id)}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {statusBanner && (
        <div className={`status-banner is-${statusBanner.type}`}>
          <span>{statusBanner.text}</span>
          <button type="button" onClick={() => setStatusBanner(null)} aria-label="Închide notificarea">
            <X size={14} />
          </button>
        </div>
      )}

      {activeSong && (
        <main className="studio-main">
          {/* Song Title & Practice Transport Bar */}
          <section className="transport-bar">
            <div className="song-identity">
              <h2>{activeSong.title}</h2>
              <p>
                {activeSong.artist} · Tonalitate: <strong>{activeSong.key}</strong> · Dificultate:{' '}
                <strong>{activeSong.difficulty}</strong>
              </p>
            </div>

            <div className="transport-controls">
              <button
                type="button"
                className="btn-play-main"
                onClick={() => setIsPlaying((p) => !p)}
                title="Play / Pauză (Space)"
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                <span>{isPlaying ? 'Pauză' : 'Cântă'}</span>
              </button>

              <button
                type="button"
                className="btn-icon-control"
                onClick={() => triggerSeek(loopRange.a ?? 0)}
                title="Reia de la început"
              >
                <RotateCcw size={16} />
              </button>

              <div className="clock-readout">
                <span>{formatClock(currentTime)}</span>
                <small>/ {formatClock(activeSong.duration)}</small>
              </div>

              {/* Speed selector */}
              <div className="speed-group" role="group" aria-label="Viteză redare">
                {[0.5, 0.75, 0.9, 1.0].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    className={`speed-pill ${playbackRate === rate ? 'is-active' : ''}`}
                    onClick={() => setPlaybackRate(rate)}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              {/* Capo / Transpose */}
              <div className="control-stepper" title="Transpune acordurile sau adaptează pentru Capodastru">
                <span className="stepper-label">Capo / Transp.</span>
                <button
                  type="button"
                  onClick={() => setTransposeSemitones((s) => Math.max(-6, s - 1))}
                >
                  −
                </button>
                <span className="stepper-value">
                  {transposeSemitones < 0
                    ? `Capo ${Math.abs(transposeSemitones)}`
                    : transposeSemitones > 0
                    ? `+${transposeSemitones}`
                    : '0'}
                </span>
                <button
                  type="button"
                  onClick={() => setTransposeSemitones((s) => Math.min(6, s + 1))}
                >
                  +
                </button>
              </div>

              {/* Sync offset */}
              <label className="offset-slider" title="Ajustează decalajul dintre video și acorduri">
                <SlidersHorizontal size={13} />
                <span>Sync {syncOffset >= 0 ? `+${syncOffset.toFixed(1)}s` : `${syncOffset.toFixed(1)}s`}</span>
                <input
                  type="range"
                  min={-2.5}
                  max={2.5}
                  step={0.1}
                  value={syncOffset}
                  onChange={(e) => setSyncOffset(parseFloat(e.target.value))}
                />
              </label>

              {(loopRange.a !== null || loopRange.b !== null) && (
                <button
                  type="button"
                  className="loop-clear-btn"
                  onClick={() => setLoopRange({ a: null, b: null })}
                >
                  Loop {loopRange.a !== null ? formatClock(loopRange.a) : '0:00'}–
                  {loopRange.b !== null ? formatClock(loopRange.b) : '∞'} ✕
                </button>
              )}
            </div>
          </section>

          {/* Split Stage: Video/Audio Left + Live Chord Coach Right */}
          <section className="stage-split-grid">
            <YouTubeStage
              youtubeId={activeSong.youtubeId}
              playbackMode={playbackMode}
              localAudioUrl={localAudioUrl}
              waveform={activeSong.waveform}
              isPlaying={isPlaying}
              playbackRate={playbackRate}
              seekRequest={seekRequest}
              currentTime={currentTime}
              duration={activeSong.duration}
              onModeChange={setPlaybackMode}
              onPlayStateChange={setIsPlaying}
              onTimeUpdate={setCurrentTime}
              onDurationDetected={(dur) => {
                if (dur > activeSong.duration) {
                  setActiveSong((prev) => (prev ? { ...prev, duration: Math.round(dur) } : prev));
                }
              }}
              onAudioFileSelected={(f) => void handleAudioFileSelected(f)}
              isAnalyzing={isAnalyzing}
            />

            {/* Live Chord Coach Spotlight */}
            <aside className="chord-spotlight-panel">
              <div className="spotlight-top">
                <div>
                  <span className="section-eyebrow">Acord Activ Acum</span>
                  <div className="spotlight-countdown">
                    {isPlaying ? `Următorul în ${beatsRemaining} timpi` : 'Click pe diagramă pentru a asculta'}
                  </div>
                </div>
                {activeChordEvent?.section && (
                  <span className="active-section-tag">{activeChordEvent.section}</span>
                )}
              </div>

              <div className="spotlight-diagrams-row">
                <ChordDiagram
                  chordName={displayActiveChord}
                  size="lg"
                  highlight
                  subtitle={
                    transposeSemitones < 0 && activeChordEvent
                      ? `ACUM · sună ${activeChordEvent.chord}`
                      : 'ACUM'
                  }
                />

                <div className="next-chords-column">
                  <span className="next-up-label">Urmează</span>
                  {nextChordEvents.length > 0 ? (
                    <div className="next-chords-pair">
                      {nextChordEvents.map((ev, i) => (
                        <ChordDiagram
                          key={`next-${i}-${ev.time}`}
                          chordName={transposeChord(ev.chord, transposeSemitones)}
                          size="sm"
                          subtitle={`${ev.beats} timpi`}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="next-empty-box">Finalul secțiunii</div>
                  )}
                </div>
              </div>

              <div className="song-chord-palette">
                <span className="palette-label">Vocabularul piesei ({uniqueDisplayChords.length} acorduri):</span>
                <div className="palette-pills">
                  {uniqueDisplayChords.map((ch) => (
                    <button
                      key={ch}
                      type="button"
                      className={`palette-chord-pill ${ch === displayActiveChord ? 'is-active' : ''}`}
                      onClick={() => audioEngine.strumChord(ch, 'D')}
                    >
                      {ch}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </section>

          {/* Strumming & Metronome Coach */}
          <StrummingStrip
            pattern={activeSong.strummingPattern}
            timeSignature={activeSong.timeSignature}
            bpm={activeSong.bpm}
            activeSlotIndex={isPlaying ? activeSlotInBar : -1}
            activeChord={displayActiveChord}
            hint={activeSong.strummingHint}
            metronomeEnabled={metronomeEnabled}
            synthEnabled={synthEnabled}
            onToggleMetronome={() => setMetronomeEnabled((m) => !m)}
            onToggleSynth={() => setSynthEnabled((s) => !s)}
            onChangePattern={(next: StrumSymbol[]) =>
              setActiveSong((prev) => (prev ? { ...prev, strummingPattern: next } : prev))
            }
            onChangeBpm={handleChangeBpm}
          />

          {/* Interactive 12-Fret Guitar Neck */}
          <Fretboard
            chordName={displayActiveChord}
            capo={transposeSemitones < 0 ? Math.abs(transposeSemitones) : 0}
          />

          {/* Synchronized Timeline + ChordPro Editor */}
          <TimelineAndEditor
            chords={activeSong.chords}
            sections={activeSong.sections}
            activeChordIndex={activeChordIndex}
            currentTime={effectiveTime}
            transposeSemitones={transposeSemitones}
            loopRange={loopRange}
            chordProDraft={
              activeSong.chordPro ||
              activeSong.chords.map((c) => `[${c.chord}]`).join(' ')
            }
            onSeekTo={(t) => triggerSeek(Math.max(0, t - syncOffset))}
            onSetLoopA={(a) => setLoopRange((prev) => ({ ...prev, a }))}
            onSetLoopB={(b) => setLoopRange((prev) => ({ ...prev, b }))}
            onUpdateChordAt={handleUpdateChordAt}
            onDuplicateChordAt={handleDuplicateChordAt}
            onDeleteChordAt={handleDeleteChordAt}
            onApplyChordPro={handleApplyChordPro}
            onSaveSong={handleSaveSong}
            isSaving={isSaving}
          />
        </main>
      )}
    </div>
  );
}

export default App;
