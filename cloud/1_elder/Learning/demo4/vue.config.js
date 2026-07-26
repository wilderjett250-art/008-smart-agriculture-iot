const { defineConfig } = require('@vue/cli-service');

module.exports = defineConfig({
  publicPath: process.env.VUE_APP_PUBLIC_PATH || '/',
  transpileDependencies: true,
  parallel: false,
  devServer: {
    client: {
      overlay: false,
    },
    port: 8080,
    proxy: {
      '^/api': {
        target: process.env.VUE_APP_PROXY_TARGET || 'http://115.29.195.177',
        changeOrigin: true,
      },
    },
  },
});
