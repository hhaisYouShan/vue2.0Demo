
01-Vue2 源码目录结构 （工程代码在src目录下，该目录下有6个目录）

*  compiler #编译相关
* core #核心代码
* plateform #不同平台的支持
*  server #服务端渲染
*  sfc #.vue文件的解析
*  shared #共享代码


02-vue2 dist 输出文字说明
* cjs webpack 1 ,browserfiry
* esm webpack2+
* umd 兼容cjs和amd
* runtime 仅包含运行时
* 内部的数据使用下划线 开头, 只读数据使用 $ 开头

03-环境安装
* 安装依赖 npm i
* 安装rollup npm i rollup -g (全局安装) (作用是在 sources 中看见源码文件)
* 修改下dev 脚本 （"dev": "rollup -w -c scripts/config.js --sourcemap --environment TARGET:web-full-dev",）
* 执行dev文件
* 创建测试文件 引入vue.js

04-入口文件

src/platforms/web/entry-runtime-with-compiler.js
核心作用：
    扩展了$mount方法：处理template和el选项，尝试编译它们为render函数

src/platforms/web/runtime/index.js
核心作用：
    定义了$mount方法，执行挂载了mountComponent(this, el, hydrating)
    实现了patch方法

src/core/index.js
    定义全局api

src/core/global-api/index.js

```
initUse(Vue)
initMixin(Vue)
initExtend(Vue)
initAssetRegisters(Vue)
```

src/core/instance/index.js
构造函数的定义点

```
function Vue (options) {
    this._init(options)
}
initMixin(Vue) // 实现init函数
stateMixin(Vue) // 状态相关api $data,$props,$set,$delete,$watch
eventsMixin(Vue) // 事件相关api $on,$once,$off,$emit
lifecycleMixin(Vue) // 生命周期api _update,$forceUpdate,$destroy
renderMixin(Vue) // 渲染api _render,$nextTick
```

src/core/instance/init.js

```
vm._self = vm
initLifecycle(vm) // $parent,$root,$children,$refs 初始化
initEvents(vm) // 事件监听：处理父组件传递的监听器
initRender(vm) // $slots,$scopedSlots,_c,$createElement
callHook(vm, 'beforeCreate') //生命周期的钩子
initInjections(vm) // resolve injections before data/props 获取注入数据 data
initState(vm) // 初始化props，methods，data，computed，watch
initProvide(vm) // resolve provide after data/props // 提供数据注入
callHook(vm, 'created')
```
05-数据响应式

src/core/instance/state.js
数据初始化

initData()
调用observe()

observe()
返回一个Observe对象实例

src/core/observer/index.js
判断数据对象类型，做响应化处理

defineReactive
给data中每一个key定义数据劫持

src/core/observer/dep.js
维护若干watcher

src/core/observer/watcher.js


src/core/observer/array.js
数组响应化处理






