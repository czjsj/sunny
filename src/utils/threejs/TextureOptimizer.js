/**
 * TextureOptimizer - 纹理优化器
 * 支持WebP格式转换、自动分辨率缩放、Mipmap生成和纹理池管理
 */

import * as THREE from 'three';

export class TextureOptimizer {
  constructor(loadingManager = null) {
    this.loadingManager = loadingManager || new THREE.LoadingManager();
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    
    // 纹理缓存和池
    this.textureCache = new Map();
    this.texturePool = new Map();
    this.maxCacheSize = 50;
    this.maxPoolSize = 20;
    
    // 支持的格式优先级（WebP优先）
    this.formatPriority = ['webp', 'jpg', 'jpeg', 'png'];
    
    // 性能统计
    this.stats = {
      texturesLoaded: 0,
      totalOriginalMemory: 0,
      totalOptimizedMemory: 0,
      memoryReduction: 0,
      cacheHits: 0,
      poolHits: 0
    };
    
    // 检测WebP支持
    this.webpSupported = this.detectWebPSupport();
  }
  
  /**
   * 检测浏览器WebP支持
   */
  detectWebPSupport() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    try {
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * 加载优化的纹理
   * @param {string} url - 纹理文件路径
   * @param {Object} options - 优化选项
   * @returns {Promise<THREE.Texture>} 优化后的纹理
   */
  async loadOptimizedTexture(url, options = {}) {
    const {
      maxResolution = 2048,
      enableMipmaps = true,
      anisotropy = null,
      format = THREE.RGBAFormat,
      encoding = THREE.sRGBEncoding,
      wrapS = THREE.RepeatWrapping,
      wrapT = THREE.RepeatWrapping,
      minFilter = THREE.LinearMipmapLinearFilter,
      magFilter = THREE.LinearFilter,
      enableCaching = true,
      enablePooling = true,
      compressionQuality = 0.8
    } = options;
    
    // 生成缓存键
    const cacheKey = this.generateCacheKey(url, options);
    
    // 检查缓存
    if (enableCaching && this.textureCache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.textureCache.get(cacheKey).clone();
    }
    
    // 检查纹理池
    if (enablePooling && this.texturePool.has(cacheKey)) {
      this.stats.poolHits++;
      const pooledTexture = this.texturePool.get(cacheKey);
      this.texturePool.delete(cacheKey);
      return pooledTexture;
    }
    
    try {
      // 尝试加载最优格式
      const optimizedUrl = await this.getOptimizedUrl(url);
      const texture = await this.loadTexture(optimizedUrl);
      
      // 应用优化设置
      this.applyOptimizations(texture, {
        maxResolution,
        enableMipmaps,
        anisotropy,
        format,
        encoding,
        wrapS,
        wrapT,
        minFilter,
        magFilter
      });
      
      // 缓存纹理
      if (enableCaching && this.textureCache.size < this.maxCacheSize) {
        this.textureCache.set(cacheKey, texture.clone());
      }
      
      // 更新统计
      this.updateStats(texture, optimizedUrl !== url);
      
      return texture;
      
    } catch (error) {
      console.warn(`纹理加载失败: ${url}`, error);
      
      // 回退到原始URL
      if (url !== await this.getOptimizedUrl(url)) {
        return this.loadTexture(url);
      }
      
      throw error;
    }
  }
  
  /**
   * 获取优化的URL（尝试WebP格式）
   */
  async getOptimizedUrl(url) {
    if (!this.webpSupported) {
      return url;
    }
    
    // 尝试WebP格式
    const webpUrl = url.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    
    if (webpUrl !== url) {
      // 检查WebP文件是否存在
      try {
        const response = await fetch(webpUrl, { method: 'HEAD' });
        if (response.ok) {
          return webpUrl;
        }
      } catch (e) {
        // WebP文件不存在，使用原始格式
      }
    }
    
    return url;
  }
  
  /**
   * 加载纹理
   */
  loadTexture(url) {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }
  
  /**
   * 应用纹理优化
   */
  applyOptimizations(texture, options) {
    const {
      maxResolution,
      enableMipmaps,
      anisotropy,
      format,
      encoding,
      wrapS,
      wrapT,
      minFilter,
      magFilter
    } = options;
    
    // 设置基本属性
    texture.format = format;
    texture.encoding = encoding;
    texture.wrapS = wrapS;
    texture.wrapT = wrapT;
    texture.minFilter = minFilter;
    texture.magFilter = magFilter;
    
    // 设置各向异性过滤
    if (anisotropy !== null) {
      texture.anisotropy = anisotropy;
    } else {
      // 使用硬件支持的最大值
      texture.anisotropy = Math.min(16, THREE.WebGLRenderer.prototype.capabilities?.getMaxAnisotropy?.() || 1);
    }
    
    // 生成Mipmaps
    texture.generateMipmaps = enableMipmaps;
    
    // 分辨率限制
    if (maxResolution && texture.image) {
      this.limitResolution(texture, maxResolution);
    }
    
    // 标记需要更新
    texture.needsUpdate = true;
  }
  
  /**
   * 限制纹理分辨率
   */
  limitResolution(texture, maxResolution) {
    const image = texture.image;
    
    if (!image || (!image.width && !image.height)) {
      return;
    }
    
    const width = image.width || image.videoWidth || 0;
    const height = image.height || image.videoHeight || 0;
    
    if (width <= maxResolution && height <= maxResolution) {
      return;
    }
    
    // 计算缩放比例
    const scale = Math.min(maxResolution / width, maxResolution / height);
    const newWidth = Math.floor(width * scale);
    const newHeight = Math.floor(height * scale);
    
    // 创建canvas进行缩放
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    canvas.width = newWidth;
    canvas.height = newHeight;
    
    // 绘制缩放后的图像
    ctx.drawImage(image, 0, 0, newWidth, newHeight);
    
    // 更新纹理图像
    texture.image = canvas;
  }
  
  /**
   * 创建Mipmaps
   */
  createMipmaps(texture, maxSize = 1024) {
    if (!texture.image) return;
    
    const image = texture.image;
    const width = image.width || image.videoWidth || 0;
    const height = image.height || image.videoHeight || 0;
    
    if (width <= maxSize && height <= maxSize) {
      texture.generateMipmaps = true;
      return;
    }
    
    // 手动生成Mipmaps
    const mipmaps = [];
    let currentWidth = width;
    let currentHeight = height;
    let currentImage = image;
    
    while (currentWidth > 1 || currentHeight > 1) {
      mipmaps.push(currentImage);
      
      currentWidth = Math.max(1, Math.floor(currentWidth / 2));
      currentHeight = Math.max(1, Math.floor(currentHeight / 2));
      
      // 创建下一级Mipmap
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = currentWidth;
      canvas.height = currentHeight;
      
      ctx.drawImage(currentImage, 0, 0, currentWidth, currentHeight);
      currentImage = canvas;
    }
    
    texture.mipmaps = mipmaps;
    texture.generateMipmaps = false;
  }
  
  /**
   * 批量加载纹理
   */
  async loadTextureBatch(urls, options = {}) {
    const {
      maxConcurrent = 5,
      onProgress = null,
      onBatchComplete = null
    } = options;
    
    const results = [];
    const errors = [];
    
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      
      const batchPromises = batch.map(async (url, index) => {
        try {
          const texture = await this.loadOptimizedTexture(url, options);
          
          if (onProgress) {
            onProgress({
              loaded: i + index + 1,
              total: urls.length,
              url: url,
              texture: texture
            });
          }
          
          return { url, texture, success: true };
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
   * 回收纹理到池中
   */
  recycleTexture(texture, cacheKey) {
    if (this.texturePool.size < this.maxPoolSize) {
      this.texturePool.set(cacheKey, texture);
      return true;
    }
    
    // 池已满，直接释放
    this.disposeTexture(texture);
    return false;
  }
  
  /**
   * 释放纹理资源
   */
  disposeTexture(texture) {
    if (texture && typeof texture.dispose === 'function') {
      texture.dispose();
    }
  }
  
  /**
   * 生成缓存键
   */
  generateCacheKey(url, options) {
    const optionsStr = JSON.stringify({
      maxResolution: options.maxResolution,
      format: options.format,
      encoding: options.encoding,
      anisotropy: options.anisotropy
    });
    
    return `${url}_${btoa(optionsStr)}`;
  }
  
  /**
   * 更新性能统计
   */
  updateStats(texture, optimized) {
    this.stats.texturesLoaded++;
    
    // 估算内存使用（简化计算）
    const image = texture.image;
    if (image) {
      const width = image.width || image.videoWidth || 0;
      const height = image.height || image.videoHeight || 0;
      const memory = width * height * 4; // RGBA = 4 bytes per pixel
      
      if (optimized) {
        this.stats.totalOptimizedMemory += memory;
      } else {
        this.stats.totalOriginalMemory += memory;
      }
    }
    
    if (this.stats.totalOriginalMemory > 0) {
      this.stats.memoryReduction = 
        (this.stats.totalOriginalMemory - this.stats.totalOptimizedMemory) / 
        this.stats.totalOriginalMemory;
    }
  }
  
  /**
   * 获取性能统计
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.textureCache.size,
      poolSize: this.texturePool.size,
      memoryReductionPercent: Math.round(this.stats.memoryReduction * 100),
      totalMemoryMB: Math.round((this.stats.totalOptimizedMemory + this.stats.totalOriginalMemory) / (1024 * 1024))
    };
  }
  
  /**
   * 清理缓存和池
   */
  clearCache() {
    // 清理缓存
    this.textureCache.forEach((texture) => {
      this.disposeTexture(texture);
    });
    this.textureCache.clear();
    
    // 清理池
    this.texturePool.forEach((texture) => {
      this.disposeTexture(texture);
    });
    this.texturePool.clear();
  }
  
  /**
   * 自动清理未使用的纹理
   */
  autoCleanup(scene) {
    const usedTextures = new Set();
    
    // 遍历场景收集正在使用的纹理
    scene.traverse((object) => {
      if (object.material) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        
        materials.forEach((material) => {
          // 收集各种类型的纹理
          ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap'].forEach((prop) => {
            if (material[prop]) {
              usedTextures.add(material[prop]);
            }
          });
        });
      }
    });
    
    // 清理未使用的缓存纹理
    const unusedKeys = [];
    this.textureCache.forEach((texture, key) => {
      if (!usedTextures.has(texture)) {
        unusedKeys.push(key);
      }
    });
    
    unusedKeys.forEach((key) => {
      const texture = this.textureCache.get(key);
      this.disposeTexture(texture);
      this.textureCache.delete(key);
    });
    
    console.log(`清理了 ${unusedKeys.length} 个未使用的纹理`);
  }
  
  /**
   * 销毁优化器
   */
  dispose() {
    this.clearCache();
  }
}

export default TextureOptimizer;