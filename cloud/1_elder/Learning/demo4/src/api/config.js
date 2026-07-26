const path = require('path');

module.exports = {
  // 其他配置项...

  build: {
    // Template for index.html
    index: path.resolve(__dirname, '../dist/index.html'),

    // Paths
    assetsRoot: path.resolve(__dirname, '../dist'),
    assetsSubDirectory: 'static',

    // 修改前
    // assetsPublicPath: '/',

    // 修改后：assetsPublicPath改为当前目录./
    assetsPublicPath: './',

    // 其他配置项...
  }
}
