"""
Demo script for muda-meter engagement simulation.

Creates 5-10 participants with varied engagement patterns across multiple
minute buckets to demonstrate the real-time chart visualization.

Usage:
    python -m scripts.demo                    # 3-minute simulation, 7 participants
    python -m scripts.demo --fast             # Quick test with minimal delays
    python -m scripts.demo --participants 10  # Specify participant count
    python -m scripts.demo --duration 5       # 5-minute simulation
"""

import argparse
import os
import random
import sys
import time
from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from typing import Literal
from uuid import uuid4

import httpx

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
CLIENT_TIMEOUT = float(os.getenv("CLIENT_TIMEOUT", "10.0"))

StatusType = Literal["speaking", "engaged", "not_engaged"]


class Profile(Enum):
    """Participant engagement profiles."""
    ACTIVE = "active"       # Frequently engaged, sometimes speaks
    PASSIVE = "passive"     # Occasionally engaged, rarely speaks
    DISTRACTED = "distracted"  # Often not_engaged, sporadic engagement


# Status probabilities by profile: (speaking, engaged, not_engaged)
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
    current_status: StatusType = "not_engaged"


def log(section: str, message: str) -> None:
    """Log a message with timestamp and section."""
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {section:<12} | {message}")


def post(client: httpx.Client, path: str, json: dict | None = None) -> httpx.Response:
    """POST request with logging."""
    resp = client.post(path, json=json)
    if resp.status_code >= 300:
        log("ERROR", f"POST {path} -> {resp.status_code}: {resp.text}")
        resp.raise_for_status()
    return resp


def get(client: httpx.Client, path: str) -> httpx.Response:
    """GET request with logging."""
    resp = client.get(path)
    if resp.status_code >= 300:
        log("ERROR", f"GET {path} -> {resp.status_code}: {resp.text}")
        resp.raise_for_status()
    return resp


def get_current_bucket() -> str:
    """Get the current minute bucket as HH:MM string."""
    return datetime.now().strftime("%H:%M")


def choose_status(profile: Profile) -> StatusType:
    """Choose a status based on profile weights."""
    weights = PROFILE_WEIGHTS[profile]
    return random.choices(
        ["speaking", "engaged", "not_engaged"],
        weights=weights,
        k=1,
    )[0]


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
    client: httpx.Client,
    meeting_id: str,
    count: int,
) -> list[Participant]:
    """Create participants with assigned profiles."""
    profiles = assign_profiles(count)
    participants: list[Participant] = []
    
    for i, profile in enumerate(profiles):
        fp = f"fp-{uuid4().hex[:16]}"
        visit = post(client, "/visit", {"device_fingerprint": fp}).json()
        
        p = Participant(
            id=visit["participant_id"],
            fingerprint=fp,
            profile=profile,
        )
        participants.append(p)
        
        # Use short participant ID for cleaner logs
        short_id = p.id[:8]
        log("JOIN", f"Participant {i+1}/{count}: {short_id}... ({profile.value})")
    
    return participants


def update_status(
    client: httpx.Client,
    meeting_id: str,
    participant: Participant,
    status: StatusType,
    verbose: bool = True,
) -> None:
    """Update a participant's engagement status."""
    post(client, "/users/status", {
        "meeting_id": meeting_id,
        "participant_id": participant.id,
        "status": status,
    })
    participant.current_status = status
    
    if verbose:
        short_id = participant.id[:8]
        log("STATUS", f"{short_id}... -> {status}")


