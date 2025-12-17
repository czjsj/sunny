// 渲染节流器 - 优化帧率
export class RenderThrottler {
  constructor() {
    this.targetFPS = 60;
    this.frameInterval = 1000 / this.targetFPS;
    this.lastFrameTime = 0;
    this.needsRedraw = true;
    this.animationCallbacks = [];
    this.stats = {
      actualFPS: 0,
      frameCount: 0,
      lastFPSUpdate: performance.now()
    };
  }

  // 设置目标帧率
  setTargetFPS(fps) {
    this.targetFPS = fps;
    this.frameInterval = 1000 / fps;
  }

  // 标记需要重绘
  markNeedsRedraw() {
    this.needsRedraw = true;
  }

  // 添加动画回调
  addAnimationCallback(callback) {
    this.animationCallbacks.push(callback);
  }

  // 主渲染循环
  render(renderCallback) {
    const currentTime = performance.now();

    // 更新FPS统计
    this.updateFPS(currentTime);

    // 节流控制
    if (currentTime - this.lastFrameTime < this.frameInterval) {
      requestAnimationFrame(() => this.render(renderCallback));
      return;
    }

    // 执行动画回调
    this.animationCallbacks.forEach(callback => callback(currentTime));

    // 只在需要时渲染
    if (this.needsRedraw) {
      renderCallback();
      this.needsRedraw = false;
    }

    this.lastFrameTime = currentTime;
    requestAnimationFrame(() => this.render(renderCallback));
  }

  // 更新FPS统计
  updateFPS(currentTime) {
    this.stats.frameCount++;

    if (currentTime - this.stats.lastFPSUpdate >= 1000) {
      this.stats.actualFPS = this.stats.frameCount;
      this.stats.frameCount = 0;
      this.stats.lastFPSUpdate = currentTime;

      // 自动调整质量
      this.autoAdjustQuality();
    }
  }

  // 自动调整质量
  autoAdjustQuality() {
    const fps = this.stats.actualFPS;

    if (fps < 30) {
      // 降低质量
      this.setTargetFPS(30);
      window.emit('quality-change', 'low');
    } else if (fps < 45) {
      this.setTargetFPS(45);
      window.emit('quality-change', 'medium');
    } else if (fps > 55) {
      this.setTargetFPS(60);
      window.emit('quality-change', 'high');
    }
  }

  // 获取当前FPS
  getFPS() {
    return this.stats.actualFPS;
  }
}

// 使用示例
export const createOptimizedRenderer = (renderer, scene, camera) => {
  const throttler = new RenderThrottler();

  // 风机动画节流
  const turbineAnimation = (currentTime) => {
    // 每100ms更新一次风机动画
    if (!turbineAnimation.lastUpdate || currentTime - turbineAnimation.lastUpdate > 100) {
      window.windTurbineDataList?.forEach(turbine => {
        if (turbine.rotor && turbine.isRunning) {
          turbine.rotor.rotation.x += turbine.speed || 0.01;
        }
      });
      turbineAnimation.lastUpdate = currentTime;
      throttler.markNeedsRedraw();
    }
  };

  throttler.addAnimationCallback(turbineAnimation);

  // 相机移动检测
  let cameraPosition = new THREE.Vector3();
  let cameraQuaternion = new THREE.Quaternion();

  const cameraCheck = () => {
    const currentPos = camera.position.clone();
    const currentQuat = camera.quaternion.clone();

    if (!cameraPosition.equals(currentPos) || !cameraQuaternion.equals(currentQuat)) {
      cameraPosition.copy(currentPos);
      cameraQuaternion.copy(currentQuat);
      throttler.markNeedsRedraw();
    }
  };

  throttler.addAnimationCallback(cameraCheck);

  return throttler;
};