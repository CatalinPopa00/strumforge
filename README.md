# StrumForge — Studio Interactiv de Chitară (YouTube + Analiză Audio AI)

Aplicație Full-Stack (React/Vite + Python/FastAPI) unde introduci un link de YouTube sau un fișier audio local și exersezi la chitară cu acorduri sincronizate, diagrame pe grif, pattern-uri de strumming, metronom și sintetizator ghid.

## Structura proiectului

- `backend/` — Server FastAPI cu:
  - `audio_analyzer.py`: Decodare audio universală cu `ffmpeg` + analiză DSP (`numpy` / `scipy`) pentru detecție BPM, grilă de timpi, cromagramă cu Viterbi smoothing pentru acorduri, tonalitate și pattern de strumming.
  - `song_store.py`: Piese demo pre-procesate, parser ChordPro/progresii și persistență în `backend/data/songs.json`.
  - `main.py`: Endpoint-uri REST (`/api/youtube/metadata`, `/api/analyze-audio`, `/api/parse-chordpro`, `/api/songs`).
- `frontend/` — Aplicație React + TypeScript + Vite cu:
  - Player YouTube IFrame API sincronizat + player audio local cu waveform + mod autonom Ghid Synth.
  - Diagrame SVG interactive de acorduri + generator automat de bareuri + transpunere / Capo.
  - Grif interactiv pe 12 taste (cu click pentru a asculta fiecare notă și vizualizarea intervalelor R/3/5/7).
  - Strumming Strip animat (Jos/Sus/Mute/Pauză), Tap Tempo, Metronom Web Audio și Chitară acustică sintetizată.
  - Editor inline de acorduri, import ChordPro și Loop A–B.

## Pornire rapidă

### 1. Backend (FastAPI)

```bash
cd backend
.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

### 2. Frontend (Vite)

```bash
cd frontend
npm run dev
```

Deschide `http://localhost:5173` în browser.
