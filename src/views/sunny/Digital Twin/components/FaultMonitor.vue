<template>
  <transition name="fade">
    <div
      v-if="visible"
      class="fault-modal-overlay"
    >
      <div class="fault-card">
        <div class="card-header">
          <h3>⚠️ 风机异常提醒 - 机组 #{{ turbineId }}</h3>
          <span
            class="close-btn"
            @click="closeModal"
          >×</span>
        </div>

        <div class="card-body">
          <div
            id="mini-turbine-container"
            class="model-preview"
          />
          
          <div class="fault-info">
            <div class="switch-tabs">
              <div
                v-if="isVoltageFault"
                class="tab-active"
              >
                电压跌落分析
              </div>
              <div
                v-else
                class="tab-active"
              >
                常规部件状态
              </div>
            </div>
            
            <div class="info-content">
              <p>故障代码: <span class="highlight">{{ faultId }}</span></p>
              <p class="desc-box">
                故障描述: <span class="highlight">{{ faultDescription }}</span>
              </p>
              
              <div
                v-if="isVoltageFault"
                class="chart-box"
              >
                <div
                  id="ui-chart"
                  style="width: 100%; height: 260px;"
                />
              </div>
              
              <div
                v-else
                class="normal-box"
              >
                <div class="status-item">
                  <span class="label">齿轮箱振动</span>
                  <div class="progress-bar">
                    <div
                      class="fill danger"
                      style="width: 95%"
                    />
                  </div>
                  <span class="value danger">0.8g (超限)</span>
                </div>
                <div class="status-item">
                  <span class="label">发电机温度</span>
                  <div class="progress-bar">
                    <div
                      class="fill warning"
                      style="width: 70%"
                    />
                  </div>
                  <span class="value warning">85°C</span>
                </div>
                <div class="status-item">
                  <span class="label">偏航误差</span>
                  <div class="progress-bar">
                    <div
                      class="fill normal"
                      style="width: 10%"
                    />
                  </div>
                  <span class="value normal">2°</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          class="suggestion-panel"
          :class="{ 'panel-open': showAdvice }"
        >
          <div
            class="panel-handle"
            @click="showAdvice = !showAdvice"
          >
            <span>{{ showAdvice ? '▼ 收起建议' : '▲ 查看 AI 处理建议 (AnythingLLM)' }}</span>
          </div>
          <div
            v-if="showAdvice"
            class="ai-content"
          >
            <div class="typing-effect">
              {{ aiAdviceText }}
            </div>
            <button
              class="solve-btn"
              @click="resolveFault"
            >
              故障已解决
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
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"; // 引入控制器方便调试
import * as echarts from "echarts";

