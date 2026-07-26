<template>
  <div class="echarts-chart" ref="humidityChart"></div>
</template>

<script>
import * as echarts from 'echarts';

export default {
  props: {
    soilHumidityData: {
      type: Array,
      required: true,
    },
    atmosphericHumidityData: {
      type: Array,
      required: true,
    },
    timeData: {
      type: Array,
      required: true,
    },
  },
  mounted() {
    this.renderHumidityChart();
  },
  methods: {
    renderHumidityChart() {
      const chart = echarts.init(this.$refs.humidityChart);

      const option = {
        title: {
          text: '湿度随时间变化',
          left: 'center',
          textStyle: {
            color: 'white',
          },
        },
        xAxis: {
          type: 'category',
          data: this.timeData,
          axisLabel: {
            color: 'white', // 设置横轴标签文字颜色为白色
          },
          axisLine: {
            lineStyle: {
              color: 'white', // 设置横轴线颜色为白色
            },
          }
        },
        yAxis: {
          type: 'value',
          name: '湿度 (%)',
          axisLabel: {
            color: 'white', // 设置纵轴标签文字颜色为白色
          },
          axisLine: {
             lineStyle: {
           color: 'white', // 设置纵轴线颜色为白色
            },
          },
        },
        series: [
          {
            data: this.soilHumidityData,
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 10,
            lineStyle: {
              color: '#2ecc71', // Green color for soil humidity
              width: 3,
            },
            itemStyle: {
              color: '#2ecc71',
            },
            name: '土壤湿度',
          },
          {
            data: this.atmosphericHumidityData,
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 10,
            lineStyle: {
              color: '#3498db', // Blue color for atmospheric humidity
              width: 3,
            },
            itemStyle: {
              color: '#3498db',
            },
            name: '大气湿度',
          },
        ],
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            animation: false,
          },
        },
        legend: {
          data: ['土壤湿度', '大气湿度'],
          top: 20,
          textStyle:{
            color:'white'
          },
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true,
        },
      };

      chart.setOption(option);
    },
  },
  watch:{
    soilHumidityData: function() {
      this.renderHumidityChart();
    },
    atmosphericHumidityData: function() {
      this.renderHumidityChart();
    },
    timeData: function() {
      this.renderHumidityChart();
    },
  },
};
</script>

<style scoped>
.echarts-chart {
  width: 100%;
  height: 350px;
}
</style>
