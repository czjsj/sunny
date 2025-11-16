import * as THREE from 'three';
import * as d3 from 'd3-geo';
import { Line2 } from "three/examples/jsm/lines/Line2";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial";

// 顶点着色器
let vertexShader = `    
  varying vec2 vUv;
  attribute float percent;
  uniform float u_time;
  uniform float number;
  uniform float speed;
  uniform float length;
  varying float opacity;
  uniform float size;

  void main()
  {
      vUv = uv;
      vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
      float l = clamp(1.0-length,0.0,1.0);//空白部分长度

      gl_PointSize = clamp(fract(percent*number + l - u_time*number*speed)-l ,0.0,1.) * size * (1./length);

      opacity = gl_PointSize/size;
      gl_Position = projectionMatrix * mvPosition;
  }`;

// 分片着色器
let fragmentShader = `
  #ifdef GL_ES
  precision mediump float;
  #endif

  varying float opacity;
  uniform vec3 color;

  void main(){
      if(opacity <=0.2){
          discard;
      }
      gl_FragColor = vec4(color,1.0);
  }`;

let commonUniforms = {
  u_time: { value: 0.0 },
};

class CreateFlyLine {

   drawFlyLine(scene, sdMap, data) {
    let lineGroup = new THREE.Group();
    let flyLineGroup = new THREE.Group();
    data.forEach((d) => {
        const slnglat = sdMap.filter(function (_data) {
            return _data.name == d.source.name
          });
          const tlnglat = sdMap.filter(function (_data) {
            return _data.name == d.target.name
          });
          const x1 = slnglat[0].x;
          const y1 = slnglat[0].y;
          const z1 = 0.2;
          const x2 = tlnglat[0].x;
          const y2 = tlnglat[0].y;
          const z2 = 0.2;
          const curve = new THREE.QuadraticBezierCurve3(
            new THREE.Vector3(x1, y1, z1 + 0.28),
            new THREE.Vector3((x1 + x2) / 2, (y1 + y2) / 2, 3.5),
            new THREE.Vector3(x2, y2, z2 + 0.28)
          );
    
          let line = this.createLine(curve);
          let color = new THREE.Vector3(
            0.5999758518718452,
            0.7798940272761521,
            0.6181903838257632
          );
          // 创建骨架线和飞线
          let flyLine = this.createFlyLine(
            curve,
            {
              speed: 0.4,
              color: color,
              number: 1, //同时跑动的流光数量
              length: 0.3, //流光线条长度
              size: 3, //粗细
            },
            5000
          );
          lineGroup.add(line);
          flyLineGroup.add(flyLine);
    });

    scene.add(lineGroup);
    scene.add(flyLineGroup);

    return {
      lineGroup,
      flyLineGroup,
    };
  }

  // 创建骨架线
  createLine (curve) {
    const points = curve.getPoints(100);
    let geometry = new LineGeometry();
    let positions = []
    let colors = [];
    let color = new THREE.Color();
    /**
     * HSL中使用渐变
     * h — hue value between 0.0 and 1.0
     * s — 饱和度 between 0.0 and 1.0
     * l — 亮度 between 0.0 and 1.0
     */
    for ( let j = 0; j < points.length; j ++ ) {
      color.setHSL( .31666+j*0.005,0.7, 0.7); //绿色
      //color.setHSL( .81666 + j, 0.88, 0.715 + j * 0.0025 ); //粉色
      colors.push( color.r, color.g, color.b );
      positions.push( points[ j ].x, points[ j ].y, points[ j ].z + 0.01 );
    }
    geometry.setPositions( positions );
    geometry.setColors( colors );
    let matLine = new LineMaterial( {
      linewidth: 0.0015,
      vertexColors: true,
      dashed: false,
      transparent: true,
      opacity: 0.6
    } );
    let line = new Line2( geometry, matLine )
    return line;
  }
  
  /**
   * @param curve {THREE.Curve} 路径,
   * @param matSetting {Object} 材质配置项
   * @param pointsNumber {Number} 点的个数 越多越细致
   * */
  createFlyLine (curve, matSetting, pointsNumber) {
    var points = curve.getPoints( pointsNumber );
    var geometry = new THREE.BufferGeometry().setFromPoints( points );

    let length = points.length;
    var percents = new Float32Array(length);
    for (let i = 0; i < points.length; i+=1){
        percents[i] = (i/length);
    }

    geometry.setAttribute('percent', new THREE.BufferAttribute(percents,1));

    let lineMaterial = this.initLineMaterial(matSetting);

    var flyLine = new THREE.Points( geometry, lineMaterial );
    return flyLine
  }

  // 首先要写出一个使用fragmentshader生成的material并赋在点上
  initLineMaterial(setting){
    let number = setting ? (Number(setting.number) || 1.0) : 1.0;
    let speed = setting ? (Number(setting.speed) || 1.0) : 1.0;
    let length = setting ? (Number(setting.length) || 0.5) : 0.5;
    let size = setting ?(Number(setting.size) || 3.0) : 3.0;
    let color = setting ? setting.color || new THREE.Vector3(0,1,1) : new THREE.Vector3(0,1,1);
    let singleUniforms = {
        u_time: commonUniforms.u_time,
        number: {type: 'f', value:number},
        speed: {type:'f',value:speed},
        length: {type: 'f', value: length},
        size: {type: 'f', value: size},
        color: {type: 'v3', value: color}
    };
    let lineMaterial = new THREE.ShaderMaterial({
        uniforms: singleUniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        //blending:THREE.AdditiveBlending,
    });
    return lineMaterial;
  }
}
export const flyLineUtil = new CreateFlyLine();