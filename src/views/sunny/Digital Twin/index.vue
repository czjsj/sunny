<template>
  <div
    class="full-content"
  >
    <div id="container" />
    
    <transition name="fade">
      <div
        v-if="isLoading"
        class="loading-mask"
      >
        <div class="loading-content">
          <div class="spinner" />
          <div class="loading-text">
            数字孪生系统资源加载中... {{ loadingProgress }}%
          </div>
        </div>
      </div>
    </transition>
    <div class="page">
      <transition
        enter-active-class="animated fa
        deInDown"
        leave-active-class="animated fadeOutUp"
        appear
      >
        <navigation />
      </transition>
      <transition
        enter-active-class="animated fadeInLeft"
        leave-active-class="animated fadeOutLeft"
        appear
      >
        <div
          v-show="!deviceDetailShow"
          class="left"
        >
          <!-- 主设备规模 -->
          <zsbgm />
          <!-- 感知设备规模 -->
          <gzsbgm />
          <!-- 主变电负荷电流变化 -->
          <zbdfh />
        </div>
      </transition>
      <transition
        enter-active-class="animated fadeInLeft"
        leave-active-class="animated fadeOutLeft"
        appear
      >
        <div
          v-show="deviceDetailShow"
          class="detail-left"
        >
          <!-- 设备详情 -->
          <sbxq
            @switchDevice="switchEquipmentDetail" 
          />
        </div>
      </transition>
      <transition
        enter-active-class="animated fadeInRight"
        leave-active-class="animated fadeOutRight"
        appear
      >
        <div class="right">
          <!-- 设备操作台 -->
          <czt
            @pushEquipmentWarning="pushEquipmentWarning"
            @viewEquipmentDetail="viewEquipmentDetail"
            @roamCheck="roamCheck"
            @realTimeMonitor="realTimeMonitor"
            @masterControlView="handleAIAnalysis"
            @cockpitControlView="handlePowerPrediction"
          />
          <!-- 物联事件统计 -->
          <wlsjtj />
          <!-- 环境信息 -->
          <hjxx />
        </div>
      </transition>
      <!--弹窗样式，当showFaultModal为true时显示弹窗-->
    </div>
    <FaultMonitor 
      ref="faultMonitor"
      :visible="showFaultModal"
      :turbine-id="currentTurbineId"
      :fault-id="currentFaultId"
      :initial-fault-type="currentFaultType"
      @close="showFaultModal = false"
      @resolve="handleFaultResolve"
    />
    <transition name="fade">
      <div v-if="showAIModal" class="tech-modal ai-modal">
        <div class="modal-title">AI 全局智能分析</div>
        <div class="modal-content">
          <div class="data-row">
            <span>系统健康度：</span>
            <span class="highlight">{{ aiData.healthScore || '--' }}</span>
          </div>
          <div class="data-row">
            <span>优化建议：</span>
            <span class="text-content">{{ aiData.suggestion || '正在分析中...' }}</span>
          </div>
           </div>
        <div class="close-btn" @click="showAIModal = false">×</div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showPowerModal" class="tech-modal power-modal">
        <div class="modal-title">发电量智能预测</div>
        <div class="modal-content">
          <div class="data-row">
            <span>未来1小时预测：</span>
            <span class="highlight-green">{{ powerData.nextHour || 0 }} kWh</span>
          </div>
          <div class="data-row">
            <span>全天预计产能：</span>
            <span class="highlight-green">{{ powerData.todayTotal || 0 }} kWh</span>
          </div>
           <div class="data-row">
            <span>预测准确率：</span>
            <span>{{ powerData.accuracy || '--' }}%</span>
          </div>
        </div>
        <div class="close-btn" @click="showPowerModal = false">×</div>
      </div>
    </transition><!-- 实时监控视频 -->
    <video
      id="video"
      autoplay
      loop
      muted
    >
      <source :src="videoUrl">
    </video>
  </div>
</template>
<!-- 上面是基础UI布局模板，使用HTML5 Canvas进行绘制-->


<!-- 初始化Three.js模块-->
<script>
import * as THREE from "three";
import { Clock } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TWEEN } from "three/examples/jsm/libs/tween.module.min.js";
import dat from "three/examples/jsm/libs/dat.gui.module";
import Stats from "three/examples/jsm/libs/stats.module";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
//import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
/** 
 * @file three.js 入口文件
 * @author sunny
 * @date 2025-10-20
 * THREE.js 核心组件导入
 * Clock: 用于时间计算和动画控制的时钟类
 * GridHelper: 用于创建网格辅助线，帮助可视化场景坐标系
 * OrbitControls: 轨道控制器，用于鼠标交互控制相机视角
 * TWEEN: 补间动画库，用于创建平滑的动画过渡效果
 * dat.GUI: 轻量级图形用户界面库，用于实时调整参数和调试
 * Stats: 性能监控面板，用于显示帧率和内存使用情况
 *  FBXLoader: 用于加载 FBX 格式的 3D 模型文件
 * OBJLoader: 用于加载 OBJ 格式的 3D 模型文件
 * GLTFLoader: 用于加载 GLTF 格式的 3D 模型文件（推荐格式）
 */
import { RGBELoader} from 'three/examples/jsm/loaders/RGBELoader';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
/**
 * 后处理效果相关组件导入 
 * FXAAShader: FXAA抗锯齿着色器，用于减少渲染图像的锯齿现象
 * EffectComposer: 效果合成器，用于管理多个后处理通道
 * RenderPass: 渲染通道，作为后处理的基础渲染步骤
 * ShaderPass: 着色器通道，用于应用各种着色器效果
 * OutlinePass: 轮廓通道，用于为选中物体添加轮廓高亮效果
**/

// 加载sprite工具类（精灵）
import * as requestUtils from "@/utils/threejs/three-sprite-high.js";//引入自定义的three.js精灵工具类
import navigation from './components/navigation.vue';
import zsbgm from './components/zsbgm.vue';
import gzsbgm from './components/gzsbgm.vue';
import zbdfh from './components/zbdfh.vue';
import czt from './components/czt.vue';
import wlsjtj from './components/wlsjtj.vue';
import hjxx from './components/hjxx.vue';
import sbxq from './components/sbxq.vue';
import FaultMonitor from './components/FaultMonitor.vue'; // 风机异常报警界面


// 变量放外层可以解决动画卡顿帧数变低的问题
//在这里同时初始化函数，将这些函数初始化为null
let stats = null;
let scene = null;
let light = null;
let camera = null;
let renderer = null;
let controls = null;
let clock = null;
let gui = null;
let datGui = null;
let effectFXAA = null;
// 道路标志箭头
let mainArrowsRoadTexture = null;
let arrowsRoadTextureA1 = null;
let arrowsRoadTextureA2 = null;
let arrowsRoadTextureA3 = null;
let arrowsRoadTextureB1 = null;
let arrowsRoadTextureB2 = null;
let arrowsRoadTextureB3 = null;
// 呼吸灯相关
let composer = null;
let renderPass = null;
let outlinePass = null;
// 保存变压器变量，后期做推送设备告警使用
//这里也是初始化。通过使用空数组来初始化数组
let byqList = [];
let windTurbineClones = []; // <-- 在这里添加新数组，用来存放所有风机
let selectedObjects = [];
// 漫游
let roamTweenEndCarm = [];
// 监控
let videoObjects = null;  // 播放视频的object
let monitorObject = [];  // 摄像头模型的object
let windTurbineDataList = [];
// 渲染控制器
let renderController = null;
// 纹理管理器
let textureManager = null;
//函数和数组初始化结束

// 组件添加
export default {//导入外部组件
  name: "Substation",
  components: {
    navigation,//变电站
    zsbgm,//主设备规模
    gzsbgm,//感知设备规模
    zbdfh,//主变电负荷电流变化
    czt,//操作台
    wlsjtj,//物联事件统计
    hjxx,//环境信息
    sbxq,//设备状态
    FaultMonitor//风机故障监控
  },
  data() {
    return {
      deviceDetailShow: false,
      videoUrl: require('../../../../public/sunny-substation/video/videoPlane.mp4'),
      // --- 【新增】加载状态变量 ---
      isLoading: true,     // 是否显示加载层
      loadingProgress: 0,  // 加载进度 0-100
      loadingManager: null, // 加载管理器实例 
      // --- 【新增】故障详情变量 ---
      showFaultModal: false,
      currentFaultId: null,
      currentTurbineId: null,
      currentFaultType: 'normal',
      aiAdvice: '',
      chartData: null,
      wsTrigger: null,
      // === 【新增】AI分析与预测相关数据 ===
      wsAI: null,           // 9760 WebSocket对象
      wsPower: null,        // 9762 WebSocket对象
      
      showAIModal: false,   // AI弹窗显示开关
      aiData: {             // 接收到的AI数据结构(示例)
        healthScore: '98.5',
        suggestion: '系统运行平稳，建议保持当前策略'
      },
      
      showPowerModal: false,// 预测弹窗显示开关
      powerData: {          // 接收到的预测数据结构(示例)
        nextHour: 1200,
        todayTotal: 25000,
        accuracy: 99.2,
    }
  };
},
  
  mounted() {
    // 钩子函数，在组件挂载完成后调用
    console.log("🚀 Vue mounted 钩子开始执行...");
    this.init();
    // 启动 WebSocket 监听
    this.initWindTurbineSpeedSetSocket();
    // === 【新增】初始化两个新的 WebSocket 监听 ===
    this.initAIWebSocket();
    this.initPowerWebSocket();
    //新增：初始化故障监听
    this.initFaultListener(); 
    window.controlTurbine = this.setTurbineSpeed;
  },
  destroyed() {
    this.destroyed();
    if (this.wsTrigger) this.wsTrigger.close(); 
    // === 【新增】页面销毁时关闭连接 ===
    if (this.wsAI) this.wsAI.close();
    if (this.wsPower) this.wsPower.close();
  },
  methods: {
    // 初始化 WebSocket 连接
    initWindTurbineSpeedSetSocket() {
      // 风机速度指令发送端口号是9000端口 
      const ws = new WebSocket('ws://127.0.0.1:9000');

      ws.onopen = () => {
        console.log('🔗 风速控制（9000端口）已连接');
      };

      ws.onmessage = (event) => {
        // 接收 Python 发来的数据
        try {
          const data = JSON.parse(event.data);
          // 后端发来的数据格式是: { "id": 1, "speed": 0.1 }
          if (data.id && typeof data.speed !== 'undefined') {
            this.setTurbineSpeed(data.id, data.speed);
          }
        } catch (e) {
          console.error('收到非 JSON 数据:', event.data);
        }
      };
    
      ws.onclose = () => {
        console.log('🔗风速控制（9000端口）连接断开，5秒后尝试重连...');
        setTimeout(this.initWindTurbineSpeedSetSocket, 5000);
      };
    },
    //故障监听服务
    initFaultListener() {
      this.wsTrigger = new WebSocket('ws://localhost:9752');
      
      this.wsTrigger.onopen = () => {
        console.log('🚨 故障监听服务 (9752端口) 已连接');
        
      };
      this.wsTrigger.onclose = () => {
        console.log('🚨 故障监听服务 (9752端口) 连接断开，5秒后尝试重连...');
        setTimeout(this.initFaultListener, 5000);
      };

      this.wsTrigger.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("故障监听服务收到故障触发指令:", data);

          // 1. 更新数据
          this.currentFaultId = data.fault_id;
          this.currentTurbineId = data.turbine_id;
          // 简单的逻辑判断：ID大于1000视为电压故障，否则为常规
          this.currentFaultType = parseInt(data.fault_id) >= 1000 ? 'voltage' : 'normal';

          // 2. 打开弹窗 (这将触发子组件的 mounted)
          this.showFaultModal = true;
          
          // 可选：在这里调用相机移动方法，聚焦到故障风机
          // this.focusOnTurbine(data.turbine_id); 

        } catch (e) {
          console.error("故障指令解析失败:", e);
        }
      };
    },

    // 处理子组件传来的解决事件
    handleFaultResolve() {
        // 关闭弹窗
        this.showFaultModal = false;
        console.log('故障已解决，关闭弹窗');
        // 这里可以添加逻辑让相机回到默认位置
    },
    // 后端设置风机速度接口
    setTurbineSpeed(id, speed) {
      // 注意：这里使用 windTurbineDataList 而不是 this.windTurbineDataList
      const turbine = windTurbineDataList.find(item => item.id === id); 
      if (turbine) {
        if (speed <= 0) {
          turbine.isRunning = false;
          turbine.speed = 0;
        } else {
          turbine.isRunning = true;
          turbine.speed = speed;
        }
        console.log(`收到指令：风机 ${id} 转速调整为 ${speed}`);
      }
    },