export default {
  name: "FaultMonitor",
  props: ['visible', 'turbineId', 'faultId', 'initialFaultType'], 
  data() {
    return {
      faultDescription: '正在读取数据...',
      showAdvice: true,
      aiAdviceText: "等待分析...",
      uiChart: null,
      
      sockets: {
        curve: null,
        advice: null,
        resolve: null
      },

      // 3D 相关
      scene: null, camera: null, renderer: null, turbineMesh: null, animationId: null
    };
  },
  computed: {
    // 核心逻辑：根据 ID 自动判断类型
    isVoltageFault() {
      // 确保转为数字比较
      return parseInt(this.faultId) >= 1000;//将字符串转换为数字，然后进行比较，返回值是一个布尔值。
    }
  },
  watch: {
    visible(val) {
      if (val) {
        this.aiAdviceText = "AI 正在分析故障日志...";
        // 根据新的 ID 类型判断是否连接曲线端口
        this.connectDetailSockets(); 
        
        // 延迟加载 3D 和 图表，确保 DOM 已渲染
        this.$nextTick(() => {
          this.initMini3D();
          if (this.isVoltageFault) {
            this.initChart();
          }
        });
      } else {
        this.closeAllSockets();
        this.dispose3D(); // 清理资源
      }
    }
  },
  beforeDestroy() {
    this.closeAllSockets();
    this.dispose3D();
  },
  methods: {
    connectDetailSockets() {
      this.closeAllSockets();

      // 1. 只有是电压故障才连接图表端口
      if (this.isVoltageFault) {
        this.sockets.curve = new WebSocket('ws://localhost:9754');
        this.sockets.curve.onopen = () => {
           this.requestCurveData();
        };
        this.sockets.curve.onmessage = (event) => {
          const data = JSON.parse(event.data);
          this.updateChart(data);
        };
      }

      // 2. AI 建议 (总是连接)
      this.sockets.advice = new WebSocket('ws://localhost:9756');
      this.sockets.advice.onopen = () => {
        this.requestAIAdvice();
      };
      this.sockets.advice.onmessage = (event) => {
        const data = JSON.parse(event.data);
        this.typeWriterEffect(data.advice);
      };

      // 3. 解决故障 (总是连接)
      this.sockets.resolve = new WebSocket('ws://localhost:9758');
    },

    requestCurveData() {
      if (this.sockets.curve && this.sockets.curve.readyState === WebSocket.OPEN) {
        this.sockets.curve.send(JSON.stringify({ fault_id: this.faultId, turbine_id: this.turbineId }));
      }
    },

    requestAIAdvice() {
      if (this.sockets.advice && this.sockets.advice.readyState === WebSocket.OPEN) {
        // 更新描述文本，如果后端有发过来，这里只是模拟
        this.faultDescription = this.isVoltageFault 
          ? "检测到并网点电压异常跌落，触发 LVRT 保护逻辑。" 
          : "齿轮箱振动传感器读数超过阈值，可能存在机械磨损。";
          
        this.sockets.advice.send(JSON.stringify({ 
          fault_id: this.faultId, 
          description: this.faultDescription 
        }));
      }
    },

    resolveFault() {
      if (this.sockets.resolve && this.sockets.resolve.readyState === WebSocket.OPEN) {
        this.sockets.resolve.send(JSON.stringify({ fault_id: this.faultId, turbine_id: this.turbineId }));
      }
      this.$emit('resolve'); 
    },

    closeAllSockets() {
      Object.values(this.sockets).forEach(ws => ws && ws.close());
    },
    
    closeModal() {
        this.$emit('close');
    },

    // --- 图表逻辑 ---
    initChart() {
      const dom = document.getElementById('ui-chart');
      if (!dom) return;
      if (this.uiChart) this.uiChart.dispose();
      
      this.uiChart = echarts.init(dom);
      this.uiChart.setOption({
        textStyle: { fontFamily: 'Microsoft YaHei' },
        backgroundColor: 'rgba(0,0,0,0)',
        grid: { top: 30, bottom: 20, left: 40, right: 20, containLabel: true },
        tooltip: { trigger: 'axis', backgroundColor: 'rgba(0,0,0,0.8)', borderColor: '#00e6ff', textStyle: { color: '#fff' } },
        xAxis: { 
          type: 'value', name: '电压(pu)', 
          axisLine: { lineStyle: { color: '#888' } },
          axisLabel: { color: '#ccc' },
          splitLine: { show: false }
        },
        yAxis: { 
          type: 'value', name: '电流(pu)', 
          axisLine: { lineStyle: { color: '#888' } },
          axisLabel: { color: '#ccc' },
          splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
        },
        series: []
      });
    },

    updateChart(data) {
      if (!this.uiChart) this.initChart();
      this.uiChart.setOption({
        series: [{
          name: '故障电流',
          type: 'line',
          smooth: true,
          symbol: 'none',
          data: data.curve,
          lineStyle: { width: 3, color: '#00e6ff' },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: 'rgba(0, 230, 255, 0.4)' },
              { offset: 1, color: 'rgba(0, 230, 255, 0.05)' }
            ])
          }
        }]
      });
    },

    // --- 3D模型预览 (Auto-Fit 修复版) ---
    initMini3D() {
      const container = document.getElementById('mini-turbine-container');
      if (!container) return;
      
      // 清空旧的 canvas (如果快速切换可能会残留)
      while(container.firstChild) { container.removeChild(container.firstChild); }

      this.scene = new THREE.Scene();
      
      // 渲染器
      this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      this.renderer.setPixelRatio(window.devicePixelRatio);
      this.renderer.setSize(container.clientWidth, container.clientHeight);
      // 开启对数深度缓冲区，防止模型闪烁
      this.renderer.logarithmicDepthBuffer = true; 
      container.appendChild(this.renderer.domElement);

      // 相机
      this.camera = new THREE.PerspectiveCamera(45, container.clientWidth/container.clientHeight, 0.1, 10000);
      this.camera.position.set(100, 100, 200); // 初始位置

      // 灯光
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // 环境光亮一点
      this.scene.add(ambientLight);
      const dirLight = new THREE.DirectionalLight(0xffffff, 2.0); // 平行光
      dirLight.position.set(50, 100, 50);
      this.scene.add(dirLight);

      // 轨道控制器 (允许用户在小窗口里旋转模型查看)
      const controls = new OrbitControls(this.camera, this.renderer.domElement);
      controls.enableDamping = true;
      controls.autoRotate = true; // 自动旋转展示
      controls.autoRotateSpeed = 2.0;

      const loader = new GLTFLoader();
      loader.load('/sunny-substation/models/风机10.glb', (gltf) => {
        this.turbineMesh = gltf.scene;
        
        // ================= Auto-Fit 核心代码 =================
        // 1. 计算包围盒
        const box = new THREE.Box3().setFromObject(this.turbineMesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // 2. 将模型归一化移到原点 (0,0,0)
        // 这一步非常关键，解决了模型位置偏离的问题
        this.turbineMesh.position.x += (this.turbineMesh.position.x - center.x);
        this.turbineMesh.position.y += (this.turbineMesh.position.y - center.y);
        this.turbineMesh.position.z += (this.turbineMesh.position.z - center.z);

        // 3. 计算合适的缩放比例
        // 目标是让模型最大的那一边，适应窗口大小
        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 150; // 这里的150是根据相机距离估算的经验值
        let scale = targetSize / maxDim;
        
        // 如果你的模型单位非常小（比如毫米），scale会变得很大，这很正常
        this.turbineMesh.scale.setScalar(scale);
        
        // 微调位置，通常风机底部需要在 Y=0 以下一点点，看起来像是放在地上
        this.turbineMesh.position.y = -50; 

        this.scene.add(this.turbineMesh);
        // ====================================================
        
        // 渲染循环
        const animate = () => {
          this.animationId = requestAnimationFrame(animate);
          controls.update(); // 更新控制器和自动旋转
          
          // 旋转转轴
          const rotor = this.turbineMesh.getObjectByName("Rotor");
          if (rotor) rotor.rotateX(0.1); // 加快一点转速

          this.renderer.render(this.scene, this.camera);
        };
        animate();
      });
    },

    dispose3D() {
      cancelAnimationFrame(this.animationId);
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
      const timer = setInterval(() => {
        if (i < text.length) {
          this.aiAdviceText += text.charAt(i);
          i++;
        } else {
          clearInterval(timer);
        }
      }, 30);
    }
  }
};
</script>

