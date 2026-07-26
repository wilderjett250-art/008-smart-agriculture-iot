# ESP32-C3 Soil Gateway

This firmware is now organized for manual batch flashing.

## Recommended workflow

You keep one main firmware and only change a few numeric fields before flashing each board.

This is the recommended approach for your project because:

- the coding workload stays very small
- you avoid changing the main logic 65 times
- the database numbering and firmware numbering can stay exactly the same
- local Modbus addresses do not need a global plan across all boards

## Fields to change before flashing

Edit only these three areas in [project_config.h](/D:/download/aaaflowerdatabase/project/project/esp32-c3-test/esp32-c3-test/src/project_config.h):

```cpp
constexpr uint16_t GATEWAY_INDEX = 1;
constexpr uint16_t DEVICE_INDEX_1 = 1;
constexpr uint16_t DEVICE_INDEX_2 = 2;
```

And keep the local RS485 addresses on each board as:

```cpp
constexpr DeviceConfig DEVICES[] = {
  {1, DEVICE_INDEX_1, true},
  {2, DEVICE_INDEX_2, true},
};
```

## Numbering rule

- Gateway code: `ESP32C3_001`
- First sensor on the board: `ESP32C3_001`
- Second sensor on the board: `ESP32C3_002`

Example for board 17:

```cpp
constexpr uint16_t GATEWAY_INDEX = 17;
constexpr uint16_t DEVICE_INDEX_1 = 33;
constexpr uint16_t DEVICE_INDEX_2 = 34;
```

This board will upload:

- `gateway_code = ESP32C3_017`
- `device_code = ESP32C3_033` for slave address `1`
- `device_code = ESP32C3_034` for slave address `2`

Recommended lab rule:

- every board uses only local slave addresses `1` and `2`
- every board gets one `GATEWAY_INDEX`
- every sensor gets one pre-planned `DEVICE_INDEX`
- the management console binds `device_code` to `plant_code` and `pot_code`

## Why this is efficient

- You do not touch the main logic
- You do not re-plan global Modbus addresses
- Every board can keep local slave addresses `1` and `2`
- The database device codes can be planned in advance
- The code you flash already matches the database numbering

## Current payload fields

```json
{
  "topic": "data/ESP32C3_017",
  "mqtt_client_id": "ESP32C3_017_client",
  "gateway_code": "ESP32C3_017",
  "device_code": "ESP32C3_033",
  "slave_addr": 1,
  "device_type": "soil_4in1",
  "msg_key": "soil_data",
  "temperature": 21.5,
  "humidity": 34.2,
  "ec": 128.6,
  "ph": 6.9,
  "collect_status": 1,
  "error_msg": null,
  "collected_at": "2026-04-04 09:30:00"
}
```

## EMQX rule SQL

```sql
SELECT
  topic,
  clientid AS mqtt_client_id,
  payload.msg_key AS msg_key,
  payload.gateway_code AS gateway_code,
  payload.device_code AS device_code,
  payload.slave_addr AS slave_addr,
  payload.device_type AS device_type,
  payload.temperature AS temperature,
  payload.humidity AS humidity,
  payload.ec AS ec,
  payload.ph AS ph,
  payload.co2 AS co2,
  payload.lux AS lux,
  payload.collect_status AS collect_status,
  payload.error_msg AS error_msg,
  payload.collected_at AS collected_at
FROM "data/#"
```

## Final recommendation

For your project, the cleanest approach is:

- every board uses local slave addresses `1` and `2`
- every board has its own `GATEWAY_INDEX`
- every soil sensor gets its own pre-planned `DEVICE_INDEX`

That gives you the least confusion during flashing and the cleanest database IDs afterward.

## Still worth improving later

- add a printed flashing checklist for lab use
- keep a board-to-device numbering spreadsheet
- verify one real board in the field before mass flashing all boards
- add an air sensor firmware variant after confirming its Modbus register map
