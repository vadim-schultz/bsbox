"""
Demo script for bsbox engagement simulation.

Demonstrates multiple separate meetings with different contexts:
- Physical meetings in different cities/rooms
- Online meetings with Teams links
- Hybrid meetings (room + Teams)

Usage:
    python -m scripts.demo

Runs continuously until interrupted, with the constants in this file controlling
participant count, duration, delay, and meeting scenarios.
"""

import os
import random
import sys
import time
from dataclasses import dataclass
from datetime import UTC, datetime
from enum import Enum
from typing import Any, Literal, cast
from uuid import uuid4

import httpx

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
CLIENT_TIMEOUT = float(os.getenv("CLIENT_TIMEOUT", "10.0"))

# Simulation settings
PARTICIPANTS_PER_MEETING = 5
MEETING_DURATION_MINUTES = 30  # Must be 30 or 60
TICK_INTERVAL_SECONDS = 5.0
CONTINUOUS = True
DELAY_BETWEEN_RUNS_SECONDS = 5
USE_FIXED_IDS = True

StatusType = Literal["speaking", "engaged", "disengaged"]

FIXED_FINGERPRINTS = [f"fp-fixed-{i:03d}" for i in range(1, 101)]


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
class MeetingContext:
    """Context for a meeting scenario."""

    name: str
    city_id: str | None
    city_name: str | None
    room_id: str | None
    room_name: str | None
    teams_input: str | None
    meeting_type: Literal["physical", "online", "hybrid"]


@dataclass
class Participant:
    """Participant with ID and engagement profile."""

    id: str
    fingerprint: str
    profile: Profile
    current_status: StatusType = "disengaged"


@dataclass
class MeetingSession:
    """A running meeting with its context and participants."""

    meeting_id: str
    context: MeetingContext
    participants: list[Participant]
    start_time: float


def make_fingerprint(index: int, use_fixed_ids: bool) -> str:
    """Build a deterministic fingerprint when requested."""
    if use_fixed_ids and index < len(FIXED_FINGERPRINTS):
        return FIXED_FINGERPRINTS[index]
    return f"fp-{uuid4().hex[:16]}"


def log(section: str, message: str, meeting_name: str | None = None) -> None:
    """Log a message with timestamp and section."""
    ts = datetime.now(tz=UTC).strftime("%H:%M:%S")
    prefix = f"[{meeting_name}]" if meeting_name else ""
    print(f"[{ts}] {section:<12} {prefix:<20} | {message}")


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

    def create_city(self, name: str) -> dict[str, Any]:
        """Create a city."""
        return cast(dict[str, Any], self._post("/cities", {"name": name}).json())

    def get_cities(self) -> list[dict[str, Any]]:
        """Get all cities."""
        response = self._get("/cities")
        data = response.json()
        return cast(list[dict[str, Any]], data.get("items", []))

    def create_meeting_room(self, name: str, city_id: str) -> dict[str, Any]:
        """Create a meeting room."""
        return cast(
            dict[str, Any],
            self._post("/meeting-rooms", {"name": name, "city_id": city_id}).json(),
        )

    def get_meeting_rooms(self, city_id: str) -> list[dict[str, Any]]:
        """Get meeting rooms for a city."""
        response = self._get(f"/meeting-rooms?city_id={city_id}")
        data = response.json()
        return cast(list[dict[str, Any]], data.get("items", []))

    def create_visit(
        self,
        city_id: str | None = None,
        meeting_room_id: str | None = None,
        ms_teams_input: str | None = None,
        duration_minutes: int = 60,
    ) -> dict[str, Any]:
        """Create a visit (meeting)."""
        payload: dict[str, Any] = {"duration_minutes": duration_minutes}
        if city_id:
            payload["city_id"] = city_id
        if meeting_room_id:
            payload["meeting_room_id"] = meeting_room_id
        if ms_teams_input:
            payload["ms_teams_input"] = ms_teams_input
        return cast(dict[str, Any], self._post("/visit", payload).json())

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
    """Assign profiles to participants to create varied engagement."""
    profiles = []
    active_count = max(1, int(count * 0.3))
    distracted_count = max(1, int(count * 0.3))
    passive_count = count - active_count - distracted_count

    profiles.extend([Profile.ACTIVE] * active_count)
    profiles.extend([Profile.PASSIVE] * passive_count)
    profiles.extend([Profile.DISTRACTED] * distracted_count)

    random.shuffle(profiles)
    return profiles


