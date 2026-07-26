#ifndef PROJECT_CONFIG_H
#define PROJECT_CONFIG_H

#include <Arduino.h>

namespace project_config {

constexpr char WIFI_SSID[] = "YOUR_WIFI_SSID";
constexpr char WIFI_PASSWORD[] = "YOUR_WIFI_PASSWORD";

constexpr char MQTT_HOST[] = "YOUR_MQTT_HOST";
constexpr uint16_t MQTT_PORT = 1883;
constexpr char MQTT_USERNAME[] = "YOUR_MQTT_USERNAME";
constexpr char MQTT_PASSWORD[] = "YOUR_MQTT_PASSWORD";

constexpr char GATEWAY_CODE[] = "test_true_gw_001";
constexpr char MQTT_CLIENT_ID[] = "test_true_gw_001_client";
constexpr char PUBLISH_TOPIC[] = "data/test_true_gw_001";

constexpr char SOIL_DEVICE_CODE[] = "test_true_soil_001";
constexpr char AIR_DEVICE_CODE[] = "test_true_air_001";
constexpr uint8_t SOIL_SLAVE_ADDR = 1;
constexpr uint8_t AIR_SLAVE_ADDR = 2;

constexpr char DEVICE_TYPE_SOIL[] = "soil_4in1";
constexpr char DEVICE_TYPE_AIR[] = "air_4in1";
constexpr char MSG_KEY_SOIL[] = "soil_data";
constexpr char MSG_KEY_AIR[] = "air_data";

enum class SoilParseMode : uint8_t {
  AUTO = 0,
  ZH_SOIL7 = 1,
  COMMON_4IN1 = 2,
};

constexpr char NTP_SERVER_PRIMARY[] = "pool.ntp.org";
constexpr char NTP_SERVER_BACKUP[] = "ntp.aliyun.com";
constexpr long GMT_OFFSET_SECONDS = 8 * 3600;
constexpr int DAYLIGHT_OFFSET_SECONDS = 0;

constexpr unsigned long COLLECT_INTERVAL_MS = 5UL * 60UL * 1000UL;
constexpr unsigned long WIFI_RETRY_DELAY_MS = 500UL;
constexpr unsigned long MQTT_RETRY_DELAY_MS = 3000UL;
constexpr uint32_t SERIAL_BAUD_RATE = 115200;
constexpr uint32_t RS485_BAUD_RATE = 9600;
constexpr uint16_t MODBUS_TIMEOUT_MS = 1500;
constexpr SoilParseMode SOIL_PARSE_MODE = SoilParseMode::COMMON_4IN1;

constexpr uint8_t RS485_RX_PIN = 20;
constexpr uint8_t RS485_TX_PIN = 21;
constexpr uint8_t RS485_DE_PIN = 5;
constexpr uint8_t RS485_RE_PIN = 6;

constexpr uint16_t SOIL_REGISTER_START = 0x0000;
constexpr uint16_t SOIL_REGISTER_COUNT = 0x0008;
constexpr uint16_t AIR_REGISTER_START = 500;
constexpr uint16_t AIR_REGISTER_COUNT = 8;

}  // namespace project_config

#endif  // PROJECT_CONFIG_H
