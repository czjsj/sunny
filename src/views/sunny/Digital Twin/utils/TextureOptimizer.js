// 纹理优化器
import * as THREE from 'three';

export class TextureOptimizer {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
  }

  // 加载优化的纹理
  loadTexture(url, options = {}) {
    // 检查缓存
    if (this.cache.has(url)) {
      return Promise.resolve(this.cache.get(url));
    }

    // 检查是否正在加载
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url);
    }

    // 开始加载
    const promise = new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();

      // 尝试加载WebP格式，失败则降级到原格式
      const webpUrl = url.replace(/\.(jpg|jpeg|png)$/i, '.webp');

      loader.load(
        webpUrl,
        (texture) => {
          const optimizedTexture = this.optimizeTexture(texture, options);
          this.cache.set(url, optimizedTexture);
          this.cache.set(webpUrl, optimizedTexture);
          resolve(optimizedTexture);
        },
        undefined,
        (error) => {
          // WebP加载失败，尝试原格式
          loader.load(
            url,
            (texture) => {
              const optimizedTexture = this.optimizeTexture(texture, options);
              this.cache.set(url, optimizedTexture);
              resolve(optimizedTexture);
            },
            undefined,
            reject
          );
        }
      );
    });

    this.loadingPromises.set(url, promise);
    return promise;
  }

  // 优化纹理设置
  optimizeTexture(texture, options = {}) {
    // 设置编码
    texture.encoding = THREE.sRGBEncoding;

    // 设置过滤方式
    texture.minFilter = options.minFilter || THREE.LinearMipmapLinearFilter;
    texture.magFilter = options.magFilter || THREE.LinearFilter;

    // 设置各向异性过滤（降低以提升性能）
    texture.anisotropy = options.anisotropy || 4;

    // 生成Mipmap
    if (options.generateMipmaps !== false) {
      texture.generateMipmaps = true;
    }

    // 翻转Y轴（如果需要）
    if (options.flipY !== undefined) {
      texture.flipY = options.flipY;
    }

    // 预乘Alpha
    if (options.premultiplyAlpha) {
      texture.premultiplyAlpha = true;
    }

    // 标记需要更新
    texture.needsUpdate = true;

    return texture;
  }

  // 创建压缩纹理
  createCompressedTexture(source, options = {}) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 设置目标尺寸
    const width = options.width || Math.min(source.width, 1024);
    const height = options.height || Math.min(source.height, 1024);

    canvas.width = width;
    canvas.height = height;

    // 绘制并压缩
    ctx.drawImage(source, 0, 0, width, height);

    // 转换为DataTexture
    const imageData = ctx.getImageData(0, 0, width, height);
    const texture = new THREE.DataTexture(
      imageData.data,
      width,
      height,
      THREE.RGBAFormat
    );

    return this.optimizeTexture(texture, options);
  }

  // 批量加载纹理
  async loadTextures(urls, options = {}) {
    const promises = urls.map(url => this.loadTexture(url, options));
    return Promise.all(promises);
  }

  // 释放未使用的纹理
  disposeUnusedTextures(usedTextures) {
    for (const [url, texture] of this.cache) {
      if (!usedTextures.has(url)) {
        texture.dispose();
        this.cache.delete(url);
      }
    }
  }

  // 获取纹理内存使用情况
  getMemoryUsage() {
    let totalMemory = 0;
    this.cache.forEach(texture => {
      if (texture.image) {
        const width = texture.image.width || 0;
        const height = texture.image.height || 0;
        // 估算内存使用（RGBA，每像素4字节）
        totalMemory += width * height * 4;
      }
    });
    return totalMemory;
  }

  // 清理所有缓存
  dispose() {
    this.cache.forEach(texture => texture.dispose());
    this.cache.clear();
    this.loadingPromises.clear();
  }
}

// 全局纹理优化器实例
export const textureOptimizer = new TextureOptimizer();

// 便捷的纹理加载函数
export const loadOptimizedTexture = (url, options) => {
  return textureOptimizer.loadTexture(url, options);
};