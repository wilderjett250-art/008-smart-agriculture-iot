<template>
  <div class="refresh-indicator" :class="{ syncing: isRefreshing }">
    <div class="refresh-indicator__label">{{ isRefreshing ? '正在同步服务器数据' : '下次自动刷新' }}</div>
    <div class="refresh-indicator__time">{{ isRefreshing ? '同步中' : refreshCountdownText }}</div>
    <div class="refresh-indicator__meta">大表预览约 {{ previewCountdownText }} 后更新</div>
  </div>
</template>

<script>
export default {
  name: 'RefreshIndicator',
  props: {
    isRefreshing: {
      type: Boolean,
      default: false,
    },
    nextRefreshAt: {
      type: Number,
      default: 0,
    },
    lastPreviewRefreshAt: {
      type: Number,
      default: 0,
    },
    refreshIntervalMs: {
      type: Number,
      default: 120000,
    },
    previewRefreshIntervalMs: {
      type: Number,
      default: 300000,
    },
  },
  data() {
    return {
      nowTickAt: Date.now(),
      timer: null,
    };
  },
  computed: {
    refreshCountdownText() {
      return `${this.getRemainingSeconds(this.nextRefreshAt, this.refreshIntervalMs)} 秒`;
    },
    previewCountdownText() {
      const nextPreviewAt = this.lastPreviewRefreshAt > 0
        ? this.lastPreviewRefreshAt + this.previewRefreshIntervalMs
        : Date.now() + this.previewRefreshIntervalMs;
      const seconds = this.getRemainingSeconds(nextPreviewAt, this.previewRefreshIntervalMs);
      if (seconds >= 60) {
        return `${Math.ceil(seconds / 60)} 分钟`;
      }
      return `${seconds} 秒`;
    },
  },
  mounted() {
    this.timer = window.setInterval(() => {
      this.nowTickAt = Date.now();
    }, 1000);
  },
  beforeUnmount() {
    if (this.timer) {
      window.clearInterval(this.timer);
    }
  },
  methods: {
    getRemainingSeconds(targetAt, fallbackInterval) {
      if (!targetAt) {
        return Math.ceil(fallbackInterval / 1000);
      }
      const diff = Math.max(0, targetAt - this.nowTickAt);
      return Math.max(0, Math.ceil(diff / 1000));
    },
  },
};
</script>

<style scoped>
.refresh-indicator { position: fixed; right: 22px; bottom: 20px; z-index: 1200; min-width: 210px; padding: 12px 16px; border: 1px solid rgba(111, 215, 255, 0.2); border-radius: 16px; background: linear-gradient(180deg, rgba(8, 22, 46, 0.8), rgba(5, 15, 31, 0.84)); box-shadow: 0 18px 36px rgba(0, 8, 24, 0.32); backdrop-filter: blur(10px); color: #e9f7ff; pointer-events: none; }
.refresh-indicator__label { font-size: 11px; letter-spacing: 1px; color: rgba(205, 227, 248, 0.7); }
.refresh-indicator__time { margin-top: 4px; font-size: 24px; font-weight: 800; line-height: 1; color: #8cecff; text-shadow: 0 0 16px rgba(124, 230, 255, 0.18); }
.refresh-indicator__meta { margin-top: 8px; font-size: 12px; color: rgba(205, 227, 248, 0.62); }
.refresh-indicator.syncing .refresh-indicator__time { color: #ffffff; }

@media (max-width: 768px) {
  .refresh-indicator { right: 12px; bottom: 14px; min-width: 180px; padding: 10px 12px; }
  .refresh-indicator__time { font-size: 22px; }
}

@media (max-width: 520px) {
  .refresh-indicator { left: 12px; right: 12px; min-width: 0; }
}
</style>
