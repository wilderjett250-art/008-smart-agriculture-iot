#include <Arduino.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <time.h>

#include "project_config.h"

using project_config::COLLECT_INTERVAL_MS;
using project_config::DEVICES;
using project_config::DEVICE_PREFIX;
using project_config::DEVICE_TYPE_SOIL;
using project_config::DAYLIGHT_OFFSET_SECONDS;
using project_config::GATEWAY_INDEX;
using project_config::GATEWAY_PREFIX;
using project_config::GMT_OFFSET_SECONDS;
using project_config::MODBUS_TIMEOUT_MS;
using project_config::MQTT_CLIENT_SUFFIX;
using project_config::MQTT_HOST;
using project_config::MQTT_PASSWORD;
using project_config::MQTT_PORT;
using project_config::MQTT_RETRY_DELAY_MS;
using project_config::MQTT_USERNAME;
using project_config::MSG_KEY_SOIL;
using project_config::NTP_SERVER_BACKUP;
using project_config::NTP_SERVER_PRIMARY;
using project_config::RS485_BAUD_RATE;
using project_config::RS485_DE_PIN;
using project_config::RS485_RE_PIN;
using project_config::RS485_RX_PIN;
using project_config::RS485_TX_PIN;
using project_config::SERIAL_BAUD_RATE;
using project_config::TOPIC_PREFIX;
using project_config::WIFI_PASSWORD;
using project_config::WIFI_RETRY_DELAY_MS;
using project_config::WIFI_SSID;

