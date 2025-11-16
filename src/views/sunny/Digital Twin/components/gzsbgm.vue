<template>
  <div class="v-card">
    <div class="c-title">
      <div class="c-t-content">
        <div class="c-t-c-center">
          感知设备规模
        </div>
      </div>
    </div>
    <div class="c-content gzsbgm-content">
      <div class="z-c-sum">
        <el-row :gutter="20">
          <el-col :span="6">
            <div class="z-c-s-item zs">
              <div class="z-c-s-i-top">
                <span class="dot" />
                <span>总数</span>
              </div>
              <div class="z-c-s-i-bottom">
                2385
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="z-c-s-item zx">
              <div class="z-c-s-i-top">
                <span class="dot" />
                <span>在线</span>
              </div>
              <div class="z-c-s-i-bottom">
                1112
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="z-c-s-item lx">
              <div class="z-c-s-i-top">
                <span class="dot" />
                <span>离线</span>
              </div>
              <div class="z-c-s-i-bottom">
                327
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="z-c-s-item gj">
              <div class="z-c-s-i-top">
                <span class="dot" />
                <span>告警</span>
              </div>
              <div class="z-c-s-i-bottom">
                52
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
      <div class="z-c-details">
        <el-row :gutter="20">
          <el-col
            v-for="(item, index) in gzsbList"
            :key="index"
            :span="12"
          >
            <div class="z-c-d-item">
              <div class="z-c-d-i-left">
                <img
                  src="../images/beadhouse.png"
                >
              </div>
              <div class="z-c-d-i-right">
                <div class="z-c-d-i-r-top">
                  {{ item.value }}
                </div>
                <div class="z-c-d-i-r-bottom">
                  {{ item.name }}
                </div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </div>
  </div>
</template>
<script>

export default {
  name: "Gzsbgm",
  data() {
    return {
      gzsbList: [
        { name: "高压探测器", value: 36 },
        { name: "红外被动探测器", value: 106 },
        { name: "溶解氧传感器", value: 36 },
        { name: "烟感探测器", value: 72 },
        { name: "水浸探测室", value: 79 },
        { name: "玻璃破碎探测器", value: 12 },
        { name: "风机房", value: 2 },
        { name: "巡更锚点", value: 138 }
      ]
    };
  },
  mounted() {
  },
  destroyed() {
  },
  methods: {}
};
</script>
<style lang="scss" scoped>
@import "../styles/card.scss";
.gzsbgm-content {
  height: 320px;
  padding-top: 15px;
  .z-c-sum {
    height: 80px;
    line-height: 80px;
    padding-top: 10px;
    .z-c-s-item {
        height: 26px;
        line-height: 26px;
        text-align: center;
        .z-c-s-i-top {
            color: #428bfe;
            font-size: 14px;
            height: 14px;
            line-height: 14px;
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            .dot {
              width: 5px;
              height: 5px;
              margin-right: 5px;
              border-radius: 50%;
            }
        }
        .z-c-s-i-bottom {
            line-height: 18px;
            font-size: 23px;
            height: 18px;
        }
    }
    .zs {
      .z-c-s-i-bottom {
        color: #02A4F7;
      }
    }
    .zx {
      .dot {
        background: #37AB8D;
      }
      .z-c-s-i-bottom {
        color: #37AB8D;
      }
    }
    .lx {
      .dot {
        background: #c1c1c1;
      }
      .z-c-s-i-bottom {
        color: #c1c1c1;
      }
    }
    .gj {
      .dot {
        background: #FF4747;
      }
      .z-c-s-i-bottom {
        color: #FF4747;
      }
    }
  }
  .z-c-details {
      // padding: 0 40px;
      height: 100%;
      .z-c-d-item {
          height: 40px;
          width: 100%;
          display: flex;
          margin-bottom: 15px;
          .z-c-d-i-left {
              width: 40px;
              height: 40px;
              img {
                  width: 30px;
                  height: 30px;
                  margin-top: 5px;
              }
          }
          .z-c-d-i-right {
              flex: 1;
              .z-c-d-i-r-top {
                  height: 22px;
                  font-size: 22px;
                  font-weight: bold;
                  color: #02A4F7;
                  line-height: 22px;
              }
              .z-c-d-i-r-bottom {
                  font-size: 12px;
                  height: 12px;
                  color: #c1c1c1;
                  margin-top: 5px;
              }
          }
      }
  }
}
</style>
