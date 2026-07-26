const express = require('express');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { execSync, execFile } = require('child_process');
const nodemailer = require('nodemailer');
const os = require('os');
const multer = require('multer');

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));
const APP_PORT = Number(process.env.IOT_PORT || 3001);

const dbConfig = {
  host: process.env.IOT_DB_HOST || 'localhost',
  port: Number(process.env.IOT_DB_PORT || 3306),
  user: process.env.IOT_DB_USER || 'emqx_iot',
  password: process.env.IOT_DB_PASSWORD || '',
  database: process.env.IOT_DB_NAME || 'iot_data',
  waitForConnections: true,
  connectionLimit: Number(process.env.IOT_DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
};

const pool = mysql.createPool(dbConfig);

const TOKEN_TTL_HOURS = 12;
const DEFAULT_ADMIN_USERNAME = process.env.IOT_ADMIN_USERNAME || 'admin';
const DEFAULT_ADMIN_PASSWORD = process.env.IOT_ADMIN_PASSWORD || '';
const DEFAULT_ADMIN_DISPLAY_NAME = process.env.IOT_ADMIN_DISPLAY_NAME || 'Lab Admin';
const DEFAULT_VIEWER_USERNAME = process.env.IOT_VIEWER_USERNAME || 'viewer';
const DEFAULT_VIEWER_PASSWORD = process.env.IOT_VIEWER_PASSWORD || '';
const DEFAULT_VIEWER_DISPLAY_NAME = process.env.IOT_VIEWER_DISPLAY_NAME || 'Read Only';
const MAIL_HOST = process.env.IOT_MAIL_HOST || 'smtp.qq.com';
const MAIL_PORT = Number(process.env.IOT_MAIL_PORT || 465);
const MAIL_SECURE = String(process.env.IOT_MAIL_SECURE || 'true') === 'true';
const MAIL_USER = process.env.IOT_MAIL_USER || '';
const MAIL_PASS = process.env.IOT_MAIL_PASS || '';
const MAIL_TO = process.env.IOT_MAIL_TO || '';
const ARCHIVE_DIR = process.env.IOT_ARCHIVE_DIR || '/home/admin/emqx_mysql_bridge/archives';
const ARCHIVE_SCHEDULE_HOUR = Number(process.env.IOT_ARCHIVE_HOUR || 0);
const ARCHIVE_SCHEDULE_MINUTE = Number(process.env.IOT_ARCHIVE_MINUTE || 30);
const DISK_ALERT_THRESHOLD = Number(process.env.IOT_DISK_ALERT_THRESHOLD || 80);
const DISK_ALERT_FREE_THRESHOLD = Number(process.env.IOT_DISK_ALERT_FREE_THRESHOLD || 70);
const DISK_ALERT_COOLDOWN_HOURS = Number(process.env.IOT_DISK_ALERT_COOLDOWN_HOURS || 12);
const DISK_CHECK_INTERVAL_MS = Number(process.env.IOT_DISK_CHECK_INTERVAL_MS || 30 * 60 * 1000);
const ARCHIVE_CHECK_INTERVAL_MS = Number(process.env.IOT_ARCHIVE_CHECK_INTERVAL_MS || 60 * 1000);
const SOIL_TABLE = 'soil_sensor_data';
const AIR_TABLE = 'air_sensor_data';
const VERBOSE_HTTP_LOGS = String(process.env.IOT_VERBOSE_HTTP_LOGS || 'false') === 'true';
const REQUEST_LOG_SLOW_MS = Number(process.env.IOT_REQUEST_LOG_SLOW_MS || 1500);
const ALLOW_AUTO_REGISTER_DEVICES = String(process.env.IOT_ALLOW_AUTO_REGISTER_DEVICES || 'false') === 'true';
const MAX_SOIL_SLAVE_ADDR = Number(process.env.IOT_MAX_SOIL_SLAVE_ADDR || 64);
const QUERY_CACHE_ENABLED = String(process.env.IOT_QUERY_CACHE_ENABLED || 'true') === 'true';
const QUERY_CACHE_TTL_MS = Number(process.env.IOT_QUERY_CACHE_TTL_MS || 15000);
const PREVIEW_CACHE_TTL_MS = Number(process.env.IOT_PREVIEW_CACHE_TTL_MS || 30000);
const RATE_LIMIT_WINDOW_MS = Number(process.env.IOT_RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_HEAVY_MAX = Number(process.env.IOT_RATE_LIMIT_HEAVY_MAX || 40);
const RATE_LIMIT_PREVIEW_MAX = Number(process.env.IOT_RATE_LIMIT_PREVIEW_MAX || 12);
const LEAF_UPLOAD_DIR = process.env.IOT_LEAF_UPLOAD_DIR || path.join(__dirname, 'data', 'leaf_uploads');
const LEAF_ORIGINAL_DIR = path.join(LEAF_UPLOAD_DIR, 'originals');
const LEAF_OVERLAY_DIR = path.join(LEAF_UPLOAD_DIR, 'overlays');
const LEAF_ANALYZER_SCRIPT = process.env.IOT_LEAF_ANALYZER_SCRIPT || path.join(__dirname, 'tools', 'analyze_leaf.py');
const PYTHON_BIN = process.env.IOT_PYTHON_BIN || 'python';
const LEAF_MAX_COUNT = Number(process.env.IOT_LEAF_MAX_COUNT || 8);
const LEAF_ALLOWED_POSITIONS = new Set(['upper', 'middle', 'lower']);
let runtimeDiskAlertFreeThreshold = Number.isFinite(DISK_ALERT_FREE_THRESHOLD) ? DISK_ALERT_FREE_THRESHOLD : 70;

let mailTransporter = null;
let archiveTimer = null;
let diskCheckTimer = null;
let lastArchiveRunKey = '';
let lastDiskAlertAt = 0;
let lastCpuSample = null;
let lastDiskIoSample = null;
let lastNetworkSample = null;
const responseCache = new Map();
const rateLimitStore = new Map();

const leafUploadStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, LEAF_ORIGINAL_DIR);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    cb(null, `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const leafUpload = multer({
  storage: leafUploadStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use('/uploads/leaf/originals', express.static(LEAF_ORIGINAL_DIR));
app.use('/uploads/leaf/overlays', express.static(LEAF_OVERLAY_DIR));

function isEmptyLike(value) {
  return (
    value === undefined
    || value === null
    || value === ''
    || value === 'undefined'
    || value === 'null'
  );
}

function toNullableString(value) {
  return isEmptyLike(value) ? null : String(value).trim();
}

function toNullableInt(value) {
  if (isEmptyLike(value)) return null;
  const n = parseInt(value, 10);
  return Number.isNaN(n) ? null : n;
}

function toNullableFloat(value) {
  if (isEmptyLike(value)) return null;
  const n = parseFloat(value);
  return Number.isNaN(n) ? null : n;
}

function clampPercent(value, min = 1, max = 95) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.min(max, Math.max(min, Math.round(num)));
}

function toStringArray(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(','))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (isEmptyLike(value)) {
    return [];
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatBeijingDateTime(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  const formatter = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return formatter.format(date).replace(',', '');
}

function formatRowDateFields(row, fields) {
  if (!row) return row;

  const nextRow = { ...row };
  fields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(nextRow, field)) {
      nextRow[field] = formatBeijingDateTime(nextRow[field]);
    }
  });
  return nextRow;
}

function formatRowsDateFields(rows, fields) {
  return rows.map((row) => formatRowDateFields(row, fields));
}

function toMySQLDateTimeOrNow(value) {
  if (isEmptyLike(value)) {
    return formatBeijingDateTime(new Date());
  }

  const s = String(value).trim();
  const mysqlDateTimeRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
  if (mysqlDateTimeRegex.test(s)) return s;

  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    return formatBeijingDateTime(parsed);
  }

  return formatBeijingDateTime(new Date());
}

function normalizeLimit(value, fallback = 50, max = 500) {
  let limit = toNullableInt(value);
  if (!limit || limit <= 0) {
    limit = fallback;
  }
  if (limit > max) {
    limit = max;
  }
  return Number(limit);
}

function normalizeLeafIndex(value) {
  const leafIndex = toNullableInt(value);
  if (!leafIndex || leafIndex < 1 || leafIndex > LEAF_MAX_COUNT) {
    return null;
  }
  return leafIndex;
}

function normalizeLeafPosition(value) {
  const position = toNullableString(value);
  if (!position) return null;
  return LEAF_ALLOWED_POSITIONS.has(position) ? position : null;
}

function normalizePositiveFloat(value) {
  const num = toNullableFloat(value);
  if (num === null || num <= 0) return null;
  return num;
}

function getMaxSoilSlaveAddr(gatewayCode) {
  if (gatewayCode === 'SOIL_022') {
    return 4;
  }
  if (gatewayCode && /^SOIL_\d{3}$/.test(gatewayCode)) {
    return 6;
  }
  return MAX_SOIL_SLAVE_ADDR;
}

function publicLeafUrl(type, fileName) {
  if (!fileName) return null;
  return `uploads/leaf/${type}/${fileName}`;
}

async function ensureLeafUploadDirs() {
  await fs.mkdir(LEAF_ORIGINAL_DIR, { recursive: true });
  await fs.mkdir(LEAF_OVERLAY_DIR, { recursive: true });
}

function runLeafAnalyzer({
  imagePath,
  overlayPath,
  calibrationLengthMm,
  x1,
  y1,
  x2,
  y2,
  leafIndex,
}) {
  return new Promise((resolve, reject) => {
    execFile(
      PYTHON_BIN,
      [
        LEAF_ANALYZER_SCRIPT,
        imagePath,
        overlayPath,
        String(calibrationLengthMm),
        String(x1),
        String(y1),
        String(x2),
        String(y2),
        String(leafIndex),
      ],
      {
        cwd: __dirname,
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr?.trim() || error.message));
          return;
        }

        try {
          resolve(JSON.parse(stdout.trim()));
        } catch (parseError) {
          reject(new Error(`leaf analyzer output parse failed: ${parseError.message}`));
        }
      },
    );
  });
}

function detectDeviceType(body) {
  const explicitType = toNullableString(body.device_type);
  if (explicitType) return explicitType;

  const hasAirOnlyMetric = !isEmptyLike(body.co2) || !isEmptyLike(body.lux);
  if (hasAirOnlyMetric) {
    return 'air_4in1';
  }
  return 'soil_4in1';
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function stableStringifyQuery(query = {}) {
  return Object.keys(query)
    .sort()
    .map((key) => `${key}=${query[key]}`)
    .join('&');
}

function clearResponseCache(prefixes = []) {
  if (!prefixes.length) {
    responseCache.clear();
    return;
  }
  for (const key of responseCache.keys()) {
    if (prefixes.some((prefix) => key.startsWith(prefix))) {
      responseCache.delete(key);
    }
  }
}

async function sendCachedJson(req, res, ttlMs, builder) {
  if (!QUERY_CACHE_ENABLED || ttlMs <= 0) {
    return res.json(await builder());
  }

  const cacheKey = `${req.method}:${req.path}:${stableStringifyQuery(req.query)}`;
  const current = Date.now();
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expiresAt > current) {
    return res.json(cached.payload);
  }

  const payload = await builder();
  responseCache.set(cacheKey, {
    expiresAt: current + ttlMs,
    payload,
  });
  return res.json(payload);
}

function createRateLimiter(name, maxRequests) {
  return (req, res, next) => {
    const current = Date.now();
    const key = `${name}:${getClientIp(req)}`;
    const record = rateLimitStore.get(key);

    if (!record || record.expiresAt <= current) {
      rateLimitStore.set(key, {
        count: 1,
        expiresAt: current + RATE_LIMIT_WINDOW_MS,
      });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        code: 429,
        message: 'too many requests, please slow down',
      });
    }

    record.count += 1;
    rateLimitStore.set(key, record);
    return next();
  };
}

const heavyReadLimiter = createRateLimiter('heavy-read', RATE_LIMIT_HEAVY_MAX);
const previewReadLimiter = createRateLimiter('preview-read', RATE_LIMIT_PREVIEW_MAX);

const DATASET_EXPORT_COLUMNS = [
  { key: 'soil_record_id', label: 'soil_record_id' },
  { key: 'pot_code', label: 'pot_code' },
  { key: 'group_type', label: 'group_type' },
  { key: 'soil_gateway_code', label: 'soil_gateway_code' },
  { key: 'soil_device_code', label: 'soil_device_code' },
  { key: 'soil_slave_addr', label: 'soil_slave_addr' },
  { key: 'soil_temperature', label: 'soil_temperature' },
  { key: 'soil_humidity', label: 'soil_humidity' },
  { key: 'soil_ph', label: 'soil_ph' },
  { key: 'soil_ec', label: 'soil_ec' },
  { key: 'soil_salinity', label: 'soil_salinity' },
  { key: 'soil_nitrogen', label: 'soil_nitrogen' },
  { key: 'soil_phosphorus', label: 'soil_phosphorus' },
  { key: 'soil_potassium', label: 'soil_potassium' },
  { key: 'collect_status', label: 'collect_status' },
  { key: 'error_msg', label: 'error_msg' },
  { key: 'soil_collected_at', label: 'soil_collected_at' },
  { key: 'soil_received_at', label: 'soil_received_at' },
  { key: 'air_device_code', label: 'air_device_code' },
  { key: 'air_temperature', label: 'air_temperature' },
  { key: 'air_humidity', label: 'air_humidity' },
  { key: 'air_co2', label: 'air_co2' },
  { key: 'air_lux', label: 'air_lux' },
  { key: 'air_collected_at', label: 'air_collected_at' },
  { key: 'air_time_offset_seconds', label: 'air_time_offset_seconds' },
];

const SOIL_EXPORT_COLUMNS = [
  'id',
  'gateway_code',
  'device_code',
  'slave_addr',
  'pot_code',
  'group_type',
  'temperature',
  'humidity',
  'ec',
  'salinity',
  'nitrogen',
  'phosphorus',
  'potassium',
  'ph',
  'collect_status',
  'error_msg',
  'collected_at',
  'received_at',
];

const AIR_EXPORT_COLUMNS = [
  'id',
  'gateway_code',
  'device_code',
  'slave_addr',
  'temperature',
  'humidity',
  'co2',
  'lux',
  'collect_status',
  'error_msg',
  'collected_at',
  'received_at',
];

function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function escapeXml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDatasetDateTime(value) {
  if (!value) return null;
  return formatBeijingDateTime(value);
}

function getMailer() {
  if (!MAIL_PASS) return null;
  if (!mailTransporter) {
    mailTransporter = nodemailer.createTransport({
      host: MAIL_HOST,
      port: MAIL_PORT,
      secure: MAIL_SECURE,
      auth: {
        user: MAIL_USER,
        pass: MAIL_PASS,
      },
    });
  }
  return mailTransporter;
}

function getSensorTableByType(deviceType) {
  return deviceType === 'air_4in1' ? AIR_TABLE : SOIL_TABLE;
}

function getBeijingNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
}

function formatDateKey(date) {
  return formatBeijingDateTime(date).slice(0, 10);
}

function buildCsv(columns, rows) {
  const lines = [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => escapeCsvCell(row[column])).join(',')),
  ];
  return `\uFEFF${lines.join('\n')}`;
}

async function ensureArchiveDir() {
  await fs.mkdir(ARCHIVE_DIR, { recursive: true });
}

async function loadRuntimeSettings() {
  const [rows] = await pool.execute(
    `SELECT setting_key, setting_value
     FROM iot_runtime_setting
     WHERE setting_key IN ('disk_alert_free_threshold')`,
  );

  rows.forEach((row) => {
    if (row.setting_key === 'disk_alert_free_threshold') {
      const nextValue = clampPercent(row.setting_value, 5, 95);
      if (nextValue !== null) {
        runtimeDiskAlertFreeThreshold = nextValue;
      }
    }
  });
}

async function upsertRuntimeSetting(settingKey, settingValue) {
  await pool.execute(
    `INSERT INTO iot_runtime_setting
     (setting_key, setting_value, updated_at)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE
       setting_value = VALUES(setting_value),
       updated_at = NOW()`,
    [settingKey, String(settingValue)],
  );
}

function getDiskUsageStats() {
  const output = execSync('df -P /', { encoding: 'utf8' }).trim().split('\n');
  if (output.length < 2) return null;
  const columns = output[1].trim().split(/\s+/);
  const deviceName = String(columns[0] || '').replace('/dev/', '');
  const totalKb = Number(columns[1] || 0);
  const usedKb = Number(columns[2] || 0);
  const availableKb = Number(columns[3] || 0);
  const useText = columns[4] || '';
  const usagePercent = Number(String(useText).replace('%', ''));
  if (!Number.isFinite(usagePercent)) {
    return null;
  }

  const freePercent = totalKb > 0 ? Number((((availableKb / totalKb) * 100)).toFixed(2)) : null;
  const gbDivisor = 1024 * 1024;

  return {
    total_kb: totalKb,
    used_kb: usedKb,
    available_kb: availableKb,
    usage_percent: usagePercent,
    free_percent: freePercent,
    total_gb: totalKb > 0 ? Number((totalKb / gbDivisor).toFixed(2)) : null,
    used_gb: usedKb > 0 ? Number((usedKb / gbDivisor).toFixed(2)) : 0,
    available_gb: availableKb > 0 ? Number((availableKb / gbDivisor).toFixed(2)) : 0,
    mount_point: columns[5] || '/',
    device_name: deviceName,
  };
}

function getCpuUsageStats() {
  try {
    const cpuLine = execSync("cat /proc/stat | head -n 1", { encoding: 'utf8' }).trim();
    const parts = cpuLine.split(/\s+/).slice(1).map((item) => Number(item));
    if (parts.length < 4 || parts.some((item) => !Number.isFinite(item))) {
      return {
        usage_percent: null,
        sample_ms: null,
      };
    }

    const idle = (parts[3] || 0) + (parts[4] || 0);
    const total = parts.reduce((sum, item) => sum + item, 0);
    const now = Date.now();

    if (!lastCpuSample) {
      lastCpuSample = { idle, total, at: now };
      return {
        usage_percent: null,
        sample_ms: null,
      };
    }

    const idleDelta = idle - lastCpuSample.idle;
    const totalDelta = total - lastCpuSample.total;
    const timeDelta = now - lastCpuSample.at;
    lastCpuSample = { idle, total, at: now };

    if (totalDelta <= 0 || timeDelta <= 0) {
      return {
        usage_percent: null,
        sample_ms: timeDelta > 0 ? timeDelta : null,
      };
    }

    const usagePercent = Number((((totalDelta - idleDelta) / totalDelta) * 100).toFixed(2));
    return {
      usage_percent: usagePercent,
      sample_ms: timeDelta,
    };
  } catch (error) {
    return {
      usage_percent: null,
      sample_ms: null,
    };
  }
}

function getDiskIoStats(deviceName) {
  if (!deviceName) {
    return {
      read_bps: null,
      write_bps: null,
      sample_ms: null,
    };
  }

  try {
    const lines = execSync('cat /proc/diskstats', { encoding: 'utf8' }).trim().split('\n');
    const target = lines.find((line) => {
      const parts = line.trim().split(/\s+/);
      return parts[2] === deviceName;
    });

    if (!target) {
      return {
        read_bps: null,
        write_bps: null,
        sample_ms: null,
      };
    }

    const parts = target.trim().split(/\s+/);
    const sectorsRead = Number(parts[5] || 0);
    const sectorsWritten = Number(parts[9] || 0);
    if (!Number.isFinite(sectorsRead) || !Number.isFinite(sectorsWritten)) {
      return {
        read_bps: null,
        write_bps: null,
        sample_ms: null,
      };
    }

    const now = Date.now();
    const readBytes = sectorsRead * 512;
    const writeBytes = sectorsWritten * 512;

    if (!lastDiskIoSample || lastDiskIoSample.device_name !== deviceName) {
      lastDiskIoSample = { device_name: deviceName, read_bytes: readBytes, write_bytes: writeBytes, at: now };
      return {
        read_bps: null,
        write_bps: null,
        sample_ms: null,
      };
    }

    const timeDelta = now - lastDiskIoSample.at;
    const readDelta = Math.max(0, readBytes - lastDiskIoSample.read_bytes);
    const writeDelta = Math.max(0, writeBytes - lastDiskIoSample.write_bytes);
    lastDiskIoSample = { device_name: deviceName, read_bytes: readBytes, write_bytes: writeBytes, at: now };

    if (timeDelta <= 0) {
      return {
        read_bps: null,
        write_bps: null,
        sample_ms: null,
      };
    }

    return {
      read_bps: Number((readDelta / (timeDelta / 1000)).toFixed(2)),
      write_bps: Number((writeDelta / (timeDelta / 1000)).toFixed(2)),
      sample_ms: timeDelta,
    };
  } catch (error) {
    return {
      read_bps: null,
      write_bps: null,
      sample_ms: null,
    };
  }
}

function getNetworkStats() {
  try {
    const lines = execSync('cat /proc/net/dev', { encoding: 'utf8' }).trim().split('\n').slice(2);
    let rxBytes = 0;
    let txBytes = 0;

    lines.forEach((line) => {
      const [ifaceRaw, statsRaw] = line.split(':');
      const iface = String(ifaceRaw || '').trim();
      if (!iface || iface === 'lo' || iface.startsWith('docker') || iface.startsWith('veth') || iface.startsWith('br-')) {
        return;
      }
      const values = String(statsRaw || '').trim().split(/\s+/).map((item) => Number(item));
      if (values.length < 9) return;
      rxBytes += Number(values[0] || 0);
      txBytes += Number(values[8] || 0);
    });

    const now = Date.now();
    if (!lastNetworkSample) {
      lastNetworkSample = { rx_bytes: rxBytes, tx_bytes: txBytes, at: now };
      return {
        rx_bps: null,
        tx_bps: null,
        sample_ms: null,
      };
    }

    const timeDelta = now - lastNetworkSample.at;
    const rxDelta = Math.max(0, rxBytes - lastNetworkSample.rx_bytes);
    const txDelta = Math.max(0, txBytes - lastNetworkSample.tx_bytes);
    lastNetworkSample = { rx_bytes: rxBytes, tx_bytes: txBytes, at: now };

    if (timeDelta <= 0) {
      return {
        rx_bps: null,
        tx_bps: null,
        sample_ms: null,
      };
    }

    return {
      rx_bps: Number((rxDelta / (timeDelta / 1000)).toFixed(2)),
      tx_bps: Number((txDelta / (timeDelta / 1000)).toFixed(2)),
      sample_ms: timeDelta,
    };
  } catch (error) {
    return {
      rx_bps: null,
      tx_bps: null,
      sample_ms: null,
    };
  }
}

function getServerStatusSnapshot() {
  const disk = getDiskUsageStats();
  const cpu = getCpuUsageStats();
  const diskIo = getDiskIoStats(disk?.device_name);
  const network = getNetworkStats();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memPercent = totalMem > 0 ? Number(((usedMem / totalMem) * 100).toFixed(2)) : null;
  const bytesPerGb = 1024 * 1024 * 1024;

  return {
    backend_status: 'online',
    timestamp: formatBeijingDateTime(new Date()),
    uptime_seconds: Math.floor(os.uptime()),
    load_average: os.loadavg().map((value) => Number(value.toFixed(2))),
    cpu_cores: os.cpus().length,
    cpu,
    disk_io: diskIo,
    network,
    memory: {
      total_gb: Number((totalMem / bytesPerGb).toFixed(2)),
      used_gb: Number((usedMem / bytesPerGb).toFixed(2)),
      free_gb: Number((freeMem / bytesPerGb).toFixed(2)),
      usage_percent: memPercent,
    },
    disk,
    disk_alert: {
      mode: 'free_percent_lte',
      threshold_percent: runtimeDiskAlertFreeThreshold,
    },
  };
}

function buildDatasetCsv(rows) {
  const lines = [
    DATASET_EXPORT_COLUMNS.map((column) => column.label).join(','),
    ...rows.map((row) => DATASET_EXPORT_COLUMNS.map((column) => escapeCsvCell(row[column.key])).join(',')),
  ];
  return `\uFEFF${lines.join('\n')}`;
}

function buildDatasetExcel(rowSet) {
  const headerCells = DATASET_EXPORT_COLUMNS
    .map((column) => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(column.label)}</Data></Cell>`)
    .join('');

  const bodyRows = rowSet.map((row) => {
    const cells = DATASET_EXPORT_COLUMNS.map((column) => {
      const value = row[column.key];
      if (value === null || value === undefined || value === '') {
        return '<Cell/>';
      }

      const valueText = String(value);
      const numericValue = Number(valueText);
      const isNumber = valueText.trim() !== '' && Number.isFinite(numericValue) && !/^0\d+/.test(valueText);
      const type = isNumber ? 'Number' : 'String';
      const cellValue = isNumber ? numericValue : escapeXml(valueText);
      return `<Cell><Data ss:Type="${type}">${cellValue}</Data></Cell>`;
    }).join('');

    return `<Row>${cells}</Row>`;
  }).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Author>Codex</Author>
  <LastAuthor>Codex</LastAuthor>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Color="#111111"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="header">
   <Font ss:FontName="Microsoft YaHei" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#1F4E78" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="dataset_export">
  <Table>
   <Row>${headerCells}</Row>
   ${bodyRows}
  </Table>
 </Worksheet>
</Workbook>`;
}

async function querySoilRows(filters = {}) {
  const groupType = toNullableString(filters.group_type);
  const plantCode = toNullableString(filters.plant_code);
  const gatewayCode = toNullableString(filters.gateway_code);
  const deviceCode = toNullableString(filters.device_code);
  const deviceCodes = [...new Set([
    ...toStringArray(filters.device_codes),
    ...(deviceCode ? [deviceCode] : []),
  ])];
  const startTime = isEmptyLike(filters.start_time) ? null : toMySQLDateTimeOrNow(filters.start_time);
  const endTime = isEmptyLike(filters.end_time) ? null : toMySQLDateTimeOrNow(filters.end_time);
  const limit = normalizeLimit(filters.limit, 500, 1000);

  const where = [
    '1 = 1',
  ];
  const params = [];

  if (groupType) {
    where.push('p.group_type = ?');
    params.push(groupType);
  }
  if (plantCode) {
    where.push('b.plant_code = ?');
    params.push(plantCode);
  }
  if (gatewayCode) {
    where.push('sd.gateway_code = ?');
    params.push(gatewayCode);
  }
  if (deviceCodes.length === 1) {
    where.push('sd.device_code = ?');
    params.push(deviceCodes[0]);
  } else if (deviceCodes.length > 1) {
    where.push(`sd.device_code IN (${deviceCodes.map(() => '?').join(', ')})`);
    params.push(...deviceCodes);
  }
  if (startTime) {
    where.push('sd.collected_at >= ?');
    params.push(startTime);
  }
  if (endTime) {
    where.push('sd.collected_at <= ?');
    params.push(endTime);
  }

  const whereSql = `WHERE ${where.join(' AND ')}`;

  const [rows] = await pool.query(
    `SELECT
       sd.id AS soil_record_id,
       b.plant_code,
       b.pot_code,
       p.group_type,
       sd.gateway_code AS soil_gateway_code,
       sd.device_code AS soil_device_code,
       sd.slave_addr AS soil_slave_addr,
       sd.temperature AS soil_temperature,
       sd.humidity AS soil_humidity,
       sd.ph AS soil_ph,
       sd.ec AS soil_ec,
       sd.salinity AS soil_salinity,
       sd.nitrogen AS soil_nitrogen,
       sd.phosphorus AS soil_phosphorus,
       sd.potassium AS soil_potassium,
       sd.collect_status,
       sd.error_msg,
       sd.collected_at AS soil_collected_at,
       sd.received_at AS soil_received_at,
       air.device_code AS air_device_code,
       air.temperature AS air_temperature,
       air.humidity AS air_humidity,
       air.co2 AS air_co2,
       air.lux AS air_lux,
       air.collected_at AS air_collected_at,
       CASE
         WHEN air.collected_at IS NULL THEN NULL
         ELSE ABS(TIMESTAMPDIFF(SECOND, air.collected_at, sd.collected_at))
       END AS air_time_offset_seconds
     FROM ${SOIL_TABLE} sd
     LEFT JOIN iot_sensor_binding b
       ON sd.device_code = b.device_code
      AND b.start_time <= sd.collected_at
      AND (b.end_time IS NULL OR b.end_time >= sd.collected_at)
     LEFT JOIN iot_plant p
       ON b.plant_code = p.plant_code
     LEFT JOIN ${AIR_TABLE} air
       ON air.id = (
         SELECT air2.id
         FROM ${AIR_TABLE} air2
         ORDER BY ABS(TIMESTAMPDIFF(SECOND, air2.collected_at, sd.collected_at)) ASC, air2.id DESC
         LIMIT 1
       )
     ${whereSql}
     ORDER BY sd.collected_at DESC, sd.id DESC
     LIMIT ${limit}`,
    params,
  );

  return rows.map((row) => ({
    ...row,
    soil_collected_at: formatDatasetDateTime(row.soil_collected_at),
    soil_received_at: formatDatasetDateTime(row.soil_received_at),
    air_collected_at: formatDatasetDateTime(row.air_collected_at),
  }));
}

async function queryAirRows(filters = {}) {
  const gatewayCode = toNullableString(filters.gateway_code);
  const deviceCode = toNullableString(filters.device_code);
  const deviceCodes = [...new Set([
    ...toStringArray(filters.device_codes),
    ...(deviceCode ? [deviceCode] : []),
  ])];
  const startTime = isEmptyLike(filters.start_time) ? null : toMySQLDateTimeOrNow(filters.start_time);
  const endTime = isEmptyLike(filters.end_time) ? null : toMySQLDateTimeOrNow(filters.end_time);
  const limit = normalizeLimit(filters.limit, 1000, 20000);
  const where = ['1 = 1'];
  const params = [];

  if (gatewayCode) {
    where.push('ad.gateway_code = ?');
    params.push(gatewayCode);
  }
  if (deviceCodes.length === 1) {
    where.push('ad.device_code = ?');
    params.push(deviceCodes[0]);
  } else if (deviceCodes.length > 1) {
    where.push(`ad.device_code IN (${deviceCodes.map(() => '?').join(', ')})`);
    params.push(...deviceCodes);
  }
  if (startTime) {
    where.push('ad.collected_at >= ?');
    params.push(startTime);
  }
  if (endTime) {
    where.push('ad.collected_at <= ?');
    params.push(endTime);
  }

  const [rows] = await pool.query(
    `SELECT
       ad.id AS air_record_id,
       ad.gateway_code,
       ad.device_code,
       ad.slave_addr,
       ad.temperature,
       ad.humidity,
       ad.co2,
       ad.lux,
       ad.collect_status,
       ad.error_msg,
       ad.collected_at,
       ad.received_at
     FROM ${AIR_TABLE} ad
     WHERE ${where.join(' AND ')}
     ORDER BY ad.collected_at DESC, ad.device_code ASC, ad.id DESC
     LIMIT ${limit}`,
    params,
  );

  return formatRowsDateFields(rows, ['collected_at', 'received_at']);
}

async function querySoilPreviewRows(filters = {}) {
  const groupType = toNullableString(filters.group_type);
  const gatewayCode = toNullableString(filters.gateway_code);
  const deviceCode = toNullableString(filters.device_code);
  const deviceCodes = [...new Set([
    ...toStringArray(filters.device_codes),
    ...(deviceCode ? [deviceCode] : []),
  ])];
  const startTime = isEmptyLike(filters.start_time) ? null : toMySQLDateTimeOrNow(filters.start_time);
  const endTime = isEmptyLike(filters.end_time) ? null : toMySQLDateTimeOrNow(filters.end_time);
  const limit = normalizeLimit(filters.limit, 500, 1000);
  const where = ['1 = 1'];
  const params = [];

  if (groupType) {
    where.push('p.group_type = ?');
    params.push(groupType);
  }
  if (gatewayCode) {
    where.push('sd.gateway_code = ?');
    params.push(gatewayCode);
  }
  if (deviceCodes.length === 1) {
    where.push('sd.device_code = ?');
    params.push(deviceCodes[0]);
  } else if (deviceCodes.length > 1) {
    where.push(`sd.device_code IN (${deviceCodes.map(() => '?').join(', ')})`);
    params.push(...deviceCodes);
  }
  if (startTime) {
    where.push('sd.collected_at >= ?');
    params.push(startTime);
  }
  if (endTime) {
    where.push('sd.collected_at <= ?');
    params.push(endTime);
  }

  const [rows] = await pool.query(
    `SELECT
       sd.id,
       sd.gateway_code,
       sd.device_code,
       sd.slave_addr,
       b.plant_code,
       b.pot_code,
       p.group_type,
       sd.temperature,
       sd.humidity,
       sd.ec,
       sd.salinity,
       sd.nitrogen,
       sd.phosphorus,
       sd.potassium,
       sd.ph,
       sd.collect_status,
       sd.error_msg,
       sd.collected_at,
       sd.received_at
     FROM ${SOIL_TABLE} sd
     LEFT JOIN iot_sensor_binding b
       ON sd.device_code = b.device_code
      AND b.start_time <= sd.collected_at
      AND (b.end_time IS NULL OR b.end_time >= sd.collected_at)
     LEFT JOIN iot_plant p
       ON b.plant_code = p.plant_code
     WHERE ${where.join(' AND ')}
     ORDER BY sd.collected_at DESC, sd.device_code ASC, sd.id DESC
     LIMIT ${limit}`,
    params,
  );

  return formatRowsDateFields(rows, ['collected_at', 'received_at']);
}

async function queryDatasetRows(filters = {}) {
  return querySoilRows(filters);
}

async function resolveDeviceType(deviceCode) {
  const [rows] = await pool.execute(
    `SELECT device_type
     FROM iot_rs485_device
     WHERE device_code = ?
     LIMIT 1`,
    [deviceCode],
  );
  return rows[0]?.device_type || null;
}

async function queryLatestSensorRecord(deviceCode) {
  const deviceType = await resolveDeviceType(deviceCode);
  const tableName = getSensorTableByType(deviceType);
  const [rows] = await pool.execute(
    `SELECT
       sd.*,
       d.device_type,
       b.plant_code,
       b.pot_code,
       p.group_type
     FROM ${tableName} sd
     LEFT JOIN iot_rs485_device d
       ON sd.device_code = d.device_code
     LEFT JOIN iot_sensor_binding b
       ON sd.device_code = b.device_code
      AND b.start_time <= sd.collected_at
      AND (b.end_time IS NULL OR b.end_time >= sd.collected_at)
     LEFT JOIN iot_plant p
       ON b.plant_code = p.plant_code
     WHERE sd.device_code = ?
     ORDER BY sd.collected_at DESC, sd.id DESC
     LIMIT 1`,
    [deviceCode],
  );
  return rows.length ? formatRowDateFields(rows[0], ['collected_at', 'received_at']) : null;
}

async function querySensorHistoryRows(deviceCode, limit, filters = {}) {
  const deviceType = await resolveDeviceType(deviceCode);
  const tableName = getSensorTableByType(deviceType);
  const startTime = isEmptyLike(filters.start_time) ? null : toMySQLDateTimeOrNow(filters.start_time);
  const endTime = isEmptyLike(filters.end_time) ? null : toMySQLDateTimeOrNow(filters.end_time);
  const where = ['sd.device_code = ?'];
  const params = [deviceCode];

  if (startTime) {
    where.push('sd.collected_at >= ?');
    params.push(startTime);
  }

  if (endTime) {
    where.push('sd.collected_at <= ?');
    params.push(endTime);
  }

  const [rows] = await pool.query(
    `SELECT
       sd.*,
       d.device_type,
       b.plant_code,
       b.pot_code,
       p.group_type
     FROM ${tableName} sd
     LEFT JOIN iot_rs485_device d
       ON sd.device_code = d.device_code
     LEFT JOIN iot_sensor_binding b
       ON sd.device_code = b.device_code
      AND b.start_time <= sd.collected_at
      AND (b.end_time IS NULL OR b.end_time >= sd.collected_at)
     LEFT JOIN iot_plant p
       ON b.plant_code = p.plant_code
     WHERE ${where.join(' AND ')}
     ORDER BY sd.collected_at DESC, sd.id DESC
     LIMIT ${limit}`,
    params,
  );
  return formatRowsDateFields(rows, ['collected_at', 'received_at']);
}

function sha256(text) {
  return crypto.createHash('sha256').update(String(text)).digest('hex');
}

function hashPassword(password) {
  const iterations = 100000;
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.pbkdf2Sync(String(password), salt, iterations, 32, 'sha256').toString('hex');
  return `pbkdf2_sha256$${iterations}$${salt}$${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const parts = String(storedHash).split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') return false;
  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expected = parts[3];
  const actual = crypto.pbkdf2Sync(String(password), salt, iterations, 32, 'sha256').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

function makeAccessToken() {
  return crypto.randomBytes(32).toString('hex');
}

function addHours(date, hours) {
  return new Date(date.getTime() + (hours * 60 * 60 * 1000));
}

function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7).trim();
}

