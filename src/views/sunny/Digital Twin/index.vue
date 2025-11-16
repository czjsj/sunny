<template>
  <div class="full-content">
    <div id="container" />
    <div class="page">
      <transition
        enter-active-class="animated fadeInDown"
        leave-active-class="animated fadeOutUp"
        appear
      >
        <navigation />
      </transition>
      <transition
        enter-active-class="animated fadeInLeft"
        leave-active-class="animated fadeOutLeft"
        appear
      >
        <div
          v-show="!deviceDetailShow"
          class="left"
        >
          <!-- 主设备规模 -->
          <zsbgm />
          <!-- 感知设备规模 -->
          <gzsbgm />
          <!-- 主变电负荷电流变化 -->
          <zbdfh />
        </div>
      </transition>
      <transition
        enter-active-class="animated fadeInLeft"
        leave-active-class="animated fadeOutLeft"
        appear
      >
        <div
          v-show="deviceDetailShow"
          class="detail-left"
        >
          <!-- 设备详情 -->
          <sbxq />
        </div>
      </transition>
      <transition
        enter-active-class="animated fadeInRight"
        leave-active-class="animated fadeOutRight"
        appear
      >
        <div class="right">
          <!-- 设备操作台 -->
          <czt
            @pushEquipmentWarning="pushEquipmentWarning"
            @viewEquipmentDetail="viewEquipmentDetail"
            @roamCheck="roamCheck"
            @realTimeMonitor="realTimeMonitor"
            @masterControlView="masterControlView"
            @cockpitControlView="cockpitControlView"
          />
          <!-- 物联事件统计 -->
          <wlsjtj />
          <!-- 环境信息 -->
          <hjxx />
        </div>
      </transition>
    </div>
    <!-- 实时监控视频 -->
    <video
      id="video"
      autoplay
      loop
      muted
    >
      <source :src="videoUrl">
    </video>
  </div>
</template>
<!-- 上面是基础UI布局模板，使用HTML5 Canvas进行绘制-->


<!-- 初始化Three.js模块-->
<script>
import * as THREE from "three";
import { Clock, GridHelper } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { TWEEN } from "three/examples/jsm/libs/tween.module.min.js";
import dat from "three/examples/jsm/libs/dat.gui.module";
import Stats from "three/examples/jsm/libs/stats.module";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
/** 
 * @file three.js 入口文件
 * @author zhangyan
 * @date 2021-09-01
 * THREE.js 核心组件导入
 * Clock: 用于时间计算和动画控制的时钟类
 * GridHelper: 用于创建网格辅助线，帮助可视化场景坐标系
 * OrbitControls: 轨道控制器，用于鼠标交互控制相机视角
 * TWEEN: 补间动画库，用于创建平滑的动画过渡效果
 * dat.GUI: 轻量级图形用户界面库，用于实时调整参数和调试
 * Stats: 性能监控面板，用于显示帧率和内存使用情况
 *  FBXLoader: 用于加载 FBX 格式的 3D 模型文件
 * OBJLoader: 用于加载 OBJ 格式的 3D 模型文件
 * GLTFLoader: 用于加载 GLTF 格式的 3D 模型文件（推荐格式）
 */
import { RGBELoader} from 'three/examples/jsm/loaders/RGBELoader';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass';
/**
 * 后处理效果相关组件导入 
 * FXAAShader: FXAA抗锯齿着色器，用于减少渲染图像的锯齿现象
 * EffectComposer: 效果合成器，用于管理多个后处理通道
 * RenderPass: 渲染通道，作为后处理的基础渲染步骤
 * ShaderPass: 着色器通道，用于应用各种着色器效果
 * OutlinePass: 轮廓通道，用于为选中物体添加轮廓高亮效果
**/

// 加载sprite工具类（精灵）
import * as requestUtils from "@/utils/threejs/three-sprite-high.js";//引入自定义的three.js精灵工具类
import navigation from './components/navigation.vue';
import zsbgm from './components/zsbgm.vue';
import gzsbgm from './components/gzsbgm.vue';
import zbdfh from './components/zbdfh.vue';
import czt from './components/czt.vue';
import wlsjtj from './components/wlsjtj.vue';
import hjxx from './components/hjxx.vue';
import sbxq from './components/sbxq.vue';


// 变量放外层可以解决动画卡顿帧数变低的问题
//在这里同时初始化函数，将这些函数初始化为null
let stats = null;
let scene = null;
let gui = null;
let datGui = null;
let clock = null;
let light = null;
let camera = null;
let renderer = null;
let controls = null;
// 道路标志箭头
let mainArrowsRoadTexture = null;
let arrowsRoadTextureA1 = null;
let arrowsRoadTextureA2 = null;
let arrowsRoadTextureA3 = null;
let arrowsRoadTextureB1 = null;
let arrowsRoadTextureB2 = null;
let arrowsRoadTextureB3 = null;
// 呼吸灯相关
let composer = null;
let renderPass = null;
let outlinePass = null;
let effectFXAA = null;
// 保存变压器变量，后期做推送设备告警使用
//这里也是初始化。通过使用空数组来初始化数组
let byqList = [];
let windTurbineClones = []; // <-- 在这里添加新数组，用来存放所有风机
let windTurbineMixers = [];// <-- 在这里添加新数组，存放动画混合器
let selectedObjects = [];
// 漫游
let roamTweenEndCarm = [];
// 监控
let videoObjects = null;  // 播放视频的object
let monitorObject = [];  // 摄像头模型的object
//函数和数组初始化结束

