# CampusConnect — API Reference

Base URL: `http://localhost:3001/api`

---

## Authentication

### `POST /auth/login`
- **Body**: `{ "email": "admin@campusconnect.local", "password": "admin123" }`
- **Response**: `{ "success": true, "data": { "token": "...", "user": { ... } } }`

### `GET /auth/me`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: User profile data.

---

## Campus Map

### `GET /map`
- **Response**: Active campus map with all locations, paths, and destination Q&A.

### `POST /map/save`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "name": "Main Campus", "locations": [...], "paths": [...] }`
- **Response**: Saves visual map to database, increments map version, and emits `map:updated` via WebSocket to connected robots.

---

## Locations & Paths

### `GET /locations`
- List all campus locations.

### `POST /locations`
- Create a new campus location (`START`, `DESTINATION`, `WAYPOINT`).

### `PUT /locations/:id`
- Update location name, type, coordinates, or QR ID.

### `DELETE /locations/:id`
- Delete location.

### `POST /paths`
- Create a directional path segment between two locations.

### `DELETE /paths/:id`
- Delete path segment.

---

## Destination Q&A

### `GET /destinations/:locationId/info`
- Retrieve all question and answer pairs for a destination.

### `POST /destinations/:locationId/info`
- Add a new question & answer pair.

### `DELETE /destinations/info/:id`
- Delete Q&A pair.

---

## Robot Telemetry & Navigation

### `GET /robot/status`
- Live robot status (state, location, direction, battery, obstacle status, QR status).

### `POST /robot/status`
- **Headers**: `x-robot-token: <ROBOT_TOKEN>`
- Update robot state and telemetry.

### `GET /robot/logs`
- Retrieve chronological navigation logs.

### `POST /navigation/command`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "command": "GOTO" | "STOP" | "RETURN_HOME", "destination": "Library" }`
- Dispatches manual navigation mission to robot over WebSocket.
