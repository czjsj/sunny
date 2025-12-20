<template>
  <transition name="tech-fade">
    <div v-if="visible" class="fault-modal-overlay">
      <div class="tech-bg-grid"></div>
      
      <div class="fault-card">
        <div class="corner-decoration top-left"></div>
        <div class="corner-decoration top-right"></div>
        <div class="corner-decoration bottom-left"></div>
        <div class="corner-decoration bottom-right"></div>

        <div class="card-header">
          <div class="header-title">
            <span class="warning-icon">⚠️</span>
            <span class="glitch-text" :data-text="'系统警报 // 单元 #' + turbineId">
              系统警报 // 单元 #{{ turbineId }}
            </span>
          </div>
          <div class="header-controls">
            <div class="status-indicator">实时监控中</div>
            <span class="close-btn" @click="closeModal">×</span>
          </div>
        </div>

        <div class="card-body">
          <div class="left-panel">
            <div class="panel-label">全息视图</div>
            <div id="mini-turbine-container" class="model-preview">
              <div class="scan-line"></div>
            </div>
            <div class="model-footer-data">
              <span>转速：<b class="num">12.5</b> RPM</span>
              <span>风速：<b class="num">8.4</b> m/s</span>
            </div>
          </div>
          
          <div class="right-panel">
            <div class="switch-tabs">
              <div :class="['tech-tab', { active: isVoltageFault }]">
                <span class="tab-icon">⚡</span> 电压跌落分析
              </div>
              <div :class="['tech-tab', { active: !isVoltageFault }]">
                <span class="tab-icon">⚙️</span> 部件健康度
              </div>
            </div>
            
            <div class="info-content">
              <div class="data-row">
                <div class="data-block">
                  <span class="label">故障代码</span>
                  <span class="value code-font">{{ faultId }}</span>
                </div>
                <div class="data-block flex-grow">
                  <span class="label">系统日志</span>
                  <span class="value text-glow">{{ faultDescription }}</span>
                </div>
              </div>
              
              <div v-if="isVoltageFault" class="chart-container">
                <div class="chart-header">波形分析</div>
                <div id="ui-chart" style="width: 100%; height: 100%;"></div>
                <div class="chart-warning-overlay">
                  <span class="warning-blink">⚠️ 电压严重跌落！ ⚠️</span>
                </div>
              </div>
              
              <div v-else class="status-container">
                <div class="status-item" v-for="(item, index) in statusItems" :key="index">
                  <div class="status-header">
                    <span class="status-name">{{ item.name }}</span>
                    <span :class="['status-val', item.status]">{{ item.valueDisplay }}</span>
                  </div>
                  <div class="tech-progress-bg">
                    <div 
                      :class="['tech-progress-fill', item.status]" 
                      :style="{ width: item.percent + '%' }"
                    >
                      <div class="glow-tip"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="suggestion-panel" :class="{ 'panel-open': showAdvice }">
          <div class="panel-handle" @click="showAdvice = !showAdvice">
            <div class="handle-content">
              <span class="ai-icon"></span>
              <span>ANYTHING-LLM 智能AI分析</span>
              <span class="arrow">{{ showAdvice ? '▼ 最小化' : '▲ 展开' }}</span>
            </div>
          </div>
          <div v-if="showAdvice" class="ai-content">
            <div class="terminal-window">
              <div class="terminal-header">
                <span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span>
                <span class="cmd-title">root@ai-core:~# analysis_protocol.sh</span>
              </div>
              <div class="typing-effect">
                <span class="prompt">></span> {{ aiAdviceText }}<span class="cursor">_</span>
              </div>
            </div>
            <button class="solve-btn" @click="resolveFault">
              <span class="btn-text">确认故障修复</span>
              <div class="btn-glare"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as echarts from "echarts";

