# EMQX MySQL Bridge

This service is the unified backend for Project 008. It receives ESP32-C3 and
RS485 measurements forwarded by EMQX, stores normalized records in MySQL, and
provides APIs for the dashboard, administration console, Android client, and
WeChat Mini Program.

## Responsibilities

- MQTT/EMQX HTTP ingestion
- gateway and RS485 device registration
- soil and air measurement storage
- plant, pot, and sensor-binding management
- JSON, CSV, and Excel dataset export
- role-based authentication and account management
- leaf-image upload and phenotypic measurement
- health, archive, disk, and runtime monitoring

## Configuration

The service reads configuration from environment variables. Copy
`.env.example` into your deployment configuration system and replace every
sample value. The application does not load `.env` automatically.

The following variables must be configured for a new environment:

- `IOT_DB_HOST`, `IOT_DB_PORT`, `IOT_DB_USER`, `IOT_DB_PASSWORD`, `IOT_DB_NAME`
- `IOT_ADMIN_PASSWORD`, `IOT_VIEWER_PASSWORD`
- mail variables when alert delivery is enabled

If the two initial account passwords are absent, the service deliberately skips
default-user creation.

## Run

```powershell
npm ci
npm start
```

The default listen port is `3001`. A successful instance responds at:

```text
GET /api/health
```

## Main routes

- `POST /emqx_to_mysql`
- `GET /api/device/list`
- `GET /api/sensor/latest`
- `GET /api/sensor/history`
- `GET /api/dashboard/overview`
- `GET /api/plants`
- `GET /api/pots`
- `GET /api/bindings/current`
- `GET /api/dataset/export`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/leaf/image/analyze`

Database structure is documented in
[`../../mysql/schema.sql`](../../mysql/schema.sql).

