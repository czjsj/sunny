// src/views/sunny/Digital Twin/effects/HolographicDisplays.js
import * as THREE from 'three';

export class HolographicDisplays {
  constructor(scene) {
    this.scene = scene;
    this.displays = new Map();
    this.uniforms = {
      time: { value: 0 }
    };

    this.init();
  }

  init() {
    this.createHologramPanels();
    this.createHolographicText();
    this.createDataStreams();
    this.startAnimation();
  }

  createHologramPanels() {
    // 全息面板配置
    const panelConfigs = [
      {
        pos: [-30, 8, 0],
        size: [8, 6],
        content: 'systemStatus',
        title: '系统状态',
        color: 0x00ffff
      },
      {
        pos: [30, 8, 0],
        size: [8, 6],
        content: 'powerGrid',
        title: '电网状态',
        color: 0xff00ff
      },
      {
        pos: [0, 10, -30],
        size: [10, 8],
        content: 'dataStream',
        title: '数据流',
        color: 0x00ff88
      },
      {
        pos: [-20, 6, 20],
        size: [6, 4],
        content: 'alerts',
        title: '告警信息',
        color: 0xff4444
      },
      {
        pos: [20, 6, 20],
        size: [6, 4],
        content: 'weather',
        title: '环境信息',
        color: 0x4444ff
      }
    ];

    panelConfigs.forEach((config, index) => {
      const hologram = this.createSinglePanel(config, index);
      this.displays.set(config.content, hologram);
    });
  }

