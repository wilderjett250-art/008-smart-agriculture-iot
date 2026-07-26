<template>
  <div class="leaf-shell">
    <aside class="leaf-side">
      <div class="brand-card">
        <h1>叶片测量台</h1>
        <p>单株观测、像素换算、叶长叶宽叶面积记录。</p>
      </div>

      <section class="panel-card">
        <div class="panel-head">
          <h2>观测设置</h2>
          <router-link class="mini-link" to="/">返回监测主页</router-link>
        </div>

        <label class="field">
          <span>植株编号</span>
          <select v-model="sessionForm.plant_code">
            <option value="">请选择植株</option>
            <option v-for="plant in plants" :key="plant.plant_code" :value="plant.plant_code">
              {{ plant.plant_code }} | {{ plant.pot_code || '--' }} | {{ plant.group_type || '--' }}
            </option>
          </select>
        </label>

        <label class="field">
          <span>观测时间</span>
          <input v-model="sessionForm.observed_at" type="datetime-local">
        </label>

        <label class="field">
          <span>记录人</span>
          <input v-model.trim="sessionForm.operator_name" type="text" placeholder="例如：实验员A">
        </label>

        <label class="field">
          <span>备注</span>
          <textarea v-model.trim="sessionForm.remark" rows="3" placeholder="记录批次说明或现场情况"></textarea>
        </label>

        <div class="rule-box">
          <strong>采样规则</strong>
          <p>最多 8 片叶，只记录完全展开的功能叶。部位为上 / 中 / 下。</p>
        </div>

        <div class="action-row">
          <button class="primary-btn" :disabled="savingSession" @click="saveSession">
            {{ currentDetail ? '保存当前观测' : '新建观测' }}
          </button>
          <button class="ghost-btn" @click="resetSessionForm">清空</button>
        </div>
      </section>

      <section class="panel-card">
        <div class="panel-head">
          <h2>最近观测</h2>
          <button class="text-btn" @click="loadSessions">刷新</button>
        </div>
        <div class="session-list">
          <button
            v-for="session in recentSessions"
            :key="session.id"
            :class="['session-item', currentDetail?.session?.id === session.id ? 'active' : '']"
            @click="loadSessionDetail(session.id)"
          >
            <strong>{{ session.plant_code }}</strong>
            <span>{{ session.pot_code || '--' }}</span>
            <span>{{ formatDateTime(session.observed_at) }}</span>
          </button>
          <div v-if="!recentSessions.length" class="empty-hint">暂无叶片观测记录</div>
        </div>
      </section>
    </aside>

    <main class="leaf-main">
      <section class="hero-card">
        <div class="hero-copy">
          <h2>叶片观测工作区</h2>
          <p>先新建或选中一个观测批次，再选择叶片编号上传图片。点击图片上的两点作为标尺长度，系统按像素换算叶长、叶宽与叶面积。</p>
        </div>

        <div class="hero-stats">
          <div class="stat-chip">
            <span>当前植株</span>
            <strong>{{ currentDetail?.session?.plant_code || '--' }}</strong>
          </div>
          <div class="stat-chip">
            <span>盆号</span>
            <strong>{{ currentDetail?.session?.pot_code || '--' }}</strong>
          </div>
          <div class="stat-chip">
            <span>已测叶片</span>
            <strong>{{ currentDetail?.summary?.measured_leaf_count || 0 }}</strong>
          </div>
          <div class="stat-chip">
            <span>图片数量</span>
            <strong>{{ currentDetail?.summary?.total_images || 0 }}</strong>
          </div>
        </div>
      </section>

      <section v-if="currentDetail" class="summary-grid">
        <article class="metric-card">
          <span>平均叶长</span>
          <strong>{{ formatMetric(currentDetail.summary?.avg_length_mm, 'mm') }}</strong>
        </article>
        <article class="metric-card">
          <span>平均叶宽</span>
          <strong>{{ formatMetric(currentDetail.summary?.avg_width_mm, 'mm') }}</strong>
        </article>
        <article class="metric-card">
          <span>平均叶面积</span>
          <strong>{{ formatMetric(currentDetail.summary?.avg_area_mm2, 'mm²') }}</strong>
        </article>
      </section>

      <section class="content-grid">
        <section class="panel-card">
          <div class="panel-head">
            <h2>叶片列表</h2>
            <span class="mini-tag">最多 8 片</span>
          </div>
          <div class="leaf-grid">
            <button
              v-for="leaf in leafCards"
              :key="leaf.leaf_index"
              :class="['leaf-card', selectedLeafIndex === leaf.leaf_index ? 'active' : '', leaf.accepted_image_count > 0 ? 'done' : '']"
              @click="selectLeaf(leaf.leaf_index)"
            >
              <div class="leaf-title">
                <strong>第 {{ leaf.leaf_index }} 片</strong>
                <span>{{ positionLabel(leaf.canopy_position) }}</span>
              </div>
              <div class="leaf-values">
                <span>图 {{ leaf.image_count || 0 }}</span>
                <span>{{ formatMetric(leaf.avg_length_mm, 'mm') }}</span>
                <span>{{ formatMetric(leaf.avg_area_mm2, 'mm²') }}</span>
              </div>
            </button>
          </div>
        </section>

        <section class="panel-card">
          <div class="panel-head">
            <h2>当前叶片录入</h2>
            <span class="mini-tag">第 {{ selectedLeafIndex }} 片</span>
          </div>

          <div v-if="!currentDetail" class="empty-hint strong">先新建或选中一个观测批次</div>

          <template v-else>
            <div class="upload-toolbar">
              <label class="field compact">
                <span>叶片部位</span>
                <select v-model="uploadDraft.canopy_position">
                  <option value="upper">上部</option>
                  <option value="middle">中部</option>
                  <option value="lower">下部</option>
                </select>
              </label>

              <label class="field compact">
                <span>标尺长度(mm)</span>
                <input v-model.number="uploadDraft.calibration_length_mm" type="number" min="1" step="0.1">
              </label>

              <label class="file-btn">
                <input type="file" accept="image/*" @change="onSelectFile">
                选择图片
              </label>

              <label class="file-btn camera">
                <input type="file" accept="image/*" capture="environment" @change="onSelectFile">
                打开相机
              </label>

              <button class="ghost-btn" :disabled="!uploadDraft.previewUrl" @click="clearDraft">移除当前图片</button>
            </div>

            <div class="mobile-hint">
              手机上可直接点“打开相机”拍照，建议把叶片和标尺放在同一平面内，再点击标尺两端。
            </div>

            <div v-if="uploadDraft.previewUrl" class="preview-panel">
              <div class="preview-note">
                <span>点击图中标尺两端</span>
                <strong>{{ uploadDraft.points.length }}/2</strong>
              </div>

              <div class="preview-stage">
                <img
                  ref="draftImage"
                  :src="uploadDraft.previewUrl"
                  alt="叶片预览"
                  @click="onPreviewClick"
                >
                <button
                  v-for="(point, index) in uploadDraft.points"
                  :key="`${point.x}-${point.y}-${index}`"
                  class="point-dot"
                  :style="{ left: `${point.px}%`, top: `${point.py}%` }"
                  type="button"
                >
                  {{ index + 1 }}
                </button>
              </div>

              <div class="preview-actions">
                <button class="ghost-btn" :disabled="!uploadDraft.points.length" @click="clearPoints">重选标尺点</button>
                <button
                  class="primary-btn"
                  :disabled="uploading || uploadDraft.points.length !== 2 || !uploadDraft.file"
                  @click="submitLeafImage"
                >
                  {{ uploading ? '保存中...' : '分析并保存' }}
                </button>
              </div>
            </div>

            <div v-else class="empty-hint">选中图片后，在预览图上点击两点作为已知长度标尺。</div>

            <div v-if="uploadError" class="error-box">{{ uploadError }}</div>
          </template>
        </section>
      </section>

      <section v-if="currentDetail" class="panel-card">
        <div class="panel-head">
          <h2>叶片明细</h2>
          <span class="mini-tag">当前批次</span>
        </div>

        <div v-for="leaf in leafCards" :key="`detail-${leaf.leaf_index}`" class="detail-block">
          <div class="detail-head">
            <div>
              <h3>第 {{ leaf.leaf_index }} 片</h3>
              <p>{{ positionLabel(leaf.canopy_position) }} | {{ leaf.accepted_image_count || 0 }} 张有效图片</p>
            </div>
            <div class="detail-metrics">
              <span>{{ formatMetric(leaf.avg_length_mm, 'mm') }}</span>
              <span>{{ formatMetric(leaf.avg_width_mm, 'mm') }}</span>
              <span>{{ formatMetric(leaf.avg_area_mm2, 'mm²') }}</span>
            </div>
          </div>

          <div v-if="leaf.images?.length" class="image-grid">
            <article v-for="image in leaf.images" :key="image.id" class="image-card">
              <img :src="image.overlay_url || image.original_url" alt="叶片测量图">
              <div class="image-meta">
                <span>叶长 {{ formatMetric(image.leaf_length_mm, 'mm') }}</span>
                <span>叶宽 {{ formatMetric(image.leaf_width_mm, 'mm') }}</span>
                <span>面积 {{ formatMetric(image.leaf_area_mm2, 'mm²') }}</span>
                <span>{{ formatDateTime(image.created_at) }}</span>
              </div>
              <button class="danger-btn" @click="deleteLeafImage(image.id)">删除图片</button>
            </article>
          </div>
          <div v-else class="empty-hint">这一片叶还没有图片记录</div>
        </div>
      </section>
    </main>
  </div>
