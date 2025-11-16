import { util } from './util.js';
import * as THREE from 'three';
import * as d3 from 'd3-geo';
import dengji2 from '../img/dengji2.png';
import outLineImg from '../img/outline.png';
import { Line2 } from 'three/examples/jsm/lines/Line2'
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry'
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial'
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'

let mapColor = '#006de0';
let mapThickness = -0.5;
let lineGroupHigh = 0;
// 顶点着色器
let modelAreaVertexShader = `    
precision mediump float;
precision mediump int;

uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;

attribute vec3 position;

varying vec3 vPosition;

void main() {

  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

}`

// 分片着色器
let modelAreaShaderMaterials = `
  precision mediump float;
  precision mediump int;

  uniform float ratio;

  varying vec3 vPosition;
  uniform float time;

  void main() {
      vec3 color = vec3(89./255.,208./255.,255./255.);
      float height = vPosition.y;
      float white = (distance(vec2(vPosition.x,vPosition.z),vec2(0.0))-6.0)/(6.0 * (sqrt(2.0)-1.0));
      float alphax = smoothstep(0.0,1.0,white );
      float alphay = smoothstep(1.0,-0.8,height/150.0 + sin(time) * 0.9 );
      gl_FragColor = vec4(color*ratio, alphay*0.5);
}`

// 分片着色器
let modelSdAreaShaderMaterials = `
  precision mediump float;
  precision mediump int;

  uniform float ratio;

  varying vec3 vPosition;
  uniform float time;

  void main() {
      vec3 color = vec3(54./255.,135./255.,234./15.);
      float height = vPosition.y;
      float white = (distance(vec2(vPosition.x,vPosition.z),vec2(0.0))-6.0)/(6.0 * (sqrt(2.0)-1.0));
      float alphax = smoothstep(0.0,1.0,white );
      float alphay = smoothstep(1.0,-0.8,height/150.0 + sin(time) * 0.9 );
      gl_FragColor = vec4(color*ratio, alphay*0.8);
}`
class DrowMap {

  CreateMap(_scene, _mapUrlList) {
    // 全国图
    this.drawMap(_scene, _mapUrlList[0], 0)
    // 山东图
    var sdModel = this.drawMap(_scene, _mapUrlList[1], 1)
    return sdModel;
  }

  // 绘制地图
  drawMap(_scene, mapUrl, type) {
    let sdMode = [];
    const mapData = util.decode(mapUrl);
    if (!mapData) {
      console.error('this.mapData 数据不能是null');
      return;
    }
    // 把经纬度转换成x,y,z 坐标
    mapData.features.forEach(d => {
      d.vector3 = [];
      d.geometry.coordinates.forEach((coordinates, i) => {
        d.vector3[i] = [];
        coordinates.forEach((c, j) => {
          if (c[0] instanceof Array) {
            d.vector3[i][j] = [];
            c.forEach(cinner => {
              let cp = this.lnglatToMector(cinner);
              d.vector3[i][j].push(cp);
            });
          } else {
            let cp = this.lnglatToMector(c);
            d.vector3[i].push(cp);
          }
        });
      });
    });
    // 绘制地图模型
    const group = new THREE.Group();
    const lineGroup = new THREE.Group();
    const sdOutlineLine = new THREE.Group();
    const sdOutlineModel = new THREE.Group(); 
    mapData.features.forEach(d => {
      const g = new THREE.Group(); // 用于存放每个地图模块。||省份
      g.data = d;
      d.vector3.forEach(points => {
        // 多个面
        if (points[0][0] instanceof Array) {
          points.forEach(p => {
            const mesh = this.drawModel(p, type, d.id);
            const lineMesh = this.drawLine(p, type, d);
            if(d.id !== '371200' && d.id !== '370100') {
              lineGroup.add(lineMesh);
            }
            g.add(mesh);
            if(d.id === '370000') {
              sdOutlineLine.add(this.drawOutLine(p))
              sdOutlineModel.add(this.drawOutModel(p));
            }
          });
        } else {
          // 单个面
          const mesh = this.drawModel(points, type, d.id);
          const lineMesh = this.drawLine(points, type, d);
          if(d.id !== '371200' && d.id !== '370100') {
            lineGroup.add(lineMesh);
          }
          g.add(mesh);
        }
      });
      group.add(g);
    });
    this.group = group; // 丢到全局去
    _scene.add(lineGroup);
    _scene.add(group);
    _scene.add(sdOutlineLine);
    _scene.add(sdOutlineModel);

    sdMode.push(lineGroup);
    sdMode.push(group);
    return [sdMode, this.group];
  }