  createSinglePanel(config, index) {
    const group = new THREE.Group();

    // 1. 全息面板主体
    const panelGeometry = new THREE.PlaneGeometry(config.size[0], config.size[1]);
    const panelMaterial = new THREE.ShaderMaterial({
      uniforms: {
        ...this.uniforms,
        resolution: {
          value: new THREE.Vector2(config.size[0] * 100, config.size[1] * 100)
        },
        hologramColor: { value: new THREE.Color(config.color) },
        index: { value: index }
      },
      vertexShader: this.getHologramVertexShader(),
      fragmentShader: this.getHologramFragmentShader(),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    group.add(panel);

    // 2. 边框效果
    const borderGeometry = new THREE.EdgesGeometry(panelGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.8
    });
    const border = new THREE.LineSegments(borderGeometry, borderMaterial);
    group.add(border);

    // 3. 标题文字（使用精灵）
    const titleSprite = this.createTextSprite(config.title, config.color);
    titleSprite.position.y = config.size[1] / 2 + 1;
    group.add(titleSprite);

    // 4. 扫描线效果
    const scanLine = this.createScanLine(config.size[0], config.color);
    scanLine.position.z = 0.01;
    group.add(scanLine);

    // 设置位置和旋转
    group.position.set(...config.pos);
    group.lookAt(0, group.position.y, 0);

    group.userData = {
      type: 'hologramPanel',
      content: config.content,
      title: config.title
    };

    this.scene.add(group);
    return group;
  }

  createScanLine(width, color) {
    const geometry = new THREE.PlaneGeometry(width, 0.1);
    const material = new THREE.ShaderMaterial({
      uniforms: {
        ...this.uniforms,
        color: { value: new THREE.Color(color) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 color;
        varying vec2 vUv;

        void main() {
          float scan = mod(vUv.y - time * 0.5, 1.0);
          float intensity = 1.0 - smoothstep(0.0, 0.1, scan);
          gl_FragColor = vec4(color, intensity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    return new THREE.Mesh(geometry, material);
  }

  createTextSprite(text, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 512;
    canvas.height = 128;

    // 背景
    context.fillStyle = 'rgba(0, 0, 0, 0.5)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // 文字
    context.fillStyle = `#${color.toString(16)}`;
    context.font = 'bold 48px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    // 边框
    context.strokeStyle = context.fillStyle;
    context.lineWidth = 2;
    context.strokeRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(8, 2, 1);

    return sprite;
  }

  createHolographicText() {
    // 3D悬浮文字
    const textConfigs = [
      { text: '数字孪生系统', pos: [0, 15, 0], size: 3 },
      { text: 'REAL-TIME MONITORING', pos: [0, 13, 0], size: 1.5 },
      { text: 'AI ANALYSIS', pos: [-40, 10, 10], size: 1 },
      { text: 'PREDICTIVE MAINTENANCE', pos: [40, 10, 10], size: 1 }
    ];

    textConfigs.forEach(config => {
      const text3D = this.create3DText(config);
      this.scene.add(text3D);
    });
  }

  create3DText(config) {
    // 使用Three.js的TextGeometry（需要额外的字体文件）
    // 这里使用简化的sprite实现
    const sprite = this.createTextSprite(config.text, 0x00ffff);
    sprite.position.set(...config.pos);
    sprite.scale.set(config.size * 2, config.size * 0.5, 1);
    sprite.userData = { type: 'hologramText' };

    // 添加旋转动画
    this.animateTextRotation(sprite);

    return sprite;
  }

  animateTextRotation(sprite) {
    const animate = () => {
      const time = Date.now() * 0.001;
      sprite.rotation.y = Math.sin(time * 2) * 0.1;
      sprite.rotation.x = Math.cos(time * 1.5) * 0.05;
      requestAnimationFrame(animate);
    };
    animate();
  }

  createDataStreams() {
    // 数据流动效果
    const streamConfigs = [
      { start: [-30, 8, 0], end: [0, 10, -30], color: 0x00ffff },
      { start: [30, 8, 0], end: [0, 10, -30], color: 0xff00ff },
      { start: [0, 10, -30], end: [-20, 6, 20], color: 0x00ff88 }
    ];

    streamConfigs.forEach(config => {
      const stream = this.createDataFlowLine(config);
      this.scene.add(stream);
    });
  }

  createDataFlowLine(config) {
    const points = [];
    const segments = 50;

    // 创建曲线路径
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const start = new THREE.Vector3(...config.start);
      const end = new THREE.Vector3(...config.end);

      // 贝塞尔曲线插值
      const control1 = new THREE.Vector3(
        (config.start[0] + config.end[0]) / 2,
        config.start[1] + 10,
        (config.start[2] + config.end[2]) / 2
      );

      const control2 = new THREE.Vector3(
        (config.start[0] + config.end[0]) / 2,
        config.end[1] + 10,
        (config.start[2] + config.end[2]) / 2
      );

      const curve = new THREE.CubicBezierCurve3(start, control1, control2, end);
      const curvePoint = curve.getPoint(t);

      points.push(curvePoint);
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);

    const material = new THREE.LineBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.8,
      linewidth: 2
    });

    const line = new THREE.Line(geometry, material);
    line.userData = { type: 'dataStream' };

    // 添加流动效果
    this.animateDataFlow(line);

    return line;
  }

  animateDataFlow(line) {
    const dashArray = 5;
    const dashGap = 10;
    const material = line.material;

    material.dashSize = dashArray;
    material.gapSize = dashGap;
    material.transparent = true;

    const animate = () => {
      const time = Date.now() * 0.002;
      material.dashOffset = -time * 10;
      requestAnimationFrame(animate);
    };
    animate();
  }

  startAnimation() {
    const animate = () => {
      this.uniforms.time.value += 0.016;
      requestAnimationFrame(animate);
    };
    animate();
  }

  // Shader代码
  getHologramVertexShader() {
    return `
      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vNormal;
      uniform float time;
      uniform float index;

      void main() {
        vUv = uv;
        vPosition = position;
        vNormal = normalize(normalMatrix * normal);

        // 添加微妙的波动
        vec3 newPosition = position;
        newPosition.x += sin(time * 2.0 + position.y * 10.0) * 0.02;
        newPosition.y += cos(time * 3.0 + position.x * 10.0) * 0.02;

        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `;
  }

  getHologramFragmentShader() {
    return `
      uniform float time;
      uniform vec2 resolution;
      uniform vec3 hologramColor;
      uniform float index;
      varying vec2 vUv;
      varying vec3 vPosition;
      varying vec3 vNormal;

      float noise(vec2 p) {
        return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        vec2 uv = vUv;

        // 扫描线效果
        float scanline = sin(uv.y * resolution.y * 2.0 + time * 10.0) * 0.04;

        // 噪点效果
        float noisex = noise(uv * 1000.0 + time) * 0.1;
        float noisey = noise(uv * 1000.0 + time + 100.0) * 0.1;

        // 边缘发光
        float dist = distance(uv, vec2(0.5));
        float glow = 1.0 - smoothstep(0.0, 0.5, dist);
        glow = pow(glow, 2.0);

        // 网格效果
        float grid = max(
          step(0.98, fract(uv.x * 20.0)),
          step(0.98, fract(uv.y * 20.0))
        );

        // 基础颜色
        vec3 color = hologramColor;

        // 应用效果
        color += vec3(glow * 0.5);
        color += vec3(scanline + noisex + noisey);
        color *= 0.7;
        color += vec3(grid * 0.3);

        // 闪烁效果
        float flicker = sin(time * (5.0 + index) * 2.0) * 0.5 + 0.5;
        color *= 0.8 + flicker * 0.2;

        // 透明度渐变
        float alpha = 0.6 + glow * 0.3 + flicker * 0.1;

        gl_FragColor = vec4(color, alpha);
      }
    `;
  }

  // 公共API
  updatePanelContent(contentType, data) {
    const panel = this.displays.get(contentType);
    if (panel) {
      // 更新面板数据显示
      // 这里可以根据不同的内容类型更新对应的精灵或纹理
      console.log(`更新 ${contentType} 面板数据:`, data);
    }
  }

  triggerAlert(position, message) {
    // 创建告警全息投影
    const alertConfig = {
      pos: position,
      size: [4, 3],
      content: 'alert',
      title: '⚠️ 告警',
      color: 0xff4444
    };

    const alertPanel = this.createSinglePanel(alertConfig, this.displays.size);

    // 5秒后自动消失
    setTimeout(() => {
      this.scene.remove(alertPanel);
    }, 5000);
  }

  dispose() {
    this.displays.forEach(display => {
      this.scene.remove(display);
    });
    this.displays.clear();
  }
}