// === 【新增】1. AI全局智能分析 (端口 9760) ===
    initAIWebSocket() {
      this.wsAI = new WebSocket('ws://127.0.0.1:9760');
      
      this.wsAI.onopen = () => {
        console.log('🤖 AI智能分析服务 (9760) 已连接');
      };
      
      this.wsAI.onmessage = (event) => {
        try {
          // 假设后端传回来的数据是 JSON 格式
          const res = JSON.parse(event.data);
          console.log('收到AI分析数据:', res);
          // 更新数据
          this.aiData = res; 
          // 如果收到重要消息，可以自动弹窗，或者仅更新数据
        } catch (e) {
          console.error('AI数据解析失败:', event.data);
        }
      };
      
      this.wsAI.onclose = () => {
        // 断线重连机制
        setTimeout(() => this.initAIWebSocket(), 5000);
      };
    },

    // 点击“AI全局智能分析”按钮触发
    handleAIAnalysis() {
      console.log("点击了AI分析按钮");
      this.showAIModal = !this.showAIModal; // 切换显示/隐藏
      
      // 可选：点击时向后端发送一个请求，要求立即分析
      if (this.wsAI && this.wsAI.readyState === WebSocket.OPEN) {
        this.wsAI.send(JSON.stringify({ action: "start_analysis" }));
      }
    },
    // === 【新增】2. 发电量智能预测 (端口 9762) ===
    initPowerWebSocket() {
      this.wsPower = new WebSocket('ws://127.0.0.1:9762');
      
      this.wsPower.onopen = () => {
        console.log('⚡ 发电量预测服务 (9762) 已连接');
      };
      
      this.wsPower.onmessage = (event) => {
        try {
          const res = JSON.parse(event.data);
          console.log('收到预测数据:', res);
          this.powerData = res;
        } catch (e) {
          console.error('预测数据解析失败:', event.data);
        }
      };
      
      this.wsPower.onclose = () => {
        setTimeout(() => this.initPowerWebSocket(), 5000);
      };
    },
    // 点击“发电量智能预测”按钮触发
    handlePowerPrediction() {
      console.log("点击了发电量预测按钮");
      this.showPowerModal = !this.showPowerModal; // 切换显示/隐藏
      
      if (this.wsPower && this.wsPower.readyState === WebSocket.OPEN) {
        this.wsPower.send(JSON.stringify({ action: "get_prediction" }));
      }
    },

    
    // 初始化
    init() {
      this.initLoadingManager(); // <--- 1. 先初始化管理器
      this.createScene(); // 创建场景
      this.createGui();// 创建gui
      this.createRender(); // 创建渲染器
      this.createLight(); // 创建光源
      this.createCamera(); // 创建相机
      this.createControls(); // 创建控件对象
      this.createStats(); // 性能工具
      this.creatHelper(); // 三维坐标系
      this.createOutlinePass(); // 呼吸灯
      textureManager = this.createTextureManager(); // <--- 初始化纹理管理器
      this.createModel(); // 创建对象
      this.render(); // 渲染
      this.addEvent(); // 监听事件，比如窗口缩放和点击模型
    },
    // --- 【新增】初始化加载管理器方法 ---
    initLoadingManager() {
      this.loadingManager = new THREE.LoadingManager();
      
      // 1. 加载过程中的回调：更新百分比
      this.loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
        // 计算百分比
        this.loadingProgress = Math.floor((itemsLoaded / itemsTotal) * 100);
        console.log(`加载进度: ${this.loadingProgress}% (${itemsLoaded}/${itemsTotal})`);
      };

      // 2. 加载完成的回调：隐藏遮罩层
      this.loadingManager.onLoad = () => {
        console.log("所有模型加载完毕！");
        // 稍微延迟一下，看到100%，体验更好
        setTimeout(() => {
          this.isLoading = false;
        }, 500);
      };
      
      // 3. 出错的回调
      this.loadingManager.onError = (url) => {
        console.error('加载失败:', url);
      };
    },
    
    // --- 【新增】纹理管理器类 ---
    createTextureManager() {
      return {
        textureCache: new Map(),
        maxCacheSize: 50,
        
        // 加载压缩纹理
        loadCompressedTexture(url, onLoad = null) {
          if (this.textureCache.has(url)) {
            const texture = this.textureCache.get(url);
            if (onLoad) onLoad(texture);
            return texture;
          }
          
          const textureLoader = new THREE.TextureLoader(this.loadingManager);
          const texture = textureLoader.load(url, () => {
            if (onLoad) onLoad(texture);
          });
          
          // 启用纹理压缩和优化
          texture.encoding = THREE.sRGBEncoding;
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
          texture.minFilter = THREE.LinearMipmapLinearFilter;
          texture.magFilter = THREE.LinearFilter;
          texture.generateMipmaps = true;
          
          // 缓存纹理
          if (this.textureCache.size < this.maxCacheSize) {
            this.textureCache.set(url, texture);
          }
          
          return texture;
        },
        
        // 加载基础纹理
        loadBasicTexture(url, options = {}) {
          if (this.textureCache.has(url)) {
            return this.textureCache.get(url);
          }
          
          const textureLoader = new THREE.TextureLoader(this.loadingManager);
          const texture = textureLoader.load(url);
          
          // 设置默认选项
          const { 
            encoding = THREE.sRGBEncoding,
            anisotropy = renderer.capabilities.getMaxAnisotropy(),
            minFilter = THREE.LinearMipmapLinearFilter,
            magFilter = THREE.LinearFilter,
            generateMipmaps = true,
            wrapS = THREE.RepeatWrapping,
            wrapT = THREE.RepeatWrapping
          } = options;
          
          // 应用纹理设置
          texture.encoding = encoding;
          texture.anisotropy = anisotropy;
          texture.minFilter = minFilter;
          texture.magFilter = magFilter;
          texture.generateMipmaps = generateMipmaps;
          texture.wrapS = wrapS;
          texture.wrapT = wrapT;
          
          // 缓存纹理
          if (this.textureCache.size < this.maxCacheSize) {
            this.textureCache.set(url, texture);
          }
          
          return texture;
        },
        
        // 检查纹理是否在使用
        isTextureInUse(texture) {
          let inUse = false;
          scene.traverse((child) => {
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => {
                  if (material.map === texture) inUse = true;
                  if (material.normalMap === texture) inUse = true;
                });
              } else {
                if (child.material.map === texture) inUse = true;
                if (child.material.normalMap === texture) inUse = true;
              }
            }
          });
          return inUse;
        },
        
        // 清理未使用的纹理
        disposeUnusedTextures() {
          this.textureCache.forEach((texture, url) => {
            if (!this.isTextureInUse(texture)) {
              texture.dispose();
              this.textureCache.delete(url);
            }
          });
        }
      };
    },
    //销毁
    destroyed() {//销毁函数
      stats = null;
      scene = null;
      gui = null;
      datGui = null;
      clock = null;
      light = null;
      camera = null;
      renderer = null;
      controls = null;
      // 道路标志箭头
      mainArrowsRoadTexture = null;
      arrowsRoadTextureA1 = null;
      arrowsRoadTextureA2 = null;
      arrowsRoadTextureA3 = null;
      arrowsRoadTextureB1 = null;
      arrowsRoadTextureB2 = null;
      arrowsRoadTextureB3 = null;
      // 呼吸灯相关
      composer = null;
      renderPass = null;
      outlinePass = null;
      effectFXAA = null;
      // 保存变压器变量，后期做推送设备告警使用
      window.removeEventListener("resize", this.onWindowResize, false);
      document.removeEventListener("click", this.onModelClick, false);
    },

    


    // 创建场景
    createScene() {
  scene = new THREE.Scene();
  // 3. 添加 RGBELoader 来加载 HDR背景
  const rgbeLoader = new RGBELoader(this.loadingManager);
  rgbeLoader.load('/sunny-substation/images/my_sky.hdr', (texture) => {
    // 设置贴图的映射方式为“等距圆柱投影”，这是 HDR 天空球的标准设置
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.rotation = Math.PI/2; // 旋转 180 度（π 弧度）
    texture.center.set(0.5, 0.5); // 设置旋转中心为贴图中心

    // 将 HDR 应用为场景的背景 (360°天空)
    scene.background = texture;
    
    // 将 HDR 应用为场景的环境光 (PBR 材质会反射这个光)
    scene.environment = texture;
  });
  // HDR背景添加结束

  // 创建时钟对象
  clock = new Clock();
  requestUtils.SetScene(scene);
},
    createGui: function() {
      //声明一个保存需求修改的相关数据的对象
      gui = {};
      datGui = new dat.GUI();
      //将设置属性添加到gui当中，gui.add(对象，属性，最小值，最大值）
    },


    // 创建渲染器
    createRender() {
      const element = document.getElementById("container");
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        FXAAShader: true,
      
        // 重点修改：开启对数深度缓冲区，完美解决远距离和大场景下的模型闪烁问题
        logarithmicDepthBuffer: true 
      });
      renderer.shadowMap.enabled = true; // 确保开启阴影 (原代码注释掉了或设为false)
      //修改结束
      renderer.setPixelRatio(window.devicePixelRatio,1); // 为了兼容高清屏幕
      renderer.setSize(element.clientWidth, element.clientHeight); // 设置渲染区域尺寸
      renderer.setClearAlpha(0.5);
      // renderer.setClearColor(0x040203, 0.9); // 设置背景颜色
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.outputEncoding = THREE.sRGBEncoding;
      element.appendChild(renderer.domElement);
    },
    // 创建光源
    // 创建光源
    createLight() {
      // 1. 环境光
      scene.add(new THREE.AmbientLight(0xffffff, 0.8));
      
      // 2. 平行光
      light = new THREE.DirectionalLight(0xffffff, 1.0);
      light.position.set(50, 100, 150);
      light.castShadow = true;
      
      // 优化阴影贴图尺寸
      light.shadow.mapSize = new THREE.Vector2(1024, 1024);
      
      // 优化阴影相机范围
      const frustumSize = 50;
      light.shadow.camera.left = -frustumSize;
      light.shadow.camera.right = frustumSize;
      light.shadow.camera.top = frustumSize;
      light.shadow.camera.bottom = -frustumSize;
      
      // 优化阴影偏差
      light.shadow.bias = -0.0005;
      
      scene.add(light);
      
      // 3. 添加半球光模拟天空地面反光
      const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
      hemiLight.position.set(0, 200, 0);
      scene.add(hemiLight);
    },
    
    // 优化阴影设置，只对重要物体启用阴影
    setupShadowCasters() {
      // 只让必要的物体投射阴影
      const importantObjects = ['变压器', '风机', 'building', 'terrain', 'turbine'];
      
      scene.traverse((child) => {
        if (child.isMesh) {
          const shouldCastShadow = importantObjects.some(name => 
            child.name.includes(name) || 
            (child.parent && child.parent.name.includes(name))
          );
          child.castShadow = shouldCastShadow;
          child.receiveShadow = shouldCastShadow;
        }
      });
    },
    // 默认相机配置（修改此处即可改变默认视角位置与观察高度）
    getDefaultCameraConfig() {
      return {
        position: { x: -700, y: 400, z: -200 }, // x: 前后, y: 高度(俯视程度), z: 左右
        target: { x: 400, y: 5, z: 0 } // 相机注视点（控件 target）
      };
    },
    
    // 视角位置配置 - 集中管理所有视角参数，方便精细调整
    getViewPositions() {
      // 获取默认相机配置作为回归视角
      var defaultCameraConfig = this.getDefaultCameraConfig();
      
      return {
        // 风机视角配置 - 每个风机使用相对偏移量
        windTurbine: {
          cameraOffset: { x: -130, y: 200, z: 30 }, // 相机相对于风机的偏移量
          targetOffset: { x: 0, y: 0, z: 0 }     // 目标点相对于风机的偏移量
        },
        // 右侧光伏板视角配置
        rightSolarPanel: {
          cameraPosition: { x: -120, y: 50, z: -140 },
          targetPosition: { x: -120, y: 0, z: -190 }
        },
        // 左侧光伏板视角配置
        leftSolarPanel: {
          cameraPosition: { x: 50, y: 50, z: 380 },
          targetPosition: { x: 50, y: 0, z: 330 }
        },
        // 默认视角配置 - 与默认相机配置保持一致
        default: {
          cameraPosition: { x: defaultCameraConfig.position.x, y: defaultCameraConfig.position.y, z: defaultCameraConfig.position.z },
          targetPosition: { x: defaultCameraConfig.target.x, y: defaultCameraConfig.target.y, z: defaultCameraConfig.target.z }
        }
      };
    },

    // 创建相机
    createCamera() {
      const element = document.getElementById("container");
      camera = new THREE.PerspectiveCamera(
        45,
        element.clientWidth / element.clientHeight,
        0.1,
        100000
      );
      // 使用默认配置来设置相机位置与朝向，方便统一管理和快速调整
      const cfg = this.getDefaultCameraConfig();
      camera.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
      camera.lookAt(new THREE.Vector3(cfg.target.x, cfg.target.y, cfg.target.z)); // 设置相机方向
      scene.add(camera);
    },
    // 创建控件对象
    createControls() {
      // 初始化控制器
      controls = new OrbitControls(camera, renderer.domElement);
      // 使用同一套默认配置来设置控件目标（摄像机观察点）
      const cfg = this.getDefaultCameraConfig();
      controls.target.set(cfg.target.x, cfg.target.y, cfg.target.z);
      // controls.minDistance = 80
      // controls.maxDistance = 500000
      // controls.maxPolarAngle = Math.PI / 3  // 仰看角度
      controls.update();
    },
    // 扩展性能监控
    createStats: function() {
      stats = new Stats();
      
      // 添加多个性能面板
      stats.showPanel(0); // FPS面板
      const memoryPanel = stats.addPanel(new Stats.Panel('Memory', '#ff8', '#221'));
      const drawCallsPanel = stats.addPanel(new Stats.Panel('Draw Calls', '#0ff', '#121'));
      
      // 自定义性能监控数据
      this.performanceData = {
        fps: 0,
        memory: 0,
        drawCalls: 0,
        triangles: 0,
        textureMemory: 0
      };
      
      // 初始化自适应性能调整
      this.initAdaptivePerformance();
      
      document.body.appendChild(stats.dom);
      
      // 定期更新自定义性能数据
      this.performanceUpdateInterval = setInterval(() => {
        this.updatePerformanceData();
      }, 1000);
    },
    
    // 初始化自适应性能调整
    initAdaptivePerformance() {
      this.adaptivePerformance = {
        fpsHistory: [],
        targetFPS: 60,
        minFPS: 30,
        qualityLevels: ['high', 'medium', 'low'],
        currentQuality: 'high',
        
        // 性能调整配置
        qualitySettings: {
          high: {
            shadowMap: true,
            shadowType: THREE.PCFSoftShadowFilter,
            pixelRatio: window.devicePixelRatio,
            antialias: true
          },
          medium: {
            shadowMap: true,
            shadowType: THREE.PCFShadowFilter,
            pixelRatio: 1,
            antialias: false
          },
          low: {
            shadowMap: false,
            shadowType: THREE.BasicShadowMap,
            pixelRatio: 1,
            antialias: false
          }
        }
      };
    },
    
    // 更新性能数据
    updatePerformanceData() {
      // 更新FPS历史
      this.adaptivePerformance.fpsHistory.push(stats.dom.children[0].children[0].textContent.split(':')[1].trim());
      
      // 保持最近60帧的历史
      if (this.adaptivePerformance.fpsHistory.length > 60) {
        this.adaptivePerformance.fpsHistory.shift();
      }
      
      // 每60帧检查一次性能
      if (this.adaptivePerformance.fpsHistory.length === 60) {
        this.adjustQuality();
      }
    },
    
    // 调整渲染质量
    adjustQuality() {
      const avgFPS = this.adaptivePerformance.fpsHistory.reduce((sum, fps) => sum + parseFloat(fps), 0) / this.adaptivePerformance.fpsHistory.length;
      
      if (avgFPS < this.adaptivePerformance.minFPS && this.adaptivePerformance.currentQuality !== 'low') {
        // 降低质量
        this.decreaseQuality();
      } else if (avgFPS > this.adaptivePerformance.targetFPS - 10 && this.adaptivePerformance.currentQuality !== 'high') {
        // 提高质量
        this.increaseQuality();
      }
    },
    
    // 降低渲染质量
    decreaseQuality() {
      const qualityIndex = this.adaptivePerformance.qualityLevels.indexOf(this.adaptivePerformance.currentQuality);
      if (qualityIndex < this.adaptivePerformance.qualityLevels.length - 1) {
        this.adaptivePerformance.currentQuality = this.adaptivePerformance.qualityLevels[qualityIndex + 1];
        this.applyQualitySettings();
      }
    },
    
    // 提高渲染质量
    increaseQuality() {
      const qualityIndex = this.adaptivePerformance.qualityLevels.indexOf(this.adaptivePerformance.currentQuality);
      if (qualityIndex > 0) {
        this.adaptivePerformance.currentQuality = this.adaptivePerformance.qualityLevels[qualityIndex - 1];
        this.applyQualitySettings();
      }
    },
    
    // 应用质量设置
    applyQualitySettings() {
      const settings = this.adaptivePerformance.qualitySettings[this.adaptivePerformance.currentQuality];
      
      // 应用阴影设置
      renderer.shadowMap.enabled = settings.shadowMap;
      if (settings.shadowMap) {
        renderer.shadowMap.type = settings.shadowType;
      }
      
      // 应用像素比
      renderer.setPixelRatio(settings.pixelRatio);
      
      console.log(`调整渲染质量为: ${this.adaptivePerformance.currentQuality}`);
    },
    creatHelper: function() {
      // 三维坐标系
      // let helper = new THREE.AxesHelper(50);
      // scene.add(helper);
    },
    // 创建呼吸灯辉光层
    createOutlinePass() {
      composer = new EffectComposer(renderer)
      renderPass = new RenderPass(scene, camera)
      composer.addPass(renderPass)
      outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera)
      outlinePass.edgeStrength = 20.0; // 边框的亮度
      outlinePass.edgeGlow = 1; // 光晕[0,1]
      outlinePass.usePatternTexture = false; // 是否使用父级的材质
      outlinePass.edgeThickness = 10.0; // 边框宽度
      outlinePass.downSampleRatio = 1; // 边框弯曲度
      outlinePass.pulsePeriod = 1; // 呼吸闪烁的速度
      outlinePass.visibleEdgeColor.set('#f20c00'); // 呼吸显示的颜色
      outlinePass.hiddenEdgeColor = new THREE.Color(0, 0, 0); // 呼吸消失的颜色
      outlinePass.clear = true;
      composer.addPass(outlinePass)
      // ================== 【新增代码 START】 ==================
      // 3. 添加 FXAA 抗锯齿通道 (放在链条的最后)
      // 这一步能解决边缘的锯齿感
      effectFXAA = new ShaderPass(FXAAShader);
      const pixelRatio = renderer.getPixelRatio();
      effectFXAA.uniforms['resolution'].value.set(1 / (window.innerWidth * pixelRatio), 1 / (window.innerHeight * pixelRatio));
      composer.addPass(effectFXAA);
  // ================== 【新增代码 END】 ==================
    },

    // 渲染控制器类
    createRenderController() {
      const vm = this; // 保存Vue实例引用
      return {
        isRendering: true,
        lastRenderTime: 0,
        targetFPS: 60,
        frameInterval: 1000 / 60,
        hasCameraMoved: false,
        hasAnimations: true,
        hasModelChanges: false,
        
        // 初始化相机位置用于检测移动
        cameraPosition: new THREE.Vector3(),
        lastCameraPosition: new THREE.Vector3(),
        
        // 检测相机是否移动
        checkCameraMove() {
          camera.getWorldPosition(this.cameraPosition);
          if (!this.cameraPosition.equals(this.lastCameraPosition)) {
            this.hasCameraMoved = true;
            this.lastCameraPosition.copy(this.cameraPosition);
            return true;
          }
          this.hasCameraMoved = false;
          return false;
        },
        
        // 检查是否有动画在运行
        checkAnimations() {
          // 检查风机是否在运行
          const turbinesRunning = windTurbineDataList.some(turbine => turbine.isRunning);
          // 检查是否有TWEEN动画在运行
          const hasTweens = TWEEN.getAll().length > 0;
          // 检查是否在漫游
          const isRoaming = roamTweenEndCarm.length > 0;
          
          this.hasAnimations = turbinesRunning || hasTweens || isRoaming;
          return this.hasAnimations;
        },
        
        // 判断是否需要渲染
        shouldRender() {
          return this.checkCameraMove() || this.checkAnimations() || this.hasModelChanges;
        },
        
        // 设置模型变化标志
        setModelChanged() {
          this.hasModelChanges = true;
        },
        
        // 清除模型变化标志
        clearModelChanged() {
          this.hasModelChanges = false;
        },
        
        // 渲染方法
        render(currentTime) {
          // 渲染节流
          if (currentTime - this.lastRenderTime < this.frameInterval) {
            requestAnimationFrame((time) => this.render(time));
            return;
          }
          
          // 只在需要时渲染
          if (this.shouldRender()) {
            // 道路指示移动
            vm.operateRoadPoint(); // 使用Vue实例调用方法
            
            /// ================== 风机动画实现 START ==================
            if (windTurbineDataList && windTurbineDataList.length > 0) {
              windTurbineDataList.forEach(turbine => {
                if (turbine.rotor && turbine.isRunning) {
                  turbine.rotor.rotateX(turbine.speed);
                }
              });
            }
            // =========================【END】====================================
            
            // 更新性能插件
            stats.update();
            TWEEN.update();
            
            // 渲染场景
            if (composer) {
              composer.render();
            } else {
              renderer.render(scene, camera);
            }
            
            this.lastRenderTime = currentTime;
            this.clearModelChanged();
          }
          
          requestAnimationFrame((time) => this.render(time));
        }
      };
    },
    
    //渲染内容
    render() {
      if (!renderController) {
        renderController = this.createRenderController();
      }
      
      renderController.render(performance.now());
    },
    addEvent() 
    {
      window.addEventListener("resize", this.onWindowResize, false); // 添加窗口监听事件（resize-onresize即窗口或框架被重新调整大小）
      document.addEventListener('click', this.onModelClick, false);
    },
    // 窗口监听函数
    onWindowResize()
     {
      const element = document.getElementById("container");// 获取渲染容器元素
      camera.aspect = element.clientWidth / element.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(element.clientWidth, element.clientHeight);
      if (composer) {
          composer.setSize(element.clientWidth, element.clientHeight);
        }
    // 如果有保存 effectFXAA 变量到 data 或外部变量，这里也需要更新 uniforms
    // effectFXAA.uniforms['resolution'].value.set(1 / (element.clientWidth * pixelRatio), 1 / (element.clientHeight * pixelRatio));
                  
    },
    onModelClick(event) 
    {
      // 【新增】关键修复：如果点击的不是canvas画布（比如点到了UI按钮），直接退出，不执行3D逻辑
      if (event.target.tagName !== 'CANVAS') return;// !== 不等于运算符，用于比较两个值是否不相等。
      // 获取画布
      let mainCanvas = document.querySelector('#container canvas');
      // 将屏幕坐标转为标准设备坐标(支持画布非全屏的情况)
      let x = ((event.clientX - mainCanvas.getBoundingClientRect().left) / mainCanvas.offsetWidth) * 2 - 1; // 设备横坐标
      let y = -((event.clientY - mainCanvas.getBoundingClientRect().top) / mainCanvas.offsetHeight) * 2 + 1; // 设备纵坐标
      let vector = new THREE.Vector3(x, y, 1); // 设备坐标
      // 创建射线投射器对象
      //通过Raycast来检测射线与场景中的对象相交
      //从而获取相交对象
      //实现检测鼠标点按的功能
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(vector, camera);
      // 射线检查排出所有元素
      let intersects = raycaster.intersectObjects(scene.children, true);
      let isFind = false;

      // 预先定义不需要响应详情的物体名称列表
      const groundNames = ['山地_草地区域', 'Baseplate_Floor', '山地'];

      intersects.forEach(item => 
      {
        // 如果已经找到目标就不再处理
        if (isFind) return; 

        // --- 新增逻辑：如果点击的是地面，且当前有设备被选中（detailShow为true），则执行退出 ---
        if (item.object.name && groundNames.includes(item.object.name) || 
           (item.object.parent && groundNames.includes(item.object.parent.name))) {
             // 只有当之前是在查看详情状态时，点击地面才触发“退出”
             // 这样可以避免误触
             isFind = true; // 标记为已找到（找到的是地面）
             this.modelRemoveBLN();
             this.deviceDetailShow = false;
             const viewPositions = this.getViewPositions();
             this.moveCamera(
                camera.position,
                controls.target,
                viewPositions.default.cameraPosition,
                viewPositions.default.targetPosition,
                () => {}
             );
             return;
        }
        // --- 新增逻辑结束 ---
        if (item.object && item.object.parent && item.object.parent.parent) {
          let parent = item.object.parent.parent;
          
          // 处理变压器点击
          if (parent.name && parent.name.indexOf('变压器') > -1) {
            // 处理一下模型选中多次问题
            if (isFind === false)
             {
              isFind = true
              this.modelAddBLN(parent)
              this.moveCamera(
                  camera.position,
                  controls.target,
                  { x: item.point.x, y: item.point.y + 8, z: item.point.z + 7 },
                  { x: item.point.x, y: item.point.y, z: item.point.z },
                  () => 
                    {
                    // this.deviceDetailShow = true
                    }
              );
              // 做个延迟，等tween动作
              setTimeout(() =>
              {
                this.deviceDetailShow = true
              }, 0)
            }
          }

          // 处理风机点击
          else if (parent.parent && parent.parent.name === 'windTurbineGroup') {
              if (isFind === false) {
                isFind = true;
                
                let clickedWindTurbine = null;
                let currentObj = item.object;
                
                // 向上查找风机对象
                while (currentObj && !clickedWindTurbine) {
                  if (currentObj.name && (currentObj.name.indexOf('windTurbine_') === 0 || currentObj.name.indexOf('windTurbineNoAnimation_') === 0)) {
                    clickedWindTurbine = currentObj;
                  }
                  currentObj = currentObj.parent;
                }
                
                // 兜底查找
                 if (!clickedWindTurbine && item.object.parent && (item.object.parent.name.indexOf('windTurbine_') === 0 || item.object.parent.name.indexOf('windTurbineNoAnimation_') === 0)) {
                    clickedWindTurbine = item.object.parent;
                 }

                if (clickedWindTurbine) {
                  this.modelAddBLN(clickedWindTurbine);
                  
                  // =============================================
                  // 【核心修改】：无动画风机点击逻辑
                  // =============================================
                  if (clickedWindTurbine.name.indexOf('windTurbineNoAnimation_') === 0) {
                      // 1. 获取基准高度 (风机高度)
                      let baseY = clickedWindTurbine.position.y;
                      
                      // 2. 确定摄像机位置 (直接复用调试好的精灵位置)
                      let camX = 350;
                      let camY = baseY + 85;
                      let camZ = -400;

                      // 3. 执行移动
                      this.moveCamera(
                        camera.position,
                        controls.target,
                        // 相机位置：直接移动到设定的精灵位置
                        { x: camX, y: camY, z: camZ },   
                        
                        // 目标位置：基于相机位置，各轴减去 20
                        { x: camX +17, y: camY -20, z: camZ  },  
                        
                        () => {}
                      );
                      return; // 结束，不执行后续逻辑
                  }

                  // =============================================
                  // 下面是普通有动画风机的通用逻辑 (保持不变)
                  // =============================================
                  const viewPositions = this.getViewPositions();
                  let targetOffset = viewPositions.windTurbine.targetOffset;
                  let cameraOffset = viewPositions.windTurbine.cameraOffset;

                  this.moveCamera(
                    camera.position,
                    controls.target,
                    {
                      x: clickedWindTurbine.position.x + cameraOffset.x,
                      y: clickedWindTurbine.position.y + cameraOffset.y,
                      z: clickedWindTurbine.position.z + cameraOffset.z
                    },
                    {
                      x: clickedWindTurbine.position.x + targetOffset.x,
                      y: clickedWindTurbine.position.y + targetOffset.y,
                      z: clickedWindTurbine.position.z + targetOffset.z
                    },
                    () => {}
                  );
                }
              }
            }
          // 处理右侧光伏板点击
          else if (parent.parent && parent.parent.name === 'rightSolarPanelGroup') {
            if (isFind === false) {
              isFind = true;
              // 获取右侧光伏板组
              let rightSolarPanelGroup = scene.getObjectByName('rightSolarPanelGroup');
              this.modelAddBLN(rightSolarPanelGroup);
              
              // 使用集中配置的右侧光伏板视角位置
              const viewPositions = this.getViewPositions();
              this.moveCamera(
                camera.position,
                controls.target,
                viewPositions.rightSolarPanel.cameraPosition,
                viewPositions.rightSolarPanel.targetPosition,
                () => {}
              );
            }
          }
          // 处理左侧光伏板点击
          else if (parent.parent && parent.parent.name === 'leftSolarPanelGroup') {
            if (isFind === false) {
              isFind = true;
              // 获取左侧光伏板组
              let leftSolarPanelGroup = scene.getObjectByName('leftSolarPanelGroup');
              this.modelAddBLN(leftSolarPanelGroup);
              
              // 使用集中配置的左侧光伏板视角位置
              const viewPositions = this.getViewPositions();
              this.moveCamera(
                camera.position,
                controls.target,
                viewPositions.leftSolarPanel.cameraPosition,
                viewPositions.leftSolarPanel.targetPosition,
                () => {}
              );
            }
          }
          // 处理其他点击
          else if (!isFind) {
            this.modelRemoveBLN();
            this.deviceDetailShow = false;
            const viewPositions = this.getViewPositions();
                this.moveCamera(
                  camera.position,
                  controls.target,
                  viewPositions.default.cameraPosition,
                  viewPositions.default.targetPosition,
                  () => {}
                );
          }
        }
      })
    },
    
    // 推送设备告警 (修复风机消失问题)
    pushEquipmentWarning(warningFlag) 
    {
      if (warningFlag) {
        // 1. 获取变压器
        let transformer = byqList[1];
        
        // 2. 获取无动画风机
        let windTurbineGroup = scene.getObjectByName("windTurbineGroup");
        let noAniWind = null;
        
        if (windTurbineGroup) {
          noAniWind = windTurbineGroup.getObjectByName("windTurbineNoAnimation_1");
        }

        // 3. 构建高亮列表
        let targets = [];
        
        // 加入变压器
        if (transformer) targets.push(transformer);
        
        // 加入风机
        // 【核心修复】：只添加最外层的 Group 对象即可，千万不要 traverse 添加子节点！
        // OutlinePass 会自动递归处理子节点。重复添加会导致渲染冲突使模型消失。
        if (noAniWind) {
           targets.push(noAniWind);
        }

        // 4. 应用呼吸灯效果
        selectedObjects = targets;
        outlinePass.selectedObjects = selectedObjects;

      } else {
        // 关闭告警
        selectedObjects = [];
        outlinePass.selectedObjects = [];
      }
    },


    // 切换告警设备详情视角 (0:变压器 <-> 1:无动画风机)
    switchEquipmentDetail(index) {
      // ==================================================
      // 情况 1: 切换到 [变压器]
      // ==================================================
      if (index === 0) {
        let transformer = byqList[1]; 
        if (transformer) {
          // 这里的坐标是之前调好的变压器特写坐标
          this.moveCamera(
            camera.position,
            controls.target,
            { x: -20.98, y: 10.12, z: 0.92 }, // 相机位置
            { x: -20.98, y: 2.12, z: -6.08 }, // 目标位置
            () => {}
          );
        }
      }

      // ==================================================
      // 情况 2: 切换到 [无动画风机]
      // ==================================================
      else if (index === 1) {
        // 这里的坐标是之前调好的风机特写坐标 (camX=350 那一组)
        let camX = 320;
        let camY = 190; // 风机高度70 + 85
        let camZ = -400;

        this.moveCamera(
          camera.position,
          controls.target,
          { x: camX, y: camY, z: camZ },          // 相机位置
          { x: camX + 17, y: camY - 20, z: camZ }, // 目标位置
          () => {}
        );
      }
    },
    

    viewEquipmentDetail(warningFlag) 
    {
      if (warningFlag) {
        this.modelAddBLN(byqList[1])
        this.moveCamera(
          camera.position,
          controls.target,
          { x: -20.98666983812899, y: 2.1234499931335575 + 8, z: -6.079832080767815 + 7 },
          { x: -20.98666983812899, y: 2.1234499931335575, z: -6.079832080767815 },
          () => 
          {
            // this.deviceDetailShow = true
          }
        );
        // 做个延迟，等tween动作
        setTimeout(() => 
        {
          this.deviceDetailShow = true
        }, 0)
      } else {
        this.modelRemoveBLN()
        this.deviceDetailShow = false
        var viewPositions = this.getViewPositions();
        this.moveCamera(
          camera.position,
          controls.target,
          viewPositions.default.cameraPosition,
          viewPositions.default.targetPosition,
          () => {}
        );
      }
    },

    // 漫游设置
    // 漫游设置
    // 漫游设置
    // 漫游设置
    // 漫游设置
    // 漫游设置
    // 漫游设置
    roamCheck() {
      // 1. 清空旧数据
      roamTweenEndCarm = [];

      // ==========================================
      // 第一阶段：变电站内部巡检 (保持不变)
      // ==========================================
      roamTweenEndCarm.push({x1: -47.46, y1: 1.45, z1: 6.01, x2: -25.23, y2: 1.45, z2: 6.01, time: 2000});
      roamTweenEndCarm.push({x1: 34.92, y1: 1.45, z1: 6.01, x2: 47.16, y2: 1.45, z2: 6.01, time: 6000});
      roamTweenEndCarm.push({x1: 39.27, y1: 1.45, z1: 8.29, x2: 39.30, y2: 1.45, z2: 4.67, time: 2000});
      roamTweenEndCarm.push({x1: 38.94, y1: 1.45, z1: -15.85, x2: 38.94, y2: 1.45, z2: -17.77, time: 2500});
      roamTweenEndCarm.push({x1: 40.81, y1: 1.45, z1: -18.95, x2: 38.31, y2: 1.45, z2: -18.70, time: 2000});
      roamTweenEndCarm.push({x1: -38.12, y1: 1.45, z1: -18.95, x2: -47.36, y2: 1.45, z2: -18.09, time: 6000});
      roamTweenEndCarm.push({x1: -42.01, y1: 1.45, z1: -19.70, x2: -41.91, y2: 1.45, z2: -17.70, time: 2000});
      roamTweenEndCarm.push({x1: -41.86, y1: 1.45, z1: 1.82, x2: -41.83, y2: 1.45, z2: 3.29, time: 2500});
      roamTweenEndCarm.push({x1: -44.21, y1: 1.45, z1: 5.97, x2: -41.51, y2: 1.45, z2: 5.61, time: 2000});
      roamTweenEndCarm.push({x1: -47.46, y1: 50, z1: 6.01, x2: -25.23, y2: 5, z2: 6.01, time: 3000}); 

      // ==========================================
      // 第二阶段：左侧光伏板 (保持不变)
      // ==========================================
      roamTweenEndCarm.push({ x1: -100, y1: 60, z1: -100, x2: -50, y2: 0, z2: -250, time: 4000 });
      roamTweenEndCarm.push({ x1: -100, y1: 60, z1: -400, x2: -50, y2: 0, z2: -250, time: 5000 });
      roamTweenEndCarm.push({ x1: 100, y1: 60, z1: -400, x2: -50, y2: 0, z2: -250, time: 5000 });
      roamTweenEndCarm.push({ x1: 100, y1: 60, z1: -100, x2: -50, y2: 0, z2: -250, time: 5000 });

      // ==========================================
      // 第三阶段：右侧光伏板 (保持不变)
      // ==========================================
      roamTweenEndCarm.push({ x1: -50, y1: 100, z1: 50, x2: -50, y2: 0, z2: 250, time: 4000 });
      roamTweenEndCarm.push({ x1: -150, y1: 60, z1: 150, x2: -120, y2: 0, z2: 250, time: 4000 });
      roamTweenEndCarm.push({ x1: -150, y1: 60, z1: 450, x2: -120, y2: 0, z2: 250, time: 5000 });
      roamTweenEndCarm.push({ x1: 50, y1: 60, z1: 450, x2: -120, y2: 0, z2: 250, time: 5000 });
      roamTweenEndCarm.push({ x1: 50, y1: 60, z1: 150, x2: -120, y2: 0, z2: 250, time: 5000 });

      // ==========================================
      // 第四阶段：风机全线巡检 (逐个打点，平稳飞行)
      // ==========================================
      const windTurbinePath = [
        { x: 230, y: 50, z: 280 }, // #7
        { x: 330, y: 20, z: 180 }, // #6
        { x: 450, y: 45, z: 80 },  // #5
        { x: 460, y: 45, z: -20 }, // #4
        { x: 450, y: 50, z: -120 },// #3
        { x: 480, y: 46, z: -220 },// #2
        { x: 400, y: 50, z: -320 } // #1
      ];

      windTurbinePath.forEach((pos, index) => {
        roamTweenEndCarm.push({
          x1: 150, y1: 270, z1: pos.z + 50, 
          x2: pos.x, y2: pos.y, z2: pos.z,
          time: index === 0 ? 4000 : 2500 
        });
      });

      // ==========================================
      // 第五阶段：无动画风机 (平移到达 -> 暂停 -> 回家)
      // ==========================================
      
      // 无动画风机真实坐标: x: -190, y: 70, z: -450, 实际上x轴的位置是有偏移的，对于有动画风机，这个位置是230
      
      // 1. 平稳移动到达无动画风机位置
      roamTweenEndCarm.push({
          x1: 150,   // 保持在 x=150 的航线上
          y1: 270,   // 高度保持 200 (与之前风机一致，视野更好)
          z1: -400,  // 摄像机停在风机侧前方 (风机z: -450, 偏移+50 = -400)
          
          x2: 230,  // 【修正】观察点 X 锁死无动画风机
          y2: 190,    // 【修正】观察点 Y
          z2: -400,  // 【修正】观察点 Z
          time: 6000 // 慢慢飞过去
      });

      // 2. 【暂停】原地不动 2秒
      // 关键：这里的坐标必须和上面一段的结束坐标完全一致
      roamTweenEndCarm.push({
          x1: 150,   
          y1: 270,   
          z1: -400,  
          
          x2: 230,  
          y2: 190, 
          z2: -400, 
          time: 1400 // 悬停 1.4秒
      });
      // ==========================================
      // 第六阶段：回程 (回到默认视角)
      // ==========================================
      var defaultCameraConfig = this.getDefaultCameraConfig();
      roamTweenEndCarm.push({
          x1: defaultCameraConfig.position.x, y1: defaultCameraConfig.position.y, z1: defaultCameraConfig.position.z, 
          x2: defaultCameraConfig.target.x, y2: defaultCameraConfig.target.y, z2: defaultCameraConfig.target.z,
          time: 4000
      });
        
      // ------------------------------------------------
      // 核心执行逻辑
      // ------------------------------------------------
      const cameraRe = camera;
      const controlsRe = controls;
      
      let nowPosition = {
        x1: camera.position.x, y1: camera.position.y, z1: camera.position.z,
        x2: controls.target.x, y2: controls.target.y, z2: controls.target.z
      };

      let firstTween = this.roamItem(nowPosition, roamTweenEndCarm[0], roamTweenEndCarm[0].time, cameraRe, controlsRe, TWEEN.Easing.Linear.None);
      let currentTween = firstTween;

      for (let i = 1; i < roamTweenEndCarm.length; i++) {
          let nextData = roamTweenEndCarm[i];
          let nextTween = this.roamItem(nowPosition, nextData, nextData.time, cameraRe, controlsRe, TWEEN.Easing.Linear.None);
          currentTween.chain(nextTween);
          currentTween = nextTween;
      }

      firstTween.start();
    },


    realTimeMonitor(monitorFlag) 
    {
      if (monitorFlag) 
      {
        this.modelAddBLN(monitorObject[0])
        this.moveCamera(
          camera.position,
          controls.target,
          { x: -76.20, y: 5.27, z: 7.79 },
          { x: -40.76, y: 3.42, z: 7.16 },
          () => {}
        );
        this.addVideoPlane()
      } 
      else 
      {
        this.modelRemoveBLN()
        this.removeVideoPlane()
        this.moveCamera(
          camera.position,
          controls.target,
          { x: -80, y: 70, z: 40 },
          { x: -25, y: 5, z: 0 },
          () => {}
        );
      }
    },
    masterControlView() 
    {
      console.info(5)
    },
    cockpitControlView() 
    {
      var viewPositions = this.getViewPositions();
      this.moveCamera(
          camera.position,
          controls.target,
          viewPositions.default.cameraPosition,
          viewPositions.default.targetPosition,
          () => {}
      );
    },

    // 模型分组配置
    getModelGroups() {
      return {
        critical: [
          // 关键模型：场景基础、主要建筑和核心设备
          this.addBaseplate,
          this.addGrassGround,
          this.addWell,
          this.addHouseModel,
          this.addTransformerModel
        ],
        important: [
          // 重要模型：电力设施、输电设备
          this.addHighVoltageTowerModel,
          this.addPowerPylonModel,
          this.addBilateralPostsModel,
          this.addFirstEquipmentModel,
          this.addFirstPipesModel,
          this.addFirstEquipmentAgainstModel,
          this.addFirstPostsAgainstModel,
          this.addLinkPopesModel,
          this.addTransformerPylonModel,
          this.addTransitionHouseModel,
          this.addDisconnectorModel
        ],
        optional: [
          // 可选模型：装饰性元素、辅助设施
          this.addLastTwoPowerPylonModel,
          this.addLastTwoPostsModel,
          this.addLastEquipmentAgainstModel,
          this.addLastPipesModel,
          this.addLastEquipmentModel,
          this.addWireModel,
          this.addWindTurbineModel,
          this.addSolarPanelModel,
          this.addArrowModel
        ]
      };
    },
    
    // 分批加载模型
    async loadModelsByGroup() {
      const groups = this.getModelGroups();
      const totalGroups = 3;
      let currentGroup = 0;
      
      // 先加载关键模型
      currentGroup++;
      for (const modelFunc of groups.critical) {
        await this.loadModelGroupItem(modelFunc);
      }
      this.updateLoadingProgress(30);
      
      // 再加载重要模型
      currentGroup++;
      for (const modelFunc of groups.important) {
        await this.loadModelGroupItem(modelFunc);
      }
      this.updateLoadingProgress(70);
      
      // 最后加载可选模型
      currentGroup++;
      for (const modelFunc of groups.optional) {
        await this.loadModelGroupItem(modelFunc);
      }
      this.updateLoadingProgress(100);
      
      // 优化阴影设置
      this.setupShadowCasters();
    },
    
    // 加载单个模型组项
    loadModelGroupItem(modelFunc) {
      return new Promise((resolve) => {
        try {
          modelFunc.call(this);
          resolve();
        } catch (error) {
          console.error('加载模型失败:', error);
          resolve(); // 继续加载其他模型
        }
      });
    },
    
    // 更新加载进度
    updateLoadingProgress(progress) {
      this.loadingProgress = progress;
      console.log(`加载进度: ${progress}%`);
    },
    
    // 创建模型对象
    createModel() 
    {
      // 开始分批加载模型
      this.loadModelsByGroup();
    },

    // 创建水泥地面底板
    addBaseplate() 
    {
      // 创建底板并添加到场景
      let planeGeometry = new THREE.BoxGeometry(300, 150, 1);
      // 地板贴图效果
      let texture = textureManager.loadBasicTexture(
        "/sunny-substation/images/水泥地面.png",
        {
          wrapS: THREE.RepeatWrapping,
          wrapT: THREE.RepeatWrapping
        }
      );
      texture.offset.set(0, 0);
      texture.repeat.set(450, 250);
      const planeMaterial = new THREE.MeshStandardMaterial({
        map: texture
      });
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.name = "Baseplate_Floor"; // 添加名字，方便射线拾取
      plane.receiveShadow = true; // 地面接收阴影
      plane.rotation.x = -0.5 * Math.PI;
      plane.position.x = 0;
      plane.position.y = -0.50;
      plane.position.z = 0;
      scene.add(plane);

      // 横向路面贴图
      let horizontalRoadTexture = textureManager.loadBasicTexture('/sunny-substation/images/马路背景.jpg', {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping
      });
      horizontalRoadTexture.repeat.set(15, 1);

      // 纵向路面贴图（A1）
      let lengthwaysRoadTextureA = textureManager.loadBasicTexture('/sunny-substation/images/马路背景.jpg', {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping
      });
      lengthwaysRoadTextureA.repeat.set(5, 1);

      // 纵向路面贴图（B1）
      let lengthwaysRoadTextureB = textureManager.loadBasicTexture('/sunny-substation/images/马路背景.jpg', {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping
      });
      lengthwaysRoadTextureB.repeat.set(2.5, 1);

      // 主干道（横向）
      let mainRoadMaterial = new THREE.MeshStandardMaterial({
        map: horizontalRoadTexture
      })
      let mainRoadGeometry = new THREE.PlaneGeometry(100, 4)
      let mainRoadMesh = new THREE.Mesh(mainRoadGeometry, mainRoadMaterial)
      mainRoadMesh.position.set(-10, 0.1, 6);
      mainRoadMesh.rotation.x = -0.5 * Math.PI;

      // A1干道（纵向）
      let a1RoadMaterial = new THREE.MeshStandardMaterial({
        map: lengthwaysRoadTextureA
      })
      let a1RoadGeometry = new THREE.PlaneGeometry(25, 2)
      let a1RoadMesh = new THREE.Mesh(a1RoadGeometry, a1RoadMaterial)
      a1RoadMesh.position.set(39, 0.05, -7.5);
      a1RoadMesh.rotation.x = -0.5 * Math.PI;
      a1RoadMesh.rotation.z = 0.5 * Math.PI;
      // A2干道（横向）
      let a2RoadMaterial = new THREE.MeshStandardMaterial({
        map: horizontalRoadTexture
      })
      let a2RoadGeometry = new THREE.PlaneGeometry(82, 2)
      let a2RoadMesh = new THREE.Mesh(a2RoadGeometry, a2RoadMaterial)
      a2RoadMesh.position.set(-2, 0.1, -19);
      a2RoadMesh.rotation.x = -0.5 * Math.PI;
      // A3干道（纵向）
      let a3RoadMaterial = new THREE.MeshStandardMaterial({
        map: lengthwaysRoadTextureA
      })
      let a3RoadGeometry = new THREE.PlaneGeometry(25, 2)
      let a3RoadMesh = new THREE.Mesh(a3RoadGeometry, a3RoadMaterial)
      a3RoadMesh.position.set(-42, 0.05, -7.5);
      a3RoadMesh.rotation.x = -0.5 * Math.PI;
      a3RoadMesh.rotation.z = 0.5 * Math.PI;

      // B1干道（纵向）
      let b1RoadMaterial = new THREE.MeshStandardMaterial({
        map: lengthwaysRoadTextureB
      })
      let b1RoadGeometry = new THREE.PlaneGeometry(11, 2)
      let b1RoadMesh = new THREE.Mesh(b1RoadGeometry, b1RoadMaterial)
      b1RoadMesh.position.set(39, 0.05, 11.5);
      b1RoadMesh.rotation.x = -0.5 * Math.PI;
      b1RoadMesh.rotation.z = 0.5 * Math.PI;
      // B2干道（横向）
      let b2RoadMaterial = new THREE.MeshStandardMaterial({
        map: horizontalRoadTexture
      })
      let b2RoadGeometry = new THREE.PlaneGeometry(82, 2)
      let b2RoadMesh = new THREE.Mesh(b2RoadGeometry, b2RoadMaterial)
      b2RoadMesh.position.set(-2, 0.1, 16);
      b2RoadMesh.rotation.x = -0.5 * Math.PI;
      // B3干道（纵向）
      let b3RoadMaterial = new THREE.MeshStandardMaterial({
        map: lengthwaysRoadTextureB
      })
      let b3RoadGeometry = new THREE.PlaneGeometry(11, 2)
      let b3RoadMesh = new THREE.Mesh(b3RoadGeometry, b3RoadMaterial)
      b3RoadMesh.position.set(-42, 0.05, 11.5);
      b3RoadMesh.rotation.x = -0.5 * Math.PI;
      b3RoadMesh.rotation.z = 0.5 * Math.PI;

      scene.add(mainRoadMesh);
      scene.add(a1RoadMesh);
      scene.add(a2RoadMesh);
      scene.add(a3RoadMesh);
      scene.add(b1RoadMesh);
      scene.add(b2RoadMesh);
      scene.add(b3RoadMesh);
    },

    // 创建草地面
   addGrassGround() {
  // ============================================================
  // 【可调参数集中区】- 所有参数都在这里，便于快速调整
  // ============================================================
  const config = {
    // 模型加载
    modelPath: '/sunny-substation/models/山地.glb',
    targetMaxSize: 1000,        // 山地期望最大尺寸
    manualScaleFactor: 1,     // 额外缩放系数

    // 山地位置与旋转（世界坐标）
    mountainPos: { x: 1500, y: -15, z: -180 },      // 山地中心位置（左后方，z 更负以靠后）
    mountainRotationY: Math.PI / 2,                  // 山地 Y 轴旋转（-45度，使山峰指向右前方的风机处）
    // 若想自动对齐到风机，将下面改为 true，否则用上面的手工角度
    autoAlignToTurbine: false,

    // 山地亮度调整（新增）
    mountainIntensity: 2,   // 山地亮度缩放（1.0 = 原色，> 1.0 更亮，< 1.0 更暗；可调范围 0.5~2.0）

    // 贴图草地平面
    grassPlanePos: { x: -120, y: -0.15, z: 10 },  // 贴图草地中心位置（XYZ）- 注意 y 已改为 -0.15
    grassPlaneWidth: 700,                           // 贴图草地 X 轴宽度
    grassPlaneDepth: 1000,                           // 贴图草地 Z 轴深度
    grassPlaneRotationY: 0,                         // 贴图草地 Y 轴旋转（弧度），通常为 0 或 Math.PI/2
    grassPlaneY: -0.12,                             // 贴图草地高度（抬高 0.03 单位以避免 Z-fighting）

    // 纹理 & 材质调参
    grassTextureRepeatX: 1,   // X 方向平铺次数
    grassTextureRepeatY: 1,  // Z 方向平铺次数
    
    // 材质颜色调整（用于还原原图颜色，避免过度亮化）
    grassMetalness: 0,        // 金属度（0 = 非金属，更接近原纹理）
    grassRoughness: 1.0,      // 粗糙度（1.0 = 完全粗糙，还原照片质感）
    grassIntensity: 1.5,      // 纹理亮度缩放（1.5 = 更亮，与山地亮度保持一致；可调范围 0.5~2.0）
  };

  // ============================================================
  // 加载与放置山地模型
  // ============================================================
  const loader = new GLTFLoader(this.loadingManager);
  loader.load(
    config.modelPath,
    (gltf) => {
      const mountain = gltf.scene;
      mountain.name = '山地';

      // 1) 缩放山地
      const box0 = new THREE.Box3().setFromObject(mountain);
      const size0 = new THREE.Vector3();
      box0.getSize(size0);
      const maxDim = Math.max(size0.x, size0.y, size0.z);
      const scale = maxDim > 0 ? (config.targetMaxSize / maxDim) : 1;
      mountain.scale.setScalar(scale * config.manualScaleFactor);

      // 2) 先旋转山地（绕自身中心的 Y 轴），再设置位置
      //    这样保证旋转是原地自身旋转，不会绕世界原点转圈
      if (config.autoAlignToTurbine) {
        // 自动对齐逻辑（可选，暂时禁用）
        // ... 自动寻找风机并对齐 ...
      } else {
        // 使用手工角度旋转（原地自身旋转）
        mountain.rotation.y = config.mountainRotationY;
      }

      // 3) 设置山地位置（在旋转之后）
      mountain.position.set(config.mountainPos.x, config.mountainPos.y, config.mountainPos.z);

      // 4) 启用阴影并应用亮度调整
      mountain.traverse((c) => {
        if (c.isMesh && c.material) {
          c.castShadow = true;
          c.receiveShadow = true;
          // 调整山地材质的亮度（通过颜色缩放）
          if (c.material.color) {
            c.material.color.multiplyScalar(config.mountainIntensity);
          }
          c.material.needsUpdate = true;
        }
      });

      // 5) 添加到场景
      if (!scene.getObjectByName('山地')) {
        scene.add(mountain);
      }

      // ============================================================
      // 创建贴图草地平面（完全水平，不倾斜）
      // ============================================================
      const groundTex = textureManager.loadBasicTexture('/sunny-substation/images/crops_ground.jpg', {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping
      });
      groundTex.repeat.set(config.grassTextureRepeatX, config.grassTextureRepeatY);
      
      // 应用颜色强度缩放（让纹理看起来更接近原图，避免过度亮化）
      // 方案：使用 canvas 缩放纹理亮度，或者调整材质参数组合
      // 这里使用材质参数调整以还原更自然的颜色
      const groundMat = new THREE.MeshStandardMaterial({
        map: groundTex,
        side: THREE.DoubleSide,          // 两面可见
        metalness: config.grassMetalness, // 降低金属感，还原照片质感
        roughness: config.grassRoughness, // 提高粗糙度，还原自然感
        toneMapped: true,                 // 启用 tone mapping（与场景环境保持一致）
        depthTest: true,                  // 启用深度测试
        polygonOffset: true,              // 启用多边形偏移，让此平面渲染在其他对象之上
        polygonOffsetFactor: 2,           // 偏移因子
        polygonOffsetUnits: 2,            // 偏移单位
      });
      
      // 应用亮度缩放，让纹理更接近原图深绿色（而非过度亮化的黄绿色）
      groundMat.color.multiplyScalar(config.grassIntensity);

      // 创建平面几何体（默认在 XY 平面，法向指向 +Z）
      const groundGeo = new THREE.PlaneGeometry(config.grassPlaneWidth, config.grassPlaneDepth);

      // 创建网格
      const groundMesh = new THREE.Mesh(groundGeo, groundMat);

      // 旋转平面使其平躺在 XZ 平面（法向朝上，指向 +Y）
      groundMesh.rotation.x = -Math.PI / 2;

      // 可选：Y 轴旋转（如果需要旋转纹理方向）
      if (config.grassPlaneRotationY !== 0) {
        groundMesh.rotation.y = config.grassPlaneRotationY;
      }

      // 设置位置（使用配置中的 XYZ，其中 Y 应与 grassPlaneY 一致以确保水平）
      groundMesh.position.set(
        config.grassPlanePos.x,
        config.grassPlaneY,  // 确保使用配置的 Y 值，不是 grassPlanePos.y
        config.grassPlanePos.z
      );

      groundMesh.receiveShadow = true;
      groundMesh.castShadow = false;  // 平面不投射阴影（可改为 true 如果需要）
      groundMesh.name = '山地_草地区域';

      scene.add(groundMesh);

      console.log('山地与贴图草地加载完成');
      console.log('山地位置:', config.mountainPos);
      console.log('山地旋转 Y (弧度):', config.mountainRotationY);
      console.log('贴图草地位置:', { x: config.grassPlanePos.x, y: config.grassPlaneY, z: config.grassPlanePos.z });
      console.log('贴图草地大小:', config.grassPlaneWidth, 'x', config.grassPlaneDepth);
    },
    undefined,
    (err) => {
      console.error('加载山地模型失败:', err);
    }
  );
},
    
    // 创建围墙
    addWell() 
    {
      // 外墙
      let outsideWallArray = [];
      let wallTexture = textureManager.loadBasicTexture('/sunny-substation/images/围墙.png', {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping
      });
      wallTexture.repeat.set(5, 1);
      outsideWallArray.push(new THREE.MeshStandardMaterial({map: wallTexture}));  //前
      outsideWallArray.push(new THREE.MeshStandardMaterial({map: wallTexture}));  //后
      outsideWallArray.push(new THREE.MeshStandardMaterial({map: wallTexture}));  //上
      outsideWallArray.push(new THREE.MeshStandardMaterial({color: 0xafc0ca }));  //下
      outsideWallArray.push(new THREE.MeshStandardMaterial({map: wallTexture}));  //左
      outsideWallArray.push(new THREE.MeshStandardMaterial({map: wallTexture}));  //右

      // 柱子
      let outsidePillarArray = [];
      outsidePillarArray.push(new THREE.MeshStandardMaterial({color: 0xafc0ca}));  //前
      outsidePillarArray.push(new THREE.MeshStandardMaterial({color: 0xafc0ca}));  //后
      outsidePillarArray.push(new THREE.MeshStandardMaterial({color: 0xafc0ca}));  //上
      outsidePillarArray.push(new THREE.MeshStandardMaterial({color: 0xafc0ca }));  //下
      outsidePillarArray.push(new THREE.MeshStandardMaterial({color: 0xafc0ca}));  //左
      outsidePillarArray.push(new THREE.MeshStandardMaterial({color: 0xafc0ca}));  //右
      //对于下面的参数的解释：
      // 0.3：墙的宽度
      // 1.6：墙的高度
      // 33.5：墙的深度
      // 0：墙的旋转角度
      //X轴正方向：东
      //X轴负方向：西
      //Z轴负方向：北
      //Z轴正方向：南

      this.createWallDetail(0.3, 1.6, 78.8, 0, outsideWallArray, -149, 0.8, -35.6,  "门口北墙");// 门口北墙
      this.createWallDetail(0.3, 1.6, 66.8, 0, outsideWallArray, -149, 0.8, 41.6, "门口南墙");// 门口南墙
      this.createWallDetail(0.4, 1.8, 0.4, 0, outsidePillarArray, -149, 0.8, 3.8, "门口北柱子");// 门口北柱子
      this.createWallDetail(0.5, 0.3, 0.5, 0, outsidePillarArray, -149, 1.85, 3.8, "门口北柱子顶");// 门口北柱子顶
      this.createWallDetail(0.4, 1.8, 0.4, 0, outsidePillarArray, -149, 0.8, 8.2, "门口南柱子");// 门口北柱子
      this.createWallDetail(0.5, 0.3, 0.5, 0, outsidePillarArray, -149, 1.85, 8.2, "门口南柱子顶");// 门口北柱子顶
      //北墙长度120.2，东墙长度60，南墙长度120.2，西墙长度60
      this.createWallDetail(0.3, 1.6, 300.2, 0.5, outsideWallArray, 0, 0.8, -74.8, "北墙");// 北墙
      this.createWallDetail(0.3, 1.6, 300.2, 0.5, outsideWallArray, 0, 0.8,  74.9, "南墙");// 南墙
      this.createWallDetail(0.3, 1.6, 150, 0, outsideWallArray, 150, 0.8, 0, "东墙");// 东墙

    },

    // 创建房子模型（配电室、主控室、安保室等）
    addHouseModel() 
    {
      let gloader = new GLTFLoader(this.loadingManager);
      let fbxLoader = new FBXLoader(this.loadingManager);
      // 创建group
      let houseGroup = new THREE.Group();
      houseGroup.name = "houseGroup";

      // 警卫室
      gloader.load(`/sunny-substation/models/警卫室/scene.gltf`, gltf => 
      {
        gltf.scene.name = "警卫室";
        gltf.scene.scale.set(0.8, 0.8, 0.8);
        gltf.scene.position.set(-55, -0.1, 6);
        // 设置旋转Y轴45度
        gltf.scene.rotation.y = -0.5 * Math.PI;
        houseGroup.add(gltf.scene);
      });

      // 警卫
      gloader.load(`/sunny-substation/models/警卫人员/scene.gltf`, gltf => 
      {
        gltf.scene.name = "警卫人员";
        gltf.scene.scale.set(1.5, 1.5, 1.5);
        gltf.scene.position.set(-55, 0, 7.7);
        // 设置旋转Y轴45度
        gltf.scene.rotation.y = -0.5 * Math.PI;
        houseGroup.add(gltf.scene);
      });

      // 配电室
      gloader.load(`/sunny-substation/models/配电室.glb`, gltf => 
      {
        gltf.scene.name = "配电室";
        gltf.scene.scale.set(0.08, 0.08, 0.08);
        gltf.scene.position.set(47, 0.7, 5);
        // 设置旋转Y轴45度
        gltf.scene.rotation.y = -0.5 * Math.PI;
        houseGroup.add(gltf.scene);
      });

      // 主控室
      gloader.load(`/sunny-substation/models/主控室.glb`, gltf => 
      {
        gltf.scene.name = "主控室";
        gltf.scene.scale.set(0.08, 0.08, 0.08);
        gltf.scene.position.set(25, 0.66, 17);
        // 设置旋转Y轴45度
        gltf.scene.rotation.y = -0.5 * Math.PI;
        houseGroup.add(gltf.scene);
      });

      // 新增建筑 factory3 (FBX模型)右边那个
      fbxLoader.load(`/sunny-substation/models/factory3.fbx`, model => 
      {
        model.name = "factory3";
        model.scale.set(0.00129, 0.00129, 0.00129);
        model.position.set(90, 12, 30); // 可自由调整x, y, z位置
        // 设置旋转
        model.rotation.y = 1 * Math.PI;
        model.rotation.x = 0.5 * Math.PI;
        
        // 增加建筑反光，提高亮度
        model.traverse(function(child) {
          if (child.isMesh) {
            // 调整材质属性，提高反光度
            if (!child.material) return;
            
            // 检查是否为材质数组
            if (Array.isArray(child.material)) {
              child.material.forEach(material => {
                // 提高金属度，降低粗糙度
                material.metalness = 0.8; // 金属度：0-1，越高越反光
                material.roughness = 0.2; // 粗糙度：0-1，越低越光滑
                material.emissive.set(0x222222); // 添加自发光，提高亮度
                material.emissiveIntensity = 1; // 自发光强度
                material.needsUpdate = true;
              });
            } else {
              // 提高金属度，降低粗糙度
              child.material.metalness = 0.8; // 金属度：0-1，越高越反光
              child.material.roughness = 0.2; // 粗糙度：0-1，越低越光滑
              child.material.emissive.set(0x222222); // 添加自发光，提高亮度
              child.material.emissiveIntensity = 1; // 自发光强度
              child.material.needsUpdate = true;
            }
          }
        });
        
        houseGroup.add(model);
      });

      // 新增建筑 factory4 (FBX模型)左边那个
      fbxLoader.load(`/sunny-substation/models/factory4.fbx`, model => 
      {
        model.name = "factory4";
        model.scale.set(0.0015, 0.0015, 0.0015);
        model.position.set(90, 9, -20); // 可自由调整x, y, z位置
        // 设置旋转
        model.rotation.y = 1 * Math.PI;
        model.rotation.x = 0.5 * Math.PI;
        
        // 增加建筑反光，提高亮度
        model.traverse(function(child) {
          if (child.isMesh) {
            // 调整材质属性，提高反光度
            if (!child.material) return;
            
            // 检查是否为材质数组
            if (Array.isArray(child.material)) {
              child.material.forEach(material => {
                // 提高金属度，降低粗糙度
                material.metalness = 0.8; // 金属度：0-1，越高越反光
                material.roughness = 0.2; // 粗糙度：0-1，越低越光滑
                material.emissive.set(0x222222); // 添加自发光，提高亮度
                material.emissiveIntensity = 0.5; // 自发光强度
                material.needsUpdate = true;
              });
            } else {
              // 提高金属度，降低粗糙度
              child.material.metalness = 0.8; // 金属度：0-1，越高越反光
              child.material.roughness = 0.2; // 粗糙度：0-1，越低越光滑
              child.material.emissive.set(0x222222); // 添加自发光，提高亮度
              child.material.emissiveIntensity = 0.5; // 自发光强度
              child.material.needsUpdate = true;
            }
          }
        });
        
        houseGroup.add(model);
      });

      // 摄像头
      fbxLoader.load(`/sunny-substation/models/摄像头.fbx`, gltf => 
      {
        gltf.rotation.z = -Math.PI;
        gltf.position.set(-60.7, 1.8, 8.1);
        gltf.scale.set(0.0005, 0.0005, 0.0005);
        gltf.name = '摄像头';
        monitorObject.push(gltf)
        scene.add(gltf);
      });

      scene.add(houseGroup);
    },

    // 创建高压电塔模型
    addHighVoltageTowerModel() 
    {
      let fbxLoader = new FBXLoader(this.loadingManager);
      // 创建group
      let powerPylonGroup = new THREE.Group();
      powerPylonGroup.name = "highVoltageTower";

      fbxLoader.load(`/sunny-substation/models/高压电塔.FBX`, fbx => {
        //当fbx这个函数前面只有一个参数时，括号可以省略
        //fbxloder起到加载模型，fbx这个自定义的名字是表示将加载后的模型传递到这个函数
        //然后就可以同过fbx来操作这个模型了
        
        fbx.scale.set(0.0007, 0.0007, 0.0007);
        let powerPylonModel = fbx;

        for (let i = 0; i < 3; i++) {
          let model1XOffset = i * 24;

          let model1 = powerPylonModel.clone();
          model1.name = '北部' + (i + 1) + '#高压电塔';
          model1.position.set(-34 + model1XOffset, 0, -131);
          powerPylonGroup.add(model1);

          let model2 = powerPylonModel.clone();
          model2.name = '南部' + (i + 1) + '#高压电塔';
          model2.position.set(-34 + model1XOffset, 0, -4);
          powerPylonGroup.add(model2);
        }
      });

      scene.add(powerPylonGroup);
    },

    // 创建电力桥塔
    addPowerPylonModel() 
    {
      let fbxLoader = new FBXLoader(this.loadingManager);
      // 创建group
      let powerPylonGroup = new THREE.Group();
      powerPylonGroup.name = "firstPowerPylonGroup";

      fbxLoader.load(`/sunny-substation/models/1. 最开始架子.FBX`, fbx => 
      {
        fbx.scale.set(0.0005, 0.0005, 0.0005);
        let powerPylonModel = fbx;
        // 北部
        for (let i = 0; i < 3; i++) 
        {
          let model1XOffset = i * 24;
          let model1 = powerPylonModel.clone();
          model1.name = '北部' + (i + 1) + '#电力桥塔';
          model1.position.set(-40 + model1XOffset, 0, -23);
          powerPylonGroup.add(model1);
        }
        // 南部
        for (let i = 0; i < 3; i++) 
        {
          let model1XOffset = i * 24;
          let model1 = powerPylonModel.clone();
          model1.name = '南部' + (i + 1) + '#电力桥塔';
          model1.position.set(-40 + model1XOffset, 0, 30);
          powerPylonGroup.add(model1);
        }
      });
      scene.add(powerPylonGroup);
    },

    // 创建最两侧的柱子
    addBilateralPostsModel() 
    {
      let fbxLoader = new FBXLoader(this.loadingManager);
      // 创建group
      let postsGroup = new THREE.Group();
      postsGroup.name = "lastPostsGroup";

      fbxLoader.load(`/sunny-substation/models/3. 柱子.FBX`, fbx => 
      {
        fbx.scale.set(0.0003, 0.0003, 0.0003);
        let postsModel = fbx;

        for (let i = 0; i < 12; i++) 
        {
          // 起始位
          let model1XStart = -36.9;
          // 每组的偏移量
          let groupXOffset = i * 6;
          // 北部柱子
          let model11 = postsModel.clone();
          model11.position.set(model1XStart + groupXOffset, 0, -27.3);
          postsGroup.add(model11);
          let model12 = postsModel.clone();
          model12.position.set(model1XStart + 1.7 + groupXOffset, 0, -27.3);
          postsGroup.add(model12);
          let model13 = postsModel.clone();
          model13.position.set(model1XStart + 3.4 + groupXOffset, 0, -27.3);
          postsGroup.add(model13);
          // 南部柱子
          let model21 = postsModel.clone();
          model21.position.set(model1XStart + groupXOffset, 0, 27.4);
          postsGroup.add(model21);
          let model22 = postsModel.clone();
          model22.position.set(model1XStart + 1.7 + groupXOffset, 0, 27.4);
          postsGroup.add(model22);
          let model23 = postsModel.clone();
          model23.position.set(model1XStart + 3.4 + groupXOffset, 0, 27.4);
          postsGroup.add(model23);
        }
      });

      scene.add(postsGroup);
    },

    // 创建最开始的设备
    addFirstEquipmentModel() 
    {
      let fbxLoader = new FBXLoader(this.loadingManager);
      // 创建group
      let equipmentGroup = new THREE.Group();
      equipmentGroup.name = "equipmentOneGroup";

      fbxLoader.load(`/sunny-substation/models/2. 柱子旁边的设备.FBX`, fbx => 
      {
        fbx.scale.set(0.00055, 0.00055, 0.00055);
        fbx.rotation.x = 0.5 * Math.PI;
        fbx.rotation.y = 1 * Math.PI;
        let postsModel = fbx;

        for (let i = 0; i < 12; i++) 
        {
            let model1XOffset = i * 6;
            let model1 = postsModel.clone();
            model1.name = (i + 1) + '#设备';
            model1.position.set(-35.2 + model1XOffset, 1.6, -24.5);
            equipmentGroup.add(model1);
        }
      });

      scene.add(equipmentGroup);
    },

    // 创建最开始的管子
    addFirstPipesModel() 
    {
      let fbxLoader = new FBXLoader(this.loadingManager);
      // 创建group
      let pipesGroup = new THREE.Group();
      pipesGroup.name = "pipesGroup";

      fbxLoader.load(`/sunny-substation/models/4. 连接柱子旁边设备的管子.FBX`, fbx => 
      {
        let pipesModel = fbx;
        let model1 = pipesModel.clone();
        model1.name = '1#管道';
        model1.scale.set(0.00272, 0.00055, 0.00055);
        model1.position.set(-3.9, -8.25, -24.6);
        model1.rotation.x = 0.5 * Math.PI;
        model1.rotation.y = 1 * Math.PI;
        pipesGroup.add(model1);
      })

      scene.add(pipesGroup);
    },

    // 创建最开始的设备（反）
    addFirstEquipmentAgainstModel() 
    {
      let fbxLoader = new FBXLoader(this.loadingManager);
      // 创建group
      let equipmentGroup = new THREE.Group();
      equipmentGroup.name = "equipmentOneAgainstGroup";

      fbxLoader.load(`/sunny-substation/models/5. 柱子旁边的设备（反）.FBX`, fbx => 
      {
        fbx.scale.set(0.00055, 0.00055, 0.00055);
        let postsModel = fbx;

        for (let i = 0; i < 6; i++) 
        {
          let model1XOffset = i * 11.95
          let model1 = postsModel.clone();
          model1.name = (i + 1) + '# 550kV I 线高抗';
          model1.position.set(-32 + model1XOffset, 1.8, -22.7);
          equipmentGroup.add(model1);
        }

        // 添加精灵
        //加载设备模型 → 遍历每个设备 → 为每个设备创建指示牌
                               //↓
                       // 异步生成纹理
                               //↓
                    // 将纹理转为精灵对象
                              // ↓
                    // 设置位置/大小并显示
        equipmentGroup.children.forEach((item, index) => 
        {
          let model1XOffset = index * 11.8;
          this.createDeviceIndicator({
              img: '/sunny-substation/images/tk-blue.png',
              width: 350,
              height: 90,
              txt: (index + 1) + '#550kV I线高抗',
              status: '正常',
              txtPaddingX: 35,
              txtPaddingY: 60
          }).then((panelMate) => 
          {
            let panelMesh =  new THREE.Sprite(panelMate);
            panelMesh.position.set(-32 + model1XOffset, 8, -22);
            panelMesh.scale.set(6, 4, 1);
            scene.add(panelMesh);
          });
        })
      });

      scene.add(equipmentGroup);
    },

    // 创建最开始的柱子（反）
    addFirstPostsAgainstModel() 
    {
      let fbxLoader = new FBXLoader(this.loadingManager);
      // 创建group
      let postsGroup = new THREE.Group();
      postsGroup.name = "postsAgainstGroup";

      fbxLoader.load(`/sunny-substation/models/3. 柱子.FBX`, fbx => 
      {
        fbx.scale.set(0.0003, 0.0003, 0.0003);
        let postsModel = fbx;

        for (let i = 0; i < 6; i++) 
        {
          // 起始位
          let model1XStart = -33.6;
          // 每组的偏移量
          let groupXOffset = i * 12;

          let model11 = postsModel.clone();
          model11.position.set(model1XStart + groupXOffset, 0, -17.5);
          postsGroup.add(model11);
          let model12 = postsModel.clone();
          model12.position.set(model1XStart + 1.6 + groupXOffset, 0, -17.5);
          postsGroup.add(model12);
          let model13 = postsModel.clone();
          model13.position.set(model1XStart + 3.2 + groupXOffset, 0, -17.5);
          postsGroup.add(model13);
        }
      });

      scene.add(postsGroup);
    },

    // 创建连接管
    addLinkPopesModel() 
    {
      let fbxLoader = new FBXLoader(this.loadingManager);
      // 创建group
      let pipesGroup = new THREE.Group();
      pipesGroup.name = "linkPipesGroup";

      fbxLoader.load(`/sunny-substation/models/12. 倒数第二个架子下设备的管子.FBX`, fbx => 
      {
        let pipesModel1 = fbx.clone();
        pipesModel1.scale.set(0.000037, 0.00025, 0.00025);

        let pipesModel2 = fbx.clone();
        pipesModel2.scale.set(0.00013, 0.00025, 0.00025);
        pipesModel2.rotation.y = -0.5 * Math.PI;

        let pipesModel3 = fbx.clone();
        pipesModel3.scale.set(0.0008, 0.00025, 0.00025);

        let pipesModel31 = fbx.clone();
        pipesModel31.scale.set(0.000067, 0.00025, 0.00025);
        pipesModel31.rotation.y = -0.5 * Math.PI;

        for (let i = 0; i < 6; i++) 
        {
          // 最开始柱子下的管子
          let model1XOffset = i * 12;
          let model1 = pipesModel1.clone();
          model1.position.set(-31.4 + model1XOffset, -0.3, 1.7);
          pipesGroup.add(model1);
          // 连接柱子和变压器的管子
          let model2XOffset = i * 12;
          let model2 = pipesModel2.clone();
          model2.position.set(-51.1 + model2XOffset, -0.3, -10);
          pipesGroup.add(model2);
        }

        for (let i = 0; i < 6; i++) 
        {
          // 横向的6根管子
          let model3YOffset = i * 1.1;
          let model3 = pipesModel3.clone();
          model3.position.set(10.1, -0.3, 3.3 + model3YOffset);
          pipesGroup.add(model3);
        }
        // 追加6根管子的两头的管子
        let model31 = pipesModel31.clone();
        model31.position.set(-55, -0.3, -12.1);
        pipesGroup.add(model31);

        let model32 = pipesModel31.clone();
        model32.position.set(12.6, -0.3, -12.1);
        pipesGroup.add(model32);
      })

      scene.add(pipesGroup);
    },

    // 创建变压器桥塔
    addTransformerPylonModel() 
    {
      let fbxLoader = new FBXLoader(this.loadingManager);
      // 创建group
      let transformerPylonGroup = new THREE.Group();
      transformerPylonGroup.name = "transformerPylonGroup";

      fbxLoader.load(`/sunny-substation/models/7. 变压器上面的架子.FBX`, fbx => 
      {
        fbx.scale.set(0.0007, 0.0007, 0.0007);
        let transformerPylonModel = fbx;

        for (let i = 0; i < 6; i++) 
        {
          let model1XOffset = i * 12;
          let model1 = transformerPylonModel.clone();
          model1.name = (i + 1) + '#变压桥塔';
          model1.position.set(-23.3 + model1XOffset, 0, -5);
          transformerPylonGroup.add(model1);
        }
      });

      scene.add(transformerPylonGroup);
    },

    // 创建变压器
    addTransformerModel() 
    {
      let gloader = new GLTFLoader(this.loadingManager);
      // 创建group
      let transformerGroup = new THREE.Group();
      transformerGroup.name = "transformerGroup";
      // let list = []
      gloader.load(`/sunny-substation/models/8. 变压器.glb`, gltf => 
      {
        gltf.scene.scale.set(0.9, 0.9, 0.9);
        gltf.scene.rotation.y = -0.5 * Math.PI;
        let transformerPylonModel = gltf.scene;

        for (let i = 0; i < 6; i++) 
        {
          let model1XOffset = i * 12;
          let model1 = transformerPylonModel.clone();
          model1.name = (i + 1) + '#变压器';
          model1.position.set(41 + model1XOffset, -0.1, 104.7);
          byqList.push(model1)
          transformerGroup.add(model1);
        }

        // 添加精灵
        transformerGroup.children.forEach((item, index) => 
        {
          let model1XOffset = index * 11.8;
          this.createDeviceIndicator({
              img: '/sunny-substation/images/tk-blue.png',
              width: 200,
              height: 90,
              txt: (index + 1) + '#变压器',
              status: '正常',
              txtPaddingX: 22,
              txtPaddingY: 60
          }).then((panelMate) => 
          {
            let panelMesh =  new THREE.Sprite(panelMate);
            panelMesh.position.set(-32 + model1XOffset, 8, -6);
            panelMesh.scale.set(6, 4, 1);
            scene.add(panelMesh);
          });
        })
      });

      scene.add(transformerGroup);
    },

    // 创建转换房
    addTransitionHouseModel() 
    {
      let fbxLoader = new FBXLoader(this.loadingManager);
      // 创建group
      let houseGroup = new THREE.Group();
      houseGroup.name = "houseGroup";

      fbxLoader.load(`/sunny-substation/models/6. 屋子1.FBX`, fbx => 
      {
        fbx.scale.set(0.0013, 0.0013, 0.0013);
        fbx.rotation.x = 0.5 * Math.PI;
        fbx.rotation.y = 1 * Math.PI;
        let houseModel = fbx;

        for (let i = 0; i < 3; i++) {
          let model1XOffset = i * 24;
          let model1 = houseModel.clone();
          model1.name = (i + 1) + '#220KW 二次设备舱';
          model1.position.set(-25.8 + model1XOffset, 1.3, -1);
          houseGroup.add(model1);
        }
      });
      scene.add(houseGroup);
    },

    // 创建最后的设备（输出端）
    addLastEquipmentModel() 
    {
      let fbxLoader = new FBXLoader(this.loadingManager);
      // 创建group
      let equipmentGroup = new THREE.Group();
      equipmentGroup.name = "lastEquipmentOneGroup";

      fbxLoader.load(`/sunny-substation/models/13. 最后的设备.FBX`, fbx => 
      {
        fbx.scale.set(0.0008, 0.0008, 0.0008);
        fbx.rotation.x = 0.5 * Math.PI;
        fbx.rotation.y = 1 * Math.PI;
        let postsModel = fbx;

        for (let i = 0; i < 12; i++) {
            let model1XOffset = i * 6;
            let model1 = postsModel.clone();
            model1.name = (i + 1) + '#设备';
            model1.position.set(-35.2 + model1XOffset, 1.6, 24.5);
            equipmentGroup.add(model1);
        }
      });

      scene.add(equipmentGroup);
    },

    // 创建最后的管子
    addLastPipesModel() 
    {
      let fbxLoader = new FBXLoader(this.loadingManager);
      // 创建group
      let pipesGroup = new THREE.Group();
      pipesGroup.name = "lastPipesGroup";

      fbxLoader.load(`/sunny-substation/models/12. 倒数第二个架子下设备的管子.FBX`, fbx => 
      {
        let pipesModel = fbx;

        let model1 = pipesModel.clone();
        model1.name = '1#管道';
        model1.scale.set(0.000786, 0.00055, 0.00055);
        model1.position.set(10, 0, 64.35);
        pipesGroup.add(model1);
      })

      scene.add(pipesGroup);
    },

    // 创建最后的设备（反）
    addLastEquipmentAgainstModel() 
    {
      let fbxLoader = new FBXLoader(this.loadingManager);
      // 创建group
      let equipmentGroup = new THREE.Group();
      equipmentGroup.name = "lastEquipmentOneAgainstGroup";

      fbxLoader.load(`/sunny-substation/models/11. 倒数第二个架子下的设备.FBX`, fbx => 
      {
        fbx.scale.set(0.0008, 0.0008, 0.0008);
        fbx.rotation.x = 0.5 * Math.PI;
        fbx.rotation.y = 1 * Math.PI;
        let postsModel = fbx;

        for (let i = 0; i < 6; i++) 
        {
          let model1XOffset = i * 11.95;
          let model1 = postsModel.clone();
          model1.name = (i + 1) + '#设备';
          model1.position.set(-32 + model1XOffset, 1.8, 19.6);
          equipmentGroup.add(model1);
        }
      });

      scene.add(equipmentGroup);
    },

    // 创建倒数第二道的柱子（反）（输出端）
    addLastTwoPostsModel() 
    {
      let fbxLoader = new FBXLoader(this.loadingManager);
      // 创建group
      let postsGroup = new THREE.Group();
      postsGroup.name = "lastTwoPostsGroup";

      fbxLoader.load(`/sunny-substation/models/3. 柱子.FBX`, fbx => 
      {
        fbx.scale.set(0.0003, 0.0003, 0.0003);
        let postsModel = fbx;

        for (let i = 0; i < 6; i++) 
        {
          // 起始位
          let model1XStart = -33.6;
          // 每组的偏移量
          let groupXOffset = i * 12;

          let model11 = postsModel.clone();
          model11.position.set(model1XStart + groupXOffset, 0, 14);
          postsGroup.add(model11);
          let model12 = postsModel.clone();
          model12.position.set(model1XStart + 1.6 + groupXOffset, 0, 14);
          postsGroup.add(model12);
          let model13 = postsModel.clone();
          model13.position.set(model1XStart + 3.2 + groupXOffset, 0, 14);
          postsGroup.add(model13);
        }
      });

      scene.add(postsGroup);
    },

    // 创建断路器
    addDisconnectorModel() 
    {
      let gloader = new GLTFLoader(this.loadingManager);
      // 创建group
      let transformerGroup = new THREE.Group();
      transformerGroup.name = "transformerGroup";

      gloader.load(`/sunny-substation/models/断路器.glb`, gltf => 
      {
        gltf.scene.scale.set(0.12, 0.12, 0.12);
        let transformerPylonModel = gltf.scene;

        for (let i = 0; i < 6; i++) 
        {
          let model1XOffset = i * 12;
          let model1 = transformerPylonModel.clone();
          model1.name = (i + 1) + '#隔离开关';
          model1.position.set(-4 + model1XOffset, 2, -108.5);
          transformerGroup.add(model1);
        }

        // 添加精灵
        transformerGroup.children.forEach((item, index) => 
        {
          let model1XOffset = index * 11.8;
          this.createDeviceIndicator({
              img: '/sunny-substation/images/tk-blue.png',
              width: 280,
              height: 90,
              txt: (index + 1) + '# 隔离开关',
              status: '正常',
              txtPaddingX: 45,
              txtPaddingY: 60
          }).then((panelMate) => 
          {
            let panelMesh =  new THREE.Sprite(panelMate);
            panelMesh.position.set(-33 + model1XOffset, 10, 14);
            panelMesh.scale.set(6, 4, 1);
            scene.add(panelMesh);
          });
        })
      });

      scene.add(transformerGroup);
    },

    // 创建倒数第二道的电力桥塔（输出端）
    addLastTwoPowerPylonModel() 
    {
      let fbxLoader = new FBXLoader(this.loadingManager);
      // 创建group
      let transformerPylonGroup = new THREE.Group();
      transformerPylonGroup.name = "lastTransformerPylonGroup";

      fbxLoader.load(`/sunny-substation/models/10. 倒数第二个架子.FBX`, fbx => 
      {
        fbx.scale.set(0.0007, 0.0007, 0.0007);
        let transformerPylonModel = fbx;

        for (let i = 0; i < 6; i++) 
        {
            let model1XOffset = i * 12;
            let model1 = transformerPylonModel.clone();
            model1.name = (i + 1) + '#变压器桥塔';
            model1.position.set(-12.6 + model1XOffset, 0, 62);
            transformerPylonGroup.add(model1);
        }
      });

      scene.add(transformerPylonGroup);
    },

    // 创建电线
    addWireModel() 
    {
      let wireGroup = new THREE.Group();
      wireGroup.name = "wireGroup";

      let lineMaterial = new THREE.LineBasicMaterial({color: 0x656b72});//0x656b72-0xff0000
      let line = new THREE.Line();
      line.material = lineMaterial;

      // 高压塔
      for (let i = 0; i < 3; i++) 
      {
        let model1XOffset = i * 24;
        // 北部高压塔
        let wireA1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -30 + model1XOffset, 22, -63),
          new THREE.Vector3( -33 + model1XOffset, 10, -45 ),
          new THREE.Vector3( -35 + model1XOffset, 7.35, -26.5 )
        ]);
        let wireB1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -31 + model1XOffset, 17, -63),
          new THREE.Vector3( -31.5 + model1XOffset, 10, -45 ),
          new THREE.Vector3( -32 + model1XOffset, 7.35, -26.5 )
        ]);
        let wireC1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -30.5 + model1XOffset, 12.5, -63),
          new THREE.Vector3( -29.8 + model1XOffset, 10, -45 ),
          new THREE.Vector3( -29 + model1XOffset, 7.35, -26.5 )
        ]);
        let wireD1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -22 + model1XOffset, 22, -63),
          new THREE.Vector3( -19 + model1XOffset, 10, -45 ),
          new THREE.Vector3( -17 + model1XOffset, 7.35, -26.5 )
        ]);
        let wireE1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -21 + model1XOffset, 17, -63),
          new THREE.Vector3( -20.5 + model1XOffset, 10, -45 ),
          new THREE.Vector3( -20 + model1XOffset, 7.35, -26.5 )
        ]);
        let wireF1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -22 + model1XOffset, 12.5, -63),
          new THREE.Vector3( -22.5 + model1XOffset, 10, -45 ),
          new THREE.Vector3( -23.2 + model1XOffset, 7.35, -26.5 )
        ]);

        // 南部高压塔
        let wireA2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -30 + model1XOffset, 22, 63),
          new THREE.Vector3( -33 + model1XOffset, 10, 45 ),
          new THREE.Vector3( -35 + model1XOffset, 7.35, 26.5 )
        ]);
        let wireB2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -31 + model1XOffset, 17, 63),
          new THREE.Vector3( -31.5 + model1XOffset, 10, 45 ),
          new THREE.Vector3( -32 + model1XOffset, 7.35, 26.5 )
        ]);
        let wireC2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -30.5 + model1XOffset, 12.5, 63),
          new THREE.Vector3( -29.8 + model1XOffset, 10, 45 ),
          new THREE.Vector3( -29 + model1XOffset, 7.35, 26.5 )
        ]);
        let wireD2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -22 + model1XOffset, 22, 63),
          new THREE.Vector3( -19 + model1XOffset, 10, 45 ),
          new THREE.Vector3( -17 + model1XOffset, 7.35, 26.5 )
        ]);
        let wireE2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -21 + model1XOffset, 17, 63),
          new THREE.Vector3( -20.5 + model1XOffset, 10, 45 ),
          new THREE.Vector3( -20 + model1XOffset, 7.35, 26.5 )
        ]);
        let wireF2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -22 + model1XOffset, 12.5, 63),
          new THREE.Vector3( -22.5 + model1XOffset, 10, 45 ),
          new THREE.Vector3( -23.2 + model1XOffset, 7.35, 26.5 )
        ]);

        // 北部电线
        this.generateWire(wireA1, line, wireGroup)
        this.generateWire(wireB1, line, wireGroup)
        this.generateWire(wireC1, line, wireGroup)
        this.generateWire(wireD1, line, wireGroup)
        this.generateWire(wireE1, line, wireGroup)
        this.generateWire(wireF1, line, wireGroup)
        // 南部电线
        this.generateWire(wireA2, line, wireGroup)
        this.generateWire(wireB2, line, wireGroup)
        this.generateWire(wireC2, line, wireGroup)
        this.generateWire(wireD2, line, wireGroup)
        this.generateWire(wireE2, line, wireGroup)
        this.generateWire(wireF2, line, wireGroup)
      }

      // 最两侧柱子
      for (let i = 0; i < 12; i++) 
      {
        // 起始位
        let model1XStart = -36.9;
        // 每组的偏移量
        let groupXOffset = i * 6;
        // 北部柱子
        let wireA1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 7, -26.5),
          new THREE.Vector3( model1XStart + groupXOffset, 5, -26.9 ),
          new THREE.Vector3( model1XStart + groupXOffset, 4, -27.3 )
        ]);
        let wireB1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 7, -26.5),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 5, -26.9 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 4, -27.3 )
        ]);
        let wireC1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 7, -26.5),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 5, -26.9 ),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 4, -27.3 )
        ]);
        // 南部柱子
        let wireA2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 7, 26.5),
          new THREE.Vector3( model1XStart + groupXOffset, 5, 26.9 ),
          new THREE.Vector3( model1XStart + groupXOffset, 4, 27.3 )
        ]);
        let wireB2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 7, 26.5),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 5, 26.9 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 4, 27.3 )
        ]);
        let wireC2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 7, 26.5),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 5, 26.9 ),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 4, 27.3 )
        ]);

        // 北部电线
        this.generateWire(wireA1, line, wireGroup)
        this.generateWire(wireB1, line, wireGroup)
        this.generateWire(wireC1, line, wireGroup)
        // 南部电线
        this.generateWire(wireA2, line, wireGroup)
        this.generateWire(wireB2, line, wireGroup)
        this.generateWire(wireC2, line, wireGroup)
      }

      // 柱子与设备
      for (let i = 0; i < 12; i++) 
      {
        // 起始位
        let model1XStart = -36.9;
        // 每组的偏移量
        let groupXOffset = i * 6;
        // 北部设备
        let wireA1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 4, -27.3),
          new THREE.Vector3( model1XStart + groupXOffset, 5, -26.9 ),
          new THREE.Vector3( model1XStart + groupXOffset, 3.3, -26.3 )
        ]);
        let wireB1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 4, -27.3),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 5, -26.9 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 3.3, -26.3 )
        ]);
        let wireC1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 4, -27.3),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 5, -26.9 ),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 3.3, -26.3 )
        ]);
        // 南部设备
        let wireA2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 4, 27.3),
          new THREE.Vector3( model1XStart + groupXOffset, 5, 26.9 ),
          new THREE.Vector3( model1XStart + groupXOffset + 0.8, 3, 26.3 )
        ]);
        let wireB2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 4, 27.3),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 5, 26.9 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 3, 26.7 )
        ]);
        let wireC2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 4, 27.3),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 5, 26.9 ),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset - 0.8, 3, 26.3 )
        ]);

        // 北部电线
        this.generateWire(wireA1, line, wireGroup)
        this.generateWire(wireB1, line, wireGroup)
        this.generateWire(wireC1, line, wireGroup)
        // 北部电线
        this.generateWire(wireA2, line, wireGroup)
        this.generateWire(wireB2, line, wireGroup)
        this.generateWire(wireC2, line, wireGroup)
      }

      // 设备与柱子
      for (let i = 0; i < 6; i++) 
      {
        // 起始位
        let model1XStart = -33.6;
        // 每组的偏移量
        let groupXOffset = i * 12;
        // 北部设备
        let wireA1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 3.6, -20.8),
          new THREE.Vector3( model1XStart + groupXOffset, 5.5, -18.9 ),
          new THREE.Vector3( model1XStart + groupXOffset, 4.1, -17.5 )
        ]);
        let wireB1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 3.6, -20.8),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 5.5, -18.9 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 4.1, -17.5 )
        ]);
        let wireC1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 3.6, -20.8),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 5.5, -18.9 ),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 4.1, -17.5 )
        ]);
        // 南部设备
        let wireA2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset + 0.6, 3.5, 17.8),
          new THREE.Vector3( model1XStart + groupXOffset, 5.5, 16 ),
          new THREE.Vector3( model1XStart + groupXOffset, 4, 14.1 )
        ]);
        let wireB2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset - 0.2, 3.5, 17.3),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 5.5, 16 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 4, 14.1 )
        ]);
        let wireC2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset - 1, 3.5, 17.8),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 5.5, 16 ),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 4, 14.1 )
        ]);

        // 北部电线
        this.generateWire(wireA1, line, wireGroup)
        this.generateWire(wireB1, line, wireGroup)
        this.generateWire(wireC1, line, wireGroup)
        // 南部电线
        this.generateWire(wireA2, line, wireGroup)
        this.generateWire(wireB2, line, wireGroup)
        this.generateWire(wireC2, line, wireGroup)
      }

      // 柱子与变压器架子
      for (let i = 0; i < 6; i++) 
      {
        // 起始位
        let model1XStart = -33.6;
        // 每组的偏移量
        let groupXOffset = i * 12;
        let wireA1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 4, -17.5 ),
          new THREE.Vector3( model1XStart + groupXOffset, 5, -12),
          new THREE.Vector3( model1XStart + groupXOffset, 7.1, -7 )
        ]);
        let wireB1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 4, -17.5 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 5, -12),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 7.1, -7 )
        ]);
        let wireC1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 4, -17.5 ),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 5, -12),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 7.1, -7 )
        ]);
        this.generateWire(wireA1, line, wireGroup)
        this.generateWire(wireB1, line, wireGroup)
        this.generateWire(wireC1, line, wireGroup)
      }

      // 变压器架子与变压器
      for (let i = 0; i < 6; i++) 
      {
        // 起始位
        let model1XStart = -34.3;
        // 每组的偏移量
        let groupXOffset = i * 12;
        let wireA1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 7.1, -7 ),
          new THREE.Vector3( model1XStart + groupXOffset, 4.5, -6.5 )
        ]);
        let wireB1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1 + groupXOffset, 7.1, -7 ),
          new THREE.Vector3( model1XStart + 1 + groupXOffset, 4, -7.5 )
        ]);
        let wireC1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 7.1, -7 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 4.5, -6.5 )
        ]);
        let wireD1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.1 + groupXOffset, 7.1, -7 ),
          new THREE.Vector3( model1XStart + 3.1 + groupXOffset, 4.5, -6.5 )
        ]);
        this.generateWire(wireA1, line, wireGroup)
        this.generateWire(wireB1, line, wireGroup)
        this.generateWire(wireC1, line, wireGroup)
        this.generateWire(wireD1, line, wireGroup)
      }

      // 变压器与转换房与断路器
      for (let i = 0; i < 6; i++) 
      {
        // 起始位
        let model1XStart = -34.3;
        // 每组的偏移量
        let groupXOffset = i * 12;
        let wireA1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 2, -6.5 ),
          new THREE.Vector3( model1XStart + groupXOffset + 1, 2.5, 0 ),
          new THREE.Vector3( model1XStart + groupXOffset + 1, 4.5, 12.3 )
        ]);
        let wireB1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 2, -6.5 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 2.5, 0 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset + 0.8, 4.5, 12.3 )
        ]);
        let wireC1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 2, -6.5 ),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset - 1, 2.5, 0 ),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset + 0.6, 4.5, 12.3 )
        ]);
        this.generateWire(wireA1, line, wireGroup)
        this.generateWire(wireB1, line, wireGroup)
        this.generateWire(wireC1, line, wireGroup)
      }

      // 断路器与架子
      for (let i = 0; i < 6; i++) 
      {
        // 起始位
        let model1XStart = -33.3;
        // 每组的偏移量
        let groupXOffset = i * 12;
        let wireA1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 4.5, 12.3 ),
          new THREE.Vector3( model1XStart + groupXOffset, 6, 12.7 ),
          new THREE.Vector3( model1XStart + groupXOffset, 8.5, 12.8 )
        ]);
        let wireB1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.6 + groupXOffset, 4.5, 12.3 ),
          new THREE.Vector3( model1XStart + 1.6 + groupXOffset, 6, 12.7 ),
          new THREE.Vector3( model1XStart + 1.6 + groupXOffset, 8.5, 12.8 )
        ]);
        let wireC1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.1 + groupXOffset, 4.5, 12.3 ),
          new THREE.Vector3( model1XStart + 3.1 + groupXOffset, 6, 12.7 ),
          new THREE.Vector3( model1XStart + 3.1 + groupXOffset, 8.5, 12.8 )
        ]);
        this.generateWire(wireA1, line, wireGroup)
        this.generateWire(wireB1, line, wireGroup)
        this.generateWire(wireC1, line, wireGroup)
      }

      // 架子与柱子
      for (let i = 0; i < 6; i++) 
      {
        // 起始位
        let model1XStart = -33.6;
        // 每组的偏移量
        let groupXOffset = i * 12;
        let wireA1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 8.5, 12.8 ),
          new THREE.Vector3( model1XStart + groupXOffset, 6, 13.4 ),
          new THREE.Vector3( model1XStart + groupXOffset, 4, 14.1 )
        ]);
        let wireB1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.6 + groupXOffset, 8.5, 12.8 ),
          new THREE.Vector3( model1XStart + 1.6 + groupXOffset, 6, 13.4 ),
          new THREE.Vector3( model1XStart + 1.6 + groupXOffset, 4, 14.1 )
        ]);
        let wireC1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.2 + groupXOffset, 8.5, 12.8 ),
          new THREE.Vector3( model1XStart + 3.2 + groupXOffset, 6, 13.4 ),
          new THREE.Vector3( model1XStart + 3.2 + groupXOffset, 4, 14.1 )
        ]);
        this.generateWire(wireA1, line, wireGroup)
        this.generateWire(wireB1, line, wireGroup)
        this.generateWire(wireC1, line, wireGroup)
      }

      scene.add(wireGroup);
    },
    // 电线-子方法
    generateWire(_curveModel, _comLine, _wireGroup){
      let positionsArryA = [];
      let pointsA = _curveModel.getPoints(100)
        pointsA.forEach(d => 
        {
          positionsArryA.push(d.x, d.y, d.z)
        })
        const positionsA = new Float32Array(positionsArryA)
        let lineGeoA = new THREE.BufferGeometry();
        lineGeoA.setAttribute('position', new THREE.BufferAttribute(positionsA, 3))

        let lineA = _comLine.clone();
        lineA.geometry = lineGeoA;
        _wireGroup.add(lineA);
    },

    // 风机位置配置函数（放在风机创建前，便于快速调整）
    configureWindTurbinePositions() {
      // 返回一个位置数组，每项 { x, y, z, rotationY }
      // 默认示例：7 台风机，按行排列，位置可直接编辑
      return [
        { x: 400, y: 50, z: -320, rotationY: Math.PI * 1.5 },
        { x: 480, y: 46, z: -220, rotationY: Math.PI * 1.5 },
        { x: 450, y: 50, z: -120, rotationY: Math.PI * 1.5 },
        { x: 460, y: 45, z: -20,  rotationY: Math.PI * 1.5 },
        { x: 450, y: 45, z: 80,   rotationY: Math.PI * 1.5 },
        { x: 330, y: 20, z: 180,  rotationY: Math.PI * 1.5 },
        { x: 230, y: 50, z: 280,  rotationY: Math.PI * 1.5 }
      ];
    },
    configureWindTurbineNoAnimationPositions() {
      return [
        { x: -190, y: 70, z: -450, rotationY: Math.PI * 1.5 },  
      ];
    },

   // addWindTurbineModel 方法,添加风力发电机模型
