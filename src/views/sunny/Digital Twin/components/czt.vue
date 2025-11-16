<template>
  <div class="v-card">
    <div class="c-title">
      <div class="c-t-content">
        <div class="c-t-c-center">
          变电站设备操作台
        </div>
      </div>
    </div>
    <div class="c-content czt-content">
      <el-row :gutter="20">
        <el-col :span="12">
          <dv-decoration-11>
            <div @click="viewEquipmentDetail">
              {{ deviceDetailFlag ? '返回总览信息' : '设备告警信息' }}
            </div>
          </dv-decoration-11>
        </el-col>
        <el-col :span="12">
          <dv-decoration-11>
            <div @click="pushEquipmentWarning">
              {{ warningFlag ? '关闭推送' : '推送告警' }}
            </div>
          </dv-decoration-11>
        </el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col :span="12">
          <dv-decoration-11>
            <div @click="roamCheck">
              漫游巡检
            </div>
          </dv-decoration-11>
        </el-col>
        <el-col :span="12">
          <dv-decoration-11>
            <div @click="realTimeMonitor">
              {{ monitorFlag ? '关闭监控' : '实时监控' }}
            </div>
          </dv-decoration-11>
        </el-col>
      </el-row>


      <el-row :gutter="20">
        <el-col :span="12">
          <dv-decoration-11>
            <div @click="masterControlView">
              主控室视角
            </div>
          </dv-decoration-11>
        </el-col>
        <el-col :span="12">
          <dv-decoration-11>
            <div @click="cockpitControlView">
              驾驶舱视角
            </div>
          </dv-decoration-11>
        </el-col>
      </el-row>
    </div>
  </div>
</template>


<script>
export default {
  name: "Czt",
  data() {
    return {
      warningFlag: false,
      deviceDetailFlag: false,
      monitorFlag: false
    };
  },
  mounted() {
  },
  destroyed() {},
  methods: {
    pushEquipmentWarning() {
      this.warningFlag = !this.warningFlag
      this.$emit('pushEquipmentWarning', this.warningFlag)
    },
    viewEquipmentDetail() {
      this.deviceDetailFlag = !this.deviceDetailFlag
      this.$emit('viewEquipmentDetail', this.deviceDetailFlag)
    },
    roamCheck() {
      this.$emit('roamCheck')
    },
    realTimeMonitor() {
      this.monitorFlag = !this.monitorFlag
      this.$emit('realTimeMonitor', this.monitorFlag)
    },
    masterControlView() {
      this.$emit('masterControlView')
    },
    cockpitControlView() {
      this.$emit('cockpitControlView')
    },
  }
};
</script>
<style lang="scss" scoped>
@import "../styles/card.scss";
.czt-content {
  height: 320px;
  padding-top: 30px!important;
  .dv-decoration-11 {
    width: 150px;
    height: 60px;
    margin-bottom: 30px;
    color: #c1c1c1;
    &:hover {
      cursor: pointer;
    }
  }
}
</style>