function sanitizeUser(row) {
  if (!row) return null;
  return formatRowDateFields({
    id: row.id,
    username: row.username,
    display_name: row.display_name,
    role: row.role,
    is_active: row.is_active,
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }, ['last_login_at', 'created_at', 'updated_at']);
}

function normalizeUserActiveValue(value) {
  const activeValue = toNullableInt(value);
  if (activeValue === null) return null;
  return activeValue === 1 ? 1 : 0;
}

function hasRole(userRole, allowedRoles) {
  return allowedRoles.includes(userRole);
}

async function ensureColumn(tableName, columnName, ddl) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName],
  );

  if (!rows[0].cnt) {
    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${ddl}`);
  }
}

async function ensureIndex(tableName, indexName, ddl) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    [tableName, indexName],
  );

  if (!rows[0].cnt) {
    await pool.query(`ALTER TABLE ${tableName} ADD ${ddl}`);
  }
}

async function bootstrapSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${SOIL_TABLE} (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='soil sensor records'
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${AIR_TABLE} (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='air sensor records'
  `);
  await ensureColumn('iot_sensor_data', 'co2', '`co2` decimal(10,2) DEFAULT NULL COMMENT \'二氧化碳浓度\'');
  await ensureColumn('iot_sensor_data', 'lux', '`lux` decimal(10,2) DEFAULT NULL COMMENT \'光照强度\'');
  await ensureColumn('iot_sensor_data', 'salinity', '`salinity` decimal(10,2) DEFAULT NULL COMMENT \'salinity\'');
  await ensureColumn('iot_sensor_data', 'nitrogen', '`nitrogen` decimal(10,2) DEFAULT NULL COMMENT \'nitrogen\'');
  await ensureColumn('iot_sensor_data', 'phosphorus', '`phosphorus` decimal(10,2) DEFAULT NULL COMMENT \'phosphorus\'');
  await ensureColumn('iot_sensor_data', 'potassium', '`potassium` decimal(10,2) DEFAULT NULL COMMENT \'potassium\'');
  await ensureIndex('iot_sensor_data', 'idx_device_received_at', 'INDEX `idx_device_received_at` (`device_code`, `received_at`)');
  await ensureColumn('iot_rs485_device', 'is_active', '`is_active` tinyint NOT NULL DEFAULT 1 COMMENT \'1 active 0 disabled\'');
  await ensureIndex('iot_rs485_device', 'idx_gateway_device_active', 'INDEX `idx_gateway_device_active` (`gateway_code`, `device_type`, `is_active`)');

  await pool.query(`
    CREATE TABLE IF NOT EXISTS iot_plant (
      id bigint NOT NULL AUTO_INCREMENT,
      plant_code varchar(64) NOT NULL COMMENT '植株编号',
      pot_code varchar(64) DEFAULT NULL COMMENT '盆编号',
      group_type varchar(32) DEFAULT NULL COMMENT 'control/stress',
      treatment_type varchar(64) DEFAULT NULL COMMENT '处理类型',
      stress_type varchar(64) DEFAULT NULL COMMENT '胁迫类型',
      stress_level varchar(64) DEFAULT NULL COMMENT '胁迫强度',
      stress_started_at datetime DEFAULT NULL COMMENT '胁迫开始时间',
      remark varchar(255) DEFAULT NULL COMMENT '备注',
      is_active tinyint NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_plant_code (plant_code),
      KEY idx_group_type (group_type)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='植株表'
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS iot_pot (
      id bigint NOT NULL AUTO_INCREMENT,
      pot_code varchar(64) NOT NULL COMMENT '盆编号',
      zone_code varchar(64) DEFAULT NULL COMMENT '区域编号',
      position_code varchar(64) DEFAULT NULL COMMENT '位置编号',
      remark varchar(255) DEFAULT NULL COMMENT '备注',
      is_active tinyint NOT NULL DEFAULT 1 COMMENT '1启用 0停用',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_pot_code (pot_code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='盆表'
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS iot_sensor_binding (
      id bigint NOT NULL AUTO_INCREMENT,
      device_code varchar(64) NOT NULL COMMENT '传感器编号',
      plant_code varchar(64) DEFAULT NULL COMMENT '植株编号',
      pot_code varchar(64) DEFAULT NULL COMMENT '盆编号',
      binding_role varchar(32) NOT NULL DEFAULT 'primary' COMMENT '绑定角色',
      start_time datetime NOT NULL COMMENT '绑定开始时间',
      end_time datetime DEFAULT NULL COMMENT '绑定结束时间',
      is_active tinyint NOT NULL DEFAULT 1 COMMENT '1当前生效 0已结束',
      remark varchar(255) DEFAULT NULL COMMENT '备注',
      created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_binding_device_time (device_code, start_time, end_time),
      KEY idx_binding_plant_time (plant_code, start_time, end_time),
      KEY idx_binding_pot_time (pot_code, start_time, end_time)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='传感器-植株绑定关系表'
  `);

  await pool.query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='管理用户';
  `);

  await pool.query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='登录会话';
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS iot_runtime_setting (
      id bigint NOT NULL AUTO_INCREMENT,
      setting_key varchar(64) NOT NULL,
      setting_value varchar(255) DEFAULT NULL,
      updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uk_setting_key (setting_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='运行时设置';
  `);
  await pool.query(`
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='leaf observation sessions';
  `);

  await pool.query(`
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
      CONSTRAINT fk_leaf_record_session FOREIGN KEY (session_id) REFERENCES iot_leaf_session (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='leaf records';
  `);

  await pool.query(`
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
      CONSTRAINT fk_leaf_image_session FOREIGN KEY (session_id) REFERENCES iot_leaf_session (id) ON DELETE CASCADE,
      CONSTRAINT fk_leaf_image_record FOREIGN KEY (leaf_record_id) REFERENCES iot_leaf_record (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='leaf measurement images';
  `);
}