addWindTurbineModel() {
  let gloader = new GLTFLoader(this.loadingManager);
  let windTurbineGroup = new THREE.Group();
  windTurbineGroup.name = "windTurbineGroup";

  // 坐标配置
  const positions = [
    { x: 400, y: 60, z: -320, rotationY: Math.PI * 1.5 },
    { x: 480, y: 52, z: -220, rotationY: Math.PI * 1.5 },
    { x: 470, y: 50, z: -50, rotationY: Math.PI * 1.5 },
    { x: 460, y: 45, z: 90,  rotationY: Math.PI * 1.5 },
    { x: 450, y: 50, z: 250,   rotationY: Math.PI * 1.5 },
    { x: 230, y: 60, z: 320,  rotationY: Math.PI * 1.5 },
    { x: 400, y: 60, z: 380,  rotationY: Math.PI * 1.5 },
    { x: 330, y: 60, z: -380, rotationY: Math.PI * 1.5 } 
  ];

  gloader.load(`/sunny-substation/models/风机10.glb`, gltf => {
    
    // 清空旧数据 (防止热更新堆叠)
    windTurbineDataList = [];

    positions.forEach((pos, i) => {
      let model = gltf.scene.clone();
      let index = i + 1;
      
      // ============================================
      // ============================================
      model.scale.set(200, 200, 200); 
      
      model.position.set(pos.x, pos.y, pos.z);
      model.rotation.y = pos.rotationY;
      model.name = `windTurbine_${index}`;

      // 扇叶位于父组件转轴"Rotor"下，所以直接旋转rotor即可
      let rotor = model.getObjectByName("Rotor");
      
      // 将数据存入全局变量 (非 data)
      windTurbineDataList.push({
        id: index,
        mesh: model,
        rotor: rotor,
        //风机初始速度设定
        speed: 0,// + Math.random() * 0.01, // 稍微快一点以便观察
        isRunning: true
      });

      windTurbineGroup.add(model);
      
      // 更新全局查找数组 
      windTurbineClones.push(model);

      // 精灵标签 (保持不变)
      this.createDeviceIndicator({
          img: '/sunny-substation/images/tk-blue.png',
          width: 320,
          height: 90,
          txt: `${index}# 风电机组`,
          status: '运行中',
          txtPaddingX: 30,
          txtPaddingY: 58
      }).then((panelMate) => {
        let panelMesh = new THREE.Sprite(panelMate);
        // 标签高度比风机高150
        panelMesh.position.set(pos.x, pos.y + 150, pos.z-20); 
        panelMesh.scale.set(150, 100, 1);
        scene.add(panelMesh);
      });
    });
    
    scene.add(windTurbineGroup);
  });
},
    

   // 创建光伏板（带精灵标签）
    addSolarPanelModel() {
      let gloader = new GLTFLoader(this.loadingManager);
      
      let rightSolarPanelGroup = new THREE.Group();
      rightSolarPanelGroup.name = "rightSolarPanelGroup";
      
      let leftSolarPanelGroup = new THREE.Group();
      leftSolarPanelGroup.name = "leftSolarPanelGroup";

      gloader.load(`/sunny-substation/models/光伏板.glb`, gltf => { 
        let panelModel = gltf.scene; 
        // ================== 【新增代码 START】 ==================
    // 遍历模型中的每一个网格，开启各向异性过滤
    panelModel.traverse((child) => {
      if (child.isMesh) {
        // 1. 检查是否有贴图
        if (child.material.map) {
          // 获取显卡支持的最大各向异性过滤等级 (通常是 16x)
          // 这一步能极大地提升远距离倾斜视角的清晰度
          child.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
          
          // 2. 确保 mipmaps 开启 (解决远距离闪烁)
          child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
          child.material.map.magFilter = THREE.LinearFilter;
          
          // 3. 强制更新材质
          child.material.needsUpdate = true;
        }
        
        // 可选：如果光伏板反光太强导致看不清，可以适当降低粗糙度或金属度
        // child.material.roughness = 0.8; 
      }
    });
    // ================== 【新增代码 END】 ==================
        panelModel.scale.set(5, 5, 5); 
        let spacing = 30; 
        let rows = 10; 
        let columns = 10; 

        // --- 1. 右侧光伏板 (南侧) ---
        for (let i = 0; i < rows; i++) { 
          for (let j = 0; j < columns; j++) {
            let model = panelModel.clone();
            model.position.set(-120 + j * spacing, 0, -140 - i * spacing);
            model.rotation.y = Math.PI * 1; 
            rightSolarPanelGroup.add(model);
          }
        }

        // --- 2. 左侧光伏板 (北侧) ---
        for (let i = 0; i < rows; i++) { 
          for (let j = 0; j < columns; j++) {
            let model = panelModel.clone();
            model.position.set(50 - j * spacing, 0, 380 - i * spacing);
            model.rotation.y = Math.PI * 1; 
            leftSolarPanelGroup.add(model);
          }
        }
        
        scene.add(rightSolarPanelGroup);
        scene.add(leftSolarPanelGroup);

        // ========================================
        // 【新增】添加光伏阵列的精灵标签
        // ========================================

        // 1. 右侧光伏阵列标签 (根据阵列坐标估算中心位置)
        // 右侧z大概在 -140 到 -400 之间，中心取 -280
        this.createDeviceIndicator({
            img: '/sunny-substation/images/tk-blue.png',
            width: 350,
            height: 90,
            txt: '一期光伏阵列',
            status: '并网',
            txtPaddingX: 30,
            txtPaddingY: 58
        }).then((panelMate) => {
          let panelMesh = new THREE.Sprite(panelMate);
          // 设置在阵列中心上方 30米处
          panelMesh.position.set(20, 30, -280); 
          panelMesh.scale.set(130, 80, 1); // 标签大一点，醒目
          scene.add(panelMesh);
        });

        // 2. 左侧光伏阵列标签
        // 左侧z大概在 380 到 100 之间，中心取 240
        this.createDeviceIndicator({
            img: '/sunny-substation/images/tk-blue.png',
            width: 350,
            height: 90,
            txt: '二期光伏阵列',
            status: '并网',
            txtPaddingX: 30,
            txtPaddingY: 58
        }).then((panelMate) => {
          let panelMesh = new THREE.Sprite(panelMate);
          // 设置在阵列中心上方
          panelMesh.position.set(-90, 30, 240);
          panelMesh.scale.set(130, 80, 1);
          scene.add(panelMesh);
        });

      });
    },

    // 创建引导箭头
    addArrowModel() 
    {
      // 主干道箭头
      mainArrowsRoadTexture = textureManager.loadBasicTexture('/sunny-substation/images/箭头.png', {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping
      });
      mainArrowsRoadTexture.repeat.set(1, 15);

      let mainRoadPoint = new THREE.MeshBasicMaterial();
      mainRoadPoint.map = mainArrowsRoadTexture;
      mainRoadPoint.transparent = true;
      mainRoadPoint.side = THREE.DoubleSide;

      let mainRoadGeometry = new THREE.PlaneGeometry(2, 75);
      let mainRoadMesh = new THREE.Mesh(mainRoadGeometry, mainRoadPoint);
      mainRoadMesh.position.set(-2, 0.11, 6)
      mainRoadMesh.rotation.x = -0.5 * Math.PI;
      mainRoadMesh.rotation.z = 0.5 * Math.PI;


      // A1干道（纵向）
      arrowsRoadTextureA1 = textureManager.loadBasicTexture('/sunny-substation/images/箭头.png', {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping
      });
      arrowsRoadTextureA1.repeat.set(1, 5);
      let a1RoadPoint = new THREE.MeshBasicMaterial();
      a1RoadPoint.map = arrowsRoadTextureA1;
      a1RoadPoint.transparent = true;
      a1RoadPoint.side = THREE.DoubleSide;
      let a1RoadGeometry = new THREE.PlaneGeometry(2, 19)
      let a1RoadMesh = new THREE.Mesh(a1RoadGeometry, a1RoadPoint)
      a1RoadMesh.position.set(39, 0.11, -7);
      a1RoadMesh.rotation.x = -0.5 * Math.PI;
      a1RoadMesh.rotation.z = 1 * Math.PI;

      // A2干道（横向）
      arrowsRoadTextureA2 = textureManager.loadBasicTexture('/sunny-substation/images/箭头.png', {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping
      });
      arrowsRoadTextureA2.repeat.set(1, 15);
      let a2RoadPoint = new THREE.MeshBasicMaterial();
      a2RoadPoint.map = arrowsRoadTextureA2;
      a2RoadPoint.transparent = true;
      a2RoadPoint.side = THREE.DoubleSide;
      let a2RoadGeometry = new THREE.PlaneGeometry(2, 75);
      let a2RoadMesh = new THREE.Mesh(a2RoadGeometry, a2RoadPoint)
      a2RoadMesh.position.set(-2, 0.11, -19);
      a2RoadMesh.rotation.x = -0.5 * Math.PI;
      a2RoadMesh.rotation.z = 1.5 * Math.PI;

      // A3干道（纵向）
      arrowsRoadTextureA3 = textureManager.loadBasicTexture('/sunny-substation/images/箭头.png', {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping
      });
      arrowsRoadTextureA3.repeat.set(1, 5);
      let a3RoadPoint = new THREE.MeshBasicMaterial();
      a3RoadPoint.map = arrowsRoadTextureA3;
      a3RoadPoint.transparent = true;
      a3RoadPoint.side = THREE.DoubleSide;
      let a3RoadGeometry = new THREE.PlaneGeometry(2, 19)
      let a3RoadMesh = new THREE.Mesh(a3RoadGeometry, a3RoadPoint)
      a3RoadMesh.position.set(-42.1, 0.11, -7);
      a3RoadMesh.rotation.x = -0.5 * Math.PI;
      a3RoadMesh.rotation.z = 2 * Math.PI;

      // B1干道（纵向）
      arrowsRoadTextureB1 = textureManager.loadBasicTexture('/sunny-substation/images/箭头.png', {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping
      });
      arrowsRoadTextureB1.repeat.set(1, 1.5);
      let b1RoadPoint = new THREE.MeshBasicMaterial();
      b1RoadPoint.map = arrowsRoadTextureB1;
      b1RoadPoint.transparent = true;
      b1RoadPoint.side = THREE.DoubleSide;
      let b1RoadGeometry = new THREE.PlaneGeometry(2, 5)
      let b1RoadMesh = new THREE.Mesh(b1RoadGeometry, b1RoadPoint)
      b1RoadMesh.position.set(38.9, 0.11, 12);
      b1RoadMesh.rotation.x = -0.5 * Math.PI;
      b1RoadMesh.rotation.z = 2 * Math.PI;

      // B2干道（横向）
      arrowsRoadTextureB2 = textureManager.loadBasicTexture('/sunny-substation/images/箭头.png', {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping
      });
      arrowsRoadTextureB2.repeat.set(1, 15);
      let b2RoadPoint = new THREE.MeshBasicMaterial();
      b2RoadPoint.map = arrowsRoadTextureB2;
      b2RoadPoint.transparent = true;
      b2RoadPoint.side = THREE.DoubleSide;
      let b2RoadGeometry = new THREE.PlaneGeometry(2, 75);
      let b2RoadMesh = new THREE.Mesh(b2RoadGeometry, b2RoadPoint)
      b2RoadMesh.position.set(-2, 0.11, 16);
      b2RoadMesh.rotation.x = -0.5 * Math.PI;
      b2RoadMesh.rotation.z = 1.5 * Math.PI;

      // B3干道（纵向）
      arrowsRoadTextureB3 = textureManager.loadBasicTexture('/sunny-substation/images/箭头.png', {
        wrapS: THREE.RepeatWrapping,
        wrapT: THREE.RepeatWrapping
      });
      arrowsRoadTextureB3.repeat.set(1, 1.5);
      let b3RoadPoint = new THREE.MeshBasicMaterial();
      b3RoadPoint.map = arrowsRoadTextureB3;
      b3RoadPoint.transparent = true;
      b3RoadPoint.side = THREE.DoubleSide;
      let b3RoadGeometry = new THREE.PlaneGeometry(2, 5)
      let b3RoadMesh = new THREE.Mesh(b3RoadGeometry, b3RoadPoint)
      b3RoadMesh.position.set(-42, 0.11, 12);
      b3RoadMesh.rotation.x = -0.5 * Math.PI;
      b3RoadMesh.rotation.z = 1 * Math.PI;

      scene.add(mainRoadMesh);
      scene.add(a1RoadMesh);
      scene.add(a2RoadMesh);
      scene.add(a3RoadMesh);
      scene.add(b1RoadMesh);
      scene.add(b2RoadMesh);
      scene.add(b3RoadMesh);
    },

    // 道路指示移动
    operateRoadPoint() 
    {
      if (mainArrowsRoadTexture) 
      {
        // 防止偏移量过大造成异常
        if(mainArrowsRoadTexture.offset.y >= 100000) 
        {
          mainArrowsRoadTexture.offset.y = 0;
          arrowsRoadTextureA1.offset.y = 0;
          arrowsRoadTextureA2.offset.y = 0;
          arrowsRoadTextureA3.offset.y = 0;
          arrowsRoadTextureB1.offset.y = 0;
          arrowsRoadTextureB2.offset.y = 0;
          arrowsRoadTextureB3.offset.y = 0;
        }
        else 
        {
          mainArrowsRoadTexture.offset.y += 0.002;
          arrowsRoadTextureA1.offset.y += 0.002;
          arrowsRoadTextureA2.offset.y += 0.002;
          arrowsRoadTextureA3.offset.y += 0.002;
          arrowsRoadTextureB1.offset.y += 0.002;
          arrowsRoadTextureB2.offset.y += 0.002;
          arrowsRoadTextureB3.offset.y += 0.002;
        }
      }
    },
    
    // 墙生成方法
    createWallDetail(width, height, depth, angle, material, x, y, z, name)
    {
      let cubeGeometry = new THREE.BoxGeometry(width, height, depth);
      let cube = new THREE.Mesh(cubeGeometry, material);
      cube.position.set(x, y, z);
      cube.rotation.y += angle * Math.PI; //-逆时针旋转,+顺时针
      cube.name = name;
      scene.add(cube);
    },
    // 设备指示牌 (精灵)
    createDeviceIndicator(canvasConfig) 
    {
      const scaleFactor = 4; // 【核心修改】清晰度倍数，4倍就很清晰了
      
      let canvas = document.createElement('canvas');
      // 原来是 340, 240，现在乘以倍数
      canvas.width = 340 * scaleFactor;
      canvas.height = 240 * scaleFactor;
      
      let context = canvas.getContext('2d');
      
      return new Promise((resolve, reject) => 
      {
        let imgMain = new Image();
        imgMain.src = canvasConfig.img;

        imgMain.onload = () => 
        {
          context.clearRect(0, 0, canvas.width, canvas.height);
          
          // 【核心修改】图片绘制尺寸也要乘以倍数
          context.drawImage(
            imgMain, 
            0, 
            0, 
            canvasConfig.width * scaleFactor, 
            canvasConfig.height * scaleFactor
          );
          
          resolve(makeText(context, canvas, canvasConfig, scaleFactor));
        };
        
        imgMain.onerror = (e) => {
            reject(e);
        };
      });

      // 内部方法：文字绘制
      function makeText(context, canvas, canvasConfig, scale) 
      {
        context.textAlign = 'start';
        // 【核心修改】字体大小乘以倍数
        context.font = `bold ${36 * scale}px Microsoft YaHei`; 
        context.fillStyle = '#ffffff';
        
        // 【核心修改】文字坐标乘以倍数
        context.fillText(
            canvasConfig.txt, 
            canvasConfig.txtPaddingX * scale, 
            canvasConfig.txtPaddingY * scale
        );

        let texture = new THREE.CanvasTexture(canvas);
        
        // 【关键优化】开启各向异性过滤，解决侧面看发虚的问题
        // renderer 需要是全局变量，确保在这里能访问到
        if (renderer) {
            texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
        }
        
        // 纹理不需要生成 Mipmaps，对于文字来说 LinearFilter 更锐利
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        
        return new THREE.SpriteMaterial({map: texture});
      }
    },
    // 设备添加呼吸灯
    modelAddBLN(obj) 
    {
      outlinePass.selectedObjects = [obj]
    },
    // 设备添加呼吸灯
    modelRemoveBLN() {
      outlinePass.selectedObjects = []
    },
    // 移动摄像机
    moveCamera(oldP, oldT, newP, newT, callback) 
    {
        let tween = new TWEEN.Tween({
            x1: oldP.x,
            y1: oldP.y,
            z1: oldP.z,
            x2: oldT.x,
            y2: oldT.y,
            z2: oldT.z
        });
        tween.to(
            {
                x1: newP.x,
                y1: newP.y,
                z1: newP.z,
                x2: newT.x,
                y2: newT.y,
                z2: newT.z
            },
            1000
        );
        // 每一帧执行函数 、这个地方就是核心了、每变一帧更新一次页面元素
        tween.onUpdate((object) => 
        {
            camera.position.set(object.x1, object.y1, object.z1);
            controls.target.x = object.x2;
            controls.target.y = object.y2;
            controls.target.z = object.z2;
            controls.update();
        });

        // 动画完成后的执行函数
        tween.onComplete(() => 
        {
            controls.enabled = true;
            callback && callback();
            // this.tweenCallBack && this.tweenCallBack();
        });

        tween.easing(TWEEN.Easing.Cubic.InOut);
        // 这个函数必须有、这个是启动函数、不加不能启动
        tween.start();
    },
    // 添加漫游
    roamItem(nowPosition, endPosition, time, cameraRe, controlsRe, easing) 
    {
      var tween1 = new TWEEN.Tween(nowPosition).to(endPosition, time).easing(easing)
      tween1.onUpdate((object) => 
      {
        cameraRe.position.x = object.x1
        cameraRe.position.y = object.y1
        cameraRe.position.z = object.z1
        controlsRe.target.x = object.x2
        controlsRe.target.y = object.y2
        controlsRe.target.z = object.z2
        controlsRe.update()
      })
      return tween1
    },
    // 视频加载
    addVideoPlane() 
    {
      scene.remove(videoObjects);
      let planeGeometry = new THREE.PlaneGeometry(5, 3);
      let material = new THREE.MeshPhongMaterial();
      material.side = THREE.DoubleSide;
      let video = document.querySelector('#video');
      let texture = new THREE.VideoTexture(video);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.format = THREE.RGBFormat;
      material.map = texture;
      let mesh = new THREE.Mesh(planeGeometry, material);
      mesh.position.set(-60, 3.5, 11);
      mesh.rotateY(Math.PI/2)
      videoObjects = mesh;
      scene.add(mesh);
    },
    removeVideoPlane() 
    {
      scene.remove(videoObjects);
    },
  }
};


