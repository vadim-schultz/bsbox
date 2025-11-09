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
8. [Deployment](#deployment)
9. [Operations & Monitoring](#operations--monitoring)
10. [Troubleshooting](#troubleshooting)

## Architecture Overview
- **Backend (`backend/`)**: Litestar application with SQLModel/SQLAlchemy, SQLite defaults, optional hotspot polling utilities, and built-in static serving for the compiled frontend.
- **Frontend (`frontend/`)**: Lightweight Preact + Vite application with Chart.js visualizations driven by REST polling.
- **Scripts (`scripts/`)**: Helper scripts for local development, combined dev server, and Raspberry Pi deployment.
- **Automation**: `tox` orchestrates backend lint/type/test tasks; additional tooling can hook into the new npm workflow as needed.

## Hardware & Prerequisites
- Raspberry Pi 3 Model B (or newer) with built-in Wi-Fi.
- 16 GB microSD card (Class 10) and power supply.
- External USB Ethernet adapter (recommended for first-time provisioning).
- Development machine with:
  - Python 3.11 or 3.12 (3.13 currently unsupported because `asyncpg` lacks wheels)
  - Node.js 20+ (npm included)
- Optional infrastructure:
  - PostgreSQL 15 server (can run on Pi or external host).

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
1. Install Node.js 20 (includes npm).
2. Build the UI:
   ```bash
   cd /opt/meeting-hotspot/frontend
   npm install --omit=dev
   npm run build
   ```
   The build output lives in `frontend/dist` and is served directly by the backend.
3. If you prefer to host the static assets separately (e.g., behind Caddy/NGINX), point the web server at `frontend/dist` after running the build step above.

## Local Development

### Backend quick start
```bash
./scripts/dev_backend.sh
```
The script creates/activates `backend/.venv`, installs the backend in editable mode, and starts a reload-enabled Uvicorn server on `http://127.0.0.1:8000`.

To run the same steps manually:
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:create_app --reload
```

### Frontend quick start
```bash
./scripts/dev_frontend.sh
```
This installs npm dependencies (if missing) and launches Vite on `http://127.0.0.1:5173` (use `FRONTEND_PORT` / `FRONTEND_HOST` to override).

### Run both services with one command
```bash
python scripts/run_dev.py
```
`run_dev.py` ensures backend/frontend dependencies are installed, spawns the backend on port 8000 and Vite on port 5173, and wires `VITE_API_BASE` to the backend URL. Use `--backend-port`, `--frontend-port`, or `--api-base` to customise the setup.

### Meeting simulators
- **Frontend toggles** – The Preact UI exposes the speaking/relevance controls for captured visitors.
- **Direct API exercise** – From the backend venv:
  ```bash
  source backend/.venv/bin/activate
  python -m app.scripts.simulate_activity burst --participants 4 --iterations 5 --echo
  ```
- **Hotspot polling emulation** – Feed saved JSON into the poller:
  ```bash
  python -m app.scripts.poller --sample backend/samples/sample_clients.json --interval 10
  ```
  `sample_clients.json` should be an array of objects with `mac_address` and optional `signal_strength` fields. Without `--sample`, the script attempts to call `iw`/`nmcli` on the configured interface.

### Installing required tooling on macOS
1. **Python 3.12 (or 3.11)**
   ```bash
   brew install python@3.12
   ```
2. **Node.js 20+**
   ```bash
   brew install node@20
   ```
   npm is bundled with Node and is used for all frontend commands.

### Tox shortcuts
- `tox run -e py311-lint` – Ruff lint (backend).
- `tox run -e py311-type` – mypy strict checks.
- `tox run -e py311-test` – pytest with coverage.

For the frontend, use npm directly (`npm run build`, `npm run dev`).

## Deployment

### Raspberry Pi quick deploy
1. Sync the repository to the Pi (`/opt/meeting-hotspot` recommended).
2. Run the helper script:
   ```bash
   cd /opt/meeting-hotspot
   ./scripts/pi_deploy.sh
   ```
   The script creates `backend/.venv`, installs backend dependencies, runs Alembic migrations, installs npm dependencies, and builds the frontend into `frontend/dist`.

### Running the service
After `scripts/pi_deploy.sh` finishes:
```bash
source backend/.venv/bin/activate
uvicorn app.main:create_app --host 0.0.0.0 --port 8000
```
The Litestar app serves both the JSON API and the compiled frontend assets from `frontend/dist`.

### Optional systemd unit
```
[Unit]
Description=Meeting Hotspot Backend
After=network.target

[Service]
WorkingDirectory=/opt/meeting-hotspot/backend
Environment="PYTHONPATH=/opt/meeting-hotspot/backend"
ExecStart=/opt/meeting-hotspot/backend/.venv/bin/uvicorn app.main:create_app --host 0.0.0.0 --port 8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```
Enable with `sudo systemctl enable --now meeting-backend.service`.

## Operations & Monitoring
- Collect hotspot snapshots on demand:
  ```bash
  source backend/.venv/bin/activate
  python -m app.scripts.poller --sample backend/samples/sample_clients.json --interval 5
  ```
- Inspect current analytics without the UI:
  ```bash
  source backend/.venv/bin/activate
  python -m app.scripts.simulate_activity snapshot --include-history --history-limit 5
  ```
- SQLite quick look:
  ```bash
  sqlite3 backend/meeting_hotspot.db 'SELECT * FROM meetings LIMIT 5;'
  ```

## Troubleshooting
- **Frontend serves stale data** – Rebuild assets with `npm run build` and restart the backend (it serves whatever sits in `frontend/dist`).
- **Dependency churn** – Delete `backend/.venv` or `frontend/node_modules` and rerun the helper scripts (`dev_backend.sh`, `dev_frontend.sh`, or `scripts/run_dev.py`).
- **Port conflicts** – Pass `--backend-port` / `--frontend-port` to `scripts/run_dev.py`, or set `BACKEND_PORT` / `FRONTEND_PORT` when running the individual scripts.
  
> On first use, run `chmod +x scripts/*.sh` to ensure the shell helpers are executable.
  