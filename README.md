# 008 智慧农业物联网平台 / Smart Agriculture IoT

> 把传感器、ESP32 网关、MQTT 服务和多端管理界面连接成农业数据闭环。
>
> **English:** Connects sensors, an ESP32 gateway, MQTT services, and multi-client management into one agriculture data loop.

## 解决什么问题 / Problem

土壤和空气数据分散在设备端，设备、植株、花盆及绑定关系难以统一管理和导出。

**English:** Soil and air data stays scattered across devices, while device, plant, pot, and binding relationships are hard to manage.

## 项目展示 / Demo

~~~mermaid
flowchart LR
 A[RS485 传感器] --> B[ESP32-C3 网关]
 B --> C[Wi-Fi / MQTT]
 C --> D[Node.js + MySQL]
 D --> E[网页 / Android / 小程序]
~~~

数据从 RS485 传感器到网页、Android 和小程序端可追踪。

**English:** Data can be traced from RS485 sensors through MQTT to web, Android, and mini-program clients.

## 高光亮点 / Highlights

- ESP32-C3 双路 RS485 采集。
  **English:** Dual-channel RS485 acquisition on ESP32-C3.
- EMQX MQTT 消息链路。
  **English:** EMQX MQTT messaging route.
- Node.js + MySQL 业务服务。
  **English:** Node.js and MySQL business service.
- Vue 大屏、管理台、Android 和小程序多端入口。
  **English:** Vue dashboard, admin console, Android app, and mini-program clients.

## 技术名词 / Tech

`ESP32-C3 · RS485 · MQTT/EMQX · Node.js · MySQL · Vue · Android`

## 从 ZIP 开始复现 / Reproduce from ZIP

1. 解压 ZIP，先阅读 `docs/DELIVERY_SCOPE.md`。
2. 在 `backend/emqx_mysql_bridge` 配置本地 MySQL 和 EMQX。
3. 启动 Node.js 服务和 `cloud/1_elder/Learning/demo4` 前端。
4. 进入 `esp32-c3-test` 编译烧录固件；没有硬件时可先用服务端测试数据验证页面。

**Expected result:** 完成上述步骤后，应能看到项目的页面、窗口、设备输出或测试结果。

**Expected result:** After these steps, you should see the project's page, window, device output, or test result.

## 范围与安全 / Scope and Safety

真实传感器、MQTT、数据库和设备凭据不随源码发布；硬件验收必须在实际设备上进行。

**English:** Real sensor, MQTT, database, and device credentials are not part of the source release; hardware acceptance must be performed on physical devices.

## 交流 / Contact

欢迎交流技术。

Open to technical exchange.

[English full version](README.en.md)