async function ensureDefaultUser(username, displayName, password, role) {
  const [rows] = await pool.execute(
    `SELECT id
     FROM iot_user
     WHERE username = ?
     LIMIT 1`,
    [username],
  );

  if (rows.length) {
    return;
  }

  await pool.execute(
    `INSERT INTO iot_user
     (username, display_name, password_hash, role, is_active)
     VALUES (?, ?, ?, ?, 1)`,
    [username, displayName, hashPassword(password), role],
  );
}

async function seedDefaultUsers() {
  if (!DEFAULT_ADMIN_PASSWORD || !DEFAULT_VIEWER_PASSWORD) {
    console.warn('Default users were not created: set IOT_ADMIN_PASSWORD and IOT_VIEWER_PASSWORD.');
    return;
  }

  await ensureDefaultUser(
    DEFAULT_ADMIN_USERNAME,
    DEFAULT_ADMIN_DISPLAY_NAME,
    DEFAULT_ADMIN_PASSWORD,
    'admin',
  );

  await ensureDefaultUser(
    DEFAULT_VIEWER_USERNAME,
    DEFAULT_VIEWER_DISPLAY_NAME,
    DEFAULT_VIEWER_PASSWORD,
    'viewer',
  );
}

async function withConnection(handler) {
  const conn = await pool.getConnection();
  try {
    return await handler(conn);
  } finally {
    conn.release();
  }
}

