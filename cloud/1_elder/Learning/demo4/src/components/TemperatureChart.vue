<template>
  <div class="echarts-chart" ref="temperatureChart"></div>
</template>

<script>
import * as echarts from 'echarts';

export default {
  props: {
    soilTemperatureData: {
      type: Array,
      required: true,
    },
    atmosphericTemperatureData: {
      type: Array,
      required: true,
    },
    timeData: {
      type: Array,
      required: true,
    },
  },
  mounted() {
    this.renderTemperatureChart();
  },
  methods: {
    renderTemperatureChart() {
      const chart = echarts.init(this.$refs.temperatureChart);

      const option = {
        title: {
          text: '温度随时间变化',
          left: 'center',
          textStyle: {
            color: 'white', // 设置标题文字颜色为白色
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
          name: '温度 (°C)',
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
            data: this.soilTemperatureData,
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 10,
            lineStyle: {
              color: '#2ec7c9',
              width: 3,
            },
            itemStyle: {
              color: '#2ec7c9',
            },
            name: '土壤温度',
          },
          {
            data: this.atmosphericTemperatureData,
            type: 'line',
            smooth: true,
            symbol: 'circle',
            symbolSize: 10,
            lineStyle: {
              color: '#e74c3c',
              width: 3,
            },
            itemStyle: {
              color: '#e74c3c',
            },
            name: '大气温度',
          },
        ],
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            animation: false,
          },
        },
        legend: {
          data: ['土壤温度', '大气温度'],
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
  watch: {
    soilTemperatureData: {
      handler() {
        this.renderTemperatureChart();
      },
      deep: true,
    },
    atmosphericTemperatureData: {
      handler() {
        this.renderTemperatureChart();
      },
      deep: true,
    },
    timeData: {
      handler() {
        this.renderTemperatureChart();
      },
      deep: true,
    }
  },
};
</script>

<style scoped>
.echarts-chart {
  width: 100%;
  height: 350px;
}
</style>
