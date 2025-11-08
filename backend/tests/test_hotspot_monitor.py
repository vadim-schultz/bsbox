from app.utils.hotspot_monitor import HotspotClient, parse_hostapd_output, parse_iw_output


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

