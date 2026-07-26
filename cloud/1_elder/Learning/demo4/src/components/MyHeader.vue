<template>
  <header class="header-shell">
    <div class="header-panel">
      <div class="title-group">
        <h1>{{ title }}</h1>
        <p v-if="subtitle">{{ subtitle }}</p>
      </div>
    </div>
  </header>
</template>

<script>
export default {
  name: 'MyHeader',
  props: {
    title: {
      type: String,
      default: '农业环境监测可视化平台',
    },
    subtitle: {
      type: String,
      default: '多设备土壤数据实时监测',
    },
  },
};
</script>

<style scoped>
.header-shell {
  position: sticky;
  top: 0;
  z-index: 20;
  padding: 12px 0 20px;
}

.header-panel {
  min-height: 86px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(124, 232, 240, 0.75);
  border-radius: 12px;
  box-shadow: 0 0 28px rgba(105, 238, 231, 0.18);
  background:
    linear-gradient(180deg, rgba(5, 26, 60, 0.84), rgba(15, 37, 88, 0.76)),
    url('./image/top-bg2.png') center / 100% 100% no-repeat;
  backdrop-filter: blur(8px);
}

.title-group {
  text-align: center;
  padding: 12px 24px;
}

.title-group h1 {
  margin: 0;
  color: #7ce6ff;
  font-size: clamp(26px, 2.2vw, 36px);
  letter-spacing: 2px;
}

.title-group p {
  margin: 8px 0 0;
  color: rgba(217, 241, 255, 0.9);
  font-size: 14px;
  letter-spacing: 1px;
}

@media (max-width: 768px) {
  .header-shell {
    padding-bottom: 16px;
  }

  .header-panel {
    min-height: 76px;
  }
}
</style>