namespace {

HardwareSerial rs485Serial(1);
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

unsigned long lastCollectAt = 0;
String gatewayCode;
String mqttClientId;
String publishTopic;

struct SoilMeasurement {
  float temperature = 0.0f;
  float humidity = 0.0f;
  float ec = 0.0f;
  float ph = 0.0f;
};

String formatThreeDigits(uint16_t value) {
  char buffer[8] = {0};
  snprintf(buffer, sizeof(buffer), "%03u", value);
  return String(buffer);
}

String buildGatewayCode() {
  return String(GATEWAY_PREFIX) + formatThreeDigits(GATEWAY_INDEX);
}

String buildDeviceCode(uint16_t deviceIndex) {
  return String(DEVICE_PREFIX) + formatThreeDigits(deviceIndex);
}

String buildTopic() {
  return String(TOPIC_PREFIX) + buildGatewayCode();
}

String escapeJsonString(const String& raw) {
  String escaped;
  escaped.reserve(raw.length() + 8);

  for (size_t i = 0; i < raw.length(); ++i) {
    const char ch = raw[i];
    switch (ch) {
      case '\"':
        escaped += "\\\"";
        break;
      case '\\':
        escaped += "\\\\";
        break;
      case '\n':
        escaped += "\\n";
        break;
      case '\r':
        escaped += "\\r";
        break;
      case '\t':
        escaped += "\\t";
        break;
      default:
        escaped += ch;
        break;
    }
  }

  return escaped;
}

void configureRs485Direction(bool transmitMode) {
  digitalWrite(RS485_DE_PIN, transmitMode ? HIGH : LOW);
  digitalWrite(RS485_RE_PIN, transmitMode ? HIGH : LOW);
}

uint16_t modbusCrc16(const uint8_t* data, size_t length) {
  uint16_t crc = 0xFFFF;

  for (size_t i = 0; i < length; ++i) {
    crc ^= data[i];
    for (uint8_t bit = 0; bit < 8; ++bit) {
      if (crc & 0x0001) {
        crc = (crc >> 1) ^ 0xA001;
      } else {
        crc >>= 1;
      }
    }
  }

  return crc;
}

void flushRs485Input() {
  while (rs485Serial.available()) {
    rs485Serial.read();
  }
}

void sendReadHoldingRegisters(uint8_t slaveAddr, uint16_t registerAddress, uint16_t registerCount) {
  uint8_t frame[8] = {
    slaveAddr,
    0x03,
    static_cast<uint8_t>(registerAddress >> 8),
    static_cast<uint8_t>(registerAddress & 0xFF),
    static_cast<uint8_t>(registerCount >> 8),
    static_cast<uint8_t>(registerCount & 0xFF),
    0,
    0
  };

  const uint16_t crc = modbusCrc16(frame, 6);
  frame[6] = static_cast<uint8_t>(crc & 0xFF);
  frame[7] = static_cast<uint8_t>(crc >> 8);

  configureRs485Direction(true);
  delay(2);
  rs485Serial.write(frame, sizeof(frame));
  rs485Serial.flush();
  delay(2);
  configureRs485Direction(false);
}

bool readModbusResponse(uint8_t slaveAddr, uint8_t* buffer, size_t bufferSize, int& outLength, String& errorMessage) {
  constexpr size_t expectedLength = 21;

  outLength = 0;
  errorMessage = "";
  flushRs485Input();
  sendReadHoldingRegisters(slaveAddr, 0x0000, 0x0008);

  const unsigned long startedAt = millis();
  while (millis() - startedAt < MODBUS_TIMEOUT_MS) {
    while (rs485Serial.available() && static_cast<size_t>(outLength) < bufferSize) {
      buffer[outLength++] = static_cast<uint8_t>(rs485Serial.read());
    }

    if (static_cast<size_t>(outLength) >= expectedLength) {
      break;
    }
    delay(5);
  }

  if (static_cast<size_t>(outLength) < expectedLength) {
    errorMessage = "modbus response timeout";
    return false;
  }

  if (buffer[0] != slaveAddr) {
    errorMessage = "modbus slave mismatch";
    return false;
  }

  if (buffer[1] != 0x03) {
    errorMessage = "modbus function mismatch";
    return false;
  }

  const uint16_t responseCrc = static_cast<uint16_t>(buffer[outLength - 2])
    | (static_cast<uint16_t>(buffer[outLength - 1]) << 8);
  const uint16_t calculatedCrc = modbusCrc16(buffer, outLength - 2);
  if (responseCrc != calculatedCrc) {
    errorMessage = "modbus crc error";
    return false;
  }

  return true;
}

uint16_t readRegisterU16(const uint8_t* payload, size_t highIndex) {
  return static_cast<uint16_t>((payload[highIndex] << 8) | payload[highIndex + 1]);
}

int16_t readRegisterS16(const uint8_t* payload, size_t highIndex) {
  return static_cast<int16_t>((payload[highIndex] << 8) | payload[highIndex + 1]);
}

bool parseSoilMeasurement(const uint8_t* frame, int frameLength, SoilMeasurement& result, String& errorMessage) {
  if (frameLength < 21) {
    errorMessage = "soil frame too short";
    return false;
  }

  if (frame[2] < 16) {
    errorMessage = "soil payload length invalid";
    return false;
  }

  result.temperature = readRegisterS16(frame, 3) / 10.0f;
  result.humidity = readRegisterU16(frame, 5) / 10.0f;
  result.ec = static_cast<float>(readRegisterU16(frame, 7));
  result.ph = readRegisterU16(frame, 17) / 10.0f;
  return true;
}

void ensureWifiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.printf("Connecting WiFi SSID: %s\n", WIFI_SSID);
  while (WiFi.status() != WL_CONNECTED) {
    delay(WIFI_RETRY_DELAY_MS);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("WiFi connected. IP: ");
  Serial.println(WiFi.localIP());
}

void syncClock() {
  configTime(GMT_OFFSET_SECONDS, DAYLIGHT_OFFSET_SECONDS, NTP_SERVER_PRIMARY, NTP_SERVER_BACKUP);
  struct tm timeInfo = {};

  for (int attempt = 0; attempt < 20; ++attempt) {
    if (getLocalTime(&timeInfo, 1000)) {
      Serial.println("NTP time synchronized.");
      return;
    }
    delay(300);
  }

  Serial.println("NTP sync timeout, fallback timestamps will be used.");
}

void ensureMqttConnected() {
  while (!mqttClient.connected()) {
    ensureWifiConnected();
    Serial.print("Connecting MQTT... ");

    if (mqttClient.connect(mqttClientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD)) {
      Serial.println("connected.");
      return;
    }

    Serial.printf("failed, rc=%d\n", mqttClient.state());
    delay(MQTT_RETRY_DELAY_MS);
  }
}

String currentTimestamp() {
  struct tm timeInfo = {};
  if (!getLocalTime(&timeInfo, 200)) {
    return "2026-04-04 00:00:00";
  }

  char buffer[20] = {0};
  strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &timeInfo);
  return String(buffer);
}

