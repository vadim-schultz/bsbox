# Meeting Hotspot Analytics

Raspberry Pi–ready hotspot gateway that tracks meeting attendance, speaking participation, and perceived relevance. The device exposes a captive portal where participants self-identify their status and feeds metrics into a Litestar backend for analysis.

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Hardware & Prerequisites](#hardware--prerequisites)
3. [Prepare Raspberry Pi OS](#prepare-raspberry-pi-os)
4. [Hotspot & Captive Portal Setup](#hotspot--captive-portal-setup)
5. [Backend Service](#backend-service)
6. [Frontend Application](#frontend-application)
7. [Local Development](#local-development)
8. [Deployment Automation](#deployment-automation)
9. [Operations & Monitoring](#operations--monitoring)
10. [Troubleshooting](#troubleshooting)

## Architecture Overview
- **Backend (`backend/`)**: Litestar application with controller/service/repository architecture, SQLModel ORM (PostgreSQL primary, SQLite fallback), Redis for transient metrics, background polling of hotspot connections.
- **Frontend (`frontend/`)**: Smartphone-first Vite + React + TypeScript SPA using Mantine + Tailwind UI, Zustand-ready hooks, React Query + SSE for realtime data, and Chart.js for historical visualizations.
- **Networking (`infrastructure/`)**: Jinja templates for `hostapd` and `dnsmasq`, scripts to monitor connected clients via `iw`/`nmcli`.
- **Deployment (`deployment/`)**: Bash helpers and Ansible playbooks to provision Raspberry Pi, configure hotspot, and manage systemd units.
- **Automation**: `tox` orchestrates linting, type checks, tests, builds, and security scans across backend and frontend. GitHub Actions runs the same suite.

## Hardware & Prerequisites
- Raspberry Pi 3 Model B (or newer) with built-in Wi-Fi.
- 16 GB microSD card (Class 10) and power supply.
- External USB Ethernet adapter (recommended for first-time provisioning).
- Development machine with:
  - Python 3.11 (3.12 works; 3.13 currently unsupported because `asyncpg` lacks wheels)
  - Node.js 20+ (Corepack enabled for pnpm)
  - Ansible 2.15+
- Optional infrastructure:
  - PostgreSQL 15 server (can run on Pi or external host).
  - Redis 7 server (local to Pi recommended).

## Prepare Raspberry Pi OS
1. Download the latest Raspberry Pi OS Lite image.
2. Flash the image to the microSD using `rpi-imager` or `balenaEtcher`.
3. For headless setup:
   - Create an empty `ssh` file at the boot partition root.
   - Create `wpa_supplicant.conf` with temporary Wi-Fi credentials (if needed).
4. Boot the Pi and SSH into it: `ssh pi@raspberrypi.local` (default password `raspberry`).
5. Run initial updates:
   ```bash
   sudo apt update && sudo apt full-upgrade -y
   sudo raspi-config nonint do_change_locale en_US.UTF-8
   sudo raspi-config nonint do_change_timezone Etc/UTC
   ```
6. Optionally change the hostname:
   ```bash
   sudo raspi-config nonint do_hostname meeting-hotspot
   ```

## Hotspot & Captive Portal Setup
The project relies on `hostapd` and `dnsmasq` to broadcast a Wi-Fi network and enforce a captive portal redirect.

### Manual Setup (quick start)
```bash
sudo apt install -y hostapd dnsmasq network-manager
sudo systemctl disable --now hostapd dnsmasq

# Copy configuration templates (replace ssid/passphrase placeholders)
sudo cp infrastructure/templates/hostapd.conf.j2 /etc/hostapd/hostapd.conf
sudo cp infrastructure/templates/dnsmasq.conf.j2 /etc/dnsmasq.d/hotspot.conf

sudo systemctl enable --now hostapd dnsmasq
```
Customize `hostapd.conf.j2` variables `hotspot_ssid`, `hotspot_passphrase`, and ensure `hotspot_interface` matches the Pi wireless adapter (usually `wlan0`).

### Captive Portal Redirect
- Configure `dnsmasq` wildcard `address=/#/192.168.12.1`.
- Serve the frontend on the same host and expose via Nginx or Caddy to respond to `http://neverssl.com` style requests.
- Optionally leverage `nodogsplash` or `coova-chilli` for advanced captive portal enforcement.

## Backend Service
1. Copy the repository onto the Pi at `/opt/meeting-hotspot`.
2. Install dependencies (system packages):
   ```bash
   sudo apt install -y python3.11 python3.11-venv redis-server libpq-dev
   ```
3. Configure environment variables in `/opt/meeting-hotspot/backend/.env`:
   ```
   ENVIRONMENT=production
   DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/meeting_hotspot
   REDIS_URL=redis://localhost:6379/0
   HOTSPOT_INTERFACE=wlan0
   MEETING_THRESHOLD=3
   MEETING_WINDOW_MINUTES=5
   POLL_INTERVAL_SECONDS=10
   HISTORY_LIMIT=12
   POLLING_ENABLED=true
   ```
4. Create virtual environment and install dependencies:
   ```bash
   cd /opt/meeting-hotspot/backend
   python -m venv .venv
   source .venv/bin/activate
   pip install -U pip
   pip install -e .
   ```
5. Run database migrations:
   ```bash
   alembic upgrade head
   ```
6. Start the service (development):
   ```bash
   litestar --app app.main:create_app run --host 0.0.0.0 --port 8000
   ```
7. Systemd unit template (`/etc/systemd/system/meeting-backend.service`):
   ```
   [Unit]
   Description=Meeting Hotspot Backend
   After=network.target

   [Service]
   WorkingDirectory=/opt/meeting-hotspot/backend
   EnvironmentFile=/opt/meeting-hotspot/backend/.env
   ExecStart=/opt/meeting-hotspot/backend/.venv/bin/litestar --app app.main:create_app run --host 0.0.0.0 --port 8000
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

## Frontend Application
1. Install Node.js 20 and pnpm:
   ```bash
   curl -fsSL https://get.pnpm.io/install.sh | sh -
   ```
2. Build the SPA:
   ```bash
   cd /opt/meeting-hotspot/frontend
   pnpm install
   pnpm build
   ```
3. Serve via static HTTP server (Caddy/NGINX recommended). Example systemd unit using `serve`:
   ```
   [Unit]
   Description=Meeting Hotspot Frontend
   After=network.target

   [Service]
   WorkingDirectory=/opt/meeting-hotspot/frontend
   ExecStart=/usr/bin/serve -s dist -l 3000
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```
4. Configure captive portal redirect to `http://192.168.12.1:3000`.

## Local Development
```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
litestar --app app.main:create_app run --reload

# Frontend
cd frontend
pnpm install
pnpm dev
```
Use `docker-compose` or external Redis/PostgreSQL as required.

### Tox Tasks
- `tox run -e py311-lint` – Ruff lint (backend).
- `tox run -e py311-type` – mypy strict checks.
- `tox run -e py311-test` – pytest with coverage.
- `tox run -e node20-lint` – ESLint for frontend.
- `tox run -e node20-type` – TypeScript `--noEmit`.
- `tox run -e node20-test` – Vitest suite.
- `tox run -e security` – `pip-audit` dependency scan.
- Ensure all tox environments pass before creating a release candidate.

### Generating Lockfiles
- Backend: `cd backend && poetry lock`
- Frontend: `cd frontend && pnpm install --frozen-lockfile`

## Deployment Automation
- Update `deployment/ansible/inventory.ini` (create file) with your Pi host(s).
- Secure secrets with `ansible-vault`.
- Dry-run the playbook:
  ```bash
  ansible-playbook -i deployment/ansible/inventory.ini deployment/ansible/playbook.yml --check
  ```
- Apply changes:
  ```bash
  ansible-playbook -i deployment/ansible/inventory.ini deployment/ansible/playbook.yml
  ```
- Scripts in `deployment/scripts` offer quick bootstrap options (run as root).

## Operations & Monitoring
- Monitor hotspot clients:
  ```bash
  sudo python3 infrastructure/scripts/monitor_clients.py
  ```
- Track system metrics using `htop`, `iotop`. Consider enabling `prometheus-node-exporter` for remote monitoring.
- Configure log rotation via `/etc/logrotate.d/meeting-hotspot`.

## Testing Strategy
- **Backend**
  - Unit tests for repositories, services, and hotspot parsing (pytest, pytest-asyncio).
  - Integration tests with SQLite for local runs; configure PostgreSQL in CI using service containers.
  - Contract tests ensure Pydantic schemas remain backward compatible.
- **Frontend**
  - Component and hook tests with Vitest + Testing Library.
  - Browser automation (Playwright) for captive portal flow (optional CI job).
- **Hotspot Polling**
  - Fixture-based tests for `hostapd_cli` and `iw` parsing.
  - Scenario simulations verifying meeting threshold heuristics.
- **CI**
  - GitHub Actions executes all tox environments, caches dependencies, publishes coverage, and schedules nightly security scans and load checks.

## Troubleshooting
| Issue | Resolution |
| --- | --- |
| Clients connect but no redirect | Verify `dnsmasq` wildcard entry and that frontend is reachable on portal IP. |
| Backend fails to start | Confirm database/redis URLs and that migrations ran. Check `journalctl -u meeting-backend`. |
| Slow Pi performance | Disable unnecessary services, ensure swap is enabled, or schedule `systemctl restart` during off-hours. |
| Tox fails on frontend env | Ensure Node 20+ with Corepack enabled and pnpm installed. Delete `frontend/node_modules` and retry. |

## Contributing
- Follow `.cursor/rules` for backend, frontend, deployment, and commit standards.
- Use Conventional Commit messages generated from staged changes.
- Open PRs with associated issue references and CI green ✅.

