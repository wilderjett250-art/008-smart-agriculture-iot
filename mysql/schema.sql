-- Project 008: Smart Agriculture IoT Platform
-- MySQL 8 structure-only schema.
-- This file intentionally contains no production measurements, accounts,
-- passwords, sessions, plant assignments, or sensor-binding records.

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS iot_gateway (
  id bigint NOT NULL AUTO_INCREMENT,
  gateway_code varchar(64) NOT NULL,
  mqtt_client_id varchar(128) DEFAULT NULL,
  mqtt_topic varchar(255) DEFAULT NULL,
  online_status tinyint NOT NULL DEFAULT 0,
  last_online_time datetime DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_gateway_code (gateway_code),
  KEY idx_gateway_online (online_status, last_online_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='ESP32 gateway registry';

CREATE TABLE IF NOT EXISTS iot_rs485_device (
  id bigint NOT NULL AUTO_INCREMENT,
  gateway_code varchar(64) NOT NULL,
  device_code varchar(64) NOT NULL,
  slave_addr int NOT NULL DEFAULT 0,
  device_type varchar(32) DEFAULT NULL,
  is_active tinyint NOT NULL DEFAULT 1,
  last_collect_time datetime DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_device_code (device_code),
  KEY idx_gateway_device_active (gateway_code, device_type, is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='RS485 sensor registry';

CREATE TABLE IF NOT EXISTS iot_mqtt_raw_message (
  id bigint NOT NULL AUTO_INCREMENT,
  topic varchar(255) DEFAULT NULL,
  gateway_code varchar(64) DEFAULT NULL,
  device_code varchar(64) DEFAULT NULL,
  msg_key varchar(64) DEFAULT NULL,
  raw_payload json DEFAULT NULL,
  parse_status tinyint NOT NULL DEFAULT 0,
  parse_error varchar(512) DEFAULT NULL,
  received_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_raw_device_received (device_code, received_at),
  KEY idx_raw_status_received (parse_status, received_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Raw MQTT payload and parse status';

CREATE TABLE IF NOT EXISTS iot_sensor_data (
  id bigint NOT NULL AUTO_INCREMENT,
  gateway_code varchar(64) NOT NULL,
  device_code varchar(64) NOT NULL,
  slave_addr int DEFAULT NULL,
  device_type varchar(32) DEFAULT NULL,
  topic varchar(255) DEFAULT NULL,
  msg_key varchar(64) DEFAULT NULL,
  temperature decimal(10,2) DEFAULT NULL,
  humidity decimal(10,2) DEFAULT NULL,
  ec decimal(10,2) DEFAULT NULL,
  ph decimal(10,2) DEFAULT NULL,
  co2 decimal(10,2) DEFAULT NULL,
  lux decimal(10,2) DEFAULT NULL,
  salinity decimal(10,2) DEFAULT NULL,
  nitrogen decimal(10,2) DEFAULT NULL,
  phosphorus decimal(10,2) DEFAULT NULL,
  potassium decimal(10,2) DEFAULT NULL,
  collect_status tinyint NOT NULL DEFAULT 1,
  error_msg varchar(255) DEFAULT NULL,
  collected_at datetime NOT NULL,
  received_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_device_received_at (device_code, received_at),
  KEY idx_legacy_device_collected (device_code, collected_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Legacy unified sensor records';

CREATE TABLE IF NOT EXISTS soil_sensor_data (
  id bigint NOT NULL AUTO_INCREMENT,
  gateway_code varchar(64) NOT NULL,
  device_code varchar(64) NOT NULL,
  slave_addr int DEFAULT NULL,
  topic varchar(255) DEFAULT NULL,
  msg_key varchar(64) DEFAULT NULL,
  temperature decimal(10,2) DEFAULT NULL,
  humidity decimal(10,2) DEFAULT NULL,
  ec decimal(10,2) DEFAULT NULL,
  ph decimal(10,2) DEFAULT NULL,
  salinity decimal(10,2) DEFAULT NULL,
  nitrogen decimal(10,2) DEFAULT NULL,
  phosphorus decimal(10,2) DEFAULT NULL,
  potassium decimal(10,2) DEFAULT NULL,
  collect_status tinyint NOT NULL DEFAULT 1,
  error_msg varchar(255) DEFAULT NULL,
  collected_at datetime NOT NULL,
  received_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_device_collected_at (device_code, collected_at),
  KEY idx_gateway_collected_at (gateway_code, collected_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Soil sensor records';

CREATE TABLE IF NOT EXISTS air_sensor_data (
  id bigint NOT NULL AUTO_INCREMENT,
  gateway_code varchar(64) NOT NULL,
  device_code varchar(64) NOT NULL,
  slave_addr int DEFAULT NULL,
  topic varchar(255) DEFAULT NULL,
  msg_key varchar(64) DEFAULT NULL,
  temperature decimal(10,2) DEFAULT NULL,
  humidity decimal(10,2) DEFAULT NULL,
  co2 decimal(10,2) DEFAULT NULL,
  lux decimal(10,2) DEFAULT NULL,
  collect_status tinyint NOT NULL DEFAULT 1,
  error_msg varchar(255) DEFAULT NULL,
  collected_at datetime NOT NULL,
  received_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_device_collected_at (device_code, collected_at),
  KEY idx_gateway_collected_at (gateway_code, collected_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Air sensor records';

CREATE TABLE IF NOT EXISTS iot_plant (
  id bigint NOT NULL AUTO_INCREMENT,
  plant_code varchar(64) NOT NULL COMMENT 'Plant code',
  pot_code varchar(64) DEFAULT NULL COMMENT 'Pot code',
  group_type varchar(32) DEFAULT NULL COMMENT 'control/stress',
  treatment_type varchar(64) DEFAULT NULL,
  stress_type varchar(64) DEFAULT NULL,
  stress_level varchar(64) DEFAULT NULL,
  stress_started_at datetime DEFAULT NULL,
  remark varchar(255) DEFAULT NULL,
  is_active tinyint NOT NULL DEFAULT 1,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_plant_code (plant_code),
  KEY idx_group_type (group_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Plant registry';

CREATE TABLE IF NOT EXISTS iot_pot (
  id bigint NOT NULL AUTO_INCREMENT,
  pot_code varchar(64) NOT NULL,
  zone_code varchar(64) DEFAULT NULL,
  position_code varchar(64) DEFAULT NULL,
  remark varchar(255) DEFAULT NULL,
  is_active tinyint NOT NULL DEFAULT 1,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_pot_code (pot_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Pot registry';

CREATE TABLE IF NOT EXISTS iot_sensor_binding (
  id bigint NOT NULL AUTO_INCREMENT,
  device_code varchar(64) NOT NULL,
  plant_code varchar(64) DEFAULT NULL,
  pot_code varchar(64) DEFAULT NULL,
  binding_role varchar(32) NOT NULL DEFAULT 'primary',
  start_time datetime NOT NULL,
  end_time datetime DEFAULT NULL,
  is_active tinyint NOT NULL DEFAULT 1,
  remark varchar(255) DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_binding_device_time (device_code, start_time, end_time),
  KEY idx_binding_plant_time (plant_code, start_time, end_time),
  KEY idx_binding_pot_time (pot_code, start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Time-aware sensor, plant, and pot bindings';

CREATE TABLE IF NOT EXISTS iot_user (
  id bigint NOT NULL AUTO_INCREMENT,
  username varchar(64) NOT NULL,
  display_name varchar(128) DEFAULT NULL,
  password_hash varchar(255) NOT NULL,
  role varchar(32) NOT NULL DEFAULT 'viewer',
  is_active tinyint NOT NULL DEFAULT 1,
  last_login_at datetime DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_username (username)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Management users';

CREATE TABLE IF NOT EXISTS iot_user_session (
  id bigint NOT NULL AUTO_INCREMENT,
  user_id bigint NOT NULL,
  token_hash varchar(64) NOT NULL,
  expires_at datetime NOT NULL,
  last_used_at datetime DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_token_hash (token_hash),
  KEY idx_user_id (user_id),
  KEY idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Login sessions';

CREATE TABLE IF NOT EXISTS iot_runtime_setting (
  id bigint NOT NULL AUTO_INCREMENT,
  setting_key varchar(64) NOT NULL,
  setting_value varchar(255) DEFAULT NULL,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_setting_key (setting_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Runtime settings';

CREATE TABLE IF NOT EXISTS iot_leaf_session (
  id bigint NOT NULL AUTO_INCREMENT,
  plant_code varchar(64) NOT NULL,
  pot_code varchar(64) DEFAULT NULL,
  observed_at datetime NOT NULL,
  operator_name varchar(64) DEFAULT NULL,
  leaf_limit tinyint NOT NULL DEFAULT 8,
  expected_leaf_type varchar(64) NOT NULL DEFAULT 'fully_expanded_functional',
  remark varchar(255) DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_leaf_session_plant_time (plant_code, observed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Leaf observation sessions';

CREATE TABLE IF NOT EXISTS iot_leaf_record (
  id bigint NOT NULL AUTO_INCREMENT,
  session_id bigint NOT NULL,
  leaf_index tinyint NOT NULL,
  canopy_position varchar(16) NOT NULL,
  avg_length_mm decimal(12,2) DEFAULT NULL,
  avg_width_mm decimal(12,2) DEFAULT NULL,
  avg_area_mm2 decimal(12,2) DEFAULT NULL,
  image_count int NOT NULL DEFAULT 0,
  accepted_image_count int NOT NULL DEFAULT 0,
  latest_measured_at datetime DEFAULT NULL,
  remark varchar(255) DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_leaf_session_index (session_id, leaf_index),
  KEY idx_leaf_record_session (session_id),
  CONSTRAINT fk_leaf_record_session
    FOREIGN KEY (session_id) REFERENCES iot_leaf_session (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Leaf measurement records';

CREATE TABLE IF NOT EXISTS iot_leaf_image (
  id bigint NOT NULL AUTO_INCREMENT,
  session_id bigint NOT NULL,
  leaf_record_id bigint NOT NULL,
  image_name varchar(255) NOT NULL,
  original_file_name varchar(255) DEFAULT NULL,
  original_path varchar(512) NOT NULL,
  overlay_path varchar(512) DEFAULT NULL,
  calibration_length_mm decimal(12,2) NOT NULL,
  calibration_pixels decimal(12,2) NOT NULL,
  pixels_per_mm decimal(12,4) NOT NULL,
  leaf_length_mm decimal(12,2) DEFAULT NULL,
  leaf_width_mm decimal(12,2) DEFAULT NULL,
  leaf_area_mm2 decimal(12,2) DEFAULT NULL,
  created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_leaf_image_record (leaf_record_id),
  KEY idx_leaf_image_session (session_id),
  CONSTRAINT fk_leaf_image_session
    FOREIGN KEY (session_id) REFERENCES iot_leaf_session (id) ON DELETE CASCADE,
  CONSTRAINT fk_leaf_image_record
    FOREIGN KEY (leaf_record_id) REFERENCES iot_leaf_record (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  COMMENT='Leaf images and computed metrics';
