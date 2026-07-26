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

// Before flashing each board, update only the three indices below.
constexpr uint16_t GATEWAY_INDEX = 1;
constexpr uint16_t DEVICE_INDEX_1 = 1;
constexpr uint16_t DEVICE_INDEX_2 = 2;

constexpr char GATEWAY_PREFIX[] = "ESP32C3_";
constexpr char DEVICE_PREFIX[] = "ESP32C3_";
constexpr char TOPIC_PREFIX[] = "data/";
constexpr char MQTT_CLIENT_SUFFIX[] = "_client";

constexpr char NTP_SERVER_PRIMARY[] = "pool.ntp.org";
constexpr char NTP_SERVER_BACKUP[] = "ntp.aliyun.com";
constexpr long GMT_OFFSET_SECONDS = 8 * 3600;
constexpr int DAYLIGHT_OFFSET_SECONDS = 0;

constexpr unsigned long COLLECT_INTERVAL_MS = 5UL * 60UL * 1000UL;
constexpr unsigned long WIFI_RETRY_DELAY_MS = 500UL;
constexpr unsigned long MQTT_RETRY_DELAY_MS = 3000UL;
constexpr uint32_t SERIAL_BAUD_RATE = 115200;
constexpr uint32_t RS485_BAUD_RATE = 9600;
constexpr uint16_t MODBUS_TIMEOUT_MS = 1200;

constexpr uint8_t RS485_RX_PIN = 20;
constexpr uint8_t RS485_TX_PIN = 21;
constexpr uint8_t RS485_DE_PIN = 5;
constexpr uint8_t RS485_RE_PIN = 6;

constexpr char DEVICE_TYPE_SOIL[] = "soil_4in1";
constexpr char MSG_KEY_SOIL[] = "soil_data";

struct DeviceConfig {
  uint8_t slaveAddr;
  uint16_t deviceIndex;
  bool enabled;
};

constexpr DeviceConfig DEVICES[] = {
  {1, DEVICE_INDEX_1, true},
  {2, DEVICE_INDEX_2, true},
};

}  // namespace project_config

#endif  // PROJECT_CONFIG_H

