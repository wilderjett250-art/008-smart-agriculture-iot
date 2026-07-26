<template>
  <div>
    <!-- 修改按钮的文本内容和样式 -->
    <button @click="toggleLighting"
      :style="{ fontSize: '35px', backgroundColor: backgroundColor, marginLeft: '0%' }">{{
        lightingButtonText }}</button>
    <div>{{ responseData }}</div>
  </div>
</template>

<script>
export default {
  name: 'LightingButton', // 修改组件名称为多个单词
  props: ['state'],
  data() {
    return {
      responseData: null,
      isLighting: this.state,
    };
  },
  computed: {
    lightingButtonText() {
      return this.isLighting ? '停止补光' : '开始补光'; // 根据补光状态返回相应文本内容
    },
    backgroundColor() {
      return this.isLighting ? 'yellow' : 'lightyellow'; // 根据补光状态返回相应背景颜色
    },
  },
  watch: {
    state(newValue) {
      this.isLighting = newValue;
    },
  },
  methods: {
    toggleLighting() {
      // 根据当前状态切换补光状态
      this.isLighting = !this.isLighting;
      // 如果是开始补光，则调用fetchData方法发送请求
      if (this.isLighting) {
        this.openLight();
      } else {
        this.closeLight();
      }
    },
    openLight() {
      fetch('http://8.130.72.214:3000/sendMessage?message={"LIGHT":1}') // 替换成你的 API 地址
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(data => {
          // 处理接收到的数据
          this.responseData = JSON.stringify(data);
        })
        .catch(error => {
          console.error('There has been a problem with your fetch operation:', error);
        });
    },
    closeLight() {
      fetch('http://8.130.72.214:3000/sendMessage?message={"LIGHT":2}') // 替换成你的 API 地址
        .then(response => {
          if (!response.ok) {
            throw new Error('Network response was not ok');
          }
          return response.json();
        })
        .then(data => {
          // 处理接收到的数据
          this.responseData = JSON.stringify(data);
        })
        .catch(error => {
          console.error('There has been a problem with your fetch operation:', error);
        });
    }
  }
};
</script>
