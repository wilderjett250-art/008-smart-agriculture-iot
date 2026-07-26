# Project 008 最终交付源码目录说明

## 一、实际生产核心

| 目录 | 角色 | 当前用途 |
|---|---|---|
| `cloud/1_elder/Learning/demo4` | Vue 监测大屏 | 展示设备概览、实时值、历史曲线、数据库视图和数据导出 |
| `backend/emqx_mysql_bridge` | Node.js 统一后端 | EMQX 入库、MySQL 查询、主数据、绑定、认证、导出和叶片分析 |
| `esp32-c3-test/esp32-c3-test` | ESP32-C3 正式固件模板 | 双路 RS485 轮询、Wi-Fi/MQTT 上报和网关编号管理 |

生产部署链路为：

```text
RS485 → ESP32-C3 → MQTT/EMQX → Node.js → MySQL → Web/Android/小程序
```

## 二、完整交付组成

| 目录 | 分类 | 说明 |
|---|---|---|
| `cloud/admin_console` | 管理端 | 植株、盆、传感器绑定、账号和权限管理 |
| `android/2_test_activity` | Android 客户端 | 登录、设备列表、设备详情、历史数据和个人中心 |
| `miniProgramme/1_lxny` | 微信小程序 | 小程序页面、接口配置和 MQTT 支持代码 |
| `mysql/schema.sql` | 数据库结构 | MySQL 8 结构化空库，不包含生产数据 |
| `mysql/data_table_interpretation.docx` | 数据说明 | 原项目的数据表解释资料 |
| `esp32-c3-test/test_true_dual_rs485` | 联调固件 | 同一总线土壤与空气设备联合测试 |
| `hardware/stm32/6_wifi_config` | 历史硬件参考 | STM32F10x、ESP8266、DHT11、OLED 和串口参考代码 |

## 三、发布时排除的内容

以下内容属于运行环境、现场配置或可重新生成文件，不进入源码仓库：

- `node_modules`、`miniprogram_npm`。
- Vue `dist`、Android `build/.gradle`、PlatformIO `.pio`。
- IDE 用户配置、`local.properties`、微信私有项目配置。
- Wi-Fi、MQTT、数据库、SMTP 和生产账号凭据。
- 真实采集记录、植株/传感器绑定导出、数据库备份。
- 上传图片、叶片分析输出、日志、归档和临时 SQL。
- 重复部署压缩包、论文资料和本机自动化缓存。

## 四、配置方式

- 后端：通过环境变量配置，字段样例见
  `backend/emqx_mysql_bridge/.env.example`。
- ESP32-C3：在本机填写 `src/project_config.h` 中的现场网络和 MQTT 信息。
- 微信小程序：正式 AppID 写入本机 `project.private.config.json`。
- Android：SDK 路径写入本机 `local.properties`。

## 五、数据库边界

`mysql/schema.sql` 提供结构化空库，包含：

- 网关与 RS485 设备。
- MQTT 原始消息。
- 土壤、空气和兼容传感器数据。
- 植株、盆和时间化绑定关系。
- 用户、会话和运行设置。
- 叶片观测、记录和图片指标。

初始化植株编号、真实传感器绑定、实验分组、账号和采集数据属于部署数据，
由正式环境单独管理。
