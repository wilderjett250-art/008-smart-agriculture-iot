#include <Arduino.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <time.h>

#include "project_config.h"

using project_config::AIR_DEVICE_CODE;
using project_config::AIR_REGISTER_COUNT;
using project_config::AIR_REGISTER_START;
using project_config::AIR_SLAVE_ADDR;
using project_config::COLLECT_INTERVAL_MS;
using project_config::DAYLIGHT_OFFSET_SECONDS;
using project_config::DEVICE_TYPE_AIR;
using project_config::DEVICE_TYPE_SOIL;
using project_config::GMT_OFFSET_SECONDS;
using project_config::GATEWAY_CODE;
using project_config::MODBUS_TIMEOUT_MS;
using project_config::MQTT_CLIENT_ID;
using project_config::MQTT_HOST;
using project_config::MQTT_PASSWORD;
using project_config::MQTT_PORT;
using project_config::MQTT_RETRY_DELAY_MS;
using project_config::MQTT_USERNAME;
using project_config::MSG_KEY_AIR;
using project_config::MSG_KEY_SOIL;
using project_config::NTP_SERVER_BACKUP;
using project_config::NTP_SERVER_PRIMARY;
using project_config::PUBLISH_TOPIC;
using project_config::RS485_BAUD_RATE;
using project_config::RS485_DE_PIN;
using project_config::RS485_RE_PIN;
using project_config::RS485_RX_PIN;
using project_config::RS485_TX_PIN;
using project_config::SERIAL_BAUD_RATE;
using project_config::SOIL_PARSE_MODE;
using project_config::SOIL_DEVICE_CODE;
using project_config::SOIL_REGISTER_COUNT;
using project_config::SOIL_REGISTER_START;
using project_config::SOIL_SLAVE_ADDR;
using project_config::WIFI_PASSWORD;
using project_config::WIFI_RETRY_DELAY_MS;
using project_config::WIFI_SSID;