async function recalcLeafRecordStats(conn, leafRecordId) {
  const [statsRows] = await conn.execute(
    `SELECT
       COUNT(*) AS image_count,
       COUNT(*) AS accepted_image_count,
       AVG(leaf_length_mm) AS avg_length_mm,
       AVG(leaf_width_mm) AS avg_width_mm,
       AVG(leaf_area_mm2) AS avg_area_mm2,
       MAX(created_at) AS latest_measured_at
     FROM iot_leaf_image
     WHERE leaf_record_id = ?`,
    [leafRecordId],
  );

  const stats = statsRows[0] || {};
  await conn.execute(
    `UPDATE iot_leaf_record
     SET image_count = ?,
         accepted_image_count = ?,
         avg_length_mm = ?,
         avg_width_mm = ?,
         avg_area_mm2 = ?,
         latest_measured_at = ?,
         updated_at = NOW()
     WHERE id = ?`,
    [
      Number(stats.image_count || 0),
      Number(stats.accepted_image_count || 0),
      stats.avg_length_mm,
      stats.avg_width_mm,
      stats.avg_area_mm2,
      stats.latest_measured_at,
      leafRecordId,
    ],
  );
}

async function fetchLeafSessionDetail(sessionId) {
  const [sessionRows] = await pool.execute(
    `SELECT
       s.*,
       p.group_type
     FROM iot_leaf_session s
     LEFT JOIN iot_plant p
       ON s.plant_code = p.plant_code
     WHERE s.id = ?
     LIMIT 1`,
    [sessionId],
  );

  if (!sessionRows.length) {
    return null;
  }

  const [leafRows] = await pool.execute(
    `SELECT *
     FROM iot_leaf_record
     WHERE session_id = ?
     ORDER BY leaf_index ASC`,
    [sessionId],
  );

  const [imageRows] = await pool.execute(
    `SELECT *
     FROM iot_leaf_image
     WHERE session_id = ?
     ORDER BY created_at DESC, id DESC`,
    [sessionId],
  );

  const imagesByRecord = new Map();
  imageRows.forEach((row) => {
    const recordId = row.leaf_record_id;
    const next = {
      ...row,
      original_url: publicLeafUrl('originals', row.image_name),
      overlay_url: row.overlay_path ? publicLeafUrl('overlays', path.basename(row.overlay_path)) : null,
      created_at: formatBeijingDateTime(row.created_at),
    };
    if (!imagesByRecord.has(recordId)) {
      imagesByRecord.set(recordId, []);
    }
    imagesByRecord.get(recordId).push(next);
  });

  const leaves = leafRows.map((row) => ({
    ...formatRowDateFields(row, ['latest_measured_at', 'created_at', 'updated_at']),
    images: imagesByRecord.get(row.id) || [],
  }));

  const validLeaves = leaves.filter((leaf) => Number(leaf.accepted_image_count || 0) > 0);
  const summary = validLeaves.length
    ? {
      measured_leaf_count: validLeaves.length,
      avg_length_mm: validLeaves.reduce((sum, item) => sum + Number(item.avg_length_mm || 0), 0) / validLeaves.length,
      avg_width_mm: validLeaves.reduce((sum, item) => sum + Number(item.avg_width_mm || 0), 0) / validLeaves.length,
      avg_area_mm2: validLeaves.reduce((sum, item) => sum + Number(item.avg_area_mm2 || 0), 0) / validLeaves.length,
      total_images: leaves.reduce((sum, item) => sum + Number(item.image_count || 0), 0),
    }
    : {
      measured_leaf_count: 0,
      avg_length_mm: null,
      avg_width_mm: null,
      avg_area_mm2: null,
      total_images: leaves.reduce((sum, item) => sum + Number(item.image_count || 0), 0),
    };

  return {
    session: formatRowDateFields(sessionRows[0], ['observed_at', 'created_at', 'updated_at']),
    leaves,
    summary,
  };
}

async function getRegisteredDevice(deviceCode) {
  const [rows] = await pool.execute(
    `SELECT
       id,
       gateway_code,
       device_code,
       slave_addr,
       device_type,
       is_active
     FROM iot_rs485_device
     WHERE device_code = ?
     LIMIT 1`,
    [deviceCode],
  );
  return rows[0] || null;
}

async function validateIncomingDevice(payload) {
  const registeredDevice = await getRegisteredDevice(payload.deviceCode);

  if (registeredDevice) {
    if (toNullableInt(registeredDevice.is_active) === 0) {
      return {
        ok: false,
        status: 403,
        reason: 'device is disabled',
      };
    }
  } else {
    if (!ALLOW_AUTO_REGISTER_DEVICES) {
      return {
        ok: false,
        status: 403,
        reason: 'device is not registered',
      };
    }
  }

  if (
    payload.deviceType === 'soil_4in1'
    && Number.isFinite(payload.slaveAddr)
  ) {
    const maxSoilSlaveAddr = getMaxSoilSlaveAddr(payload.gatewayCode);
    if (payload.slaveAddr > maxSoilSlaveAddr) {
      return {
        ok: false,
        status: 403,
        reason: `soil slave_addr ${payload.slaveAddr} exceeds allowed max ${maxSoilSlaveAddr}`,
      };
    }
  }

  if (
    payload.deviceType === 'soil_4in1'
    && payload.gatewayCode === 'SOIL_022'
    && Number.isFinite(payload.slaveAddr)
    && payload.slaveAddr > 4
  ) {
    return {
      ok: false,
      status: 403,
      reason: `gateway ${payload.gatewayCode} only allows slave_addr 1-4`,
    };
  }

  return {
    ok: true,
    registeredDevice,
  };
}

async function resolveAuthUser(req) {
  const accessToken = extractBearerToken(req);
  if (!accessToken) return null;

  const tokenHash = sha256(accessToken);
  const [rows] = await pool.execute(
    `SELECT
       u.id,
       u.username,
       u.display_name,
       u.role,
       u.is_active,
       u.last_login_at,
       u.created_at,
       u.updated_at
     FROM iot_user_session s
     INNER JOIN iot_user u
       ON s.user_id = u.id
     WHERE s.token_hash = ?
       AND s.expires_at > NOW()
       AND u.is_active = 1
     LIMIT 1`,
    [tokenHash],
  );

  if (!rows.length) return null;

  await pool.execute(
    `UPDATE iot_user_session
     SET last_used_at = NOW()
     WHERE token_hash = ?`,
    [tokenHash],
  );

  return sanitizeUser(rows[0]);
}

