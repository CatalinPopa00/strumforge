import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Music2, PlayCircle, Upload } from 'lucide-react';
import type { PlaybackMode } from '../types';

declare global {
  interface Window {
    YT?: {
      Player: new (
        el: HTMLElement | string,
        opts: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
            onStateChange?: (e: { data: number; target: YTPlayer }) => void;
            onError?: (e: { data: number }) => void;
          };
        }
      ) => YTPlayer;
      PlayerState?: {
        PLAYING: number;
        PAUSED: number;
        ENDED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export interface YTPlayer {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  setPlaybackRate: (rate: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

interface YouTubeStageProps {
  youtubeId: string;
  playbackMode: PlaybackMode;
  localAudioUrl: string | null;
  waveform?: number[];
  isPlaying: boolean;
  playbackRate: number;
  seekRequest: { time: number; nonce: number } | null;
  currentTime: number;
  duration: number;
  onModeChange: (mode: PlaybackMode) => void;
  onPlayStateChange: (playing: boolean) => void;
  onTimeUpdate: (time: number) => void;
  onDurationDetected: (dur: number) => void;
  onAudioFileSelected: (file: File) => void;
  isAnalyzing: boolean;
}

let ytApiPromise: Promise<void> | null = null;
function loadYouTubeIframeApi(): Promise<void> {
  if (window.YT && window.YT.Player) {
    return Promise.resolve();
  }
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    tag.async = true;
    document.head.appendChild(tag);
  });
  return ytApiPromise;
}

export const YouTubeStage: React.FC<YouTubeStageProps> = ({
  youtubeId,
  playbackMode,
  localAudioUrl,
  waveform,
  isPlaying,
  playbackRate,
  seekRequest,
  currentTime,
  duration,
  onModeChange,
  onPlayStateChange,
  onTimeUpdate,
  onDurationDetected,
  onAudioFileSelected,
  isAnalyzing,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [ytReady, setYtReady] = useState(false);
  const [ytError, setYtError] = useState<string | null>(null);

  // Initialize / switch YouTube player when youtubeId or mode === 'youtube'
  useEffect(() => {
    if (playbackMode !== 'youtube' || !youtubeId) {
      playerRef.current?.destroy();
      playerRef.current = null;
      setYtReady(false);
      return;
    }

    let cancelled = false;
    setYtError(null);
    setYtReady(false);

    void loadYouTubeIframeApi().then(() => {
      if (cancelled || !containerRef.current || !window.YT?.Player) return;
      containerRef.current.innerHTML = '<div id="yt-player-mount"></div>';
      const mountEl = containerRef.current.querySelector('#yt-player-mount') as HTMLElement;
      if (!mountEl) return;

      playerRef.current = new window.YT.Player(mountEl, {
        videoId: youtubeId,
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
        },
        events: {
          onReady: (e) => {
            if (cancelled) return;
            setYtReady(true);
            e.target.setPlaybackRate(playbackRate);
            const d = e.target.getDuration();
            if (d > 0) onDurationDetected(d);
          },
          onStateChange: (e) => {
            if (cancelled) return;
            if (e.data === 1) {
              onPlayStateChange(true);
            } else if (e.data === 2 || e.data === 0) {
              onPlayStateChange(false);
            }
          },
          onError: (e) => {
            if (cancelled) return;
            const code = e.data;
            if (code === 101 || code === 150 || code === 153) {
              setYtError(
                'Deținătorul acestui videoclip a dezactivat redarea în embed. Poți exersa imediat cu „Mod Ghid Synth” sau poți încărca un fișier audio local!'
              );
            } else {
              setYtError('Videoclipul YouTube nu a putut fi încărcat în browser. Încearcă „Mod Ghid Synth” sau audio local.');
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [youtubeId, playbackMode]);

  // Sync play/pause & speed on YouTube
  useEffect(() => {
    if (playbackMode !== 'youtube' || !ytReady || !playerRef.current) return;
    playerRef.current.setPlaybackRate(playbackRate);
    const state = playerRef.current.getPlayerState();
    if (isPlaying && state !== 1) {
      playerRef.current.playVideo();
    } else if (!isPlaying && state === 1) {
      playerRef.current.pauseVideo();
    }
  }, [isPlaying, playbackRate, playbackMode, ytReady]);

  // Sync play/pause & speed on Local Audio
  useEffect(() => {
    const el = audioRef.current;
    if (playbackMode !== 'local-audio' || !el) return;
    el.playbackRate = playbackRate;
    if (isPlaying && el.paused) {
      void el.play();
    } else if (!isPlaying && !el.paused) {
      el.pause();
    }
  }, [isPlaying, playbackRate, playbackMode, localAudioUrl]);

  // Handle seek requests
  useEffect(() => {
    if (!seekRequest) return;
    if (playbackMode === 'youtube' && ytReady && playerRef.current) {
      playerRef.current.seekTo(seekRequest.time, true);
    } else if (playbackMode === 'local-audio' && audioRef.current) {
      audioRef.current.currentTime = seekRequest.time;
    }
  }, [seekRequest, playbackMode, ytReady]);

  // High-frequency time polling for YouTube or Local Audio
  useEffect(() => {
    if (!isPlaying) return;
    if (playbackMode === 'youtube' && ytReady && playerRef.current) {
      const id = window.setInterval(() => {
        if (!playerRef.current) return;
        const t = playerRef.current.getCurrentTime();
        if (Number.isFinite(t)) onTimeUpdate(t);
      }, 45);
      return () => window.clearInterval(id);
    }
    if (playbackMode === 'local-audio' && audioRef.current) {
      const id = window.setInterval(() => {
        if (!audioRef.current) return;
        onTimeUpdate(audioRef.current.currentTime);
      }, 45);
      return () => window.clearInterval(id);
    }
  }, [isPlaying, playbackMode, ytReady, onTimeUpdate]);

  const progressPct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div className="stage-card">
      <div className="stage-mode-bar">
        <div className="mode-tabs">
          <button
            type="button"
            className={`mode-tab ${playbackMode === 'youtube' ? 'is-active' : ''}`}
            onClick={() => onModeChange('youtube')}
            disabled={!youtubeId}
          >
            <PlayCircle size={14} /> Player YouTube
          </button>
          <button
            type="button"
            className={`mode-tab ${playbackMode === 'local-audio' ? 'is-active' : ''}`}
            onClick={() => {
              if (localAudioUrl) onModeChange('local-audio');
              else fileInputRef.current?.click();
            }}
          >
            <Music2 size={14} /> Audio Local
          </button>
          <button
            type="button"
            className={`mode-tab ${playbackMode === 'synth' ? 'is-active' : ''}`}
            onClick={() => onModeChange('synth')}
          >
            Mod Ghid Synth
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.ogg,.flac,.webm"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onAudioFileSelected(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="upload-audio-btn"
          disabled={isAnalyzing}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={14} /> {isAnalyzing ? 'Analizez audio...' : 'Analizează MP3/WAV'}
        </button>
      </div>

      <div className="stage-viewport">
        {playbackMode === 'youtube' && youtubeId ? (
          <>
            <div ref={containerRef} className="yt-iframe-wrap" />
            {ytError && (
              <div className="yt-error-overlay">
                <AlertCircle size={22} />
                <p>{ytError}</p>
                <div className="yt-error-actions">
                  <button type="button" className="btn-primary-sm" onClick={() => onModeChange('synth')}>
                    Pornește Mod Ghid Synth
                  </button>
                  <button
                    type="button"
                    className="btn-secondary-sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Încarcă Audio Local
                  </button>
                </div>
              </div>
            )}
          </>
        ) : playbackMode === 'local-audio' && localAudioUrl ? (
          <div className="waveform-stage">
            <audio
              ref={audioRef}
              src={localAudioUrl}
              onLoadedMetadata={(e) => {
                const dur = e.currentTarget.duration;
                if (Number.isFinite(dur) && dur > 0) onDurationDetected(dur);
              }}
              onEnded={() => onPlayStateChange(false)}
            />
            <div className="waveform-bars" aria-hidden="true">
              {(waveform && waveform.length > 0
                ? waveform
                : Array.from({ length: 80 }, (_, i) => 0.25 + 0.65 * Math.abs(Math.sin(i * 0.35)))
              ).map((peak, idx, arr) => {
                const barPct = (idx / arr.length) * 100;
                const played = barPct <= progressPct;
                return (
                  <button
                    key={`wf-${idx}`}
                    type="button"
                    className={`waveform-bar ${played ? 'is-played' : ''}`}
                    style={{ height: `${Math.max(12, peak * 100)}%` }}
                    onClick={() => {
                      const target = (idx / arr.length) * duration;
                      if (audioRef.current) audioRef.current.currentTime = target;
                      onTimeUpdate(target);
                    }}
                  />
                );
              })}
            </div>
            <p className="stage-caption">
              Redare audio locală sincronizată cu analiza armonică · Click pe formă pentru salt rapid
            </p>
          </div>
        ) : (
          <div className="synth-stage-placeholder">
            <div className="synth-orb" />
            <h3>Mod Practică Chitară Ghid</h3>
            <p>
              Timeline-ul rulează autonom cu metronomul și chitara acustică sintetizată la{' '}
              <strong>{Math.round(playbackRate * 100)}%</strong> viteză. Ideal pentru exersare lentă!
            </p>
            {youtubeId && (
              <button type="button" className="btn-secondary-sm" onClick={() => onModeChange('youtube')}>
                Revino la YouTube Video
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
