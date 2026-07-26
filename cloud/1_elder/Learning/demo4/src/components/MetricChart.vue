<template>
  <div class="metric-chart" ref="chartRef"></div>
</template>

<script>
import * as echarts from 'echarts';

const FALLBACK_COLORS = [
  '#4fc3f7',
  '#81c784',
  '#ff8a65',
  '#ba68c8',
  '#ffd54f',
  '#4dd0e1',
  '#f06292',
  '#9575cd',
  '#aed581',
  '#ffb74d',
];

export default {
  name: 'MetricChart',
  props: {
    title: {
      type: String,
      required: true,
    },
    unit: {
      type: String,
      default: '',
    },
    color: {
      type: String,
      default: '#4fc3f7',
    },
    timeData: {
      type: Array,
      default: () => [],
    },
    seriesData: {
      type: Array,
      default: () => [],
    },
    seriesList: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      chart: null,
    };
  },
  computed: {
    normalizedSeriesList() {
      if (Array.isArray(this.seriesList) && this.seriesList.length > 0) {
        return this.seriesList.map((item, index) => ({
          name: item.name || `Series ${index + 1}`,
          data: Array.isArray(item.data) ? item.data : [],
          color: item.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length],
        }));
      }

      return [{
        name: this.title,
        data: Array.isArray(this.seriesData) ? this.seriesData : [],
        color: this.color,
      }];
    },
  },
  mounted() {
    this.initChart();
    window.addEventListener('resize', this.handleResize);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.handleResize);
    if (this.chart) {
      this.chart.dispose();
      this.chart = null;
    }
  },
  watch: {
    timeData: {
      handler() {
        this.renderChart();
      },
      deep: true,
    },
    seriesData: {
      handler() {
        this.renderChart();
      },
      deep: true,
    },
    seriesList: {
      handler() {
        this.renderChart();
      },
      deep: true,
    },
    title() {
      this.renderChart();
    },
  },
  methods: {
    initChart() {
      if (!this.chart) {
        this.chart = echarts.init(this.$refs.chartRef);
      }
      this.renderChart();
    },
    renderChart() {
      if (!this.chart) {
        return;
      }

      this.chart.setOption({
        animation: false,
        color: this.normalizedSeriesList.map((item) => item.color),
        title: {
          text: this.title,
          left: 'center',
          textStyle: {
            color: '#ffffff',
            fontSize: 18,
          },
        },
        legend: {
          type: 'scroll',
          top: 32,
          textStyle: {
            color: '#dcecff',
            fontSize: 11,
          },
          pageTextStyle: {
            color: '#dcecff',
          },
        },
        tooltip: {
          trigger: 'axis',
        },
        grid: {
          left: '8%',
          right: '6%',
          bottom: '12%',
          top: this.normalizedSeriesList.length > 1 ? '28%' : '18%',
          containLabel: true,
        },
        xAxis: {
          type: 'category',
          data: this.timeData,
          axisLabel: {
            color: '#cfe4ff',
            fontSize: 11,
            hideOverlap: true,
            margin: 12,
            formatter: (value) => String(value).replace(' ', '\n'),
          },
          axisLine: {
            lineStyle: {
              color: '#7aa7de',
            },
          },
        },
        yAxis: {
          type: 'value',
          name: this.unit,
          nameTextStyle: {
            color: '#cfe4ff',
          },
          axisLabel: {
            color: '#cfe4ff',
          },
          splitLine: {
            lineStyle: {
              color: 'rgba(255, 255, 255, 0.08)',
            },
          },
        },
        series: this.normalizedSeriesList.map((item) => ({
          name: item.name,
          data: item.data,
          type: 'line',
          smooth: true,
          connectNulls: false,
          showSymbol: false,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            width: this.normalizedSeriesList.length > 6 ? 2 : 3,
          },
          itemStyle: {
            color: item.color,
          },
          areaStyle: this.normalizedSeriesList.length === 1
            ? { color: `${item.color}33` }
            : undefined,
        })),
      }, { lazyUpdate: true });
    },
    handleResize() {
      if (this.chart) {
        this.chart.resize();
      }
    },
  },
};
</script>

<style scoped>
.metric-chart {
  width: 100%;
  height: 320px;
}
</style>
