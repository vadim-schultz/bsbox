"""
Demo script for muda-meter engagement simulation.

Creates 5-10 participants with varied engagement patterns across multiple
minute buckets to demonstrate the real-time chart visualization.

Usage:
    python -m scripts.demo

Runs continuously until interrupted, with the constants in this file controlling
participant count, duration, delay, and fixed IDs.
"""

import os
import random
import sys
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import Enum
from typing import Any, Literal, cast
from uuid import uuid4

import httpx

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
CLIENT_TIMEOUT = float(os.getenv("CLIENT_TIMEOUT", "10.0"))

# Simulation settings (no CLI flags; adjust constants here if needed)
PARTICIPANT_COUNT = 10
MEETING_DURATION_MINUTES = 3
TICK_INTERVAL_SECONDS = 5.0
CONTINUOUS = True
DELAY_BETWEEN_MEETINGS_SECONDS = 5
USE_FIXED_IDS = True

StatusType = Literal["speaking", "engaged", "disengaged"]

FIXED_FINGERPRINTS = [f"fp-fixed-{i:03d}" for i in range(1, 33)]


class Profile(Enum):
    """Participant engagement profiles."""

    ACTIVE = "active"  # Frequently engaged, sometimes speaks
    PASSIVE = "passive"  # Occasionally engaged, rarely speaks
    DISTRACTED = "distracted"  # Often disengaged, sporadic engagement


# Status probabilities by profile: (speaking, engaged, disengaged)
PROFILE_WEIGHTS: dict[Profile, tuple[float, float, float]] = {
    Profile.ACTIVE: (0.15, 0.70, 0.15),
    Profile.PASSIVE: (0.05, 0.50, 0.45),
    Profile.DISTRACTED: (0.02, 0.25, 0.73),
}


@dataclass
class Participant:
    """Participant with ID and engagement profile."""

    id: str
    fingerprint: str
    profile: Profile
    current_status: StatusType = "disengaged"


def make_fingerprint(index: int, use_fixed_ids: bool) -> str:
    """
    Build a deterministic fingerprint when requested to keep participant IDs stable.

    Index is zero-based to allow reuse across primary and additional participants.
    """
    if use_fixed_ids and index < len(FIXED_FINGERPRINTS):
        return FIXED_FINGERPRINTS[index]
    return f"fp-{uuid4().hex[:16]}"


def log(section: str, message: str) -> None:
    """Log a message with timestamp and section."""
    ts = datetime.now(tz=UTC).strftime("%H:%M:%S")
    print(f"[{ts}] {section:<12} | {message}")


class ApiClient:
    """Thin wrapper around httpx for logging and endpoint helpers."""

    def __init__(self, client: httpx.Client) -> None:
        self.client = client

    def _post(self, path: str, json: dict | None = None) -> httpx.Response:
        resp = self.client.post(path, json=json)
        if resp.status_code >= 300:
            log("ERROR", f"POST {path} -> {resp.status_code}: {resp.text}")
            resp.raise_for_status()
        return resp

    def _get(self, path: str) -> httpx.Response:
        resp = self.client.get(path)
        if resp.status_code >= 300:
            log("ERROR", f"GET {path} -> {resp.status_code}: {resp.text}")
            resp.raise_for_status()
        return resp

    def create_visit(self, fingerprint: str) -> dict[str, Any]:
        return cast(
            dict[str, Any], self._post("/visit", {"device_fingerprint": fingerprint}).json()
        )

    def send_status(self, meeting_id: str, participant_id: str, status: StatusType) -> None:
        self._post(
            "/users/status",
            {
                "meeting_id": meeting_id,
                "participant_id": participant_id,
                "status": status,
            },
        )

    def fetch_engagement(self, meeting_id: str) -> dict[str, Any]:
        return cast(dict[str, Any], self._get(f"/meetings/{meeting_id}/engagement").json())


def get_current_bucket() -> str:
    """Get the current minute bucket as HH:MM string."""
    return datetime.now(tz=UTC).strftime("%H:%M")


