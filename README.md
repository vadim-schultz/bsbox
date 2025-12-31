# Muda Meter

Litestar backend with a React + TypeScript + Chakra UI v3 frontend.

Real-time meeting engagement tracking with location and Microsoft Teams integration.

## Features

- **Real-time engagement tracking** - Participants can mark themselves as speaking, engaged, or not engaged
- **Meeting location management** - Associate meetings with cities and meeting rooms
- **Microsoft Teams integration** - Link meetings to Teams calls via URL or meeting ID
- **Automatic meeting bucketing** - Groups participants into 15-minute time slots
- **Live engagement charts** - Visual representation of meeting engagement over time
- **Session persistence** - Meeting selections saved across page refreshes

## Layout

- `backend/` — Litestar API, tests, and helper scripts (see `backend/README.md`).
- `frontend/` — Vite React + TS app using Chakra UI v3 with feature-first folders.
  - `src/features/meeting/{containers,components,services,types,hooks}`
- `scripts/` — project-level helpers (e.g., `build_and_serve.py`).

## Quick start (backend only)

```bash
cd backend
python scripts/start_app.py
```

## Frontend dev

```bash
cd frontend
npm install
npm run dev  # Vite proxy handles API routing to backend on port 8000
```

## Build and serve everything

```bash
python scripts/build_and_serve.py
```

The script installs backend deps, runs tests, installs frontend deps, builds the Vite app, then serves the built assets from the backend at `/` while keeping API routes intact.

## Demo engagement simulator

From `backend/`, the engagement simulator drives the UI and API with synthetic status updates:

```bash
python -m scripts.demo  # continuous loop until interrupted
```

Behavior:
- Runs continuous meeting cycles with a short delay between them
- Uses 10 participants and fixed fingerprints so IDs stay stable across restarts
- Duration, tick interval, delay, and participant count are defined as constants in `backend/scripts/demo.py`

## Meeting Location & MS Teams Setup

### Creating Cities and Rooms

```bash
# Create a city
curl -X POST http://localhost:8000/cities \
  -H "Content-Type: application/json" \
  -d '{"name":"Berlin"}'

# Create a meeting room
curl -X POST http://localhost:8000/meeting-rooms \
  -H "Content-Type: application/json" \
  -d '{"name":"Conference Room A","city_id":"YOUR_CITY_ID"}'
```

### Supported Microsoft Teams Formats

The system automatically parses three types of Teams meeting identifiers:

1. **Old URL format** (pre-2024):
   ```
   https://teams.microsoft.com/meetup-join/19%3ameeting_xxx%40thread.v2/1234567890
   ```

2. **New URL format** (2024+):
   ```
   https://teams.microsoft.com/meet/abc123def?p=xyz
   ```

3. **Numeric meeting ID**:
   ```
   385 562 023 120 47
   ```

### API Documentation

See [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md) for detailed API reference.

### Testing Results

See [`TESTING_RESULTS.md`](TESTING_RESULTS.md) for comprehensive test coverage report.

## Database Migrations

```bash
cd backend
alembic upgrade head  # Apply migrations
alembic current      # Check current version
```

Latest migration: `0004_add_location_teams` - Adds city, meeting room, and Teams metadata support.
