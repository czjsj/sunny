<template>
  <div class="v-card">
    <div class="c-title">
      <div class="c-t-content">
        <div class="c-t-c-center">
          当前发电量统计
        </div>
      </div>
    </div>
    <div class="c-content gzsbgm-content">
      <div class="top-stats">
        <div class="stat-item">
          <div class="stat-label">
            <span class="dot cyan"></span> 当前发电总量 (MW)
          </div>
          <div class="stat-value cyan-text">{{ currentTotal }}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">
            <span class="dot yellow"></span> 近三天发电总量 (MW)
          </div>
          <div class="stat-value yellow-text">{{ threeDaysTotal }}</div>
        </div>
      </div>

      <div class="chart-container">
        <div ref="chart" class="chart-box"></div>
      </div>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts';

export default {
  name: "Gzsbgm",
  data() {
    return {
      chartInstance: null,
      currentTotal: 0,     // 当前发电总量
      threeDaysTotal: 0,   // 近三天发电总量
      // 定时器引用，用于销毁
      mockTimer: null,
    };
  },
 mounted() {
    // 使用 $nextTick 确保 HTML 元素已经完全渲染出来
    this.$nextTick(() => {
      this.initChart();
      this.startMockData(); 
      window.addEventListener('resize', this.resizeChart);
    });
  },
  destroyed() {
    if (this.mockTimer) clearInterval(this.mockTimer);
    window.removeEventListener('resize', this.resizeChart);
    if (this.chartInstance) {
      this.chartInstance.dispose();
    }
  },
  methods: {
    // 初始化图表
    initChart() {
      if (this.chartInstance) return;
      
      const dom = this.$refs.chart;
      this.chartInstance = echarts.init(dom);

      const option = {
        tooltip: {
          trigger: 'axis',
          backgroundColor: 'rgba(0,0,0,0.7)',
          borderColor: '#428bfe',
          textStyle: { color: '#fff' }
        },
        legend: {
          data: ['光伏发电', '风力发电'],
          right: '0%',
          top: '0%',
          textStyle: { color: '#fff', fontSize: 10 },
          itemWidth: 10,
          itemHeight: 10
        },
        grid: {
          top: '25%',
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
          data: [], // 初始为空，等待数据注入
          axisLine: { lineStyle: { color: '#1B3F5C' } },
          axisLabel: { 
            color: '#c1c1c1',
            fontSize: 10,
            interval: 1 // 标签间隔，防止拥挤
          },
          axisTick: { show: false } // 隐藏刻度
        },
        yAxis: {
          type: 'value',
          name: '(MW)',
          nameTextStyle: { color: '#c1c1c1', padding: [0, 25, 0, 0] },
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: '#c1c1c1', fontSize: 10 },
          splitLine: {
            show: true,
            lineStyle: {
              type: 'dashed',
              color: 'rgba(66, 139, 254, 0.2)' // 虚线颜色
            }
          }
        },
        series: [
          {
            name: '光伏发电',
            type: 'line',
            smooth: true, // 平滑曲线
            symbol: 'none', // 去掉折线点
            data: [],
            itemStyle: { color: '#00f2f1' }, // 青色
            lineStyle: { width: 2 }
          },
          {
            name: '风力发电',
            type: 'line',
            smooth: true,
            symbol: 'none',
            data: [],
            itemStyle: { color: '#eecb5f' }, // 黄色
            lineStyle: { width: 2 }
          }
        ]
      };
      
      this.chartInstance.setOption(option);
    },

    /**
     * 【数据接口】供外部或后端调用的数据更新方法
     * @param {Object} dataPayload 数据包
     * 格式示例:
     * {
     * currentTotal: 2450.5,
     * threeDaysTotal: 8500.2,
     * timeAxis: ['10:00', '10:10', '10:20', ...],
     * pvData: [120, 132, 101, ...],
     * windData: [220, 182, 191, ...]
     * }
     */
    updateChartData(dataPayload) {
      // 1. 更新顶部数字
      this.currentTotal = dataPayload.currentTotal;
      this.threeDaysTotal = dataPayload.threeDaysTotal;

      // 2. 更新图表数据
      if (this.chartInstance) {
        this.chartInstance.setOption({
          xAxis: {
            data: dataPayload.timeAxis
          },
          series: [
            { data: dataPayload.pvData },   // 光伏数据
            { data: dataPayload.windData }  // 风力数据
          ]
        });
      }
    },

    // 模拟数据生成器（测试用）
    startMockData() {
      // 立即执行一次
      this.generateMockData();
      
      // 每3秒刷新一次数据，形成动态效果
      this.mockTimer = setInterval(() => {
        this.generateMockData();
      }, 3000);
    },

    generateMockData() {
      // 构造模拟的时间轴 (当前时间往前推的7个点，间隔10分钟)
      let timeAxis = [];
      let now = new Date();
      for (let i = 6; i >= 0; i--) {
        let t = new Date(now.getTime() - i * 10 * 60 * 1000);
        let timeStr = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`;
        timeAxis.push(timeStr);
      }

      // 构造模拟的发电数据 (随机数)
      let pvData = timeAxis.map(() => (Math.random() * 200 + 300).toFixed(1)); // 300-500之间
      let windData = timeAxis.map(() => (Math.random() * 150 + 200).toFixed(1)); // 200-350之间

      const mockPayload = {
        currentTotal: (Math.random() * 100 + 2300).toFixed(1),
        threeDaysTotal: (Math.random() * 500 + 8000).toFixed(1),
        timeAxis: timeAxis,
        pvData: pvData,
        windData: windData
      };

      // 调用接口更新视图
      this.updateChartData(mockPayload);
    },

    resizeChart() {
      if (this.chartInstance) {
        this.chartInstance.resize();
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "../styles/card.scss";

.gzsbgm-content {
  height: 320px;
  padding: 15px 20px;
  display: flex;
  flex-direction: column;

  // 上部分：数字统计
  .top-stats {
    height: 60px;
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;

    .stat-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      
      .stat-label {
        font-size: 14px;
        color: #c1c1c1;
        display: flex;
        align-items: center;
        margin-bottom: 5px;

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-right: 8px;
          display: inline-block;
          
          &.cyan { background-color: #00f2f1; box-shadow: 0 0 5px #00f2f1; }
          &.yellow { background-color: #eecb5f; box-shadow: 0 0 5px #eecb5f; }
        }
      }

      .stat-value {
        font-size: 24px;
        font-weight: bold;
        font-family: "Impact", "Microsoft YaHei", sans-serif; // 使用硬朗一点的字体
        padding-left: 16px;

        &.cyan-text { color: #00f2f1; text-shadow: 0 0 10px rgba(0, 242, 241, 0.3); }
        &.yellow-text { color: #eecb5f; text-shadow: 0 0 10px rgba(238, 203, 95, 0.3); }
      }
    }
  }

  /// 下部分：图表容器
  .chart-container {
    flex: 1;
    width: 100%;
    // min-height: 0; // 注释掉原来的 flex 自适应写法
    
    .chart-box {
      width: 100%;
      height: 200px; /* 【核心修改】直接给一个固定高度，比如 200px */
    }
  }
}
</style>