</script>
<style lang="scss" scoped>
@import './styles/animate.css';
@import './styles/card.scss';
// 整屏撑满
.full-content {
  position: absolute;
  top: 0;
  left: 0;
  
  // --- 【核心修改 1】宽高改为 100%，自适应浏览器窗口 ---
  width: 100%; 
  height: 100%;
  
  margin: 0;
  
  // --- 【核心修改 2】隐藏溢出，彻底消灭滚动条 ---
  overflow: hidden; 
  
  // background: url("./images/page-bg.jpg") center no-repeat; // 原有背景设置保留
  -webkit-background-size: cover;
  background-size: cover;

  #container {
    position: absolute;
    width: 100%;
    height: 100%;
    // 确保 canvas 也是块级元素，防止下方出现几像素白边
    display: block; 
  }

  .page 
  {
    position: relative;
    top: 0;
    .left 
    {
      position: absolute;
      left: 21px;
      top: 80px;
      width: 340px;
    }
    .detail-left 
    {
      position: absolute;
      left: 21px;
      top: 80px;
      width: 600px;
    }
    .right 
    {
      position: absolute;
      right: 21px;
      top: 80px;
      width: 340px;
    }
  }
  .panel 
  {
    border: 0;
    width: 270px;
    text-indent: 20px;
    font-family: "tencent";
  }
  #video 
  {
    position: absolute;
    width: 0;
    height: 0;
  }
}
/* ================== 【新增】加载层样式 ================== */
.loading-mask {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #000000; /* 纯黑背景，或者用的深蓝色背景 */
  z-index: 9999; /* 确保在最上层 */
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-content {
  text-align: center;
  color: #00e6ff; /* 科技蓝字体 */
}

.loading-text {
  margin-top: 20px;
  font-size: 24px;
  font-family: "Microsoft YaHei";
  letter-spacing: 2px;
}

/* 简单的旋转圈圈动画 */
.spinner {
  width: 60px;
  height: 60px;
  border: 4px solid rgba(0, 230, 255, 0.3);
  border-top: 4px solid #00e6ff;
  border-radius: 50%;
  margin: 0 auto;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Vue transition 淡出效果 */
.fade-leave-active {
  transition: opacity 1s;
}
.fade-leave-to {
  opacity: 0;
}
// === 【新增】科技感弹窗样式 ===
.tech-modal {
  position: absolute;
  top: 20%;
  left: 50%;
  transform: translateX(-50%);
  width: 400px;
  min-height: 200px;
  background: rgba(12, 28, 56, 0.9); // 深蓝半透明背景
  border: 1px solid #00e6ff;         // 亮蓝边框
  box-shadow: 0 0 20px rgba(0, 230, 255, 0.4);
  z-index: 2000;
  color: #fff;
  padding: 20px;
  border-radius: 4px;
  
  .modal-title {
    font-size: 18px;
    font-weight: bold;
    color: #00e6ff;
    border-bottom: 1px solid rgba(0, 230, 255, 0.3);
    padding-bottom: 10px;
    margin-bottom: 15px;
    font-family: "Microsoft YaHei";
  }
  
  .modal-content {
    .data-row {
      margin-bottom: 15px;
      font-size: 16px;
      display: flex;
      justify-content: space-between;
      
      .highlight {
        color: #ffcc00; // 黄色高亮
        font-weight: bold;
        font-size: 20px;
      }
      .highlight-green {
        color: #00ff99; // 绿色高亮
        font-weight: bold;
        font-size: 20px;
      }
      .text-content {
        max-width: 60%;
        text-align: right;
        color: #d1d1d1;
      }
    }
  }
  
  .close-btn {
    position: absolute;
    top: 5px;
    right: 10px;
    font-size: 24px;
    cursor: pointer;
    color: #00e6ff;
    &:hover {
      color: #fff;
    }
  }
}


</style>

