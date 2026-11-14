from __future__ import annotations

import math
import subprocess
from dataclasses import dataclass
from typing import Any

import numpy as np
from scipy.signal import stft

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Krumhansl-Schmuckler key profiles
MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

# Chord template definitions (intervals -> weight)
CHORD_QUALITIES: dict[str, dict[int, float]] = {
    "": {0: 1.0, 4: 0.88, 7: 0.85},          # Major
    "m": {0: 1.0, 3: 0.90, 7: 0.85},         # Minor
    "7": {0: 1.0, 4: 0.82, 7: 0.72, 10: 0.58},   # Dominant 7
    "m7": {0: 1.0, 3: 0.84, 7: 0.72, 10: 0.58},  # Minor 7
    "maj7": {0: 1.0, 4: 0.82, 7: 0.72, 11: 0.56}, # Major 7
    "sus4": {0: 1.0, 5: 0.86, 7: 0.82},      # Sus4
    "sus2": {0: 1.0, 2: 0.84, 7: 0.82},      # Sus2
}


@dataclass
class ChordTemplate:
    name: str
    root: str
    quality: str
    vector: np.ndarray
    complexity_penalty: float


def _build_chord_templates() -> list[ChordTemplate]:
    templates: list[ChordTemplate] = []
    for root_idx, root_name in enumerate(NOTE_NAMES):
        for quality, intervals in CHORD_QUALITIES.items():
            vec = np.zeros(12, dtype=np.float32)
            for interval, weight in intervals.items():
                vec[(root_idx + interval) % 12] = weight
            vec /= np.linalg.norm(vec) + 1e-8
            # Slight penalty for 4-note/sus chords unless evidence is strong
            penalty = 0.0 if quality in ("", "m") else 0.035
            templates.append(
                ChordTemplate(
                    name=f"{root_name}{quality}",
                    root=root_name,
                    quality=quality,
                    vector=vec,
                    complexity_penalty=penalty,
                )
            )
    return templates


CHORD_TEMPLATES = _build_chord_templates()


def decode_audio_with_ffmpeg(audio_bytes: bytes, sample_rate: int = 22050, max_seconds: int = 420) -> np.ndarray:
    """Decode arbitrary audio bytes to mono float32 PCM using ffmpeg."""
    cmd = [
        "ffmpeg",
        "-v",
        "error",
        "-i",
        "pipe:0",
        "-t",
        str(max_seconds),
        "-ac",
        "1",
        "-ar",
        str(sample_rate),
        "-f",
        "f32le",
        "pipe:1",
    ]
    proc = subprocess.run(cmd, input=audio_bytes, capture_output=True, check=False)
    if proc.returncode != 0 or not proc.stdout:
        stderr = proc.stderr.decode("utf-8", errors="ignore").strip()
        raise ValueError(f"Nu s-a putut decoda fișierul audio cu FFmpeg: {stderr or 'format nesuportat'}")
    samples = np.frombuffer(proc.stdout, dtype=np.float32).copy()
    if samples.size < sample_rate:
        raise ValueError("Fișierul audio este prea scurt (minim 1 secundă).")
    peak = float(np.max(np.abs(samples)))
    if peak > 1e-6:
        samples /= peak
    return samples


def _build_chroma_filterbank(sample_rate: int, n_fft: int, tuning_semitones: float = 0.0) -> np.ndarray:
    """Map FFT magnitude bins (80 Hz - 1600 Hz) to 12 pitch classes."""
    freqs = np.fft.rfftfreq(n_fft, d=1.0 / sample_rate)
    fb = np.zeros((12, len(freqs)), dtype=np.float32)

    valid = (freqs >= 75.0) & (freqs <= 1800.0)
    valid_idx = np.where(valid)[0]
    valid_freqs = freqs[valid_idx]

    # MIDI note number relative to A4=440
    midi = 69.0 + 12.0 * np.log2(valid_freqs / 440.0) - tuning_semitones
    pitch_class = np.mod(midi, 12.0)

    # Weight mid-guitar frequencies higher
    freq_weight = np.exp(-0.5 * ((np.log2(valid_freqs / 280.0)) / 1.45) ** 2)

    for pc in range(12):
        # Circular distance on 12-semitone ring
        dist = np.abs(pitch_class - pc)
        dist = np.minimum(dist, 12.0 - dist)
        weights = np.exp(-0.5 * (dist / 0.32) ** 2) * freq_weight
        fb[pc, valid_idx] = weights

    row_sums = fb.sum(axis=1, keepdims=True) + 1e-8
    fb /= row_sums
    return fb


