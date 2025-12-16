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
  
  /* ================== 【新增】赛博朋克导航样式 ================== */
  /* 倒梯形造型 */
  clip-path: var(--tech-clip-trapezoid, none);
  background: var(--tech-glass-bg, rgba(0, 25, 39, 0.35));
  backdrop-filter: var(--tech-glass-blur, none);
  -webkit-backdrop-filter: var(--tech-glass-blur, none);
  border-bottom: 2px solid var(--tech-primary, #00f0ff);
  box-shadow: var(--tech-border-glow, 0 0 20px rgba(0, 240, 255, 0.4));
  
  /* 浏览器兼容性回退 */
  @supports not (backdrop-filter: blur(10px)) {
    background: rgba(0, 25, 39, 0.35);
  }
  
  @supports not (clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%)) {
    background: url('../images/title-bg.png');
    background-color: #001927;
  }
  .top-left {
      display: flex;
      margin-left: 250px;//距离最左侧距离
      .top-left-weather {
          height: 60px;//整体高度设置
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
      left: 110px;
      width: 600px;
      height: 71px;
      line-height: 71px;
      
      /* ================== 【新增】赛博朋克标题样式 ================== */
      font-size: 32px;                    /* 增大字体到32px */
      font-weight: bold;
      letter-spacing: 4px;                /* 增加字符间距到4px */
      color: var(--tech-text-primary, #FFFFFF);
      text-shadow: var(--tech-text-glow, 0 0 10px rgba(0, 240, 255, 0.8));
      position: relative;
      
      /* 渐变线装饰 */
      &::after {
        content: '';
        position: absolute;
        bottom: -10px;
        left: 50%;
        transform: translateX(-50%);
        width: 200px;
        height: 2px;
        background: linear-gradient(90deg, transparent, var(--tech-primary, #00f0ff), transparent);
      }
      
      /* 浏览器兼容性回退 */
      @supports not (text-shadow: 0 0 10px rgba(0, 240, 255, 0.8)) {
        background: linear-gradient(180deg, #FFFFFF 0%, #20C7FF 100%);
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0px 5px 9px rgba(0, 0, 0, 0.57);
      }
  }
  
      
  
}
</style>
