# test_true_dual_rs485

这是一份给当前真机联调用的测试工程：

- 1 个土壤 RS485 传感器
- 1 个空气百叶箱 RS485 传感器
- 1 块 ESP32-C3 SuperMini
- 两个设备共用同一条 RS485 总线

## 当前编号

- `gateway_code = test_true_gw_001`
- `soil device_code = test_true_soil_001`
- `air device_code = test_true_air_001`
- 土壤地址 `1`
- 空气地址 `2`

## 接线

ESP32-C3 到 485 模块：

- `GPIO20 -> RO`
- `GPIO21 -> DI`
- `GPIO5 -> DE`
- `GPIO6 -> RE`

两个传感器并联到同一对 `A/B` 总线。

## 波特率

同一条 RS485 总线上的设备必须使用相同波特率。

这份测试工程现在统一使用：

- `RS485_BAUD_RATE = 9600`

当前默认假设是：

- 土壤四合一已经在 `9600`
- 空气百叶箱也支持并已经切到 `9600`

## 土壤解析

这份工程当前按你确认能跑的四合一逻辑解析：

- 温度：寄存器 0
- 湿度：寄存器 1
- EC：寄存器 2
- pH：寄存器 7

当前固定模式：

- `SOIL_PARSE_MODE = COMMON_4IN1`

## 空气解析

空气百叶箱按说明书读取：

- 起始寄存器 `500`
- 长度 `8`
- 功能码 `03`

输出字段：

- 温度
- 湿度
- CO2
- Lux

## 上报字段

土壤：

```json
{
  "topic": "data/test_true_gw_001",
  "mqtt_client_id": "test_true_gw_001_client",
  "gateway_code": "test_true_gw_001",
  "device_code": "test_true_soil_001",
  "slave_addr": 1,
  "device_type": "soil_4in1",
  "msg_key": "soil_data",
  "temperature": 21.5,
  "humidity": 34.2,
  "ec": 128.0,
  "ph": 6.9,
  "collect_status": 1,
  "error_msg": null,
  "collected_at": "2026-04-05 09:30:00"
}
```

空气：

```json
{
  "topic": "data/test_true_gw_001",
  "mqtt_client_id": "test_true_gw_001_client",
  "gateway_code": "test_true_gw_001",
  "device_code": "test_true_air_001",
  "slave_addr": 2,
  "device_type": "air_4in1",
  "msg_key": "air_data",
  "temperature": 24.3,
  "humidity": 61.2,
  "co2": 518,
  "lux": 12650,
  "collect_status": 1,
  "error_msg": null,
  "collected_at": "2026-04-05 09:30:00"
}
```

## 串口调试

程序会打印：

- WiFi 连接状态
- MQTT 连接状态
- 土壤原始帧
- 空气原始帧
- 土壤解析结果

如果土壤值还不对，直接把串口里的 `Soil raw frame` 和 `Soil decode candidates` 发出来，就能继续精确定位。
