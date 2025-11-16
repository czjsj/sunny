<template>
  <div class="top">
    <div class="top-left">
      <div class="top-left-weather">
        <img src="../images/weather-icon.png">
        <span>17 °</span>
        <span>多云</span>
        <span style="margin-left: 20px;">{{ curTime ? curTime : '-' }}</span>
      </div>
    </div>
    <div class="t-center">
      智慧园区源网荷储一体化运行平台
    </div>
  </div>
</template>
<script>
import moment from 'moment'

export default {
  name: "Navigation",
  data() {
    return {
      // 当前时间
      curTime: null,
      // 时间轮询
      curTimer: null
    }
    
  },
  mounted() {
    this.curTimer = setInterval(() => {
      this.curTime = moment().format('YYYY-MM-DD HH:MM:ss');
    }, 1000);
  },
  //销毁
  destroyed() {
    clearInterval(this.curTimer);
  },
  methods: {}
};
</script>
<style lang="scss" scoped>
.top {
  position: absolute;
  top: 0;
  height: 71px;
  width: 1920px;
  display: flex;
  background-color: #001927;
  background: url('../images/title-bg.png');
  .top-left {
      display: flex;
      margin-left: 250px;//距离最左侧距离
      .top-left-weather {
          height: 55px;//整体高度设置
          width: 380px;//整体宽度设置
          display: flex;
          align-items: center;
          img {//图片设置
              height: 35px;
          }
          span {//字体设置
              margin-left: 8px;
              height: 35px;
              font-size: 19px;
              font-weight: 500;
              color: #e4e3e3;
              white-space: nowrap;    // 防止换行
              overflow: hidden;       // 超出部分隐藏
              text-overflow: ellipsis; // 超出显示省略号（可选）
              line-height: 35px;      // 垂直居中
          }
      }
      .top-left-menu {
          display: flex;
          position: absolute;
          left: 350px;
          width: 450px;
          height: 50px;
          line-height: 50px;
          .top-left-menu-item {
              display: flex;
              justify-content: flex-end;
              align-items: center;
              width: 100px;
              font-size: 16px;
              color: #e4e3e3;
              a {
                  display: flex;
                  justify-content: flex-start;
                  align-items: center;
              }
              &:hover {
                  cursor: pointer;
                  color: #fff;
                  font-size: 25px;
              }
              img {
                  width: 30px;
                  height: 32px;
                  margin-right: 5px;
              }
          }
      }
  }
  .t-center {
      position: absolute;
      left: 710px;
      width: 500px;
      height: 71px;
      line-height: 71px;
      font-size: 33px;
      font-weight: bold;
      color: #FFFFFF;
      text-shadow: 0px 5px 9px rgba(0, 0, 0, 0.57);
      background: linear-gradient(180deg, #FFFFFF 0%, #20C7FF 100%);
      background-clip: text;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
  }
  
      
  
}
</style>
