# Project 008 · 智慧农业物联网实验数据平台

[English](README.en.md)

一套面向菊花实验的数据采集、设备管理、可视化和数据集导出平台。系统把
RS485 土壤/空气传感器、ESP32-C3 网关、MQTT/EMQX、Node.js、MySQL、
Vue 监测大屏、管理台、Android App 和微信小程序连接成完整的数据链路。

本仓库是从当前项目总目录整理出的安全发布副本，保留完整应用源码、数据库
结构、固件和硬件参考资料，同时排除了生产凭据、真实业务数据、运行日志、
依赖缓存和构建产物。

## 系统链路

```text
土壤/空气 RS485 传感器
          │
          ▼
ESP32-C3 SuperMini 网关
          │ Wi-Fi / MQTT
          ▼
        EMQX
          │ HTTP 转发
          ▼
Node.js 数据与业务服务
          │
          ├── MySQL 采集数据、设备、植株、盆与绑定关系
          ├── Vue 监测大屏
          ├── Web 管理台
          ├── Android App
          └── 微信小程序
```

## 生产核心与扩展端

当前生产核心由三部分组成：

- `cloud/1_elder/Learning/demo4`：Vue 3 监测大屏。
- `backend/emqx_mysql_bridge`：Node.js、Express、MySQL 统一后端。
- `esp32-c3-test/esp32-c3-test`：ESP32-C3 双路 RS485 采集网关固件。

完整交付还包含：

- `cloud/admin_console`：设备、植株、盆、绑定和账号管理台。
- `android/2_test_activity`：Android 登录、设备列表、详情和个人中心。
- `miniProgramme/1_lxny`：微信小程序工程。
- `mysql`：结构化空数据库和数据表说明。
- `hardware/stm32/6_wifi_config`：早期 STM32/ESP8266 硬件参考代码。
- `esp32-c3-test/test_true_dual_rs485`：土壤与空气双设备现场联调工程。

更细的目录边界见
[`docs/DELIVERY_SCOPE.md`](docs/DELIVERY_SCOPE.md)。

## 主要能力

### 数据采集与设备接入

- ESP32-C3 双 RS485 设备轮询。
- Wi-Fi、NTP、MQTT 自动连接与重连。
- 土壤温度、湿度、pH、电导率、盐度和氮磷钾采集。
- 空气温度、湿度、二氧化碳和光照采集。
- EMQX 原始报文留存、解析状态和异常信息记录。
- 网关、设备和从站地址校验。

### 后端与数据治理

- 设备列表、最新数据和历史数据接口。
- 植株、盆、实验分组和传感器绑定关系管理。
- 绑定关系按开始/结束时间保留历史。
- JSON、CSV、Excel 数据集导出。
- 土壤记录与最近空气记录的时间对齐。
- 账号登录、会话、角色权限和密码修改。
- 叶片图片上传、标定、长度/宽度/面积分析。
- 健康检查、缓存、限流、归档、磁盘监控和邮件告警。

### Web 与移动端

- 实时设备概览与指标曲线。
- 单设备、全设备和空气数据查询。
- 正常组、胁迫组及自定义设备导出。
- 管理台的植株、盆、绑定和账号维护。
- Android 端登录、设备列表、详情、历史记录和个人中心。
- 微信小程序页面、接口和 MQTT 支持代码。

## 实验规模

- 菊花：130 株。
- 正常组：100 株。
- 胁迫组：30 株。
- 土壤四合一传感器规划：130 个。
- 空气四合一传感器规划：1 个。
- 推荐部署：每块 ESP32-C3 连接 2 个土壤传感器。

## 快速开始

### 1. 数据库

使用 MySQL 8 创建空数据库，然后执行：

```text
mysql/schema.sql
```

该脚本只包含表结构，不包含生产采集记录、账号、会话、植株编号或绑定关系。

### 2. 后端

```powershell
cd backend\emqx_mysql_bridge
npm ci
```

根据 `.env.example` 将变量配置到当前终端、PM2 或 systemd 环境，再运行：

```powershell
npm start
```

默认监听端口为 `3001`，健康接口为：

```text
GET /api/health
```

数据库密码和初始账号密码没有源码默认值。新环境必须通过环境变量明确提供。

### 3. Vue 监测大屏

```powershell
cd cloud\1_elder\Learning\demo4
npm ci
npm run build
```

构建结果位于 `dist/`，可由 Nginx 或静态服务器托管。

### 4. 管理台

`cloud/admin_console` 是静态 Web 管理台。部署时将其与后端 `/api/` 路由放在
同一域名或配置相应反向代理。

### 5. ESP32-C3 固件

打开：

```text
esp32-c3-test/esp32-c3-test
```

在 `src/project_config.h` 中填写现场 Wi-Fi、MQTT 连接信息和板卡编号后，
使用 PlatformIO 构建并烧录：

```powershell
platformio run
platformio run --target upload
```

### 6. Android App

```powershell
cd android\2_test_activity
.\gradlew.bat assembleDebug
```

也可使用 Android Studio 打开该目录运行。

### 7. 微信小程序

使用微信开发者工具打开 `miniProgramme/1_lxny`。仓库中的 AppID 已替换为
游客配置，发布前在本机私有配置中填写正式 AppID。

## 配置与数据安全

本仓库不会保存以下内容：

- 数据库、MQTT、Wi-Fi、SMTP 和服务器登录凭据。
- 生产账号密码、令牌和会话。
- 真实采集数据、植株/传感器绑定表和数据库备份。
- 上传图片、叶片分析结果、归档文件和运行日志。
- `node_modules`、Gradle、PlatformIO、IDE 缓存和构建产物。

配置样例中的值仅用于说明字段格式。正式环境使用独立环境变量和本地私有配置。

## 技术栈

- 硬件：ESP32-C3 SuperMini、RS485、Modbus RTU。
- 固件：Arduino、PlatformIO、PubSubClient。
- 后端：Node.js、Express、mysql2、Multer、Nodemailer。
- 数据库：MySQL 8。
- 前端：Vue 3、Element Plus、ECharts、Axios。
- Android：Java、Android Gradle Plugin。
- 小程序：微信原生小程序、Vant Weapp。
- 部署：EMQX、PM2、Nginx。

## 发布验证

2026-07-26 在干净副本完成以下验证：

- 后端 `npm ci` 成功，`app.js` 通过 Node.js 语法检查。
- 叶片分析脚本通过 Python 字节码编译。
- 线上 `/api/health` 返回 HTTP 200、`code=0` 和
  `server is running`。
- Vue 监测大屏完成生产构建；构建警告仅为资源体积建议。
- 静态管理台 JavaScript 和 20 个小程序 JavaScript 文件通过语法检查。
- Android 的 `app` 与 `test_app` 两个模块构建成功，共执行 60 个任务。
- 正式 ESP32-C3 网关固件通过 PlatformIO 构建：
  RAM 39,364 / 327,680 字节，Flash 774,660 / 1,310,720 字节。
- 土壤/空气双设备联调固件通过 PlatformIO 构建：
  RAM 39,324 / 327,680 字节，Flash 776,696 / 1,310,720 字节。

## 项目来源

- 原始项目目录：`D:\download\aaaflowerdatabase\project\project`
- 编号：Project 008
- 发布形式：私人 GitHub 仓库
- 整理日期：2026-07-26
