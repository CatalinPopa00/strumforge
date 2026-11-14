from __future__ import annotations

import json
import re
import uuid
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).parent / "data"
SONGS_FILE = DATA_DIR / "songs.json"


def _build_timeline_from_bars(
    bars: list[tuple[str, int, str]],
    bpm: int,
    beat_offset: float = 0.0,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], float]:
    """Build synchronized chord events and sections from (chord, beats, section_name) tuples."""
    beat_sec = 60.0 / bpm
    chords: list[dict[str, Any]] = []
    sections: list[dict[str, Any]] = []
    t = beat_offset
    beat_idx = 0

    for chord_name, n_beats, section_name in bars:
        dur = round(n_beats * beat_sec, 3)
        root = chord_name[0]
        if len(chord_name) > 1 and chord_name[1] in ("#", "b"):
            root = chord_name[:2]
        quality = chord_name[len(root) :]
        chords.append(
            {
                "time": round(t, 3),
                "duration": dur,
                "beatIndex": beat_idx,
                "beats": n_beats,
                "chord": chord_name,
                "root": root,
                "quality": quality,
                "confidence": 1.0,
                "section": section_name,
            }
        )
        if not sections or sections[-1]["name"] != section_name:
            sections.append(
                {
                    "name": section_name,
                    "startTime": round(t, 3),
                    "endTime": round(t + dur, 3),
                }
            )
        else:
            sections[-1]["endTime"] = round(t + dur, 3)
        t += dur
        beat_idx += n_beats

    return chords, sections, round(t, 2)


