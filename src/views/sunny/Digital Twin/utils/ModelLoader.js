// 优化的模型加载器
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

export class OptimizedModelLoader {
  constructor(renderer) {
    // 设置加载器
    this.gltfLoader = new GLTFLoader();

    // DRACO压缩解码器
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('/draco/');
    this.gltfLoader.setDRACOLoader(this.dracoLoader);

    // KTX2纹理加载器
    this.ktx2Loader = new KTX2Loader();
    this.ktx2Loader.setTranscoderPath('/basis/');
    if (renderer) {
      this.ktx2Loader.detectSupport(renderer);
    }
    this.gltfLoader.setKTX2Loader(this.ktx2Loader);

    // 缓存已加载的模型
    this.cache = new Map();

    // 加载队列管理
    this.loadingQueue = [];
    this.isLoading = false;

    // 进度回调
    this.onProgress = null;
  }

  // 预加载关键模型
  async preloadCriticalModels() {
    const criticalModels = [
      '/models/turbine.glb',  // 使用压缩后的GLTF格式
      '/models/terrain.glb',
      '/models/substation.glb'
    ];

    const loadingPromises = criticalModels.map(url =>
      this.loadModel(url, { priority: 'high' })
    );

    try {
      await Promise.all(loadingPromises);
      console.log('关键模型预加载完成');
    } catch (error) {
      console.error('模型预加载失败:', error);
    }
  }

  // 加载单个模型
  loadModel(url, options = {}) {
    // 检查缓存
    if (this.cache.has(url)) {
      return Promise.resolve(this.cache.get(url));
    }

    // 添加到队列
    return new Promise((resolve, reject) => {
      this.loadingQueue.push({
        url,
        options,
        resolve,
        reject
      });

      if (!this.isLoading) {
        this.processQueue();
      }
    });
  }

  // 处理加载队列
  async processQueue() {
    if (this.loadingQueue.length === 0) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;

    // 按优先级排序
    this.loadingQueue.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.options.priority] - priorityOrder[b.options.priority];
    });

    const item = this.loadingQueue.shift();

    try {
      const gltf = await this.loadGLTF(item.url);

      // 优化模型
      const optimizedModel = this.optimizeModel(gltf.scene, item.options);

      // 缓存模型
      this.cache.set(item.url, optimizedModel);

      item.resolve(optimizedModel);
    } catch (error) {
      console.error(`加载模型失败 ${item.url}:`, error);
      item.reject(error);
    }

    // 继续处理队列
    setTimeout(() => this.processQueue(), 100); // 短暂延迟避免阻塞
  }

  // 实际的GLTF加载
  loadGLTF(url) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => resolve(gltf),
        (progress) => {
          if (this.onProgress) {
            const percent = (progress.loaded / progress.total) * 100;
            this.onProgress(percent);
          }
        },
        (error) => reject(error)
      );
    });
  }

  // 优化加载的模型
  optimizeModel(model, options = {}) {
    model.traverse((child) => {
      // 优化材质
      if (child.isMesh && child.material) {
        this.optimizeMaterial(child.material);
      }

      // 优化几何体
      if (child.isMesh && child.geometry) {
        this.optimizeGeometry(child.geometry);
      }

      // 设置阴影
      if (child.isMesh && options.castShadow !== false) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    // 启用实例化渲染（如果适用）
    if (options.instanced && this.canInstance(model)) {
      return this.createInstancedMesh(model);
    }

    return model;
  }

  // 优化材质
  optimizeMaterial(material) {
    if (Array.isArray(material)) {
      material.forEach(m => this.optimizeSingleMaterial(m));
    } else {
      this.optimizeSingleMaterial(material);
    }
  }

  optimizeSingleMaterial(material) {
    // 启用材质压缩
    if (material.map) {
      material.map.encoding = THREE.sRGBEncoding;
      material.map.anisotropy = 4; // 降低各向异性过滤
    }

    // 优化光照
    material.roughness = Math.max(0.5, material.roughness); // 增加粗糙度减少计算
    material.metalness = Math.min(0.5, material.metalness); // 降低金属度

    // 启用几何体压缩
    material.needsUpdate = true;
  }

  // 优化几何体
  optimizeGeometry(geometry) {
    // 合并顶点
    if (geometry.attributes.position) {
      geometry.computeVertexNormals();
    }

    // 简化几何体（如果顶点数过多）
    if (geometry.attributes.position && geometry.attributes.position.count > 10000) {
      // 可以使用simplify-geometry库进一步简化
      console.warn('检测到高顶点数模型，考虑使用LOD');
    }
  }

  // 检查是否可以使用实例化
  canInstance(model) {
    // 简单的检查逻辑
    return model.children.length === 1 &&
           model.children[0].isMesh &&
           model.children[0].geometry;
  }

  // 创建实例化网格
  createInstancedMesh(model) {
    const mesh = model.children[0];
    const instancedMesh = new THREE.InstancedMesh(
      mesh.geometry,
      mesh.material,
      100 // 实例数量
    );

    // 设置实例矩阵
    const matrix = new THREE.Matrix4();
    for (let i = 0; i < 100; i++) {
      matrix.setPosition(
        Math.random() * 100 - 50,
        0,
        Math.random() * 100 - 50
      );
      instancedMesh.setMatrixAt(i, matrix);
    }

    instancedMesh.instanceMatrix.needsUpdate = true;
    return instancedMesh;
  }

  // 设置加载进度回调
  setProgressCallback(callback) {
    this.onProgress = callback;
  }

  // 清理缓存
  clearCache() {
    this.cache.forEach(model => {
      model.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    this.cache.clear();
  }

  // 释放资源
  dispose() {
    this.clearCache();
    this.dracoLoader.dispose();
    this.ktx2Loader.dispose();
  }
}

// 使用示例
export const initOptimizedLoading = async (renderer, onProgress) => {
  const loader = new OptimizedModelLoader(renderer);
  loader.setProgressCallback(onProgress);

  // 开始预加载
  await loader.preloadCriticalModels();

  return loader;
};