def _estimate_tuning(mag_spec: np.ndarray, sample_rate: int, n_fft: int) -> float:
    """Estimate coarse tuning offset in [-0.4, +0.4] semitones."""
    mean_spec = mag_spec.mean(axis=1)
    best_offset = 0.0
    best_sharpness = -1.0
    for offset in (-0.35, -0.2, -0.1, 0.0, 0.1, 0.2, 0.35):
        fb = _build_chroma_filterbank(sample_rate, n_fft, tuning_semitones=offset)
        chroma = fb @ mean_spec
        chroma /= np.linalg.norm(chroma) + 1e-8
        # Peakiness / contrast score
        score = float(np.max(chroma) - np.median(chroma))
        if score > best_sharpness:
            best_sharpness = score
            best_offset = offset
    return best_offset


def _estimate_bpm_and_beats(
    mag_spec: np.ndarray,
    freqs: np.ndarray,
    frame_rate: float,
    duration: float,
) -> tuple[float, float, list[float], np.ndarray]:
    """Estimate BPM (60-180), beat phase, beat timestamps, and high-freq percussive onset curve."""
    # Broadband onset strength
    log_spec = np.log1p(12.0 * mag_spec)
    diff = np.maximum(0.0, np.diff(log_spec, axis=1, prepend=log_spec[:, :1]))
    onset_env = diff.mean(axis=0)
    # Remove slow trend
    win = max(5, int(frame_rate * 0.4))
    kernel = np.ones(win, dtype=np.float32) / win
    local_mean = np.convolve(onset_env, kernel, mode="same")
    onset_norm = np.maximum(0.0, onset_env - local_mean)
    if np.max(onset_norm) > 1e-6:
        onset_norm /= np.max(onset_norm)

    # High-band percussive curve for strumming inference (1.8 kHz - 8 kHz)
    hi_mask = (freqs >= 1800.0) & (freqs <= 8000.0)
    hi_onset = diff[hi_mask].mean(axis=0) if np.any(hi_mask) else onset_env
    if np.max(hi_onset) > 1e-6:
        hi_onset = hi_onset / np.max(hi_onset)

    # Autocorrelation over candidate BPMs (62 to 176 BPM)
    ac = np.correlate(onset_norm, onset_norm, mode="full")[len(onset_norm) - 1 :]
    best_bpm = 100.0
    best_score = -1.0

    for bpm in range(62, 177):
        period_frames = (60.0 / bpm) * frame_rate
        lag1 = int(round(period_frames))
        lag2 = int(round(period_frames * 2))
        lag_half = int(round(period_frames * 0.5))
        if lag2 >= len(ac):
            continue
        score = ac[lag1] + 0.55 * ac[lag2] + 0.25 * ac[lag_half]
        # Gentle prior favoring typical acoustic guitar tempos around 80-132 BPM
        prior = math.exp(-0.5 * ((bpm - 104.0) / 38.0) ** 2)
        weighted = float(score) * (0.78 + 0.22 * prior)
        if weighted > best_score:
            best_score = weighted
            best_bpm = float(bpm)

    # Refine beat phase alignment against onset peaks
    beat_sec = 60.0 / best_bpm
    best_phase = 0.0
    best_phase_energy = -1.0
    steps = 40
    for i in range(steps):
        phase = (i / steps) * beat_sec
        beat_times = np.arange(phase, duration, beat_sec)
        idx = np.clip(np.round(beat_times * frame_rate).astype(int), 0, len(onset_norm) - 1)
        energy = float(onset_norm[idx].mean()) if len(idx) > 0 else 0.0
        if energy > best_phase_energy:
            best_phase_energy = energy
            best_phase = float(phase)

    # Start beats near 0 while keeping phase locked
    first_beat = best_phase
    while first_beat - beat_sec >= 0.0:
        first_beat -= beat_sec

    beats = list(np.arange(first_beat, duration, beat_sec).astype(float))
    if not beats:
        beats = [0.0]

    return round(best_bpm), round(first_beat, 3), beats, hi_onset


