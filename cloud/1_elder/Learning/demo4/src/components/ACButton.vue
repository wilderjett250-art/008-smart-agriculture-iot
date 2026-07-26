<template>
  <div>
    <!-- 修改按钮的文本内容和样式 -->
    <button @click="toggleAutomation" :style="{fontSize: '35px', backgroundColor: buttonBackgroundColor, marginLeft: '0%' }">{{ automationButtonText }}</button>
  </div>
</template>

<script>
export default {
  name: 'ACButton', // 修改组件名称为多个单词
  props: ['state','threshold'],
  data() {
    return {
      isAutomated: this.state // 新增状态变量用于记录自动化状态
    };
  },
  computed: {
    automationButtonText() {
      return this.isAutomated ? '关闭自动增温' : '打开自动增温'; // 根据自动化状态返回相应文本内容
    },
    buttonBackgroundColor() {
      return this.isAutomated ? 'purple' : 'lavender';
    }
  },
  watch: {
    state(newValue) {
      this.isAutomated = newValue;
    }
  },
  methods: {
    toggleAutomation() {
      // 根据当前状态切换自动化状态
      this.isAutomated = !this.isAutomated;
      // 如果是打开自动化，则调用fetchData方法发送请求
      if (this.isAutomated) {
        this.startTask();
      }else{
        this.stopTask();
      }
    },
    startTask() {
      const thresholdValue = this.threshold; // 假设这是你的变量值
      const apiUrl = `http://8.130.72.214:3000/autotask/set?device=warm&state=1&threshold=${thresholdValue}`;
      fetch(apiUrl) // 替换成你的 API 地址
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
    stopTask(){
      const thresholdValue = this.threshold; // 假设这是你的变量值
      const apiUrl = `http://8.130.72.214:3000/autotask/set?device=warm&state=0&threshold=${thresholdValue}`;
      fetch(apiUrl) // 替换成你的 API 地址
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