function requireAuth(allowedRoles = []) {
  return async (req, res, next) => {
    try {
      const authUser = await resolveAuthUser(req);
      if (!authUser) {
        return res.status(401).json({
          code: 401,
          message: 'authentication required',
        });
      }

      if (allowedRoles.length && !hasRole(authUser.role, allowedRoles)) {
        return res.status(403).json({
          code: 403,
          message: 'permission denied',
        });
      }

      req.authUser = authUser;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

app.use((req, res, next) => {
  console.log(`\n👀 收到请求: ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📦 数据内容:', JSON.stringify(req.body));
  }
  if (req.method === 'GET' && req.query && Object.keys(req.query).length > 0) {
    console.log('🔎 查询参数:', JSON.stringify(req.query));
  }
  next();
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const username = toNullableString(req.body?.username);
    const password = toNullableString(req.body?.password);

    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        message: 'username and password are required',
      });
    }

    const [rows] = await pool.execute(
      `SELECT *
       FROM iot_user
       WHERE username = ?
         AND is_active = 1
       LIMIT 1`,
      [username],
    );

    if (!rows.length || !verifyPassword(password, rows[0].password_hash)) {
      return res.status(401).json({
        code: 401,
        message: 'invalid credentials',
      });
    }

    const accessToken = makeAccessToken();
    const tokenHash = sha256(accessToken);
    const expiresAt = toMySQLDateTimeOrNow(addHours(new Date(), TOKEN_TTL_HOURS));

    await withConnection(async (conn) => {
      await conn.beginTransaction();
      await conn.execute(
        `INSERT INTO iot_user_session
         (user_id, token_hash, expires_at, last_used_at)
         VALUES (?, ?, ?, NOW())`,
        [rows[0].id, tokenHash, expiresAt],
      );
      await conn.execute(
        `UPDATE iot_user
         SET last_login_at = NOW(),
             updated_at = NOW()
         WHERE id = ?`,
        [rows[0].id],
      );
      await conn.commit();
    });

    res.json({
      code: 0,
      message: 'success',
      data: {
        access_token: accessToken,
        expires_at: expiresAt,
        user: sanitizeUser(rows[0]),
      },
    });
  } catch (e) {
    console.error('❌ 登录失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'login failed',
      error: e.message,
    });
  }
});

app.get('/api/auth/me', requireAuth(['viewer', 'editor', 'admin']), async (req, res) => {
  res.json({
    code: 0,
    message: 'success',
    data: req.authUser,
  });
});

app.post('/api/auth/logout', requireAuth(['viewer', 'editor', 'admin']), async (req, res) => {
  try {
    const accessToken = extractBearerToken(req);
    await pool.execute(
      `DELETE FROM iot_user_session
       WHERE token_hash = ?`,
      [sha256(accessToken)],
    );

    res.json({
      code: 0,
      message: 'success',
    });
  } catch (e) {
    console.error('❌ 登出失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'logout failed',
      error: e.message,
    });
  }
});

app.get('/api/auth/users', requireAuth(['admin']), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT
         id,
         username,
         display_name,
         role,
         is_active,
         last_login_at,
         created_at,
         updated_at
       FROM iot_user
       ORDER BY created_at ASC`,
    );

    res.json({
      code: 0,
      message: 'success',
      data: rows.map(sanitizeUser),
    });
  } catch (e) {
    console.error('❌ 查询用户失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'query users failed',
      error: e.message,
    });
  }
});

app.post('/api/auth/users/upsert', requireAuth(['admin']), async (req, res) => {
  try {
    const username = toNullableString(req.body?.username);
    const displayName = toNullableString(req.body?.display_name);
    const role = toNullableString(req.body?.role) || 'viewer';
    const password = toNullableString(req.body?.password);
    const isActive = toNullableInt(req.body?.is_active) ?? 1;

    if (!username) {
      return res.status(400).json({
        code: 400,
        message: 'username is required',
      });
    }

    if (!['viewer', 'editor', 'admin'].includes(role)) {
      return res.status(400).json({
        code: 400,
        message: 'invalid role',
      });
    }

    const [existing] = await pool.execute(
      `SELECT id
       FROM iot_user
       WHERE username = ?
       LIMIT 1`,
      [username],
    );

    if (!existing.length && !password) {
      return res.status(400).json({
        code: 400,
        message: 'password is required for new user',
      });
    }

    if (existing.length) {
      if (password) {
        await pool.execute(
          `UPDATE iot_user
           SET display_name = ?,
               role = ?,
               is_active = ?,
               password_hash = ?,
               updated_at = NOW()
           WHERE username = ?`,
          [displayName, role, isActive, hashPassword(password), username],
        );
      } else {
        await pool.execute(
          `UPDATE iot_user
           SET display_name = ?,
               role = ?,
               is_active = ?,
               updated_at = NOW()
           WHERE username = ?`,
          [displayName, role, isActive, username],
        );
      }
    } else {
      await pool.execute(
        `INSERT INTO iot_user
         (username, display_name, password_hash, role, is_active)
         VALUES (?, ?, ?, ?, ?)`,
        [username, displayName, hashPassword(password), role, isActive],
      );
    }

    res.json({
      code: 0,
      message: 'success',
    });
  } catch (e) {
    console.error('❌ 保存用户失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'save user failed',
      error: e.message,
    });
  }
});

app.post('/api/auth/users/delete', requireAuth(['admin']), async (req, res) => {
  try {
    const username = toNullableString(req.body?.username);

    if (!username) {
      return res.status(400).json({
        code: 400,
        message: 'username is required',
      });
    }

    if (username === req.authUser.username) {
      return res.status(400).json({
        code: 400,
        message: 'cannot delete current user',
      });
    }

    if (username === DEFAULT_ADMIN_USERNAME) {
      return res.status(400).json({
        code: 400,
        message: 'cannot delete default admin user',
      });
    }

    const [rows] = await pool.execute(
      `SELECT id
       FROM iot_user
       WHERE username = ?
       LIMIT 1`,
      [username],
    );

    if (!rows.length) {
      return res.status(404).json({
        code: 404,
        message: 'user not found',
      });
    }

    await withConnection(async (conn) => {
      await conn.beginTransaction();
      await conn.execute(
        `DELETE FROM iot_user_session
         WHERE user_id = ?`,
        [rows[0].id],
      );
      await conn.execute(
        `DELETE FROM iot_user
         WHERE id = ?`,
        [rows[0].id],
      );
      await conn.commit();
    });

    res.json({
      code: 0,
      message: 'success',
    });
  } catch (e) {
    console.error('❌ 删除用户失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'delete user failed',
      error: e.message,
    });
  }
});

app.post('/api/auth/users/toggle-active', requireAuth(['admin']), async (req, res) => {
  try {
    const username = toNullableString(req.body?.username);
    const requestedActive = normalizeUserActiveValue(req.body?.is_active);

    if (!username) {
      return res.status(400).json({
        code: 400,
        message: 'username is required',
      });
    }

    if (username === req.authUser.username) {
      return res.status(400).json({
        code: 400,
        message: 'cannot change current user active state',
      });
    }

    if (username === DEFAULT_ADMIN_USERNAME) {
      return res.status(400).json({
        code: 400,
        message: 'cannot change default admin user active state',
      });
    }

    const [rows] = await pool.execute(
      `SELECT
         id,
         username,
         display_name,
         role,
         is_active,
         last_login_at,
         created_at,
         updated_at
       FROM iot_user
       WHERE username = ?
       LIMIT 1`,
      [username],
    );

    if (!rows.length) {
      return res.status(404).json({
        code: 404,
        message: 'user not found',
      });
    }

    const nextActive = requestedActive === null
      ? (rows[0].is_active ? 0 : 1)
      : requestedActive;

    await withConnection(async (conn) => {
      await conn.beginTransaction();
      await conn.execute(
        `UPDATE iot_user
         SET is_active = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [nextActive, rows[0].id],
      );

      if (nextActive === 0) {
        await conn.execute(
          `DELETE FROM iot_user_session
           WHERE user_id = ?`,
          [rows[0].id],
        );
      }

      await conn.commit();
    });

    const [updatedRows] = await pool.execute(
      `SELECT
         id,
         username,
         display_name,
         role,
         is_active,
         last_login_at,
         created_at,
         updated_at
       FROM iot_user
       WHERE id = ?
       LIMIT 1`,
      [rows[0].id],
    );

    res.json({
      code: 0,
      message: 'success',
      data: updatedRows.length ? sanitizeUser(updatedRows[0]) : null,
    });
  } catch (e) {
    console.error('❌ 切换用户状态失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'toggle user active state failed',
      error: e.message,
    });
  }
});

app.post('/api/auth/change-password', requireAuth(['viewer', 'editor', 'admin']), async (req, res) => {
  try {
    const currentPassword = toNullableString(req.body?.current_password);
    const newPassword = toNullableString(req.body?.new_password);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        code: 400,
        message: 'current_password and new_password are required',
      });
    }

    const [rows] = await pool.execute(
      `SELECT id, password_hash
       FROM iot_user
       WHERE id = ?
       LIMIT 1`,
      [req.authUser.id],
    );

    if (!rows.length || !verifyPassword(currentPassword, rows[0].password_hash)) {
      return res.status(401).json({
        code: 401,
        message: 'current password is incorrect',
      });
    }

    await withConnection(async (conn) => {
      await conn.beginTransaction();
      await conn.execute(
        `UPDATE iot_user
         SET password_hash = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [hashPassword(newPassword), req.authUser.id],
      );
      await conn.execute(
        `DELETE FROM iot_user_session
         WHERE user_id = ?`,
        [req.authUser.id],
      );
      await conn.commit();
    });

    res.json({
      code: 0,
      message: 'success',
    });
  } catch (e) {
    console.error('❌ 修改密码失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'change password failed',
      error: e.message,
    });
  }
});

app.get('/api/system/settings', async (req, res) => {
  res.json({
    code: 0,
    message: 'success',
    data: {
      disk_alert_free_threshold: runtimeDiskAlertFreeThreshold,
      disk_alert_mode: 'free_percent_lte',
      mail_to: MAIL_TO,
    },
  });
});

app.post('/api/system/settings/disk-alert-threshold', async (req, res) => {
  try {
    const thresholdPercent = clampPercent(req.body?.threshold_percent, 5, 95);

    if (thresholdPercent === null) {
      return res.status(400).json({
        code: 400,
        message: 'threshold_percent must be a number between 5 and 95',
      });
    }

    await upsertRuntimeSetting('disk_alert_free_threshold', thresholdPercent);
    runtimeDiskAlertFreeThreshold = thresholdPercent;
    lastDiskAlertAt = 0;
    clearResponseCache(['/api/dashboard/overview']);

    res.json({
      code: 0,
      message: 'success',
      data: {
        disk_alert_free_threshold: runtimeDiskAlertFreeThreshold,
        disk_alert_mode: 'free_percent_lte',
      },
    });
  } catch (e) {
    console.error('update disk alert threshold failed:', e.message);
    res.status(500).json({
      code: 500,
      message: 'update disk alert threshold failed',
      error: e.message,
    });
  }
});