def choose_status(profile: Profile) -> StatusType:
    """Choose a status based on profile weights."""
    weights = PROFILE_WEIGHTS[profile]
    return cast(
        StatusType,
        random.choices(
            ["speaking", "engaged", "disengaged"],
            weights=weights,
            k=1,
        )[0],
    )


def assign_profiles(count: int) -> list[Profile]:
    """
    Assign profiles to participants to create varied engagement.

    Distribution: ~30% active, ~40% passive, ~30% distracted
    """
    profiles = []
    active_count = max(1, int(count * 0.3))
    distracted_count = max(1, int(count * 0.3))
    passive_count = count - active_count - distracted_count

    profiles.extend([Profile.ACTIVE] * active_count)
    profiles.extend([Profile.PASSIVE] * passive_count)
    profiles.extend([Profile.DISTRACTED] * distracted_count)

    random.shuffle(profiles)
    return profiles


def create_participants(
    api: ApiClient,
    meeting_id: str,
    count: int,
    fingerprint_provider: Callable[[int], str],
) -> list[Participant]:
    """Create participants with assigned profiles."""
    profiles = assign_profiles(count)
    participants: list[Participant] = []

    for i, profile in enumerate(profiles):
        fp = fingerprint_provider(i + 1)
        visit = api.create_visit(fp)

        p = Participant(
            id=visit["participant_id"],
            fingerprint=fp,
            profile=profile,
        )
        participants.append(p)

        # Use short participant ID for cleaner logs
        short_id = p.id[:8]
        log("JOIN", f"Participant {i + 1}/{count}: {short_id}... ({profile.value})")

    return participants


def update_status(
    api: ApiClient,
    meeting_id: str,
    participant: Participant,
    status: StatusType,
    verbose: bool = True,
) -> None:
    """Update a participant's engagement status."""
    api.send_status(meeting_id, participant.id, status)
    participant.current_status = status

    if verbose:
        short_id = participant.id[:8]
        log("STATUS", f"{short_id}... -> {status}")


PhaseHandler = Callable[[ApiClient, str, list[Participant], int, bool], None]