def _make_preset_songs() -> list[dict[str, Any]]:
    # 1. Knockin' on Heaven's Door (68 BPM, 4/4)
    knockin_bars = [
        ("G", 2, "Intro"), ("D", 2, "Intro"), ("Am7", 4, "Intro"),
        ("G", 2, "Intro"), ("D", 2, "Intro"), ("C", 4, "Intro"),
        ("G", 2, "Strofa 1"), ("D", 2, "Strofa 1"), ("Am7", 4, "Strofa 1"),
        ("G", 2, "Strofa 1"), ("D", 2, "Strofa 1"), ("C", 4, "Strofa 1"),
        ("G", 2, "Refren"), ("D", 2, "Refren"), ("C", 4, "Refren"),
        ("G", 2, "Refren"), ("D", 2, "Refren"), ("C", 4, "Refren"),
    ]
    k_chords, k_secs, k_dur = _build_timeline_from_bars(knockin_bars, 68, 0.4)

    # 2. Stand By Me (118 BPM, 4/4)
    stand_bars = [
        ("A", 4, "Intro"), ("A", 4, "Intro"), ("F#m", 4, "Intro"), ("F#m", 4, "Intro"),
        ("D", 4, "Intro"), ("E", 4, "Intro"), ("A", 4, "Intro"), ("A", 4, "Intro"),
        ("A", 4, "Strofa 1"), ("A", 4, "Strofa 1"), ("F#m", 4, "Strofa 1"), ("F#m", 4, "Strofa 1"),
        ("D", 4, "Strofa 1"), ("E", 4, "Strofa 1"), ("A", 4, "Strofa 1"), ("A", 4, "Strofa 1"),
        ("A", 4, "Refren"), ("A", 4, "Refren"), ("F#m", 4, "Refren"), ("F#m", 4, "Refren"),
        ("D", 4, "Refren"), ("E", 4, "Refren"), ("A", 4, "Refren"), ("A", 4, "Refren"),
    ]
    s_chords, s_secs, s_dur = _build_timeline_from_bars(stand_bars, 118, 0.25)

    # 3. House of the Rising Sun (78 BPM, 6/8 feel represented as 6 beats/bar)
    rising_bars = [
        ("Am", 6, "Intro"), ("C", 6, "Intro"), ("D", 6, "Intro"), ("F", 6, "Intro"),
        ("Am", 6, "Intro"), ("E7", 6, "Intro"), ("Am", 6, "Intro"), ("E7", 6, "Intro"),
        ("Am", 6, "Strofa 1"), ("C", 6, "Strofa 1"), ("D", 6, "Strofa 1"), ("F", 6, "Strofa 1"),
        ("Am", 6, "Strofa 1"), ("C", 6, "Strofa 1"), ("E7", 6, "Strofa 1"), ("E7", 6, "Strofa 1"),
        ("Am", 6, "Strofa 2"), ("C", 6, "Strofa 2"), ("D", 6, "Strofa 2"), ("F", 6, "Strofa 2"),
        ("Am", 6, "Strofa 2"), ("E7", 6, "Strofa 2"), ("Am", 6, "Strofa 2"), ("E7", 6, "Strofa 2"),
    ]
    r_chords, r_secs, r_dur = _build_timeline_from_bars(rising_bars, 116, 0.3)

    # 4. Riptide (102 BPM, 4/4)
    riptide_bars = [
        ("Am", 2, "Intro"), ("G", 2, "Intro"), ("C", 4, "Intro"),
        ("Am", 2, "Intro"), ("G", 2, "Intro"), ("C", 4, "Intro"),
        ("Am", 2, "Strofa 1"), ("G", 2, "Strofa 1"), ("C", 4, "Strofa 1"),
        ("Am", 2, "Strofa 1"), ("G", 2, "Strofa 1"), ("C", 4, "Strofa 1"),
        ("Am", 2, "Refren"), ("G", 2, "Refren"), ("C", 4, "Refren"),
        ("Am", 2, "Refren"), ("G", 2, "Refren"), ("C", 4, "Refren"),
        ("Fmaj7", 4, "Refren"), ("G", 4, "Refren"), ("C", 4, "Refren"), ("C", 4, "Refren"),
    ]
    rp_chords, rp_secs, rp_dur = _build_timeline_from_bars(riptide_bars, 102, 0.2)

    return [
        {
            "id": "preset-knockin",
            "title": "Knockin' on Heaven's Door",
            "artist": "Bob Dylan — Acoustic Lesson",
            "youtubeId": "rm9coqlk8fY",
            "youtubeUrl": "https://www.youtube.com/watch?v=rm9coqlk8fY",
            "bpm": 68,
            "beatOffset": 0.4,
            "timeSignature": "4/4",
            "key": "G major",
            "capo": 0,
            "difficulty": "Începător",
            "duration": k_dur,
            "strummingPattern": ["D", "-", "D", "U", "-", "U", "D", "U"],
            "strummingHint": "Jos · · Jos Sus · Sus Jos Sus — lasă ultimele două lovituri lejere pe tranziție.",
            "uniqueChords": ["G", "D", "Am7", "C"],
            "chords": k_chords,
            "sections": k_secs,
            "chordPro": "[Intro]\n[G] [D] [Am7]\n[G] [D] [C]\n\n[Strofa 1]\n[G]Mama take this [D]badge off of [Am7]me\n[G]I can't [D]use it any[C]more",
            "isPreset": True,
            "sourceType": "preset",
        },
        {
            "id": "preset-stand-by-me",
            "title": "Stand By Me",
            "artist": "Ben E. King — Guitar Rhythm",
            "youtubeId": "hwZNL7QVJjE",
            "youtubeUrl": "https://www.youtube.com/watch?v=hwZNL7QVJjE",
            "bpm": 118,
            "beatOffset": 0.25,
            "timeSignature": "4/4",
            "key": "A major",
            "capo": 2,
            "difficulty": "Începător",
            "duration": s_dur,
            "strummingPattern": ["D", "-", "D", "U", "x", "U", "D", "U"],
            "strummingHint": "Capo 2 (cânți cu forme de G, Em, C, D) sau bareuri pe A, F#m, D, E. Accent pe timpul 2 și 4 (palm mute).",
            "uniqueChords": ["A", "F#m", "D", "E"],
            "chords": s_chords,
            "sections": s_secs,
            "chordPro": "[Intro]\n[A] [F#m] [D] [E] [A]\n\n[Strofa 1]\nWhen the [A]night has come and the [F#m]land is dark\nAnd the [D]moon is the [E]only light we'll [A]see",
            "isPreset": True,
            "sourceType": "preset",
        },
        {
            "id": "preset-rising-sun",
            "title": "House of the Rising Sun",
            "artist": "The Animals — 6/8 Arpeggio & Strum",
            "youtubeId": "4-43lLKaqBQ",
            "youtubeUrl": "https://www.youtube.com/watch?v=4-43lLKaqBQ",
            "bpm": 116,
            "beatOffset": 0.3,
            "timeSignature": "6/8",
            "key": "A minor",
            "capo": 0,
            "difficulty": "Intermediar",
            "duration": r_dur,
            "strummingPattern": ["D", "D", "D", "U", "D", "U"],
            "strummingHint": "Măsură ternară 6/8: accentuează timpul 1 și timpul 4 (1-2-3, 4-5-6).",
            "uniqueChords": ["Am", "C", "D", "F", "E7"],
            "chords": r_chords,
            "sections": r_secs,
            "chordPro": "[Strofa 1]\nThere [Am]is a [C]house in [D]New Or[F]leans\nThey [Am]call the [C]Rising [E7]Sun",
            "isPreset": True,
            "sourceType": "preset",
        },
        {
            "id": "preset-riptide",
            "title": "Riptide",
            "artist": "Vance Joy — Campfire Groove",
            "youtubeId": "uJ_1HMAGb4k",
            "youtubeUrl": "https://www.youtube.com/watch?v=uJ_1HMAGb4k",
            "bpm": 102,
            "beatOffset": 0.2,
            "timeSignature": "4/4",
            "key": "C major",
            "capo": 1,
            "difficulty": "Începător",
            "duration": rp_dur,
            "strummingPattern": ["D", "-", "D", "-", "D", "U", "D", "U"],
            "strummingHint": "Ritm rapid, constant: Jos - Jos - Jos Sus Jos Sus. Folosește Capo 1 pentru tonalitatea originală (Am7-G-C).",
            "uniqueChords": ["Am", "G", "C", "Fmaj7"],
            "chords": rp_chords,
            "sections": rp_secs,
            "chordPro": "[Strofa 1]\n[Am]I was scared of [G]dentists and the [C]dark\n[Am]I was scared of [G]pretty girls and [C]starting conversations",
            "isPreset": True,
            "sourceType": "preset",
        },
    ]