// 组件添加
export default {
  name: "Substation",
  components: {
    navigation,//变电站
    zsbgm,//主设备规模
    gzsbgm,//感知设备规模
    zbdfh,//主变电负荷电流变化
    czt,//操作台
    wlsjtj,//物联事件统计
    hjxx,//环境信息
    sbxq//设备状态
  },
  data() {
    return {
      deviceDetailShow: false,
      videoUrl: require('../../../../public/zhangyan-substation/video/videoPlane.mp4'),
    };
  },
  mounted() {//钩子函数，在组件挂载完成后调用
    this.init();
  },
  destroyed() {
    this.destroyed();
  },
  methods: {
    // 初始化
    init() {
      this.createScene(); // 创建场景
      this.createGui();// 创建gui
      this.createRender(); // 创建渲染器
      this.createLight(); // 创建光源
      this.createCamera(); // 创建相机
      this.createControls(); // 创建控件对象
      this.createStats(); // 性能工具
      this.creatHelper(); // 三维坐标系
      this.createOutlinePass(); // 呼吸灯
      this.createModel(); // 创建对象
      this.render(); // 渲染
      this.addEvent(); // 监听事件，比如窗口缩放和点击模型
    },
    //销毁
    destroyed() {//销毁函数
      stats = null;
      scene = null;
      gui = null;
      datGui = null;
      clock = null;
      light = null;
      camera = null;
      renderer = null;
      controls = null;
      // 道路标志箭头
      mainArrowsRoadTexture = null;
      arrowsRoadTextureA1 = null;
      arrowsRoadTextureA2 = null;
      arrowsRoadTextureA3 = null;
      arrowsRoadTextureB1 = null;
      arrowsRoadTextureB2 = null;
      arrowsRoadTextureB3 = null;
      // 呼吸灯相关
      composer = null;
      renderPass = null;
      outlinePass = null;
      effectFXAA = null;
      // 保存变压器变量，后期做推送设备告警使用
      window.removeEventListener("resize", this.onWindowResize, false);
      document.removeEventListener("click", this.onModelClick, false);
    },

    // 创建场景
    createScene() {
  scene = new THREE.Scene();
  // 3. 添加 RGBELoader 来加载 HDR背景
  const rgbeLoader = new RGBELoader();
  rgbeLoader.load('/zhangyan-substation/images/my_sky.hdr', (texture) => {
    // 设置贴图的映射方式为“等距圆柱投影”，这是 HDR 天空球的标准设置
    texture.mapping = THREE.EquirectangularReflectionMapping;

    // 将 HDR 应用为场景的背景 (你看到的360°天空)
    scene.background = texture;
    
    // 将 HDR 应用为场景的环境光 (PBR 材质会反射这个光)
    scene.environment = texture;
  });
  // HDR背景添加结束

  // 创建时钟对象
  clock = new Clock();
  requestUtils.SetScene(scene);
},
    createGui: function() {
      //声明一个保存需求修改的相关数据的对象
      gui = {};
      datGui = new dat.GUI();
      //将设置属性添加到gui当中，gui.add(对象，属性，最小值，最大值）
    },


    // 创建渲染器
    createRender() {
      const element = document.getElementById("container");
      renderer = new THREE.WebGLRenderer({
        alpha: true,//透明度
        antialias: true//抗锯齿
      });
      renderer.shadowMap.enabled = false; // 允许阴影投射
      // renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.setPixelRatio(window.devicePixelRatio); // 为了兼容高清屏幕
      renderer.setSize(element.clientWidth, element.clientHeight); // 设置渲染区域尺寸
      renderer.setClearAlpha(0.5);
      // renderer.setClearColor(0x040203, 0.9); // 设置背景颜色
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      element.appendChild(renderer.domElement);
    },
    // 创建光源
    createLight() {
      // 环境光（如果是全白，在地面就看不出阴影，但可以把模型照亮）
      scene.add(new THREE.AmbientLight(0x999999, 0));
      // 另一种平行光
      light = new THREE.DirectionalLight(0xffffff, 0.7); // 从正上方（不是位置）照射过来的平行光，0.7的强度
      light.position.set(100, 100, 100);
      light.position.multiplyScalar(1);
      light.castShadow = true;
      light.shadow.mapSize = new THREE.Vector2(1024, 1024);
      // scene.add(new THREE.DirectionalLightHelper(light, 5));
      scene.add(light);
    },
    // 创建相机
    createCamera() {
      const element = document.getElementById("container");
      camera = new THREE.PerspectiveCamera(
        45,
        element.clientWidth / element.clientHeight,
        0.1,
        100000
      );
      camera.position.x = -120; // 正视
      camera.position.y = 130; // 俯视
      camera.position.z = 50; // 离模型有多远
      camera.lookAt(new THREE.Vector3(0, 0, 0)); // 设置相机方向
      scene.add(camera);
    },
    // 创建控件对象
    createControls() {
      // 初始化控制器
      controls = new OrbitControls(camera, renderer.domElement);
      controls.target.set(-25, 5, 0); // ------------------
      // controls.minDistance = 80
      // controls.maxDistance = 500000
      // controls.maxPolarAngle = Math.PI / 3  // 仰看角度
      controls.update();
    },
    createStats: function() {
      stats = new Stats();
      document.body.appendChild(stats.dom);
    },
    creatHelper: function() {
      // 三维坐标系
      // let helper = new THREE.AxesHelper(50);
      // scene.add(helper);
    },
    // 创建呼吸灯辉光层
    createOutlinePass() {
      composer = new EffectComposer(renderer)
      renderPass = new RenderPass(scene, camera)
      composer.addPass(renderPass)
      outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera)
      outlinePass.edgeStrength = 20.0; // 边框的亮度
      outlinePass.edgeGlow = 1; // 光晕[0,1]
      outlinePass.usePatternTexture = false; // 是否使用父级的材质
      outlinePass.edgeThickness = 10.0; // 边框宽度
      outlinePass.downSampleRatio = 1; // 边框弯曲度
      outlinePass.pulsePeriod = 1; // 呼吸闪烁的速度
      outlinePass.visibleEdgeColor.set('#f20c00'); // 呼吸显示的颜色
      outlinePass.hiddenEdgeColor = new THREE.Color(0, 0, 0); // 呼吸消失的颜色
      outlinePass.clear = true;
      composer.addPass(outlinePass)
    },

    //渲染内容
    render() {
      // 道路指示移动
      this.operateRoadPoint()
      this.operateWindTurbines();
      //下面是风机动画代码
      // 1. 获取自上一帧以来经过的时间
      let delta = clock.getDelta();
      // 2. 更新所有风机动画
      if (windTurbineMixers.length > 0) 
      {
        windTurbineMixers.forEach(mixer => {
          mixer.update(delta); // 传入时间差，更新动画
        });
      }
      // 风机动画添加结束

      // 3. 渲染场景
      requestAnimationFrame(this.render);
      // 更新性能插件
      stats.update();
      TWEEN.update();
      renderer.render(scene, camera);
      // 呼吸灯效果要放到最后渲染，要不然没效果
      if (composer) {
        composer.render();
      }
    },
    addEvent() 
    {
      window.addEventListener("resize", this.onWindowResize, false); // 添加窗口监听事件（resize-onresize即窗口或框架被重新调整大小）
      document.addEventListener('click', this.onModelClick, false);
    },
    // 窗口监听函数
    onWindowResize()
     {
      const element = document.getElementById("container");
      camera.aspect = element.clientWidth / element.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(element.clientWidth, element.clientHeight);
    },
    onModelClick(event) 
    {
      // // 获取画布
      // let mainCanvas = document.querySelector('#container canvas');
      // // 将屏幕坐标转为标准设备坐标(支持画布非全屏的情况)
      // let x = ((event.clientX - mainCanvas.getBoundingClientRect().left) / mainCanvas.offsetWidth) * 2 - 1; // 设备横坐标
      // let y = -((event.clientY - mainCanvas.getBoundingClientRect().top) / mainCanvas.offsetHeight) * 2 + 1; // 设备纵坐标
      // let vector = new THREE.Vector3(x, y, 1); // 设备坐标
      // // 创建光线投射对象
      // const raycaster = new THREE.Raycaster();
      // raycaster.setFromCamera(vector, camera);
      // // 射线检查排出所有元素
      // let intersects = raycaster.intersectObjects(scene.children, true);
      // // 过滤出模型，只取鼠标点击事件最近的一个
      // // let intersect = intersects.filter((intersect) => !(intersect.object instanceof GridHelper))[0];
      // intersects.forEach(item => {
      //   if (item.object && item.object.parent && item.object.parent.parent && item.object.parent.parent.name) {
      //     if (item.object.parent.parent.name.indexOf('变压器') > -1) {
      //       // 呼吸灯
      //       this.outlineObj([item.object.parent.parent]);
      //       // 调整摄像头
      //       this.moveCamera(
      //           camera.position,
      //           controls.target,
      //           { x: item.point.x, y: item.point.y + 8, z: item.point.z + 7 },
      //           { x: item.point.x, y: item.point.y, z: item.point.z },
      //           () => {}
      //       );
      //     }
      //   }
      // })
      // 获取画布
      let mainCanvas = document.querySelector('#container canvas');
      // 将屏幕坐标转为标准设备坐标(支持画布非全屏的情况)
      let x = ((event.clientX - mainCanvas.getBoundingClientRect().left) / mainCanvas.offsetWidth) * 2 - 1; // 设备横坐标
      let y = -((event.clientY - mainCanvas.getBoundingClientRect().top) / mainCanvas.offsetHeight) * 2 + 1; // 设备纵坐标
      let vector = new THREE.Vector3(x, y, 1); // 设备坐标
      // 创建光线投射对象
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(vector, camera);
      // 射线检查排出所有元素
      let intersects = raycaster.intersectObjects(scene.children, true);
      // 过滤出模型，只取鼠标点击事件最近的一个
      // let intersecta = intersects.filter((intersect) => !(intersect.object instanceof GridHelper))[0];
      let isFind = false;
      intersects.forEach(item => 
      {
        if (item.object && item.object.parent && item.object.parent.parent && item.object.parent.parent.name) {
          //&&逻辑与，多个条件都满足时返回true
          if (item.object.parent.parent.name.indexOf('变压器') > -1) {
            // 处理一下模型选中多次问题
            if (isFind === false)
             {
              isFind = true
              this.modelAddBLN(item.object.parent.parent)
              this.moveCamera(
                  camera.position,
                  controls.target,
                  { x: item.point.x, y: item.point.y + 8, z: item.point.z + 7 },
                  { x: item.point.x, y: item.point.y, z: item.point.z },
                  () => 
                    {
                    // this.deviceDetailShow = true
                    }
              );
              // 做个延迟，等tween动作
              setTimeout(() =>
              {
                this.deviceDetailShow = true
              }, 0)
            }
          } else 
          {
            this.modelRemoveBLN()
            this.deviceDetailShow = false
            this.moveCamera(
              camera.position,
              controls.target,
              { x: -80, y: 70, z: 40 },
              { x: -25, y: 5, z: 0 },
              () => {}
            );
          }
        }
      })
    },
    pushEquipmentWarning(warningFlag) 
    {
      if (warningFlag) {
        selectedObjects = [byqList[3]]
      } else {
        selectedObjects = []
      }
      outlinePass.selectedObjects = selectedObjects// 给选中的线条和物体加发光特效
    },
    viewEquipmentDetail(warningFlag) 
    {
      if (warningFlag) {
        this.modelAddBLN(byqList[1])
        this.moveCamera(
          camera.position,
          controls.target,
          { x: -20.98666983812899, y: 2.1234499931335575 + 8, z: -6.079832080767815 + 7 },
          { x: -20.98666983812899, y: 2.1234499931335575, z: -6.079832080767815 },
          () => 
          {
            // this.deviceDetailShow = true
          }
        );
        // 做个延迟，等tween动作
        setTimeout(() => 
        {
          this.deviceDetailShow = true
        }, 0)
      } else {
        this.modelRemoveBLN()
        this.deviceDetailShow = false
        this.moveCamera(
          camera.position,
          controls.target,
          { x: -80, y: 70, z: 40 },
          { x: -25, y: 5, z: 0 },
          () => {}
        );
      }
    },

    // 漫游设置
    roamCheck() 
    {
      roamTweenEndCarm = [];
      roamTweenEndCarm.push({x1: -47.46, y1: 1.45, z1: 6.01, x2: -25.23, y2: 1.45, z2: 6.01});//A
      roamTweenEndCarm.push({x1: 34.92, y1: 1.45, z1: 6.01, x2: 47.16, y2: 1.45, z2: 6.01});
      roamTweenEndCarm.push({x1: 39.27, y1: 1.45, z1: 8.29, x2: 39.30, y2: 1.45, z2: 4.67});
      roamTweenEndCarm.push({x1: 38.94, y1: 1.45, z1: -15.85, x2: 38.94, y2: 1.45, z2: -17.77});
      roamTweenEndCarm.push({x1: 40.81, y1: 1.45, z1: -18.95, x2: 38.31, y2: 1.45, z2: -18.70});
      roamTweenEndCarm.push({x1: -38.12, y1: 1.45, z1: -18.95, x2: -47.36, y2: 1.45, z2: -18.09});
      roamTweenEndCarm.push({x1: -42.01, y1: 1.45, z1: -19.70, x2: -41.91, y2: 1.45, z2: -17.70});
      roamTweenEndCarm.push({x1: -41.86, y1: 1.45, z1: 1.82, x2: -41.83, y2: 1.45, z2: 3.29});
      roamTweenEndCarm.push({x1: -44.21, y1: 1.45, z1: 5.97, x2: -41.51, y2: 1.45, z2: 5.61});
      roamTweenEndCarm.push({x1: -80, y1: 70, z1: 40, x2: -25, y2: 5, z2: 0});
      // 获取画布
      var nowPosition = 
      {
        x1: camera.position.x, // 相机x
        y1: camera.position.y, // 相机y
        z1: camera.position.z, // 相机z
        x2: controls.target.x, // 控制点的中心点x
        y2: controls.target.y, // 控制点的中心点y
        z2: controls.target.z // 控制点的中心点z
      }
      const cameraRe = camera
      const controlsRe = controls
      // 尾部参数为毫秒
      const tweenA = this.roamItem(nowPosition, roamTweenEndCarm[0], 2000, cameraRe, controlsRe, TWEEN.Easing.Linear.None);
      // 漫游点B
      let tweenB = this.roamItem(nowPosition, roamTweenEndCarm[1], 6000, cameraRe, controlsRe, TWEEN.Easing.Linear.None);
      // 漫游点C
      let tweenC = this.roamItem(nowPosition, roamTweenEndCarm[2], 2000, cameraRe, controlsRe, TWEEN.Easing.Quadratic.InOut);
      // 漫游点D
      let tweenD = this.roamItem(nowPosition, roamTweenEndCarm[3], 2500, cameraRe, controlsRe, TWEEN.Easing.Linear.None);
      // 漫游点E
      let tweenE = this.roamItem(nowPosition, roamTweenEndCarm[4], 2000, cameraRe, controlsRe, TWEEN.Easing.Quadratic.InOut);
      // 漫游点F
      let tweenF = this.roamItem(nowPosition, roamTweenEndCarm[5], 6000, cameraRe, controlsRe, TWEEN.Easing.Linear.None);
      // 漫游点G
      let tweenG = this.roamItem(nowPosition, roamTweenEndCarm[6], 2000, cameraRe, controlsRe, TWEEN.Easing.Quadratic.InOut);
      // 漫游点H
      let tweenH = this.roamItem(nowPosition, roamTweenEndCarm[7], 2500, cameraRe, controlsRe, TWEEN.Easing.Linear.None);
      // 漫游点I
      let tweenI = this.roamItem(nowPosition, roamTweenEndCarm[8], 2000, cameraRe, controlsRe, TWEEN.Easing.Quadratic.InOut);
      // 漫游点J
      let tweenJ = this.roamItem(nowPosition, roamTweenEndCarm[9], 2000, cameraRe, controlsRe, TWEEN.Easing.Quadratic.InOut);
      tweenA.chain(tweenB);
      tweenB.chain(tweenC);
      tweenC.chain(tweenD);
      tweenD.chain(tweenE);
      tweenE.chain(tweenF);
      tweenF.chain(tweenG);
      tweenG.chain(tweenH);
      tweenH.chain(tweenI);
      tweenI.chain(tweenJ);
      tweenA.start()
    },
    realTimeMonitor(monitorFlag) 
    {
      if (monitorFlag) 
      {
        this.modelAddBLN(monitorObject[0])
        this.moveCamera(
          camera.position,
          controls.target,
          { x: -76.20, y: 5.27, z: 7.79 },
          { x: -40.76, y: 3.42, z: 7.16 },
          () => {}
        );
        this.addVideoPlane()
      } 
      else 
      {
        this.modelRemoveBLN()
        this.removeVideoPlane()
        this.moveCamera(
          camera.position,
          controls.target,
          { x: -80, y: 70, z: 40 },
          { x: -25, y: 5, z: 0 },
          () => {}
        );
      }
    },
    masterControlView() 
    {
      console.info(5)
    },
    cockpitControlView() 
    {
      this.moveCamera(
          camera.position,
          controls.target,
          { x: -80, y: 70, z: 40 },
          { x: -25, y: 5, z: 0 },
          () => {}
      );
    },

    // 创建模型对象
    createModel() 
    {
      // 创建底板
      this.addBaseplate();
      // 创建草地面
      this.addGrassGround();
      // 创建地面引导箭头
      this.addArrowModel();
      // 创建围墙
      this.addWell();
      // 创建房子模型（配电室、主控室、安保室等）
      this.addHouseModel();
      // 创建高压电塔模型
      this.addHighVoltageTowerModel();
      // 创建电力桥塔
      this.addPowerPylonModel();
      // 创建两侧柱子
      this.addBilateralPostsModel();
      // 创建最开始的设备
      this.addFirstEquipmentModel();
      // 创建最开始的管子
      this.addFirstPipesModel();
      // 创建最开始的设备（反）
      this.addFirstEquipmentAgainstModel();
      // 创建最开始的柱子（反）
      this.addFirstPostsAgainstModel();
      // 创建连接管
      this.addLinkPopesModel();
      // 创建变压器桥塔
      this.addTransformerPylonModel();
      // 创建变压器
      this.addTransformerModel();
      // 创建转换房
      this.addTransitionHouseModel();
      // 创建断路器
      this.addDisconnectorModel();
      // 创建倒数第二道的电力桥塔（输出端）
      this.addLastTwoPowerPylonModel();
      // 创建倒数第二道的柱子（反）（输出端）
      this.addLastTwoPostsModel();
      // 创建最后的设备（反）（输出端）
      this.addLastEquipmentAgainstModel();
      // 创建最后的管子（输出端）
      this.addLastPipesModel();
      // 创建最后的设备（输出端）
      this.addLastEquipmentModel();
      // 创建电线
      this.addWireModel();
      // 创建风力发电机
      this.addWindTurbineModel();
      // 创建太阳能发电板
      this.addSolarPanelModel();
    },

    // 创建水泥地面底板
    addBaseplate() 
    {
      // 创建底板并添加到场景
      let planeGeometry = new THREE.BoxGeometry(300, 150, 1);
      // 地板贴图效果
      let textureLoader = new THREE.TextureLoader(); // 纹理加载器
      let texture = textureLoader.load(
        "/zhangyan-substation/images/水泥地面.png",
        function(texture) 
        {
          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
          texture.offset.set(0, 0);
          texture.repeat.set(450, 250);
        }
      );
      const planeMaterial = new THREE.MeshStandardMaterial({
        map: texture
      });
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.receiveShadow = true; // 地面接收阴影
      plane.rotation.x = -0.5 * Math.PI;
      plane.position.x = 0;
      plane.position.y = -0.62;
      plane.position.z = 0;
      scene.add(plane);

      // 横向路面贴图
      let horizontalRoadTexture = new THREE.TextureLoader().load('/zhangyan-substation/images/马路背景.jpg');
      horizontalRoadTexture.wrapS = horizontalRoadTexture.wrapT = THREE.RepeatWrapping;
      horizontalRoadTexture.repeat.set(15, 1);

      // 纵向路面贴图（A1）
      let lengthwaysRoadTextureA = new THREE.TextureLoader().load('/zhangyan-substation/images/马路背景.jpg');
      lengthwaysRoadTextureA.wrapS = lengthwaysRoadTextureA.wrapT = THREE.RepeatWrapping;
      lengthwaysRoadTextureA.repeat.set(5, 1);

      // 纵向路面贴图（B1）
      let lengthwaysRoadTextureB = new THREE.TextureLoader().load('/zhangyan-substation/images/马路背景.jpg');
      lengthwaysRoadTextureB.wrapS = lengthwaysRoadTextureB.wrapT = THREE.RepeatWrapping;
      lengthwaysRoadTextureB.repeat.set(2.5, 1);

      // 主干道（横向）
      let mainRoadMaterial = new THREE.MeshStandardMaterial({
        map: horizontalRoadTexture
      })
      let mainRoadGeometry = new THREE.PlaneGeometry(100, 4)
      let mainRoadMesh = new THREE.Mesh(mainRoadGeometry, mainRoadMaterial)
      mainRoadMesh.position.set(-10, 0.1, 6);
      mainRoadMesh.rotation.x = -0.5 * Math.PI;

      // A1干道（纵向）
      let a1RoadMaterial = new THREE.MeshStandardMaterial({
        map: lengthwaysRoadTextureA
      })
      let a1RoadGeometry = new THREE.PlaneGeometry(25, 2)
      let a1RoadMesh = new THREE.Mesh(a1RoadGeometry, a1RoadMaterial)
      a1RoadMesh.position.set(39, 0.05, -7.5);
      a1RoadMesh.rotation.x = -0.5 * Math.PI;
      a1RoadMesh.rotation.z = 0.5 * Math.PI;
      // A2干道（横向）
      let a2RoadMaterial = new THREE.MeshStandardMaterial({
        map: horizontalRoadTexture
      })
      let a2RoadGeometry = new THREE.PlaneGeometry(82, 2)
      let a2RoadMesh = new THREE.Mesh(a2RoadGeometry, a2RoadMaterial)
      a2RoadMesh.position.set(-2, 0.1, -19);
      a2RoadMesh.rotation.x = -0.5 * Math.PI;
      // A3干道（纵向）
      let a3RoadMaterial = new THREE.MeshStandardMaterial({
        map: lengthwaysRoadTextureA
      })
      let a3RoadGeometry = new THREE.PlaneGeometry(25, 2)
      let a3RoadMesh = new THREE.Mesh(a3RoadGeometry, a3RoadMaterial)
      a3RoadMesh.position.set(-42, 0.05, -7.5);
      a3RoadMesh.rotation.x = -0.5 * Math.PI;
      a3RoadMesh.rotation.z = 0.5 * Math.PI;

      // B1干道（纵向）
      let b1RoadMaterial = new THREE.MeshStandardMaterial({
        map: lengthwaysRoadTextureB
      })
      let b1RoadGeometry = new THREE.PlaneGeometry(11, 2)
      let b1RoadMesh = new THREE.Mesh(b1RoadGeometry, b1RoadMaterial)
      b1RoadMesh.position.set(39, 0.05, 11.5);
      b1RoadMesh.rotation.x = -0.5 * Math.PI;
      b1RoadMesh.rotation.z = 0.5 * Math.PI;
      // B2干道（横向）
      let b2RoadMaterial = new THREE.MeshStandardMaterial({
        map: horizontalRoadTexture
      })
      let b2RoadGeometry = new THREE.PlaneGeometry(82, 2)
      let b2RoadMesh = new THREE.Mesh(b2RoadGeometry, b2RoadMaterial)
      b2RoadMesh.position.set(-2, 0.1, 16);
      b2RoadMesh.rotation.x = -0.5 * Math.PI;
      // B3干道（纵向）
      let b3RoadMaterial = new THREE.MeshStandardMaterial({
        map: lengthwaysRoadTextureB
      })
      let b3RoadGeometry = new THREE.PlaneGeometry(11, 2)
      let b3RoadMesh = new THREE.Mesh(b3RoadGeometry, b3RoadMaterial)
      b3RoadMesh.position.set(-42, 0.05, 11.5);
      b3RoadMesh.rotation.x = -0.5 * Math.PI;
      b3RoadMesh.rotation.z = 0.5 * Math.PI;

      scene.add(mainRoadMesh);
      scene.add(a1RoadMesh);
      scene.add(a2RoadMesh);
      scene.add(a3RoadMesh);
      scene.add(b1RoadMesh);
      scene.add(b2RoadMesh);
      scene.add(b3RoadMesh);
    },

    // 创建草地面
    addGrassGround() 
    {
        // 1. 创建一个非常大的平面几何体，作为草地
      let planeGeometry = new THREE.PlaneGeometry(1000, 1000);

      // 2. 加载草地贴图
      let textureLoader = new THREE.TextureLoader();
      let texture = textureLoader.load(
        "/zhangyan-substation/images/crops_ground.jpg", // 需要确保路径正确
        function(texture) {
          // 3. 设置贴图重复 (Tiling)
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          
          // 4. 调整重复次数，直到草地大小看起来合适
          texture.repeat.set(100, 100); 
        }
      );

      // 5. 创建 PBR 材质，使其能被 HDR 正确照亮
      const planeMaterial = new THREE.MeshStandardMaterial({
        map: texture
      });

      // 6. 创建网格
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);

      // 7. 旋转平面，使其"平躺"
      plane.rotation.x = -0.5 * Math.PI;

      // 8. 设置 Y 高度 (关键步骤！)
      // 水泥平台顶部在 y = -0.12 左右
      // 马路在 y = 0.1 左右
      // 把草地放在 y = -0.15，刚好在水泥平台下面一点点
      plane.position.y = -0.15; 

      // 9. 添加到场景
      scene.add(plane);
    },

    // 创建围墙
    addWell() 
    {
      // 外墙
      let outsideWallArray = [];
      let wallTexture = new THREE.TextureLoader().load('/zhangyan-substation/images/围墙.png')
      wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
      wallTexture.repeat.set(5, 1);
      outsideWallArray.push(new THREE.MeshStandardMaterial({map: wallTexture}));  //前
      outsideWallArray.push(new THREE.MeshStandardMaterial({map: wallTexture}));  //后
      outsideWallArray.push(new THREE.MeshStandardMaterial({map: wallTexture}));  //上
      outsideWallArray.push(new THREE.MeshStandardMaterial({color: 0xafc0ca }));  //下
      outsideWallArray.push(new THREE.MeshStandardMaterial({map: wallTexture}));  //左
      outsideWallArray.push(new THREE.MeshStandardMaterial({map: wallTexture}));  //右

      // 柱子
      let outsidePillarArray = [];
      outsidePillarArray.push(new THREE.MeshStandardMaterial({color: 0xafc0ca}));  //前
      outsidePillarArray.push(new THREE.MeshStandardMaterial({color: 0xafc0ca}));  //后
      outsidePillarArray.push(new THREE.MeshStandardMaterial({color: 0xafc0ca}));  //上
      outsidePillarArray.push(new THREE.MeshStandardMaterial({color: 0xafc0ca }));  //下
      outsidePillarArray.push(new THREE.MeshStandardMaterial({color: 0xafc0ca}));  //左
      outsidePillarArray.push(new THREE.MeshStandardMaterial({color: 0xafc0ca}));  //右
      //对于下面的参数的解释：
      // 0.3：墙的宽度
      // 1.6：墙的高度
      // 33.5：墙的深度
      // 0：墙的旋转角度
      //X轴正方向：东
      //X轴负方向：西
      //Z轴负方向：北
      //Z轴正方向：南

      this.createWallDetail(0.3, 1.6, 78.8, 0, outsideWallArray, -149, 0.8, -35.6,  "门口北墙");// 门口北墙
      this.createWallDetail(0.3, 1.6, 66.8, 0, outsideWallArray, -149, 0.8, 41.6, "门口南墙");// 门口南墙
      this.createWallDetail(0.4, 1.8, 0.4, 0, outsidePillarArray, -149, 0.8, 3.8, "门口北柱子");// 门口北柱子
      this.createWallDetail(0.5, 0.3, 0.5, 0, outsidePillarArray, -149, 1.85, 3.8, "门口北柱子顶");// 门口北柱子顶
      this.createWallDetail(0.4, 1.8, 0.4, 0, outsidePillarArray, -149, 0.8, 8.2, "门口南柱子");// 门口北柱子
      this.createWallDetail(0.5, 0.3, 0.5, 0, outsidePillarArray, -149, 1.85, 8.2, "门口南柱子顶");// 门口北柱子顶
      //北墙长度120.2，东墙长度60，南墙长度120.2，西墙长度60
      this.createWallDetail(0.3, 1.6, 300.2, 0.5, outsideWallArray, 0, 0.8, -74.8, "北墙");// 北墙
      this.createWallDetail(0.3, 1.6, 300.2, 0.5, outsideWallArray, 0, 0.8,  74.9, "南墙");// 南墙
      this.createWallDetail(0.3, 1.6, 150, 0, outsideWallArray, 150, 0.8, 0, "东墙");// 东墙

    },

    // 创建房子模型（配电室、主控室、安保室等）
    addHouseModel() 
    {
      let gloader = new GLTFLoader();
      let fbxLoader = new FBXLoader();
      // 创建group
      let houseGroup = new THREE.Group();
      houseGroup.name = "houseGroup";

      // 警卫室
      gloader.load(`/zhangyan-substation/models/警卫室/scene.gltf`, gltf => 
      {
        gltf.scene.name = "警卫室";
        gltf.scene.scale.set(0.8, 0.8, 0.8);
        gltf.scene.position.set(-55, -0.1, 6);
        // 设置旋转Y轴45度
        gltf.scene.rotation.y = -0.5 * Math.PI;
        houseGroup.add(gltf.scene);
      });

      // 警卫
      gloader.load(`/zhangyan-substation/models/警卫人员/scene.gltf`, gltf => 
      {
        gltf.scene.name = "警卫人员";
        gltf.scene.scale.set(1.5, 1.5, 1.5);
        gltf.scene.position.set(-55, 0, 7.7);
        // 设置旋转Y轴45度
        gltf.scene.rotation.y = -0.5 * Math.PI;
        houseGroup.add(gltf.scene);
      });

      // 配电室
      gloader.load(`/zhangyan-substation/models/配电室.glb`, gltf => 
      {
        gltf.scene.name = "配电室";
        gltf.scene.scale.set(0.08, 0.08, 0.08);
        gltf.scene.position.set(47, 0.7, 5);
        // 设置旋转Y轴45度
        gltf.scene.rotation.y = -0.5 * Math.PI;
        houseGroup.add(gltf.scene);
      });

      // 主控室
      gloader.load(`/zhangyan-substation/models/主控室.glb`, gltf => 
      {
        gltf.scene.name = "主控室";
        gltf.scene.scale.set(0.08, 0.08, 0.08);
        gltf.scene.position.set(25, 0.66, 17);
        // 设置旋转Y轴45度
        gltf.scene.rotation.y = -0.5 * Math.PI;
        houseGroup.add(gltf.scene);
      });

      // 摄像头
      fbxLoader.load(`/zhangyan-substation/models/摄像头.fbx`, gltf => 
      {
        gltf.rotation.z = -Math.PI;
        gltf.position.set(-60.7, 1.8, 8.1);
        gltf.scale.set(0.0005, 0.0005, 0.0005);
        gltf.name = '摄像头';
        monitorObject.push(gltf)
        scene.add(gltf);
      });

      scene.add(houseGroup);
    },

    // 创建高压电塔模型
    addHighVoltageTowerModel() 
    {
      let fbxLoader = new FBXLoader();
      // 创建group
      let powerPylonGroup = new THREE.Group();
      powerPylonGroup.name = "highVoltageTower";

      fbxLoader.load(`/zhangyan-substation/models/高压电塔.FBX`, fbx => {
        //当fbx这个函数前面只有一个参数时，括号可以省略
        //fbxloder起到加载模型，fbx这个自定义的名字是表示将加载后的模型传递到这个函数
        //然后就可以同过fbx来操作这个模型了
        
        fbx.scale.set(0.0007, 0.0007, 0.0007);
        let powerPylonModel = fbx;

        for (let i = 0; i < 3; i++) {
          let model1XOffset = i * 24;

          let model1 = powerPylonModel.clone();
          model1.name = '北部' + (i + 1) + '#高压电塔';
          model1.position.set(-34 + model1XOffset, 0, -131);
          powerPylonGroup.add(model1);

          let model2 = powerPylonModel.clone();
          model2.name = '南部' + (i + 1) + '#高压电塔';
          model2.position.set(-34 + model1XOffset, 0, -4);
          powerPylonGroup.add(model2);
        }
      });

      scene.add(powerPylonGroup);
    },

    // 创建电力桥塔
    addPowerPylonModel() 
    {
      let fbxLoader = new FBXLoader();
      // 创建group
      let powerPylonGroup = new THREE.Group();
      powerPylonGroup.name = "firstPowerPylonGroup";

      fbxLoader.load(`/zhangyan-substation/models/1. 最开始架子.FBX`, fbx => 
      {
        fbx.scale.set(0.0005, 0.0005, 0.0005);
        let powerPylonModel = fbx;
        // 北部
        for (let i = 0; i < 3; i++) 
        {
          let model1XOffset = i * 24;
          let model1 = powerPylonModel.clone();
          model1.name = '北部' + (i + 1) + '#电力桥塔';
          model1.position.set(-40 + model1XOffset, 0, -23);
          powerPylonGroup.add(model1);
        }
        // 南部
        for (let i = 0; i < 3; i++) 
        {
          let model1XOffset = i * 24;
          let model1 = powerPylonModel.clone();
          model1.name = '南部' + (i + 1) + '#电力桥塔';
          model1.position.set(-40 + model1XOffset, 0, 30);
          powerPylonGroup.add(model1);
        }
      });
      scene.add(powerPylonGroup);
    },

    // 创建最两侧的柱子
    addBilateralPostsModel() 
    {
      let fbxLoader = new FBXLoader();
      // 创建group
      let postsGroup = new THREE.Group();
      postsGroup.name = "lastPostsGroup";

      fbxLoader.load(`/zhangyan-substation/models/3. 柱子.FBX`, fbx => 
      {
        fbx.scale.set(0.0003, 0.0003, 0.0003);
        let postsModel = fbx;

        for (let i = 0; i < 12; i++) 
        {
          // 起始位
          let model1XStart = -36.9;
          // 每组的偏移量
          let groupXOffset = i * 6;
          // 北部柱子
          let model11 = postsModel.clone();
          model11.position.set(model1XStart + groupXOffset, 0, -27.3);
          postsGroup.add(model11);
          let model12 = postsModel.clone();
          model12.position.set(model1XStart + 1.7 + groupXOffset, 0, -27.3);
          postsGroup.add(model12);
          let model13 = postsModel.clone();
          model13.position.set(model1XStart + 3.4 + groupXOffset, 0, -27.3);
          postsGroup.add(model13);
          // 南部柱子
          let model21 = postsModel.clone();
          model21.position.set(model1XStart + groupXOffset, 0, 27.4);
          postsGroup.add(model21);
          let model22 = postsModel.clone();
          model22.position.set(model1XStart + 1.7 + groupXOffset, 0, 27.4);
          postsGroup.add(model22);
          let model23 = postsModel.clone();
          model23.position.set(model1XStart + 3.4 + groupXOffset, 0, 27.4);
          postsGroup.add(model23);
        }
      });

      scene.add(postsGroup);
    },

    // 创建最开始的设备
    addFirstEquipmentModel() 
    {
      let fbxLoader = new FBXLoader();
      // 创建group
      let equipmentGroup = new THREE.Group();
      equipmentGroup.name = "equipmentOneGroup";

      fbxLoader.load(`/zhangyan-substation/models/2. 柱子旁边的设备.FBX`, fbx => 
      {
        fbx.scale.set(0.00055, 0.00055, 0.00055);
        fbx.rotation.x = 0.5 * Math.PI;
        fbx.rotation.y = 1 * Math.PI;
        let postsModel = fbx;

        for (let i = 0; i < 12; i++) 
        {
            let model1XOffset = i * 6;
            let model1 = postsModel.clone();
            model1.name = (i + 1) + '#设备';
            model1.position.set(-35.2 + model1XOffset, 1.6, -24.5);
            equipmentGroup.add(model1);
        }
      });

      scene.add(equipmentGroup);
    },

    // 创建最开始的管子
    addFirstPipesModel() 
    {
      let fbxLoader = new FBXLoader();
      // 创建group
      let pipesGroup = new THREE.Group();
      pipesGroup.name = "pipesGroup";

      fbxLoader.load(`/zhangyan-substation/models/4. 连接柱子旁边设备的管子.FBX`, fbx => 
      {
        let pipesModel = fbx;
        let model1 = pipesModel.clone();
        model1.name = '1#管道';
        model1.scale.set(0.00272, 0.00055, 0.00055);
        model1.position.set(-3.9, -8.25, -24.6);
        model1.rotation.x = 0.5 * Math.PI;
        model1.rotation.y = 1 * Math.PI;
        pipesGroup.add(model1);
      })

      scene.add(pipesGroup);
    },

    // 创建最开始的设备（反）
    addFirstEquipmentAgainstModel() 
    {
      let fbxLoader = new FBXLoader();
      // 创建group
      let equipmentGroup = new THREE.Group();
      equipmentGroup.name = "equipmentOneAgainstGroup";

      fbxLoader.load(`/zhangyan-substation/models/5. 柱子旁边的设备（反）.FBX`, fbx => 
      {
        fbx.scale.set(0.00055, 0.00055, 0.00055);
        let postsModel = fbx;

        for (let i = 0; i < 6; i++) 
        {
          let model1XOffset = i * 11.95
          let model1 = postsModel.clone();
          model1.name = (i + 1) + '# 550kV I 线高抗';
          model1.position.set(-32 + model1XOffset, 1.8, -22.7);
          equipmentGroup.add(model1);
        }

        // 添加精灵
        //加载设备模型 → 遍历每个设备 → 为每个设备创建指示牌
                               //↓
                       // 异步生成纹理
                               //↓
                    // 将纹理转为精灵对象
                              // ↓
                    // 设置位置/大小并显示
        equipmentGroup.children.forEach((item, index) => 
        {
          let model1XOffset = index * 11.8;
          this.createDeviceIndicator({
              img: '/zhangyan-substation/images/tk-blue.png',
              width: 350,
              height: 90,
              txt: (index + 1) + '#550kV I线高抗',
              status: '正常',
              txtPaddingX: 35,
              txtPaddingY: 60
          }).then((panelMate) => 
          {
            let panelMesh =  new THREE.Sprite(panelMate);
            panelMesh.position.set(-32 + model1XOffset, 8, -22);
            panelMesh.scale.set(6, 4, 1);
            scene.add(panelMesh);
          });
        })
      });

      scene.add(equipmentGroup);
    },

    // 创建最开始的柱子（反）
    addFirstPostsAgainstModel() 
    {
      let fbxLoader = new FBXLoader();
      // 创建group
      let postsGroup = new THREE.Group();
      postsGroup.name = "postsAgainstGroup";

      fbxLoader.load(`/zhangyan-substation/models/3. 柱子.FBX`, fbx => 
      {
        fbx.scale.set(0.0003, 0.0003, 0.0003);
        let postsModel = fbx;

        for (let i = 0; i < 6; i++) 
        {
          // 起始位
          let model1XStart = -33.6;
          // 每组的偏移量
          let groupXOffset = i * 12;

          let model11 = postsModel.clone();
          model11.position.set(model1XStart + groupXOffset, 0, -17.5);
          postsGroup.add(model11);
          let model12 = postsModel.clone();
          model12.position.set(model1XStart + 1.6 + groupXOffset, 0, -17.5);
          postsGroup.add(model12);
          let model13 = postsModel.clone();
          model13.position.set(model1XStart + 3.2 + groupXOffset, 0, -17.5);
          postsGroup.add(model13);
        }
      });

      scene.add(postsGroup);
    },

    // 创建连接管
    addLinkPopesModel() 
    {
      let fbxLoader = new FBXLoader();
      // 创建group
      let pipesGroup = new THREE.Group();
      pipesGroup.name = "linkPipesGroup";

      fbxLoader.load(`/zhangyan-substation/models/12. 倒数第二个架子下设备的管子.FBX`, fbx => 
      {
        let pipesModel1 = fbx.clone();
        pipesModel1.scale.set(0.000037, 0.00025, 0.00025);

        let pipesModel2 = fbx.clone();
        pipesModel2.scale.set(0.00013, 0.00025, 0.00025);
        pipesModel2.rotation.y = -0.5 * Math.PI;

        let pipesModel3 = fbx.clone();
        pipesModel3.scale.set(0.0008, 0.00025, 0.00025);

        let pipesModel31 = fbx.clone();
        pipesModel31.scale.set(0.000067, 0.00025, 0.00025);
        pipesModel31.rotation.y = -0.5 * Math.PI;

        for (let i = 0; i < 6; i++) 
        {
          // 最开始柱子下的管子
          let model1XOffset = i * 12;
          let model1 = pipesModel1.clone();
          model1.position.set(-31.4 + model1XOffset, -0.3, 1.7);
          pipesGroup.add(model1);
          // 连接柱子和变压器的管子
          let model2XOffset = i * 12;
          let model2 = pipesModel2.clone();
          model2.position.set(-51.1 + model2XOffset, -0.3, -10);
          pipesGroup.add(model2);
        }

        for (let i = 0; i < 6; i++) 
        {
          // 横向的6根管子
          let model3YOffset = i * 1.1;
          let model3 = pipesModel3.clone();
          model3.position.set(10.1, -0.3, 3.3 + model3YOffset);
          pipesGroup.add(model3);
        }
        // 追加6根管子的两头的管子
        let model31 = pipesModel31.clone();
        model31.position.set(-55, -0.3, -12.1);
        pipesGroup.add(model31);

        let model32 = pipesModel31.clone();
        model32.position.set(12.6, -0.3, -12.1);
        pipesGroup.add(model32);
      })

      scene.add(pipesGroup);
    },

    // 创建变压器桥塔
    addTransformerPylonModel() 
    {
      let fbxLoader = new FBXLoader();
      // 创建group
      let transformerPylonGroup = new THREE.Group();
      transformerPylonGroup.name = "transformerPylonGroup";

      fbxLoader.load(`/zhangyan-substation/models/7. 变压器上面的架子.FBX`, fbx => 
      {
        fbx.scale.set(0.0007, 0.0007, 0.0007);
        let transformerPylonModel = fbx;

        for (let i = 0; i < 6; i++) 
        {
          let model1XOffset = i * 12;
          let model1 = transformerPylonModel.clone();
          model1.name = (i + 1) + '#变压桥塔';
          model1.position.set(-23.3 + model1XOffset, 0, -5);
          transformerPylonGroup.add(model1);
        }
      });

      scene.add(transformerPylonGroup);
    },

    // 创建变压器
    addTransformerModel() 
    {
      let gloader = new GLTFLoader();
      // 创建group
      let transformerGroup = new THREE.Group();
      transformerGroup.name = "transformerGroup";
      // let list = []
      gloader.load(`/zhangyan-substation/models/8. 变压器.glb`, gltf => 
      {
        gltf.scene.scale.set(0.9, 0.9, 0.9);
        gltf.scene.rotation.y = -0.5 * Math.PI;
        let transformerPylonModel = gltf.scene;

        for (let i = 0; i < 6; i++) 
        {
          let model1XOffset = i * 12;
          let model1 = transformerPylonModel.clone();
          model1.name = (i + 1) + '#变压器';
          model1.position.set(41 + model1XOffset, -0.1, 104.7);
          byqList.push(model1)
          transformerGroup.add(model1);
        }

        // 添加精灵
        transformerGroup.children.forEach((item, index) => 
        {
          let model1XOffset = index * 11.8;
          this.createDeviceIndicator({
              img: '/zhangyan-substation/images/tk-blue.png',
              width: 200,
              height: 90,
              txt: (index + 1) + '#变压器',
              status: '正常',
              txtPaddingX: 22,
              txtPaddingY: 60
          }).then((panelMate) => 
          {
            let panelMesh =  new THREE.Sprite(panelMate);
            panelMesh.position.set(-32 + model1XOffset, 8, -6);
            panelMesh.scale.set(6, 4, 1);
            scene.add(panelMesh);
          });
        })
      });

      scene.add(transformerGroup);
    },

    // 创建转换房
    addTransitionHouseModel() 
    {
      let fbxLoader = new FBXLoader();
      // 创建group
      let houseGroup = new THREE.Group();
      houseGroup.name = "houseGroup";

      fbxLoader.load(`/zhangyan-substation/models/6. 屋子1.FBX`, fbx => 
      {
        fbx.scale.set(0.0013, 0.0013, 0.0013);
        fbx.rotation.x = 0.5 * Math.PI;
        fbx.rotation.y = 1 * Math.PI;
        let houseModel = fbx;

        for (let i = 0; i < 3; i++) {
          let model1XOffset = i * 24;
          let model1 = houseModel.clone();
          model1.name = (i + 1) + '#220KW 二次设备舱';
          model1.position.set(-25.8 + model1XOffset, 1.3, -1);
          houseGroup.add(model1);
        }
      });
      scene.add(houseGroup);
    },

    // 创建最后的设备（输出端）
    addLastEquipmentModel() 
    {
      let fbxLoader = new FBXLoader();
      // 创建group
      let equipmentGroup = new THREE.Group();
      equipmentGroup.name = "lastEquipmentOneGroup";

      fbxLoader.load(`/zhangyan-substation/models/13. 最后的设备.FBX`, fbx => 
      {
        fbx.scale.set(0.0008, 0.0008, 0.0008);
        fbx.rotation.x = 0.5 * Math.PI;
        fbx.rotation.y = 1 * Math.PI;
        let postsModel = fbx;

        for (let i = 0; i < 12; i++) {
            let model1XOffset = i * 6;
            let model1 = postsModel.clone();
            model1.name = (i + 1) + '#设备';
            model1.position.set(-35.2 + model1XOffset, 1.6, 24.5);
            equipmentGroup.add(model1);
        }
      });

      scene.add(equipmentGroup);
    },

    // 创建最后的管子
    addLastPipesModel() 
    {
      let fbxLoader = new FBXLoader();
      // 创建group
      let pipesGroup = new THREE.Group();
      pipesGroup.name = "lastPipesGroup";

      fbxLoader.load(`/zhangyan-substation/models/12. 倒数第二个架子下设备的管子.FBX`, fbx => 
      {
        let pipesModel = fbx;

        let model1 = pipesModel.clone();
        model1.name = '1#管道';
        model1.scale.set(0.000786, 0.00055, 0.00055);
        model1.position.set(10, 0, 64.35);
        pipesGroup.add(model1);
      })

      scene.add(pipesGroup);
    },

    // 创建最后的设备（反）
    addLastEquipmentAgainstModel() 
    {
      let fbxLoader = new FBXLoader();
      // 创建group
      let equipmentGroup = new THREE.Group();
      equipmentGroup.name = "lastEquipmentOneAgainstGroup";

      fbxLoader.load(`/zhangyan-substation/models/11. 倒数第二个架子下的设备.FBX`, fbx => 
      {
        fbx.scale.set(0.0008, 0.0008, 0.0008);
        fbx.rotation.x = 0.5 * Math.PI;
        fbx.rotation.y = 1 * Math.PI;
        let postsModel = fbx;

        for (let i = 0; i < 6; i++) 
        {
          let model1XOffset = i * 11.95;
          let model1 = postsModel.clone();
          model1.name = (i + 1) + '#设备';
          model1.position.set(-32 + model1XOffset, 1.8, 19.6);
          equipmentGroup.add(model1);
        }
      });

      scene.add(equipmentGroup);
    },

    // 创建倒数第二道的柱子（反）（输出端）
    addLastTwoPostsModel() 
    {
      let fbxLoader = new FBXLoader();
      // 创建group
      let postsGroup = new THREE.Group();
      postsGroup.name = "lastTwoPostsGroup";

      fbxLoader.load(`/zhangyan-substation/models/3. 柱子.FBX`, fbx => 
      {
        fbx.scale.set(0.0003, 0.0003, 0.0003);
        let postsModel = fbx;

        for (let i = 0; i < 6; i++) 
        {
          // 起始位
          let model1XStart = -33.6;
          // 每组的偏移量
          let groupXOffset = i * 12;

          let model11 = postsModel.clone();
          model11.position.set(model1XStart + groupXOffset, 0, 14);
          postsGroup.add(model11);
          let model12 = postsModel.clone();
          model12.position.set(model1XStart + 1.6 + groupXOffset, 0, 14);
          postsGroup.add(model12);
          let model13 = postsModel.clone();
          model13.position.set(model1XStart + 3.2 + groupXOffset, 0, 14);
          postsGroup.add(model13);
        }
      });

      scene.add(postsGroup);
    },

    // 创建断路器
    addDisconnectorModel() 
    {
      let gloader = new GLTFLoader();
      // 创建group
      let transformerGroup = new THREE.Group();
      transformerGroup.name = "transformerGroup";

      gloader.load(`/zhangyan-substation/models/断路器.glb`, gltf => 
      {
        gltf.scene.scale.set(0.12, 0.12, 0.12);
        let transformerPylonModel = gltf.scene;

        for (let i = 0; i < 6; i++) 
        {
          let model1XOffset = i * 12;
          let model1 = transformerPylonModel.clone();
          model1.name = (i + 1) + '#隔离开关';
          model1.position.set(-4 + model1XOffset, 2, -108.5);
          transformerGroup.add(model1);
        }

        // 添加精灵
        transformerGroup.children.forEach((item, index) => 
        {
          let model1XOffset = index * 11.8;
          this.createDeviceIndicator({
              img: '/zhangyan-substation/images/tk-blue.png',
              width: 280,
              height: 90,
              txt: (index + 1) + '# 隔离开关',
              status: '正常',
              txtPaddingX: 45,
              txtPaddingY: 60
          }).then((panelMate) => 
          {
            let panelMesh =  new THREE.Sprite(panelMate);
            panelMesh.position.set(-33 + model1XOffset, 10, 14);
            panelMesh.scale.set(6, 4, 1);
            scene.add(panelMesh);
          });
        })
      });

      scene.add(transformerGroup);
    },

    // 创建倒数第二道的电力桥塔（输出端）
    addLastTwoPowerPylonModel() 
    {
      let fbxLoader = new FBXLoader();
      // 创建group
      let transformerPylonGroup = new THREE.Group();
      transformerPylonGroup.name = "lastTransformerPylonGroup";

      fbxLoader.load(`/zhangyan-substation/models/10. 倒数第二个架子.FBX`, fbx => 
      {
        fbx.scale.set(0.0007, 0.0007, 0.0007);
        let transformerPylonModel = fbx;

        for (let i = 0; i < 6; i++) 
        {
            let model1XOffset = i * 12;
            let model1 = transformerPylonModel.clone();
            model1.name = (i + 1) + '#变压器桥塔';
            model1.position.set(-12.6 + model1XOffset, 0, 62);
            transformerPylonGroup.add(model1);
        }
      });

      scene.add(transformerPylonGroup);
    },

    // 创建电线
    addWireModel() 
    {
      let wireGroup = new THREE.Group();
      wireGroup.name = "wireGroup";

      let lineMaterial = new THREE.LineBasicMaterial({color: 0x656b72});//0x656b72-0xff0000
      let line = new THREE.Line();
      line.material = lineMaterial;

      // 高压塔
      for (let i = 0; i < 3; i++) 
      {
        let model1XOffset = i * 24;
        // 北部高压塔
        let wireA1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -30 + model1XOffset, 22, -63),
          new THREE.Vector3( -33 + model1XOffset, 10, -45 ),
          new THREE.Vector3( -35 + model1XOffset, 7.35, -26.5 )
        ]);
        let wireB1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -31 + model1XOffset, 17, -63),
          new THREE.Vector3( -31.5 + model1XOffset, 10, -45 ),
          new THREE.Vector3( -32 + model1XOffset, 7.35, -26.5 )
        ]);
        let wireC1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -30.5 + model1XOffset, 12.5, -63),
          new THREE.Vector3( -29.8 + model1XOffset, 10, -45 ),
          new THREE.Vector3( -29 + model1XOffset, 7.35, -26.5 )
        ]);
        let wireD1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -22 + model1XOffset, 22, -63),
          new THREE.Vector3( -19 + model1XOffset, 10, -45 ),
          new THREE.Vector3( -17 + model1XOffset, 7.35, -26.5 )
        ]);
        let wireE1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -21 + model1XOffset, 17, -63),
          new THREE.Vector3( -20.5 + model1XOffset, 10, -45 ),
          new THREE.Vector3( -20 + model1XOffset, 7.35, -26.5 )
        ]);
        let wireF1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -22 + model1XOffset, 12.5, -63),
          new THREE.Vector3( -22.5 + model1XOffset, 10, -45 ),
          new THREE.Vector3( -23.2 + model1XOffset, 7.35, -26.5 )
        ]);

        // 南部高压塔
        let wireA2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -30 + model1XOffset, 22, 63),
          new THREE.Vector3( -33 + model1XOffset, 10, 45 ),
          new THREE.Vector3( -35 + model1XOffset, 7.35, 26.5 )
        ]);
        let wireB2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -31 + model1XOffset, 17, 63),
          new THREE.Vector3( -31.5 + model1XOffset, 10, 45 ),
          new THREE.Vector3( -32 + model1XOffset, 7.35, 26.5 )
        ]);
        let wireC2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -30.5 + model1XOffset, 12.5, 63),
          new THREE.Vector3( -29.8 + model1XOffset, 10, 45 ),
          new THREE.Vector3( -29 + model1XOffset, 7.35, 26.5 )
        ]);
        let wireD2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -22 + model1XOffset, 22, 63),
          new THREE.Vector3( -19 + model1XOffset, 10, 45 ),
          new THREE.Vector3( -17 + model1XOffset, 7.35, 26.5 )
        ]);
        let wireE2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -21 + model1XOffset, 17, 63),
          new THREE.Vector3( -20.5 + model1XOffset, 10, 45 ),
          new THREE.Vector3( -20 + model1XOffset, 7.35, 26.5 )
        ]);
        let wireF2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( -22 + model1XOffset, 12.5, 63),
          new THREE.Vector3( -22.5 + model1XOffset, 10, 45 ),
          new THREE.Vector3( -23.2 + model1XOffset, 7.35, 26.5 )
        ]);

        // 北部电线
        this.generateWire(wireA1, line, wireGroup)
        this.generateWire(wireB1, line, wireGroup)
        this.generateWire(wireC1, line, wireGroup)
        this.generateWire(wireD1, line, wireGroup)
        this.generateWire(wireE1, line, wireGroup)
        this.generateWire(wireF1, line, wireGroup)
        // 南部电线
        this.generateWire(wireA2, line, wireGroup)
        this.generateWire(wireB2, line, wireGroup)
        this.generateWire(wireC2, line, wireGroup)
        this.generateWire(wireD2, line, wireGroup)
        this.generateWire(wireE2, line, wireGroup)
        this.generateWire(wireF2, line, wireGroup)
      }

      // 最两侧柱子
      for (let i = 0; i < 12; i++) 
      {
        // 起始位
        let model1XStart = -36.9;
        // 每组的偏移量
        let groupXOffset = i * 6;
        // 北部柱子
        let wireA1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 7, -26.5),
          new THREE.Vector3( model1XStart + groupXOffset, 5, -26.9 ),
          new THREE.Vector3( model1XStart + groupXOffset, 4, -27.3 )
        ]);
        let wireB1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 7, -26.5),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 5, -26.9 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 4, -27.3 )
        ]);
        let wireC1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 7, -26.5),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 5, -26.9 ),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 4, -27.3 )
        ]);
        // 南部柱子
        let wireA2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 7, 26.5),
          new THREE.Vector3( model1XStart + groupXOffset, 5, 26.9 ),
          new THREE.Vector3( model1XStart + groupXOffset, 4, 27.3 )
        ]);
        let wireB2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 7, 26.5),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 5, 26.9 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 4, 27.3 )
        ]);
        let wireC2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 7, 26.5),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 5, 26.9 ),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 4, 27.3 )
        ]);

        // 北部电线
        this.generateWire(wireA1, line, wireGroup)
        this.generateWire(wireB1, line, wireGroup)
        this.generateWire(wireC1, line, wireGroup)
        // 南部电线
        this.generateWire(wireA2, line, wireGroup)
        this.generateWire(wireB2, line, wireGroup)
        this.generateWire(wireC2, line, wireGroup)
      }

      // 柱子与设备
      for (let i = 0; i < 12; i++) 
      {
        // 起始位
        let model1XStart = -36.9;
        // 每组的偏移量
        let groupXOffset = i * 6;
        // 北部设备
        let wireA1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 4, -27.3),
          new THREE.Vector3( model1XStart + groupXOffset, 5, -26.9 ),
          new THREE.Vector3( model1XStart + groupXOffset, 3.3, -26.3 )
        ]);
        let wireB1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 4, -27.3),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 5, -26.9 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 3.3, -26.3 )
        ]);
        let wireC1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 4, -27.3),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 5, -26.9 ),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 3.3, -26.3 )
        ]);
        // 南部设备
        let wireA2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 4, 27.3),
          new THREE.Vector3( model1XStart + groupXOffset, 5, 26.9 ),
          new THREE.Vector3( model1XStart + groupXOffset + 0.8, 3, 26.3 )
        ]);
        let wireB2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 4, 27.3),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 5, 26.9 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 3, 26.7 )
        ]);
        let wireC2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 4, 27.3),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 5, 26.9 ),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset - 0.8, 3, 26.3 )
        ]);

        // 北部电线
        this.generateWire(wireA1, line, wireGroup)
        this.generateWire(wireB1, line, wireGroup)
        this.generateWire(wireC1, line, wireGroup)
        // 北部电线
        this.generateWire(wireA2, line, wireGroup)
        this.generateWire(wireB2, line, wireGroup)
        this.generateWire(wireC2, line, wireGroup)
      }

      // 设备与柱子
      for (let i = 0; i < 6; i++) 
      {
        // 起始位
        let model1XStart = -33.6;
        // 每组的偏移量
        let groupXOffset = i * 12;
        // 北部设备
        let wireA1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 3.6, -20.8),
          new THREE.Vector3( model1XStart + groupXOffset, 5.5, -18.9 ),
          new THREE.Vector3( model1XStart + groupXOffset, 4.1, -17.5 )
        ]);
        let wireB1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 3.6, -20.8),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 5.5, -18.9 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 4.1, -17.5 )
        ]);
        let wireC1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 3.6, -20.8),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 5.5, -18.9 ),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 4.1, -17.5 )
        ]);
        // 南部设备
        let wireA2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset + 0.6, 3.5, 17.8),
          new THREE.Vector3( model1XStart + groupXOffset, 5.5, 16 ),
          new THREE.Vector3( model1XStart + groupXOffset, 4, 14.1 )
        ]);
        let wireB2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset - 0.2, 3.5, 17.3),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 5.5, 16 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 4, 14.1 )
        ]);
        let wireC2 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset - 1, 3.5, 17.8),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 5.5, 16 ),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 4, 14.1 )
        ]);

        // 北部电线
        this.generateWire(wireA1, line, wireGroup)
        this.generateWire(wireB1, line, wireGroup)
        this.generateWire(wireC1, line, wireGroup)
        // 南部电线
        this.generateWire(wireA2, line, wireGroup)
        this.generateWire(wireB2, line, wireGroup)
        this.generateWire(wireC2, line, wireGroup)
      }

      // 柱子与变压器架子
      for (let i = 0; i < 6; i++) 
      {
        // 起始位
        let model1XStart = -33.6;
        // 每组的偏移量
        let groupXOffset = i * 12;
        let wireA1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 4, -17.5 ),
          new THREE.Vector3( model1XStart + groupXOffset, 5, -12),
          new THREE.Vector3( model1XStart + groupXOffset, 7.1, -7 )
        ]);
        let wireB1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 4, -17.5 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 5, -12),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 7.1, -7 )
        ]);
        let wireC1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 4, -17.5 ),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 5, -12),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 7.1, -7 )
        ]);
        this.generateWire(wireA1, line, wireGroup)
        this.generateWire(wireB1, line, wireGroup)
        this.generateWire(wireC1, line, wireGroup)
      }

      // 变压器架子与变压器
      for (let i = 0; i < 6; i++) 
      {
        // 起始位
        let model1XStart = -34.3;
        // 每组的偏移量
        let groupXOffset = i * 12;
        let wireA1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 7.1, -7 ),
          new THREE.Vector3( model1XStart + groupXOffset, 4.5, -6.5 )
        ]);
        let wireB1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1 + groupXOffset, 7.1, -7 ),
          new THREE.Vector3( model1XStart + 1 + groupXOffset, 4, -7.5 )
        ]);
        let wireC1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 7.1, -7 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 4.5, -6.5 )
        ]);
        let wireD1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.1 + groupXOffset, 7.1, -7 ),
          new THREE.Vector3( model1XStart + 3.1 + groupXOffset, 4.5, -6.5 )
        ]);
        this.generateWire(wireA1, line, wireGroup)
        this.generateWire(wireB1, line, wireGroup)
        this.generateWire(wireC1, line, wireGroup)
        this.generateWire(wireD1, line, wireGroup)
      }

      // 变压器与转换房与断路器
      for (let i = 0; i < 6; i++) 
      {
        // 起始位
        let model1XStart = -34.3;
        // 每组的偏移量
        let groupXOffset = i * 12;
        let wireA1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 2, -6.5 ),
          new THREE.Vector3( model1XStart + groupXOffset + 1, 2.5, 0 ),
          new THREE.Vector3( model1XStart + groupXOffset + 1, 4.5, 12.3 )
        ]);
        let wireB1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 2, -6.5 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset, 2.5, 0 ),
          new THREE.Vector3( model1XStart + 1.7 + groupXOffset + 0.8, 4.5, 12.3 )
        ]);
        let wireC1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset, 2, -6.5 ),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset - 1, 2.5, 0 ),
          new THREE.Vector3( model1XStart + 3.4 + groupXOffset + 0.6, 4.5, 12.3 )
        ]);
        this.generateWire(wireA1, line, wireGroup)
        this.generateWire(wireB1, line, wireGroup)
        this.generateWire(wireC1, line, wireGroup)
      }

      // 断路器与架子
      for (let i = 0; i < 6; i++) 
      {
        // 起始位
        let model1XStart = -33.3;
        // 每组的偏移量
        let groupXOffset = i * 12;
        let wireA1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 4.5, 12.3 ),
          new THREE.Vector3( model1XStart + groupXOffset, 6, 12.7 ),
          new THREE.Vector3( model1XStart + groupXOffset, 8.5, 12.8 )
        ]);
        let wireB1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.6 + groupXOffset, 4.5, 12.3 ),
          new THREE.Vector3( model1XStart + 1.6 + groupXOffset, 6, 12.7 ),
          new THREE.Vector3( model1XStart + 1.6 + groupXOffset, 8.5, 12.8 )
        ]);
        let wireC1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.1 + groupXOffset, 4.5, 12.3 ),
          new THREE.Vector3( model1XStart + 3.1 + groupXOffset, 6, 12.7 ),
          new THREE.Vector3( model1XStart + 3.1 + groupXOffset, 8.5, 12.8 )
        ]);
        this.generateWire(wireA1, line, wireGroup)
        this.generateWire(wireB1, line, wireGroup)
        this.generateWire(wireC1, line, wireGroup)
      }

      // 架子与柱子
      for (let i = 0; i < 6; i++) 
      {
        // 起始位
        let model1XStart = -33.6;
        // 每组的偏移量
        let groupXOffset = i * 12;
        let wireA1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + groupXOffset, 8.5, 12.8 ),
          new THREE.Vector3( model1XStart + groupXOffset, 6, 13.4 ),
          new THREE.Vector3( model1XStart + groupXOffset, 4, 14.1 )
        ]);
        let wireB1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 1.6 + groupXOffset, 8.5, 12.8 ),
          new THREE.Vector3( model1XStart + 1.6 + groupXOffset, 6, 13.4 ),
          new THREE.Vector3( model1XStart + 1.6 + groupXOffset, 4, 14.1 )
        ]);
        let wireC1 = new THREE.CatmullRomCurve3([
          new THREE.Vector3( model1XStart + 3.2 + groupXOffset, 8.5, 12.8 ),
          new THREE.Vector3( model1XStart + 3.2 + groupXOffset, 6, 13.4 ),
          new THREE.Vector3( model1XStart + 3.2 + groupXOffset, 4, 14.1 )
        ]);
        this.generateWire(wireA1, line, wireGroup)
        this.generateWire(wireB1, line, wireGroup)
        this.generateWire(wireC1, line, wireGroup)
      }

      scene.add(wireGroup);
    },
    // 电线-子方法
    generateWire(_curveModel, _comLine, _wireGroup){
      let positionsArryA = [];
      let pointsA = _curveModel.getPoints(100)
        pointsA.forEach(d => 
        {
          positionsArryA.push(d.x, d.y, d.z)
        })
        const positionsA = new Float32Array(positionsArryA)
        let lineGeoA = new THREE.BufferGeometry();
        lineGeoA.setAttribute('position', new THREE.BufferAttribute(positionsA, 3))

        let lineA = _comLine.clone();
        lineA.geometry = lineGeoA;
        _wireGroup.add(lineA);
    },

    // 创建风力发电机
    addWindTurbineModel() 
    {
      let gloader = new GLTFLoader();
      let windTurbineGroup = new THREE.Group();
      windTurbineGroup.name = "windTurbineGroup";
      gloader.load(`/zhangyan-substation/models/风机(带动画).glb`, gltf => 
      { // <-- 模型文件
          
        // 注意：gltf 里现在有两样东西：
        // 1. gltf.scene (模型)
        // 2. gltf.animations (动画剪辑数组)
        
        // 检查一下它有没有动画
        let hasAnimations = gltf.animations && gltf.animations.length > 0;
        for (let i = 0; i < 7; i++) {//设置风机数量
          // 克隆模型 (注意：clone() 不会自动克隆动画，我们需要为每个克隆体创建新的 mixer)
          let model = gltf.scene.clone();
          model.scale.set(0.009, 0.009, 0.009); // 调整大小
          let zPos = -320 + (i * 100);//调整Z轴位置和风机间距
          model.position.set(180, 0, zPos);// 设置风机整体位置
          model.rotation.y = Math.PI * 1.5;
          windTurbineGroup.add(model);
          
          // --- 如果有动画，就播放它 ---
          if (hasAnimations) 
          {
            // 1. 为这个克隆体创建一个动画混合器
            let mixer = new THREE.AnimationMixer(model);
            
            // 2. 找到第一个动画剪辑 (假设只有一个动画剪辑)
            let clip = gltf.animations[0];
            let action = mixer.clipAction(clip);
            
            // 3. 播放动画
            action.play();
            
            // 4. 把这个 mixer 存起来，在 render() 循环里更新它
            windTurbineMixers.push(mixer);
          }
         }
       });
           scene.add(windTurbineGroup);
 },

   // 创建光伏板
    addSolarPanelModel() 
    {
      // 导入模型用的是 GLTFLoader 和 .glb，所以需要保持一致
      let gloader = new GLTFLoader(); 
      let solarPanelGroup = new THREE.Group();
      solarPanelGroup.name = "solarPanelGroup";

      gloader.load(`/zhangyan-substation/models/光伏板.glb`, gltf => 
      { //

        let panelModel = gltf.scene; 
        
        // 1. 修正 Scale (改成一个可见的大小，比如 1)
        panelModel.scale.set(5, 5, 5); // (根据模型大小再调整)

        // 2. 增加间距 (把 10 增加到 25 米，避免重叠)
        let spacing = 30; // 间距 25 米
        
        // 3. 循环次数 (i = 排 / j = 列)
        let rows = 10; // 比如 5 排
        let columns = 10; // 每排 4 个

        // --- 1. 添加右侧的光伏板 (对应右侧红框) ---
        for (let i = 0; i < rows; i++) 
        { 
          for (let j = 0; j < columns; j++) 
          {
            let model = panelModel.clone();
            
            // 放在 x = 170 (东墙 x=150 外面)
            // z 坐标从 0 开始向后排
            model.position.set(-120 + j * spacing, 0, -140 - i * spacing);
            
            // 旋转: 朝向左前方 (摄像机)
            model.rotation.y = Math.PI * 1; 
            
            solarPanelGroup.add(model);
          }
        }

        // --- 2. 添加左侧的光伏板 (对应左侧红框) ---
        for (let i = 0; i < rows; i++) 
        { 
          for (let j = 0; j < columns; j++) 
          {
            let model = panelModel.clone();
            
            // 放在 x = -170 (西墙 x=-150 外面)
            // z 坐标从 0 开始向后排
            model.position.set(150 - j * spacing, 0, 380 - i * spacing);
            
            // 旋转: 朝向右前方 (摄像机)
            model.rotation.y = Math.PI * 1; 
            
            solarPanelGroup.add(model);
          }
        }
      });
      
      // 4. 确保添加到场景 (你上次的代码片段里没有这行)
      scene.add(solarPanelGroup); 
    },

    // 创建引导箭头
    addArrowModel() 
    {
      // 主干道箭头
      mainArrowsRoadTexture = new THREE.TextureLoader().load('/zhangyan-substation/images/箭头.png');
      mainArrowsRoadTexture.wrapS = mainArrowsRoadTexture.wrapT = THREE.RepeatWrapping;
      mainArrowsRoadTexture.repeat.set(1, 15);

      let mainRoadPoint = new THREE.MeshBasicMaterial();
      mainRoadPoint.map = mainArrowsRoadTexture;
      mainRoadPoint.transparent = true;
      mainRoadPoint.side = THREE.DoubleSide;

      let mainRoadGeometry = new THREE.PlaneGeometry(2, 75);
      let mainRoadMesh = new THREE.Mesh(mainRoadGeometry, mainRoadPoint);
      mainRoadMesh.position.set(-2, 0.11, 6)
      mainRoadMesh.rotation.x = -0.5 * Math.PI;
      mainRoadMesh.rotation.z = 0.5 * Math.PI;


      // A1干道（纵向）
      arrowsRoadTextureA1 = new THREE.TextureLoader().load('/zhangyan-substation/images/箭头.png');
      arrowsRoadTextureA1.wrapS = arrowsRoadTextureA1.wrapT = THREE.RepeatWrapping;
      arrowsRoadTextureA1.repeat.set(1, 5);
      let a1RoadPoint = new THREE.MeshBasicMaterial();
      a1RoadPoint.map = arrowsRoadTextureA1;
      a1RoadPoint.transparent = true;
      a1RoadPoint.side = THREE.DoubleSide;
      let a1RoadGeometry = new THREE.PlaneGeometry(2, 19)
      let a1RoadMesh = new THREE.Mesh(a1RoadGeometry, a1RoadPoint)
      a1RoadMesh.position.set(39, 0.11, -7);
      a1RoadMesh.rotation.x = -0.5 * Math.PI;
      a1RoadMesh.rotation.z = 1 * Math.PI;

      // A2干道（横向）
      arrowsRoadTextureA2 = new THREE.TextureLoader().load('/zhangyan-substation/images/箭头.png');
      arrowsRoadTextureA2.wrapS = arrowsRoadTextureA2.wrapT = THREE.RepeatWrapping;
      arrowsRoadTextureA2.repeat.set(1, 15);
      let a2RoadPoint = new THREE.MeshBasicMaterial();
      a2RoadPoint.map = arrowsRoadTextureA2;
      a2RoadPoint.transparent = true;
      a2RoadPoint.side = THREE.DoubleSide;
      let a2RoadGeometry = new THREE.PlaneGeometry(2, 75);
      let a2RoadMesh = new THREE.Mesh(a2RoadGeometry, a2RoadPoint)
      a2RoadMesh.position.set(-2, 0.11, -19);
      a2RoadMesh.rotation.x = -0.5 * Math.PI;
      a2RoadMesh.rotation.z = 1.5 * Math.PI;

      // A3干道（纵向）
      arrowsRoadTextureA3 = new THREE.TextureLoader().load('/zhangyan-substation/images/箭头.png');
      arrowsRoadTextureA3.wrapS = arrowsRoadTextureA3.wrapT = THREE.RepeatWrapping;
      arrowsRoadTextureA3.repeat.set(1, 5);
      let a3RoadPoint = new THREE.MeshBasicMaterial();
      a3RoadPoint.map = arrowsRoadTextureA3;
      a3RoadPoint.transparent = true;
      a3RoadPoint.side = THREE.DoubleSide;
      let a3RoadGeometry = new THREE.PlaneGeometry(2, 19)
      let a3RoadMesh = new THREE.Mesh(a3RoadGeometry, a3RoadPoint)
      a3RoadMesh.position.set(-42.1, 0.11, -7);
      a3RoadMesh.rotation.x = -0.5 * Math.PI;
      a3RoadMesh.rotation.z = 2 * Math.PI;

      // B1干道（纵向）
      arrowsRoadTextureB1 = new THREE.TextureLoader().load('/zhangyan-substation/images/箭头.png');
      arrowsRoadTextureB1.wrapS = arrowsRoadTextureB1.wrapT = THREE.RepeatWrapping;
      arrowsRoadTextureB1.repeat.set(1, 1.5);
      let b1RoadPoint = new THREE.MeshBasicMaterial();
      b1RoadPoint.map = arrowsRoadTextureB1;
      b1RoadPoint.transparent = true;
      b1RoadPoint.side = THREE.DoubleSide;
      let b1RoadGeometry = new THREE.PlaneGeometry(2, 5)
      let b1RoadMesh = new THREE.Mesh(b1RoadGeometry, b1RoadPoint)
      b1RoadMesh.position.set(38.9, 0.11, 12);
      b1RoadMesh.rotation.x = -0.5 * Math.PI;
      b1RoadMesh.rotation.z = 2 * Math.PI;

      // B2干道（横向）
      arrowsRoadTextureB2 = new THREE.TextureLoader().load('/zhangyan-substation/images/箭头.png');
      arrowsRoadTextureB2.wrapS = arrowsRoadTextureB2.wrapT = THREE.RepeatWrapping;
      arrowsRoadTextureB2.repeat.set(1, 15);
      let b2RoadPoint = new THREE.MeshBasicMaterial();
      b2RoadPoint.map = arrowsRoadTextureB2;
      b2RoadPoint.transparent = true;
      b2RoadPoint.side = THREE.DoubleSide;
      let b2RoadGeometry = new THREE.PlaneGeometry(2, 75);
      let b2RoadMesh = new THREE.Mesh(b2RoadGeometry, b2RoadPoint)
      b2RoadMesh.position.set(-2, 0.11, 16);
      b2RoadMesh.rotation.x = -0.5 * Math.PI;
      b2RoadMesh.rotation.z = 1.5 * Math.PI;

      // B3干道（纵向）
      arrowsRoadTextureB3 = new THREE.TextureLoader().load('/zhangyan-substation/images/箭头.png');
      arrowsRoadTextureB3.wrapS = arrowsRoadTextureB3.wrapT = THREE.RepeatWrapping;
      arrowsRoadTextureB3.repeat.set(1, 1.5);
      let b3RoadPoint = new THREE.MeshBasicMaterial();
      b3RoadPoint.map = arrowsRoadTextureB3;
      b3RoadPoint.transparent = true;
      b3RoadPoint.side = THREE.DoubleSide;
      let b3RoadGeometry = new THREE.PlaneGeometry(2, 5)
      let b3RoadMesh = new THREE.Mesh(b3RoadGeometry, b3RoadPoint)
      b3RoadMesh.position.set(-42, 0.11, 12);
      b3RoadMesh.rotation.x = -0.5 * Math.PI;
      b3RoadMesh.rotation.z = 1 * Math.PI;

      scene.add(mainRoadMesh);
      scene.add(a1RoadMesh);
      scene.add(a2RoadMesh);
      scene.add(a3RoadMesh);
      scene.add(b1RoadMesh);
      scene.add(b2RoadMesh);
      scene.add(b3RoadMesh);
    },

    // 道路指示移动
    operateRoadPoint() 
    {
      if (mainArrowsRoadTexture) 
      {
        // 防止偏移量过大造成异常
        if(mainArrowsRoadTexture.offset.y >= 100000) 
        {
          mainArrowsRoadTexture.offset.y = 0;
          arrowsRoadTextureA1.offset.y = 0;
          arrowsRoadTextureA2.offset.y = 0;
          arrowsRoadTextureA3.offset.y = 0;
          arrowsRoadTextureB1.offset.y = 0;
          arrowsRoadTextureB2.offset.y = 0;
          arrowsRoadTextureB3.offset.y = 0;
        }
        else 
        {
          mainArrowsRoadTexture.offset.y += 0.02;
          arrowsRoadTextureA1.offset.y += 0.02;
          arrowsRoadTextureA2.offset.y += 0.02;
          arrowsRoadTextureA3.offset.y += 0.02;
          arrowsRoadTextureB1.offset.y += 0.02;
          arrowsRoadTextureB2.offset.y += 0.02;
          arrowsRoadTextureB3.offset.y += 0.02;
        }
      }
    },
    // 
    // 风机扇叶转动
    operateWindTurbines() 
    {
      // 检查数组是不是有内容
      if (windTurbineClones.length > 0) 
      {
        
        // 遍历我们保存的每一个“虚拟轴心” (pivotGroup)
        windTurbineClones.forEach(pivot => 
        {
          
          // 2. 让它旋转 (根据 3ds Max 截图，X 轴对应 Three.js 的 Z 轴)
          // (这个 pivot 现在的轴心就是 motor 的轴心)
          pivot.rotation.x += 0.05; // <-- 90% 的可能是 Z 轴
          
          // 如果 Z 轴不对，再试试 X 轴
          // pivot.rotation.x += 0.05;
        });
      }
    },




    // 墙生成方法
    createWallDetail(width, height, depth, angle, material, x, y, z, name)
    {
      let cubeGeometry = new THREE.BoxGeometry(width, height, depth);
      let cube = new THREE.Mesh(cubeGeometry, material);
      cube.position.set(x, y, z);
      cube.rotation.y += angle * Math.PI; //-逆时针旋转,+顺时针
      cube.name = name;
      scene.add(cube);
    },
    // 设备指示牌
    createDeviceIndicator(canvasConfig) 
    {
      let canvas = document.createElement('canvas');
      canvas.width = 340;
      canvas.height = 240;
      let context = canvas.getContext('2d');
      //添加背景图片，进行异步操作

      return new Promise((resolve, reject) => 
      {
        let imgMain = new Image();
        imgMain.src = canvasConfig.img;
        let imgPoint = new Image();
        imgPoint.src = "/zhangyan-substation/images/tkPr.png";

        //图片加载之后的方法
        imgMain.onload = () => 
        {
          //将画布处理为透明
          context.clearRect(0, 0, canvas.width, canvas.height );
          //绘画图片
          context.drawImage(imgMain, 0, 0, canvasConfig.width, canvasConfig.height);
          imgPoint.onload = () =>
          {
            // context.drawImage(imgPoint, 0, 160);
            resolve(makeText(context, canvas, canvasConfig));
          }
        };
        //图片加载失败的方法
        imgMain.onerror = (e) => 
        {
            reject(e);
        };
      });

      //内部方法进行文字输入
      function makeText(context, canvas, canvasConfig) 
      {
        context.textAlign = 'start';
        context.font = ' 36px Microsoft YaHei';
        context.fillStyle = '#ffffff';
        context.fillText( canvasConfig.txt, canvasConfig.txtPaddingX, canvasConfig.txtPaddingY);
        // context.fillText('状态：' + canvasConfig.status, 30, 140);
        //将画布写入纹理，并返回材质
        let texture = new THREE.CanvasTexture(canvas);
        return new THREE.SpriteMaterial({map: texture});
      }
    },
    // 设备添加呼吸灯
    modelAddBLN(obj) 
    {
      outlinePass.selectedObjects = [obj]
    },
    // 设备添加呼吸灯
    modelRemoveBLN() {
      outlinePass.selectedObjects = []
    },
    // 移动摄像机
    moveCamera(oldP, oldT, newP, newT, callback) 
    {
        let tween = new TWEEN.Tween({
            x1: oldP.x,
            y1: oldP.y,
            z1: oldP.z,
            x2: oldT.x,
            y2: oldT.y,
            z2: oldT.z
        });
        tween.to(
            {
                x1: newP.x,
                y1: newP.y,
                z1: newP.z,
                x2: newT.x,
                y2: newT.y,
                z2: newT.z
            },
            1000
        );
        // 每一帧执行函数 、这个地方就是核心了、每变一帧更新一次页面元素
        tween.onUpdate((object) => 
        {
            camera.position.set(object.x1, object.y1, object.z1);
            controls.target.x = object.x2;
            controls.target.y = object.y2;
            controls.target.z = object.z2;
            controls.update();
        });

        // 动画完成后的执行函数
        tween.onComplete(() => 
        {
            controls.enabled = true;
            callback && callback();
            // this.tweenCallBack && this.tweenCallBack();
        });

        tween.easing(TWEEN.Easing.Cubic.InOut);
        // 这个函数必须有、这个是启动函数、不加不能启动
        tween.start();
    },
    // 添加漫游
    roamItem(nowPosition, endPosition, time, cameraRe, controlsRe, easing) 
    {
      var tween1 = new TWEEN.Tween(nowPosition).to(endPosition, time).easing(easing)
      tween1.onUpdate((object) => 
      {
        cameraRe.position.x = object.x1
        cameraRe.position.y = object.y1
        cameraRe.position.z = object.z1
        controlsRe.target.x = object.x2
        controlsRe.target.y = object.y2
        controlsRe.target.z = object.z2
        controlsRe.update()
      })
      return tween1
    },
    // 视频加载
    addVideoPlane() 
    {
      scene.remove(videoObjects);
      let planeGeometry = new THREE.PlaneGeometry(5, 3);
      let material = new THREE.MeshPhongMaterial();
      material.side = THREE.DoubleSide;
      let video = document.querySelector('#video');
      let texture = new THREE.VideoTexture(video);
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.format = THREE.RGBFormat;
      material.map = texture;
      let mesh = new THREE.Mesh(planeGeometry, material);
      mesh.position.set(-60, 3.5, 11);
      mesh.rotateY(Math.PI/2)
      videoObjects = mesh;
      scene.add(mesh);
    },
    removeVideoPlane() 
    {
      scene.remove(videoObjects);
    },
  }
};


</script>
<style lang="scss" scoped>
@import './styles/animate.css';
@import './styles/card.scss';
// 整屏撑满
.full-content 
{
  position: absolute;
  width: 1920px;
  height: 1080px;
  margin: 0;
  // background: url("./images/page-bg.jpg") center no-repeat;
  -webkit-background-size: cover;
  background-size: cover;

  #container 
  {
    position: absolute;
    width: 100%;
    height: 100%;
  }

  .page 
  {
    position: relative;
    top: 0;
    .left 
    {
      position: absolute;
      left: 21px;
      top: 80px;
      width: 340px;
    }
    .detail-left 
    {
      position: absolute;
      left: 21px;
      top: 80px;
      width: 600px;
    }
    .right 
    {
      position: absolute;
      right: 21px;
      top: 80px;
      width: 340px;
    }
  }
  .panel 
  {
    border: 0;
    width: 270px;
    text-indent: 20px;
    font-family: "tencent";
  }
  #video 
  {
    position: absolute;
    width: 0;
    height: 0;
  }
}


</style>