  /**
   * @desc 经纬度转换成墨卡托投影
   * @param {array} 传入经纬度
   * @return array [x,y,z]
   */
  lnglatToMector(lnglat) {
    if (!this.projection) {
      this.projection = d3
        .geoMercator()
        .center([108.904496, 32.668849])
        .scale(80)
        .rotate(Math.PI / 4)
        .translate([0, 0]);
    }
    const [y, x] = this.projection([...lnglat]);
    let z = 0;
    return [x, y, z];
  }

  /**
   * @desc 绘制地图模型 points 是一个二维数组 [[x,y], [x,y], [x,y]]
   */
  drawModel(points, type, _modelId) {
    const shape = new THREE.Shape();
    points.forEach((d, i) => {
      const [x, y] = d;
      if (i === 0) {
        shape.moveTo(x, y);
      } else if (i === points.length - 1) {
        shape.quadraticCurveTo(x, y, x, y);
      } else {
        shape.lineTo(x, y, x, y);
      }
    });
    this.hight = -0.25;
    if(_modelId === '370000') {
      this.hight = -0.01;
    }

    let geometry = new THREE.ExtrudeGeometry(shape, {
      amount: this.hight,
      bevelEnabled: false
    });
    let mapTexture = new THREE.TextureLoader().load(dengji2);
    mapTexture.wrapS = mapTexture.wrapT = THREE.RepeatWrapping;
    mapTexture.repeat.set(0.5, 0.5);
    let mapTexture2 = new THREE.TextureLoader().load(outLineImg);
    mapTexture2.wrapS = mapTexture.wrapT = THREE.RepeatWrapping;
    mapTexture2.repeat.set(0.5, 0.5);
    let material = [
      // 只给顶部贴图
      new THREE.MeshBasicMaterial({ depthWrite: false, color: '#5884FF', transparent: false, map: mapTexture, opacity: 1, side: THREE.BackSide}),
      new THREE.MeshBasicMaterial({ depthWrite: false, color: '#5884FF', transparent: true, opacity: 0.1, side: THREE.BackSide}),
      new THREE.MeshBasicMaterial({ depthWrite: false, color: '#5884FF', transparent: true, opacity: 0.4, side: THREE.BackSide}),
      new THREE.MeshBasicMaterial({ depthWrite: false, color: '#5884FF', transparent: true, opacity: 0.4, side: THREE.BackSide}),
      new THREE.MeshBasicMaterial({ depthWrite: false, color: '#5884FF', transparent: true, opacity: 0.4, side: THREE.BackSide}),
      new THREE.MeshBasicMaterial({ depthWrite: false, color: '#5884FF', transparent: true, opacity: 0.4, side: THREE.BackSide}),
    ]
    const materialModel = new THREE.RawShaderMaterial({ uniforms: { ratio: { value: 0.7 }}})
    materialModel.vertexShader = modelAreaVertexShader
    materialModel.fragmentShader = modelAreaShaderMaterials
    materialModel.transparent = true // 是否透明
    materialModel.opacity = 0.6 // 透明度
    materialModel.fragmentShader = modelAreaShaderMaterials
    
    // const mesh = new THREE.Mesh(geometry, (material));
    const mesh = new THREE.Mesh(geometry, materialModel);
    mesh.name = '';
    if(type === 1) {
      mesh.material = material;
      if(_modelId === '371200') {
        _modelId = '370100';
      }
      mesh.name = _modelId;
      mesh.material.forEach(material => {
        // material.color.set(0x006de0);
        // 把有顶部贴图的那一面透明度设为不透明
        if (material.map) {
          material.opacity = 1;
        }
      })
    } else {
      if(_modelId === '370000') {
        console.info('')
        console.info(mesh)
      }
    }
    return mesh;
  }

