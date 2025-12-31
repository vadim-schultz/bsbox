# API Documentation - Meeting Location & MS Teams Integration

This document describes the new API endpoints added for city, meeting room, and Microsoft Teams integration.

---

## Cities API

### GET /cities

Returns a list of all cities.

**Response:**
```json
[
  {
    "id": "uuid-string",
    "name": "Berlin"
  },
  {
    "id": "uuid-string",
    "name": "London"
  }
]
```

**Status Codes:**
- `200 OK` - Success

---

### POST /cities

Creates a new city.

**Request Body:**
```json
{
  "name": "Berlin"
}
```

**Response:**
```json
{
  "id": "uuid-string",
  "name": "Berlin"
}
```

**Status Codes:**
- `200 OK` - City created successfully
- `400 Bad Request` - City already exists or invalid name

**Validation:**
- Name must be 1-128 characters
- Name is trimmed of whitespace
- Duplicate names are rejected

---

## Meeting Rooms API

### GET /meeting-rooms

Returns a list of meeting rooms for a specific city.

**Query Parameters:**
- `city_id` (required) - UUID of the city

**Example:**
```
GET /meeting-rooms?city_id=ded0ed3f-4533-4a4d-85a3-bcff3ba5d06e
```

**Response:**
```json
[
  {
    "id": "uuid-string",
    "name": "Conference Room A",
    "city_id": "uuid-string"
  },
  {
    "id": "uuid-string",
    "name": "Boardroom",
    "city_id": "uuid-string"
  }
]
```

**Status Codes:**
- `200 OK` - Success (may be empty array)
- `400 Bad Request` - Missing or invalid city_id

---

### POST /meeting-rooms

Creates a new meeting room.

**Request Body:**
```json
{
  "name": "Conference Room A",
  "city_id": "uuid-string"
}
```

**Response:**
```json
{
  "id": "uuid-string",
  "name": "Conference Room A",
  "city_id": "uuid-string"
}
```

**Status Codes:**
- `200 OK` - Room created successfully
- `400 Bad Request` - Invalid data or room already exists in this city

**Validation:**
- Name must be 1-128 characters
- Name is trimmed of whitespace
- City must exist
- Room name + city_id combination must be unique

---

## Meetings API (Updated)

### GET /meetings/{meeting_id}

Retrieves a meeting with participants and location/Teams metadata.

**Response:**
```json
{
  "id": "uuid-string",
  "start_ts": "2025-12-21T14:00:00",
  "end_ts": "2025-12-21T15:00:00",
  "city_id": "uuid-string",
  "city_name": "Berlin",
  "meeting_room_id": "uuid-string",
  "meeting_room_name": "Conference Room A",
  "ms_teams_thread_id": "19:meeting_abc123@thread.v2",
  "ms_teams_meeting_id": "abc123def",
  "ms_teams_invite_url": "https://teams.microsoft.com/...",
  "participants": [...]
}
```

**New Fields:**
- `city_id` - UUID of the city (optional)
- `city_name` - Name of the city (optional, computed from relationship)
- `meeting_room_id` - UUID of the meeting room (optional)
- `meeting_room_name` - Name of the room (optional, computed)
- `ms_teams_thread_id` - Extracted from old Teams URL format (optional)
- `ms_teams_meeting_id` - Extracted from new Teams URL or numeric ID (optional)
- `ms_teams_invite_url` - Raw Teams invite URL (optional)

---

## Visit API (Updated)

### POST /visit

Creates or joins a meeting and returns participant information.

**Request Body (Enhanced):**
```json
{
  "device_fingerprint": "unique-device-id",
  "city_id": "uuid-string",
  "meeting_room_id": "uuid-string",
  "ms_teams_input": "https://teams.microsoft.com/meet/abc123 or 385 562 023 120 47"
}
```

**New Optional Fields:**
- `city_id` - UUID of the city for this meeting
- `meeting_room_id` - UUID of the meeting room
- `ms_teams_input` - Teams invite URL or numeric meeting ID

**Response:**
```json
{
  "meeting_id": "uuid-string",
  "participant_id": "uuid-string",
  "participant_expires_at": "2025-12-21T15:00:00",
  "meeting_start": "2025-12-21T14:00:00",
  "meeting_end": "2025-12-21T15:00:00"
}
```

**MS Teams Input Formats:**

The `ms_teams_input` field accepts three formats:

1. **Old Teams URL format** (pre-2024):
   ```
   https://teams.microsoft.com/meetup-join/19%3ameeting_xxx%40thread.v2/1234567890
   ```
   Extracts: `thread_id` = `19:meeting_xxx@thread.v2`

2. **New Teams URL format** (2024+):
   ```
   https://teams.microsoft.com/meet/abc123def?p=xyz
   ```
   Extracts: `meeting_id` = `abc123def`

3. **Numeric meeting ID**:
   ```
   385 562 023 120 47
   ```
   Extracts: `meeting_id` = `38556202312047` (spaces removed)

