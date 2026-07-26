<template>
  <footer class="footer-shell">
    <div class="footer-panel">
      <div class="footer-time">{{ nowDateTime }}</div>
    </div>
  </footer>
</template>

<script>
export default {
  name: 'MyFooter',
  data() {
    return {
      nowDateTime: '',
      timer: null,
    };
  },
  mounted() {
    this.updateTime();
    this.timer = window.setInterval(this.updateTime, 1000);
  },
  beforeUnmount() {
    if (this.timer) {
      window.clearInterval(this.timer);
    }
  },
  methods: {
    updateTime() {
      const now = new Date();
      this.nowDateTime = now.toLocaleString('zh-CN', { hour12: false });
    },
  },
};
</script>

<style scoped>
.footer-shell {
  margin-top: 24px;
  padding-bottom: 8px;
}

.footer-panel {
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 18px;
  color: #7ce6ff;
  border: 1px solid rgba(124, 232, 240, 0.75);
  border-radius: 12px;
  box-shadow: 0 0 24px rgba(105, 238, 231, 0.16);
  background:
    linear-gradient(180deg, rgba(8, 24, 58, 0.88), rgba(22, 44, 102, 0.72)),
    url('./image/bottom.png') center / 100% 100% no-repeat;
}

.footer-time {
  font-size: 13px;
  letter-spacing: 1px;
}
</style>
