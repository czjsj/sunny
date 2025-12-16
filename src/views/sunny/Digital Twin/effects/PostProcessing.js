// src/views/sunny/Digital Twin/effects/PostProcessing.js
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { SMAAPass } from 'three/examples/jsm/postprocessing/SMAAPass.js';

export class PostProcessingSystem {
  constructor(renderer, scene, camera, width, height) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.width = width;
    this.height = height;

    this.composer = null;
    this.passes = new Map();
    this.settings = {
      bloom: {
        enabled: true,
        strength: 1.5,
        radius: 0.4,
        threshold: 0.85
      },
      outline: {
        enabled: true,
        edgeStrength: 20,
        edgeGlow: 1,
        edgeThickness: 10,
        visibleEdgeColor: '#f20c00',
        hiddenEdgeColor: '#190a05'
      },
      glitch: {
        enabled: true,
        goWild: false,
        frequency: 0.1
      },
      fxaa: {
        enabled: true
      },
      adaptiveQuality: true
    };

    this.init();
  }

  init() {
    this.createComposer();
    this.createBasePasses();
    this.createEffectPasses();
    this.createAdaptiveSystem();
  }

  createComposer() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(this.width, this.height);

    // 设置像素比例
    const pixelRatio = this.renderer.getPixelRatio();
    this.composer.setPixelRatio(pixelRatio);
  }

  createBasePasses() {
    // 渲染通道 - 必须的第一个通道
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    this.passes.set('render', renderPass);
  }

  createEffectPasses() {
    // 1. 泛光效果
    this.createBloomEffect();

    // 2. 边缘发光效果
    this.createOutlineEffect();

    // 3. 故障效果
    this.createGlitchEffect();

    // 4. 抗锯齿
    this.createAntiAliasing();
  }

  createBloomEffect() {
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.width, this.height),
      this.settings.bloom.strength,
      this.settings.bloom.radius,
      this.settings.bloom.threshold
    );

    bloomPass.threshold = this.settings.bloom.threshold;
    bloomPass.strength = this.settings.bloom.strength;
    bloomPass.radius = this.settings.bloom.radius;
    bloomPass.enabled = this.settings.bloom.enabled;

    this.composer.addPass(bloomPass);
    this.passes.set('bloom', bloomPass);

    // 动态调整泛光
    this.animateBloom(bloomPass);
  }

  createOutlineEffect() {
    const outlinePass = new OutlinePass(
      new THREE.Vector2(this.width, this.height),
      this.scene,
      this.camera
    );

    outlinePass.edgeStrength = this.settings.outline.edgeStrength;
    outlinePass.edgeGlow = this.settings.outline.edgeGlow;
    outlinePass.usePatternTexture = false;
    outlinePass.edgeThickness = this.settings.outline.edgeThickness;
    outlinePass.downSampleRatio = 1;
    outlinePass.pulsePeriod = 1;
    outlinePass.visibleEdgeColor.set(this.settings.outline.visibleEdgeColor);
    outlinePass.hiddenEdgeColor.set(this.settings.outline.hiddenEdgeColor);
    outlinePass.clear = true;
    outlinePass.enabled = this.settings.outline.enabled;

    this.composer.addPass(outlinePass);
    this.passes.set('outline', outlinePass);
  }

  createGlitchEffect() {
    const glitchPass = new GlitchPass();
    glitchPass.goWild = this.settings.glitch.goWild;
    glitchPass.enabled = this.settings.glitch.enabled;

    // 设置自动故障触发
    this.setupGlitchTriggers(glitchPass);

    this.composer.addPass(glitchPass);
    this.passes.set('glitch', glitchPass);
  }

  createAntiAliasing() {
    // 使用SMAA抗锯齿（比FXAA质量更高）
    const smaaPass = new SMAAPass(this.width, this.height);
    smaaPass.enabled = this.settings.fxaa.enabled;

    this.composer.addPass(smaaPass);
    this.passes.set('antialiasing', smaaPass);

    // 如果SMAA不可用，降级到FXAA
    if (!smaaPass) {
      const fxaaPass = new ShaderPass(FXAAShader);
      const pixelRatio = this.renderer.getPixelRatio();
      fxaaPass.uniforms['resolution'].value.set(
        1 / (this.width * pixelRatio),
        1 / (this.height * pixelRatio)
      );
      fxaaPass.enabled = this.settings.fxaa.enabled;

      this.composer.addPass(fxaaPass);
      this.passes.set('antialiasing', fxaaPass);
    }
  }

  setupGlitchTriggers(glitchPass) {
    // 定期触发随机故障效果
    const triggerGlitch = () => {
      if (Math.random() < this.settings.glitch.frequency) {
        glitchPass.curF = Math.random() * 10;
        setTimeout(() => {
          glitchPass.curF = 0;
        }, 200);
      }
    };

    // 每3秒检查一次
    setInterval(triggerGlitch, 3000);

    // 添加手动触发方法
    window.triggerGlitch = (duration = 500) => {
      glitchPass.curF = Math.random() * 10;
      setTimeout(() => {
        glitchPass.curF = 0;
      }, duration);
    };
  }

  animateBloom(bloomPass) {
    const animate = () => {
      const time = Date.now() * 0.001;

      // 微妙的呼吸效果
      const breatheStrength = this.settings.bloom.strength * (1 + Math.sin(time * 2) * 0.1);
      bloomPass.strength = breatheStrength;

      // 动态阈值调整
      const dynamicThreshold = this.settings.bloom.threshold + Math.sin(time * 3) * 0.05;
      bloomPass.threshold = Math.max(0, Math.min(1, dynamicThreshold));

      requestAnimationFrame(animate);
    };

    animate();
  }

  createAdaptiveSystem() {
    if (!this.settings.adaptiveQuality) return;

    this.performanceMonitor = {
      frameCount: 0,
      lastTime: performance.now(),
      fps: 60,
      qualityLevel: 'high'
    };

    this.startPerformanceMonitoring();
  }

  startPerformanceMonitoring() {
    const updatePerformance = () => {
      this.performanceMonitor.frameCount++;
      const currentTime = performance.now();

      if (currentTime - this.performanceMonitor.lastTime >= 1000) {
        this.performanceMonitor.fps = this.performanceMonitor.frameCount;
        this.performanceMonitor.frameCount = 0;
        this.performanceMonitor.lastTime = currentTime;

        this.adjustQuality();
      }

      requestAnimationFrame(updatePerformance);
    };

    updatePerformance();
  }

  adjustQuality() {
    const fps = this.performanceMonitor.fps;
    let newQuality = this.performanceMonitor.qualityLevel;

    if (fps < 30) {
      newQuality = 'low';
    } else if (fps < 45) {
      newQuality = 'medium';
    } else {
      newQuality = 'high';
    }

    if (newQuality !== this.performanceMonitor.qualityLevel) {
      this.performanceMonitor.qualityLevel = newQuality;
      this.applyQualitySettings(newQuality);
      console.log(`性能自适应：切换到 ${newQuality} 质量`);
    }
  }

  applyQualitySettings(quality) {
    switch(quality) {
      case 'low':
        this.settings.bloom.enabled = false;
        this.settings.glitch.enabled = false;
        this.settings.outline.edgeStrength = 10;
        this.composer.setPixelRatio(1);
        break;
      case 'medium':
        this.settings.bloom.enabled = true;
        this.settings.bloom.strength = 1.0;
        this.settings.glitch.enabled = false;
        this.settings.outline.edgeStrength = 15;
        this.composer.setPixelRatio(Math.min(1.5, window.devicePixelRatio));
        break;
      case 'high':
        this.settings.bloom.enabled = true;
        this.settings.bloom.strength = 1.5;
        this.settings.glitch.enabled = true;
        this.settings.outline.edgeStrength = 20;
        this.composer.setPixelRatio(window.devicePixelRatio);
        break;
    }

    this.updatePasses();
  }

  updatePasses() {
    this.passes.forEach((pass, name) => {
      if (pass.enabled !== undefined) {
        switch(name) {
          case 'bloom':
            pass.enabled = this.settings.bloom.enabled;
            break;
          case 'glitch':
            pass.enabled = this.settings.glitch.enabled;
            break;
          case 'outline':
            pass.edgeStrength = this.settings.outline.edgeStrength;
            break;
        }
      }
    });
  }

  // 公共API方法
  setBloomSettings(settings) {
    Object.assign(this.settings.bloom, settings);
    const bloomPass = this.passes.get('bloom');
    if (bloomPass) {
      bloomPass.strength = this.settings.bloom.strength;
      bloomPass.radius = this.settings.bloom.radius;
      bloomPass.threshold = this.settings.bloom.threshold;
    }
  }

  setOutlineObjects(objects) {
    const outlinePass = this.passes.get('outline');
    if (outlinePass) {
      outlinePass.selectedObjects = objects;
    }
  }

  triggerSpecialEffect(type, options = {}) {
    switch(type) {
      case 'glitch':
        window.triggerGlitch(options.duration || 500);
        break;
      case 'bloom':
        this.setBloomSettings({
          strength: options.strength || 3,
          radius: options.radius || 0.8,
          threshold: options.threshold || 0.5
        });
        setTimeout(() => {
          this.setBloomSettings(this.settings.bloom);
        }, options.duration || 1000);
        break;
    }
  }

  render() {
    return this.composer.render();
  }

  setSize(width, height) {
    this.width = width;
    this.height = height;
    this.composer.setSize(width, height);
  }

  dispose() {
    this.composer.dispose();
    this.passes.forEach(pass => {
      if (pass.dispose) pass.dispose();
    });
    this.passes.clear();
  }
}