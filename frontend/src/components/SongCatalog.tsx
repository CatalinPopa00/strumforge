import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Compass, Shuffle, Trash2 } from 'lucide-react';
import type { SongProject } from '../types';
import { DIFFICULTY_LEVELS, SONG_CATEGORIES } from '../music/presetSongs';

interface SongCatalogProps {
  songs: SongProject[];
  activeSongId: string | null;
  onSelectSong: (song: SongProject) => void;
  onDeleteSong: (songId: string) => void;
}

type LevelFilter = 'Toate' | 'Începător' | 'Mediu' | 'Avansat' | 'Piesele mele';

function normalizeDifficulty(diff: string): 'Începător' | 'Mediu' | 'Avansat' | 'Custom' {
  const lower = diff.toLowerCase();
  if (lower.includes('încep') || lower.includes('incep')) return 'Începător';
  if (lower.includes('mediu') || lower.includes('intermediar')) return 'Mediu';
  if (lower.includes('avans')) return 'Avansat';
  return 'Custom';
}

export const SongCatalog: React.FC<SongCatalogProps> = ({
  songs,
  activeSongId,
  onSelectSong,
  onDeleteSong,
}) => {
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('Toate');
  const [categoryFilter, setCategoryFilter] = useState<string>('Toate stilurile');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const counts = useMemo(() => {
    const map: Record<LevelFilter, number> = {
      Toate: songs.length,
      Începător: 0,
      Mediu: 0,
      Avansat: 0,
      'Piesele mele': 0,
    };
    for (const s of songs) {
      const norm = normalizeDifficulty(s.difficulty);
      if (norm === 'Începător') map['Începător']++;
      else if (norm === 'Mediu') map['Mediu']++;
      else if (norm === 'Avansat') map['Avansat']++;
      if (!s.isPreset) map['Piesele mele']++;
    }
    return map;
  }, [songs]);

  const filteredSongs = useMemo(() => {
    return songs.filter((s) => {
      if (levelFilter === 'Piesele mele') {
        if (s.isPreset) return false;
      } else if (levelFilter !== 'Toate') {
        if (normalizeDifficulty(s.difficulty) !== levelFilter) return false;
      }

      if (categoryFilter !== 'Toate stilurile') {
        if ((s.category || 'Personalizat') !== categoryFilter) return false;
      }
      return true;
    });
  }, [songs, levelFilter, categoryFilter]);

  const handleSuggestRandom = () => {
    const pool = filteredSongs.length > 0 ? filteredSongs : songs;
    if (pool.length === 0) return;
    const candidates = pool.length > 1 ? pool.filter((s) => s.id !== activeSongId) : pool;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    if (picked) onSelectSong(picked);
  };

  const getBadgeClass = (diff: string) => {
    const norm = normalizeDifficulty(diff);
    if (norm === 'Începător') return 'level-beginner';
    if (norm === 'Mediu') return 'level-intermediate';
    if (norm === 'Avansat') return 'level-advanced';
    return 'level-custom';
  };

  return (
    <section className="catalog-panel" aria-label="Catalog și sugestii de piese">
      <div className="catalog-top-row">
        <div className="catalog-heading-group">
          <Compass size={16} className="catalog-icon" />
          <span className="catalog-title">Bibliotecă & Sugestii pe Niveluri</span>
        </div>

        <div className="catalog-actions">
          <button
            type="button"
            className="btn-suggest-song"
            onClick={handleSuggestRandom}
            title="Alege o piesă potrivită filtrului curent"
          >
            <Shuffle size={13} /> Sugerează o piesă
          </button>
          <button
            type="button"
            className="btn-collapse-catalog"
            onClick={() => setIsExpanded((v) => !v)}
          >
            {isExpanded ? (
              <>
                <ChevronUp size={14} /> Restrânge
              </>
            ) : (
              <>
                <ChevronDown size={14} /> Afișează ({filteredSongs.length})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Difficulty Level Tabs */}
      <div className="catalog-filters-bar">
        <div className="level-tabs" role="tablist" aria-label="Nivel dificultate">
          {(['Toate', ...DIFFICULTY_LEVELS, 'Piesele mele'] as LevelFilter[]).map((lvl) => (
            <button
              key={lvl}
              type="button"
              role="tab"
              aria-selected={levelFilter === lvl}
              className={`level-tab ${levelFilter === lvl ? 'is-active' : ''}`}
              onClick={() => setLevelFilter(lvl)}
            >
              <span>{lvl}</span>
              <span className="level-count">{counts[lvl]}</span>
            </button>
          ))}
        </div>

        {/* Genre / Category Pills */}
        <div className="category-pills" aria-label="Categorii muzicale">
          {['Toate stilurile', ...SONG_CATEGORIES].map((cat) => (
            <button
              key={cat}
              type="button"
              className={`category-pill ${categoryFilter === cat ? 'is-active' : ''}`}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Song Cards Grid */}
      {isExpanded && (
        <div className="catalog-grid">
          {filteredSongs.length === 0 ? (
            <div className="catalog-empty">
              Nicio piesă nu corespunde combinației selectate. Schimbă categoria sau apasă pe „Toate”.
            </div>
          ) : (
            filteredSongs.map((song) => {
              const isSelected = song.id === activeSongId;
              return (
                <div key={song.id} className={`song-card ${isSelected ? 'is-selected' : ''}`}>
                  <button
                    type="button"
                    className="song-card-body"
                    onClick={() => onSelectSong(song)}
                  >
                    <div className="song-card-badges">
                      <span className={`level-badge ${getBadgeClass(song.difficulty)}`}>
                        {normalizeDifficulty(song.difficulty) === 'Custom'
                          ? song.difficulty
                          : normalizeDifficulty(song.difficulty)}
                      </span>
                      {song.category && <span className="category-badge">{song.category}</span>}
                      {song.capo > 0 && <span className="capo-mini-badge">Capo {song.capo}</span>}
                    </div>

                    <div className="song-card-title">{song.title}</div>
                    <div className="song-card-artist">{song.artist}</div>

                    {song.techniqueFocus && (
                      <div className="song-card-focus">{song.techniqueFocus}</div>
                    )}

                    <div className="song-card-footer">
                      <span className="song-card-chords">
                        {song.uniqueChords.slice(0, 5).join(' · ')}
                        {song.uniqueChords.length > 5 ? ' …' : ''}
                      </span>
                      <span className="song-card-tempo">
                        {song.bpm} BPM · {song.timeSignature}
                      </span>
                    </div>
                  </button>

                  {!song.isPreset && (
                    <button
                      type="button"
                      className="song-card-delete"
                      title="Șterge piesa salvată"
                      onClick={() => onDeleteSong(song.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </section>
  );
};
