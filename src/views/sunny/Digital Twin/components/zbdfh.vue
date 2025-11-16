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
      <div
        id="zbdfhChart"
        ref="zbdfhChart"
        class="zbdfh-chart"
      />
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
      zbdfhList: [
        {
          name: "1#",
          time: "16:54",
          value: 480
        },
        {
          name: "1#",
          time: "17:05",
          value: 450
        },
        {
          name: "1#",
          time: "17:16",
          value: 430
        },
        {
          name: "1#",
          time: "17:27",
          value: 400
        },
        {
          name: "1#",
          time: "17:38",
          value: 360
        },
        {
          name: "1#",
          time: "17:48",
          value: 330
        },
        {
          name: "2#",
          time: "16:54",
          value: 240
        },
        {
          name: "2#",
          time: "17:05",
          value: 360
        },
        {
          name: "2#",
          time: "17:16",
          value: 120
        },
        {
          name: "2#",
          time: "17:27",
          value: 600
        },
        {
          name: "2#",
          time: "17:38",
          value: 330
        },
        {
          name: "2#",
          time: "17:48",
          value: 360
        },
        {
          name: "3#",
          time: "16:54",
          value: 580
        },
        {
          name: "3#",
          time: "17:05",
          value: 350
        },
        {
          name: "3#",
          time: "17:16",
          value: 430
        },
        {
          name: "3#",
          time: "17:27",
          value: 300
        },
        {
          name: "3#",
          time: "17:38",
          value: 160
        },
        {
          name: "3#",
          time: "17:48",
          value: 230
        }
      ],
    };
  },
  mounted() {
    this.initZbdfhChart();
  },
  destroyed() {
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
                      // fontSize: 8
                  }
              }
          },
          // columnSize: 20,
          xAxis: {
              line: null,
              tickLine: null,
              label: {
                  visible: true,
                  // autoHide: false,
                  style: {
                      fill: '#fff',
                      // fontSize: 8
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
                      // fontSize: 8
                  }
              },
              min: 0
          },
          color: ['#45BEBB', '#FFF260', '#18C1FF'],
          smooth: true,
          responsive: true
      });
      this.zbdfhChart.render();
  },
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