app.post('/emqx_to_mysql', async (req, res) => {
  try {
    const body = req.body || {};

    const topic = toNullableString(body.topic);
    const gatewayCode = toNullableString(body.gateway_code);
    const deviceCode = toNullableString(body.device_code);
    const slaveAddr = toNullableInt(body.slave_addr);
    const msgKey = toNullableString(body.msg_key);
    const deviceType = detectDeviceType(body);

    const temperature = toNullableFloat(body.temperature);
    const humidity = toNullableFloat(body.humidity);
    const ec = toNullableFloat(body.ec);
    const ph = toNullableFloat(body.ph);
    const salinity = toNullableFloat(body.salinity);
    const nitrogen = toNullableFloat(body.nitrogen);
    const phosphorus = toNullableFloat(body.phosphorus);
    const potassium = toNullableFloat(body.potassium);
    const co2 = toNullableFloat(body.co2);
    const lux = toNullableFloat(body.lux);

    const collectStatus = isEmptyLike(body.collect_status)
      ? 1
      : (toNullableInt(body.collect_status) ?? 1);

    const errorMsg = toNullableString(body.error_msg);
    const collectedAt = toMySQLDateTimeOrNow(body.collected_at);

    if (!gatewayCode || !deviceCode) {
      return res.status(400).json({
        code: 400,
        message: 'gateway_code and device_code are required',
      });
    }

    const validation = await validateIncomingDevice({
      gatewayCode,
      deviceCode,
      slaveAddr,
      deviceType,
    });

    if (!validation.ok) {
      await pool.execute(
        `INSERT INTO iot_mqtt_raw_message
         (topic, gateway_code, device_code, msg_key, raw_payload, parse_status, parse_error, received_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          topic,
          gatewayCode,
          deviceCode,
          msgKey,
          JSON.stringify(body),
          0,
          validation.reason,
        ],
      );

      return res.status(validation.status).json({
        code: validation.status,
        message: validation.reason,
      });
    }

    await withConnection(async (conn) => {
      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO iot_mqtt_raw_message
         (topic, gateway_code, device_code, msg_key, raw_payload, parse_status, parse_error, received_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          topic,
          gatewayCode,
          deviceCode,
          msgKey,
          JSON.stringify(body),
          1,
          null,
        ],
      );

      if (deviceType === 'air_4in1') {
        await conn.execute(
          `INSERT INTO ${AIR_TABLE}
           (gateway_code, device_code, slave_addr, topic, msg_key, temperature, humidity, co2, lux,
            collect_status, error_msg, collected_at, received_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            gatewayCode,
            deviceCode,
            slaveAddr,
            topic,
            msgKey,
            temperature,
            humidity,
            co2,
            lux,
            collectStatus,
            errorMsg,
            collectedAt,
          ],
        );
      } else {
        await conn.execute(
          `INSERT INTO ${SOIL_TABLE}
           (gateway_code, device_code, slave_addr, topic, msg_key, temperature, humidity, ec, ph, salinity, nitrogen, phosphorus, potassium,
            collect_status, error_msg, collected_at, received_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            gatewayCode,
            deviceCode,
            slaveAddr,
            topic,
            msgKey,
            temperature,
            humidity,
            ec,
            ph,
            salinity,
            nitrogen,
            phosphorus,
            potassium,
            collectStatus,
            errorMsg,
            collectedAt,
          ],
        );
      }

      await conn.execute(
        `INSERT INTO iot_gateway (gateway_code, mqtt_client_id, mqtt_topic, online_status, last_online_time)
         VALUES (?, ?, ?, 1, NOW())
         ON DUPLICATE KEY UPDATE
           mqtt_client_id = COALESCE(VALUES(mqtt_client_id), mqtt_client_id),
           mqtt_topic = COALESCE(VALUES(mqtt_topic), mqtt_topic),
           online_status = 1,
           last_online_time = NOW(),
           updated_at = NOW()`,
        [
          gatewayCode,
          toNullableString(body.mqtt_client_id),
          topic,
        ],
      );

      await conn.execute(
        `INSERT INTO iot_rs485_device (gateway_code, device_code, slave_addr, device_type, last_collect_time)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           gateway_code = VALUES(gateway_code),
           slave_addr = COALESCE(VALUES(slave_addr), slave_addr),
           device_type = COALESCE(VALUES(device_type), device_type),
           last_collect_time = VALUES(last_collect_time),
           updated_at = NOW()`,
        [
          gatewayCode,
          deviceCode,
          slaveAddr ?? 0,
          deviceType,
          collectedAt,
        ],
      );

      await conn.commit();
    });

    console.log(`✅ 入库成功: gateway=${gatewayCode}, device=${deviceCode}`);
    clearResponseCache([
      'GET:/api/dashboard/overview:',
      'GET:/api/device/list:',
      'GET:/api/sensor/latest:',
      'GET:/api/sensor/history:',
      'GET:/api/soil/records:',
      'GET:/api/air/records:',
      'GET:/api/bindings/current:',
      'GET:/api/plants:',
    ]);

    res.json({
      code: 0,
      message: 'ok',
    });
  } catch (e) {
    console.error('❌ 写入失败:', e.message);

    try {
      const body = req.body || {};
      await pool.execute(
        `INSERT INTO iot_mqtt_raw_message
         (topic, gateway_code, device_code, msg_key, raw_payload, parse_status, parse_error, received_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [
          toNullableString(body.topic),
          toNullableString(body.gateway_code),
          toNullableString(body.device_code),
          toNullableString(body.msg_key),
          JSON.stringify(body),
          0,
          e.message,
        ],
      );
    } catch (logErr) {
      console.error('❌ 记录原始错误报文失败:', logErr.message);
    }

    res.status(500).json({
      code: 500,
      message: 'error_logged',
      error: e.message,
    });
  }
});

app.get('/api/device/list', heavyReadLimiter, async (req, res) => {
  try {
    const deviceType = toNullableString(req.query.device_type);
    const gatewayCode = toNullableString(req.query.gateway_code);

    const where = [];
    const params = [];

    if (deviceType) {
      where.push('d.device_type = ?');
      params.push(deviceType);
    }

    if (gatewayCode) {
      where.push('d.gateway_code = ?');
      params.push(gatewayCode);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    await sendCachedJson(req, res, QUERY_CACHE_TTL_MS, async () => {
      const [rows] = await pool.execute(
        `SELECT
           d.id,
           d.gateway_code,
           d.device_code,
           d.slave_addr,
           d.device_type,
           d.last_collect_time,
           d.is_active,
           g.online_status,
           g.last_online_time,
           g.mqtt_topic,
           b.plant_code,
           b.pot_code,
           p.group_type
         FROM iot_rs485_device d
         LEFT JOIN iot_gateway g
           ON d.gateway_code = g.gateway_code
         LEFT JOIN iot_sensor_binding b
           ON d.device_code = b.device_code
          AND b.is_active = 1
          AND b.end_time IS NULL
         LEFT JOIN iot_plant p
           ON b.plant_code = p.plant_code
         ${whereSql ? `${whereSql} AND d.is_active = 1` : 'WHERE d.is_active = 1'}
        ORDER BY d.gateway_code ASC, d.slave_addr ASC`,
        params,
      );

      return {
        code: 0,
        message: 'success',
        data: formatRowsDateFields(rows, ['last_collect_time', 'last_online_time']),
      };
    });
  } catch (e) {
    console.error('❌ 查询设备列表失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'query device list failed',
      error: e.message,
    });
  }
});

app.get('/api/sensor/latest', heavyReadLimiter, async (req, res) => {
  try {
    const deviceCode = toNullableString(req.query.device_code);

    if (!deviceCode) {
      return res.status(400).json({
        code: 400,
        message: 'device_code is required',
      });
    }

    await sendCachedJson(req, res, QUERY_CACHE_TTL_MS, async () => ({
      code: 0,
      message: 'success',
      data: await queryLatestSensorRecord(deviceCode),
    }));
  } catch (e) {
    console.error('❌ 查询最新数据失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'query latest sensor data failed',
      error: e.message,
    });
  }
});

app.get('/api/sensor/history', heavyReadLimiter, async (req, res) => {
  try {
    const deviceCode = toNullableString(req.query.device_code);
    const limit = normalizeLimit(req.query.limit, 600, 3000);
    const filters = {
      start_time: toNullableString(req.query.start_time),
      end_time: toNullableString(req.query.end_time),
    };

    if (!deviceCode) {
      return res.status(400).json({
        code: 400,
        message: 'device_code is required',
      });
    }

    await sendCachedJson(req, res, QUERY_CACHE_TTL_MS, async () => ({
      code: 0,
      message: 'success',
      data: await querySensorHistoryRows(deviceCode, limit, filters),
    }));
  } catch (e) {
    console.error('❌ 查询历史数据失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'query sensor history failed',
      error: e.message,
    });
  }
});

app.get('/api/plants', heavyReadLimiter, async (req, res) => {
  try {
    const groupType = toNullableString(req.query.group_type);
    const where = [];
    const params = [];

    if (groupType) {
      where.push('p.group_type = ?');
      params.push(groupType);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    await sendCachedJson(req, res, QUERY_CACHE_TTL_MS, async () => {
      const [rows] = await pool.execute(
        `SELECT
           p.*,
           b.device_code,
           d.device_type
         FROM iot_plant p
         LEFT JOIN iot_sensor_binding b
           ON p.plant_code = b.plant_code
          AND b.is_active = 1
          AND b.end_time IS NULL
         LEFT JOIN iot_rs485_device d
           ON b.device_code = d.device_code
         ${whereSql}
         ORDER BY p.plant_code ASC`,
        params,
      );

      return {
        code: 0,
        message: 'success',
        data: formatRowsDateFields(rows, ['stress_started_at', 'created_at', 'updated_at']),
      };
    });
  } catch (e) {
    console.error('❌ 查询植株列表失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'query plants failed',
      error: e.message,
    });
  }
});

app.post('/api/plants/upsert', requireAuth(['editor', 'admin']), async (req, res) => {
  try {
    const body = req.body || {};
    const plantCode = toNullableString(body.plant_code);

    if (!plantCode) {
      return res.status(400).json({
        code: 400,
        message: 'plant_code is required',
      });
    }

    await pool.execute(
      `INSERT INTO iot_plant
       (plant_code, pot_code, group_type, treatment_type, stress_type, stress_level, stress_started_at, remark, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         pot_code = VALUES(pot_code),
         group_type = VALUES(group_type),
         treatment_type = VALUES(treatment_type),
         stress_type = VALUES(stress_type),
         stress_level = VALUES(stress_level),
         stress_started_at = VALUES(stress_started_at),
         remark = VALUES(remark),
         is_active = VALUES(is_active),
         updated_at = NOW()`,
      [
        plantCode,
        toNullableString(body.pot_code),
        toNullableString(body.group_type),
        toNullableString(body.treatment_type),
        toNullableString(body.stress_type),
        toNullableString(body.stress_level),
        isEmptyLike(body.stress_started_at) ? null : toMySQLDateTimeOrNow(body.stress_started_at),
        toNullableString(body.remark),
        toNullableInt(body.is_active) ?? 1,
      ],
    );

    res.json({
      code: 0,
      message: 'success',
    });
  } catch (e) {
    console.error('❌ 保存植株失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'save plant failed',
      error: e.message,
    });
  }
});