def _detect_chords_viterbi(
    chroma: np.ndarray,
    frame_times: np.ndarray,
    beats: list[float],
    beat_sec: float,
) -> list[dict[str, Any]]:
    """Run beat-synchronous chord matching with Viterbi smoothing."""
    if len(beats) < 2:
        beats = [0.0, max(1.0, float(frame_times[-1]))]

    # Average chroma per beat interval
    beat_chromas: list[np.ndarray] = []
    beat_starts: list[float] = []
    beat_durs: list[float] = []

    total_dur = float(frame_times[-1]) if len(frame_times) else beats[-1] + beat_sec
    for i, b_start in enumerate(beats):
        b_end = beats[i + 1] if i + 1 < len(beats) else min(total_dur, b_start + beat_sec)
        mask = (frame_times >= b_start) & (frame_times < b_end)
        if not np.any(mask):
            idx = int(np.argmin(np.abs(frame_times - b_start)))
            vec = chroma[:, idx]
        else:
            vec = chroma[:, mask].mean(axis=1)
        norm = np.linalg.norm(vec)
        if norm > 1e-6:
            vec = vec / norm
        beat_chromas.append(vec)
        beat_starts.append(float(b_start))
        beat_durs.append(max(0.15, float(b_end - b_start)))

    n_beats = len(beat_chromas)
    n_chords = len(CHORD_TEMPLATES)
    template_mat = np.stack([t.vector for t in CHORD_TEMPLATES], axis=0)  # (C, 12)
    penalties = np.array([t.complexity_penalty for t in CHORD_TEMPLATES], dtype=np.float32)

    beat_mat = np.stack(beat_chromas, axis=0)  # (T, 12)
    # Cosine similarity minus complexity penalty
    emissions = beat_mat @ template_mat.T - penalties[None, :]  # (T, C)

    # Viterbi decoding: encourage chords to stay stable over 2-4 beats
    stay_bonus = 0.22
    dp = np.zeros((n_beats, n_chords), dtype=np.float32)
    back = np.zeros((n_beats, n_chords), dtype=np.int32)
    dp[0] = emissions[0]

    for t in range(1, n_beats):
        prev = dp[t - 1]
        best_prev_idx = int(np.argmax(prev))
        best_prev_val = prev[best_prev_idx]
        for c in range(n_chords):
            switch_val = best_prev_val
            stay_val = prev[c] + stay_bonus
            if stay_val >= switch_val:
                dp[t, c] = stay_val + emissions[t, c]
                back[t, c] = c
            else:
                dp[t, c] = switch_val + emissions[t, c]
                back[t, c] = best_prev_idx

    path = np.zeros(n_beats, dtype=np.int32)
    path[-1] = int(np.argmax(dp[-1]))
    for t in range(n_beats - 2, -1, -1):
        path[t] = back[t + 1, path[t + 1]]

    # Collapse consecutive identical chords into clean events
    events: list[dict[str, Any]] = []
    for i, chord_idx in enumerate(path):
        tpl = CHORD_TEMPLATES[int(chord_idx)]
        raw_conf = float(np.clip(emissions[i, int(chord_idx)] + tpl.complexity_penalty, 0.0, 1.0))
        if events and events[-1]["chord"] == tpl.name and events[-1]["beats"] < 8:
            events[-1]["duration"] = round(events[-1]["duration"] + beat_durs[i], 3)
            events[-1]["beats"] += 1
            events[-1]["confidence"] = round((events[-1]["confidence"] + raw_conf) * 0.5, 2)
        else:
            events.append(
                {
                    "time": round(beat_starts[i], 3),
                    "duration": round(beat_durs[i], 3),
                    "beatIndex": i,
                    "beats": 1,
                    "chord": tpl.name,
                    "root": tpl.root,
                    "quality": tpl.quality,
                    "confidence": round(raw_conf, 2),
                }
            )
    return events


def _estimate_key(chroma: np.ndarray) -> str:
    global_chroma = chroma.mean(axis=1)
    if np.linalg.norm(global_chroma) < 1e-6:
        return "C major"
    best_key = "C major"
    best_corr = -10.0
    for i, root in enumerate(NOTE_NAMES):
        maj_rot = np.roll(MAJOR_PROFILE, i)
        min_rot = np.roll(MINOR_PROFILE, i)
        c_maj = float(np.corrcoef(global_chroma, maj_rot)[0, 1])
        c_min = float(np.corrcoef(global_chroma, min_rot)[0, 1])
        if c_maj > best_corr:
            best_corr = c_maj
            best_key = f"{root} major"
        if c_min > best_corr:
            best_corr = c_min
            best_key = f"{root} minor"
    return best_key


