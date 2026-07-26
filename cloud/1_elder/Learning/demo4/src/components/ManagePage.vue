<template>
  <div class="manage-shell">
    <aside class="manage-side">
      <div class="brand-block">
        <h1>实验管理台</h1>
        <p>设备、盆号、植株与绑定关系的集中查看入口</p>
      </div>

      <nav class="side-nav">
        <a href="#overview">实验概览</a>
        <a href="#bindings">当前绑定</a>
        <a href="#devices">设备列表</a>
        <a href="#plants">植株列表</a>
      </nav>

      <div class="side-actions">
        <router-link class="side-btn ghost" to="/">返回监管平台</router-link>
        <button class="side-btn" @click="refreshAll">刷新数据</button>
      </div>
    </aside>

    <main class="manage-main">
      <section id="overview" class="manage-card">
        <div class="card-head">
          <div>
            <h2>实验概览</h2>
            <p>用于快速确认设备数量、土壤与空气采集规模，以及当前植株数量。</p>
          </div>
        </div>

        <div class="overview-grid">
          <div class="overview-pill">
            <span>设备总数</span>
            <strong>{{ overview.total_devices || 0 }}</strong>
          </div>
          <div class="overview-pill">
            <span>土壤设备</span>
            <strong>{{ overview.soil_devices || 0 }}</strong>
          </div>
          <div class="overview-pill">
            <span>空气设备</span>
            <strong>{{ overview.air_devices || 0 }}</strong>
          </div>
          <div class="overview-pill">
            <span>植株总数</span>
            <strong>{{ overview.total_plants || 0 }}</strong>
          </div>
        </div>
      </section>

      <section id="bindings" class="manage-card">
        <div class="card-head">
          <div>
            <h2>当前绑定</h2>
            <p>查看传感器、盆号和植株之间的当前对应关系。</p>
          </div>
          <span class="card-tag">{{ bindings.length }} 条</span>
        </div>

        <div class="table-wrap">
          <table class="manage-table">
            <thead>
              <tr>
                <th>设备编码</th>
                <th>网关编码</th>
                <th>地址</th>
                <th>设备类型</th>
                <th>植株编号</th>
                <th>盆编号</th>
                <th>分组</th>
                <th>开始时间</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in bindings" :key="row.id || `${row.device_code}-${row.start_time}`">
                <td>{{ row.device_code || '--' }}</td>
                <td>{{ row.gateway_code || '--' }}</td>
                <td>{{ row.slave_addr ?? '--' }}</td>
                <td>{{ row.device_type || '--' }}</td>
                <td>{{ row.plant_code || '--' }}</td>
                <td>{{ row.pot_code || '--' }}</td>
                <td>{{ row.group_type || '--' }}</td>
                <td>{{ formatDateTime(row.start_time) }}</td>
              </tr>
              <tr v-if="!bindings.length">
                <td colspan="8" class="empty-cell">暂无绑定数据</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="split-grid">
        <section id="devices" class="manage-card">
          <div class="card-head">
            <div>
              <h2>设备列表</h2>
              <p>查看在线状态、设备类型和最近一次采集时间。</p>
            </div>
            <span class="card-tag">{{ devices.length }} 台</span>
          </div>

          <div class="table-wrap narrow">
            <table class="manage-table">
              <thead>
                <tr>
                  <th>设备编码</th>
                  <th>设备类型</th>
                  <th>在线状态</th>
                  <th>最近采集</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in devices" :key="row.device_code">
                  <td>{{ row.device_code || '--' }}</td>
                  <td>{{ row.device_type || '--' }}</td>
                  <td>
                    <span :class="['status-chip', row.online_status === 1 ? 'online' : 'offline']">
                      {{ row.online_status === 1 ? '在线' : '离线' }}
                    </span>
                  </td>
                  <td>{{ formatDateTime(row.last_collect_time) }}</td>
                </tr>
                <tr v-if="!devices.length">
                  <td colspan="4" class="empty-cell">暂无设备数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section id="plants" class="manage-card">
          <div class="card-head">
            <div>
              <h2>植株列表</h2>
              <p>查看盆编号、分组和当前绑定设备。</p>
            </div>
            <span class="card-tag">{{ plants.length }} 株</span>
          </div>

          <div class="table-wrap narrow">
            <table class="manage-table">
              <thead>
                <tr>
                  <th>植株编号</th>
                  <th>盆编号</th>
                  <th>分组</th>
                  <th>绑定设备</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in plants" :key="row.plant_code || `${row.pot_code}-${row.device_code}`">
                  <td>{{ row.plant_code || '--' }}</td>
                  <td>{{ row.pot_code || '--' }}</td>
                  <td>{{ row.group_type || '--' }}</td>
                  <td>{{ row.device_code || '--' }}</td>
                </tr>
                <tr v-if="!plants.length">
                  <td colspan="4" class="empty-cell">暂无植株数据</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'ManagePage',
  data() {
    return {
      overview: {},
      bindings: [],
      devices: [],
      plants: [],
      refreshTimer: null,
    };
  },
  mounted() {
    this.refreshAll();
    this.refreshTimer = window.setInterval(() => {
      this.refreshAll();
    }, 120000);
  },
  beforeUnmount() {
    if (this.refreshTimer) {
      window.clearInterval(this.refreshTimer);
    }
  },
  methods: {
    async refreshAll() {
      const [overviewResp, bindingsResp, devicesResp, plantsResp] = await Promise.all([
        axios.get('/api/dashboard/overview'),
        axios.get('/api/bindings/current'),
        axios.get('/api/device/list'),
        axios.get('/api/plants'),
      ]);

      this.overview = overviewResp.data.data || {};
      this.bindings = Array.isArray(bindingsResp.data.data) ? bindingsResp.data.data : [];
      this.devices = Array.isArray(devicesResp.data.data) ? devicesResp.data.data.slice(0, 200) : [];
      this.plants = Array.isArray(plantsResp.data.data) ? plantsResp.data.data.slice(0, 200) : [];
    },
    formatDateTime(value) {
      if (!value) return '--';
      return String(value).replace('T', ' ').replace('.000Z', '');
    },
  },
};
</script>

