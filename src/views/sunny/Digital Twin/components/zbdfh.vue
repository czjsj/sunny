<template>
  <div class="v-card">
    <div class="c-title">
      <div class="c-t-content">
        <div class="c-t-c-center">
          主变电负荷电流变化
        </div>
      </div>
    </div>
    <div class="c-content zbdfh-content">
      <div id="zbdfhChart" ref="zbdfhChart" class="zbdfh-chart" />
    </div>
  </div>
</template>

<script>
import { Line } from '@antv/g2plot';

export default {
  name: "Zsbgm",
  data() {
    return {
      zbdfhChart: null,
      timer: null, // 定义定时器变量
      // 初始数据，我稍微调整了时间格式以便观察后续的秒级变化
      zbdfhList: [
        { name: "1#", time: "17:40:00", value: 360 },
        { name: "1#", time: "17:40:10", value: 355 },
        { name: "1#", time: "17:40:20", value: 365 },
        { name: "1#", time: "17:40:30", value: 360 },
        { name: "1#", time: "17:40:40", value: 358 },
        { name: "1#", time: "17:40:50", value: 362 },
        
        { name: "2#", time: "17:40:00", value: 330 },
        { name: "2#", time: "17:40:10", value: 335 },
        { name: "2#", time: "17:40:20", value: 325 },
        { name: "2#", time: "17:40:30", value: 330 },
        { name: "2#", time: "17:40:40", value: 332 },
        { name: "2#", time: "17:40:50", value: 328 },
        
        { name: "3#", time: "17:40:00", value: 160 },
        { name: "3#", time: "17:40:10", value: 165 },
        { name: "3#", time: "17:40:20", value: 155 },
        { name: "3#", time: "17:40:30", value: 160 },
        { name: "3#", time: "17:40:40", value: 162 },
        { name: "3#", time: "17:40:50", value: 158 }
      ],
    };
  },
  mounted() {
    this.initZbdfhChart();
    this.startSimulation(); // 组件挂载后启动模拟
  },
  destroyed() { // 注意：Vue2是destroyed，Vue3是unmounted，根据你的代码风格这里是Vue2
    this.stopSimulation(); // 组件销毁时清除定时器，防止内存泄漏
  },
  methods: {
    initZbdfhChart() {
      this.zbdfhChart = new Line(this.$refs.zbdfhChart, {
        data: this.zbdfhList,
        xField: 'time',
        yField: 'value',
        seriesField: 'name',
        width: 310,
        height: 170,
        autoFit: false,
        legend: {
          position: 'top',
          itemName: {
            style: {
              fill: '#ffffff',
              lineWidth: 0,
            }
          }
        },
        xAxis: {
          line: null,
          tickLine: null,
          label: {
            visible: true,
            style: {
              fill: '#fff',
            }
          }
        },
        yAxis: {
          grid: {
            line: {
              style: {
                stroke: '#053c4e',
                lineWidth: 1,
                lineDash: [3]
              }
            }
          },
          label: {
            formatter: (v) => `${v} A`,
            style: {
              fill: '#fff',
            }
          },
          min: 0
        },
        color: ['#45BEBB', '#FFF260', '#18C1FF'],
        smooth: true,
        responsive: true,
        animation: {
          appear: {
            animation: 'path-in',
            duration: 1000,
          },
        }
      });
      this.zbdfhChart.render();
    },

    // 启动定时模拟
    startSimulation() {
      // 设置每3秒执行一次更新
      this.timer = setInterval(() => {
        this.updateData();
      }, 3000);
    },

    // 停止模拟
    stopSimulation() {
      if (this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    },

    // 数据更新的核心逻辑
    updateData() {
      // 1. 获取当前的时刻，用于生成新的时间轴
      const now = new Date();
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

      // 2. 这里的逻辑是：基于每条线的“最后一个值”进行微小的随机波动
      // 我们定义三条线的名称
      const names = ["1#", "2#", "3#"];
      
      names.forEach(name => {
        // 找到该变压器目前列表里的最后一个数据
        const relevantData = this.zbdfhList.filter(item => item.name === name);
        const lastItem = relevantData[relevantData.length - 1];
        
        // 基础值基于上一次的值
        let baseValue = lastItem ? lastItem.value : 300; 

        // 3. 生成波动：范围在 -15A 到 +15A 之间
        // 这种程度的波动对于变压器来说是正常的负载变化
        const fluctuation = Math.floor(Math.random() * 31) - 15; 
        
        let newValue = baseValue + fluctuation;

        // 4. 边界保护：防止电流变成负数，或者过大
        if (newValue < 0) newValue = 0;
        if (newValue > 800) newValue = 800; // 假设上限

        // 5. 推入新数据
        this.zbdfhList.push({
          name: name,
          time: timeStr,
          value: newValue
        });

        // 6. 移除旧数据：为了保持图表不被挤压，我们需要移除最早的一个数据点
        // 找到该变压器最早的一个数据在主数组中的索引并删除
        const removeIndex = this.zbdfhList.findIndex(item => item.name === name);
        if (removeIndex !== -1) {
          this.zbdfhList.splice(removeIndex, 1);
        }
      });

      // 7. 通知图表更新数据
      if (this.zbdfhChart) {
        this.zbdfhChart.changeData(this.zbdfhList);
      }
    }
  }
};
</script>

<style lang="scss" scoped>
@import "../styles/card.scss";
.zbdfh-content {
  height: 200px;
  padding-top: 15px;
}
</style>