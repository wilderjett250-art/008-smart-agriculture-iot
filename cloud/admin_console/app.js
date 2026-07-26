const TOKEN_KEY = 'flower_lab_manage_token';

const state = {
  token: localStorage.getItem(TOKEN_KEY) || '',
  currentUser: null,
  overview: null,
  devices: [],
  plants: [],
  pots: [],
  bindings: [],
  users: [],
  selectedDeviceCode: null,
  selectedLatest: null,
  selectedHistory: [],
};

const els = {
  authGate: document.getElementById('authGate'),
  authError: document.getElementById('authError'),
  appRoot: document.getElementById('appRoot'),
  loginForm: document.getElementById('loginForm'),
  currentUserName: document.getElementById('currentUserName'),
  currentUserRole: document.getElementById('currentUserRole'),
  healthBadge: document.getElementById('healthBadge'),
  lastSync: document.getElementById('lastSync'),
  overviewDevices: document.getElementById('overviewDevices'),
  overviewSoil: document.getElementById('overviewSoil'),
  overviewAir: document.getElementById('overviewAir'),
  overviewPlants: document.getElementById('overviewPlants'),
  overviewStress: document.getElementById('overviewStress'),
  overviewControl: document.getElementById('overviewControl'),
  readonlyBanner: document.getElementById('readonlyBanner'),
  deviceTypeFilter: document.getElementById('deviceTypeFilter'),
  deviceSearchInput: document.getElementById('deviceSearchInput'),
  deviceTableBody: document.getElementById('deviceTableBody'),
  selectedDeviceTitle: document.getElementById('selectedDeviceTitle'),
  selectedDeviceMeta: document.getElementById('selectedDeviceMeta'),
  latestMetrics: document.getElementById('latestMetrics'),
  historyPreviewBody: document.getElementById('historyPreviewBody'),
  plantTableBody: document.getElementById('plantTableBody'),
  potTableBody: document.getElementById('potTableBody'),
  bindingTableBody: document.getElementById('bindingTableBody'),
  userTableBody: document.getElementById('userTableBody'),
  plantCountLabel: document.getElementById('plantCountLabel'),
  potCountLabel: document.getElementById('potCountLabel'),
  bindingCountLabel: document.getElementById('bindingCountLabel'),
  userCountLabel: document.getElementById('userCountLabel'),
  refreshAllBtn: document.getElementById('refreshAllBtn'),
  refreshSelectedBtn: document.getElementById('refreshSelectedBtn'),
  logoutBtn: document.getElementById('logoutBtn'),
  plantForm: document.getElementById('plantForm'),
  potForm: document.getElementById('potForm'),
  bindingForm: document.getElementById('bindingForm'),
  userForm: document.getElementById('userForm'),
  passwordForm: document.getElementById('passwordForm'),
  exportForm: document.getElementById('exportForm'),
  btnExportCsv: document.getElementById('btnExportCsv'),
  btnExportExcel: document.getElementById('btnExportExcel'),
  editHint: document.getElementById('editHint'),
  usersSection: document.getElementById('users'),
  userNavLink: document.getElementById('userNavLink'),
  toast: document.getElementById('toast'),
};

function formatValue(value, fallback = '-') {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('zh-CN', { hour12: false });
}

function roleBadgeClass(role) {
  if (role === 'admin') return 'badge admin';
  if (role === 'editor') return 'badge editor';
  return 'badge viewer';
}

function canEdit() {
  return ['editor', 'admin'].includes(state.currentUser?.role);
}

function isAdmin() {
  return state.currentUser?.role === 'admin';
}

function isViewer() {
  return state.currentUser?.role === 'viewer';
}

function canDeleteUser(user) {
  if (!isAdmin()) return false;
  if (!user) return false;
  if (user.username === state.currentUser?.username) return false;
  if (user.username === 'admin') return false;
  return true;
}

function canToggleUser(user) {
  if (!isAdmin()) return false;
  if (!user) return false;
  if (user.username === state.currentUser?.username) return false;
  if (user.username === 'admin') return false;
  return true;
}

function showToast(message, type = 'ok') {
  els.toast.textContent = message;
  els.toast.className = `toast ${type}`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    els.toast.className = 'toast hidden';
  }, 2800);
}