def _infer_strumming_pattern(
    hi_onset: np.ndarray,
    frame_rate: float,
    beats: list[float],
    beats_per_bar: int,
) -> list[str]:
    """Infer an 8th-note strumming pattern (D, U, -) from high-frequency percussive accents."""
    subdivisions = beats_per_bar * 2  # 8 slots for 4/4, 6 slots for 3/4
    if len(beats) < beats_per_bar * 2:
        return ["D", "-", "D", "U", "-", "U", "D", "U"] if beats_per_bar == 4 else ["D", "-", "D", "U", "D", "U"]

    slot_energies = np.zeros(subdivisions, dtype=np.float32)
    counts = np.zeros(subdivisions, dtype=np.float32)

    for b_idx in range(len(beats) - 1):
        bar_slot_base = (b_idx % beats_per_bar) * 2
        b0 = beats[b_idx]
        b1 = beats[b_idx + 1]
        mid = (b0 + b1) * 0.5
        for sub, t in enumerate((b0, mid)):
            f_idx = int(round(t * frame_rate))
            lo = max(0, f_idx - 2)
            hi = min(len(hi_onset), f_idx + 3)
            if lo < hi:
                slot_energies[bar_slot_base + sub] += float(np.max(hi_onset[lo:hi]))
                counts[bar_slot_base + sub] += 1.0

    avg = slot_energies / np.maximum(counts, 1.0)
    threshold = float(np.mean(avg) * 0.72)
    pattern: list[str] = []
    for i, val in enumerate(avg):
        if i == 0:
            pattern.append("D")
        elif val >= threshold:
            pattern.append("D" if i % 2 == 0 else "U")
        else:
            pattern.append("-")

    # Guarantee musical playable groove if mostly empty
    if sum(1 for p in pattern if p != "-") < 3:
        return ["D", "-", "D", "U", "-", "U", "D", "U"] if beats_per_bar == 4 else ["D", "-", "D", "U", "D", "U"]
    return pattern


def _extract_waveform_peaks(samples: np.ndarray, num_bins: int = 180) -> list[float]:
    chunk_size = max(1, len(samples) // num_bins)
    peaks: list[float] = []
    for i in range(num_bins):
        start = i * chunk_size
        end = min(len(samples), start + chunk_size)
        if start >= end:
            break
        peaks.append(round(float(np.max(np.abs(samples[start:end]))), 3))
    return peaks


def analyze_audio_bytes(audio_bytes: bytes, title: str = "Piesă analizată") -> dict[str, Any]:
    sample_rate = 22050
    samples = decode_audio_with_ffmpeg(audio_bytes, sample_rate=sample_rate)
    duration = float(len(samples)) / sample_rate

    n_fft = 4096
    hop_length = 512
    noverlap = n_fft - hop_length
    freqs, frame_times, zxx = stft(
        samples,
        fs=sample_rate,
        nperseg=n_fft,
        noverlap=noverlap,
        boundary=None,
    )
    mag_spec = np.abs(zxx)
    frame_rate = sample_rate / hop_length

    tuning = _estimate_tuning(mag_spec, sample_rate, n_fft)
    fb = _build_chroma_filterbank(sample_rate, n_fft, tuning_semitones=tuning)
    chroma = fb @ mag_spec

    bpm, first_beat, beats, hi_onset = _estimate_bpm_and_beats(mag_spec, freqs, frame_rate, duration)
    beat_sec = 60.0 / bpm
    beats_per_bar = 4
    time_signature = "4/4"

    chord_events = _detect_chords_viterbi(chroma, frame_times, beats, beat_sec)
    key = _estimate_key(chroma)
    strumming = _infer_strumming_pattern(hi_onset, frame_rate, beats, beats_per_bar)
    waveform = _extract_waveform_peaks(samples)

    # Group chords into logical 4-bar / 8-bar sections
    sections: list[dict[str, Any]] = []
    if chord_events:
        chunk_size = 8
        section_names = ["Intro", "Strofa 1", "Refren 1", "Strofa 2", "Refren 2", "Bridge", "Outro"]
        for idx in range(0, len(chord_events), chunk_size):
            part = chord_events[idx : idx + chunk_size]
            label = section_names[min(len(sections), len(section_names) - 1)]
            sections.append(
                {
                    "name": label,
                    "startTime": part[0]["time"],
                    "endTime": round(part[-1]["time"] + part[-1]["duration"], 3),
                }
            )

    unique_chords: list[str] = []
    for ev in chord_events:
        if ev["chord"] not in unique_chords:
            unique_chords.append(ev["chord"])

    return {
        "title": title,
        "duration": round(duration, 2),
        "bpm": int(bpm),
        "beatOffset": first_beat,
        "timeSignature": time_signature,
        "key": key,
        "tuningOffsetSemitones": tuning,
        "strummingPattern": strumming,
        "uniqueChords": unique_chords,
        "chords": chord_events,
        "sections": sections,
        "waveform": waveform,
        "sourceType": "analyzed_audio",
    }
