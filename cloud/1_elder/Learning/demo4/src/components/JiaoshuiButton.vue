<template>
  <div>
    <!-- 修改按钮的文本内容和样式 -->
    <button @click="toggleWatering"
      :style="{ fontSize: '35px', backgroundColor: backgroundColor, marginLeft: '0%' }">{{
        wateringButtonText }}</button>
    <div>{{ responseData }}</div>
  </div>
</template>

<script>
export default {
  name: 'WateringButton', // 修改组件名称为多个单词
  props: ['state'],
  data() {
    return {
      responseData: null,
      isWatering: this.state,
    };
  },
  computed: {
    wateringButtonText() {
      return this.isWatering ? '停止浇水' : '开始浇水'; // 根据浇水状态返回相应文本内容
    },
    backgroundColor() {
      return this.isWatering ? 'blue' : 'lightblue'; // 根据浇水状态返回相应背景颜色
    },
  },
  watch: {
    state(newValue) {
      this.isWatering = newValue;
    },
  },
  methods: {
    toggleWatering() {
      // 根据当前状态切换浇水状态
      this.isWatering = !this.isWatering;
      // 如果是开始浇水，则调用fetchData方法获取数据
      if (this.isWatering) {
        this.openWater();
      } else {
        this.closeWater();
      }
    },
    openWater() {
      fetch('http://8.130.72.214:3000/sendMessage?message={"WATER":1}') // 替换成你的 API 地址
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
    closeWater() {
      fetch('http://8.130.72.214:3000/sendMessage?message={"WATER":2}') // 替换成你的 API 地址
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
