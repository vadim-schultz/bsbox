#!/usr/bin/env python3
"""Utility for polling hostapd clients and persisting connection metrics."""

from __future__ import annotations

import asyncio
import json
import subprocess
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path


@dataclass
class ClientSnapshot:
    mac: str
    signal: int | None
    connected: bool
    timestamp: datetime


async def poll_clients(interface: str) -> list[ClientSnapshot]:
    cmd = ["iw", "dev", interface, "station", "dump"]
    process = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
    )
    stdout, _ = await process.communicate()
    output = stdout.decode("utf-8").strip().splitlines()

    snapshots: list[ClientSnapshot] = []
    mac = None
    signal = None
    for line in output:
        if line.startswith("Station"):
            mac = line.split()[1]
        elif "signal:" in line:
            try:
                signal = int(line.split()[1])
            except ValueError:
                signal = None
        elif line == "" and mac:
            snapshots.append(
                ClientSnapshot(
                    mac=mac,
                    signal=signal,
                    connected=True,
                    timestamp=datetime.utcnow(),
                )
            )
            mac = None
            signal = None

    return snapshots


async def main(interface: str, output_file: Path) -> None:
    snapshots = await poll_clients(interface)
    payload = [snapshot.__dict__ for snapshot in snapshots]
    output_file.write_text(json.dumps(payload, default=str))


if __name__ == "__main__":
    asyncio.run(main("wlan0", Path("client_snapshots.json")))

