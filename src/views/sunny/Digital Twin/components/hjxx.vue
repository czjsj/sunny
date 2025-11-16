<template>
  <div class="v-card">
    <div class="c-title">
      <div class="c-t-content">
        <div class="c-t-c-center">
          环境信息
        </div>
      </div>
    </div>
    <div class="c-content hjxx-content">
      <el-row :gutter="20">
        <el-col
          class="left"
          :span="8"
        >
          <div class="item">
            <div class="h-l-i-top">
              太阳辐射强度
            </div>
            <div class="h-l-i-bottom">
              890W/m² 
            </div>
          </div>
          <div class="item">
            <div class="h-l-i-top">
              风力等级
            </div>
            <div class="h-l-i-bottom">
              3级
            </div>
          </div>
        </el-col>
        <el-col
          class="right"
          :span="16"
        >
          <div class="item">
            <div
              class="h-r-i-title"
              style="color: #C4914E"
            >
              <div class="t-label">
                温度
              </div>
              <div class="t-value">
                17℃
              </div>
            </div>
            <div class="h-r-i-chart">
              <div
                class="c-value"
                style="width: 20%;background: rgba(196, 145, 78, 0.9);"
              />
            </div>
          </div>
          <div class="item">
            <div
              class="h-r-i-title"
              style="color: #71B0D0"
            >
              <div class="t-label">
                湿度
              </div>
              <div class="t-value">
                53%RH
              </div>
            </div>
            <div class="h-r-i-chart">
              <div
                class="c-value"
                style="width: 53%;background: rgba(113, 176, 208, 0.9);"
              />
            </div>
          </div>
          <div class="item">
            <div
              class="h-r-i-title"
              style="color: #4F9475"
            >
              <div class="t-label">
                风速
              </div>
              <div class="t-value">
                7.80m/s
              </div>
            </div>
            <div class="h-r-i-chart">
              <div
                class="c-value"
                style="width: 10%;background: rgba(79, 148, 117, 0.9);"
              />
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>
<script>
export default {
  name: "Hjxx",
  data() {
    return {
    };
  },
  mounted() {
  },
  destroyed() {},
  methods: {
  }
};
</script>
<style lang="scss" scoped>
@import "../styles/card.scss";
.hjxx-content {
  height: 200px;
  padding-top: 15px;
  .left {
    .item {
      height: 82px;
      width: 100%;
      padding-top: 25px;
      text-align: center;
      .h-l-i-top {
        font-size: 16px;
        color: #428bfe;
        margin-bottom: 5px;
      }
      .h-l-i-bottom {
        height: 60px;
        font-size: 22px;
        color: #ffca00;
      }
    }
  }
  .right {
    .item {
      margin: 15px 0;
      .h-r-i-title {
        display: flex;
        justify-content: space-between;
        color: #ffca00;
        font-size: 16px;
        margin-bottom: 5px;
        .t-value {
          // font-size: 16px;
          font-weight: bold;
        }
      }
      .h-r-i-chart {
        width: 100%;
        height: 15px;
        line-height: 15px;
        padding: 3px;
        border: 1px solid rgba(2, 164, 247, 0.6)!important;
        .c-value {
          height: 100%;
        }
      }
    }
  }
}
</style>