def run_simulation_tick(
    client: httpx.Client,
    meeting_id: str,
    participants: list[Participant],
    tick: int,
    phase: str,
    fast_mode: bool,
) -> None:
    """
    Run a single simulation tick, updating some participants.
    
    Phase affects behavior:
    - warmup: Participants gradually become engaged
    - peak: High engagement, some speaking
    - cooldown: Engagement starts to decrease
    """
    bucket = get_current_bucket()
    
    # Determine how many participants to update this tick
    if phase == "warmup":
        # Gradually engage more participants
        update_count = min(2 + tick // 2, len(participants))
        # Bias toward engagement
        for p in random.sample(participants, update_count):
            if p.profile == Profile.DISTRACTED:
                status = random.choice(["engaged", "not_engaged"])
            else:
                status = random.choice(["engaged", "speaking"]) if random.random() > 0.3 else "engaged"
            update_status(client, meeting_id, p, status, verbose=not fast_mode)
    
    elif phase == "peak":
        # High activity, multiple speakers possible
        for p in participants:
            if random.random() < 0.6:  # 60% chance to update
                status = choose_status(p.profile)
                update_status(client, meeting_id, p, status, verbose=not fast_mode)
    
    elif phase == "dip":
        # Brief disengagement
        for p in participants:
            if random.random() < 0.7:  # 70% chance to update
                # Bias toward disengagement
                status = "not_engaged" if random.random() < 0.6 else choose_status(p.profile)
                update_status(client, meeting_id, p, status, verbose=not fast_mode)
    
    elif phase == "recovery":
        # Re-engagement after dip
        for p in participants:
            if random.random() < 0.5:
                status = choose_status(p.profile)
                update_status(client, meeting_id, p, status, verbose=not fast_mode)
    
    else:  # normal/mixed
        # Random updates based on profiles
        update_count = random.randint(1, max(2, len(participants) // 2))
        for p in random.sample(participants, update_count):
            status = choose_status(p.profile)
            update_status(client, meeting_id, p, status, verbose=not fast_mode)
    
    log("TICK", f"Bucket {bucket} | Phase: {phase} | Tick {tick}")


def determine_phase(elapsed_seconds: int, total_seconds: int) -> str:
    """Determine the current simulation phase based on elapsed time."""
    progress = elapsed_seconds / total_seconds
    
    if progress < 0.15:
        return "warmup"
    elif progress < 0.40:
        return "peak"
    elif progress < 0.55:
        return "dip"
    elif progress < 0.70:
        return "recovery"
    else:
        return "mixed"


def fetch_engagement_summary(client: httpx.Client, meeting_id: str) -> dict | None:
    """Fetch the engagement summary from the API."""
    try:
        resp = get(client, f"/meetings/{meeting_id}/engagement")
        return resp.json()
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


def simulate(
    participant_count: int = 7,
    duration_minutes: int = 3,
    fast_mode: bool = False,
) -> None:
    """
    Run the engagement simulation.
    
    Args:
        participant_count: Number of participants (5-10)
        duration_minutes: How long to run the simulation
        fast_mode: If True, use minimal delays
    """
    # Clamp participant count
    participant_count = max(5, min(10, participant_count))
    
    log("START", f"Backend: {BASE_URL}")
    log("START", f"Participants: {participant_count}, Duration: {duration_minutes}m, Fast: {fast_mode}")
    
    # Calculate timing
    total_seconds = duration_minutes * 60
    tick_interval = 2.0 if fast_mode else 10.0  # Seconds between ticks
    
    with httpx.Client(base_url=BASE_URL, timeout=CLIENT_TIMEOUT) as client:
        # Create initial meeting via first participant
        primary_fp = f"fp-{uuid4().hex[:16]}"
        visit = post(client, "/visit", {"device_fingerprint": primary_fp}).json()
        meeting_id = visit["meeting_id"]
        
        log("MEETING", f"ID: {meeting_id}")
        log("MEETING", f"Start: {visit['meeting_start']}")
        log("MEETING", f"End: {visit['meeting_end']}")
        log("MEETING", f"UI: http://localhost (connect to see real-time updates)")
        
        # Create remaining participants
        participants = [
            Participant(
                id=visit["participant_id"],
                fingerprint=primary_fp,
                profile=Profile.ACTIVE,
            )
        ]
        
        if participant_count > 1:
            additional = create_participants(
                client, meeting_id, participant_count - 1
            )
            participants.extend(additional)
        
        log("SIM", f"Created {len(participants)} participants")
        log("SIM", f"Profiles: {sum(1 for p in participants if p.profile == Profile.ACTIVE)} active, "
                  f"{sum(1 for p in participants if p.profile == Profile.PASSIVE)} passive, "
                  f"{sum(1 for p in participants if p.profile == Profile.DISTRACTED)} distracted")
        
        # Initial engagement burst
        log("SIM", "Setting initial engagement states...")
        for p in participants:
            status = choose_status(p.profile)
            update_status(client, meeting_id, p, status, verbose=False)
        
        # Main simulation loop
        log("SIM", f"Starting {duration_minutes}-minute simulation...")
        log("SIM", "=" * 50)
        
        start_time = time.time()
        tick = 0
        last_bucket = ""
        
        while True:
            elapsed = time.time() - start_time
            
            if elapsed >= total_seconds:
                break
            
            # Check for bucket change
            current_bucket = get_current_bucket()
            if current_bucket != last_bucket:
                if last_bucket:
                    log("BUCKET", f"New bucket: {current_bucket}")
                last_bucket = current_bucket
            
            # Determine phase and run tick
            phase = determine_phase(int(elapsed), total_seconds)
            run_simulation_tick(client, meeting_id, participants, tick, phase, fast_mode)
            
            tick += 1
            
            # Progress indicator
            remaining = total_seconds - elapsed
            if tick % 5 == 0 or fast_mode:
                log("PROGRESS", f"{int(remaining)}s remaining | {tick} ticks completed")
            
            # Wait for next tick
            time.sleep(tick_interval)
        
        log("SIM", "=" * 50)
        log("SIM", "Simulation complete!")
        
        # Fetch and display summary
        log("SUMMARY", "Fetching engagement summary...")
        summary = fetch_engagement_summary(client, meeting_id)
        if summary:
            display_summary(summary, participants)
        
        log("DONE", f"Meeting ID: {meeting_id}")
        log("DONE", f"View at: http://localhost")


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Simulate meeting engagement for muda-meter demo",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python -m scripts.demo                    # 3-minute simulation
  python -m scripts.demo --fast             # Quick test mode
  python -m scripts.demo -p 10 -d 5         # 10 participants, 5 minutes
        """,
    )
    parser.add_argument(
        "-p", "--participants",
        type=int,
        default=7,
        help="Number of participants (5-10, default: 7)",
    )
    parser.add_argument(
        "-d", "--duration",
        type=int,
        default=3,
        help="Simulation duration in minutes (default: 3)",
    )
    parser.add_argument(
        "--fast",
        action="store_true",
        help="Fast mode with minimal delays",
    )
    return parser.parse_args()


if __name__ == "__main__":
    try:
        args = parse_args()
        simulate(
            participant_count=args.participants,
            duration_minutes=args.duration,
            fast_mode=args.fast,
        )
    except KeyboardInterrupt:
        log("STOP", "Interrupted by user")
        sys.exit(0)
    except Exception as exc:
        log("FATAL", str(exc))
        sys.exit(1)
