// 优化版本的后处理系统 - 专注于性能
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';

export class OptimizedPostProcessing {
  constructor(renderer, scene, camera, width, height) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.width = width;
    this.height = height;

    // 简化设置，只保留必要效果
    this.settings = {
      bloom: {
        enabled: true,
        strength: 0.5, // 降低强度
        radius: 0.2,   // 减小半径
        threshold: 0.9  // 提高阈值
      },
      outline: {
        enabled: true,
        edgeStrength: 10, // 降低强度
        edgeThickness: 2  // 减小厚度
      }
    };

    this.init();
  }

  init() {
    // 创建基础composer
    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(this.width, this.height);

    // 降低像素比例以提升性能
    this.composer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));

    // 添加渲染通道
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // 只在高端设备启用bloom
    if (this.isHighEndDevice()) {
      this.addBloomPass();
    }

    // 只在需要时启用outline
    this.addOutlinePass();
  }

  isHighEndDevice() {
    // 检测设备性能
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

    if (debugInfo) {
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      // 检测是否为独立显卡
      return renderer.includes('NVIDIA') || renderer.includes('AMD') || renderer.includes('Intel');
    }
    return false;
  }

  addBloomPass() {
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      this.settings.bloom.strength,
      this.settings.bloom.radius,
      this.settings.bloom.threshold
    );

    this.composer.addPass(bloomPass);
    this.bloomPass = bloomPass;
  }

  addOutlinePass() {
    const outlinePass = new OutlinePass(
      new THREE.Vector2(this.width, this.height),
      this.scene,
      this.camera
    );

    outlinePass.edgeStrength = this.settings.outline.edgeStrength;
    outlinePass.edgeThickness = this.settings.outline.edgeThickness;
    outlinePass.enabled = false; // 默认关闭，按需启用

    this.composer.addPass(outlinePass);
    this.outlinePass = outlinePass;
  }

  // 动态调整质量
  setQuality(level) {
    switch(level) {
      case 'low':
        if (this.bloomPass) this.bloomPass.enabled = false;
        this.composer.setPixelRatio(1);
        break;
      case 'medium':
        if (this.bloomPass) this.bloomPass.enabled = true;
        this.bloomPass && (this.bloomPass.strength = 0.3);
        this.composer.setPixelRatio(1.5);
        break;
      case 'high':
        if (this.bloomPass) this.bloomPass.enabled = true;
        this.bloomPass && (this.bloomPass.strength = 0.5);
        this.composer.setPixelRatio(Math.min(2, window.devicePixelRatio));
        break;
    }
  }

  render() {
    return this.composer.render();
  }

  dispose() {
    this.composer.dispose();
  }
}