<template>
  <div class="full-content">
    <div id="container" />

    <!-- 优化的加载进度 -->
    <transition name="fade">
      <div v-if="isLoading" class="loading-mask">
        <div class="loading-content">
          <div class="spinner" />
          <div class="loading-text">
            数字孪生系统加载中... {{ Math.round(loadingProgress) }}%
          </div>
          <div class="loading-tips">
            {{ loadingTip }}
          </div>
        </div>
      </div>
    </transition>

    <!-- 性能监视器 -->
    <div v-if="showFPS" class="fps-monitor">
      FPS: {{ currentFPS }}
    </div>

    <!-- 其他UI组件保持不变 -->
    <div class="page">
      <navigation />
      <!-- 其他组件... -->
    </div>
  </div>
</template>

<script>
// 导入优化的工具类
import { OptimizedPostProcessing } from './effects/PostProcessingOptimized';
import { createOptimizedRenderer } from './utils/RenderThrottler';
import { initOptimizedLoading } from './utils/ModelLoader';
import { textureOptimizer } from './utils/TextureOptimizer';

// 导入原有组件
import navigation from './components/Navigation';

export default {
  name: 'DigitalTwinOptimized',
  components: {
    navigation,
    // ...其他组件
  },
  data() {
    return {
      isLoading: true,
      loadingProgress: 0,
      loadingTip: '初始化系统...',
      showFPS: process.env.NODE_ENV === 'development',
      currentFPS: 60,

      // Three.js 相关
      scene: null,
      camera: null,
      renderer: null,
      renderThrottler: null,
      postProcessing: null,

      // 优化相关
      modelLoader: null,
      animationId: null
    };
  },
  async mounted() {
    await this.initOptimizedScene();
    this.setupEventListeners();
    this.startRenderLoop();
  },
  beforeDestroy() {
    this.cleanup();
  },
  methods: {
    // 优化的场景初始化
    async initOptimizedScene() {
      try {
        // 1. 初始化基础渲染器
        await this.initRenderer();

        // 2. 初始化场景
        this.initScene();

        // 3. 初始化相机
        this.initCamera();

        // 4. 初始化优化系统
        await this.initOptimizationSystems();

        // 5. 加载模型
        await this.loadModels();

        // 6. 完成初始化
        this.onLoadingComplete();

      } catch (error) {
        console.error('初始化失败:', error);
        this.loadingTip = '加载失败，请刷新重试';
      }
    },

    async initRenderer() {
      this.loadingTip = '初始化渲染器...';
      this.updateProgress(10);

      const container = document.getElementById('container');

      // 创建渲染器
      this.renderer = new THREE.WebGLRenderer({
        antialias: false,  // 关闭抗锯齿，使用后处理代替
        alpha: false,
        powerPreference: 'high-performance'  // 请求高性能GPU
      });

      // 设置渲染器参数
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));  // 限制像素比
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;  // 优化阴影类型

      container.appendChild(this.renderer.domElement);
    },

    initScene() {
      this.loadingTip = '创建3D场景...';
      this.updateProgress(20);

      this.scene = new THREE.Scene();

      // 优化雾效
      this.scene.fog = new THREE.Fog(0x87CEEB, 100, 500);

      // 环境光（降低强度）
      const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
      this.scene.add(ambientLight);

      // 方向光（太阳光）
      const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
      sunLight.position.set(100, 100, 50);
      sunLight.castShadow = true;

      // 优化阴影设置
      sunLight.shadow.mapSize.width = 1024;  // 降低阴影分辨率
      sunLight.shadow.mapSize.height = 1024;
      sunLight.shadow.camera.near = 0.5;
      sunLight.shadow.camera.far = 500;
      sunLight.shadow.camera.left = -100;
      sunLight.shadow.camera.right = 100;
      sunLight.shadow.camera.top = 100;
      sunLight.shadow.camera.bottom = -100;

      this.scene.add(sunLight);
    },

    initCamera() {
      this.loadingTip = '设置视角...';
      this.updateProgress(30);

      this.camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      this.camera.position.set(50, 30, 50);
      this.camera.lookAt(0, 0, 0);
    },

    async initOptimizationSystems() {
      this.loadingTip = '初始化优化系统...';
      this.updateProgress(40);

      // 1. 初始化模型加载器
      this.modelLoader = await initOptimizedLoading(
        this.renderer,
        (progress) => {
          this.loadingProgress = 40 + progress * 0.3;  // 40-70%
        }
      );

      // 2. 初始化渲染节流器
      this.renderThrottler = createOptimizedRenderer(
        this.renderer,
        this.scene,
        this.camera
      );

      // 3. 初始化后处理
      this.postProcessing = new OptimizedPostProcessing(
        this.renderer,
        this.scene,
        this.camera,
        window.innerWidth,
        window.innerHeight
      );

      // 4. 监听质量变化
      window.addEventListener('quality-change', (e) => {
        this.postProcessing.setQuality(e.detail);
      });
    },

    async loadModels() {
      this.loadingTip = '加载3D模型...';
      this.updateProgress(70);

      try {
        // 并行加载模型
        const [turbineModel, terrainModel] = await Promise.all([
          this.modelLoader.loadModel('/models/turbine.glb'),
          this.modelLoader.loadModel('/models/terrain.glb')
        ]);

        // 添加到场景
        this.scene.add(turbineModel);
        this.scene.add(terrainModel);

        // 创建风机实例
        this.createTurbineInstances(turbineModel);

        this.updateProgress(90);
        this.loadingTip = '完善场景细节...';

      } catch (error) {
        console.error('模型加载失败:', error);
        throw error;
      }
    },

    createTurbineInstances(baseModel) {
      // 使用实例化渲染创建多个风机
      const positions = [
        [0, 0, 0],
        [30, 0, 0],
        [-30, 0, 0],
        [0, 0, 30],
        [0, 0, -30]
      ];

      positions.forEach((pos, index) => {
        const turbine = baseModel.clone();
        turbine.position.set(...pos);
        turbine.userData = {
          id: `turbine_${index}`,
          speed: 0.01 + Math.random() * 0.02,
          isRunning: true
        };
        this.scene.add(turbine);
      });

      // 存储风机数据用于动画
      window.windTurbineDataList = this.scene.children.filter(
        child => child.userData.id
      );
    },

    startRenderLoop() {
      const render = () => {
        if (this.postProcessing) {
          this.postProcessing.render();
        } else {
          this.renderer.render(this.scene, this.camera);
        }

        // 更新FPS显示
        if (this.renderThrottler) {
          this.currentFPS = this.renderThrottler.getFPS();
        }
      };

      // 使用优化的渲染循环
      this.renderThrottler.render(render);
    },

    setupEventListeners() {
      // 窗口大小调整
      window.addEventListener('resize', this.onWindowResize, false);

      // 页面可见性变化
      document.addEventListener('visibilitychange', this.onVisibilityChange);
    },

    onWindowResize() {
      if (!this.camera || !this.renderer) return;

      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      if (this.postProcessing) {
        this.postProcessing.setSize(window.innerWidth, window.innerHeight);
      }
    },

    onVisibilityChange() {
      // 页面不可见时暂停渲染
      if (document.hidden) {
        this.renderThrottler.setTargetFPS(5);
      } else {
        this.renderThrottler.setTargetFPS(60);
      }
    },

    updateProgress(progress) {
      this.loadingProgress = Math.min(100, Math.max(0, progress));
    },

    onLoadingComplete() {
      this.loadingTip = '加载完成！';
      this.updateProgress(100);

      setTimeout(() => {
        this.isLoading = false;
      }, 500);
    },

    cleanup() {
      // 取消动画帧
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }

      // 清理优化系统
      if (this.modelLoader) {
        this.modelLoader.dispose();
      }

      if (this.postProcessing) {
        this.postProcessing.dispose();
      }

      if (this.renderThrottler) {
        this.renderThrottler = null;
      }

      // 清理纹理
      textureOptimizer.dispose();

      // 清理渲染器
      if (this.renderer) {
        this.renderer.dispose();
      }
    }
  }
};
</script>

<style scoped>
/* 保持原有样式，添加FPS监视器样式 */
.fps-monitor {
  position: fixed;
  top: 10px;
  right: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: #00ff00;
  padding: 5px 10px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 14px;
  z-index: 9999;
}

.loading-tips {
  margin-top: 10px;
  font-size: 14px;
  color: #999;
}

/* 其他样式保持不变 */
</style>