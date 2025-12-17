/**
 * CompressedModelLoader - 压缩模型加载器
 * 支持DRACO压缩的GLTF/GLB模型加载，提供LOD生成和渐进式加载
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class CompressedModelLoader {
  constructor(loadingManager = null) {
    this.loadingManager = loadingManager || new THREE.LoadingManager();
    
    // 初始化DRACO解码器
    this.dracoLoader = new DRACOLoader();
    this.setupDracoDecoder();
    
    // 初始化GLTF加载器
    this.gltfLoader = new GLTFLoader(this.loadingManager);
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
    
    // 初始化FBX加载器（用于向后兼容）
    this.fbxLoader = new FBXLoader(this.loadingManager);
    
    // 模型缓存
    this.modelCache = new Map();
    this.maxCacheSize = 20;
    
    // 性能统计
    this.stats = {
      modelsLoaded: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      compressionRatio: 0
    };
  }
  
  /**
   * 设置DRACO解码器路径
   */
  setupDracoDecoder() {
    // 设置DRACO解码器路径
    this.dracoLoader.setDecoderPath('/draco/');
    this.dracoLoader.setDecoderConfig({ type: 'js' });
    
    // 预加载解码器以提高首次加载速度
    this.dracoLoader.preload();
  }
  
  /**
   * 加载优化的模型
   * @param {string} url - 模型文件路径
   * @param {Object} options - 加载选项
   * @returns {Promise} 返回加载的模型
   */
  async loadOptimizedModel(url, options = {}) {
    const {
      enableLOD = false,
      lodLevels = [1.0, 0.5, 0.25],
      enableCaching = true,
      onProgress = null,
      fallbackToFBX = true
    } = options;
    
    // 检查缓存
    if (enableCaching && this.modelCache.has(url)) {
      const cachedModel = this.modelCache.get(url);
      return cachedModel.clone();
    }
    
    try {
      // 尝试加载压缩的GLTF/GLB模型
      const model = await this.loadGLTFModel(url, onProgress);
      
      // 应用优化
      this.optimizeModel(model);
      
      // 生成LOD级别
      if (enableLOD) {
        this.generateLOD(model, lodLevels);
      }
      
      // 缓存模型
      if (enableCaching && this.modelCache.size < this.maxCacheSize) {
        this.modelCache.set(url, model);
      }
      
      // 更新统计信息
      this.updateStats(url, true);
      
      return model;
      
    } catch (error) {
      console.warn(`GLTF加载失败: ${url}`, error);
      
      // 回退到FBX加载
      if (fallbackToFBX) {
        const fbxUrl = url.replace(/\.(glb|gltf)$/i, '.fbx');
        return this.loadFBXModel(fbxUrl, onProgress);
      }
      
      throw error;
    }
  }
  
  /**
   * 加载GLTF模型
   */
  loadGLTFModel(url, onProgress) {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          resolve(gltf.scene);
        },
        onProgress,
        reject
      );
    });
  }
  
  /**
   * 加载FBX模型（回退选项）
   */
  loadFBXModel(url, onProgress) {
    return new Promise((resolve, reject) => {
      this.fbxLoader.load(
        url,
        (fbx) => {
          resolve(fbx);
        },
        onProgress,
        reject
      );
    });
  }
  
  /**
   * 优化模型
   */
  optimizeModel(model) {
    model.traverse((child) => {
      if (child.isMesh) {
        // 优化几何体
        if (child.geometry) {
          // 合并顶点
          child.geometry.mergeVertices();
          
          // 计算法线（如果需要）
          if (!child.geometry.attributes.normal) {
            child.geometry.computeVertexNormals();
          }
          
          // 计算包围盒
          child.geometry.computeBoundingBox();
          child.geometry.computeBoundingSphere();
        }
        
        // 优化材质
        if (child.material) {
          // 启用材质缓存
          child.material.transparent = child.material.transparent || false;
          
          // 优化纹理
          if (child.material.map) {
            child.material.map.generateMipmaps = true;
            child.material.map.minFilter = THREE.LinearMipmapLinearFilter;
            child.material.map.magFilter = THREE.LinearFilter;
          }
        }
        
        // 启用阴影（仅对重要对象）
        const importantObjects = ['turbine', 'transformer', 'building'];
        const shouldCastShadow = importantObjects.some(name => 
          child.name.toLowerCase().includes(name)
        );
        
        child.castShadow = shouldCastShadow;
        child.receiveShadow = shouldCastShadow;
      }
    });
  }
  
  /**
   * 生成LOD级别
   */
  generateLOD(model, levels = [1.0, 0.5, 0.25]) {
    const lodGroup = new THREE.LOD();
    
    levels.forEach((level, index) => {
      const lodModel = model.clone();
      
      // 简化几何体（基于距离）
      if (level < 1.0) {
        this.simplifyGeometry(lodModel, level);
      }
      
      // 设置LOD距离
      const distance = index * 100; // 每100单位切换一个LOD级别
      lodGroup.addLevel(lodModel, distance);
    });
    
    // 替换原模型
    if (model.parent) {
      model.parent.add(lodGroup);
      model.parent.remove(model);
    }
    
    return lodGroup;
  }
  
  /**
   * 简化几何体
   */
  simplifyGeometry(model, level) {
    model.traverse((child) => {
      if (child.isMesh && child.geometry) {
        // 简单的顶点减少（实际项目中可以使用更复杂的简化算法）
        const geometry = child.geometry;
        
        if (geometry.attributes.position) {
          const positions = geometry.attributes.position.array;
          const simplifiedPositions = new Float32Array(Math.floor(positions.length * level));
          
          // 简单的抽样简化
          const step = Math.floor(1 / level);
          let writeIndex = 0;
          
          for (let i = 0; i < positions.length; i += step * 3) {
            if (writeIndex < simplifiedPositions.length - 2) {
              simplifiedPositions[writeIndex] = positions[i];
              simplifiedPositions[writeIndex + 1] = positions[i + 1];
              simplifiedPositions[writeIndex + 2] = positions[i + 2];
              writeIndex += 3;
            }
          }
          
          // 更新几何体
          geometry.setAttribute('position', new THREE.BufferAttribute(simplifiedPositions, 3));
          geometry.computeVertexNormals();
        }
      }
    });
  }
  
  /**
   * 批量加载模型
   */
  async loadModelBatch(urls, options = {}) {
    const {
      maxConcurrent = 3,
      onProgress = null,
      onBatchComplete = null
    } = options;
    
    const results = [];
    const errors = [];
    
    // 分批加载以避免过多并发请求
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (url, index) => {
        try {
          const model = await this.loadOptimizedModel(url, options);
          
          if (onProgress) {
            onProgress({
              loaded: i + index + 1,
              total: urls.length,
              url: url,
              model: model
            });
          }
          
          return { url, model, success: true };
        } catch (error) {
          errors.push({ url, error });
          return { url, error, success: false };
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    if (onBatchComplete) {
      onBatchComplete({
        results,
        errors,
        successCount: results.filter(r => r.success).length,
        errorCount: errors.length
      });
    }
    
    return results;
  }
  
  /**
   * 更新性能统计
   */
  updateStats(url, compressed) {
    this.stats.modelsLoaded++;
    
    // 这里可以添加实际的文件大小统计
    // 实际项目中需要从HTTP响应头获取文件大小
    if (compressed) {
      this.stats.totalCompressedSize += 1; // 占位符
    } else {
      this.stats.totalOriginalSize += 1; // 占位符
    }
    
    if (this.stats.totalOriginalSize > 0) {
      this.stats.compressionRatio = 
        (this.stats.totalOriginalSize - this.stats.totalCompressedSize) / 
        this.stats.totalOriginalSize;
    }
  }
  
  /**
   * 获取性能统计
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.modelCache.size,
      compressionRatioPercent: Math.round(this.stats.compressionRatio * 100)
    };
  }
  
  /**
   * 清理缓存
   */
  clearCache() {
    // 释放缓存的模型资源
    this.modelCache.forEach((model) => {
      model.traverse((child) => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(material => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    });
    
    this.modelCache.clear();
  }
  
  /**
   * 销毁加载器
   */
  dispose() {
    this.clearCache();
    
    // 清理DRACO加载器
    if (this.dracoLoader) {
      this.dracoLoader.dispose();
    }
  }
}

export default CompressedModelLoader;