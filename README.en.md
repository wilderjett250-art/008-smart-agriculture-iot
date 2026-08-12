# 008 Smart Agriculture IoT

> Connects sensors, an ESP32 gateway, MQTT services, and multi-client management into one agriculture data loop.

## Problem

Soil and air data stays scattered across devices, while device, plant, pot, and binding relationships are hard to manage.

## Demo

~~~mermaid
flowchart LR
 A[RS485 sensors] --> B[ESP32-C3 gateway]
 B --> C[Wi-Fi / MQTT]
 C --> D[Node.js + MySQL]
 D --> E[Web / Android / Mini Program]
~~~

Data can be traced from RS485 sensors through MQTT to web, Android, and mini-program clients.

## Highlights

- Dual-channel RS485 acquisition on ESP32-C3.
- EMQX MQTT messaging route.
- Node.js and MySQL business service.
- Vue dashboard, admin console, Android app, and mini-program clients.

## Tech

`ESP32-C3 · RS485 · MQTT/EMQX · Node.js · MySQL · Vue · Android`

## Reproduce from ZIP

1. Extract the ZIP and read `docs/DELIVERY_SCOPE.md` first.
2. Configure local MySQL and EMQX in `backend/emqx_mysql_bridge`.
3. Start the Node.js service and the `cloud/1_elder/Learning/demo4` frontend.
4. Build and flash the firmware from `esp32-c3-test`; without hardware, use service-side test data to verify the UI first.

**Expected result:** After these steps, you should see the project's page, window, device output, or test result.

## Scope and Safety

Real sensor, MQTT, database, and device credentials are not part of the source release; hardware acceptance must be performed on physical devices.

## Contact

Open to technical exchange.
