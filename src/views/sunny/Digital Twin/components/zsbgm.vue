<template>
  <div class="v-card">
    <div class="c-title">
      <div class="c-t-content">
        <div class="c-t-c-center">
          主设备规模
        </div>
      </div>
    </div>
    <div class="c-content zsbgm-content">
      <div class="z-c-item">
        <div class="z-c-i-label">
          <img
            src="../images/sensor-error.png"
            alt=""
          >
          <span>变压器220KV</span>
        </div>
        <div class="z-c-i-value">
          <DigitalTransform
            :value="248"
            :interval="2500"
          />
          <span class="z-c-i-v-unit">（台）</span>
        </div>
      </div>
      <div class="z-c-item">
        <div class="z-c-i-label">
          <img
            src="../images/charge.png"
            alt=""
          >
          <span>开关柜35KV</span>
        </div>
        <div class="z-c-i-value">
          <DigitalTransform
            :value="343"
            :interval="2500"
          />
          <span class="z-c-i-v-unit">（台）</span>
        </div>
      </div>
      <div class="z-c-item">
        <div class="z-c-i-label">
          <img
            src="../images/team.png"
            alt=""
          >
          <span>接地变110V</span>
        </div>
        <div class="z-c-i-value">
          <DigitalTransform
            :value="1545"
            :interval="2500"
          />
          <span class="z-c-i-v-unit">（台）</span>
        </div>
      </div>
      <div class="z-c-item">
        <div class="z-c-i-label">
          <img
            src="../images/charge.png"
            alt=""
          >
          <span>风力发电机</span>
        </div>
        <div class="z-c-i-value">
          <DigitalTransform
            :value="8"
            :interval="2500"
          />
          <span class="z-c-i-v-unit">（台）</span>
        </div>
      </div>
      <div class="z-c-item">
        <div class="z-c-i-label">
          <img
            src="../images/sensor-error.png"
            alt=""
          >
          <span>光伏太阳能板</span>
        </div>
        <div class="z-c-i-value">
          <DigitalTransform
            :value="200"
            :interval="2500"
          />
          <span class="z-c-i-v-unit">（片）</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>//css样式
// 1. 引入组件
import DigitalTransform from 'vue-digital-transform';

export default {
  name: "Zsbgm",
  // 2. 注册组件
  components: {
    DigitalTransform
  },
  data() {
    return {
    };
  }
};
</script>

<style lang="scss" scoped>
@import "../styles/card.scss";
.zsbgm-content {
  height: 320px;
  padding-top: 15px;
  .z-c-item {
    width: 100%;
    height: 50px;
    line-height: 50px;
    color: #e4e3e3;
    display: flex;
    justify-content: space-between;
    margin-bottom: 5px;
    .z-c-i-label {
      width: 190px;
      font-size: 18px;
      color: #0c76ad;
      font-weight: bold;
      img {
        vertical-align: middle;
        margin-right: 18px;
        width: 42px;
        height: 42px;
      }
    }
    .z-c-i-value {
      text-align: right;
      flex: 1;
      font-size: 24px;
      color: #ffe641;
      .z-c-i-v-unit {
        font-size: 16px;
        color: #c1c1c1;
      }
    }
  }
}
  
</style>
