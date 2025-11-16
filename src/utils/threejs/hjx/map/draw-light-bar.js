import * as THREE from 'three';
import throttle from 'lodash.throttle';
import img3 from '../img/标注光圈.png';

const colors = ['#fff', '#ff0'];
const lightLineTextures = null;
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
      float alphay = smoothstep(1.0,-0.8,height/0.5 + sin(time) * 0.9 );
      gl_FragColor = vec4(color*ratio, alphay*0.5);
  }`

class DrawLightBar {
  // 创建光柱
  CreateLightBar(_scene, _lightLineArray, datas) {
    const sixMeshgroup = new THREE.Group();
    const sixLineGroup = new THREE.Group();
    const lightBarGroup = new THREE.Group();
    const waveGroup = new THREE.Group();
    const gzGroup = new THREE.Group();
    const gzList = [];
    const returnGroup = {sixLineList: new THREE.Group(), gzModelList: []}
    const lightCurtainGroup = new THREE.Group();
    const labelGroup = new THREE.Group();
    this.lightLineTextures = [new THREE.TextureLoader().load(_lightLineArray[0]), new THREE.TextureLoader().load(_lightLineArray[1]), new THREE.TextureLoader().load(img3)];
    datas.forEach((d) => {
      // 绘制六边体
      sixMeshgroup.add(this.DrawSixMesh(d.x, d.y, 0.25, d.value));
      // 绘制6边线
      sixLineGroup.add(this.DrawSixLineLoop(d.x, d.y, 0.25, d.value, d.name));
      // 绘制扩散波
      waveGroup.add(this.drawWaveMesh(d.x, d.y, 0.1, colors[d.value]));
      // 绘制柱子
      const [plane1, plane2] = this.drawPlane(d.x, d.y, 0.35, d.value, this.lightLineTextures);
      lightBarGroup.add(plane2);
      lightBarGroup.add(plane1);
      // 绘制光幕
      const gyModel = this.CreateYz(d.x, d.y, 0.35, d.name);
      lightCurtainGroup.add(gyModel);
      gzList.push(gyModel);     
      // 绘制站点信息
      labelGroup.add(this.CreateFontsNew(d, d.x, d.y,1.4));
    });

    /**
     * 这里有个坑：不知道为啥，如果把mosh或line放到lightCurtainGroup前面加载到scene里面，透明度会被遮挡
     * 所以，这里是按照光柱-光柱光罩-底部元素-标题来添加到scene中
     */
    _scene.add(lightBarGroup);
    _scene.add(lightCurtainGroup);
    _scene.add(sixMeshgroup);
    _scene.add(sixLineGroup);
    _scene.add(waveGroup);
    _scene.add(gzGroup);
    _scene.add(labelGroup);

    returnGroup.sixLineList = sixLineGroup;
    returnGroup.gzModelList = gzList;
    returnGroup.waveGroup = waveGroup;
    return returnGroup;
  }

  /**
   * @desc 绘制6边形
   */
  DrawSixMesh(x, y, z, i, size = 6) {
    const geometry = new THREE.CircleGeometry(0.06, size);
    const material = new THREE.MeshBasicMaterial({ color: colors[i] });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z + 0.1);
    return mesh;
  }

  /**
  * @desc 绘制6边线
  */
  DrawSixLineLoop(x, y, z, i, _modelName) {
    // 绘制六边型
    const geometry = new THREE.RingGeometry(0.12, 0.15, 32 );
    const material = new THREE.MeshBasicMaterial({ color: colors[i], transparent: true });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z + 0.1);
    mesh.name = _modelName;
    return mesh;
  }

  /**
  * @desc 柱子
  */
  drawPlane(x, y, z, i, _lightLineTextures) {
    const hei = 2;
    const geometry = new THREE.PlaneGeometry(0.02, hei);
    const material = new THREE.MeshBasicMaterial({
      map: _lightLineTextures[i],
      depthTest: false,
      transparent: true,
      color: colors[i],
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.position.set(x, y, z + hei / 2);
    plane.rotation.x = Math.PI / 2;
    plane.rotation.z = Math.PI;
    const plane2 = plane.clone();
    plane2.rotation.y = Math.PI / 2;
    plane.layers.enable(1);
    plane2.layers.enable(1);
    return [plane, plane2];
  }

  /**
   * @desc 绘制扩散波
   */
  drawWaveMesh(x, y, z, color) {
    let material = new THREE.MeshBasicMaterial( {
      color: color === '#fff' ? '#22ffcc' : '#ff0',
      map: this.lightLineTextures[2],
      transparent: true, //使用背景透明的png贴图，注意开启透明计算
      opacity: 1.0,
      // side: THREE.DoubleSide, //双面可见
      depthWrite: false, //禁止写入深度缓冲区数据
    } );
    const geometry = new THREE.PlaneGeometry(1, 1);
    let mesh = new THREE.Mesh( geometry, material );
    let size = 5 * 0.06;//矩形平面Mesh的尺寸
    if (color !== '#fff') {
      size = 5 * 0.09
    }
    mesh.size = size;//自顶一个属性，表示mesh静态大小
    mesh.scale.set( size, size, size );//设置mesh大小
    mesh._s = 0.5;//自定义属性._s表示mesh在原始大小基础上放大倍数  光圈在原来mesh.size基础上1~2倍之间变化
    mesh.position.set(x, y, z + 0.28);
    mesh.layers.enable(1);
    return mesh;
  }

  CreateYz(x, y, z, _modelName) {
    // 普通墙材质
    const wallComMat = new THREE.RawShaderMaterial({ uniforms: { ratio: { value: 0.7 }}})
    wallComMat.vertexShader = modelAreaVertexShader
    wallComMat.fragmentShader = modelAreaShaderMaterials
    wallComMat.transparent = true // 是否透明
    wallComMat.opacity = 0.6 // 透明度
    wallComMat.depthWrite = false;

    // 高
    const wallHigh = 1.5
    var wallComGeometryTemplate = new THREE.CylinderGeometry(0.15, 0.15, wallHigh, 40)
    // 圆柱体（顶圆半径、底圆半径、圆柱体高度、经度、纬度）
    var ycModelTemplate = new THREE.Mesh(wallComGeometryTemplate, wallComMat)
    ycModelTemplate.name = _modelName + '';
    ycModelTemplate.position.set(x, y, z + wallHigh / 2);
    ycModelTemplate.rotation.x = Math.PI/2
    return ycModelTemplate;
  }

  CreateFonts(_siteName, _x, _y, _z, _scene) {
    // 创建canvas对象用来绘制文字
    let position = {x: _x,y: _y,z: _z};
    let canvas = document.createElement('canvas');
    let ctx = canvas.getContext('2d');
    ctx.fillStyle = "#ffffff";
    ctx.font = "bolder 25px Arial ";
    let siteInterval = 80;
    for (var i = 0; i < _siteName.length; i++) {
      ctx.fillText(_siteName[i], 115, siteInterval);
      siteInterval += 30;
    }

    let twoIntervalX = 163;
    let twoIntervalY = 20;
    ctx.font = "bolder 20px Arial ";
    ctx.fillText('5', twoIntervalX, twoIntervalY);
    ctx.fillText('0', twoIntervalX, twoIntervalY + 20);
    ctx.fillText('0', twoIntervalX, twoIntervalY + (20*2));
    ctx.fillText('k', twoIntervalX, twoIntervalY + (20*3));
    ctx.fillText('v', twoIntervalX, twoIntervalY + (20*4));
    ctx.font = "bolder 20px Arial ";
    let threeIntervalY = twoIntervalY + (20*4) + 25;
    ctx.fillText('变', twoIntervalX, threeIntervalY);
    ctx.fillText('电', twoIntervalX, threeIntervalY + 20);
    ctx.fillText('站', twoIntervalX, threeIntervalY + 20*2);
    ctx.globalAlpha = 1;

    // 将画布生成的图片作为贴图给精灵使用，并将精灵创建在设定好的位置
    let texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    //创建精灵，将该材质赋予给创建的精灵
    let spriteMaterial = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 1,
      depthTest: false,
      sizeAttenuation: true 
    });
    //创建坐标点，并将材质给坐标
    let sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(position.x, position.y, position.z);
    sprite.scale.set(1, 0.7, 1);
    _scene.add(sprite);
  }

  CreateFontsNew(_data, _x, _y, _z) {
    let _siteName = _data.name;
    //创建canvas对象用来绘制文字
    let position = {x: _x,y: _y,z: _z};
    let canvas = document.createElement('canvas');
    // canvas.width = 200;
    // canvas.height= 180;
    let ctx = canvas.getContext('2d');
    if(_data.value == 1 ) {
      ctx.fillStyle = '#eee43d';
    } else {
      ctx.fillStyle = '#ffffff';
    }
    ctx.font = "bolder 26px Arial ";
    let siteInterval = 70;
    for (var i = 0; i < _siteName.length; i++) {
      ctx.fillText(_siteName[i], 115, siteInterval);
      siteInterval += 30;
    }

    let twoIntervalX = 165;
    let twoIntervalY = 20;
    ctx.font = "bolder 20px Arial ";
    ctx.fillText(_data.site[0], twoIntervalX, twoIntervalY);
    ctx.fillText(_data.site[1], twoIntervalX, twoIntervalY + 20);
    ctx.fillText('0', twoIntervalX, twoIntervalY + (20*2));
    ctx.fillText('kv', twoIntervalX, twoIntervalY + (20*3));
    ctx.font = "bolder 20px Arial ";
    let threeIntervalY = twoIntervalY + (20*3) + 25;
    ctx.fillText('变', twoIntervalX, threeIntervalY);
    ctx.fillText('电', twoIntervalX, threeIntervalY + 20);
    ctx.fillText('站', twoIntervalX, threeIntervalY + 20*2);
    ctx.globalAlpha = 1;

    // 将画布生成的图片作为贴图给精灵使用，并将精灵创建在设定好的位置
    let texture = new THREE.Texture(canvas);
    texture.needsUpdate = true;
    var planeGeometry = new THREE.PlaneGeometry(1.2, 1);
    var material = new THREE.MeshBasicMaterial();
    material.side = THREE.DoubleSide;
    material.map = texture;
    material.transparent =true;
    material.opacity = 1;
    material.depthTest= false;

    var mesh = new THREE.Mesh(planeGeometry, material);
    mesh.position.set(position.x, position.y, position.z);
    mesh.rotation.x = Math.PI/2;
    mesh.rotation.y = Math.PI/1.7;
    return mesh;
  }

    /**
   * @desc 节流，防抖
   */
  DoAnimate = throttle((mapLightColorIndex, mapFlyLinepointsLength, sixLineGroup, selMeshes) => {
      let ratio = mapLightColorIndex / mapFlyLinepointsLength;
      sixLineGroup &&
        sixLineGroup.children.forEach(d => {
          if(d.name === selMeshes) {
            d.scale.set(1 + ratio, 1 + ratio, d.scale.z);
            d.material.opacity = 1 - ratio;
          }
        });

      mapLightColorIndex++;
      if (mapLightColorIndex > mapFlyLinepointsLength - 1) {
        mapLightColorIndex = 0;
      }
      return mapLightColorIndex;
    }, 30);
}

export const drawLightBar = new DrawLightBar();