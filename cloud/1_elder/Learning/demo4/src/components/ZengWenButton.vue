<template>
  <div>
    <!-- 修改按钮的文本内容和样式 -->
    <button @click="toggleHeating"
      :style="{ fontSize: '35px', backgroundColor: backgroundColor }">{{
        heatingButtonText }}</button>
    <div>{{ responseData }}</div>
  </div>
</template>

<script>
export default {
  name: 'HeatingButton', // 修改组件名称为多个单词
  props: ['state'],
  data() {
    return {
      responseData: null,
      isHeating: this.state,
    };
  },
  computed: {
    heatingButtonText() {
      return this.isHeating ? '关闭增温' : '打开增温'; // 根据增温状态返回相应文本内容
    },
    backgroundColor() {
      return this.isHeating ? 'red' : 'green'; // 根据增温状态返回相应背景颜色
    },
  },
  watch: {
    state(newValue) {
      this.isHeating = newValue;
    },
  },
  methods: {
    toggleHeating() {
      // 根据当前状态切换增温状态
      this.isHeating = !this.isHeating;
      // 如果是打开增温，则调用fetchData方法获取数据
      if (this.isHeating) {
        this.openHeater();
      }else{
        this.closeHeater();
      }
      // this.$parent.fetchDeviceData();
    },
    openHeater() {
      fetch('http://8.130.72.214:3000/sendMessage?message={"WARM":1}') // 替换成你的 API 地址
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
    closeHeater(){
      fetch('http://8.130.72.214:3000/sendMessage?message={"WARM":2}') // 替换成你的 API 地址
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
