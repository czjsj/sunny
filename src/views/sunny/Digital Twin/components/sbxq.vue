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
          设备台账信息
        </div>
      </div>
      
      <div class="s-content">
        <div class="s-c-item">
          <div class="s-c-i-label"><span>设备名称</span></div>
          <div class="s-c-i-value" style="color: #FF4747">{{ currentDevice.name }}</div>
        </div>
        <div class="s-c-item">
          <div class="s-c-i-label"><span>生产厂家</span></div>
          <div class="s-c-i-value">{{ currentDevice.factory }}</div>
        </div>
        <div class="s-c-item">
          <div class="s-c-i-label"><span>规格型号</span></div>
          <div class="s-c-i-value">{{ currentDevice.model }}</div>
        </div>
        <div class="s-c-item">
          <div class="s-c-i-label"><span>投运时间</span></div>
          <div class="s-c-i-value">{{ currentDevice.date }}</div>
        </div>
      </div>

      <div class="s-label">
        <div class="s-l-flag" />
        <div class="s-l-text">
          实时告警详情
        </div>
      </div>
      <div class="s-content text-area warning-box">
        {{ currentDevice.alertDetail }}
      </div>
      
      <div class="s-label">
        <div class="s-l-flag" />
        <div class="s-l-text">
          AI 智能检修建议
        </div>
        <div class="ai-tag">AI Generated</div>
      </div>
      <div class="s-content text-area ai-box">
        <div v-if="aiLoading" class="loading-text">正在分析设备遥测数据...</div>
        <div v-else style="white-space: pre-wrap;">{{ currentDevice.aiSuggestion }}</div>
      </div>

      <div class="bottom-ctrl-area">
        <div class="s-label-mini">
          <div class="s-l-flag" />
          <div class="s-l-text">人员维护</div>
        </div>
        
        <div class="ctrl-row">
          <div class="maintain-btns">
            <div class="btn">系统匹配</div>
            <div class="btn">人工指派</div>
          </div>
          
          <div class="switch-btns">
            <div class="s-btn" @click="switchDevice(-1)">&lt; 上一台</div>
            <div class="s-btn" @click="switchDevice(1)">下一台 &gt;</div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script>
// 可以在这里引入 axios，例如 import axios from 'axios'

export default {
  name: "Sbxq",
  data() {
    return {
      currentIndex: 0,
      aiLoading: false, // 控制 AI 加载状态
      
      // 【修改点】独立的数据源，包含告警详情和初始建议
      deviceList: [
        { 
          id: 0,
          name: "2# 主变压器 ", 
          factory: "山东达驰电气有限公司", 
          model: "S7-10/0.4-500kvA", 
          date: "2019/12/04",
          alertDetail: "正在检测故障",
          aiSuggestion: "AI分析服务连接中..."
        },
        { 
          id: 1,
          name: "8# 风电机组 ", 
          factory: "金风科技", 
          model: "GW 1500", 
          date: "2021/06/01",
          alertDetail: "正在检测故障",
          aiSuggestion: "AI分析服务连接中..."
        },
      ],
    };
  },
  computed: {
    currentDevice() {
      return this.deviceList[this.currentIndex];
    }
  },
  watch: {
    // 监听设备切换，每次切换都重新请求 AI 建议
    currentIndex(newVal) {
      this.getAiSuggestion(newVal);
    },
    mounted() {
      // 默认请求 AI 建议
      this.initAiWebSocket();
    }
  },
  methods: {
    switchDevice(direction) {
      let newIndex = this.currentIndex + direction;
      if (newIndex < 0) newIndex = this.deviceList.length - 1;
      if (newIndex >= this.deviceList.length) newIndex = 0;
      this.currentIndex = newIndex;
      this.$emit('switchDevice', newIndex); 
    },
    initAiWebSocket() {
  const ws = new WebSocket('ws://127.0.0.1:8766');

  ws.onopen = () => {
    console.log('🤖 AI 智能分析服务已连接');
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      // 检查数据完整性
      if (typeof data.id !== 'undefined') {
        const targetDevice = this.deviceList.find(d => d.id === data.id);
        
        if (targetDevice) {
          // 1. 更新 AI 建议
          if (data.suggestion) {
            targetDevice.aiSuggestion = data.suggestion;
          }
          
          // 2. 【新增】更新故障详情内容
          if (data.alert_detail) {
            targetDevice.alertDetail = data.alert_detail;
          }

          // 打印日志方便调试
          if (this.currentDevice.id === data.id) {
             console.log(`更新设备 [${targetDevice.name}] 的故障与建议`);
          }
        }
      }
    } catch (e) {
      console.error('AI 数据解析失败:', e);
    }
  };

      ws.onclose = () => {
        console.log('AI 服务断开，5秒后重连...');
        setTimeout(this.initAiWebSocket, 5000);
      };
    },
  }
};
</script>