<style scoped>
.manage-shell { min-height: 100vh; display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 18px; padding: 18px; background: linear-gradient(180deg, #07131f, #091827 55%, #07111c); color: #e8f6ff; }
.manage-side { position: sticky; top: 18px; align-self: start; border: 1px solid rgba(103, 212, 255, 0.18); border-radius: 18px; background: linear-gradient(180deg, rgba(12, 24, 41, 0.96), rgba(8, 17, 30, 0.98)); padding: 20px; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.28); }
.brand-block h1 { margin: 0; font-size: 26px; color: #f8fcff; }
.brand-block p { margin: 8px 0 0; color: rgba(214, 234, 248, 0.68); font-size: 13px; line-height: 1.6; }
.side-nav { display: grid; gap: 10px; margin-top: 24px; }
.side-nav a { padding: 12px 14px; border-radius: 12px; color: #cfe9ff; text-decoration: none; background: rgba(21, 43, 71, 0.58); }
.side-nav a:hover { background: rgba(35, 72, 116, 0.72); }
.side-actions { display: grid; gap: 10px; margin-top: 24px; }
.side-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; border-radius: 12px; border: 1px solid rgba(114, 219, 255, 0.22); background: linear-gradient(135deg, #47b5ff, #7ce6ff); color: #052039; text-decoration: none; font-weight: 700; cursor: pointer; }
.side-btn.ghost { background: rgba(20, 43, 73, 0.82); color: #dff3ff; }
.manage-main { display: grid; gap: 18px; min-width: 0; }
.manage-card { border: 1px solid rgba(103, 212, 255, 0.18); border-radius: 18px; background: linear-gradient(180deg, rgba(12, 24, 41, 0.96), rgba(8, 17, 30, 0.98)); padding: 20px; box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22); min-width: 0; }
.card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.card-head h2 { margin: 0; font-size: 24px; }
.card-head p { margin: 8px 0 0; color: rgba(214, 234, 248, 0.68); font-size: 13px; line-height: 1.6; }
.card-tag { padding: 8px 12px; border-radius: 999px; background: rgba(54, 103, 172, 0.28); color: #bfe9ff; font-size: 12px; white-space: nowrap; }
.overview-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.overview-pill { min-height: 96px; padding: 16px; border: 1px solid rgba(113, 214, 255, 0.16); border-radius: 16px; background: rgba(14, 30, 52, 0.86); }
.overview-pill span { color: rgba(208, 229, 248, 0.72); font-size: 12px; }
.overview-pill strong { display: block; margin-top: 12px; font-size: 30px; color: #fff; }
.split-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
.table-wrap { overflow: auto; border-radius: 14px; border: 1px solid rgba(105, 202, 255, 0.14); scrollbar-width: thin; scrollbar-color: rgba(109,211,255,0.7) rgba(10,30,58,0.78); }
.table-wrap::-webkit-scrollbar { width: 10px; height: 10px; }
.table-wrap::-webkit-scrollbar-track { background: rgba(10,30,58,0.78); border-radius: 999px; }
.table-wrap::-webkit-scrollbar-thumb { border-radius: 999px; border: 2px solid rgba(10,30,58,0.9); background: linear-gradient(180deg, rgba(110,221,255,0.95), rgba(49,143,255,0.9)); }
.table-wrap.narrow { max-height: 720px; }
.manage-table { width: 100%; border-collapse: collapse; min-width: 720px; }
.manage-table th, .manage-table td { padding: 12px 14px; border-bottom: 1px solid rgba(92, 148, 193, 0.14); text-align: left; font-size: 13px; color: #dcecff; white-space: nowrap; }
.manage-table th { position: sticky; top: 0; background: rgba(8, 21, 38, 0.98); color: #f5fbff; z-index: 1; }
.status-chip { display: inline-flex; align-items: center; justify-content: center; min-width: 56px; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.status-chip.online { background: linear-gradient(135deg, #91f1b0, #5fd89a); color: #062918; }
.status-chip.offline { background: linear-gradient(135deg, #ff9696, #e26a78); color: #fff; }
.empty-cell { text-align: center !important; color: rgba(205, 227, 248, 0.58) !important; }

@media (max-width: 1200px) {
  .manage-shell { grid-template-columns: 1fr; }
  .manage-side { position: static; }
  .overview-grid, .split-grid { grid-template-columns: 1fr; }
}

@media (max-width: 768px) {
  .manage-shell { padding: 10px; gap: 12px; }
  .manage-side, .manage-card { padding: 14px; border-radius: 16px; }
  .brand-block h1, .card-head h2 { font-size: 22px; }
  .side-nav { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .side-actions { grid-template-columns: 1fr; }
  .card-head { flex-direction: column; align-items: flex-start; }
  .overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .overview-pill strong { font-size: 26px; }
}

@media (max-width: 520px) {
  .manage-shell { padding: 8px; }
  .side-nav { grid-template-columns: 1fr; }
  .overview-grid { grid-template-columns: 1fr; }
  .manage-table { min-width: 640px; }
}
</style>