</template>

<script>
import axios from 'axios';

const leafApi = axios.create({
  baseURL: 'api',
});

function currentDatetimeLocal() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export default {
  name: 'LeafMeasurePage',
  data() {
    return {
      plants: [],
      recentSessions: [],
      currentDetail: null,
      savingSession: false,
      uploading: false,
      selectedLeafIndex: 1,
      uploadError: '',
      sessionForm: {
        plant_code: '',
        observed_at: currentDatetimeLocal(),
        operator_name: '',
        remark: '',
      },
      uploadDraft: {
        file: null,
        previewUrl: '',
        canopy_position: 'upper',
        calibration_length_mm: 50,
        points: [],
      },
    };
  },
  computed: {
    leafCards() {
      const leaves = this.currentDetail?.leaves || [];
      const byIndex = new Map(leaves.map((item) => [Number(item.leaf_index), item]));
      const cards = [];
      for (let index = 1; index <= 8; index += 1) {
        cards.push({
          leaf_index: index,
          canopy_position: byIndex.get(index)?.canopy_position || 'upper',
          avg_length_mm: byIndex.get(index)?.avg_length_mm || null,
          avg_width_mm: byIndex.get(index)?.avg_width_mm || null,
          avg_area_mm2: byIndex.get(index)?.avg_area_mm2 || null,
          image_count: byIndex.get(index)?.image_count || 0,
          accepted_image_count: byIndex.get(index)?.accepted_image_count || 0,
          images: byIndex.get(index)?.images || [],
        });
      }
      return cards;
    },
  },
  async mounted() {
    await Promise.all([this.loadPlants(), this.loadSessions()]);
  },
  beforeUnmount() {
    this.revokeDraftPreview();
  },
  methods: {
    async loadPlants() {
      const { data } = await leafApi.get('/plants');
      this.plants = Array.isArray(data.data) ? data.data : [];
    },
    async loadSessions() {
      const { data } = await leafApi.get('/leaf/sessions', { params: { limit: 20 } });
      this.recentSessions = Array.isArray(data.data) ? data.data : [];
    },
    async loadSessionDetail(sessionId) {
      const { data } = await leafApi.get('/leaf/session/detail', { params: { session_id: sessionId } });
      this.currentDetail = data.data || null;
      if (this.currentDetail?.session) {
        this.sessionForm = {
          plant_code: this.currentDetail.session.plant_code || '',
          observed_at: this.toDatetimeLocal(this.currentDetail.session.observed_at),
          operator_name: this.currentDetail.session.operator_name || '',
          remark: this.currentDetail.session.remark || '',
        };
      }
      this.selectLeaf(this.selectedLeafIndex);
    },
    async saveSession() {
      if (!this.sessionForm.plant_code) {
        this.uploadError = '请先选择植株编号。';
        return;
      }
      this.savingSession = true;
      this.uploadError = '';
      try {
        const payload = {
          session_id: this.currentDetail?.session?.id || null,
          plant_code: this.sessionForm.plant_code,
          observed_at: this.sessionForm.observed_at ? this.sessionForm.observed_at.replace('T', ' ') + ':00' : null,
          operator_name: this.sessionForm.operator_name,
          remark: this.sessionForm.remark,
          leaf_limit: 8,
        };
        const { data } = await leafApi.post('/leaf/session/upsert', payload);
        this.currentDetail = data.data || null;
        await this.loadSessions();
      } catch (error) {
        this.uploadError = error?.response?.data?.message || '保存观测批次失败。';
      } finally {
        this.savingSession = false;
      }
    },
    resetSessionForm() {
      this.currentDetail = null;
      this.sessionForm = {
        plant_code: '',
        observed_at: currentDatetimeLocal(),
        operator_name: '',
        remark: '',
      };
      this.selectedLeafIndex = 1;
      this.uploadError = '';
      this.clearDraft();
    },
    selectLeaf(index) {
      this.selectedLeafIndex = index;
      const currentLeaf = this.leafCards.find((item) => item.leaf_index === index);
      this.uploadDraft.canopy_position = currentLeaf?.canopy_position || 'upper';
      this.clearDraft();
      this.uploadError = '';
    },
    onSelectFile(event) {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      this.revokeDraftPreview();
      this.uploadDraft.file = file;
      this.uploadDraft.previewUrl = URL.createObjectURL(file);
      this.uploadDraft.points = [];
    },
    onPreviewClick(event) {
      const image = event.currentTarget;
      const rect = image.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      const px = (offsetX / rect.width) * 100;
      const py = (offsetY / rect.height) * 100;
      const x = (offsetX / rect.width) * image.naturalWidth;
      const y = (offsetY / rect.height) * image.naturalHeight;
      const nextPoints = this.uploadDraft.points.length >= 2 ? [] : [...this.uploadDraft.points];
      nextPoints.push({ x, y, px, py });
      this.uploadDraft.points = nextPoints;
    },
    clearPoints() {
      this.uploadDraft.points = [];
    },
    clearDraft() {
      this.revokeDraftPreview();
      this.uploadDraft.file = null;
      this.uploadDraft.previewUrl = '';
      this.uploadDraft.points = [];
    },
    revokeDraftPreview() {
      if (this.uploadDraft.previewUrl) {
        URL.revokeObjectURL(this.uploadDraft.previewUrl);
      }
    },
    async submitLeafImage() {
      if (!this.currentDetail?.session?.id) {
        this.uploadError = '请先保存观测批次。';
        return;
      }
      if (!this.uploadDraft.file || this.uploadDraft.points.length !== 2) {
        this.uploadError = '请先选择图片并完成两点标尺。';
        return;
      }
      this.uploading = true;
      this.uploadError = '';
      try {
        const formData = new FormData();
        formData.append('image', this.uploadDraft.file);
        formData.append('session_id', this.currentDetail.session.id);
        formData.append('leaf_index', this.selectedLeafIndex);
        formData.append('canopy_position', this.uploadDraft.canopy_position);
        formData.append('calibration_length_mm', this.uploadDraft.calibration_length_mm);
        formData.append('calibration_x1', this.uploadDraft.points[0].x);
        formData.append('calibration_y1', this.uploadDraft.points[0].y);
        formData.append('calibration_x2', this.uploadDraft.points[1].x);
        formData.append('calibration_y2', this.uploadDraft.points[1].y);

        const { data } = await leafApi.post('/leaf/image/analyze', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        this.currentDetail = data.data || null;
        this.clearDraft();
        await this.loadSessions();
      } catch (error) {
        this.uploadError = error?.response?.data?.message || '图片分析失败。';
      } finally {
        this.uploading = false;
      }
    },
    async deleteLeafImage(imageId) {
      try {
        const { data } = await leafApi.post('/leaf/image/delete', { image_id: imageId });
        this.currentDetail = data.data || null;
        await this.loadSessions();
      } catch (error) {
        this.uploadError = error?.response?.data?.message || '删除图片失败。';
      }
    },
    positionLabel(value) {
      if (value === 'upper') return '上部';
      if (value === 'middle') return '中部';
      if (value === 'lower') return '下部';
      return '未设置';
    },
    formatMetric(value, unit) {
      if (value === null || value === undefined || value === '') return '--';
      return `${Number(value).toFixed(2)} ${unit}`;
    },
    formatDateTime(value) {
      if (!value) return '--';
      return String(value).replace('T', ' ').replace('.000Z', '');
    },
    toDatetimeLocal(value) {
      if (!value) return currentDatetimeLocal();
      const normalized = String(value).replace(' ', 'T');
      return normalized.slice(0, 16);
    },
  },
};
</script>

<style scoped>
.leaf-shell { min-height: 100vh; display: grid; grid-template-columns: 320px minmax(0, 1fr); gap: 18px; padding: 18px; background: radial-gradient(circle at top, rgba(75, 186, 255, 0.18), transparent 32%), linear-gradient(180deg, #06111c, #08172a 52%, #06111c); color: #ecf7ff; }
.leaf-side { display: flex; flex-direction: column; gap: 18px; }
.leaf-main { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
.brand-card, .panel-card, .hero-card, .metric-card { border: 1px solid rgba(112, 222, 255, 0.18); border-radius: 18px; background: linear-gradient(180deg, rgba(8, 22, 36, 0.96), rgba(11, 23, 39, 0.94)); box-shadow: 0 14px 34px rgba(0, 0, 0, 0.28); }
.brand-card, .panel-card, .hero-card { padding: 18px; }
.brand-card h1, .hero-copy h2, .panel-head h2, .detail-head h3 { margin: 0; }
.brand-card p, .hero-copy p, .rule-box p, .detail-head p { margin: 8px 0 0; color: rgba(222, 241, 255, 0.78); line-height: 1.6; }
.panel-head, .detail-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.mini-link, .text-btn { color: #83ddff; text-decoration: none; background: none; border: 0; cursor: pointer; padding: 0; }
.field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
.field span { color: rgba(221, 241, 255, 0.86); font-size: 13px; }
.field input, .field select, .field textarea { width: 100%; border: 1px solid rgba(128, 223, 255, 0.2); border-radius: 12px; background: rgba(4, 14, 24, 0.88); color: #f1f8ff; padding: 12px 14px; outline: none; }
.field textarea { resize: vertical; min-height: 90px; }
.rule-box { padding: 14px; border-radius: 14px; background: rgba(10, 33, 50, 0.78); border: 1px solid rgba(126, 220, 255, 0.12); }
.action-row, .preview-actions, .upload-toolbar { display: flex; flex-wrap: wrap; gap: 10px; }
.primary-btn, .ghost-btn, .danger-btn, .file-btn { border: 0; border-radius: 12px; padding: 11px 16px; font-weight: 700; cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease; }
.primary-btn { background: linear-gradient(135deg, #82eaff, #4ea9ff); color: #041b2c; box-shadow: 0 12px 24px rgba(68, 173, 255, 0.2); }
.ghost-btn, .file-btn { background: rgba(10, 34, 52, 0.96); color: #dff4ff; border: 1px solid rgba(135, 225, 255, 0.2); }
.file-btn.camera { background: linear-gradient(135deg, rgba(58, 213, 255, 0.28), rgba(104, 247, 183, 0.22)); color: #effcff; }
.danger-btn { background: rgba(77, 18, 24, 0.92); color: #ffd7df; border: 1px solid rgba(255, 144, 167, 0.22); }
.primary-btn:disabled, .ghost-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; box-shadow: none; }
.session-list { display: flex; flex-direction: column; gap: 10px; max-height: 340px; overflow-y: auto; }
.session-item { width: 100%; text-align: left; display: flex; flex-direction: column; gap: 4px; border-radius: 14px; border: 1px solid rgba(120, 221, 255, 0.12); background: rgba(8, 23, 36, 0.96); color: #edf8ff; padding: 12px; cursor: pointer; }
.session-item.active { border-color: rgba(102, 223, 255, 0.42); background: rgba(18, 43, 63, 0.96); }
.hero-card { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.hero-stats, .summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.stat-chip, .metric-card { padding: 16px; }
.stat-chip { border-radius: 14px; background: rgba(10, 34, 52, 0.9); border: 1px solid rgba(122, 220, 255, 0.12); display: flex; flex-direction: column; gap: 6px; }
.stat-chip span, .metric-card span, .image-meta span, .leaf-values span { color: rgba(223, 241, 255, 0.72); font-size: 12px; }
.stat-chip strong, .metric-card strong { font-size: 24px; }
.content-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(380px, 520px); gap: 18px; }
.leaf-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.leaf-card { border: 1px solid rgba(126, 222, 255, 0.14); border-radius: 14px; background: rgba(9, 24, 40, 0.96); color: #eef8ff; text-align: left; padding: 14px; cursor: pointer; }
.leaf-card.active { border-color: rgba(121, 225, 255, 0.5); box-shadow: inset 0 0 0 1px rgba(121, 225, 255, 0.22); }
.leaf-card.done { background: linear-gradient(180deg, rgba(10, 36, 53, 0.96), rgba(11, 28, 43, 0.96)); }
.leaf-title, .leaf-values, .detail-metrics, .image-meta { display: flex; flex-wrap: wrap; gap: 10px; }
.compact { min-width: 150px; flex: 1 1 160px; margin-bottom: 0; }
.file-btn { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; position: relative; overflow: hidden; }
.file-btn input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.mobile-hint { margin-top: 10px; padding: 10px 12px; border-radius: 12px; background: rgba(9, 31, 48, 0.78); border: 1px solid rgba(120, 221, 255, 0.1); color: rgba(223, 241, 255, 0.78); font-size: 13px; line-height: 1.6; }
.preview-panel { display: flex; flex-direction: column; gap: 12px; }
.preview-note { display: flex; align-items: center; justify-content: space-between; color: rgba(222, 241, 255, 0.8); }
.preview-stage { position: relative; border-radius: 16px; overflow: hidden; background: rgba(4, 14, 24, 0.86); border: 1px solid rgba(118, 221, 255, 0.14); min-height: 280px; display: flex; align-items: center; justify-content: center; }
.preview-stage img { width: 100%; max-height: 520px; object-fit: contain; cursor: crosshair; display: block; }
.point-dot { position: absolute; transform: translate(-50%, -50%); width: 28px; height: 28px; border-radius: 999px; border: 0; background: #6be9ff; color: #02253b; font-weight: 800; }
.detail-block { border-top: 1px solid rgba(120, 221, 255, 0.12); padding-top: 16px; margin-top: 16px; }
.image-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.image-card { border-radius: 16px; overflow: hidden; border: 1px solid rgba(123, 221, 255, 0.12); background: rgba(8, 23, 36, 0.96); display: flex; flex-direction: column; }
.image-card img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; background: #03111d; }
.image-meta { padding: 12px; flex-direction: column; }
.mini-tag { display: inline-flex; align-items: center; padding: 6px 10px; border-radius: 999px; font-size: 12px; color: #8de5ff; background: rgba(9, 35, 56, 0.85); border: 1px solid rgba(112, 223, 255, 0.14); }
.empty-hint { padding: 18px; border-radius: 14px; background: rgba(8, 23, 36, 0.76); color: rgba(220, 241, 255, 0.7); text-align: center; }
.empty-hint.strong { font-weight: 700; }
.error-box { margin-top: 12px; padding: 12px 14px; border-radius: 14px; background: rgba(80, 18, 29, 0.92); border: 1px solid rgba(255, 143, 162, 0.2); color: #ffd7df; }

@media (max-width: 1280px) {
  .leaf-shell { grid-template-columns: 1fr; }
  .hero-card, .content-grid { grid-template-columns: 1fr; display: grid; }
}

@media (max-width: 900px) {
  .hero-stats, .summary-grid, .leaf-grid, .content-grid { grid-template-columns: 1fr; }
  .leaf-shell { padding: 12px; gap: 12px; }
  .upload-toolbar { display: grid; grid-template-columns: 1fr 1fr; }
  .upload-toolbar .field.compact { min-width: 0; }
  .file-btn, .ghost-btn, .primary-btn { width: 100%; justify-content: center; }
  .preview-stage { min-height: 220px; }
  .preview-stage img { max-height: 60vh; }
  .detail-head { flex-direction: column; align-items: flex-start; }
  .detail-metrics { width: 100%; display: grid; grid-template-columns: 1fr; gap: 6px; }
  .image-grid { grid-template-columns: 1fr; }
  .image-card img { aspect-ratio: 4 / 3; object-fit: contain; }
}

@media (max-width: 640px) {
  .brand-card, .panel-card, .hero-card { padding: 14px; }
  .hero-card { display: flex; flex-direction: column; align-items: stretch; }
  .hero-stats { grid-template-columns: 1fr 1fr; }
  .summary-grid { grid-template-columns: 1fr; }
  .leaf-grid { grid-template-columns: 1fr; }
  .upload-toolbar { grid-template-columns: 1fr; }
  .preview-note { flex-direction: column; align-items: flex-start; gap: 6px; }
  .point-dot { width: 32px; height: 32px; }
}
</style>