<style scoped>
.fault-modal-overlay {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.7); z-index: 9999;
  display: flex; justify-content: center; align-items: center;
}
.fault-card {
  width: 960px; height: 620px; 
  background: rgba(12, 24, 46, 0.95);
  border: 1px solid #00e6ff; 
  box-shadow: 0 0 40px rgba(0, 230, 255, 0.2) inset;
  display: flex; flex-direction: column; overflow: hidden; position: relative;
  backdrop-filter: blur(10px);
}
.card-header {
  height: 55px; background: linear-gradient(90deg, rgba(0,230,255,0.1), transparent);
  border-bottom: 1px solid #00e6ff;
  display: flex; justify-content: space-between; align-items: center; padding: 0 25px;
  color: #00e6ff; font-family: 'Microsoft YaHei';
}
.card-header h3 { margin: 0; font-size: 18px; letter-spacing: 1px; }
.close-btn { font-size: 28px; cursor: pointer; transition: color 0.3s; }
.close-btn:hover { color: #fff; }

.card-body { flex: 1; display: flex; padding: 0; }
.model-preview { 
  width: 40%; height: 100%; 
  border-right: 1px solid rgba(0, 230, 255, 0.3); 
  background: radial-gradient(circle at center, rgba(0,70,100,0.3) 0%, transparent 70%);
}

.fault-info { width: 60%; padding: 25px; color: #fff; display: flex; flex-direction: column; }

/* 固定的标题样式 */
.switch-tabs {
  margin-bottom: 20px; border-bottom: 2px solid rgba(255,255,255,0.1);
}
.tab-active {
  display: inline-block; padding: 8px 20px;
  background: #00e6ff; color: #000; font-weight: bold;
  border-radius: 4px 4px 0 0; font-size: 16px;
}

.info-content { flex: 1; }
.info-content p { margin: 10px 0; font-size: 16px; color: #aaa; }
.desc-box { 
  min-height: 40px; line-height: 1.5; 
  border-left: 3px solid #ff4d4f; padding-left: 10px; background: rgba(255, 77, 79, 0.1);
}
.highlight { color: #fff; font-weight: bold; margin-left: 8px; }

/* 常规故障面板样式 */
.normal-box { margin-top: 30px; }
.status-item { display: flex; align-items: center; margin-bottom: 20px; }
.status-item .label { width: 100px; color: #ddd; }
.progress-bar { flex: 1; height: 10px; background: #333; margin: 0 15px; border-radius: 5px; overflow: hidden; }
.fill { height: 100%; }
.fill.danger { background: #ff4d4f; box-shadow: 0 0 10px #ff4d4f; }
.fill.warning { background: orange; }
.fill.normal { background: #52c41a; }
.value { width: 100px; text-align: right; }
.value.danger { color: #ff4d4f; font-weight: bold; }

.suggestion-panel {
  position: absolute; bottom: 0; left: 0; width: 100%;
  background: rgba(0, 0, 0, 0.95); border-top: 1px solid #00e6ff;
  transform: translateY(calc(100% - 40px)); transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.panel-open { transform: translateY(0); }
.panel-handle { 
  height: 40px; line-height: 40px; text-align: center; color: #00e6ff; 
  cursor: pointer; background: rgba(0,230,255,0.15); font-size: 14px; letter-spacing: 1px;
}
.panel-handle:hover { background: rgba(0,230,255,0.25); }

.ai-content { padding: 25px; color: #eee; height: 180px; display: flex; flex-direction: column; }
.typing-effect { flex: 1; overflow-y: auto; line-height: 1.6; font-family: 'Consolas', monospace; }
.solve-btn {
  align-self: flex-end; margin-top: 10px; padding: 10px 30px;
  background: linear-gradient(45deg, #52c41a, #73d13d); 
  border: none; border-radius: 4px; color: #fff; cursor: pointer;
  font-weight: bold; box-shadow: 0 4px 10px rgba(82, 196, 26, 0.4);
  transition: transform 0.2s;
}
.solve-btn:hover { transform: scale(1.05); }
</style>