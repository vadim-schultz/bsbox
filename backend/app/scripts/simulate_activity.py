from __future__ import annotations

import argparse
import json
import random
import sys
import time
from datetime import datetime, timezone
from typing import Any, cast

import httpx

DEFAULT_BASE_URL = "http://127.0.0.1:8000"
DEFAULT_TIMEOUT = 5.0


class SimulationError(RuntimeError):
    """Raised when the simulation fails to interact with the API."""


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Simulate meeting hotspot activity by exercising backend endpoints.",
    )
    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help="Base URL of the backend service (default: %(default)s)",
    )
    parser.add_argument(
        "--timeout",
        type=float,
        default=DEFAULT_TIMEOUT,
        help="HTTP timeout in seconds (default: %(default)s)",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    event_parser = subparsers.add_parser(
        "event", help="Send a single engagement event."
    )
    event_parser.add_argument("visitor_id", help="Identifier for the participant.")
    event_parser.add_argument(
        "--speaking",
        action="store_true",
        help="Mark the participant as currently speaking.",
    )
    event_parser.add_argument(
        "--relevant",
        action="store_true",
        help="Mark the participant as finding the meeting relevant.",
    )
    event_parser.add_argument(
        "--timestamp",
        help="Optional ISO timestamp. Defaults to current UTC time.",
    )
    event_parser.add_argument(
        "--echo",
        action="store_true",
        help="Print the analytics summary returned by the backend.",
    )

    burst_parser = subparsers.add_parser(
        "burst",
        help="Simulate multiple rounds of random participant activity.",
    )
    burst_parser.add_argument(
        "--participants",
        type=int,
        default=5,
        help="Number of synthetic participants to simulate.",
    )
    burst_parser.add_argument(
        "--iterations",
        type=int,
        default=3,
        help="Number of activity rounds to execute.",
    )
    burst_parser.add_argument(
        "--delay",
        type=float,
        default=2.0,
        help="Delay in seconds between rounds.",
    )
    burst_parser.add_argument(
        "--speak-prob",
        type=float,
        default=0.4,
        help="Probability that a participant is speaking in a round.",
    )
    burst_parser.add_argument(
        "--relevant-prob",
        type=float,
        default=0.6,
        help="Probability that a participant marks the meeting as relevant.",
    )
    burst_parser.add_argument(
        "--echo",
        action="store_true",
        help="Print analytics after each round.",
    )

    snapshot_parser = subparsers.add_parser(
        "snapshot",
        help="Fetch current analytics and optional history snapshots.",
    )
    snapshot_parser.add_argument(
        "--history-limit",
        type=int,
        default=5,
        help="Number of historical entries to request.",
    )
    snapshot_parser.add_argument(
        "--include-history",
        action="store_true",
        help="Include historical analytics in the output.",
    )

    return parser.parse_args(argv)


def normalize_base_url(base_url: str) -> str:
    return base_url.rstrip("/")


def iso_datetime(timestamp: str | None) -> str:
    if timestamp:
        return timestamp
    return datetime.now(tz=timezone.utc).isoformat()


def post_event(
    client: httpx.Client, base_url: str, payload: dict[str, Any]
) -> dict[str, Any]:
    response = client.post(f"{base_url}/meetings/events", json=payload)
    response.raise_for_status()
    return cast(dict[str, Any], response.json())


def get_analytics(client: httpx.Client, base_url: str) -> dict[str, Any]:
    response = client.get(f"{base_url}/meetings/analytics")
    response.raise_for_status()
    return cast(dict[str, Any], response.json())


def get_history(
    client: httpx.Client, base_url: str, limit: int
) -> list[dict[str, Any]]:
    response = client.get(
        f"{base_url}/meetings/analytics/history", params={"limit": limit}
    )
    response.raise_for_status()
    data = response.json()
    if not isinstance(data, list):
        raise SimulationError("History endpoint returned unexpected payload.")
    return cast(list[dict[str, Any]], data)


def format_json(payload: Any) -> str:
    return json.dumps(payload, indent=2, sort_keys=True)


def run_event(args: argparse.Namespace) -> None:
    base_url = normalize_base_url(args.base_url)
    payload = {
        "visitor_id": args.visitor_id,
        "is_speaking": args.speaking,
        "is_relevant": args.relevant,
        "timestamp": iso_datetime(args.timestamp),
    }

    with httpx.Client(timeout=args.timeout) as client:
        analytics = post_event(client, base_url, payload)
        print(
            f"✅ Sent event for {args.visitor_id} (speaking={args.speaking}, relevant={args.relevant})"
        )
        if args.echo:
            print("Current analytics:")
            print(format_json(analytics))


def random_payload(
    participant_id: str, speak_prob: float, relevant_prob: float
) -> dict[str, Any]:
    is_speaking = random.random() < speak_prob
    is_relevant = random.random() < relevant_prob
    return {
        "visitor_id": participant_id,
        "is_speaking": is_speaking,
        "is_relevant": is_relevant,
        "timestamp": iso_datetime(None),
    }


def run_burst(args: argparse.Namespace) -> None:
    if args.participants <= 0:
        raise SimulationError("participants must be greater than zero")
    if args.iterations <= 0:
        raise SimulationError("iterations must be greater than zero")

    base_url = normalize_base_url(args.base_url)
    participant_ids = [f"visitor-{i + 1}" for i in range(args.participants)]

    with httpx.Client(timeout=args.timeout) as client:
        for iteration in range(1, args.iterations + 1):
            print(f"--- Round {iteration}/{args.iterations} ---")
            for pid in participant_ids:
                payload = random_payload(pid, args.speak_prob, args.relevant_prob)
                analytics = post_event(client, base_url, payload)
                print(
                    f"  event -> {pid:>8}: speaking={payload['is_speaking']},"
                    f" relevant={payload['is_relevant']}"
                )
            if args.echo:
                print("Analytics snapshot:")
                print(format_json(analytics))
            if iteration != args.iterations:
                time.sleep(args.delay)


def run_snapshot(args: argparse.Namespace) -> None:
    base_url = normalize_base_url(args.base_url)

    with httpx.Client(timeout=args.timeout) as client:
        analytics = get_analytics(client, base_url)
        print("Current analytics:")
        print(format_json(analytics))

        if args.include_history:
            history = get_history(client, base_url, args.history_limit)
            print(f"\nHistorical analytics (limit={args.history_limit}):")
            print(format_json(history))


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)

    try:
        if args.command == "event":
            run_event(args)
        elif args.command == "burst":
            run_burst(args)
        elif args.command == "snapshot":
            run_snapshot(args)
        else:
            raise SimulationError(f"Unknown command: {args.command}")
    except httpx.HTTPError as exc:
        print(f"HTTP request failed: {exc}", file=sys.stderr)
        sys.exit(2)
    except SimulationError as exc:
        print(str(exc), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