def _warmup_tick(
    api: ApiClient, meeting_id: str, participants: list[Participant], tick: int, fast: bool
) -> None:
    update_count = min(2 + tick // 2, len(participants))
    for p in random.sample(participants, update_count):
        if p.profile == Profile.DISTRACTED:
            status = cast(StatusType, random.choice(["engaged", "disengaged"]))
        else:
            status = (
                cast(StatusType, random.choice(["engaged", "speaking"]))
                if random.random() > 0.3
                else "engaged"
            )
        update_status(api, meeting_id, p, status, verbose=not fast)


def _peak_tick(
    api: ApiClient, meeting_id: str, participants: list[Participant], _: int, fast: bool
) -> None:
    for p in participants:
        if random.random() < 0.6:  # 60% chance to update
            status = choose_status(p.profile)
            update_status(api, meeting_id, p, status, verbose=not fast)


def _dip_tick(
    api: ApiClient, meeting_id: str, participants: list[Participant], _: int, fast: bool
) -> None:
    for p in participants:
        if random.random() < 0.7:
            status = "disengaged" if random.random() < 0.6 else choose_status(p.profile)
            update_status(api, meeting_id, p, status, verbose=not fast)


def _recovery_tick(
    api: ApiClient, meeting_id: str, participants: list[Participant], _: int, fast: bool
) -> None:
    for p in participants:
        if random.random() < 0.5:
            status = choose_status(p.profile)
            update_status(api, meeting_id, p, status, verbose=not fast)


def _mixed_tick(
    api: ApiClient, meeting_id: str, participants: list[Participant], _: int, fast: bool
) -> None:
    update_count = random.randint(1, max(2, len(participants) // 2))
    for p in random.sample(participants, update_count):
        status = choose_status(p.profile)
        update_status(api, meeting_id, p, status, verbose=not fast)


PHASE_HANDLERS: dict[str, PhaseHandler] = {
    "warmup": _warmup_tick,
    "peak": _peak_tick,
    "dip": _dip_tick,
    "recovery": _recovery_tick,
}


def run_simulation_tick(
    api: ApiClient,
    meeting_id: str,
    participants: list[Participant],
    tick: int,
    phase: str,
    fast_mode: bool,
) -> None:
    """
    Run a single simulation tick, updating some participants based on phase.
    """
    bucket = get_current_bucket()
    handler = PHASE_HANDLERS.get(phase, _mixed_tick)
    handler(api, meeting_id, participants, tick, fast_mode)
    log("TICK", f"Bucket {bucket} | Phase: {phase} | Tick {tick}")


def determine_phase(elapsed_seconds: int, total_seconds: int) -> str:
    """Determine the current simulation phase based on elapsed time."""
    progress = elapsed_seconds / total_seconds

    if progress < 0.15:
        return "warmup"
    if progress < 0.40:
        return "peak"
    if progress < 0.55:
        return "dip"
    if progress < 0.70:
        return "recovery"
    return "mixed"


def fetch_engagement_summary(client: httpx.Client, meeting_id: str) -> dict | None:
    """Fetch the engagement summary from the API."""
    try:
        api = ApiClient(client)
        return api.fetch_engagement(meeting_id)
    except Exception as e:
        log("ERROR", f"Failed to fetch engagement: {e}")
        return None


def display_summary(summary: dict, participants: list[Participant]) -> None:
    """Display engagement summary statistics."""
    overall = summary.get("overall", [])

    if not overall:
        log("SUMMARY", "No engagement data recorded")
        return

    values = [p["value"] for p in overall]
    avg = sum(values) / len(values)
    min_val = min(values)
    max_val = max(values)
    if all(v == 0 for v in values):
        log("SUMMARY", "All buckets are zero — check meeting timing or status writes.")

    log("SUMMARY", "=" * 50)
    log("SUMMARY", f"Buckets recorded: {len(overall)}")
    log("SUMMARY", f"Overall engagement: avg={avg:.1f}% min={min_val:.1f}% max={max_val:.1f}%")

    # Per-participant summary
    participant_data = summary.get("participants", [])
    for p_data in participant_data:
        pid = p_data["participant_id"]
        series = p_data.get("series", [])
        if series:
            p_values = [s["value"] for s in series]
            p_avg = sum(p_values) / len(p_values)
            # Find matching participant for profile
            profile_name = "?"
            for p in participants:
                if p.id == pid:
                    profile_name = p.profile.value
                    break
            log("SUMMARY", f"  {pid[:8]}... ({profile_name}): avg={p_avg:.1f}%")


def _bootstrap_meeting(
    api: ApiClient,
    participant_count: int,
    use_fixed_ids: bool,
) -> tuple[str, list[Participant]]:
    primary_fp = make_fingerprint(0, use_fixed_ids=use_fixed_ids)
    visit = api.create_visit(primary_fp)
    meeting_id = visit["meeting_id"]

    log("MEETING", f"ID: {meeting_id}")
    log("MEETING", f"Start: {visit['meeting_start']}")
    log("MEETING", f"End: {visit['meeting_end']}")
    log("MEETING", "UI: http://localhost (connect to see real-time updates)")

    participants: list[Participant] = [
        Participant(
            id=visit["participant_id"],
            fingerprint=primary_fp,
            profile=Profile.ACTIVE,
        )
    ]

    if participant_count > 1:
        additional = create_participants(
            api=api,
            meeting_id=meeting_id,
            count=participant_count - 1,
            fingerprint_provider=lambda idx: make_fingerprint(idx, use_fixed_ids=use_fixed_ids),
        )
        participants.extend(additional)

    active = sum(1 for p in participants if p.profile == Profile.ACTIVE)
    passive = sum(1 for p in participants if p.profile == Profile.PASSIVE)
    distracted = sum(1 for p in participants if p.profile == Profile.DISTRACTED)

    log("SIM", f"Created {len(participants)} participants")
    log("SIM", f"Profiles: {active} active, {passive} passive, {distracted} distracted")
    return meeting_id, participants


def _initialize_engagement(
    api: ApiClient, meeting_id: str, participants: list[Participant], fast_mode: bool
) -> None:
    log("SIM", "Setting initial engagement states...")
    for p in participants:
        status = choose_status(p.profile)
        update_status(api, meeting_id, p, status, verbose=False)


def _run_simulation_loop(
    api: ApiClient,
    meeting_id: str,
    participants: list[Participant],
    total_seconds: int,
    tick_interval: float,
    fast_mode: bool,
) -> None:
    log("SIM", f"Starting simulation for {total_seconds // 60} minutes...")
    log("SIM", "=" * 50)

    start_time = time.time()
    tick = 0
    last_bucket = ""

    while True:
        elapsed = time.time() - start_time

        if elapsed >= total_seconds:
            break

        current_bucket = get_current_bucket()
        if current_bucket != last_bucket:
            if last_bucket:
                log("BUCKET", f"New bucket: {current_bucket}")
            last_bucket = current_bucket

        phase = determine_phase(int(elapsed), total_seconds)
        run_simulation_tick(api, meeting_id, participants, tick, phase, fast_mode)

        tick += 1
        remaining = total_seconds - elapsed
        if tick % 5 == 0 or fast_mode:
            log("PROGRESS", f"{int(remaining)}s remaining | {tick} ticks completed")

        time.sleep(tick_interval)

    log("SIM", "=" * 50)
    log("SIM", "Simulation complete!")


def simulate() -> None:
    """
    Run the engagement simulation.

    Uses constants defined at the top of the file to avoid CLI flags.
    """
    log("START", f"Backend: {BASE_URL}")
    log("START", f"Participants: {PARTICIPANT_COUNT}, Duration: {MEETING_DURATION_MINUTES}m")
    log(
        "START",
        f"Continuous: {CONTINUOUS}, Fixed IDs: {USE_FIXED_IDS}, Delay: {DELAY_BETWEEN_MEETINGS_SECONDS}s",
    )

    total_seconds = MEETING_DURATION_MINUTES * 60
    tick_interval = TICK_INTERVAL_SECONDS

    with httpx.Client(base_url=BASE_URL, timeout=CLIENT_TIMEOUT) as client:
        run_idx = 1
        while True:
            api = ApiClient(client)
            log("LOOP", f"Starting meeting run #{run_idx}")
            meeting_id, participants = _bootstrap_meeting(
                api, PARTICIPANT_COUNT, use_fixed_ids=USE_FIXED_IDS
            )
            _initialize_engagement(api, meeting_id, participants, fast_mode=False)

            _run_simulation_loop(
                api=api,
                meeting_id=meeting_id,
                participants=participants,
                total_seconds=total_seconds,
                tick_interval=tick_interval,
                fast_mode=False,
            )

            log("SUMMARY", "Fetching engagement summary...")
            summary = fetch_engagement_summary(client, meeting_id)
            if summary:
                display_summary(summary, participants)

            log("DONE", f"Meeting ID: {meeting_id}")
            log("DONE", "View at: http://localhost")

            if not CONTINUOUS:
                break

            run_idx += 1
            if DELAY_BETWEEN_MEETINGS_SECONDS > 0:
                log("SLEEP", f"Sleeping {DELAY_BETWEEN_MEETINGS_SECONDS}s before next meeting...")
                time.sleep(DELAY_BETWEEN_MEETINGS_SECONDS)


if __name__ == "__main__":
    try:
        simulate()
    except KeyboardInterrupt:
        log("STOP", "Interrupted by user")
        sys.exit(0)
    except Exception as exc:
        log("FATAL", str(exc))
        sys.exit(1)
