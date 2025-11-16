<template>
  <div class="v-card">
    <div class="c-title">
      <div class="c-t-content">
        <div class="c-t-c-center">
          告警设备详情
        </div>
      </div>
    </div>
    <div class="c-content sbxq-content">
      <div class="s-label">
        <div class="s-l-flag" />
        <div class="s-l-text">
          变压器台账信息
        </div>
      </div>
      <div class="s-content">
        <div class="s-c-item">
          <div class="s-c-i-label">
            <span>设备状态</span>
          </div>
          <div
            class="s-c-i-value"
            style="color: #FF4747"
          >
            E04-3001（线路断路器重合闸）
          </div>
        </div>
        <div class="s-c-item">
          <div class="s-c-i-label">
            <span>生产厂家</span>
          </div>
          <div class="s-c-i-value">
            山东达驰电气有限公司
          </div>
        </div>
        <div class="s-c-item">
          <div class="s-c-i-label">
            <span>生产批号</span>
          </div>
          <div class="s-c-i-value">
            S7-10/0.4-500kvA
          </div>
        </div>
        <div class="s-c-item">
          <div class="s-c-i-label">
            <span>投放运营时间</span>
          </div>
          <div class="s-c-i-value">
            2019/12/04 08:30
          </div>
        </div>
      </div>
      <div class="s-label">
        <div class="s-l-flag" />
        <div class="s-l-text">
          变压器负荷变化与预测
        </div>
      </div>
      <div class="s-content">
        <div
          id="fhbhChart"
          ref="fhbhChart"
          class="fhbh-chart"
        />
      </div>
      <div class="s-label">
        <div class="s-l-flag" />
        <div class="s-l-text">
          变压器相关工程图纸
        </div>
      </div>
      <div class="s-content">
        <img src="../images/电力接线图.jpg">
      </div>
      <div class="s-label">
        <div class="s-l-flag" />
        <div class="s-l-text">
          人员维护
        </div>
      </div>
      <div class="s-content">
        <div class="btn">
          系统匹配指派
        </div>
        <div class="btn">
          人工指派
        </div>
      </div>
    </div>
  </div>
</template>
<script>
import { Line } from '@antv/g2plot';
export default {
  name: "Czt",
  data() {
    return {
      warningFlag: false,
      fhbhChart: null,
      fhbhList: [
        {
          name: "实时负荷",
          time: "16:54",
          value: 480
        },
        {
          name: "实时负荷",
          time: "17:05",
          value: 450
        },
        {
          name: "实时负荷",
          time: "17:16",
          value: 430
        },
        {
          name: "实时负荷",
          time: "17:27",
          value: 400
        },
        {
          name: "实时负荷",
          time: "17:38",
          value: 360
        },
        {
          name: "实时负荷",
          time: "17:48",
          value: 330
        },
        {
          name: "预测负荷",
          time: "16:54",
          value: 240
        },
        {
          name: "预测负荷",
          time: "17:05",
          value: 360
        },
        {
          name: "预测负荷",
          time: "17:16",
          value: 120
        },
        {
          name: "预测负荷",
          time: "17:27",
          value: 600
        },
        {
          name: "预测负荷",
          time: "17:38",
          value: 330
        },
        {
          name: "预测负荷",
          time: "17:48",
          value: 360
        },
      ],
    };
  },
  mounted() {
    this.initFhbhChart();
  },
  destroyed() {},
  methods: {
    pushEquipmentWarning() {
      this.warningFlag = !this.warningFlag
      this.$emit('pushEquipmentWarning', this.warningFlag)
    },
    viewEquipmentDetail() {
      this.$emit('viewEquipmentDetail')
    },
    roamCheck() {
      this.$emit('roamCheck')
    },
    realTimeMonitor() {
      this.$emit('realTimeMonitor')
    },
    masterControlView() {
      this.$emit('masterControlView')
    },
    cockpitControlView() {
      this.$emit('cockpitControlView')
    },
    initFhbhChart() {
      this.fhbhChart = new Line(this.$refs.fhbhChart, {
          data: this.fhbhList,
          xField: 'time',
          yField: 'value',
          seriesField: 'name',
          width: 570,
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
          color: ['#FFF260', '#18C1FF'],
          smooth: true,
          responsive: true
      });
      this.fhbhChart.render();
    }
  }
};
</script>
<style lang="scss" scoped>
@import "../styles/card.scss";
.sbxq-content {
  height: 600px;
  padding-top: 30px!important;
  .s-label {
    height: 30px;
    display: flex;
    align-items: center;
    .s-l-flag {
      width: 4px;
      height: 20px;
      border-radius: 4px;
      background: #428bfe;
      margin-right: 10px;
    }
    .s-l-text {
      font-size: 18px;
      color: #428bfe;
    }
  }
  .s-content {
    padding-top: 10px;
    padding-bottom: 15px;
    .s-c-item {
      width: 100%;
      height: 40px;
      line-height: 40px;
      padding-left: 14px;
      color: #e4e3e3;
      display: flex;
      .s-c-i-label {
        width: 140px;
        font-size: 18px;
        color: #428bfe;
        // font-weight: bold;
      }
      .s-c-i-value {
        flex: 1;
        font-size: 20px;
        color: #c1c1c1;
      }
    }
    img {
      width: 100%;
      height: 100%;
    }
    .btn {
      font-size: 18px;
      color: #c1c1c1;
      border-bottom: 1px solid #c1c1c1;
      display: inline-block;
      margin-left: 14px;
      cursor: pointer;
    }
  }
}

.v-card {
  .c-title {
      border-left: 2px solid rgba(255, 71, 71, 1)!important;
      border-right: 2px solid rgba(255, 71, 71, 1)!important;
      .c-t-content {
          color: #fff!important;
          background: rgba(255, 71, 71, 0.6)!important;
      }
  }
  .c-content {
      background: rgba(0, 0, 0, 0.8)!important;
  }
}
</style>
