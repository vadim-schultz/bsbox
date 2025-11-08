import asyncio

import pytest

from app.utils.hotspot_monitor import HotspotClient, HotspotMonitor, parse_hostapd_output, parse_iw_output


def test_parse_hostapd_output_single_client():
    payload = """
    02:11:22:33:44:55
        signal=-45
        ip_addr=192.168.12.20
    """
    clients = parse_hostapd_output(payload)
    assert clients == [
        HotspotClient(mac_address="02:11:22:33:44:55", ip_address="192.168.12.20", signal_strength=-45)
    ]


def test_parse_iw_output_multiple_clients():
    payload = """
    Station aa:bb:cc:dd:ee:ff (on wlan0)
        signal: -50 dBm
    Station 11:22:33:44:55:66 (on wlan0)
        signal: -65 dBm
    """
    clients = parse_iw_output(payload)
    assert clients[0].mac_address == "aa:bb:cc:dd:ee:ff"
    assert clients[0].signal_strength == -50
    assert clients[1].mac_address == "11:22:33:44:55:66"
    assert clients[1].signal_strength == -65


@pytest.mark.asyncio
async def test_poll_once_prefers_hostapd(monkeypatch):
    calls: list[str] = []

    async def fake_exec(self, command, parser):
        calls.append(" ".join(command))
        return [HotspotClient(mac_address="aa:bb:cc:dd:ee:ff")]

    monkeypatch.setattr(HotspotMonitor, "_exec_and_parse", fake_exec, raising=False)

    monitor = HotspotMonitor(interface="wlan0")
    snapshot = await monitor.poll_once()

    assert snapshot[0].mac_address == "aa:bb:cc:dd:ee:ff"
    assert calls[0].startswith("hostapd_cli")


@pytest.mark.asyncio
async def test_poll_once_falls_back_to_iw(monkeypatch):
    attempts = 0

    async def fake_exec(self, command, parser):
        nonlocal attempts
        attempts += 1
        cmd = " ".join(command)
        if "hostapd_cli" in cmd:
            raise RuntimeError("hostapd failure")
        return [HotspotClient(mac_address="11:22:33:44:55:66")]

    monkeypatch.setattr(HotspotMonitor, "_exec_and_parse", fake_exec, raising=False)

    monitor = HotspotMonitor(interface="wlan0")
    snapshot = await monitor.poll_once()

    assert attempts == 2
    assert snapshot[0].mac_address == "11:22:33:44:55:66"


@pytest.mark.asyncio
async def test_broadcast_overwrites_full_queue(monkeypatch):
    monitor = HotspotMonitor(interface="wlan0")
    queue: asyncio.Queue[list[HotspotClient]] = asyncio.Queue(maxsize=1)
    await queue.put([HotspotClient(mac_address="stale")])

    monitor._subscribers.append(queue)
    try:
        await monitor._broadcast([HotspotClient(mac_address="fresh")])
        latest = await queue.get()
        assert latest[0].mac_address == "fresh"
    finally:
        monitor._subscribers.clear()

