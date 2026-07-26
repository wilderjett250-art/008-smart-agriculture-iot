// element.js
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/lib/theme-chalk/index.css'

export default {
  install(app) {
    // 使用 Element Plus
    app.use(ElementPlus)
  }
}