function setToken(token) {
  state.token = token || '';
  if (state.token) {
    localStorage.setItem(TOKEN_KEY, state.token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }
  return headers;
}

async function apiGet(path, withAuth = false) {
  const response = await fetch(path, {
    headers: withAuth && state.token ? { Authorization: `Bearer ${state.token}` } : {},
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('登录状态已失效，请重新登录');
    }
    const text = await response.text();
    throw new Error(text || `请求失败: ${response.status}`);
  }

  return response.json();
}

async function apiPost(path, payload, withAuth = false) {
  const response = await fetch(path, {
    method: 'POST',
    headers: withAuth ? authHeaders() : { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('登录状态已失效，请重新登录');
    }
    if (response.status === 403) {
      throw new Error('当前账号没有该操作权限');
    }
    const text = await response.text();
    throw new Error(text || `请求失败: ${response.status}`);
  }

  return response.json();
}

function formToObject(form) {
  const data = new FormData(form);
  return Array.from(data.entries()).reduce((acc, [key, value]) => {
    acc[key] = value.trim();
    return acc;
  }, {});
}

function buildExportQuery(format) {
  const payload = formToObject(els.exportForm);
  const params = new URLSearchParams();
  params.set('format', format);
  params.set('limit', '5000');

  Object.entries(payload).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  return `/api/dataset/export?${params.toString()}`;
}

function setFormEnabled(form, enabled) {
  Array.from(form.elements).forEach((element) => {
    if (['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName)) {
      element.disabled = !enabled;
    }
  });
}

function renderAuthState() {
  const loggedIn = Boolean(state.currentUser);
  els.authGate.classList.toggle('hidden', loggedIn);
  els.appRoot.classList.toggle('app-hidden', !loggedIn);

  if (!loggedIn) {
    els.readonlyBanner.classList.add('hidden');
    return;
  }

  const displayName = state.currentUser.display_name || state.currentUser.username;
  els.currentUserName.textContent = displayName;
  els.currentUserRole.innerHTML = `<span class="${roleBadgeClass(state.currentUser.role)}">${state.currentUser.role}</span>`;

  if (canEdit()) {
    els.editHint.textContent = '可编辑';
    els.editHint.style.background = 'var(--success)';
    els.editHint.style.color = '#04160c';
  } else {
    els.editHint.textContent = '只读';
    els.editHint.style.background = 'var(--warn)';
    els.editHint.style.color = '#241704';
  }

  els.readonlyBanner.classList.toggle('hidden', !isViewer());
  [els.plantForm, els.potForm, els.bindingForm].forEach((form) => setFormEnabled(form, canEdit()));
  els.usersSection.classList.toggle('hidden', !isAdmin());
  els.userNavLink.classList.toggle('hidden', !isAdmin());
}

function renderOverview() {
  const data = state.overview || {};
  els.overviewDevices.textContent = formatValue(data.total_devices, '0');
  els.overviewSoil.textContent = formatValue(data.soil_devices, '0');
  els.overviewAir.textContent = formatValue(data.air_devices, '0');
  els.overviewPlants.textContent = formatValue(data.total_plants, '0');
  els.overviewStress.textContent = formatValue(data.stress_plants, '0');
  els.overviewControl.textContent = formatValue(data.control_plants, '0');
}

function getFilteredDevices() {
  const typeFilter = els.deviceTypeFilter.value;
  const keyword = els.deviceSearchInput.value.trim().toLowerCase();

  return state.devices.filter((device) => {
    const matchesType = !typeFilter || device.device_type === typeFilter;
    const matchesKeyword = !keyword || [
      device.device_code,
      device.gateway_code,
      device.plant_code,
      device.pot_code,
      device.group_type,
    ].some((value) => String(value || '').toLowerCase().includes(keyword));
    return matchesType && matchesKeyword;
  });
}

function renderDevices() {
  const rows = getFilteredDevices();
  els.deviceTableBody.innerHTML = rows.map((device) => `
    <tr data-device-code="${device.device_code}" class="${device.device_code === state.selectedDeviceCode ? 'active' : ''}">
      <td>${formatValue(device.device_code)}</td>
      <td>${formatValue(device.device_type)}</td>
      <td>${formatValue(device.gateway_code)}</td>
      <td>${formatValue(device.slave_addr)}</td>
      <td>${formatValue(device.plant_code)}</td>
      <td><span class="${device.group_type === 'stress' ? 'badge stress' : device.group_type === 'control' ? 'badge control' : 'badge viewer'}">${formatValue(device.group_type, '未分组')}</span></td>
      <td>${formatDate(device.last_collect_time)}</td>
    </tr>
  `).join('');

  Array.from(els.deviceTableBody.querySelectorAll('tr')).forEach((row) => {
    row.addEventListener('click', () => {
      state.selectedDeviceCode = row.dataset.deviceCode;
      renderDevices();
      loadSelectedDevice().catch((error) => showToast(error.message, 'fail'));
    });
  });
}

function renderSelectedDevice() {
  const device = state.devices.find((item) => item.device_code === state.selectedDeviceCode);
  if (!device) {
    els.selectedDeviceTitle.textContent = '未选择设备';
    els.selectedDeviceMeta.innerHTML = '';
    els.latestMetrics.innerHTML = '';
    els.historyPreviewBody.innerHTML = '';
    return;
  }

  els.selectedDeviceTitle.textContent = device.device_code;
  const metaEntries = [
    ['设备类型', device.device_type],
    ['网关编号', device.gateway_code],
    ['从站地址', device.slave_addr],
    ['MQTT 主题', device.mqtt_topic],
    ['植株编号', device.plant_code],
    ['盆编号', device.pot_code],
    ['实验分组', device.group_type],
    ['最近采集', formatDate(device.last_collect_time)],
  ];

  els.selectedDeviceMeta.innerHTML = metaEntries.map(([label, value]) => `
    <div class="meta-item">
      <span>${label}</span>
      <strong>${formatValue(value)}</strong>
    </div>
  `).join('');

  const latest = state.selectedLatest || {};
  const metricDefs = device.device_type === 'air_4in1'
    ? [
      ['空气温度', latest.temperature, '°C'],
      ['空气湿度', latest.humidity, '%'],
      ['二氧化碳', latest.co2, 'ppm'],
      ['光照强度', latest.lux, 'lux'],
    ]
    : [
      ['土壤温度', latest.temperature, '°C'],
      ['土壤湿度', latest.humidity, '%'],
      ['土壤 pH', latest.ph, ''],
      ['土壤电导率', latest.ec, 'uS/cm'],
    ];

  els.latestMetrics.innerHTML = metricDefs.map(([label, value, unit]) => `
    <div class="mini-metric">
      <span>${label}</span>
      <strong>${formatValue(value)}${unit ? ` <small>${unit}</small>` : ''}</strong>
    </div>
  `).join('');

  els.historyPreviewBody.innerHTML = state.selectedHistory.map((item) => `
    <tr>
      <td>${formatDate(item.collected_at)}</td>
      <td>${formatValue(item.temperature)}</td>
      <td>${formatValue(item.humidity)}</td>
      <td>${device.device_type === 'air_4in1' ? formatValue(item.co2) : formatValue(item.ph)}</td>
      <td>${device.device_type === 'air_4in1' ? formatValue(item.lux) : formatValue(item.ec)}</td>
    </tr>
  `).join('');
}

function renderPlants() {
  els.plantCountLabel.textContent = `${state.plants.length} 条`;
  els.plantTableBody.innerHTML = state.plants.map((item) => `
    <tr>
      <td>${formatValue(item.plant_code)}</td>
      <td>${formatValue(item.pot_code)}</td>
      <td><span class="${item.group_type === 'stress' ? 'badge stress' : item.group_type === 'control' ? 'badge control' : 'badge viewer'}">${formatValue(item.group_type, '未分组')}</span></td>
      <td>${formatValue(item.device_code)}</td>
    </tr>
  `).join('');
}

function renderPots() {
  els.potCountLabel.textContent = `${state.pots.length} 条`;
  els.potTableBody.innerHTML = state.pots.map((item) => `
    <tr>
      <td>${formatValue(item.pot_code)}</td>
      <td>${formatValue(item.zone_code)}</td>
      <td>${formatValue(item.position_code)}</td>
      <td>${formatValue(item.remark)}</td>
    </tr>
  `).join('');
}

function renderBindings() {
  els.bindingCountLabel.textContent = `${state.bindings.length} 条`;
  els.bindingTableBody.innerHTML = state.bindings.map((item) => `
    <tr>
      <td>${formatValue(item.device_code)}</td>
      <td>${formatValue(item.device_type)}</td>
      <td>${formatValue(item.plant_code)}</td>
      <td>${formatValue(item.pot_code)}</td>
      <td><span class="${item.group_type === 'stress' ? 'badge stress' : item.group_type === 'control' ? 'badge control' : 'badge viewer'}">${formatValue(item.group_type, '未分组')}</span></td>
      <td>${formatDate(item.start_time)}</td>
    </tr>
  `).join('');
}

function renderUsers() {
  if (!isAdmin()) {
    els.userCountLabel.textContent = '0 条';
    els.userTableBody.innerHTML = '';
    return;
  }

  els.userCountLabel.textContent = `${state.users.length} 条`;
  els.userTableBody.innerHTML = state.users.map((user) => `
    <tr>
      <td>${formatValue(user.username)}</td>
      <td>${formatValue(user.display_name)}</td>
      <td><span class="${roleBadgeClass(user.role)}">${formatValue(user.role)}</span></td>
      <td><span class="${user.is_active ? 'badge editor' : 'badge disabled'}">${user.is_active ? '启用' : '停用'}</span></td>
      <td>${formatDate(user.last_login_at)}</td>
      <td>
        <div class="user-actions">
          ${canToggleUser(user) ? `<button class="${user.is_active ? 'ghost-btn user-toggle-btn warn' : 'ghost-btn user-toggle-btn success'}" type="button" data-username="${user.username}" data-next-active="${user.is_active ? '0' : '1'}">${user.is_active ? '停用' : '启用'}</button>` : ''}
          ${canDeleteUser(user) ? `<button class="danger-btn user-delete-btn" type="button" data-username="${user.username}">删除</button>` : '-'}
        </div>
      </td>
    </tr>
  `).join('');

  Array.from(document.querySelectorAll('.user-toggle-btn')).forEach((button) => {
    button.addEventListener('click', async () => {
      const username = button.dataset.username;
      const nextActive = button.dataset.nextActive === '1' ? 1 : 0;
      if (!username) return;

      const actionLabel = nextActive === 1 ? '启用' : '停用';
      const confirmed = window.confirm(`确认${actionLabel}账号 ${username} 吗？${nextActive === 0 ? '停用后该账号会立即退出所有登录状态。' : ''}`);
      if (!confirmed) return;

      try {
        await apiPost('/api/auth/users/toggle-active', { username, is_active: nextActive }, true);
        showToast(`已${actionLabel}账号 ${username}`);
        await loadAll();
      } catch (error) {
        showToast(error.message, 'fail');
      }
    });
  });

  Array.from(document.querySelectorAll('.user-delete-btn')).forEach((button) => {
    button.addEventListener('click', async () => {
      const username = button.dataset.username;
      if (!username) return;
      const confirmed = window.confirm(`确认删除账号 ${username} 吗？删除后该账号和登录会话会被清除。`);
      if (!confirmed) return;

      try {
        await apiPost('/api/auth/users/delete', { username }, true);
        showToast(`已删除账号 ${username}`);
        await loadAll();
      } catch (error) {
        showToast(error.message, 'fail');
      }
    });
  });
}

async function loadSelectedDevice() {
  if (!state.selectedDeviceCode) {
    renderSelectedDevice();
    return;
  }

  const [latestRes, historyRes] = await Promise.all([
    apiGet(`/api/sensor/latest?device_code=${encodeURIComponent(state.selectedDeviceCode)}`),
    apiGet(`/api/sensor/history?device_code=${encodeURIComponent(state.selectedDeviceCode)}&limit=8`),
  ]);

  state.selectedLatest = latestRes.data;
  state.selectedHistory = historyRes.data || [];
  renderSelectedDevice();
}

async function refreshCurrentUser() {
  const meRes = await apiGet('/api/auth/me', true);
  state.currentUser = meRes.data;
  renderAuthState();
}

async function loadAll() {
  const requests = [
    apiGet('/api/health'),
    apiGet('/api/dashboard/overview'),
    apiGet('/api/device/list'),
    apiGet('/api/plants'),
    apiGet('/api/pots'),
    apiGet('/api/bindings/current'),
  ];

  if (isAdmin()) {
    requests.push(apiGet('/api/auth/users', true));
  }

  const [healthRes, overviewRes, devicesRes, plantsRes, potsRes, bindingsRes, usersRes] = await Promise.all(requests);

  state.overview = overviewRes.data;
  state.devices = devicesRes.data || [];
  state.plants = plantsRes.data || [];
  state.pots = potsRes.data || [];
  state.bindings = bindingsRes.data || [];
  state.users = usersRes?.data || [];

  els.healthBadge.textContent = healthRes.code === 0 ? '服务正常' : '服务异常';
  els.healthBadge.className = `status-pill ${healthRes.code === 0 ? 'ok' : 'fail'}`;
  els.lastSync.textContent = new Date().toLocaleString('zh-CN', { hour12: false });

  if (!state.selectedDeviceCode && state.devices.length) {
    state.selectedDeviceCode = state.devices[0].device_code;
  } else if (state.selectedDeviceCode && !state.devices.some((item) => item.device_code === state.selectedDeviceCode)) {
    state.selectedDeviceCode = state.devices[0]?.device_code || null;
  }

  renderOverview();
  renderDevices();
  renderPlants();
  renderPots();
  renderBindings();
  renderUsers();
  await loadSelectedDevice();
}

async function handleLogin(event) {
  event.preventDefault();
  const payload = formToObject(els.loginForm);

  try {
    const loginRes = await apiPost('/api/auth/login', payload);
    setToken(loginRes.data.access_token);
    state.currentUser = loginRes.data.user;
    els.authError.classList.add('hidden');
    renderAuthState();
    await loadAll();
    showToast(`欢迎回来，${state.currentUser.display_name || state.currentUser.username}`);
  } catch (error) {
    els.authError.textContent = error.message;
    els.authError.classList.remove('hidden');
  }
}

async function handleLogout() {
  try {
    if (state.token) {
      await apiPost('/api/auth/logout', {}, true);
    }
  } catch (error) {
    // ignore remote logout cleanup errors
  } finally {
    setToken('');
    state.currentUser = null;
    state.users = [];
    renderAuthState();
    showToast('已退出登录');
  }
}

async function handleProtectedSubmit(event, path, labelKey, prefix) {
  event.preventDefault();
  const payload = formToObject(event.currentTarget);
  await apiPost(path, payload, true);
  showToast(`已保存${prefix} ${payload[labelKey]}`);
  event.currentTarget.reset();
  await loadAll();
}

async function handlePasswordSubmit(event) {
  event.preventDefault();
  const payload = formToObject(event.currentTarget);
  await apiPost('/api/auth/change-password', payload, true);
  event.currentTarget.reset();
  setToken('');
  state.currentUser = null;
  renderAuthState();
  showToast('密码已更新，请重新登录');
}

function setupReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.14 });

  document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
}

