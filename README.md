# webvr-demo
*最近WebVR API 1.2已经提出来，在我看来，WebVR走向大众浏览器是早晚的事情了，今天本人将对WebVR开发环境和开发流程进行深入介绍。*

### WebVR与WebVR API
首先，WebVR指的是使用浏览器体验VR的方式，如今已经成为了一种开放标准。
它提供了JavaScript API，使开发者可以获取vr设备的输入信息，来改变用户在虚拟空间里的位置、视觉、行为等。
以下是目前主流VR及浏览器对WebVR的支持情况。

| VR平台 | 浏览器支持 |
|:-----------|:------------|
| Cardboard       | chrome、百度VR浏览器  
| Daydream       | daydream系列手机 + chrome  
| Gear VR       | [Oculus Carmel](https://www.oculus.com/experiences/gear-vr/1290985657630933/) 或 [Samsung Internet](https://www.oculus.com/experiences/gear-vr/849609821813454/)
| Oculus Rift     |  [Firefox Nightly](https://webvr.rocks/firefox) 或 Chrome 56+
| HTC Vive     |  [Firefox Nightly](https://webvr.rocks/firefox) 或 Chrome 56+或[Servo](https://blog.mozvr.com/webvr-servo-architecture-and-latency-optimizations/)

![移动VR两大生态](https://pic1.zhimg.com/v2-509fb7c4ce9c4df722920b573aeb5db0_b.png)

遗憾的是，WebVR的体验方式目前只能运行在Android和Windows系统上。不过这并不影响我们在mac和linux上开发与调试。


### WebVR的开发环境配置
由于WebVR App需要运行VR设备上，而目前购买一台VR设备的成本不低，所以这里我总结了一套开发环境下WebVR调试方案。
首先我们需要给WebVR静态页面起一个web server，这里我安装 [Web Server for Chrome](https://chrome.google.com/webstore/detail/web-server-for-chrome/ofhbbkphhbklhfoeikjpcbhemlocgigb)，你也可以使用node或者上传至github托管。

##### PC端调试
###### 1. 安装chrome扩展程序 [WebVR API Emulation](https://chrome.google.com/webstore/detail/webvr-api-emulation/gbdnpaebafagioggnhkacnaaahpiefil)
使用WebVR API Emulation扩展程序可以模拟VR设备用户的视角、位置等。

![WebVR API Emulation模拟VR体验](http://upload-images.jianshu.io/upload_images/1939855-9545a85e0244cbb8.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

##### 移动端调试
适用于cardboard级别的WebVR App调试。
###### 1. 安装[chrome beta](https://play.google.com/store/apps/details?id=com.chrome.beta&hl=zh)
目前需要webvr还属于早期实验阶段，需要下载chrome beta最新版，安装完需要手动开启webvr支持，在浏览器地址栏输入`chrome://flags#enable-webvr`，点击启用并重新启动chrome。


![](http://upload-images.jianshu.io/upload_images/1939855-a95e2443a9e4d4db.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)



###### 2. 安装[Google VR 服务](https://play.google.com/store/apps/details?id=com.google.vr.vrcore&hl=zh)
这是google给cardboard、daydream用户提供VR服务配置，可以提供VR模式窗口，如下图。
最后你可以在chrome上打开[WebVR示例页面](https://vrlist.io)验证是否配置成功

![WebVR示例应用](http://upload-images.jianshu.io/upload_images/1939855-706f3a2451fc590e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
###### 3. chrome inspector调试
通过手机chrome访问我们开发的WebVR页面，在PC端chrome输入`chrome://inspector`进行调试，具体可以参考 [远程调试 Android 设备使用入门](https://developers.google.com/web/tools/chrome-devtools/remote-debugging/?hl=zh-cn)。

完成WebVR开发环境配置之后，我们将正式进入WebVR开发之旅。

------
### 使用WebGL开发WebVR
WebVR App实现依赖于WebGL技术开发，WebGL是在浏览器上创建和运行3D图像，它遵循OpenGL ES的规范，通过GLSL语言操作GPU进行顶点片元渲染。
![3维模型矩阵变换](http://upload-images.jianshu.io/upload_images/1939855-ab50541c023521f0.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
在WebGL场景中，3d物体都是通过矩阵变换最终形成屏幕上的2d图像，[投影矩阵`ProjectionMatrix`] × [视图矩阵`ViewMatrix`] × [模型矩阵`ModelMatrix`] × 顶点坐标，其中投影矩阵和视图矩阵可以抽象为3d场景中的相机属性。
> 模型矩阵 × 顶点坐标（相对模型） = 顶点世界坐标（绝对坐标）
视图矩阵 × 世界坐标 = 顶点相机坐标（以相机为坐标原点）
投影矩阵 × 顶点相机坐标 = 2d屏幕坐标


相比一般WebGL场景，WebVR App不同之处在于：
1. WebVR需要进行双屏渲染，通过分屏模拟人左右眼视野，因此在每一帧动画渲染中，WebVR应用都要比普通WebGL应用多绘制一次；

![左侧视图和右侧视图的相对变形，模拟左右眼的视觉差异，来产生3d效果](http://upload-images.jianshu.io/upload_images/1939855-4a049efe0a5fee31.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

2. WebVR场景相机的方向、视野、位置（DOF）与用户头显(HMD)紧密关联。
换句话说，当用户的现实视角发生变化时，WebVR场景的相机也需要动态变化。

根据以上不同之处，我梳理了一个WebVR App的简单开发流程，如下图。

![WebVR开发流程](http://upload-images.jianshu.io/upload_images/1939855-14b3af95c959b3d3.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
开发流程总结为： VR数据初始化 → WebGL初始化 → 动画渲染。
##### 一、VR数据初始化
使用`navigator.getVRDisplay()`方法获取VR实例，该方法返回值是一个promise实例，通过`.then(function(displays){})`取得当前使用的VR实例列表。
```
let vrDisplay;
navigator.getVRDisplays().then(displays => {
  if (displays.length > 0) {
    vrDisplay = displays[0];
    console.log('Display found',vrDisplay);
    drawVRScene();
  } else {
    console.log('Display not found');
    // 非VR模式下渲染
    // drawScene();
  }
});
```
##### 二、WebGL初始化
WebGL程序初始化一般分为这几个步骤：编译顶点、片元着色器程序→创建顶点、纹理缓冲区→ 设置画布被清空时颜色→启动深度测试
```
function drawVRScene() {
  const canvas = document.getElementById('glcanvas');
  // 获取WebGL上下文
  const gl = canvas.getContext('webgl');
  // WebGL初始化
  init(gl); 
  // WebGL渲染
  render(gl);
}
function init(gl) {
  // 预编译着色器程序
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }
  // 创建顶点缓冲
  initVertexBuffers(gl);
  // 创建纹理缓冲
  initTextures(gl,'../assets/texture.jpg');
  gl.clearColor(0.4, 0.4, 0.4, 1.0);
  // 启动深度测试
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
}    
```
###### GLSL着色器程序
顶点着色器要做的工作是将Js输入的顶点坐标、模型-视图-投影矩阵进行逐顶点运算。
```
const VSHADER_SOURCE = `
attribute vec4 a_Position;
uniform mat4 u_MvpMatrix;
attribute vec2 a_TexCoord;
varying highp vec2 v_TexCoord;
void main() {
    gl_Position = u_MvpMatrix * a_Position;
    v_TexCoord = a_TexCoord;
}
`;
```
片元着色器主要处理片元颜色，在这里只是将纹理坐标和纹理对象传给片元着色器。
```
const FSHADER_SOURCE = `
uniform sampler2D u_Sampler;
varying highp vec2 v_TexCoord;
void main() {
    gl_FragColor = texture2D(u_Sampler,v_TexCoord);
}
`;
```
WebVR前期初始化之后，我们需要创建动画来渲染VR场景。
##### 三、动画渲染
###### 1. requestAnimationFrame创建动画
通过使用vrDisplay实例的`requestAnimationFrame(callback)`，递归执行callback函数。
该方法是`window.requestAnimationFrame`的一个特殊实现，它会优先使用VR设备原生的刷新率而不是浏览器的刷新率，以达到合适的渲染帧频。
```

function render(gl,vrDisplay) {
    // 创建VR帧数据对象
    const frameData = new VRFrameData();
    const u_MvpMatrix = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
    function animate() {
      // TODO
      draw(frameData,u_MvpMatrix);
      // 通过递归的方式，执行绘图函数，产生动画
      vrDisplay.requestAnimationFrame(animate);
    }
    animate();
}
```
我们在启动动画递归之前使用`new VRFrameData()`方法，`VRFrameData`是WebVR提供的帧数据封装对象，是WebVR渲染的关键数据，下文将会介绍如何使用它。


###### 2. VR渲染

###### 2.1 使用[viewport](https://developer.mozilla.org/zh-CN/docs/Web/API/WebGLRenderingContext/viewport)设置双视口

WebGL上下文提供了`viewport`函数，用来指定3d场景在canvas的绘制位置和尺寸。
默认的情况下，WebGL渲染视口为`gl.viewport(0, 0, canvas.width, canvas.height)`。
其中前两个参数代表渲染的起点坐标，后两个参数代表渲染的尺寸，这里通过依次设置左右眼渲染视口，来达到分屏效果。
```
function draw(frameData,u_MvpMatrix) {
  gl.viewport(0, 0, canvas.width * 0.5, canvas.height); // 设置左侧视口
  // TODO
  gl.viewport(canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height); // 设置右侧视口
  // TODO
}
```
左、右侧视口的渲染宽度为`canvas`宽度的`1/2`，左视口起始点为`(0,0)`，右视口的起始点坐标为`(canvas.width * 0.5, 0)`。
###### 2.2 使用[VRFrameData](https://developer.mozilla.org/en-US/docs/Web/API/VRFrameData)动态渲染
前面介绍了WebVR渲染需要根据用户行为动态绘制每一帧场景，具体做法是：
1）通过WebVR API提供的`VRFrameData`实例获取当前帧的视图矩阵和投影矩阵；
2）将视图-投影矩阵传入着色器进行绘制；
3）生成下一帧数据并提交给当前canvas；
4）进入下一帧回调。
具体代码如下
```
function draw(gl,frameData,u_MvpMatrix) {       
  const {
    leftProjectionMatrix,
    leftViewMatrix,
    rightProjectionMatrix,
    rightViewMatrix
  } = frameData; 
  // 初始化模型矩阵，模型-视图-投影矩阵
  let modelMatrix = mat4.create(),
      vpMatrix = mat4.create(),
      mvpMatrix = mat4.create();

  // 将左眼视图渲染到画布的左侧
  gl.viewport(0, 0, canvas.width * 0.5, canvas.height);
  // mvpMatrix = ProjectionMatrix × ViewMatrix × modelMatrix
  // 这里使用gl-matrix.js的mat4对象对float32Array进行矩阵操作
  mat4.multiply(vpMatrix,leftProjectionMatrix,leftViewMatrix);
  mat4.multiply(mvpMatrix,vpMatrix,modelMatrix);
  // 将模型-视图-投影矩阵mvpMatrix传入着色器
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix);
  // 左侧绘图
  gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_SHORT, 0);

  // 将右眼视图渲染到画布的右侧
  gl.viewport(canvas.width * 0.5, 0, canvas.width * 0.5, canvas.height);
  mat4.multiply(vpMatrix,rightProjectionMatrix,rightViewMatrix);
  mat4.multiply(mvpMatrix,vpMatrix,modelMatrix);
  gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMatrix);
  gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_SHORT, 0);

  // 生成下一帧数据并覆盖原来的frameData
  vrDisplay.getFrameData(frameData);
  vrDisplay.submitFrame();
}
```
首先，在动画渲染前通过`new VRFrameData()`获得实例`frameData`，并传入动画渲染函数；
接着，在动画函数里获取frameData的属性：

| VRFrameData实例属性 ||
|:-----------|:------------|
| leftProjectionMatrix | 左视口投影矩阵|
| leftViewMatrix | 左视口视图矩阵|
| rightProjectionMatrix | 右视口投影矩阵|
| rightViewMatrix | 右视口视图矩阵|
当然`VRFrameData`还包括`pose`、`orientation`等属性这里就不一一列举了。
根据公式分别计算出左右视口的模型-视图-投影矩阵，传给顶点着色器程序，与顶点缓冲区的顶点坐标相乘绘制出最终顶点。
> MvpMatrix = ProjectionMatrix × ViewMatrix × modelMatrix


最后，在每一帧动画回调结束前，我们调用`vrDisplay.getFrameData(frameData)`来生成下一帧数据并覆盖frameData，并使用`vrDisplay.submitFrame()`将当前帧提交给当前画布渲染。

至此，WebVR的开发流程已基本走完，具体代码可以参考下方demo
![](http://upload-images.jianshu.io/upload_images/1939855-2deb638717d350a5.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
项目代码：[https://github.com/YoneChen/webvr-demo](https://github.com/YoneChen/webvr-demo)

结语：使用原生WebGL开发WebVR应用相比three.js或者aframe代码要复杂很多，不过通过这种方式却能更深入的了解WebVR的工作原理。

想了解three.js开发webvr，可参考[《VR大潮来袭---前端开发能做些什么》](https://zhuanlan.zhihu.com/p/25567905)
也欢迎各位关注我的专栏 [WebVR技术庄园](https://zhuanlan.zhihu.com/c_99472965)，不定期更新~

相关资料：

计算机图形知识：[矩阵变换](http://www.opengl-tutorial.org/cn/beginners-tutorials/tutorial-3-matrices/)

WebGL快速入门：[WebGL 技术储备指南](http://taobaofed.org/blog/2015/12/21/webgl-handbook/)

谷歌开发者 | WebVR：[WebVR基本原理](https://developers.google.com/web/fundamentals/vr/)

MDN | WebVR API：[使用WebVR API](https://developer.mozilla.org/en-US/docs/Web/API/WebVR_API/Using_the_WebVR_API)
