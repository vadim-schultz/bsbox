from __future__ import annotations

import asyncio
import contextlib
import logging
import re
from collections.abc import AsyncIterator, Iterable
from dataclasses import dataclass
from typing import Callable, Final

logger = logging.getLogger(__name__)


HOSTAPD_CMD: Final = ("hostapd_cli", "-i", "{interface}", "all_sta")
IW_CMD: Final = ("iw", "dev", "{interface}", "station", "dump")
MAC_PATTERN = re.compile(r"^[0-9a-fA-F]{2}(:[0-9a-fA-F]{2}){5}$")


@dataclass(slots=True)
class HotspotClient:
    mac_address: str
    ip_address: str | None = None
    signal_strength: int | None = None


class HotspotMonitor:
    def __init__(
        self,
        interface: str,
        poll_interval: float = 5.0,
        fallback: bool = True,
    ) -> None:
        self.interface = interface
        self.poll_interval = poll_interval
        self.fallback = fallback
        self._task: asyncio.Task[None] | None = None
        self._subscribers: list[asyncio.Queue[list[HotspotClient]]] = []

    async def start(self) -> None:
        if self._task and not self._task.done():
            return
        self._task = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self._task
            self._task = None

    async def subscribe(self) -> AsyncIterator[list[HotspotClient]]:
        queue: asyncio.Queue[list[HotspotClient]] = asyncio.Queue(maxsize=1)
        self._subscribers.append(queue)
        try:
            while True:
                yield await queue.get()
        finally:
            self._subscribers.remove(queue)

    async def poll_once(self) -> list[HotspotClient]:
        cmd = [arg.format(interface=self.interface) for arg in HOSTAPD_CMD]
        try:
            return await self._exec_and_parse(cmd, parse_hostapd_output)
        except FileNotFoundError:
            logger.debug("hostapd_cli not found; attempting iw fallback")
            if not self.fallback:
                raise

        except RuntimeError as exc:
            logger.warning("hostapd_cli polling failed: %s", exc)
            if not self.fallback:
                raise

        fallback_cmd = [arg.format(interface=self.interface) for arg in IW_CMD]
        return await self._exec_and_parse(fallback_cmd, parse_iw_output)

    async def _run_loop(self) -> None:
        while True:
            snapshot = await self.poll_once()
            await self._broadcast(snapshot)
            await asyncio.sleep(self.poll_interval)

    async def _broadcast(self, snapshot: list[HotspotClient]) -> None:
        for queue in self._subscribers:
            if queue.full():
                with contextlib.suppress(asyncio.QueueFull):
                    queue.get_nowait()
            await queue.put(snapshot)

    async def _exec_and_parse(
        self,
        command: Iterable[str],
        parser: Callable[[str], list[HotspotClient]],
    ) -> list[HotspotClient]:
        process = await asyncio.create_subprocess_exec(
            *command,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await process.communicate()
        if process.returncode != 0:
            raise RuntimeError(
                f"Command {' '.join(command)} failed: {stderr.decode().strip()}"
            )
        return parser(stdout.decode())


def parse_hostapd_output(payload: str) -> list[HotspotClient]:
    clients: list[HotspotClient] = []
    current_mac: str | None = None
    signal: int | None = None
    ip_address: str | None = None

    for line in payload.splitlines():
        line = line.strip()
        if not line:
            continue
        if MAC_PATTERN.match(line):
            if current_mac:
                clients.append(
                    HotspotClient(
                        mac_address=current_mac,
                        ip_address=ip_address,
                        signal_strength=signal,
                    )
                )
            current_mac = line
            signal = None
            ip_address = None
            continue
        if line.startswith("signal=") or line.startswith("signal:"):
            try:
                value = line.split("=", 1)[1] if "=" in line else line.split(":", 1)[1]
                signal = int(value.strip().split()[0])
            except ValueError:
                signal = None
        if line.startswith("ip_addr="):
            ip_address = line.split("=", 1)[1].strip()

    if current_mac:
        clients.append(
            HotspotClient(
                mac_address=current_mac, ip_address=ip_address, signal_strength=signal
            )
        )

    return clients


def parse_iw_output(payload: str) -> list[HotspotClient]:
    clients: list[HotspotClient] = []
    current_mac: str | None = None
    signal: int | None = None

    for line in payload.splitlines():
        line = line.strip()
        if line.startswith("Station"):
            if current_mac:
                clients.append(
                    HotspotClient(mac_address=current_mac, signal_strength=signal)
                )
            current_mac = line.split()[1]
            signal = None
        elif "signal:" in line:
            parts = line.split()
            try:
                signal = int(parts[1])
            except (IndexError, ValueError):
                signal = None

    if current_mac:
        clients.append(HotspotClient(mac_address=current_mac, signal_strength=signal))

    return clients
