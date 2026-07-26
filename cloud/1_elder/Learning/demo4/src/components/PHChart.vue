<template>
  <div class="ph-chart"></div>
</template>

<script>
import * as echarts from 'echarts';

export default {
  name: 'PHChart',
  data() {
    return {
      chartData: {
        xAxisData: ['8:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'], // 替换为实际的时间数据
        seriesData: [6.5, 7.2, 6.8, 7.0, 6.0, 7.0], // 替换为实际的PH值数据
      },
    };
  },
  mounted() {
    this.initChart();
  },
  methods: {
    initChart() {
      const chart = echarts.init(this.$el);
      const option = {
        title: {
          text: '土壤PH随时间变化',
          left: 'center',
          textStyle: {
            color: 'white', // 设置标题文字颜色为白色
          },
        },
        xAxis: {
          type: 'category',
          data: this.chartData.xAxisData,
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
          min: 0, // 设置最小值
          max: 14, // 设置最大值
          axisLabel: {
            color: 'white', // 设置横轴标签文字颜色为白色
          },
          axisLine: {
            lineStyle: {
              color: 'white', // 设置横轴线颜色为白色
            },
          }
        },
        series: [{
          type: 'line',
          data: this.chartData.seriesData,
          smooth: true,
          lineStyle: {
              color: '#ff9900',
              width: 3,
            },
        }],
      };
      chart.setOption(option);
    },
  },
};
</script>

<style scoped>
.ph-chart {
  height: 400px;
  /* 设置图表的高度 */
}
</style>