app.get('/api/pots', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT *
       FROM iot_pot
       ORDER BY pot_code ASC`,
    );

    res.json({
      code: 0,
      message: 'success',
      data: formatRowsDateFields(rows, ['created_at', 'updated_at']),
    });
  } catch (e) {
    console.error('❌ 查询盆列表失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'query pots failed',
      error: e.message,
    });
  }
});

app.post('/api/pots/upsert', requireAuth(['editor', 'admin']), async (req, res) => {
  try {
    const body = req.body || {};
    const potCode = toNullableString(body.pot_code);

    if (!potCode) {
      return res.status(400).json({
        code: 400,
        message: 'pot_code is required',
      });
    }

    await pool.execute(
      `INSERT INTO iot_pot
       (pot_code, zone_code, position_code, remark, is_active)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         zone_code = VALUES(zone_code),
         position_code = VALUES(position_code),
         remark = VALUES(remark),
         is_active = VALUES(is_active),
         updated_at = NOW()`,
      [
        potCode,
        toNullableString(body.zone_code),
        toNullableString(body.position_code),
        toNullableString(body.remark),
        toNullableInt(body.is_active) ?? 1,
      ],
    );

    res.json({
      code: 0,
      message: 'success',
    });
  } catch (e) {
    console.error('❌ 保存盆失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'save pot failed',
      error: e.message,
    });
  }
});

app.get('/api/bindings/current', heavyReadLimiter, async (req, res) => {
  try {
    await sendCachedJson(req, res, QUERY_CACHE_TTL_MS, async () => {
      const [rows] = await pool.execute(
        `SELECT
           b.*,
           d.gateway_code,
           d.slave_addr,
           d.device_type,
           p.group_type
         FROM iot_sensor_binding b
         LEFT JOIN iot_rs485_device d
           ON b.device_code = d.device_code
         LEFT JOIN iot_plant p
           ON b.plant_code = p.plant_code
         WHERE b.is_active = 1
           AND b.end_time IS NULL
         ORDER BY b.device_code ASC`,
      );

      return {
        code: 0,
        message: 'success',
        data: formatRowsDateFields(rows, ['start_time', 'end_time', 'created_at', 'updated_at']),
      };
    });
  } catch (e) {
    console.error('❌ 查询当前绑定失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'query bindings failed',
      error: e.message,
    });
  }
});

app.post('/api/bindings/assign', requireAuth(['editor', 'admin']), async (req, res) => {
  try {
    const body = req.body || {};
    const deviceCode = toNullableString(body.device_code);
    const plantCode = toNullableString(body.plant_code);
    const potCode = toNullableString(body.pot_code);
    const startTime = toMySQLDateTimeOrNow(body.start_time);
    const bindingRole = toNullableString(body.binding_role) || 'primary';
    const remark = toNullableString(body.remark);

    if (!deviceCode) {
      return res.status(400).json({
        code: 400,
        message: 'device_code is required',
      });
    }

    if (!plantCode && !potCode) {
      return res.status(400).json({
        code: 400,
        message: 'plant_code or pot_code is required',
      });
    }

    await withConnection(async (conn) => {
      await conn.beginTransaction();

      await conn.execute(
        `UPDATE iot_sensor_binding
         SET is_active = 0,
             end_time = COALESCE(end_time, ?),
             updated_at = NOW()
         WHERE device_code = ?
           AND is_active = 1
           AND end_time IS NULL`,
        [startTime, deviceCode],
      );

      await conn.execute(
        `INSERT INTO iot_sensor_binding
         (device_code, plant_code, pot_code, binding_role, start_time, end_time, is_active, remark)
         VALUES (?, ?, ?, ?, ?, NULL, 1, ?)`,
        [deviceCode, plantCode, potCode, bindingRole, startTime, remark],
      );

      await conn.commit();
    });

    res.json({
      code: 0,
      message: 'success',
    });
  } catch (e) {
    console.error('❌ 保存绑定失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'assign binding failed',
      error: e.message,
    });
  }
});

app.get('/api/leaf/sessions', async (req, res) => {
  try {
    const plantCode = toNullableString(req.query.plant_code);
    const limit = normalizeLimit(req.query.limit, 20, 100);
    const where = [];
    const params = [];

    if (plantCode) {
      where.push('s.plant_code = ?');
      params.push(plantCode);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [rows] = await pool.execute(
      `SELECT
         s.*,
         p.group_type,
         COUNT(DISTINCT r.id) AS leaf_count,
         COALESCE(SUM(r.image_count), 0) AS image_count
       FROM iot_leaf_session s
       LEFT JOIN iot_plant p
         ON s.plant_code = p.plant_code
       LEFT JOIN iot_leaf_record r
         ON s.id = r.session_id
       ${whereSql}
       GROUP BY s.id
       ORDER BY s.observed_at DESC, s.id DESC
       LIMIT ${limit}`,
      params,
    );

    res.json({
      code: 0,
      message: 'success',
      data: formatRowsDateFields(rows, ['observed_at', 'created_at', 'updated_at']),
    });
  } catch (e) {
    console.error('query leaf sessions failed:', e.message);
    res.status(500).json({
      code: 500,
      message: 'query leaf sessions failed',
      error: e.message,
    });
  }
});

app.get('/api/leaf/session/detail', async (req, res) => {
  try {
    const sessionId = toNullableInt(req.query.session_id);
    if (!sessionId) {
      return res.status(400).json({
        code: 400,
        message: 'session_id is required',
      });
    }

    const detail = await fetchLeafSessionDetail(sessionId);
    if (!detail) {
      return res.status(404).json({
        code: 404,
        message: 'leaf session not found',
      });
    }

    res.json({
      code: 0,
      message: 'success',
      data: detail,
    });
  } catch (e) {
    console.error('query leaf session detail failed:', e.message);
    res.status(500).json({
      code: 500,
      message: 'query leaf session detail failed',
      error: e.message,
    });
  }
});

app.post('/api/leaf/session/upsert', async (req, res) => {
  try {
    const body = req.body || {};
    const sessionId = toNullableInt(body.session_id);
    const plantCode = toNullableString(body.plant_code);
    const observedAt = isEmptyLike(body.observed_at) ? formatBeijingDateTime(new Date()) : toMySQLDateTimeOrNow(body.observed_at);
    const operatorName = toNullableString(body.operator_name);
    const remark = toNullableString(body.remark);
    const leafLimit = normalizeLeafIndex(body.leaf_limit) || LEAF_MAX_COUNT;

    if (!plantCode) {
      return res.status(400).json({
        code: 400,
        message: 'plant_code is required',
      });
    }

    const [plantRows] = await pool.execute(
      `SELECT plant_code, pot_code
       FROM iot_plant
       WHERE plant_code = ?
       LIMIT 1`,
      [plantCode],
    );

    if (!plantRows.length) {
      return res.status(404).json({
        code: 404,
        message: 'plant not found',
      });
    }

    let finalSessionId = sessionId;
    if (sessionId) {
      await pool.execute(
        `UPDATE iot_leaf_session
         SET plant_code = ?,
             pot_code = ?,
             observed_at = ?,
             operator_name = ?,
             leaf_limit = ?,
             expected_leaf_type = 'fully_expanded_functional',
             remark = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [plantCode, plantRows[0].pot_code, observedAt, operatorName, leafLimit, remark, sessionId],
      );
    } else {
      const [result] = await pool.execute(
        `INSERT INTO iot_leaf_session
         (plant_code, pot_code, observed_at, operator_name, leaf_limit, expected_leaf_type, remark)
         VALUES (?, ?, ?, ?, ?, 'fully_expanded_functional', ?)`,
        [plantCode, plantRows[0].pot_code, observedAt, operatorName, leafLimit, remark],
      );
      finalSessionId = result.insertId;
    }

    res.json({
      code: 0,
      message: 'success',
      data: await fetchLeafSessionDetail(finalSessionId),
    });
  } catch (e) {
    console.error('save leaf session failed:', e.message);
    res.status(500).json({
      code: 500,
      message: 'save leaf session failed',
      error: e.message,
    });
  }
});

