from __future__ import annotations

import json
import re
import urllib.parse
import urllib.request
import uuid
from typing import Any

import anyio
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from audio_analyzer import analyze_audio_bytes
from song_store import (
    delete_custom_song,
    get_song_by_id,
    list_all_songs,
    parse_chordpro_or_progression,
    upsert_song,
)

app = FastAPI(title="StrumForge Guitar Coach API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def extract_youtube_id(url_or_id: str) -> str | None:
    raw = url_or_id.strip()
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", raw):
        return raw
    patterns = [
        r"(?:v=|\/v\/|\/embed\/|\/shorts\/|\/live\/|youtu\.be\/)([A-Za-z0-9_-]{11})",
    ]
    for pat in patterns:
        m = re.search(pat, raw)
        if m:
            return m.group(1)
    return None


class ChordProRequest(BaseModel):
    text: str
    bpm: int = 96
    timeSignature: str = "4/4"
    title: str = "Piesă personalizată"
    youtubeUrl: str | None = None


def _fetch_oembed_sync(canonical_url: str) -> dict[str, Any]:
    oembed_url = f"https://www.youtube.com/oembed?url={urllib.parse.quote(canonical_url, safe='')}&format=json"
    req = urllib.request.Request(oembed_url, headers={"User-Agent": "StrumForge/1.0"})
    with urllib.request.urlopen(req, timeout=5) as resp:
        return json.loads(resp.read().decode("utf-8"))


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "strumforge-backend"}


@app.get("/api/youtube/metadata")
async def youtube_metadata(url: str) -> dict[str, Any]:
    video_id = extract_youtube_id(url)
    if not video_id:
        raise HTTPException(status_code=400, detail="Link YouTube invalid. Introdu un URL youtube.com sau youtu.be valid.")

    canonical_url = f"https://www.youtube.com/watch?v={video_id}"
    thumbnail = f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg"
    title = f"Videoclip YouTube ({video_id})"
    author = "YouTube"

    try:
        data = await anyio.to_thread.run_sync(_fetch_oembed_sync, canonical_url)
        title = data.get("title") or title
        author = data.get("author_name") or author
        thumbnail = data.get("thumbnail_url") or thumbnail
    except Exception:
        pass

    return {
        "youtubeId": video_id,
        "youtubeUrl": canonical_url,
        "title": title,
        "artist": author,
        "thumbnail": thumbnail,
    }


@app.post("/api/analyze-audio")
async def analyze_audio_endpoint(
    file: UploadFile = File(...),
    title: str | None = Form(None),
    youtube_url: str | None = Form(None),
) -> dict[str, Any]:
    raw_bytes = await file.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Fișierul încărcat este gol.")
    if len(raw_bytes) > 60 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Fișierul depășește limita de 60 MB.")

    clean_title = (title or "").strip() or (file.filename.rsplit(".", 1)[0] if file.filename else "Piesă analizată")
    yt_id = extract_youtube_id(youtube_url) if youtube_url else None

    try:
        analysis = analyze_audio_bytes(raw_bytes, title=clean_title)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Eroare la analiza audio: {exc}") from exc

    analysis["id"] = f"analyzed-{uuid.uuid4().hex[:8]}"
    analysis["artist"] = "Analiză Audio AI (Local)"
    analysis["youtubeId"] = yt_id or ""
    analysis["youtubeUrl"] = f"https://www.youtube.com/watch?v={yt_id}" if yt_id else ""
    analysis["capo"] = 0
    analysis["difficulty"] = "Detectat automat"
    analysis["strummingHint"] = (
        f"Ritm estimat automat din atacurile percusive ({analysis['bpm']} BPM, {analysis['timeSignature']}). "
        "Folosește slider-ul de sincronizare dacă videoclipul YouTube are o introducere vorbită."
    )
    analysis["isPreset"] = False
    return analysis


@app.post("/api/parse-chordpro")
def parse_chordpro_endpoint(req: ChordProRequest) -> dict[str, Any]:
    yt_id = extract_youtube_id(req.youtubeUrl) if req.youtubeUrl else None
    yt_url = f"https://www.youtube.com/watch?v={yt_id}" if yt_id else ""
    return parse_chordpro_or_progression(
        text=req.text,
        bpm=req.bpm,
        time_signature=req.timeSignature,
        title=req.title,
        youtube_id=yt_id,
        youtube_url=yt_url,
    )


@app.get("/api/songs")
def get_songs() -> dict[str, Any]:
    return {"songs": list_all_songs()}


@app.get("/api/songs/{song_id}")
def get_song(song_id: str) -> dict[str, Any]:
    song = get_song_by_id(song_id)
    if not song:
        raise HTTPException(status_code=404, detail="Piesa nu a fost găsită.")
    return song


@app.post("/api/songs")
def save_song(song: dict[str, Any]) -> dict[str, Any]:
    saved = upsert_song(song)
    return saved


@app.delete("/api/songs/{song_id}")
def remove_song(song_id: str) -> dict[str, bool]:
    deleted = delete_custom_song(song_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Piesa personalizată nu a fost găsită (preset-urile nu pot fi șterse).")
    return {"deleted": True}