export default {
  name: "FaultMonitor",
  props: ['visible', 'turbineId', 'faultId'], 
  data() {
    return {
      faultDescription: '正在分析数据流...',
      showAdvice: true,
      aiAdviceText: "",
      uiChart: null,
      
      sockets: { curve: null, advice: null, resolve: null },
      
      scene: null, camera: null, renderer: null, turbineMesh: null, animationId: null,
      typeTimer: null, // 补全定时器变量
      
      statusItems: [
        { name: '齿轮箱振动', valueDisplay: '0.8g (严重)', percent: 95, status: 'danger' },
        { name: '发电机温度', valueDisplay: '85°C (警告)', percent: 70, status: 'warning' },
        { name: '偏航对齐误差', valueDisplay: '0.2° (正常)', percent: 10, status: 'normal' },
      ]
    };
  },
  computed: {
    isVoltageFault() {
      // 假设大于等于1000是电压类故障
      return parseInt(this.faultId) >= 1000;
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.aiAdviceText = "正在建立安全连接...";
        this.connectDetailSockets(); 
        this.$nextTick(() => {
          this.initMini3D();
          // 稍微增加延迟，确保 DOM 元素已经完全渲染
          if (this.isVoltageFault) {
            setTimeout(() => {
              this.initChart();
            }, 100); 
          }
        });
      } else {
        this.closeAllSockets();
        this.dispose3D();
        this.disposeChart(); // 关闭时彻底销毁图表
      }
    },
    // 监听 faultId 变化
    faultId(newVal, oldVal) {
      if (newVal !== oldVal && this.visible) {
        this.aiAdviceText = '正在重新获取分析数据...';
        if(this.typeTimer) clearInterval(this.typeTimer);
        
        this.connectDetailSockets();
        
        this.faultDescription = this.isVoltageFault ? "LVRT 触发：电网连接点检测到电压跌落。" : "传感器警报：相关部件参数超出阈值。";

        if (this.isVoltageFault) {
            this.$nextTick(() => {
                this.initChart();
            });
        }
      }
    }
  },
  beforeDestroy() {
    this.closeAllSockets();
    this.dispose3D();
    this.disposeChart(); // 组件销毁时清理图表
  },
  methods: {
    // --- 核心连接逻辑 (此前丢失的部分已补全) ---
    connectDetailSockets() {
      this.closeAllSockets();
      // 模拟 WebSocket 连接
      if (this.isVoltageFault) {
        this.sockets.curve = new WebSocket('ws://localhost:9754'); // 模拟地址
        this.sockets.curve.onopen = () => this.requestCurveData();
        this.sockets.curve.onmessage = (e) => this.updateChart(JSON.parse(e.data));
        
        // 如果连接失败或没有后端，我们在演示模式下直接触发模拟数据
        // (为了保证你在没有后端时也能看到效果，保留这个模拟触发)
        setTimeout(() => this.requestCurveData(), 500);
      }
      
      this.sockets.advice = new WebSocket('ws://localhost:9756');
      this.sockets.advice.onopen = () => this.requestAIAdvice();
      this.sockets.advice.onmessage = (e) => this.typeWriterEffect(JSON.parse(e.data).advice);
      
      this.sockets.resolve = new WebSocket('ws://localhost:9758');
    },
    
    requestCurveData() { 
        // 演示用模拟数据
        const mockCurveData = [1.01, 1.00, 1.02, 1.01, 1.00, 0.99, 0.15, 0.12, 0.13, 0.15, 0.95, 0.98, 1.01, 1.00, 1.02, 1.01, 0.90, 0.85, 0.95, 1.01];
        this.updateChart({ curve: mockCurveData });
        
        // 真实发送逻辑
        if (this.sockets.curve?.readyState === 1) {
            // this.sockets.curve.send(JSON.stringify({ fault_id: this.faultId, turbine_id: this.turbineId }));
        } 
    },

    requestAIAdvice() { 
      if (this.sockets.advice?.readyState === 1) {
         this.faultDescription = this.isVoltageFault ? "LVRT 触发：电网连接点检测到电压跌落。" : "传感器警报：部件参数超标。";
         this.aiAdviceText = ''; 
         this.sockets.advice.send(JSON.stringify({ fault_id: this.faultId, description: this.faultDescription, lang: 'zh-CN' }));
      } else {
         // 演示用：如果没连接后端，自动显示一段文本
         setTimeout(() => {
             this.typeWriterEffect(this.isVoltageFault ? 
                "检测到 ID 1002 为严重电压跌落事件。建议：1. 立即检查变流器 LVRT 系统激活情况。 2. 验证无功功率补偿系统。 3. 监控直流母线电压。" : 
                "检测到 ID 101 振动异常。建议检查齿轮箱油温及偏航电机间隙。");
         }, 1000);
      }
    },

    resolveFault() {
       if (this.sockets.resolve?.readyState === 1) this.sockets.resolve.send(JSON.stringify({ fault_id: this.faultId, turbine_id: this.turbineId }));
       this.disposeChart(); // 关键：点击修复时清理图表
       this.$emit('resolve');
    },

    closeAllSockets() { Object.values(this.sockets).forEach(ws => ws && ws.close()); },
    closeModal() { this.$emit('close'); },

    // --- 图表相关方法 ---
    
    disposeChart() {
      if (this.uiChart) {
        this.uiChart.dispose();
        this.uiChart = null;
      }
    },

    initChart() {
      const dom = document.getElementById('ui-chart');
      if (!dom) return;
      
      // 先清理旧实例
      this.disposeChart();
      
      const axisColor = '#ff2a2a'; // 红色轴线

      this.uiChart = echarts.init(dom);
      this.uiChart.setOption({
        backgroundColor: 'transparent',
        grid: { top: 40, bottom: 30, left: 50, right: 20, containLabel: false },
        tooltip: { 
          trigger: 'axis', 
          backgroundColor: 'rgba(40, 0, 0, 0.9)', 
          borderColor: axisColor, 
          textStyle: { color: '#fff', fontFamily: 'Consolas' },
          axisPointer: { type: 'cross', label: { backgroundColor: axisColor, color: '#000' } },
          formatter: (params) => {
              let res = `<div>⏱ 采样点: ${params[0].axisValue}</div>`;
              params.forEach(item => {
                  res += `<div style="color:${item.color}">⚡ 电流(标幺值): ${item.value.toFixed(3)} pu</div>`;
              });
              return res;
          }
        },
        xAxis: { 
          type: 'category', 
          boundaryGap: false,
          data: Array.from({length: 20}, (_, i) => i * 2),
          axisLine: { lineStyle: { color: axisColor, opacity: 0.5 } },
          axisLabel: { color: axisColor, fontFamily: 'Consolas' },
          splitLine: { show: true, lineStyle: { color: axisColor, opacity: 0.1 } }
        },
        yAxis: { 
          type: 'value', 
          min: 0, max: 1.2, 
          splitLine: { lineStyle: { color: axisColor, opacity: 0.1, type: 'dashed' } },
          axisLabel: { color: axisColor, fontFamily: 'Consolas' },
          axisLine: { show: true, lineStyle: { color: axisColor, opacity: 0.5 } }
        },
        series: []
      });
    },

    updateChart(data) {
      if (!this.uiChart) this.initChart();
      if (!data || !data.curve) return; // 安全检查

      const axisColor = '#ff2a2a'; 

      this.uiChart.setOption({
        xAxis: { data: data.curve.map((_, i) => i * 2) },
        series: [{
          name: 'Current (pu)',
          type: 'line',
          smooth: true,
          showSymbol: false,
          data: data.curve,
          lineStyle: { width: 4, color: axisColor, shadowBlur: 15, shadowColor: axisColor },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(255, 42, 42, 0.6)' }, 
              { offset: 1, color: 'rgba(255, 42, 42, 0.05)' }
            ])
          },
          markLine: {
              symbol: 'none',
              label: { show: false },
              lineStyle: { color: '#ff0', type: 'dashed', width: 1 },
              data: [ { yAxis: 0.8 }, { yAxis: 0.2 } ]
          }
        }]
      });
    },

    // --- 3D 场景逻辑 ---
    initMini3D() {
        const container = document.getElementById('mini-turbine-container');
        if (!container) return;
        
        // 清理 DOM 防止重复 canvas
        while(container.firstChild) container.removeChild(container.firstChild);
        
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x050a14, 0.002);
        this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(this.renderer.domElement);
        
        this.camera = new THREE.PerspectiveCamera(45, container.clientWidth/container.clientHeight, 0.1, 2000);
        this.camera.position.set(120, 80, 180);
        
        const ambientLight = new THREE.AmbientLight(0x404040, 2); 
        this.scene.add(ambientLight);
        const blueLight = new THREE.PointLight(0x00e6ff, 2, 300);
        blueLight.position.set(50, 100, 50);
        this.scene.add(blueLight);
        const redLight = new THREE.PointLight(0xff0055, 1, 300); 
        redLight.position.set(-50, 0, -50);
        this.scene.add(redLight);
        
        const gridHelper = new THREE.GridHelper(400, 40, 0x004444, 0x002222);
        gridHelper.position.y = -60;
        this.scene.add(gridHelper);
        
        const controls = new OrbitControls(this.camera, this.renderer.domElement);
        controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 1.5;
        
        const loader = new GLTFLoader();
        loader.load('/sunny-substation/models/风机10.glb', (gltf) => {
            this.turbineMesh = gltf.scene;
            const box = new THREE.Box3().setFromObject(this.turbineMesh);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            this.turbineMesh.position.sub(center);
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 120 / maxDim; 
            this.turbineMesh.scale.setScalar(scale);
            this.turbineMesh.position.y = -60;
            
            this.turbineMesh.traverse((child) => {
                if (child.isMesh) {
                    child.material.emissive = new THREE.Color(0x001133);
                    child.material.emissiveIntensity = 0.2;
                }
            });
            this.scene.add(this.turbineMesh);
            
            const animate = () => {
                this.animationId = requestAnimationFrame(animate);
                controls.update();
                const rotor = this.turbineMesh.getObjectByName("Rotor");
                if (rotor) rotor.rotateX(0.05);
                this.renderer.render(this.scene, this.camera);
            };
            animate();
        });
    },

    dispose3D() {
        if (this.animationId) cancelAnimationFrame(this.animationId);
        if (this.renderer) { 
            this.renderer.dispose(); 
            this.renderer.forceContextLoss();
            this.renderer = null; 
        }
        this.scene = null;
        this.turbineMesh = null;
    },

    typeWriterEffect(text) {
      if (!text) return;
      this.aiAdviceText = "";
      let i = 0;
      if (this.typeTimer) clearInterval(this.typeTimer);
      
      this.typeTimer = setInterval(() => {
        if (i < text.length) {
          this.aiAdviceText += text.charAt(i);
          i++;
        } else {
          clearInterval(this.typeTimer);
        }
      }, 30);
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Share+Tech+Mono&display=swap');

/* 全局变量定义 */
:root {
  --tech-cyan: #00f3ff;
  --tech-blue: #0066ff;
  --tech-bg: #050a14;
  --tech-panel: rgba(10, 20, 35, 0.85);
  --tech-alert: #ff2a2a; /* 定义红色警报色 */
}

/* 字体设置 - 优先使用中文字体，后备科技字体 */
.fault-card {
  font-family: "Microsoft YaHei", "PingFang SC", 'Share Tech Mono', monospace;
}

/* ... (省略未修改的基础样式，如遮罩层、背景网格、主卡片结构等，保持原样) ... */
.fault-modal-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(5px); z-index: 9999; display: flex; justify-content: center; align-items: center; }
.tech-bg-grid { position: absolute; width: 100%; height: 100%; background-image: linear-gradient(rgba(0, 243, 255, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 243, 255, 0.05) 1px, transparent 1px); background-size: 50px 50px; pointer-events: none; }
.fault-card { width: 85vw; max-width: 1400px; height: 80vh; max-height: 900px; background: var(--tech-panel); border: 1px solid rgba(0, 243, 255, 0.2); clip-path: polygon( 20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px ); box-shadow: 0 0 50px rgba(0, 243, 255, 0.1); display: flex; flex-direction: column; position: relative; color: #fff; }
.corner-decoration { position: absolute; width: 20px; height: 20px; border: 2px solid var(--tech-cyan); transition: all 0.3s; } .top-left { top: 0; left: 0; border-right: none; border-bottom: none; } .top-right { top: 0; right: 0; border-left: none; border-bottom: none; } .bottom-left { bottom: 0; left: 0; border-right: none; border-top: none; } .bottom-right { bottom: 0; right: 0; border-left: none; border-top: none; }
.card-header { height: 60px; padding: 0 30px; background: linear-gradient(90deg, rgba(0,243,255,0.1), transparent 60%); border-bottom: 1px solid rgba(0,243,255,0.3); display: flex; justify-content: space-between; align-items: center; }
.header-title { display: flex; align-items: center; gap: 10px; font-size: 20px; font-family: "Microsoft YaHei", 'Orbitron', sans-serif; letter-spacing: 1px; }
.warning-icon { animation: blink 1s infinite; }
.header-controls { display: flex; align-items: center; gap: 20px; }
.status-indicator { font-size: 12px; padding: 2px 8px; border: 1px solid var(--tech-cyan); color: var(--tech-cyan); background: rgba(0,243,255,0.1); box-shadow: 0 0 10px rgba(0,243,255,0.2); }
.close-btn { font-size: 32px; color: #666; cursor: pointer; line-height: 1; } .close-btn:hover { color: var(--tech-cyan); text-shadow: 0 0 10px var(--tech-cyan); }
.card-body { flex: 1; display: flex; overflow: hidden; position: relative; }
.left-panel { width: 35%; border-right: 1px solid rgba(0,243,255,0.2); position: relative; display: flex; flex-direction: column; background: radial-gradient(circle at 50% 50%, rgba(0,30,60,0.5), transparent); }
.panel-label { position: absolute; top: 10px; left: 10px; font-size: 12px; color: rgba(0,243,255,0.5); letter-spacing: 2px; }
.model-preview { flex: 1; position: relative; overflow: hidden; }
.scan-line { position: absolute; width: 100%; height: 2px; background: var(--tech-cyan); box-shadow: 0 0 10px var(--tech-cyan); top: 0; opacity: 0.5; animation: scan 4s linear infinite; z-index: 10; }
.model-footer-data { height: 40px; border-top: 1px solid rgba(0,243,255,0.2); display: flex; justify-content: space-around; align-items: center; font-size: 14px; color: #88a; background: rgba(0,0,0,0.3); } .model-footer-data .num { color: var(--tech-cyan); margin-left: 5px; }
.right-panel { width: 65%; padding: 30px; display: flex; flex-direction: column; }

/* 切换标签 */
.switch-tabs { display: flex; gap: 20px; margin-bottom: 25px; border-bottom: 2px solid rgba(255,255,255,0.05); }
.tech-tab {
  padding: 10px 20px; cursor: pointer; color: #667; transition: 0.3s;
  border-bottom: 2px solid transparent; font-size: 16px;
}
/* 2. 如果是电压故障，激活的 Tab 改为红色系 */
.tech-tab.active { color: var(--tech-alert); border-bottom-color: var(--tech-alert); text-shadow: 0 0 8px rgba(255, 42, 42, 0.4); }

/* 信息内容 */
.info-content { flex: 1; display: flex; flex-direction: column; }
.data-row { display: flex; gap: 20px; margin-bottom: 20px; }
/* 2. 修改数据块左侧边框为红色 */
.data-block { background: rgba(255, 42, 42, 0.05); padding: 10px 15px; border-left: 3px solid var(--tech-alert); }
.data-block.flex-grow { flex: 1; }
.data-block .label { display: block; font-size: 12px; color: #aaa; margin-bottom: 5px; }
.data-block .value { font-size: 16px; color: #fff; }
/* 2. 修改代码字体颜色为红色 */
.code-font { font-family: 'Orbitron'; color: var(--tech-alert); font-weight: bold; }
.text-glow { text-shadow: 0 0 5px rgba(255, 42, 42, 0.4); }

/* 图表容器修改 */
.chart-container { 
  flex: 1; background: rgba(20, 0, 0, 0.3); /* 背景偏红 */
  border: 1px solid rgba(255, 42, 42, 0.3); /* 边框变红 */
  position: relative; padding: 10px;
}
.chart-header { position: absolute; top: 10px; right: 10px; font-size: 12px; color: var(--tech-alert); opacity: 0.7; }

/* 2. 新增：图表警报覆盖层样式 */
.chart-warning-overlay {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  z-index: 10; pointer-events: none; /* 不阻挡鼠标与图表交互 */
}
.warning-blink {
  font-size: 24px; color: var(--tech-alert); font-weight: bold; letter-spacing: 2px;
  text-shadow: 0 0 10px var(--tech-alert), 0 0 20px var(--tech-alert);
  animation: blink-alert 0.8s ease-in-out infinite alternate;
  background: rgba(0, 0, 0, 0.6); padding: 10px 20px; border: 2px solid var(--tech-alert);
}
@keyframes blink-alert { from { opacity: 0.6; transform: scale(1); } to { opacity: 1; transform: scale(1.1); } }

/* 常规状态条 (省略未修改部分) */
.status-container { padding-top: 20px; } .status-item { margin-bottom: 25px; } .status-header { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
.status-val.danger { color: #ff2a2a; } .status-val.warning { color: orange; } .status-val.normal { color: #0f0; }
.tech-progress-bg { height: 8px; background: #112; border-radius: 4px; overflow: hidden; position: relative; }
.tech-progress-fill { height: 100%; position: relative; transition: width 1s ease; }
.tech-progress-fill.danger { background: linear-gradient(90deg, #500, #f00); } .tech-progress-fill.warning { background: linear-gradient(90deg, #530, #fa0); } .tech-progress-fill.normal { background: linear-gradient(90deg, #030, #0f0); }
.glow-tip { position: absolute; right: 0; top: 0; width: 2px; height: 100%; background: #fff; box-shadow: 0 0 10px #fff; }

/* 底部 AI 面板 */
.suggestion-panel {
  height: 250px; background: rgba(5, 10, 20, 0.95);
  /* 2. 边框色改为红色系 */
  border-top: 1px solid var(--tech-alert);
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
  display: flex; flex-direction: column;
}
.panel-handle {
  /* 2.把手背景和边框改为红色系 */
  height: 30px; background: rgba(255, 42, 42, 0.1); cursor: pointer;
  display: flex; justify-content: center; align-items: center; border-bottom: 1px solid rgba(255, 42, 42, 0.1);
}
/* 2.把手文字颜色改为红色系 */
.handle-content { display: flex; gap: 10px; color: var(--tech-alert); font-size: 12px; letter-spacing: 2px; }

.ai-content { flex: 1; padding: 20px; display: flex; gap: 20px; }
.terminal-window {
  flex: 1; background: #000; border: 1px solid #333; padding: 15px;
  font-family: "Microsoft YaHei", 'Consolas', monospace; color: #ddd; overflow-y: auto;
  box-shadow: inset 0 0 20px rgba(0,0,0,0.8);
}
.terminal-header { margin-bottom: 10px; display: flex; align-items: center; gap: 5px; opacity: 0.7; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; } .red { background: #ff5f56; } .yellow { background: #ffbd2e; } .green { background: #27c93f; }
.cmd-title { font-size: 12px; margin-left: 10px; color: #666; }
/* 2. 提示符颜色改为红色系 */
.prompt { color: var(--tech-alert); margin-right: 10px; }
.cursor { animation: blink 1s step-end infinite; }

/* 解决按钮 */
.solve-btn {
  width: 160px; height: 50px; 
  background: rgba(255, 42, 42, 0.8); /* 默认半透明红 */
  border: 1px solid var(--tech-alert); /* 默认有边框 */
  clip-path: polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px);
  color: #fff; font-weight: bold; font-family: "Microsoft YaHei", sans-serif; font-size: 14px;
  cursor: pointer; position: relative; overflow: hidden; align-self: center;
  transition: all 0.3s ease; /* 添加过渡动画 */
  box-shadow: 0 0 10px rgba(255, 42, 42, 0.3);
}

/* 按钮悬停光晕优化 - 仅边缘发光，不做白色填充 */
.solve-btn:hover { 
  background: rgba(255, 42, 42, 0.1); /* 背景变淡，而不是变白 */
  color: #fff; 
  /* 关键修改：
     第一组 shadow: 外发光 (让按钮周围有光晕)
     第二组 shadow: inset 内发光 (让按钮边缘有高亮线条感)
  */
  box-shadow: 
    0 0 20px var(--tech-alert), 
    inset 0 0 15px var(--tech-alert); 
  text-shadow: 0 0 5px #fff; /* 文字稍微发光 */
  transform: translateY(-2px); /* 微微上浮 */
}

/* 扫光动画稍微调弱一点，配合新的深色背景 */
.btn-glare { 
  position: absolute; top: 0; left: -100%; width: 50%; height: 100%; 
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  transform: skewX(-20deg); animation: glare 3s infinite;
}

/* 动画定义 (保持不变) */
@keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
@keyframes blink { 50% { opacity: 0; } }
@keyframes glare { 0% { left: -100%; } 20% { left: 200%; } 100% { left: 200%; } }
.tech-fade-enter-active, .tech-fade-leave-active { transition: all 0.5s ease; }
.tech-fade-enter, .tech-fade-leave-to { opacity: 0; transform: scale(1.1); filter: blur(10px); }
</style>