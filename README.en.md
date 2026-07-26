# Project 008 · Smart Agriculture IoT Experimental Data Platform

[中文说明](README.md)

A complete data-acquisition, device-management, visualization, and dataset
export platform for chrysanthemum experiments. It connects RS485 soil and air
sensors, ESP32-C3 gateways, MQTT/EMQX, Node.js, MySQL, a Vue dashboard, an
administration console, an Android application, and a WeChat Mini Program.

This repository is a reviewed publication copy of the active project. It keeps
the application source, structure-only database schema, firmware, and hardware
references while excluding production credentials, operational data, logs,
dependency caches, and generated artifacts.

## Data path

```text
RS485 soil and air sensors
          │
          ▼
ESP32-C3 SuperMini gateway
          │ Wi-Fi / MQTT
          ▼
        EMQX
          │ HTTP forwarding
          ▼
Node.js data and business service
          │
          ├── MySQL measurements, devices, plants, pots, and bindings
          ├── Vue monitoring dashboard
          ├── Web administration console
          ├── Android application
          └── WeChat Mini Program
```

## Production core

- `cloud/1_elder/Learning/demo4`: Vue 3 monitoring dashboard.
- `backend/emqx_mysql_bridge`: Node.js, Express, and MySQL backend.
- `esp32-c3-test/esp32-c3-test`: ESP32-C3 dual-RS485 gateway firmware.

The complete delivery also includes the administration console, Android
application, WeChat Mini Program, structure-only schema, STM32/ESP8266 reference
firmware, and a dual soil/air field-test project. See
[`docs/DELIVERY_SCOPE.md`](docs/DELIVERY_SCOPE.md).

## Capabilities

- dual-RS485 acquisition through ESP32-C3 gateways
- Wi-Fi, NTP, MQTT reconnect, and Modbus validation
- soil temperature, moisture, pH, EC, salinity, nitrogen, phosphorus, potassium
- air temperature, humidity, CO2, and illuminance
- raw EMQX payload retention and normalized MySQL storage
- gateway, device, plant, pot, and time-aware binding management
- latest values, history, dashboards, and JSON/CSV/Excel export
- role-based accounts and session management
- leaf-image calibration and phenotypic measurement
- health checks, caching, rate limiting, archives, disk monitoring, and alerts
- Vue, static administration, Android, and WeChat clients

## Experimental scale

- 130 chrysanthemum plants
- 100 control plants and 30 stress-treatment plants
- 130 planned soil sensors
- one planned air sensor
- two soil sensors per ESP32-C3 gateway

## Quick start

### Database

Create an empty MySQL 8 database and execute:

```text
mysql/schema.sql
```

The file contains structure only. It does not include measurements, accounts,
sessions, plant identifiers, or sensor-binding records.

### Backend

```powershell
cd backend\emqx_mysql_bridge
npm ci
npm start
```

Configure the variables described by `.env.example` in the shell, PM2, or
systemd environment. The service listens on port `3001` by default and exposes
`GET /api/health`.

Database and initial account passwords have no source-code defaults. A new
environment must provide them explicitly.

### Dashboard

```powershell
cd cloud\1_elder\Learning\demo4
npm ci
npm run build
```

### ESP32-C3 firmware

Open `esp32-c3-test/esp32-c3-test`, set local Wi-Fi, MQTT, and board indices in
`src/project_config.h`, then build with PlatformIO:

```powershell
platformio run
platformio run --target upload
```

### Android

```powershell
cd android\2_test_activity
.\gradlew.bat assembleDebug
```

### WeChat Mini Program

Open `miniProgramme/1_lxny` in WeChat DevTools. The checked-in AppID is the
visitor value; configure the production AppID through the local private
configuration before publishing.

## Publication boundary

The repository excludes production database, MQTT, Wi-Fi, SMTP, and server
credentials; account passwords and sessions; measurements and binding exports;
uploaded images; archives and logs; and dependency, IDE, or build caches.

## Technology

- ESP32-C3, RS485, Modbus RTU, Arduino, PlatformIO
- Node.js, Express, mysql2, Multer, Nodemailer
- MySQL 8
- Vue 3, Element Plus, ECharts, Axios
- Java and Android Gradle Plugin
- native WeChat Mini Program and Vant Weapp
- EMQX, PM2, and Nginx

## Publication validation

The reviewed copy was validated on 2026-07-26:

- backend dependencies installed successfully and `app.js` passed Node.js syntax
  checks
- the leaf-analysis Python script compiled successfully
- the live `/api/health` endpoint returned HTTP 200, `code=0`, and
  `server is running`
- the Vue dashboard completed a production build; warnings were limited to
  bundle-size recommendations
- the administration script and 20 Mini Program JavaScript files passed syntax
  checks
- both Android modules built successfully across 60 Gradle tasks
- the production ESP32-C3 gateway firmware built with 39,364 / 327,680 bytes of
  RAM and 774,660 / 1,310,720 bytes of flash
- the dual soil/air test firmware built with 39,324 / 327,680 bytes of RAM and
  776,696 / 1,310,720 bytes of flash

## Source

- Original workspace: `D:\download\aaaflowerdatabase\project\project`
- Series number: Project 008
- Publication mode: private GitHub repository
- Prepared: 2026-07-26
