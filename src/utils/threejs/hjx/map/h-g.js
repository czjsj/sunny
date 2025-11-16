import * as THREE from 'three';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';

// 顶点着色器
let hgVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`

// 分片着色器
let hgShaderMaterials = `
  uniform sampler2D baseTexture;
uniform sampler2D bloomTexture;
varying vec2 vUv;
void main() {
    gl_FragColor = ( texture2D( baseTexture, vUv ) + vec4( 1.0 ) * texture2D( bloomTexture, vUv ) );
}`

class HG {

  CreateMap(_scene, _mapUrlList) {
    // 全国图
    this.drawMap(_scene, _mapUrlList[0], 0)
    // 山东图
    this.drawMap(_scene, _mapUrlList[1], 1)
  }

  // 创建一个 Layer，用于区分辉光物体
  CreateLayer(num) {
    const layer = new THREE.Layers()
    layer.set(num)
    return layer
  }

  // 辉光效果
  CreateUnrealBloomPass() {
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5,
      0.4,
      0.0
    )
    const params = {
      bloomThreshold: 0,
      bloomStrength: 1, // 辉光强度
      bloomRadius: 0
    }
    bloomPass.threshold = params.bloomThreshold
    bloomPass.strength = params.bloomStrength
    bloomPass.radius = params.bloomRadius
    return bloomPass
  }

  // ShaderPass，着色器pass，自定义程度高，需要编写OpenGL代码
  // 传入bloomComposer
  CreateShaderPass(bloomComposer) {
    // 着色器材质，自定义shader渲染的材质
    const shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        baseTexture: { value: null },
        // 辉光贴图属性设置为传入的bloomComposer，这里就说明了为什么bloomComposer不要渲染到屏幕上
        bloomTexture: { value: bloomComposer.renderTarget2.texture }
      },
      vertexShader: hgVertexShader, // 顶点着色器
      fragmentShader: hgShaderMaterials, // 片元着色器
      defines: {}
    })
    const shaderPass = new ShaderPass(shaderMaterial, 'baseTexture')
    shaderPass.needsSwap = true
    return shaderPass
  }
}

export const hgLight = new HG();