function initEvents() {
  els.loginForm.addEventListener('submit', (event) => handleLogin(event));
  els.refreshAllBtn.addEventListener('click', () => {
    loadAll()
      .then(() => showToast('数据已刷新'))
      .catch((error) => showToast(error.message, 'fail'));
  });
  els.refreshSelectedBtn.addEventListener('click', () => {
    loadSelectedDevice()
      .then(() => showToast('所选设备已刷新'))
      .catch((error) => showToast(error.message, 'fail'));
  });
  els.logoutBtn.addEventListener('click', () => handleLogout());
  els.deviceTypeFilter.addEventListener('change', renderDevices);
  els.deviceSearchInput.addEventListener('input', renderDevices);
  els.plantForm.addEventListener('submit', (event) => handleProtectedSubmit(event, '/api/plants/upsert', 'plant_code', '植株').catch((error) => showToast(error.message, 'fail')));
  els.potForm.addEventListener('submit', (event) => handleProtectedSubmit(event, '/api/pots/upsert', 'pot_code', '盆位').catch((error) => showToast(error.message, 'fail')));
  els.bindingForm.addEventListener('submit', (event) => handleProtectedSubmit(event, '/api/bindings/assign', 'device_code', '绑定').catch((error) => showToast(error.message, 'fail')));
  els.userForm.addEventListener('submit', (event) => handleProtectedSubmit(event, '/api/auth/users/upsert', 'username', '账号').catch((error) => showToast(error.message, 'fail')));
  els.passwordForm.addEventListener('submit', (event) => handlePasswordSubmit(event).catch((error) => showToast(error.message, 'fail')));
  els.btnExportCsv.addEventListener('click', () => window.open(buildExportQuery('csv'), '_blank'));
  els.btnExportExcel.addEventListener('click', () => window.open(buildExportQuery('excel'), '_blank'));
}

async function restoreLogin() {
  if (!state.token) return;
  try {
    await refreshCurrentUser();
    await loadAll();
  } catch (error) {
    setToken('');
    state.currentUser = null;
    renderAuthState();
  }
}

async function init() {
  setupReveal();
  initEvents();
  renderAuthState();
  await restoreLogin();
}

init();