The parser automatically detects the format and extracts the appropriate identifiers.

**Behavior:**

- Meetings are grouped by 15-minute time buckets (rounded up to nearest quarter hour)
- If a meeting already exists for the current bucket, the participant joins that meeting
- Location and Teams metadata are only added if the meeting doesn't already have them (first-come wins)
- Multiple participants can join the same meeting
- Participants expire after the meeting end time

---

## Database Schema

### cities table

| Column | Type | Constraints |
|--------|------|-------------|
| id | String(36) | Primary Key, UUID |
| name | String(128) | Unique, Not Null |
| created_at | DateTime | Not Null, Default: now() |

**Indexes:**
- Primary key on `id`
- Unique constraint on `name`

---

### meeting_rooms table

| Column | Type | Constraints |
|--------|------|-------------|
| id | String(36) | Primary Key, UUID |
| name | String(128) | Not Null |
| city_id | String(36) | Foreign Key (cities.id), Not Null |
| created_at | DateTime | Not Null, Default: now() |

**Indexes:**
- Primary key on `id`
- Index on `city_id`
- Unique constraint on `(name, city_id)`

**Relationships:**
- Many-to-One with `cities` (a room belongs to one city)

---

### meetings table (updated)

New columns added:

| Column | Type | Constraints |
|--------|------|-------------|
| city_id | String(36) | Foreign Key (cities.id), Nullable |
| meeting_room_id | String(36) | Foreign Key (meeting_rooms.id), Nullable |
| ms_teams_thread_id | String(256) | Nullable |
| ms_teams_meeting_id | String(64) | Nullable |
| ms_teams_invite_url | String(512) | Nullable |

**New Indexes:**
- Index on `city_id`
- Index on `meeting_room_id`

**Relationships:**
- Many-to-One with `cities` (a meeting can have one city)
- Many-to-One with `meeting_rooms` (a meeting can have one room)

---

## Migration Guide

### Running the Migration

```bash
cd backend
alembic upgrade head
```

**Migration:** `0004_add_location_teams`

**What it does:**
1. Creates `cities` table
2. Creates `meeting_rooms` table with foreign key to cities
3. Adds location and Teams columns to `meetings` table
4. Creates necessary indexes

**Rollback:**
```bash
alembic downgrade -1
```

**Important Notes:**
- The migration is safe to run on existing databases
- Existing meetings will have NULL values for new columns
- The migration uses SQLite-compatible syntax (table recreation)
- All changes are backward compatible

---

## Error Codes

### 400 Bad Request

**Causes:**
- Invalid or missing required fields
- Duplicate city name
- Duplicate room name in same city
- City not found when creating room
- Invalid city_id or meeting_room_id format

**Example Response:**
```json
{
  "status_code": 400,
  "detail": "City already exists"
}
```

### 404 Not Found

**Causes:**
- Meeting not found
- City not found
- Room not found

### 500 Internal Server Error

**Causes:**
- Database connection error
- Unexpected server error

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding rate limiting for production deployments:
- Cities creation: 10 requests/minute per IP
- Room creation: 20 requests/minute per IP
- Visit endpoint: 100 requests/minute per device_fingerprint

---

## Security Considerations

1. **Input Validation:** All inputs are validated on the backend
2. **SQL Injection:** Prevented by SQLAlchemy ORM
3. **XSS:** Frontend uses React's built-in escaping
4. **CORS:** Configure appropriately for production
5. **Authentication:** Consider adding authentication for city/room management endpoints

---

## Examples

### Creating a complete meeting setup

```bash
# 1. Create a city
curl -X POST http://localhost:8000/cities \
  -H "Content-Type: application/json" \
  -d '{"name":"Berlin"}'
# Response: {"id":"uuid-1","name":"Berlin"}

# 2. Create a meeting room
curl -X POST http://localhost:8000/meeting-rooms \
  -H "Content-Type: application/json" \
  -d '{"name":"Conference Room A","city_id":"uuid-1"}'
# Response: {"id":"uuid-2","name":"Conference Room A","city_id":"uuid-1"}

# 3. Create a meeting with location and Teams
curl -X POST http://localhost:8000/visit \
  -H "Content-Type: application/json" \
  -d '{
    "device_fingerprint":"my-device",
    "city_id":"uuid-1",
    "meeting_room_id":"uuid-2",
    "ms_teams_input":"https://teams.microsoft.com/meet/abc123"
  }'
# Response: {"meeting_id":"uuid-3", ...}

# 4. Verify the meeting has metadata
curl http://localhost:8000/meetings/uuid-3
# Response includes city_name, meeting_room_name, ms_teams_meeting_id
```

---

## Frontend Integration

The frontend automatically:
1. Fetches cities on mount
2. Fetches rooms when a city is selected
3. Validates Teams URL/ID input in real-time
4. Persists selections to sessionStorage
5. Allows navigation back to change location

See `frontend/src/features/meeting/` for implementation details.