  /**
   * @desc 绘制填充轮廓实体
   * @param {} points
   */
  drawOutModel(points) {
    const shape = new THREE.Shape();
    points.forEach((d, i) => {
      const [x, y] = d;
      if (i === 0) {
        shape.moveTo(x, y);
      } else if (i === points.length - 1) {
        shape.quadraticCurveTo(x, y, x, y);
      } else {
        shape.lineTo(x, y, x, y);
      }
    });
    let geometry = new THREE.ExtrudeGeometry(shape, {
      amount: -0.25,
      bevelEnabled: false
    });
    let mapTexture2 = new THREE.TextureLoader().load(outLineImg);
    mapTexture2.wrapS = mapTexture2.wrapT = THREE.RepeatWrapping;
    mapTexture2.repeat.set(2, 2);
    let material = [
      // 只给顶部贴图
      new THREE.MeshBasicMaterial({ depthWrite: false, color: '#9bf6f5', transparent: true, opacity: 0, side: THREE.BackSide}),
      new THREE.MeshBasicMaterial({ depthWrite: false, transparent: true, map: mapTexture2, opacity: 1, side: THREE.BackSide}),
      new THREE.MeshBasicMaterial({ depthWrite: false, color: '#9bf6f5', transparent: true, opacity: 0, side: THREE.BackSide}),
      new THREE.MeshBasicMaterial({ depthWrite: false, color: '#9bf6f5', transparent: true, opacity: 0, side: THREE.BackSide}),
      new THREE.MeshBasicMaterial({ depthWrite: false, color: '#9bf6f5', transparent: true, opacity: 0, side: THREE.BackSide}),
      new THREE.MeshBasicMaterial({ depthWrite: false, color: '#9bf6f5', transparent: true, opacity: 0, side: THREE.BackSide}),
    ]
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.layers.enable(1);
    mesh.position.z = 0.26;
    return mesh;
  }

  /**
   * @desc 绘制线条
   * @param {} points
   */
  drawLine(points, type, _model) {
    this.lineColor = '#aca2a2';
    if(type === 1) {
      this.lineColor = '#c4e3fa';
    }
    const material = new THREE.LineBasicMaterial({
      color: this.lineColor,
      transparent: true,
      opacity: 0.7
    });
    var positionsArry = [];
    points.forEach(d => {
      const [x, y, z] = d;
      positionsArry.push(x, y, z)
    });

    const positions = new Float32Array(positionsArry)
    var lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    const line = new THREE.Line(lineGeo, material);
    if(type === 1) {
      line.name = 'sd-line|' + _model.id;
      // line.layers.enable(1);
    }
    return line;
  }

  /**
 * @desc 绘制轮廓线条
 * @param {} points
 */
  drawOutLine(points) {
    var positionsArry = [];
    points.forEach(d => {
      const [x, y, z] = d;
      positionsArry.push(x, y, z)
    });

    var buildRoadLineMat = new LineMaterial({
      color: 0x515146,
      linewidth: 5,
      linecap: 'round', 
      linejoin:  'round'
    })
    buildRoadLineMat.depthTest = false
    buildRoadLineMat.resolution.set(window.innerWidth, window.innerHeight)

    var mainBuildAreaGeo = new LineGeometry()
    mainBuildAreaGeo.setPositions(positionsArry)
    var line = new Line2(mainBuildAreaGeo, buildRoadLineMat)
    line.name = 'sdOutlineLine'
    line.computeLineDistances()
    line.layers.enable(1)
    return line;
  }
}

export const drowMap = new DrowMap();