namespace {

HardwareSerial rs485Serial(1);
WiFiClient wifiClient;
PubSubClient mqttClient(wifiClient);

unsigned long lastCollectAt = 0;
bool collectImmediately = true;

struct SoilMeasurement {
  float temperature = 0.0f;
  float humidity = 0.0f;
  float ec = 0.0f;
  float ph = 0.0f;
};

struct AirMeasurement {
  float temperature = 0.0f;
  float humidity = 0.0f;
  float co2 = 0.0f;
  uint32_t lux = 0;
};

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

bool readHoldingRegisters(
  uint8_t slaveAddr,
  uint16_t registerAddress,
  uint16_t registerCount,
  uint8_t* buffer,
  size_t bufferSize,
  int& outLength,
  String& errorMessage
) {
  const size_t expectedLength = 5 + static_cast<size_t>(registerCount) * 2;

  outLength = 0;
  errorMessage = "";
  flushRs485Input();
  sendReadHoldingRegisters(slaveAddr, registerAddress, registerCount);

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

  if (buffer[2] != registerCount * 2) {
    errorMessage = "modbus payload length invalid";
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

void printHexFrame(const char* label, const uint8_t* frame, int frameLength) {
  Serial.printf("%s [%d bytes]: ", label, frameLength);
  for (int i = 0; i < frameLength; ++i) {
    if (frame[i] < 0x10) {
      Serial.print('0');
    }
    Serial.print(frame[i], HEX);
    if (i < frameLength - 1) {
      Serial.print(' ');
    }
  }
  Serial.println();
}

bool parseSoilMeasurement(const uint8_t* frame, int frameLength, SoilMeasurement& result, String& errorMessage) {
  if (frameLength < 21) {
    errorMessage = "soil frame too short";
    return false;
  }

  printHexFrame("Soil raw frame", frame, frameLength);
  if (frame[1] != 0x03 || frame[2] < 16) {
    errorMessage = "soil frame format error";
    return false;
  }

  switch (SOIL_PARSE_MODE) {
    case project_config::SoilParseMode::ZH_SOIL7:
      result.temperature = readRegisterS16(frame, 3) / 10.0f;
      result.humidity = readRegisterU16(frame, 5) / 10.0f;
      result.ec = static_cast<float>(readRegisterU16(frame, 7));
      result.ph = readRegisterU16(frame, 17) / 10.0f;
      break;
    case project_config::SoilParseMode::COMMON_4IN1:
    case project_config::SoilParseMode::AUTO:
    default:
      result.temperature = readRegisterS16(frame, 3) / 10.0f;
      result.humidity = readRegisterU16(frame, 5) / 10.0f;
      result.ec = static_cast<float>(readRegisterU16(frame, 7));
      result.ph = readRegisterU16(frame, 17) / 10.0f;
      break;
  }

  Serial.printf(
    "Soil parsed -> T=%.1fC H=%.1f%% EC=%.1f PH=%.1f\n",
    result.temperature,
    result.humidity,
    result.ec,
    result.ph
  );
  return true;
}

bool parseAirMeasurement(const uint8_t* frame, int frameLength, AirMeasurement& result, String& errorMessage) {
  if (frameLength < 21) {
    errorMessage = "air frame too short";
    return false;
  }

  result.humidity = readRegisterU16(frame, 3) / 10.0f;
  result.temperature = readRegisterS16(frame, 5) / 10.0f;
  result.co2 = static_cast<float>(readRegisterU16(frame, 9));

  const uint32_t luxHigh = static_cast<uint32_t>(readRegisterU16(frame, 15));
  const uint32_t luxLow = static_cast<uint32_t>(readRegisterU16(frame, 17));
  result.lux = (luxHigh << 16) | luxLow;

  printHexFrame("Air raw frame", frame, frameLength);
  Serial.printf(
    "Air parsed -> T=%.1fC H=%.1f%% CO2=%.0f LUX=%lu\n",
    result.temperature,
    result.humidity,
    result.co2,
    static_cast<unsigned long>(result.lux)
  );
  return true;
}

void ensureWifiConnected() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
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

    if (mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
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
    return "2026-04-05 00:00:00";
  }

  char buffer[20] = {0};
  strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &timeInfo);
  return String(buffer);
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

void publishPayload(const String& payload) {
  Serial.printf("Publishing to %s: %s\n", PUBLISH_TOPIC, payload.c_str());
  const bool published = mqttClient.publish(PUBLISH_TOPIC, payload.c_str());
  if (!published) {
    Serial.printf("MQTT publish failed. state=%d\n", mqttClient.state());
  }
}

String buildSoilSuccessPayload(const SoilMeasurement& soil) {
  String payload = "{";
  payload += "\"topic\":\"" + String(PUBLISH_TOPIC) + "\",";
  payload += "\"mqtt_client_id\":\"" + String(MQTT_CLIENT_ID) + "\",";
  payload += "\"gateway_code\":\"" + String(GATEWAY_CODE) + "\",";
  payload += "\"device_code\":\"" + String(SOIL_DEVICE_CODE) + "\",";
  payload += "\"slave_addr\":" + String(SOIL_SLAVE_ADDR) + ",";
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

String buildAirSuccessPayload(const AirMeasurement& air) {
  String payload = "{";
  payload += "\"topic\":\"" + String(PUBLISH_TOPIC) + "\",";
  payload += "\"mqtt_client_id\":\"" + String(MQTT_CLIENT_ID) + "\",";
  payload += "\"gateway_code\":\"" + String(GATEWAY_CODE) + "\",";
  payload += "\"device_code\":\"" + String(AIR_DEVICE_CODE) + "\",";
  payload += "\"slave_addr\":" + String(AIR_SLAVE_ADDR) + ",";
  payload += "\"device_type\":\"" + String(DEVICE_TYPE_AIR) + "\",";
  payload += "\"msg_key\":\"" + String(MSG_KEY_AIR) + "\",";
  payload += "\"temperature\":" + String(air.temperature, 1) + ",";
  payload += "\"humidity\":" + String(air.humidity, 1) + ",";
  payload += "\"co2\":" + String(air.co2, 0) + ",";
  payload += "\"lux\":" + String(air.lux) + ",";
  payload += "\"collect_status\":1,";
  payload += "\"error_msg\":null,";
  payload += "\"collected_at\":\"" + currentTimestamp() + "\"";
  payload += "}";
  return payload;
}

String buildFailurePayload(
  const char* deviceCode,
  const char* deviceType,
  const char* msgKey,
  uint8_t slaveAddr,
  const String& errorMessage
) {
  String payload = "{";
  payload += "\"topic\":\"" + String(PUBLISH_TOPIC) + "\",";
  payload += "\"mqtt_client_id\":\"" + String(MQTT_CLIENT_ID) + "\",";
  payload += "\"gateway_code\":\"" + String(GATEWAY_CODE) + "\",";
  payload += "\"device_code\":\"" + String(deviceCode) + "\",";
  payload += "\"slave_addr\":" + String(slaveAddr) + ",";
  payload += "\"device_type\":\"" + String(deviceType) + "\",";
  payload += "\"msg_key\":\"" + String(msgKey) + "\",";
  payload += "\"collect_status\":0,";
  payload += "\"error_msg\":\"" + escapeJsonString(errorMessage) + "\",";
  payload += "\"collected_at\":\"" + currentTimestamp() + "\"";
  payload += "}";
  return payload;
}

void collectSoilSensor() {
  uint8_t response[64] = {0};
  int responseLength = 0;
  String errorMessage;
  SoilMeasurement measurement;

  if (!readHoldingRegisters(
    SOIL_SLAVE_ADDR,
    SOIL_REGISTER_START,
    SOIL_REGISTER_COUNT,
    response,
    sizeof(response),
    responseLength,
    errorMessage
  )) {
    publishPayload(buildFailurePayload(SOIL_DEVICE_CODE, DEVICE_TYPE_SOIL, MSG_KEY_SOIL, SOIL_SLAVE_ADDR, errorMessage));
    return;
  }

  if (!parseSoilMeasurement(response, responseLength, measurement, errorMessage)) {
    publishPayload(buildFailurePayload(SOIL_DEVICE_CODE, DEVICE_TYPE_SOIL, MSG_KEY_SOIL, SOIL_SLAVE_ADDR, errorMessage));
    return;
  }

  publishPayload(buildSoilSuccessPayload(measurement));
}

void collectAirSensor() {
  uint8_t response[64] = {0};
  int responseLength = 0;
  String errorMessage;
  AirMeasurement measurement;

  if (!readHoldingRegisters(
    AIR_SLAVE_ADDR,
    AIR_REGISTER_START,
    AIR_REGISTER_COUNT,
    response,
    sizeof(response),
    responseLength,
    errorMessage
  )) {
    publishPayload(buildFailurePayload(AIR_DEVICE_CODE, DEVICE_TYPE_AIR, MSG_KEY_AIR, AIR_SLAVE_ADDR, errorMessage));
    return;
  }

  if (!parseAirMeasurement(response, responseLength, measurement, errorMessage)) {
    publishPayload(buildFailurePayload(AIR_DEVICE_CODE, DEVICE_TYPE_AIR, MSG_KEY_AIR, AIR_SLAVE_ADDR, errorMessage));
    return;
  }

  publishPayload(buildAirSuccessPayload(measurement));
}

void printBootSummary() {
  Serial.println("=== test_true dual gateway ready ===");
  Serial.printf("Gateway Code : %s\n", GATEWAY_CODE);
  Serial.printf("MQTT Client  : %s\n", MQTT_CLIENT_ID);
  Serial.printf("Publish Topic: %s\n", PUBLISH_TOPIC);
  Serial.printf("RS485 Pins   : RO=%u DI=%u DE=%u RE=%u\n", RS485_RX_PIN, RS485_TX_PIN, RS485_DE_PIN, RS485_RE_PIN);
  Serial.printf("RS485 Baud   : %lu\n", static_cast<unsigned long>(RS485_BAUD_RATE));
  Serial.printf("Soil Device  : %s slave=%u\n", SOIL_DEVICE_CODE, SOIL_SLAVE_ADDR);
  Serial.printf("Air Device   : %s slave=%u\n", AIR_DEVICE_CODE, AIR_SLAVE_ADDR);
}

}  // namespace

void setup() {
  Serial.begin(SERIAL_BAUD_RATE);

  pinMode(RS485_DE_PIN, OUTPUT);
  pinMode(RS485_RE_PIN, OUTPUT);
  configureRs485Direction(false);

  rs485Serial.begin(RS485_BAUD_RATE, SERIAL_8N1, RS485_RX_PIN, RS485_TX_PIN);

  ensureWifiConnected();
  syncClock();
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setBufferSize(1024);
  mqttClient.setKeepAlive(60);
  mqttClient.setSocketTimeout(15);
  printBootSummary();
}

void loop() {
  ensureWifiConnected();
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, waiting to reconnect...");
    delay(500);
    return;
  }

  static bool lastMqttConnected = false;
  const bool mqttConnectedNow = mqttClient.connected();
  if (lastMqttConnected && !mqttConnectedNow) {
    Serial.printf("MQTT disconnected. state=%d\n", mqttClient.state());
  }
  lastMqttConnected = mqttConnectedNow;

  ensureMqttConnected();
  mqttClient.loop();

  const unsigned long now = millis();
  if (!collectImmediately && (now - lastCollectAt < COLLECT_INTERVAL_MS)) {
    delay(50);
    return;
  }

  collectImmediately = false;
  lastCollectAt = now;

  collectSoilSensor();
  delay(300);
  collectAirSensor();
}