def setup_location_infrastructure(api: ApiClient) -> dict[str, Any]:
    """Set up cities and meeting rooms, or reuse existing ones."""
    log("SETUP", "Setting up location infrastructure...")

    # Get or create cities
    cities = api.get_cities()
    city_map: dict[str, dict[str, Any]] = {}

    target_cities = ["Dresden", "Berlin", "Munich"]
    for city_name in target_cities:
        existing = next((c for c in cities if c["name"] == city_name), None)
        if existing:
            city_map[city_name] = existing
            log("SETUP", f"Found existing city: {city_name} (ID: {existing['id'][:8]}...)")
        else:
            new_city = api.create_city(city_name)
            city_map[city_name] = new_city
            log("SETUP", f"Created city: {city_name} (ID: {new_city['id'][:8]}...)")

    # Get or create meeting rooms
    room_map: dict[str, dict[str, Any]] = {}
    target_rooms = [
        ("Dresden", "Conference Room A"),
        ("Berlin", "Meeting Room 5"),
        ("Munich", "Innovation Lab"),
    ]

    for city_name, room_name in target_rooms:
        city_id = city_map[city_name]["id"]
        rooms = api.get_meeting_rooms(city_id)
        existing_room = next((r for r in rooms if r["name"] == room_name), None)

        if existing_room:
            room_map[f"{city_name}:{room_name}"] = existing_room
            log("SETUP", f"Found existing room: {room_name} in {city_name}")
        else:
            new_room = api.create_meeting_room(room_name, city_id)
            room_map[f"{city_name}:{room_name}"] = new_room
            log("SETUP", f"Created room: {room_name} in {city_name}")

    return {"cities": city_map, "rooms": room_map}


def create_meeting_scenarios(infrastructure: dict[str, Any]) -> list[MeetingContext]:
    """Create different meeting scenarios to demonstrate separation."""
    cities = infrastructure["cities"]
    rooms = infrastructure["rooms"]

    return [
        # Physical meeting in Dresden
        MeetingContext(
            name="Dresden-Physical",
            city_id=cities["Dresden"]["id"],
            city_name="Dresden",
            room_id=rooms["Dresden:Conference Room A"]["id"],
            room_name="Conference Room A",
            teams_input=None,
            meeting_type="physical",
        ),
        # Physical meeting in Berlin
        MeetingContext(
            name="Berlin-Physical",
            city_id=cities["Berlin"]["id"],
            city_name="Berlin",
            room_id=rooms["Berlin:Meeting Room 5"]["id"],
            room_name="Meeting Room 5",
            teams_input=None,
            meeting_type="physical",
        ),
        # Online meeting (Teams only)
        MeetingContext(
            name="Online-Teams",
            city_id=None,
            city_name=None,
            room_id=None,
            room_name=None,
            teams_input="https://teams.microsoft.com/meet/demo123",
            meeting_type="online",
        ),
        # Hybrid meeting (Munich room + Teams)
        MeetingContext(
            name="Munich-Hybrid",
            city_id=cities["Munich"]["id"],
            city_name="Munich",
            room_id=rooms["Munich:Innovation Lab"]["id"],
            room_name="Innovation Lab",
            teams_input="https://teams.microsoft.com/meet/hybrid456",
            meeting_type="hybrid",
        ),
    ]


def bootstrap_meeting(
    api: ApiClient,
    context: MeetingContext,
    participant_count: int,
    fingerprint_offset: int,
    use_fixed_ids: bool,
) -> MeetingSession:
    """Bootstrap a meeting with initial visit and participants."""
    log("MEETING", f"Creating {context.meeting_type} meeting...", context.name)

    # Create visit to get meeting ID
    visit_response = api.create_visit(
        city_id=context.city_id,
        meeting_room_id=context.room_id,
        ms_teams_input=context.teams_input,
        duration_minutes=MEETING_DURATION_MINUTES,
    )
    meeting_id = visit_response["meeting_id"]

    log("MEETING", f"ID: {meeting_id[:16]}...", context.name)
    if context.city_name and context.room_name:
        log("MEETING", f"Location: {context.city_name}, {context.room_name}", context.name)
    if context.teams_input:
        log("MEETING", f"Teams: {context.teams_input[:50]}...", context.name)

    # Create participants (simulate WebSocket joins via visit endpoint)
    profiles = assign_profiles(participant_count)
    participants: list[Participant] = []

    for i, profile in enumerate(profiles):
        fp = make_fingerprint(fingerprint_offset + i, use_fixed_ids)
        # Each participant creates their own visit to join (ensures they're in the same meeting)
        api.create_visit(
            city_id=context.city_id,
            meeting_room_id=context.room_id,
            ms_teams_input=context.teams_input,
            duration_minutes=MEETING_DURATION_MINUTES,
        )

        # For now, we'll use a simple ID (in real system, WebSocket join would provide this)
        p = Participant(
            id=f"participant-{meeting_id[:8]}-{i}",
            fingerprint=fp,
            profile=profile,
        )
        participants.append(p)

        log(
            "JOIN",
            f"Participant {i + 1}/{participant_count}: {p.id[:16]}... ({profile.value})",
            context.name,
        )

    return MeetingSession(
        meeting_id=meeting_id,
        context=context,
        participants=participants,
        start_time=time.time(),
    )


