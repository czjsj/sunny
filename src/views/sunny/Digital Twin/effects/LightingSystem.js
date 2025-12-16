// src/views/sunny/Digital Twin/effects/LightingSystem.js
import * as THREE from 'three';

export class LightingSystem {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.lights = new Map();
    this.init();
  }

  init() {
    this.createMainLighting();
    this.createSmartLEDSystem();
    this.createDynamicLighting();
    this.createAmbientLighting();
  }

  createMainLighting() {
    // 主太阳光源
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
    sunLight.position.set(100, 100, 50);
    sunLight.castShadow = true;

    // 优化阴影设置
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.1;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;

    // 添加阴影偏移
    sunLight.shadow.bias = -0.001;
    sunLight.shadow.normalBias = 0.02;

    this.scene.add(sunLight);
    this.lights.set('sun', sunLight);

    // 太阳光的环境光贡献
    const sunAmbient = new THREE.HemisphereLight(0xffffff, 0x404080, 0.3);
    this.scene.add(sunAmbient);
    this.lights.set('sunAmbient', sunAmbient);
  }

  createSmartLEDSystem() {
    // 战略光源配置
    const strategicLights = [
      {
        pos: [0, 20, 0],
        target: [0, 0, 0],
        color: 0x00ffff,
        intensity: 2,
        name: 'centralLED'
      },
      {
        pos: [-50, 15, 20],
        target: [-50, 0, 20],
        color: 0xff00ff,
        intensity: 1.5,
        name: 'leftLED'
      },
      {
        pos: [50, 15, -20],
        target: [50, 0, -20],
        color: 0xffff00,
        intensity: 1.5,
        name: 'rightLED'
      },
      {
        pos: [0, 30, -40],
        target: [0, 0, -40],
        color: 0xff0080,
        intensity: 1.2,
        name: 'rearLED'
      }
    ];

    strategicLights.forEach(config => {
      const spotLight = new THREE.SpotLight(config.color, config.intensity);
      spotLight.position.set(...config.pos);

      // 创建目标对象
      const targetObject = new THREE.Object3D();
      targetObject.position.set(...config.target);
      this.scene.add(targetObject);

      spotLight.target = targetObject;
      spotLight.angle = Math.PI / 6;
      spotLight.penumbra = 0.3;
      spotLight.decay = 2;
      spotLight.distance = 100;
      spotLight.castShadow = true;

      // 聚光灯阴影优化
      spotLight.shadow.mapSize.width = 1024;
      spotLight.shadow.mapSize.height = 1024;
      spotLight.shadow.camera.near = 0.5;
      spotLight.shadow.camera.far = 50;

      this.scene.add(spotLight);
      this.lights.set(config.name, spotLight);

      // 添加光源动画
      this.animateLight(spotLight, config);
    });

    // 添加聚光灯辅助线（调试用，生产环境可关闭）
    if (process.env.NODE_ENV === 'development') {
      strategicLights.forEach(config => {
        const light = this.lights.get(config.name);
        const helper = new THREE.SpotLightHelper(light);
        this.scene.add(helper);
      });
    }
  }

  createDynamicLighting() {
    // 创建动态点光源网络
    const dynamicLights = [];
    const gridSize = 5;
    const spacing = 30;

    for (let x = 0; x < gridSize; x++) {
      for (let z = 0; z < gridSize; z++) {
        const light = new THREE.PointLight(
          new THREE.Color().setHSL(Math.random(), 0.8, 0.5),
          0.5,
          20
        );

        light.position.set(
          (x - gridSize/2) * spacing,
          Math.random() * 10 + 5,
          (z - gridSize/2) * spacing
        );

        this.scene.add(light);
        dynamicLights.push(light);
      }
    }

    this.lights.set('dynamicGrid', dynamicLights);
    this.animateDynamicLights(dynamicLights);
  }

  createAmbientLighting() {
    // 基础环境光
    const ambientLight = new THREE.AmbientLight(0x404080, 0.3);
    this.scene.add(ambientLight);
    this.lights.set('ambient', ambientLight);

    // 半球光模拟天空
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x2F4F4F, 0.5);
    this.scene.add(hemisphereLight);
    this.lights.set('hemisphere', hemisphereLight);

    // 环境光遮蔽
    const aoLight = new THREE.AmbientLight(0x000033, 0.1);
    this.scene.add(aoLight);
    this.lights.set('ao', aoLight);
  }

  animateLight(light, config) {
    // 呼吸效果
    const breatheAnimation = () => {
      const time = Date.now() * 0.001;
      const baseIntensity = config.intensity;
      const breatheIntensity = baseIntensity * (1 + Math.sin(time * 2) * 0.3);

      light.intensity = breatheIntensity;

      // 颜色变化
      const hueShift = Math.sin(time * 0.5) * 0.1;
      const baseColor = new THREE.Color(config.color);
      const newColor = new THREE.Color();
      newColor.setHSL(baseColor.getHSL({h: 0, s: 0, l: 0}).h + hueShift,
                     baseColor.getHSL({h: 0, s: 0, l: 0}).s,
                     baseColor.getHSL({h: 0, s: 0, l: 0}).l);
      light.color.copy(newColor);

      requestAnimationFrame(breatheAnimation);
    };

    breatheAnimation();

    // 位置微动画
    const positionAnimation = () => {
      const time = Date.now() * 0.0005;
      const originalPos = light.position.clone();

      light.position.y = originalPos.y + Math.sin(time * 3) * 0.5;
      light.position.x = originalPos.x + Math.cos(time * 2) * 0.3;

      requestAnimationFrame(positionAnimation);
    };

    positionAnimation();
  }

  animateDynamicLights(lights) {
    const animate = () => {
      const time = Date.now() * 0.001;

      lights.forEach((light, index) => {
        // 波动强度
        const baseIntensity = 0.5;
        const waveOffset = index * 0.5;
        light.intensity = baseIntensity + Math.sin(time * 3 + waveOffset) * 0.3;

        // 颜色渐变
        const hue = (time * 0.1 + index * 0.1) % 1;
        light.color.setHSL(hue, 0.8, 0.5);

        // 位置浮动
        const originalY = 10;
        light.position.y = originalY + Math.sin(time * 2 + index) * 2;
      });

      requestAnimationFrame(animate);
    };

    animate();
  }

  // 公共方法：创建特殊效果
  createAlertLight(position, color) {
    const alertLight = new THREE.PointLight(color, 3, 50);
    alertLight.position.copy(position);

    // 脉冲效果
    const pulseAnimation = () => {
      const time = Date.now() * 0.005;
      alertLight.intensity = 2 + Math.sin(time * 10) * 1;
      requestAnimationFrame(pulseAnimation);
    };

    pulseAnimation();

    this.scene.add(alertLight);
    return alertLight;
  }

  // 公共方法：设置场景氛围
  setAtmosphere(mood) {
    switch(mood) {
      case 'night':
        this.lights.get('ambient').intensity = 0.1;
        this.lights.get('sun').intensity = 0.5;
        this.lights.get('hemisphere').intensity = 0.2;
        break;
      case 'day':
        this.lights.get('ambient').intensity = 0.3;
        this.lights.get('sun').intensity = 1.5;
        this.lights.get('hemisphere').intensity = 0.5;
        break;
      case 'alert':
        // 闪烁效果
        this.lights.get('ambient').color.setHex(0xff0000);
        const alertInterval = setInterval(() => {
          this.lights.get('ambient').intensity = this.lights.get('ambient').intensity === 0.1 ? 0.3 : 0.1;
        }, 500);
        return alertInterval;
    }
  }

  // 清理方法
  dispose() {
    this.lights.forEach(light => {
      if (light.geometry) light.geometry.dispose();
      if (light.material) light.material.dispose();
      this.scene.remove(light);
    });
    this.lights.clear();
  }
}