def parse_chordpro_or_progression(
    text: str,
    bpm: int = 96,
    time_signature: str = "4/4",
    title: str = "Piesă personalizată",
    youtube_id: str | None = None,
    youtube_url: str | None = None,
) -> dict[str, Any]:
    """Parse ChordPro brackets `[Am]` or space/pipe separated chords `Am G C F` into a timed song timeline."""
    beats_per_bar = 6 if time_signature == "6/8" else (3 if time_signature == "3/4" else 4)
    beat_sec = 60.0 / max(40, min(220, bpm))

    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    current_section = "Strofa 1"
    parsed_items: list[tuple[str, int, str]] = []

    chord_regex = re.compile(r"\[([A-G][#b]?(?:maj7|m7|m|7|sus4|sus2|add9|dim|aug)?(?:/[A-G][#b]?)?)\]")
    plain_chord_regex = re.compile(r"^([A-G][#b]?(?:maj7|m7|m|7|sus4|sus2|add9|dim|aug)?)$")

    for line in lines:
        # Section header like [Intro] or # Chorus
        sec_match = re.match(r"^\[([A-Za-z0-9ăîâșțĂÎÂȘȚ \-]+)\]$", line)
        if sec_match and not plain_chord_regex.match(sec_match.group(1)):
            current_section = sec_match.group(1).strip()
            continue

        bracket_chords = chord_regex.findall(line)
        if bracket_chords:
            beats_each = max(1, beats_per_bar // min(len(bracket_chords), beats_per_bar))
            if len(bracket_chords) == 1:
                beats_each = beats_per_bar
            elif len(bracket_chords) == 2:
                beats_each = beats_per_bar // 2 if beats_per_bar >= 4 else 2
            for ch in bracket_chords:
                parsed_items.append((ch, beats_each, current_section))
        else:
            # Try plain chord tokens separated by spaces or |
            tokens = [t.strip() for t in re.split(r"[\s|]+", line) if t.strip()]
            plain_chords = [t for t in tokens if plain_chord_regex.match(t)]
            if plain_chords:
                for ch in plain_chords:
                    parsed_items.append((ch, beats_per_bar, current_section))

    if not parsed_items:
        parsed_items = [("G", beats_per_bar, "Strofa 1"), ("D", beats_per_bar, "Strofa 1"), ("Em", beats_per_bar, "Strofa 1"), ("C", beats_per_bar, "Strofa 1")]

    chords, sections, duration = _build_timeline_from_bars(parsed_items, bpm, beat_offset=0.0)
    unique_chords: list[str] = []
    for c in chords:
        if c["chord"] not in unique_chords:
            unique_chords.append(c["chord"])

    default_strum = (
        ["D", "D", "D", "U", "D", "U"]
        if time_signature == "6/8"
        else (["D", "-", "D", "U", "D", "U"] if time_signature == "3/4" else ["D", "-", "D", "U", "-", "U", "D", "U"])
    )

    return {
        "id": f"song-{uuid.uuid4().hex[:8]}",
        "title": title,
        "artist": "Creat în studio",
        "youtubeId": youtube_id or "",
        "youtubeUrl": youtube_url or "",
        "bpm": bpm,
        "beatOffset": 0.0,
        "timeSignature": time_signature,
        "key": f"{unique_chords[0]}",
        "capo": 0,
        "difficulty": "Personalizat",
        "duration": duration,
        "strummingPattern": default_strum,
        "strummingHint": "Poți da click pe orice acord sau timp pentru a personaliza progresia și ritmul.",
        "uniqueChords": unique_chords,
        "chords": chords,
        "sections": sections,
        "chordPro": text,
        "isPreset": False,
        "sourceType": "chordpro",
    }


def _load_custom_songs() -> list[dict[str, Any]]:
    if not SONGS_FILE.exists():
        return []
    try:
        data = json.loads(SONGS_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except Exception:
        return []


def _save_custom_songs(songs: list[dict[str, Any]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    SONGS_FILE.write_text(json.dumps(songs, indent=2, ensure_ascii=False), encoding="utf-8")


def list_all_songs() -> list[dict[str, Any]]:
    presets = _make_preset_songs()
    custom = _load_custom_songs()
    return custom + presets


def get_song_by_id(song_id: str) -> dict[str, Any] | None:
    for song in list_all_songs():
        if song.get("id") == song_id:
            return song
    return None


def upsert_song(song: dict[str, Any]) -> dict[str, Any]:
    if not song.get("id") or str(song.get("id")).startswith("preset-"):
        song["id"] = f"song-{uuid.uuid4().hex[:8]}"
    song["isPreset"] = False

    custom = _load_custom_songs()
    updated = False
    for i, existing in enumerate(custom):
        if existing.get("id") == song["id"]:
            custom[i] = song
            updated = True
            break
    if not updated:
        custom.insert(0, song)

    _save_custom_songs(custom)
    return song


def delete_custom_song(song_id: str) -> bool:
    custom = _load_custom_songs()
    filtered = [s for s in custom if s.get("id") != song_id]
    if len(filtered) == len(custom):
        return False
    _save_custom_songs(filtered)
    return True
