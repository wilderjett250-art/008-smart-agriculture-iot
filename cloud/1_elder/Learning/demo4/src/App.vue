<template>
  <router-view />
</template>

<script>
export default {
  name: 'App',
};
</script>

<style>
html,
body,
#app {
  min-height: 100%;
  margin: 0;
  background: #07182f;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

body {
  overflow-x: hidden;
  overflow-y: auto;
}

* {
  box-sizing: border-box;
}
</style>
