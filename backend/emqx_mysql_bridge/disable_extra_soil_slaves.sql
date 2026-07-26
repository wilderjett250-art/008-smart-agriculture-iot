ALTER TABLE iot_rs485_device
  ADD COLUMN IF NOT EXISTS is_active TINYINT NOT NULL DEFAULT 1 COMMENT '1 active 0 disabled';

UPDATE iot_rs485_device
SET is_active = 0
WHERE device_type = 'soil_4in1'
  AND slave_addr > 4;

SELECT device_code, gateway_code, slave_addr, device_type, is_active
FROM iot_rs485_device
ORDER BY gateway_code ASC, slave_addr ASC;
