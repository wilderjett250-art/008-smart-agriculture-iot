# 008 智慧农业物联网平台 | Smart Agriculture IoT

> 把传感器、网关、消息队列、数据库和多端应用连成一条农业数据链路。
>
> **English:** A practical, runnable project with a documented workflow for the problem described above.

## 项目展示 / Demo

```mermaid
flowchart LR
 A[RS485 传感器] --> B[ESP32-C3 网关]
 B --> C[Wi-Fi / MQTT]
 C --> D[EMQX]
 D --> E[Node.js + MySQL]
 E --> F[Vue / Android / 小程序]
```

## 解决什么问题 / Problem

解决土壤/空气数据分散在设备端、无法统一监控和导出的问题。

**English:** This project addresses the problem above with a reproducible local workflow.

## 有什么用 / Use

采集传感器数据，查看设备、植株、花盆和绑定关系，并在网页、Android 和小程序端使用。

**English:** Run the workflow locally, inspect the output, and extend the project from the provided source.

## 高光亮点 / Highlights

- ESP32-C3 双路 RS485 采集
- EMQX MQTT 消息链路
- Node.js + MySQL 业务服务
- Vue 大屏、管理台、Android、小程序多端

## 技术名词 / Tech

`ESP32-C3 · RS485 · MQTT/EMQX · Node.js · MySQL · Vue · Android`

## 从 ZIP 开始复现 / Reproduce from ZIP

1. 下载 ZIP 并解压，先阅读 docs/DELIVERY_SCOPE.md。
2. 按 backend/emqx_mysql_bridge 的 README 配置 MySQL 和 EMQX。
3. 启动 Node.js 服务和 cloud/1_elder/Learning/demo4 前端。
4. 固件进入 esp32-c3-test 对应工程编译烧录。
5. 需要 Android 或小程序时分别导入对应目录。

**Expected result:** 网关上报数据后，后端写入 MySQL，网页和移动端可以查看设备及实验数据。

## 目录提示 / Notes

- 先阅读本 README，再按项目内更详细的中文/英文文档补充配置。
- 不要把真实密码、Token、数据库业务数据和本机运行结果提交回仓库。
- 下载 ZIP 后的第一次运行应使用测试数据或示例图片，确认链路正常后再接入自己的环境。

[English documentation](README.en.md)
