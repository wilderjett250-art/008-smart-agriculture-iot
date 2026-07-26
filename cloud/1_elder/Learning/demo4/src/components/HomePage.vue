
<template>
  <div class="page-shell">
    <MyHeader title="菊花实验监测平台" subtitle="土壤与空气数据分区展示" />

    <section class="hero-grid">
      <article class="panel-card intro-card">
        <div class="section-title">
          <span class="title-mark"></span>
          <div>
            <h2>运行概览</h2>
            <p>当前系统状态与最近一次空气采样概况</p>
          </div>
        </div>

        <div class="stats-grid">
          <div class="stat-box"><span class="stat-label">设备总数</span><strong>{{ overview.total_devices || 0 }}</strong></div>
          <div class="stat-box"><span class="stat-label">土壤设备</span><strong>{{ overview.soil_devices || 0 }}</strong></div>
          <div class="stat-box"><span class="stat-label">空气设备</span><strong>{{ overview.air_devices || 0 }}</strong></div>
          <div class="stat-box"><span class="stat-label">植株总数</span><strong>{{ overview.total_plants || 0 }}</strong></div>
        </div>

        <div class="latest-air" v-if="overview.latest_air">
          <div class="mini-heading">最近空气数据</div>
          <div class="latest-grid">
            <span>设备：{{ overview.latest_air.device_code }}</span>
            <span>温度：{{ formatMetric(overview.latest_air.temperature, '°C') }}</span>
            <span>湿度：{{ formatMetric(overview.latest_air.humidity, '%') }}</span>
            <span>CO2：{{ formatMetric(overview.latest_air.co2) }}</span>
            <span>光照：{{ formatMetric(overview.latest_air.lux) }}</span>
            <span>时间：{{ formatDateTime(overview.latest_air.collected_at) }}</span>
          </div>
        </div>

        <div class="server-status" v-if="overview.server_status">
          <div class="mini-heading">服务器状态</div>
          <div class="server-grid">
            <div class="server-chip">
              <span>CPU 占用</span>
              <strong>{{ formatPercent(overview.server_status.cpu && overview.server_status.cpu.usage_percent) }}</strong>
              <small>{{ formatCpuHint(overview.server_status.cpu, overview.server_status.cpu_cores) }}</small>
            </div>
            <div class="server-chip"><span>运行时长</span><strong>{{ formatDuration(overview.server_status.uptime_seconds) }}</strong></div>
            <div class="server-chip">
              <span>运行压力</span>
              <strong>{{ summarizeServerLoad(overview.server_status.load_average) }}</strong>
              <small>{{ formatLoadAverageHint(overview.server_status.load_average) }}</small>
            </div>
            <div class="server-chip"><span>内存占用</span><strong>{{ formatPercent(overview.server_status.memory && overview.server_status.memory.usage_percent) }}</strong></div>
            <div class="server-chip"><span>磁盘剩余</span><strong>{{ formatPercent(overview.server_status.disk && overview.server_status.disk.free_percent) }}</strong></div>
            <div class="server-chip">
              <span>磁盘可用空间</span>
              <strong>{{ formatStorage(overview.server_status.disk && overview.server_status.disk.available_gb) }}</strong>
              <small>总容量 {{ formatStorage(overview.server_status.disk && overview.server_status.disk.total_gb) }}</small>
            </div>
            <div class="server-chip">
              <span>磁盘读取</span>
              <strong>{{ formatRate(overview.server_status.disk_io && overview.server_status.disk_io.read_bps) }}</strong>
              <small>{{ formatRateHint(overview.server_status.disk_io && overview.server_status.disk_io.sample_ms) }}</small>
            </div>
            <div class="server-chip">
              <span>磁盘写入</span>
              <strong>{{ formatRate(overview.server_status.disk_io && overview.server_status.disk_io.write_bps) }}</strong>
              <small>{{ formatRateHint(overview.server_status.disk_io && overview.server_status.disk_io.sample_ms) }}</small>
            </div>
            <div class="server-chip">
              <span>网络下行</span>
              <strong>{{ formatRate(overview.server_status.network && overview.server_status.network.rx_bps) }}</strong>
              <small>{{ formatRateHint(overview.server_status.network && overview.server_status.network.sample_ms) }}</small>
            </div>
            <div class="server-chip">
              <span>网络上行</span>
              <strong>{{ formatRate(overview.server_status.network && overview.server_status.network.tx_bps) }}</strong>
              <small>{{ formatRateHint(overview.server_status.network && overview.server_status.network.sample_ms) }}</small>
            </div>
            <div class="server-chip server-chip--editable">
              <span>邮箱提醒阈值</span>
              <strong>剩余 {{ formatPercent(overview.server_status.disk_alert && overview.server_status.disk_alert.threshold_percent) }}</strong>
              <small>磁盘剩余低于这个值时会发提醒邮件</small>
              <div class="threshold-editor">
                <input v-model="diskAlertThresholdInput" class="threshold-input" type="number" min="5" max="95" step="1">
                <button class="threshold-save-btn" :disabled="isSavingDiskAlertThreshold" @click="saveDiskAlertThreshold">
                  {{ isSavingDiskAlertThreshold ? '保存中' : '保存' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>

      <article class="panel-card export-card">
        <div class="section-title">
          <span class="title-mark"></span>
          <div>
            <h2>数据导出</h2>
            <p>土壤与空气分开导出，便于整理实验数据</p>
          </div>
        </div>
        <div class="export-grid">
          <button class="action-btn" @click="downloadSeparatedExport('soil', 'csv')">导出土壤 CSV</button>
          <button class="action-btn ghost" @click="downloadSeparatedExport('soil', 'excel')">导出土壤 Excel</button>
          <button class="action-btn" @click="downloadSeparatedExport('air', 'csv')">导出空气 CSV</button>
          <button class="action-btn ghost" @click="downloadSeparatedExport('air', 'excel')">导出空气 Excel</button>
        </div>
        <div class="manage-entry">
          <router-link class="manage-link-btn" to="/manage">打开实验管理台</router-link>
          <router-link class="manage-link-btn secondary" to="/leaf">打开叶片测量台</router-link>
        </div>
      </article>
    </section>

    <section class="dual-column-grid">
      <article class="panel-card domain-panel">
        <div class="panel-head split-head">
          <div class="section-title compact">
            <span class="title-mark"></span>
            <div>
              <h2>土壤监测</h2>
              <p>左侧集中展示土壤设备、最新值与近 48 小时记录</p>
            </div>
          </div>
          <div class="selector-wrap">
            <label>土壤设备</label>
            <el-select v-model="selectedSoilDevice" placeholder="选择土壤设备" @change="fetchSoilData" filterable>
              <el-option v-for="device in soilDevices" :key="device.device_code" :label="deviceOptionLabel(device)" :value="device.device_code" />
            </el-select>
          </div>
        </div>

        <div class="metric-strip">
          <div class="metric-pill" v-for="item in soilMetricCards" :key="item.key"><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div>
        </div>

        <div class="chart-grid soil-chart-grid">
          <div class="chart-card" v-for="chart in soilCharts" :key="chart.key">
            <MetricChart :title="chart.title" :unit="chart.unit" :color="chart.color" :time-data="soilTimeData" :series-data="chart.data" />
          </div>
        </div>

        <div class="table-block">
          <div class="table-head"><h3>土壤记录</h3><span>{{ soilTableRows.length }} 条</span></div>
          <div class="table-shell">
            <table class="data-table">
              <thead><tr><th>设备</th><th>温度</th><th>湿度</th><th>EC</th><th>盐度</th><th>氮</th><th>磷</th><th>钾</th><th>pH</th><th>状态</th><th>采集时间</th><th>详情</th></tr></thead>
              <tbody>
                <tr v-for="row in soilTableRows" :key="`soil-${row.id || row.device_code}-${row.collected_at}`">
                  <td><button class="device-link" @click="openDeviceDetail(row.device_code, 'soil_4in1')">{{ row.device_code }}</button></td>
                  <td>{{ formatMetric(row.temperature, '°C') }}</td>
                  <td>{{ formatMetric(row.humidity, '%') }}</td>
                  <td>{{ formatMetric(row.ec) }}</td>
                  <td>{{ formatMetric(row.salinity) }}</td>
                  <td>{{ formatMetric(row.nitrogen) }}</td>
                  <td>{{ formatMetric(row.phosphorus) }}</td>
                  <td>{{ formatMetric(row.potassium) }}</td>
                  <td>{{ formatMetric(row.ph) }}</td>
                  <td><span :class="['status-tag', row.collect_status === 1 ? 'status-success' : 'status-fail']">{{ row.collect_status === 1 ? '成功' : '失败' }}</span></td>
                  <td>{{ formatDateTime(row.collected_at) }}</td>
                  <td><button class="row-detail-btn" @click="openDeviceDetail(row.device_code, 'soil_4in1')">查看详情</button></td>
                </tr>
                <tr v-if="!soilTableRows.length"><td colspan="12" class="empty-cell">暂无土壤记录</td></tr>
              </tbody>
            </table>
          </div>
          <div class="mobile-record-list">
            <article class="mobile-record-card" v-for="row in soilTableRows.slice(0, 20)" :key="`soil-mobile-${row.id || row.device_code}-${row.collected_at}`">
              <div class="mobile-record-card__head">
                <strong>{{ row.device_code }}</strong>
                <button class="row-detail-btn" @click="openDeviceDetail(row.device_code, 'soil_4in1')">查看详情</button>
              </div>
              <div class="mobile-record-card__grid">
                <span>温度：{{ formatMetric(row.temperature, '°C') }}</span>
                <span>湿度：{{ formatMetric(row.humidity, '%') }}</span>
                <span>EC：{{ formatMetric(row.ec) }}</span>
                <span>盐度：{{ formatMetric(row.salinity) }}</span>
                <span>氮：{{ formatMetric(row.nitrogen) }}</span>
                <span>磷：{{ formatMetric(row.phosphorus) }}</span>
                <span>钾：{{ formatMetric(row.potassium) }}</span>
                <span>pH：{{ formatMetric(row.ph) }}</span>
              </div>
              <div class="mobile-record-card__foot">
                <span :class="['status-tag', row.collect_status === 1 ? 'status-success' : 'status-fail']">{{ row.collect_status === 1 ? '成功' : '失败' }}</span>
                <span>{{ formatDateTime(row.collected_at) }}</span>
              </div>
            </article>
            <div v-if="!soilTableRows.length" class="mobile-empty">暂无土壤记录</div>
          </div>
        </div>
      </article>
      <article class="panel-card domain-panel">
        <div class="panel-head split-head">
          <div class="section-title compact">
            <span class="title-mark"></span>
            <div>
              <h2>空气监测</h2>
              <p>右侧集中展示空气设备、最新值与近 48 小时记录</p>
            </div>
          </div>
          <div class="selector-wrap">
            <label>空气设备</label>
            <el-select v-model="selectedAirDevice" placeholder="选择空气设备" @change="fetchAirData" filterable>
              <el-option v-for="device in airDevices" :key="device.device_code" :label="deviceOptionLabel(device)" :value="device.device_code" />
            </el-select>
          </div>
        </div>

        <div class="metric-strip air-metric-strip">
          <div class="metric-pill" v-for="item in airMetricCards" :key="item.key"><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div>
        </div>

        <div class="chart-grid air-chart-grid">
          <div class="chart-card" v-for="chart in airCharts" :key="chart.key">
            <MetricChart :title="chart.title" :unit="chart.unit" :color="chart.color" :time-data="airTimeData" :series-data="chart.data" />
          </div>
        </div>

        <div class="table-block">
          <div class="table-head"><h3>空气记录</h3><span>{{ airTableRows.length }} 条</span></div>
          <div class="table-shell">
            <table class="data-table">
              <thead><tr><th>设备</th><th>温度</th><th>湿度</th><th>CO2</th><th>光照</th><th>状态</th><th>采集时间</th><th>详情</th></tr></thead>
              <tbody>
                <tr v-for="row in airTableRows" :key="`air-${row.id || row.device_code}-${row.collected_at}`">
                  <td><button class="device-link" @click="openDeviceDetail(row.device_code, 'air_4in1')">{{ row.device_code }}</button></td>
                  <td>{{ formatMetric(row.temperature, '°C') }}</td>
                  <td>{{ formatMetric(row.humidity, '%') }}</td>
                  <td>{{ formatMetric(row.co2) }}</td>
                  <td>{{ formatMetric(row.lux) }}</td>
                  <td><span :class="['status-tag', row.collect_status === 1 ? 'status-success' : 'status-fail']">{{ row.collect_status === 1 ? '成功' : '失败' }}</span></td>
                  <td>{{ formatDateTime(row.collected_at) }}</td>
                  <td><button class="row-detail-btn" @click="openDeviceDetail(row.device_code, 'air_4in1')">查看详情</button></td>
                </tr>
                <tr v-if="!airTableRows.length"><td colspan="8" class="empty-cell">暂无空气记录</td></tr>
              </tbody>
            </table>
          </div>
          <div class="mobile-record-list">
            <article class="mobile-record-card" v-for="row in airTableRows.slice(0, 20)" :key="`air-mobile-${row.id || row.device_code}-${row.collected_at}`">
              <div class="mobile-record-card__head">
                <strong>{{ row.device_code }}</strong>
                <button class="row-detail-btn" @click="openDeviceDetail(row.device_code, 'air_4in1')">查看详情</button>
              </div>
              <div class="mobile-record-card__grid">
                <span>温度：{{ formatMetric(row.temperature, '°C') }}</span>
                <span>湿度：{{ formatMetric(row.humidity, '%') }}</span>
                <span>CO2：{{ formatMetric(row.co2) }}</span>
                <span>光照：{{ formatMetric(row.lux) }}</span>
              </div>
              <div class="mobile-record-card__foot">
                <span :class="['status-tag', row.collect_status === 1 ? 'status-success' : 'status-fail']">{{ row.collect_status === 1 ? '成功' : '失败' }}</span>
                <span>{{ formatDateTime(row.collected_at) }}</span>
              </div>
            </article>
            <div v-if="!airTableRows.length" class="mobile-empty">暂无空气记录</div>
          </div>
        </div>
      </article>
    </section>

    <div v-if="detailDialogVisible" class="detail-modal-mask" @click.self="detailDialogVisible = false">
      <div class="detail-modal">
        <div class="detail-modal-header">
          <div class="detail-title">
            <div>
              <h3>{{ detailDialogTitle }}</h3>
              <p>{{ detailDialogSubtitle }}</p>
              <div v-if="detailRangeText" class="detail-range-chip">{{ detailRangeText }}</div>
            </div>
          </div>
          <button class="detail-close-btn" @click="detailDialogVisible = false">关闭</button>
        </div>
        <div v-if="detailDeviceCode" class="detail-content">
          <div class="detail-toolbar">
            <div class="detail-toolbar__presets">
              <button class="detail-preset-btn" @click="setDetailPreset(24)">最近24小时</button>
              <button class="detail-preset-btn" @click="setDetailPreset(48)">最近48小时</button>
              <button class="detail-preset-btn" @click="setDetailPreset(168)">最近7天</button>
            </div>
            <div class="detail-toolbar__picker">
              <label class="detail-input-group">
                <span>开始时间</span>
                <input v-model="detailTimeStart" class="detail-time-input" type="datetime-local">
              </label>
              <label class="detail-input-group">
                <span>结束时间</span>
                <input v-model="detailTimeEnd" class="detail-time-input" type="datetime-local">
              </label>
              <button class="detail-apply-btn" @click="applyDetailTimeRange">查看</button>
            </div>
          </div>
          <div class="metric-strip detail-metric-strip">
            <div class="metric-pill" v-for="item in detailMetricCards" :key="item.key"><span>{{ item.label }}</span><strong>{{ item.value }}</strong></div>
          </div>
          <div class="chart-grid detail-chart-grid">
            <div class="chart-card" v-for="chart in detailCharts" :key="chart.key">
              <MetricChart :title="chart.title" :unit="chart.unit" :color="chart.color" :time-data="detailTimeData" :series-data="chart.data" />
            </div>
          </div>
          <div class="detail-table-block">
            <div class="table-head">
              <h3>最近 100 条明细</h3>
              <span>{{ detailTableRows.length }} 条</span>
            </div>
            <div class="table-shell detail-table-shell">
              <table class="data-table" v-if="detailDeviceType === 'soil_4in1'">
                <thead>
                  <tr>
                    <th>设备</th>
                    <th>温度</th>
                    <th>湿度</th>
                    <th>EC</th>
                    <th>盐度</th>
                    <th>氮</th>
                    <th>磷</th>
                    <th>钾</th>
                    <th>pH</th>
                    <th>状态</th>
                    <th>采集时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in detailTableRows" :key="`detail-soil-${row.id || row.device_code}-${row.collected_at}`">
                    <td>{{ row.device_code }}</td>
                    <td>{{ formatMetric(row.temperature, '°C') }}</td>
                    <td>{{ formatMetric(row.humidity, '%') }}</td>
                    <td>{{ formatMetric(row.ec) }}</td>
                    <td>{{ formatMetric(row.salinity) }}</td>
                    <td>{{ formatMetric(row.nitrogen) }}</td>
                    <td>{{ formatMetric(row.phosphorus) }}</td>
                    <td>{{ formatMetric(row.potassium) }}</td>
                    <td>{{ formatMetric(row.ph) }}</td>
                    <td><span :class="['status-tag', row.collect_status === 1 ? 'status-success' : 'status-fail']">{{ row.collect_status === 1 ? '成功' : '失败' }}</span></td>
                    <td>{{ formatDateTime(row.collected_at) }}</td>
                  </tr>
                  <tr v-if="!detailTableRows.length"><td colspan="11" class="empty-cell">暂无明细记录</td></tr>
                </tbody>
              </table>
              <table class="data-table" v-else>
                <thead>
                  <tr>
                    <th>设备</th>
                    <th>温度</th>
                    <th>湿度</th>
                    <th>CO2</th>
                    <th>光照</th>
                    <th>状态</th>
                    <th>采集时间</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="row in detailTableRows" :key="`detail-air-${row.id || row.device_code}-${row.collected_at}`">
                    <td>{{ row.device_code }}</td>
                    <td>{{ formatMetric(row.temperature, '°C') }}</td>
                    <td>{{ formatMetric(row.humidity, '%') }}</td>
                    <td>{{ formatMetric(row.co2) }}</td>
                    <td>{{ formatMetric(row.lux) }}</td>
                    <td><span :class="['status-tag', row.collect_status === 1 ? 'status-success' : 'status-fail']">{{ row.collect_status === 1 ? '成功' : '失败' }}</span></td>
                    <td>{{ formatDateTime(row.collected_at) }}</td>
                  </tr>
                  <tr v-if="!detailTableRows.length"><td colspan="7" class="empty-cell">暂无明细记录</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>

    <RefreshIndicator
      :is-refreshing="isRefreshing"
      :next-refresh-at="nextRefreshAt"
      :last-preview-refresh-at="lastPreviewRefreshAt"
      :refresh-interval-ms="refreshIntervalMs"
      :preview-refresh-interval-ms="previewRefreshIntervalMs"
    />

    <MyFooter />
  </div>
</template>

<script>
import axios from 'axios';
import MetricChart from './MetricChart.vue';
import MyFooter from './MyFooter.vue';
import MyHeader from './MyHeader.vue';
import RefreshIndicator from './RefreshIndicator.vue';

const SOIL_CHARTS = [
  { key: 'temperature', title: '土壤温度历史曲线', unit: '°C', color: '#ff8a65' },
  { key: 'humidity', title: '土壤湿度历史曲线', unit: '%', color: '#4fc3f7' },
  { key: 'ec', title: '土壤电导率历史曲线', unit: '', color: '#ba68c8' },
  { key: 'salinity', title: '土壤盐度历史曲线', unit: '', color: '#ffd54f' },
  { key: 'nitrogen', title: '土壤氮历史曲线', unit: '', color: '#aed581' },
  { key: 'phosphorus', title: '土壤磷历史曲线', unit: '', color: '#26c6da' },
  { key: 'potassium', title: '土壤钾历史曲线', unit: '', color: '#ab47bc' },
  { key: 'ph', title: '土壤 pH 历史曲线', unit: '', color: '#81c784' },
];

const AIR_CHARTS = [
  { key: 'temperature', title: '空气温度历史曲线', unit: '°C', color: '#ff8a65' },
  { key: 'humidity', title: '空气湿度历史曲线', unit: '%', color: '#4fc3f7' },
  { key: 'co2', title: 'CO2 浓度历史曲线', unit: '', color: '#ffd54f' },
  { key: 'lux', title: '光照强度历史曲线', unit: '', color: '#4dd0e1' },
];

export default {
  name: 'HomePage',
  components: { MetricChart, MyHeader, MyFooter, RefreshIndicator },
  data() {
    return {
      overview: {},
      devices: [],
      soilDevices: [],
      airDevices: [],
      selectedSoilDevice: '',
      selectedAirDevice: '',
      soilLatest: null,
      airLatest: null,
      soilHistoryRows: [],
      airHistoryRows: [],
      soilPreviewRows: [],
      airPreviewRows: [],
      detailDialogVisible: false,
      detailDeviceCode: '',
      detailDeviceType: '',
      detailLatest: null,
      detailHistoryRows: [],
      detailTimeStart: '',
      detailTimeEnd: '',
      isRefreshing: false,
      lastPreviewRefreshAt: 0,
      nextRefreshAt: 0,
      refreshIntervalMs: 120000,
      previewRefreshIntervalMs: 300000,
      refreshTimer: null,
      diskAlertThresholdInput: '',
      isSavingDiskAlertThreshold: false,
    };
  },
  computed: {
    soilTimeData() { return this.getChartRows(this.soilHistoryRows).map((row) => this.formatTimeLabel(row.collected_at)); },
    airTimeData() { return this.getChartRows(this.airHistoryRows).map((row) => this.formatTimeLabel(row.collected_at)); },
    detailTimeData() { return this.getChartRows(this.detailHistoryRows, 160).map((row) => this.formatTimeLabel(row.collected_at)); },
    soilCharts() { return this.buildChartData(this.soilHistoryRows, SOIL_CHARTS); },
    airCharts() { return this.buildChartData(this.airHistoryRows, AIR_CHARTS); },
    detailCharts() {
      const chartTemplate = this.detailDeviceType === 'air_4in1' ? AIR_CHARTS : SOIL_CHARTS;
      return this.buildChartData(this.detailHistoryRows, chartTemplate);
    },
    soilMetricCards() { return this.buildMetricCards(this.soilLatest, 'soil_4in1'); },
    airMetricCards() { return this.buildMetricCards(this.airLatest, 'air_4in1'); },
    detailMetricCards() { return this.buildMetricCards(this.detailLatest, this.detailDeviceType); },
    soilTableRows() { return this.soilPreviewRows.slice(0, 500); },
    airTableRows() { return this.airPreviewRows.slice(0, 500); },
    detailTableRows() { return this.detailHistoryRows.slice(0, 100); },
    detailDialogTitle() { return this.detailDeviceCode ? `${this.detailDeviceCode} 详细曲线` : '传感器详情'; },
    detailDialogSubtitle() {
      if (!this.detailDeviceCode) return '可按时间范围查看完整历史曲线';
      return `${this.detailDeviceType === 'air_4in1' ? '空气' : '土壤'}设备历史曲线`;
    },
    detailRangeText() {
      if (!this.detailHistoryRows.length) return '';
      const ordered = [...this.detailHistoryRows].reverse();
      const start = ordered[0]?.collected_at;
      const end = ordered[ordered.length - 1]?.collected_at;
      if (!start || !end) return '';
      return `查看区间：${this.formatDateTime(start)} 至 ${this.formatDateTime(end)}`;
    },
  },
  mounted() {
    this.nextRefreshAt = Date.now() + this.refreshIntervalMs;
    this.refreshAllData(true);
    this.refreshTimer = window.setInterval(() => { this.handleScheduledRefresh(); }, this.refreshIntervalMs);
  },
  beforeUnmount() {
    if (this.refreshTimer) window.clearInterval(this.refreshTimer);
  },
  methods: {
    async handleScheduledRefresh() {
      this.nextRefreshAt = Date.now() + this.refreshIntervalMs;
      await this.refreshAllData();
    },
    buildChartData(rows, chartTemplate) {
      const ordered = this.getChartRows(rows, chartTemplate.length > 6 ? 90 : 120);
      return chartTemplate.map((chart) => ({ ...chart, data: ordered.map((row) => this.toNumber(row[chart.key])) }));
    },
    getChartRows(rows, maxPoints = 120) {
      const ordered = [...rows].reverse();
      if (ordered.length <= maxPoints) {
        return ordered;
      }
      const step = Math.ceil(ordered.length / maxPoints);
      const sampled = [];
      for (let index = 0; index < ordered.length; index += step) {
        sampled.push(ordered[index]);
      }
      const lastRow = ordered[ordered.length - 1];
      if (sampled[sampled.length - 1] !== lastRow) {
        sampled.push(lastRow);
      }
      return sampled;
    },
    buildMetricCards(latest, deviceType) {
      const current = latest || {};
      if (deviceType === 'air_4in1') {
        return [
          { key: 'temperature', label: '温度', value: this.formatMetric(current.temperature, '°C') },
          { key: 'humidity', label: '湿度', value: this.formatMetric(current.humidity, '%') },
          { key: 'co2', label: 'CO2', value: this.formatMetric(current.co2) },
          { key: 'lux', label: '光照', value: this.formatMetric(current.lux) },
        ];
      }
      return [
        { key: 'temperature', label: '温度', value: this.formatMetric(current.temperature, '°C') },
        { key: 'humidity', label: '湿度', value: this.formatMetric(current.humidity, '%') },
        { key: 'ec', label: 'EC', value: this.formatMetric(current.ec) },
        { key: 'salinity', label: '盐度', value: this.formatMetric(current.salinity) },
        { key: 'nitrogen', label: '氮', value: this.formatMetric(current.nitrogen) },
        { key: 'phosphorus', label: '磷', value: this.formatMetric(current.phosphorus) },
        { key: 'potassium', label: '钾', value: this.formatMetric(current.potassium) },
        { key: 'ph', label: 'pH', value: this.formatMetric(current.ph) },
      ];
    },
    sortDevicesByLatest(devices = []) {
      return [...devices].sort((a, b) => {
        const timeA = a?.last_collect_time ? new Date(a.last_collect_time).getTime() : 0;
        const timeB = b?.last_collect_time ? new Date(b.last_collect_time).getTime() : 0;
        return timeB - timeA;
      });
    },
    getRecentRange(hours = 48) {
      const end = new Date();
      const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
      return { start_time: this.formatRequestDateTime(start), end_time: this.formatRequestDateTime(end) };
    },
    getDetailRange() {
      if (this.detailTimeStart && this.detailTimeEnd) {
        return {
          start_time: this.normalizeDateTimeLocalValue(this.detailTimeStart),
          end_time: this.normalizeDateTimeLocalValue(this.detailTimeEnd),
        };
      }
      return this.getRecentRange(48);
    },
    getDetailHistoryLimit() {
      const startText = this.detailTimeStart;
      const endText = this.detailTimeEnd;
      if (!startText || !endText) {
        return 600;
      }
      const start = new Date(startText);
      const end = new Date(endText);
      const startMs = start.getTime();
      const endMs = end.getTime();
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
        return 600;
      }
      const diffMinutes = (endMs - startMs) / (60 * 1000);
      const estimatedPoints = Math.ceil(diffMinutes / 5) + 24;
      return Math.min(Math.max(estimatedPoints, 180), 3000);
    },
    formatDateTimeLocalValue(value) {
      const text = this.formatRequestDateTime(value);
      return text.replace(' ', 'T').slice(0, 16);
    },
    normalizeDateTimeLocalValue(value) {
      if (!value) return '';
      return String(value).replace('T', ' ') + ':00';
    },
    formatRequestDateTime(value) {
      const date = value instanceof Date ? value : new Date(value);
      const pad = (num) => String(num).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    },
    setDetailPreset(hours) {
      const end = new Date();
      const start = new Date(end.getTime() - hours * 60 * 60 * 1000);
      this.detailTimeStart = this.formatDateTimeLocalValue(start);
      this.detailTimeEnd = this.formatDateTimeLocalValue(end);
      if (this.detailDeviceCode) {
        this.fetchDeviceDetail(this.detailDeviceCode, this.detailDeviceType, true);
      }
    },
    async applyDetailTimeRange() {
      if (!this.detailDeviceCode) return;
      if (!this.detailTimeStart || !this.detailTimeEnd) return;
      await this.fetchDeviceDetail(this.detailDeviceCode, this.detailDeviceType, true);
    },
    async refreshAllData(forcePreview = false) {
      this.isRefreshing = true;
      try {
        await Promise.all([this.fetchOverview(), this.fetchDeviceList()]);
        await Promise.all([this.fetchSoilData(), this.fetchAirData()]);
        if (forcePreview || Date.now() - this.lastPreviewRefreshAt > this.previewRefreshIntervalMs) {
          await this.fetchSeparatedPreview();
          this.lastPreviewRefreshAt = Date.now();
        }
      } finally {
        this.isRefreshing = false;
      }
    },
    async fetchOverview() {
      const { data } = await axios.get('/api/dashboard/overview');
      this.overview = data.data || {};
      const currentThreshold = this.overview?.server_status?.disk_alert?.threshold_percent;
      if (currentThreshold !== undefined && currentThreshold !== null && currentThreshold !== '') {
        this.diskAlertThresholdInput = String(currentThreshold);
      }
    },
    async saveDiskAlertThreshold() {
      const value = Number(this.diskAlertThresholdInput);
      if (!Number.isFinite(value) || value < 5 || value > 95) {
        window.alert('提醒阈值请输入 5 到 95 之间的数字。');
        return;
      }

      this.isSavingDiskAlertThreshold = true;
      try {
        const { data } = await axios.post('/api/system/settings/disk-alert-threshold', {
          threshold_percent: value,
        });
        const nextThreshold = data?.data?.disk_alert_free_threshold;
        if (this.overview?.server_status?.disk_alert) {
          this.overview.server_status.disk_alert.threshold_percent = nextThreshold;
        }
        this.diskAlertThresholdInput = String(nextThreshold);
      } catch (error) {
        window.alert('保存提醒阈值失败，请稍后再试。');
      } finally {
        this.isSavingDiskAlertThreshold = false;
      }
    },
    async fetchDeviceList() {
      const { data } = await axios.get('/api/device/list');
      this.devices = Array.isArray(data.data) ? data.data : [];
      this.soilDevices = this.sortDevicesByLatest(this.devices.filter((item) => item.device_type === 'soil_4in1'));
      this.airDevices = this.sortDevicesByLatest(this.devices.filter((item) => item.device_type === 'air_4in1'));
      if (!this.selectedSoilDevice || !this.soilDevices.some((item) => item.device_code === this.selectedSoilDevice)) this.selectedSoilDevice = this.soilDevices[0]?.device_code || '';
      if (!this.selectedAirDevice || !this.airDevices.some((item) => item.device_code === this.selectedAirDevice)) this.selectedAirDevice = this.airDevices[0]?.device_code || '';
    },
    async fetchSoilData() {
      if (!this.selectedSoilDevice) {
        this.soilLatest = null;
        this.soilHistoryRows = [];
        return;
      }
      const range = this.getRecentRange();
      const [latestResp, historyResp] = await Promise.all([
        axios.get('/api/sensor/latest', { params: { device_code: this.selectedSoilDevice } }),
        axios.get('/api/sensor/history', { params: { device_code: this.selectedSoilDevice, limit: 180, ...range } }),
      ]);
      this.soilLatest = latestResp.data.data;
      this.soilHistoryRows = Array.isArray(historyResp.data.data) ? historyResp.data.data : [];
    },
    async fetchAirData() {
      if (!this.selectedAirDevice) {
        this.airLatest = null;
        this.airHistoryRows = [];
        return;
      }
      const range = this.getRecentRange();
      const [latestResp, historyResp] = await Promise.all([
        axios.get('/api/sensor/latest', { params: { device_code: this.selectedAirDevice } }),
        axios.get('/api/sensor/history', { params: { device_code: this.selectedAirDevice, limit: 180, ...range } }),
      ]);
      this.airLatest = latestResp.data.data;
      this.airHistoryRows = Array.isArray(historyResp.data.data) ? historyResp.data.data : [];
    },
    async fetchSeparatedPreview() {
      const range = this.getRecentRange();
      const [soilResp, airResp] = await Promise.all([
        axios.get('/api/soil/records', { params: { limit: 500, ...range } }),
        axios.get('/api/air/records', { params: { limit: 500, ...range } }),
      ]);
      this.soilPreviewRows = Array.isArray(soilResp.data.data) ? soilResp.data.data : [];
      this.airPreviewRows = Array.isArray(airResp.data.data) ? airResp.data.data : [];
    },
    async fetchDeviceDetail(deviceCode, deviceType, keepDialog = false) {
      if (!keepDialog) this.detailDialogVisible = true;
      this.detailDeviceCode = deviceCode;
      this.detailDeviceType = deviceType;
      if (!this.detailTimeStart || !this.detailTimeEnd) {
        const defaultRange = this.getRecentRange(48);
        this.detailTimeStart = this.formatDateTimeLocalValue(defaultRange.start_time);
        this.detailTimeEnd = this.formatDateTimeLocalValue(defaultRange.end_time);
      }
      this.detailLatest = null;
      this.detailHistoryRows = [];
      const range = this.getDetailRange();
      const historyLimit = this.getDetailHistoryLimit();
      const [latestResp, historyResp] = await Promise.all([
        axios.get('/api/sensor/latest', { params: { device_code: deviceCode } }),
        axios.get('/api/sensor/history', { params: { device_code: deviceCode, limit: historyLimit, ...range } }),
      ]);
      this.detailLatest = latestResp.data.data;
      this.detailHistoryRows = Array.isArray(historyResp.data.data) ? historyResp.data.data : [];
    },
    async openDeviceDetail(deviceCode, deviceType) {
      await this.fetchDeviceDetail(deviceCode, deviceType);
    },
    deviceOptionLabel(device) {
      return `${device.device_code} | 地址 ${device.slave_addr} | ${device.online_status === 1 ? '在线' : '离线'}`;
    },
    formatMetric(value, unit = '') {
      if (value === undefined || value === null || value === '') return '--';
      return `${value}${unit}`;
    },
    formatDateTime(value) {
      if (!value) return '--';
      return String(value).replace('T', ' ').replace('.000Z', '');
    },
    formatTimeLabel(value) {
      if (!value) return '-- --:--';
      const text = this.formatDateTime(value);
      return `${text.slice(5, 10)} ${text.slice(11, 16)}`;
    },
    formatPercent(value) {
      if (value === undefined || value === null || value === '') return '--';
      const num = Number(value);
      return Number.isFinite(num) ? `${num.toFixed(1)}%` : '--';
    },
    formatLoadAverage(value) {
      if (!Array.isArray(value) || value.length === 0) return '--';
      return value.map((item) => Number(item).toFixed(2)).join(' / ');
    },
    summarizeServerLoad(value) {
      if (!Array.isArray(value) || value.length === 0) return '--';
      const load1m = Number(value[0]);
      if (!Number.isFinite(load1m)) return '--';
      if (load1m < 0.8) return '轻松';
      if (load1m < 1.6) return '正常';
      if (load1m < 3) return '偏高';
      return '繁忙';
    },
    formatLoadAverageHint(value) {
      if (!Array.isArray(value) || value.length === 0) return '暂无负载数据';
      const load1m = Number(value[0]);
      if (!Number.isFinite(load1m)) return '暂无负载数据';
      return `1 分钟负载 ${load1m.toFixed(2)}`;
    },
    formatCpuHint(cpu, cpuCores) {
      const sampleMs = Number(cpu && cpu.sample_ms);
      const coreText = cpuCores ? `${cpuCores} 核` : '--';
      if (!Number.isFinite(sampleMs) || sampleMs <= 0) {
        return `${coreText}，等待下一次采样`;
      }
      return `${coreText}，采样窗口 ${(sampleMs / 1000).toFixed(0)} 秒`;
    },
    formatDuration(seconds) {
      const total = Number(seconds);
      if (!Number.isFinite(total) || total < 0) return '--';
      const days = Math.floor(total / 86400);
      const hours = Math.floor((total % 86400) / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      if (days > 0) return `${days}天 ${hours}小时`;
      if (hours > 0) return `${hours}小时 ${minutes}分`;
      return `${minutes}分`;
    },
    toNumber(value) {
      if (value === undefined || value === null || value === '') return null;
      const num = Number(value);
      return Number.isFinite(num) ? num : null;
    },
    formatStorage(value) {
      const num = Number(value);
      if (!Number.isFinite(num)) return '--';
      return `${num.toFixed(2)} GB`;
    },
    formatRate(value) {
      const num = Number(value);
      if (!Number.isFinite(num)) return '--';
      if (num < 1024) return `${num.toFixed(0)} B/s`;
      if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB/s`;
      if (num < 1024 * 1024 * 1024) return `${(num / (1024 * 1024)).toFixed(2)} MB/s`;
      return `${(num / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
    },
    formatRateHint(sampleMs) {
      const num = Number(sampleMs);
      if (!Number.isFinite(num) || num <= 0) return '等待下一次采样';
      return `采样窗口 ${(num / 1000).toFixed(0)} 秒`;
    },
    downloadSeparatedExport(type, format) {
      const endpoint = type === 'soil' ? '/api/export/soil' : '/api/export/air';
      window.open(`${endpoint}?format=${format}`, '_blank');
    },
  },
};
</script>

<style scoped>
.page-shell { position: relative; min-height: 100vh; padding: 16px 18px 24px; overflow: hidden; background: radial-gradient(circle at 20% 18%, rgba(105, 202, 255, 0.12), transparent 18%), radial-gradient(circle at 82% 16%, rgba(90, 124, 255, 0.12), transparent 22%), radial-gradient(circle at 78% 78%, rgba(70, 232, 255, 0.08), transparent 18%), linear-gradient(180deg, #07172e 0%, #061120 56%, #050b16 100%); }
.page-shell::before, .page-shell::after { content: ''; position: absolute; inset: 0; pointer-events: none; }
.page-shell::before { background: radial-gradient(circle at 8% 12%, rgba(255,255,255,0.92) 0 1px, transparent 2px), radial-gradient(circle at 18% 24%, rgba(124,226,255,0.9) 0 1px, transparent 2px), radial-gradient(circle at 28% 8%, rgba(255,255,255,0.82) 0 1.2px, transparent 2.2px), radial-gradient(circle at 35% 28%, rgba(108,212,255,0.74) 0 1px, transparent 2px), radial-gradient(circle at 44% 10%, rgba(255,255,255,0.8) 0 1px, transparent 2px), radial-gradient(circle at 56% 18%, rgba(112,216,255,0.72) 0 1px, transparent 2px), radial-gradient(circle at 64% 7%, rgba(255,255,255,0.76) 0 1.1px, transparent 2.2px), radial-gradient(circle at 73% 22%, rgba(99,202,255,0.74) 0 1px, transparent 2px), radial-gradient(circle at 82% 12%, rgba(255,255,255,0.86) 0 1px, transparent 2px), radial-gradient(circle at 91% 26%, rgba(105,214,255,0.78) 0 1px, transparent 2px), radial-gradient(circle at 12% 68%, rgba(255,255,255,0.76) 0 1px, transparent 2px), radial-gradient(circle at 24% 82%, rgba(106,213,255,0.74) 0 1px, transparent 2px), radial-gradient(circle at 37% 72%, rgba(255,255,255,0.78) 0 1px, transparent 2px), radial-gradient(circle at 46% 88%, rgba(102,208,255,0.76) 0 1px, transparent 2px), radial-gradient(circle at 58% 70%, rgba(255,255,255,0.72) 0 1px, transparent 2px), radial-gradient(circle at 71% 84%, rgba(102,215,255,0.7) 0 1px, transparent 2px), radial-gradient(circle at 84% 72%, rgba(255,255,255,0.82) 0 1px, transparent 2px), radial-gradient(circle at 93% 88%, rgba(113,222,255,0.74) 0 1px, transparent 2px); opacity: 0.8; animation: starPulse 9s ease-in-out infinite; }
.page-shell::after { background: radial-gradient(circle at 50% 50%, rgba(74,181,255,0.08), transparent 40%), linear-gradient(180deg, rgba(12,30,58,0.16), transparent 24%, transparent 76%, rgba(7,14,28,0.3)); }
.hero-grid, .dual-column-grid { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; }
.hero-grid { margin-bottom: 20px; }
.panel-card { border: 1px solid rgba(110,226,255,0.42); border-radius: 18px; background: linear-gradient(180deg, rgba(8,28,63,0.9), rgba(7,23,52,0.82)); box-shadow: inset 0 0 0 1px rgba(129,219,255,0.08), 0 18px 44px rgba(2,11,31,0.32); backdrop-filter: blur(10px); }
.intro-card, .export-card, .domain-panel { padding: 20px; }
.section-title { display: flex; align-items: flex-start; gap: 12px; }
.section-title.compact { align-items: center; }
.title-mark { width: 6px; height: 42px; border-radius: 999px; background: linear-gradient(180deg, #7ce6ff, #3eb7ff); box-shadow: 0 0 16px rgba(88,216,255,0.5); }
.section-title h2, .table-head h3, .detail-title h3 { margin: 0; color: #eef7ff; font-size: 26px; letter-spacing: 1px; }
.section-title p, .detail-title p { margin: 6px 0 0; color: rgba(208,229,248,0.72); font-size: 13px; }
.stats-grid, .metric-strip, .export-grid, .latest-grid, .chart-grid { display: grid; gap: 14px; }
.stats-grid { margin-top: 18px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.stat-box, .metric-pill { min-height: 90px; border: 1px solid rgba(111,215,255,0.22); border-radius: 16px; background: linear-gradient(180deg, rgba(19,45,92,0.82), rgba(10,27,58,0.78)); padding: 16px; }
.stat-label, .metric-pill span, .mini-heading, .selector-wrap label, .table-head span { color: rgba(205,227,248,0.72); font-size: 12px; }
.stat-box strong, .metric-pill strong { display: block; margin-top: 10px; color: #ffffff; font-size: 28px; }
.latest-air, .server-status { margin-top: 18px; }
.latest-grid { margin-top: 10px; grid-template-columns: repeat(3, minmax(0, 1fr)); color: #dcecff; font-size: 14px; }
.server-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-top: 10px; }
.server-chip { min-height: 82px; border: 1px solid rgba(104,210,255,0.18); border-radius: 14px; background: linear-gradient(180deg, rgba(14,37,78,0.72), rgba(8,20,45,0.78)); padding: 14px 16px; }
.server-chip span { display: block; color: rgba(205,227,248,0.68); font-size: 12px; }
.server-chip strong { display: block; margin-top: 8px; color: #ffffff; font-size: 20px; line-height: 1.3; }
.server-chip small { display: block; margin-top: 6px; color: rgba(205,227,248,0.62); font-size: 11px; line-height: 1.4; }
.server-chip--editable { display: flex; flex-direction: column; }
.threshold-editor { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.threshold-input { flex: 1; min-width: 0; height: 36px; padding: 0 12px; border: 1px solid rgba(120, 219, 255, 0.2); border-radius: 10px; background: rgba(11, 29, 60, 0.82); color: #e8f6ff; outline: none; }
.threshold-save-btn { min-width: 72px; height: 36px; border: none; border-radius: 10px; background: linear-gradient(135deg, #47b5ff, #7ce6ff); color: #06213a; font-size: 13px; font-weight: 700; cursor: pointer; }
.threshold-save-btn:disabled { opacity: 0.7; cursor: wait; }
.export-grid { margin-top: 18px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.action-btn { min-height: 48px; border: none; border-radius: 14px; background: linear-gradient(135deg, #2ba2ff, #5bd5ff); color: #06172d; font-size: 14px; font-weight: 700; cursor: pointer; }
.action-btn.ghost { background: linear-gradient(135deg, rgba(71,151,255,0.18), rgba(72,223,255,0.2)); color: #dff4ff; border: 1px solid rgba(108,211,255,0.28); }
.manage-entry { margin-top: 14px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.manage-link-btn { display: flex; align-items: center; justify-content: center; min-height: 50px; border-radius: 14px; text-decoration: none; color: #031a2d; font-size: 14px; font-weight: 800; letter-spacing: 0.5px; background: linear-gradient(135deg, #8ef4ff, #47b5ff 60%, #7ce6ff); box-shadow: 0 10px 24px rgba(47, 181, 255, 0.22); }
.manage-link-btn:hover { transform: translateY(-1px); box-shadow: 0 14px 28px rgba(47, 181, 255, 0.3); }
.manage-link-btn.secondary { color: #dff6ff; background: linear-gradient(135deg, rgba(51, 112, 255, 0.38), rgba(45, 210, 255, 0.28)); border: 1px solid rgba(126, 220, 255, 0.2); box-shadow: none; }
.split-head { display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 320px); gap: 18px; align-items: center; }
.selector-wrap :deep(.el-select) { width: 100%; }
.metric-strip { margin-top: 18px; grid-template-columns: repeat(4, minmax(0, 1fr)); }
.chart-grid { margin-top: 18px; }
.soil-chart-grid, .air-chart-grid, .detail-chart-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.chart-card { border: 1px solid rgba(95,194,255,0.24); border-radius: 18px; padding: 10px; background: linear-gradient(180deg, rgba(15,38,82,0.7), rgba(8,22,49,0.74)); }
.table-block { margin-top: 22px; }
.table-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.table-shell { overflow: auto; max-height: 560px; border: 1px solid rgba(102,207,255,0.18); border-radius: 16px; background: rgba(8,20,43,0.66); scrollbar-width: thin; scrollbar-color: rgba(109,211,255,0.7) rgba(10,30,58,0.78); }
.table-shell::-webkit-scrollbar { width: 12px; height: 12px; }
.table-shell::-webkit-scrollbar-track { background: rgba(10,30,58,0.78); border-radius: 999px; }
.table-shell::-webkit-scrollbar-thumb { border-radius: 999px; border: 2px solid rgba(10,30,58,0.9); background: linear-gradient(180deg, rgba(110,221,255,0.95), rgba(49,143,255,0.9)); }
.table-shell::-webkit-scrollbar-thumb:hover { background: linear-gradient(180deg, rgba(136,230,255,1), rgba(73,166,255,0.95)); }
.mobile-record-list { display: none; }
.mobile-record-card { border: 1px solid rgba(105, 202, 255, 0.16); border-radius: 16px; background: linear-gradient(180deg, rgba(14, 34, 68, 0.88), rgba(8, 23, 46, 0.84)); padding: 14px; box-shadow: inset 0 0 0 1px rgba(129, 219, 255, 0.05); }
.mobile-record-card + .mobile-record-card { margin-top: 12px; }
.mobile-record-card__head, .mobile-record-card__foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.mobile-record-card__head { margin-bottom: 12px; }
.mobile-record-card__head strong { color: #eef7ff; font-size: 15px; line-height: 1.4; word-break: break-all; }
.mobile-record-card__grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px 12px; color: #dcecff; font-size: 13px; }
.mobile-record-card__foot { margin-top: 12px; color: rgba(208,229,248,0.76); font-size: 12px; align-items: flex-end; }
.mobile-record-card__foot span:last-child { text-align: right; }
.mobile-empty { padding: 18px 14px; text-align: center; border: 1px dashed rgba(112, 223, 255, 0.2); border-radius: 14px; color: rgba(205,227,248,0.62); font-size: 13px; }
.data-table { width: 100%; border-collapse: collapse; min-width: 880px; }
.data-table th, .data-table td { padding: 14px 12px; border-bottom: 1px solid rgba(100,165,214,0.12); color: #dcecff; font-size: 13px; text-align: left; white-space: nowrap; }
.data-table thead th { position: sticky; top: 0; z-index: 1; background: rgba(9,27,59,0.96); color: #f3fbff; }
.device-link { padding: 0; border: none; background: transparent; color: #7ce6ff; cursor: pointer; font: inherit; font-weight: 700; transition: color 0.2s ease, text-shadow 0.2s ease; }
.device-link:hover { color: #ffffff; text-shadow: 0 0 10px rgba(124,230,255,0.5); }
.row-detail-btn { min-width: 78px; height: 30px; border: none; border-radius: 999px; background: linear-gradient(135deg, #2ba2ff, #7ce6ff); color: #06172d; font-size: 12px; font-weight: 800; cursor: pointer; }
.row-detail-btn:hover { filter: brightness(1.05); }
.status-tag { display: inline-flex; align-items: center; justify-content: center; min-width: 54px; height: 28px; padding: 0 12px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.status-success { color: #072415; background: linear-gradient(135deg, #7cefa8, #5cd89a); }
.status-fail { color: #fff1f1; background: linear-gradient(135deg, #ff7e7e, #d85b6c); }
.empty-cell { text-align: center !important; color: rgba(205,227,248,0.58) !important; }
.detail-modal-mask { position: fixed; inset: 0; z-index: 2000; display: flex; align-items: flex-start; justify-content: center; padding: 4vh 24px 24px; background: rgba(3, 10, 22, 0.66); backdrop-filter: blur(4px); }
.detail-modal { width: min(1380px, 100%); max-height: 92vh; border: 1px solid rgba(112,223,255,0.38); border-radius: 18px; background: linear-gradient(180deg, rgba(6,21,48,0.98), rgba(4,15,34,0.98)); box-shadow: 0 20px 60px rgba(1,8,23,0.52); overflow: hidden; }
.detail-modal-header { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 22px 16px; border-bottom: 1px solid rgba(98,194,255,0.18); }
.detail-range-chip { display: inline-flex; align-items: center; margin-top: 10px; padding: 8px 12px; border-radius: 999px; border: 1px solid rgba(117, 221, 255, 0.18); background: rgba(13, 35, 72, 0.66); color: #d8f1ff; font-size: 12px; line-height: 1.4; }
.detail-close-btn { min-width: 84px; height: 38px; border: 1px solid rgba(120, 219, 255, 0.32); border-radius: 12px; background: rgba(16, 48, 94, 0.72); color: #dff4ff; cursor: pointer; font-size: 14px; }
.detail-content { max-height: calc(92vh - 78px); overflow: auto; padding: 20px 22px 24px; }
.detail-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; flex-wrap: wrap; }
.detail-toolbar__presets { display: flex; gap: 10px; flex-wrap: wrap; }
.detail-toolbar__picker { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.detail-input-group { display: flex; flex-direction: column; gap: 6px; color: rgba(216, 241, 255, 0.76); font-size: 12px; }
.detail-time-input { min-width: 220px; height: 40px; padding: 0 12px; border: 1px solid rgba(120, 219, 255, 0.2); border-radius: 12px; background: rgba(11, 29, 60, 0.82); color: #e8f6ff; outline: none; }
.detail-time-input::-webkit-calendar-picker-indicator { filter: invert(1) brightness(1.2); cursor: pointer; }
.detail-preset-btn, .detail-apply-btn { min-height: 38px; padding: 0 14px; border-radius: 999px; border: 1px solid rgba(120, 219, 255, 0.28); background: rgba(13, 35, 72, 0.72); color: #dff4ff; cursor: pointer; font-size: 13px; font-weight: 700; }
.detail-apply-btn { background: linear-gradient(135deg, #47b5ff, #7ce6ff); color: #06213a; border: none; }
.detail-metric-strip { margin-top: 0; }
.detail-table-block { margin-top: 20px; }
.detail-table-shell { max-height: 420px; }
@media (max-width: 1500px) { .metric-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 1280px) { .hero-grid, .dual-column-grid, .soil-chart-grid, .air-chart-grid, .detail-chart-grid, .latest-grid, .server-grid, .stats-grid { grid-template-columns: 1fr; } .split-head { grid-template-columns: 1fr; } }
@media (max-width: 768px) { .page-shell { padding: 10px 10px 110px; } .page-shell::before { opacity: 0.62; } .intro-card, .export-card, .domain-panel { padding: 14px; } .section-title h2, .table-head h3, .detail-title h3 { font-size: 22px; } .section-title { align-items: center; } .section-title.compact { align-items: flex-start; } .title-mark { height: 34px; } .export-grid, .metric-strip, .chart-grid, .soil-chart-grid, .air-chart-grid, .detail-chart-grid, .server-grid, .stats-grid, .latest-grid { grid-template-columns: 1fr; } .chart-card { padding: 8px; } .stat-box, .metric-pill { min-height: 72px; } .stat-box strong, .metric-pill strong { font-size: 24px; } .table-shell { display: none; } .mobile-record-list { display: block; } .detail-modal-mask { padding: 2vh 10px 10px; align-items: stretch; } .detail-modal { width: 100%; max-height: none; min-height: 100%; border-radius: 16px; } .detail-modal-header { padding: 16px 14px 12px; flex-direction: column; align-items: stretch; } .detail-close-btn { width: 100%; } .detail-content { max-height: none; padding: 14px; } .detail-toolbar { gap: 12px; } .detail-toolbar__presets, .detail-toolbar__picker { width: 100%; } .detail-input-group, .detail-time-input, .detail-apply-btn, .threshold-input, .threshold-save-btn { width: 100%; min-width: 100%; } .threshold-editor { flex-direction: column; align-items: stretch; } }
@media (max-width: 520px) { .section-title h2, .table-head h3, .detail-title h3 { font-size: 20px; } .section-title p, .detail-title p { font-size: 12px; } .selector-wrap label { font-size: 11px; } .server-chip strong { font-size: 18px; } .mobile-record-card__grid { grid-template-columns: 1fr; } .mobile-record-card__head, .mobile-record-card__foot { flex-direction: column; align-items: flex-start; } }
@keyframes starPulse { 0% { opacity: 0.64; transform: scale(1); } 50% { opacity: 0.92; transform: scale(1.01); } 100% { opacity: 0.64; transform: scale(1); } }
</style>