String buildSuccessPayload(uint8_t slaveAddr, uint16_t deviceIndex, const SoilMeasurement& soil) {
  String payload = "{";
  payload += "\"topic\":\"" + publishTopic + "\",";
  payload += "\"mqtt_client_id\":\"" + mqttClientId + "\",";
  payload += "\"gateway_code\":\"" + gatewayCode + "\",";
  payload += "\"device_code\":\"" + buildDeviceCode(deviceIndex) + "\",";
  payload += "\"slave_addr\":" + String(slaveAddr) + ",";
  payload += "\"device_type\":\"" + String(DEVICE_TYPE_SOIL) + "\",";
  payload += "\"msg_key\":\"" + String(MSG_KEY_SOIL) + "\",";
  payload += "\"temperature\":" + String(soil.temperature, 1) + ",";
  payload += "\"humidity\":" + String(soil.humidity, 1) + ",";
  payload += "\"ec\":" + String(soil.ec, 1) + ",";
  payload += "\"ph\":" + String(soil.ph, 1) + ",";
  payload += "\"collect_status\":1,";
  payload += "\"error_msg\":null,";
  payload += "\"collected_at\":\"" + currentTimestamp() + "\"";
  payload += "}";
  return payload;
}

String buildFailurePayload(uint8_t slaveAddr, uint16_t deviceIndex, const String& errorMessage) {
  String payload = "{";
  payload += "\"topic\":\"" + publishTopic + "\",";
  payload += "\"mqtt_client_id\":\"" + mqttClientId + "\",";
  payload += "\"gateway_code\":\"" + gatewayCode + "\",";
  payload += "\"device_code\":\"" + buildDeviceCode(deviceIndex) + "\",";
  payload += "\"slave_addr\":" + String(slaveAddr) + ",";
  payload += "\"device_type\":\"" + String(DEVICE_TYPE_SOIL) + "\",";
  payload += "\"msg_key\":\"" + String(MSG_KEY_SOIL) + "\",";
  payload += "\"collect_status\":0,";
  payload += "\"error_msg\":\"" + escapeJsonString(errorMessage) + "\",";
  payload += "\"collected_at\":\"" + currentTimestamp() + "\"";
  payload += "}";
  return payload;
}

void publishPayload(const String& payload) {
  Serial.printf("Publishing to %s: %s\n", publishTopic.c_str(), payload.c_str());
  const bool published = mqttClient.publish(publishTopic.c_str(), payload.c_str());
  if (!published) {
    Serial.println("MQTT publish failed.");
  }
}

void collectDevice(const project_config::DeviceConfig& device) {
  if (!device.enabled) {
    return;
  }

  uint8_t response[64] = {0};
  int responseLength = 0;
  String errorMessage;
  SoilMeasurement measurement;

  if (!readModbusResponse(device.slaveAddr, response, sizeof(response), responseLength, errorMessage)) {
    publishPayload(buildFailurePayload(device.slaveAddr, device.deviceIndex, errorMessage));
    return;
  }

  if (!parseSoilMeasurement(response, responseLength, measurement, errorMessage)) {
    publishPayload(buildFailurePayload(device.slaveAddr, device.deviceIndex, errorMessage));
    return;
  }

  publishPayload(buildSuccessPayload(device.slaveAddr, device.deviceIndex, measurement));
}

void printBootSummary() {
  Serial.println("=== Gateway Ready ===");
  Serial.printf("Gateway Code : %s\n", gatewayCode.c_str());
  Serial.printf("MQTT Client  : %s\n", mqttClientId.c_str());
  Serial.printf("Publish Topic: %s\n", publishTopic.c_str());

  for (const auto& device : DEVICES) {
    if (!device.enabled) {
      continue;
    }
    Serial.printf(
      "Device Code  : %s  slave=%u\n",
      buildDeviceCode(device.deviceIndex).c_str(),
      device.slaveAddr
    );
  }
}

}  // namespace

void setup() {
  Serial.begin(SERIAL_BAUD_RATE);

  pinMode(RS485_DE_PIN, OUTPUT);
  pinMode(RS485_RE_PIN, OUTPUT);
  configureRs485Direction(false);

  rs485Serial.begin(RS485_BAUD_RATE, SERIAL_8N1, RS485_RX_PIN, RS485_TX_PIN);

  gatewayCode = buildGatewayCode();
  mqttClientId = gatewayCode + String(MQTT_CLIENT_SUFFIX);
  publishTopic = buildTopic();

  ensureWifiConnected();
  syncClock();

  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  printBootSummary();
}

void loop() {
  ensureWifiConnected();
  ensureMqttConnected();
  mqttClient.loop();

  const unsigned long now = millis();
  if (now - lastCollectAt < COLLECT_INTERVAL_MS) {
    delay(50);
    return;
  }

  lastCollectAt = now;
  for (const auto& device : DEVICES) {
    collectDevice(device);
    delay(200);
  }
}