<style lang="scss" scoped>
@import "../styles/card.scss";

.sbxq-content {
  // 【修改点】拉高面板高度，容纳更多文字
  height: 750px !important; 
  padding-top: 20px!important;
  display: flex;
  flex-direction: column;

  .s-label {
    height: 30px;
    display: flex;
    align-items: center;
    margin-top: 10px;
    .s-l-flag { width: 4px; height: 20px; border-radius: 4px; background: #428bfe; margin-right: 10px; }
    .s-l-text { font-size: 18px; color: #428bfe; }
    // AI 标签样式
    .ai-tag {
      margin-left: 10px;
      background: linear-gradient(90deg, #6f00ff, #00d4ff);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      color: #fff;
      font-weight: bold;
    }
  }

  .s-content {
    padding-top: 5px;
    padding-bottom: 10px;
    
    .s-c-item {
      width: 100%;
      height: 32px;
      line-height: 32px;
      padding-left: 14px;
      color: #e4e3e3;
      display: flex;
      .s-c-i-label { width: 100px; font-size: 16px; color: #428bfe; }
      .s-c-i-value { flex: 1; font-size: 16px; color: #c1c1c1; }
    }
    
    // 文本区域样式
    &.text-area {
      padding: 10px 15px;
      font-size: 15px;
      line-height: 1.6;
      border-radius: 4px;
      min-height: 80px;
    }
    
    // 告警框样式
    &.warning-box {
      background: rgba(255, 71, 71, 0.1);
      color: #ff6b6b;
      border: 1px solid rgba(255, 71, 71, 0.3);
    }

    // AI 建议框样式
    &.ai-box {
      background: rgba(66, 139, 254, 0.1);
      color: #00e6ff;
      border: 1px solid rgba(66, 139, 254, 0.3);
      min-height: 150px; // AI建议通常比较长
      font-family: "Microsoft YaHei", sans-serif;
      
      .loading-text {
        color: #aaa;
        font-style: italic;
        animation: blink 1.5s infinite;
      }
    }
    
    img { width: 100%; height: 120px; object-fit: contain; }
  }

  // 底部区域 (保持不变)
  .bottom-ctrl-area {
    margin-top: auto;
    padding-bottom: 10px;
    // ... 样式保持原样 ...
    .s-label-mini { display: flex; align-items: center; margin-bottom: 5px; .s-l-flag { width: 3px; height: 15px; background: #428bfe; margin-right: 8px; } .s-l-text { color: #428bfe; font-size: 16px; } }
    .ctrl-row { display: flex; justify-content: space-between; align-items: center; padding: 0 10px; .maintain-btns { .btn { font-size: 14px; color: #c1c1c1; border: 1px solid #428bfe; padding: 4px 10px; display: inline-block; margin-right: 10px; cursor: pointer; border-radius: 4px; &:hover { background: rgba(66, 139, 254, 0.3); color: #fff; } } } .switch-btns { display: flex; gap: 10px; .s-btn { background: rgba(255, 71, 71, 0.2); border: 1px solid #FF4747; color: #FF4747; padding: 5px 15px; font-size: 14px; cursor: pointer; border-radius: 4px; user-select: none; transition: all 0.3s; &:hover { background: #FF4747; color: #fff; } &:active { transform: scale(0.95); } } } }
  }
}

@keyframes blink { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }

.v-card {
  .c-title {
      border-left: 2px solid rgba(255, 71, 71, 1)!important;
      border-right: 2px solid rgba(255, 71, 71, 1)!important;
      .c-t-content { color: #fff!important; background: rgba(255, 71, 71, 0.6)!important; }
  }
  .c-content { background: rgba(0, 0, 0, 0.8)!important; }
}
</style>