<template>
  <MyHeader />
  <el-col span="12">
    <YoloStream videoUrl="http://8.130.72.214:8000/live/22.flv" />
    病斑监测
    <br>
    叶片{{ result.leaf }} 褐纹病{{result.alter}} 灰斑病{{ result.grey }} 蛙眼叶斑病{{ result.frog }}
  </el-col>
  <el-col span="12">
    <YoloStream videoUrl="http://8.130.72.214:8000/live/22.flv" />
    人员侵入监测
  </el-col>
  <MyFooter />
</template>
<script>
import bg from "../assets/js/bg.js";
import MyHeader from './MyHeader.vue';
import MyFooter from './MyFooter.vue';
import YoloStream from "./YoloStream.vue";
import axios from 'axios';

export default {
  components: {
    MyFooter,
    MyHeader,
    YoloStream,
  },
  data(){
    return{
      result:null,
    }
  },
  mounted() {
    bg();
  },
  methods: {
    fetchData() {
      axios.get('http://8.130.72.214:3000/detectionResult/get')
        .then(response => {
          this.result = response.data;
          console.log('接口数据已成功读取:', this.atmosphericTemperatureData);
        })
        .catch(error => {
          console.error('获取接口数据时发生错误:', error);
        });
    }
  }
}
</script>
