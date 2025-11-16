<template>
  <div class="v-card">
    <div class="c-title">
      <div class="c-t-content">
        <div class="c-t-c-center">
          物联事件统计
        </div>
      </div>
    </div>
    <div class="c-content wlsj-content">
      <div class="w-c-sum">
        <el-row :gutter="0">
          <el-col :span="12">
            <div class="w-c-s-item">
              <div class="w-c-s-i-left">
                <img src="../images/beadhouse.png">
              </div>
              <div class="w-c-s-i-right">
                <div class="w-c-s-i-r-top">
                  办理事件数
                </div>
                <div class="w-c-s-i-r-bottom">
                  <DigitalTransform
                    :value="wlsjTodayProcessing"
                    :interval="2500"
                  />
                  <span>/</span>
                  <DigitalTransform
                    :value="wlsjTotalProcessing"
                    :interval="2500"
                  />
                </div>
              </div>
            </div>
          </el-col>
          <el-col :span="12">
            <div class="w-c-s-item">
              <div class="w-c-s-i-left">
                <img src="../images/beadhouse.png">
              </div>
              <div class="w-c-s-i-right">
                <div class="w-c-s-i-r-top">
                  办结事件数
                </div>
                <div class="w-c-s-i-r-bottom">
                  <DigitalTransform
                    :value="wlsjTodayFinished"
                    :interval="2500"
                  />
                  <span>/</span>
                  <DigitalTransform
                    :value="wlsjTotalFinished"
                    :interval="2500"
                  />
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
      <dv-scroll-board
        :config="wlsjConfig"
        style="height: 240px; margin-top: 15px"
      />
    </div>
  </div>
</template>
<script>
import DigitalTransform from "vue-digital-transform";

export default {
  name: "Zsbgm",
  components: {
    DigitalTransform
  },
  data() {
    return {
      // 物联事件统计
      wlsjTodayProcessing: 0,
      wlsjTotalProcessing: 0,
      wlsjTodayFinished: 0,
      wlsjTotalFinished: 0,
      wlsjConfig: {}
    };
  },
  mounted() {
    this.initWlsjTable();
  },
  destroyed() {
  },
  methods: {
    initWlsjTable() {
      this.wlsjTodayProcessing = 13;
      this.wlsjTotalProcessing = 42;
      this.wlsjTodayFinished = 33;
      this.wlsjTotalFinished = 247;
      let wlsjData = [
        ['1#变压器传感器', '失联', '08:21'],
        ['23#温湿度传感器', '烟雾值12/218', '08:32'],
        ['9#红外被动探测器', '失联', '09:44'],
        ['2#风机房', '检测到水流', '12:53'],
        ['18#巡更锚点', '失联', '14:15'],
        ['7#巡更锚点', '失联', '14:45'],
        ['26#红外被动探测器', '检测到异常', '14:59'],
        ['3#风机房', '风机卡住', '16:42'],
        ['6#变压器传感器', '失联', '17:43']
      ]
      this.wlsjConfig = {
          header: ['传感器', '故障描述', '发生时间'],
          columnWidth: [160, 140, 120],
          data: wlsjData,
          rowNum: 6,
          waitTime: 3000,
          headerHeight: 26,
          oddRowBGC: '#ffffff00',
          evenRowBGC: '#ffffff00',
          align: ['left', 'left', 'center']
      };
    },
  }
};
</script>
<style lang="scss" scoped>
@import "../styles/card.scss";
.wlsj-content {
  height: 320px;
  padding-top: 15px;
  .w-c-sum {
      height: 42px;
      .w-c-s-item {
          height: 42px;
          width: 100%;
          display: flex;
          &:nth-child(even) {
              padding-left: 10px;
          }
          .w-c-s-i-left {
              width: 42px;
              height: 42px;
              margin-right: 18px;
              img {
                  width: 42px;
                  height: 42px;
              }
          }
          .w-c-s-i-right {
              flex: 1;
              .w-c-s-i-r-top {
                  font-size: 14px;
                  color: #428bfe;
                  margin-bottom: 5px;
              }
              .w-c-s-i-r-bottom {
                  height: 22px;
                  font-size: 22px;
                  // font-weight: bold;
                  color: #ffca00;
              }
          }
      }
  }
}
::v-deep .dv-scroll-board .header {
  background: linear-gradient(90deg, rgba(2, 164, 247, 0), rgba(2, 164, 247, 0.37), rgba(2, 164, 247, 0.03)) !important;
}
::v-deep .dv-scroll-board .header .header-item {
    font-size: 14px !important;
    color: #c1c1c1 !important;
}
::v-deep .dv-scroll-board .rows .row-item {
    font-size: 14px !important;
    color: #02A4F7 !important;
    border-bottom: 1px solid #32a3a01f;
}

::v-deep .dv-scroll-board .rows .row-item div:nth-child(2){
  color:#FF4747;
}
</style>