app.post('/api/leaf/image/analyze', leafUpload.single('image'), async (req, res) => {
  let originalPath = null;
  let overlayPath = null;

  try {
    const file = req.file;
    const body = req.body || {};
    const sessionId = toNullableInt(body.session_id);
    const leafIndex = normalizeLeafIndex(body.leaf_index);
    const canopyPosition = normalizeLeafPosition(body.canopy_position);
    const calibrationLengthMm = normalizePositiveFloat(body.calibration_length_mm);
    const x1 = toNullableFloat(body.calibration_x1);
    const y1 = toNullableFloat(body.calibration_y1);
    const x2 = toNullableFloat(body.calibration_x2);
    const y2 = toNullableFloat(body.calibration_y2);

    if (!file) {
      return res.status(400).json({
        code: 400,
        message: 'image file is required',
      });
    }
    originalPath = file.path;

    if (!sessionId) {
      return res.status(400).json({
        code: 400,
        message: 'session_id is required',
      });
    }
    if (!leafIndex) {
      return res.status(400).json({
        code: 400,
        message: `leaf_index must be between 1 and ${LEAF_MAX_COUNT}`,
      });
    }
    if (!canopyPosition) {
      return res.status(400).json({
        code: 400,
        message: 'canopy_position must be upper, middle, or lower',
      });
    }
    if (!calibrationLengthMm) {
      return res.status(400).json({
        code: 400,
        message: 'calibration_length_mm must be greater than 0',
      });
    }
    if ([x1, y1, x2, y2].some((item) => item === null)) {
      return res.status(400).json({
        code: 400,
        message: 'calibration points are required',
      });
    }

    const [sessionRows] = await pool.execute(
      `SELECT *
       FROM iot_leaf_session
       WHERE id = ?
       LIMIT 1`,
      [sessionId],
    );

    if (!sessionRows.length) {
      return res.status(404).json({
        code: 404,
        message: 'leaf session not found',
      });
    }

    overlayPath = path.join(LEAF_OVERLAY_DIR, `${path.parse(file.filename).name}_overlay.png`);
    const metrics = await runLeafAnalyzer({
      imagePath: originalPath,
      overlayPath,
      calibrationLengthMm,
      x1,
      y1,
      x2,
      y2,
      leafIndex,
    });

    await withConnection(async (conn) => {
      await conn.beginTransaction();

      await conn.execute(
        `INSERT INTO iot_leaf_record
         (session_id, leaf_index, canopy_position, latest_measured_at)
         VALUES (?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           canopy_position = VALUES(canopy_position),
           latest_measured_at = NOW(),
           updated_at = NOW()`,
        [sessionId, leafIndex, canopyPosition],
      );

      const [recordRows] = await conn.execute(
        `SELECT id
         FROM iot_leaf_record
         WHERE session_id = ?
           AND leaf_index = ?
         LIMIT 1`,
        [sessionId, leafIndex],
      );

      const leafRecordId = recordRows[0].id;
      await conn.execute(
        `INSERT INTO iot_leaf_image
         (session_id, leaf_record_id, image_name, original_file_name, original_path, overlay_path,
          calibration_length_mm, calibration_pixels, pixels_per_mm,
          leaf_length_mm, leaf_width_mm, leaf_area_mm2)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          leafRecordId,
          file.filename,
          file.originalname,
          originalPath,
          overlayPath,
          calibrationLengthMm,
          metrics.calibration_pixels,
          metrics.pixels_per_mm,
          metrics.leaf_length_mm,
          metrics.leaf_width_mm,
          metrics.leaf_area_mm2,
        ],
      );

      await recalcLeafRecordStats(conn, leafRecordId);
      await conn.commit();
    });

    res.json({
      code: 0,
      message: 'success',
      data: await fetchLeafSessionDetail(sessionId),
    });
  } catch (e) {
    console.error('analyze leaf image failed:', e.message);
    if (originalPath) {
      await fs.unlink(originalPath).catch(() => {});
    }
    if (overlayPath) {
      await fs.unlink(overlayPath).catch(() => {});
    }
    res.status(500).json({
      code: 500,
      message: 'analyze leaf image failed',
      error: e.message,
    });
  }
});

app.post('/api/leaf/image/delete', async (req, res) => {
  try {
    const imageId = toNullableInt(req.body?.image_id);
    if (!imageId) {
      return res.status(400).json({
        code: 400,
        message: 'image_id is required',
      });
    }

    let sessionId = null;
    await withConnection(async (conn) => {
      await conn.beginTransaction();
      const [rows] = await conn.execute(
        `SELECT id, session_id, leaf_record_id, original_path, overlay_path
         FROM iot_leaf_image
         WHERE id = ?
         LIMIT 1`,
        [imageId],
      );

      if (!rows.length) {
        throw new Error('leaf image not found');
      }

      const row = rows[0];
      sessionId = row.session_id;
      await conn.execute(
        `DELETE FROM iot_leaf_image
         WHERE id = ?`,
        [imageId],
      );

      await recalcLeafRecordStats(conn, row.leaf_record_id);
      await conn.commit();

      await fs.unlink(row.original_path).catch(() => {});
      if (row.overlay_path) {
        await fs.unlink(row.overlay_path).catch(() => {});
      }
    });

    res.json({
      code: 0,
      message: 'success',
      data: await fetchLeafSessionDetail(sessionId),
    });
  } catch (e) {
    console.error('delete leaf image failed:', e.message);
    res.status(e.message === 'leaf image not found' ? 404 : 500).json({
      code: e.message === 'leaf image not found' ? 404 : 500,
      message: e.message === 'leaf image not found' ? 'leaf image not found' : 'delete leaf image failed',
      error: e.message,
    });
  }
});

app.get('/api/plant/latest', async (req, res) => {
  try {
    const plantCode = toNullableString(req.query.plant_code);
    if (!plantCode) {
      return res.status(400).json({
        code: 400,
        message: 'plant_code is required',
      });
    }

      const [rows] = await pool.execute(
        `SELECT
           sd.id,
           sd.gateway_code,
         sd.device_code,
         d.device_type,
         sd.slave_addr,
         b.plant_code,
         b.pot_code,
         p.group_type,
         sd.temperature,
         sd.humidity,
         sd.ec,
         sd.ph,
         sd.salinity,
         sd.nitrogen,
         sd.phosphorus,
         sd.potassium,
         sd.co2,
         sd.lux,
         sd.collect_status,
           sd.error_msg,
           sd.collected_at,
           sd.received_at
         FROM ${SOIL_TABLE} sd
         INNER JOIN iot_sensor_binding b
           ON sd.device_code = b.device_code
        AND b.start_time <= sd.collected_at
        AND (b.end_time IS NULL OR b.end_time >= sd.collected_at)
       LEFT JOIN iot_plant p
         ON b.plant_code = p.plant_code
       LEFT JOIN iot_rs485_device d
         ON sd.device_code = d.device_code
       WHERE b.plant_code = ?
       ORDER BY sd.collected_at DESC, sd.id DESC
       LIMIT 1`,
      [plantCode],
    );

    res.json({
      code: 0,
      message: 'success',
      data: rows.length
        ? formatRowDateFields(rows[0], ['collected_at', 'received_at'])
        : null,
    });
  } catch (e) {
    console.error('❌ 查询植株最新数据失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'query plant latest failed',
      error: e.message,
    });
  }
});

app.get('/api/plant/history', async (req, res) => {
  try {
    const plantCode = toNullableString(req.query.plant_code);
    const limit = normalizeLimit(req.query.limit);
    if (!plantCode) {
      return res.status(400).json({
        code: 400,
        message: 'plant_code is required',
      });
    }

      const [rows] = await pool.query(
        `SELECT
           sd.id,
           sd.gateway_code,
         sd.device_code,
         d.device_type,
         sd.slave_addr,
         b.plant_code,
         b.pot_code,
         p.group_type,
         sd.temperature,
         sd.humidity,
         sd.ec,
         sd.ph,
         sd.salinity,
         sd.nitrogen,
         sd.phosphorus,
         sd.potassium,
         sd.co2,
         sd.lux,
         sd.collect_status,
           sd.error_msg,
           sd.collected_at,
           sd.received_at
         FROM ${SOIL_TABLE} sd
         INNER JOIN iot_sensor_binding b
           ON sd.device_code = b.device_code
        AND b.start_time <= sd.collected_at
        AND (b.end_time IS NULL OR b.end_time >= sd.collected_at)
       LEFT JOIN iot_plant p
         ON b.plant_code = p.plant_code
       LEFT JOIN iot_rs485_device d
         ON sd.device_code = d.device_code
       WHERE b.plant_code = ?
       ORDER BY sd.collected_at DESC, sd.id DESC
       LIMIT ${limit}`,
      [plantCode],
    );

    res.json({
      code: 0,
      message: 'success',
      data: formatRowsDateFields(rows, ['collected_at', 'received_at']),
    });
  } catch (e) {
    console.error('❌ 查询植株历史数据失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'query plant history failed',
      error: e.message,
    });
  }
});

app.get('/api/dashboard/overview', heavyReadLimiter, async (req, res) => {
  try {
    await sendCachedJson(req, res, QUERY_CACHE_TTL_MS, async () => {
      const [[deviceSummary]] = await pool.query(
        `SELECT
           COUNT(*) AS total_devices,
           SUM(CASE WHEN device_type = 'soil_4in1' THEN 1 ELSE 0 END) AS soil_devices,
           SUM(CASE WHEN device_type = 'air_4in1' THEN 1 ELSE 0 END) AS air_devices
         FROM iot_rs485_device
         WHERE is_active = 1`,
      );

      const [[plantSummary]] = await pool.query(
        `SELECT
           COUNT(*) AS total_plants,
           SUM(CASE WHEN group_type = 'stress' THEN 1 ELSE 0 END) AS stress_plants,
           SUM(CASE WHEN group_type = 'control' THEN 1 ELSE 0 END) AS control_plants
         FROM iot_plant
         WHERE is_active = 1`,
      );

      const [[latestAir]] = await pool.query(
        `SELECT
           sd.device_code,
           sd.temperature,
           sd.humidity,
           sd.co2,
           sd.lux,
           sd.collected_at
         FROM ${AIR_TABLE} sd
         ORDER BY sd.collected_at DESC, sd.id DESC
         LIMIT 1`,
      );

      return {
        code: 0,
        message: 'success',
        data: {
          ...deviceSummary,
          ...plantSummary,
          latest_air: latestAir ? formatRowDateFields(latestAir, ['collected_at']) : null,
          server_status: getServerStatusSnapshot(),
        },
      };
    });
  } catch (e) {
    console.error('❌ 查询概览失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'query overview failed',
      error: e.message,
    });
  }
});

app.get('/api/dataset/export', async (req, res) => {
  try {
    const format = (toNullableString(req.query.format) || 'json').toLowerCase();
    const rows = await queryDatasetRows(req.query);

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="dataset_export.csv"');
      return res.send(buildDatasetCsv(rows));
    }

    if (['excel', 'xls', 'xlsx'].includes(format)) {
      res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="dataset_export.xls"');
      return res.send(buildDatasetExcel(rows));
    }

    res.json({
      code: 0,
      message: 'success',
      data: rows,
    });
  } catch (e) {
    console.error('❌ 导出数据集失败:', e.message);
    res.status(500).json({
      code: 500,
      message: 'export dataset failed',
      error: e.message,
    });
  }
});

app.get('/api/soil/records', previewReadLimiter, async (req, res) => {
  try {
    await sendCachedJson(req, res, PREVIEW_CACHE_TTL_MS, async () => ({
      code: 0,
      message: 'success',
      data: await querySoilPreviewRows(req.query),
    }));
  } catch (e) {
    console.error('soil preview failed:', e.message);
    res.status(500).json({ code: 500, message: 'query soil records failed', error: e.message });
  }
});

app.get('/api/air/records', previewReadLimiter, async (req, res) => {
  try {
    await sendCachedJson(req, res, PREVIEW_CACHE_TTL_MS, async () => ({
      code: 0,
      message: 'success',
      data: await queryAirRows(req.query),
    }));
  } catch (e) {
    console.error('air preview failed:', e.message);
    res.status(500).json({ code: 500, message: 'query air records failed', error: e.message });
  }
});

app.get('/api/export/soil', async (req, res) => {
  try {
    const format = (toNullableString(req.query.format) || 'csv').toLowerCase();
    const rows = await querySoilPreviewRows(req.query);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="soil_export.csv"');
      return res.send(buildCsv(SOIL_EXPORT_COLUMNS, rows));
    }
    res.json({ code: 0, message: 'success', data: rows });
  } catch (e) {
    console.error('export soil failed:', e.message);
    res.status(500).json({ code: 500, message: 'export soil failed', error: e.message });
  }
});

app.get('/api/export/air', async (req, res) => {
  try {
    const format = (toNullableString(req.query.format) || 'csv').toLowerCase();
    const rows = await queryAirRows(req.query);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="air_export.csv"');
      return res.send(buildCsv(AIR_EXPORT_COLUMNS, rows));
    }
    res.json({ code: 0, message: 'success', data: rows });
  } catch (e) {
    console.error('export air failed:', e.message);
    res.status(500).json({ code: 500, message: 'export air failed', error: e.message });
  }
});

async function exportArchiveForDate(dateKey) {
  await ensureArchiveDir();
  const startTime = `${dateKey} 00:00:00`;
  const endTime = `${dateKey} 23:59:59`;
  const soilRows = await querySoilPreviewRows({ start_time: startTime, end_time: endTime, limit: 500000 });
  const airRows = await queryAirRows({ start_time: startTime, end_time: endTime, limit: 500000 });
  const soilPath = path.join(ARCHIVE_DIR, `soil_${dateKey.replace(/-/g, '')}.csv`);
  const airPath = path.join(ARCHIVE_DIR, `air_${dateKey.replace(/-/g, '')}.csv`);
  await fs.writeFile(soilPath, buildCsv(SOIL_EXPORT_COLUMNS, soilRows), 'utf8');
  await fs.writeFile(airPath, buildCsv(AIR_EXPORT_COLUMNS, airRows), 'utf8');
  return { soilPath, airPath, soilRows: soilRows.length, airRows: airRows.length };
}

async function sendArchiveMail(subject, text, attachments = []) {
  const mailer = getMailer();
  if (!mailer) {
    console.warn('mail transporter disabled: missing mail password');
    return false;
  }
  await mailer.sendMail({
    from: MAIL_USER,
    to: MAIL_TO,
    subject,
    text,
    attachments,
  });
  return true;
}

async function runDailyArchiveIfNeeded() {
  const now = getBeijingNow();
  if (now.getHours() !== ARCHIVE_SCHEDULE_HOUR || now.getMinutes() !== ARCHIVE_SCHEDULE_MINUTE) {
    return;
  }
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const dateKey = formatDateKey(yesterday);
  if (lastArchiveRunKey === dateKey) {
    return;
  }
  const archive = await exportArchiveForDate(dateKey);
  await sendArchiveMail(
    `菊花实验数据归档 ${dateKey}`,
    `前一天数据已导出。\n土壤记录：${archive.soilRows}\n空气记录：${archive.airRows}\n服务器本地仍保留全部历史数据。`,
    [
      { filename: path.basename(archive.soilPath), path: archive.soilPath },
      { filename: path.basename(archive.airPath), path: archive.airPath },
    ],
  );
  lastArchiveRunKey = dateKey;
}

async function checkDiskUsageAndAlert() {
  const disk = getDiskUsageStats();
  if (!disk || disk.free_percent === null || disk.free_percent > runtimeDiskAlertFreeThreshold) {
    return;
  }
  const now = Date.now();
  if (now - lastDiskAlertAt < DISK_ALERT_COOLDOWN_HOURS * 60 * 60 * 1000) {
    return;
  }
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total_rows, MIN(received_at) AS oldest, MAX(received_at) AS newest FROM ${SOIL_TABLE}`,
  );
  const [airRows] = await pool.query(
    `SELECT COUNT(*) AS total_rows FROM ${AIR_TABLE}`,
  );
  await sendArchiveMail(
    `[Disk Alert] Remaining ${disk.free_percent}%`,
    `Server disk free space is now ${disk.free_percent}%.\nDisk usage: ${disk.usage_percent}%.\nTotal disk: ${disk.total_gb} GB\nAvailable disk: ${disk.available_gb} GB\nSoil rows: ${rows[0].total_rows}\nAir rows: ${airRows[0].total_rows}\nOldest soil record: ${formatBeijingDateTime(rows[0].oldest)}\nLatest soil record: ${formatBeijingDateTime(rows[0].newest)}\nPlease check the server capacity when convenient.`,
  );
  lastDiskAlertAt = now;
}

function startBackgroundJobs() {
  if (!archiveTimer) {
    archiveTimer = setInterval(() => {
      runDailyArchiveIfNeeded().catch((error) => {
        console.error('daily archive failed:', error.message);
      });
    }, ARCHIVE_CHECK_INTERVAL_MS);
  }

  if (!diskCheckTimer) {
    diskCheckTimer = setInterval(() => {
      checkDiskUsageAndAlert().catch((error) => {
        console.error('disk alert failed:', error.message);
      });
    }, DISK_CHECK_INTERVAL_MS);
  }
}

app.get('/api/health', (req, res) => {
  res.json({
    code: 0,
    message: 'server is running',
    time: formatBeijingDateTime(new Date()),
  });
});

app.use((err, req, res, next) => {
  console.error('💥 全局崩溃捕获:', err);
  res.status(500).json({
    code: 500,
    message: 'Server Error',
    error: err.message,
  });
});

async function start() {
  await bootstrapSchema();
  await seedDefaultUsers();
  await loadRuntimeSettings();
  await ensureArchiveDir();
  await ensureLeafUploadDirs();
  startBackgroundJobs();

  app.listen(APP_PORT, () => {
    console.log('✅ 服务已启动，端口 3001，等待数据...');
    console.log('📘 兼容接口:');
    console.log('   POST /emqx_to_mysql');
    console.log('   GET  /api/device/list');
    console.log('   GET  /api/sensor/latest?device_code=ESP32C3_001_01');
    console.log('   GET  /api/sensor/history?device_code=ESP32C3_001_01&limit=50');
    console.log('📘 新增接口:');
    console.log('   GET  /api/plants');
    console.log('   POST /api/plants/upsert');
    console.log('   GET  /api/pots');
    console.log('   POST /api/pots/upsert');
    console.log('   GET  /api/bindings/current');
    console.log('   POST /api/bindings/assign');
    console.log('   GET  /api/plant/latest?plant_code=...');
      console.log('   GET  /api/plant/history?plant_code=...&limit=50');
      console.log('   GET  /api/dashboard/overview');
      console.log('   GET  /api/dataset/export?format=json|csv|excel');
      console.log('   GET  /api/soil/records');
      console.log('   GET  /api/air/records');
      console.log('   GET  /api/export/soil?format=csv');
      console.log('   GET  /api/export/air?format=csv');
      console.log('   GET  /api/leaf/sessions');
      console.log('   GET  /api/leaf/session/detail?session_id=1');
      console.log('   POST /api/leaf/session/upsert');
      console.log('   POST /api/leaf/image/analyze');
      console.log('   POST /api/leaf/image/delete');
    console.log('认证接口:');
    console.log('   POST /api/auth/login');
    console.log('   GET  /api/auth/me');
    console.log('   POST /api/auth/logout');
    console.log('   GET  /api/auth/users');
    console.log('   POST /api/auth/users/upsert');
    console.log('   POST /api/auth/users/delete');
    console.log('   POST /api/auth/users/toggle-active');
    console.log('   POST /api/auth/change-password');
    console.log('   GET  /api/health');
    console.log(`archive mail -> ${MAIL_TO}`);
    console.log(`默认管理员: ${DEFAULT_ADMIN_USERNAME} / ${DEFAULT_ADMIN_PASSWORD}`);
  });
}

start().catch((err) => {
  console.error('❌ 服务启动失败:', err);
  process.exit(1);
});
