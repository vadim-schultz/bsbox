#!/usr/bin/env bash
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "This script must be run as root" >&2
  exit 1
fi

apt-get update
apt-get install -y hostapd dnsmasq network-manager
systemctl disable --now hostapd dnsmasq

install -m 644 infrastructure/templates/hostapd.conf.j2 /etc/hostapd/hostapd.conf
install -m 644 infrastructure/templates/dnsmasq.conf.j2 /etc/dnsmasq.d/hotspot.conf

systemctl enable --now hostapd dnsmasq