def update_status(
    api: ApiClient,
    session: MeetingSession,
    participant: Participant,
    status: StatusType,
    verbose: bool = False,
) -> None:
    """Update a participant's engagement status."""
    api.send_status(session.meeting_id, participant.id, status)
    participant.current_status = status

    if verbose:
        log("STATUS", f"{participant.id[:16]}... -> {status}", session.context.name)


def run_simulation_tick(
    api: ApiClient,
    session: MeetingSession,
    tick: int,
    fast_mode: bool = False,
) -> None:
    """Run a single simulation tick for a meeting."""
    # Simple random updates for demo
    update_count = random.randint(1, max(2, len(session.participants) // 2))
    for p in random.sample(session.participants, update_count):
        status = choose_status(p.profile)
        update_status(api, session, p, status, verbose=not fast_mode)


def display_summary(api: ApiClient, session: MeetingSession) -> None:
    """Display engagement summary for a meeting."""
    try:
        summary = api.fetch_engagement(session.meeting_id)
        overall = summary.get("overall", [])

        if not overall:
            log("SUMMARY", "No engagement data recorded", session.context.name)
            return

        values = [p["value"] for p in overall]
        avg = sum(values) / len(values)
        min_val = min(values)
        max_val = max(values)

        log("SUMMARY", "=" * 40, session.context.name)
        log("SUMMARY", f"Buckets: {len(overall)}", session.context.name)
        log(
            "SUMMARY",
            f"Engagement: avg={avg:.1f}% min={min_val:.1f}% max={max_val:.1f}%",
            session.context.name,
        )
    except Exception as e:
        log("ERROR", f"Failed to fetch summary: {e}", session.context.name)


def simulate() -> None:
    """Run the multi-meeting engagement simulation."""
    log("START", f"Backend: {BASE_URL}")
    log("START", f"Participants per meeting: {PARTICIPANTS_PER_MEETING}")
    log("START", f"Duration: {MEETING_DURATION_MINUTES}m, Tick interval: {TICK_INTERVAL_SECONDS}s")
    log("START", f"Continuous: {CONTINUOUS}, Fixed IDs: {USE_FIXED_IDS}")

    total_seconds = MEETING_DURATION_MINUTES * 60

    with httpx.Client(base_url=BASE_URL, timeout=CLIENT_TIMEOUT) as client:
        api = ApiClient(client)
        run_idx = 1

        while True:
            log("LOOP", f"=== Starting run #{run_idx} ===")

            # Set up infrastructure
            infrastructure = setup_location_infrastructure(api)

            # Create meeting scenarios
            scenarios = create_meeting_scenarios(infrastructure)

            # Bootstrap all meetings
            sessions: list[MeetingSession] = []
            fingerprint_offset = 0
            for scenario in scenarios:
                session = bootstrap_meeting(
                    api,
                    scenario,
                    PARTICIPANTS_PER_MEETING,
                    fingerprint_offset,
                    USE_FIXED_IDS,
                )
                sessions.append(session)
                fingerprint_offset += PARTICIPANTS_PER_MEETING

            log("SIM", f"Running {len(sessions)} concurrent meetings...")
            log("SIM", "=" * 80)

            # Run simulation for all meetings concurrently
            start_time = time.time()
            tick = 0

            while True:
                elapsed = time.time() - start_time
                if elapsed >= total_seconds:
                    break

                # Update all meetings
                for session in sessions:
                    run_simulation_tick(api, session, tick, fast_mode=True)

                tick += 1
                if tick % 5 == 0:
                    remaining = total_seconds - elapsed
                    log("PROGRESS", f"{int(remaining)}s remaining | {tick} ticks completed")

                time.sleep(TICK_INTERVAL_SECONDS)

            log("SIM", "=" * 80)
            log("SIM", "Simulation complete!")

            # Display summaries
            log("SUMMARY", "Fetching engagement summaries...")
            for session in sessions:
                display_summary(api, session)

            log("DONE", f"Run #{run_idx} complete - {len(sessions)} meetings")
            log("DONE", "View at: http://localhost")

            if not CONTINUOUS:
                break

            run_idx += 1
            if DELAY_BETWEEN_RUNS_SECONDS > 0:
                log("SLEEP", f"Sleeping {DELAY_BETWEEN_RUNS_SECONDS}s before next run...")
                time.sleep(DELAY_BETWEEN_RUNS_SECONDS)


if __name__ == "__main__":
    try:
        simulate()
    except KeyboardInterrupt:
        log("STOP", "Interrupted by user")
        sys.exit(0)
    except Exception as exc:
        log("FATAL", str(exc))
        import traceback

        traceback.print_exc()
        sys.exit(1)
