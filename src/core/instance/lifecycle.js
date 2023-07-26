/* @flow */

import config from '../config'
import Watcher from '../observer/watcher'
import { mark, measure } from '../util/perf'
import { createEmptyVNode } from '../vdom/vnode'
import { updateComponentListeners } from './events'
import { resolveSlots } from './render-helpers/resolve-slots'
import { toggleObserving } from '../observer/index'
import { pushTarget, popTarget } from '../observer/dep'

import {
  warn,
  noop,
  remove,
  emptyObject,
  validateProp,
  invokeWithErrorHandling
} from '../util/index'

export let activeInstance: any = null
export let isUpdatingChildComponent: boolean = false

export function setActiveInstance(vm: Component) {
  const prevActiveInstance = activeInstance
  activeInstance = vm
  return () => {
    activeInstance = prevActiveInstance
  }
}
//初始化
export function initLifecycle(vm: Component) {

  const options = vm.$options
  // console.log("optionsoptionsoptions",options)

  // locate first non-abstract parent
  // 定位第一个非抽象父节点
  let parent = options.parent
  if (parent && !options.abstract) {
    //判断parent父亲节点是否存在，并且判断抽象节点是否存在
    while (parent.$options.abstract && parent.$parent) {
      //如果有父亲抽象节点，则把父层或爷爷节点   给当前节点的父亲节点
      parent = parent.$parent
    }
    // 将当前组件的实例加入到父组件中
    parent.$children.push(vm)
  }
  //添加$parent 参数
  vm.$parent = parent
  //判断parent 是否是顶层 root 如果是 则$root赋值给$root
  vm.$root = parent ? parent.$root : vm

  // 初始化数据 $只读   _ 可读 可写
  vm.$children = []  // 情况 $children 节点
  vm.$refs = {} //获取节点的key

  vm._watcher = null //观察者
  vm._inactive = null  //禁用的组件状态标志
  vm._directInactive = false  // 不活跃 禁用的组件标志
  vm._isMounted = false //标志是否 触发过 钩子Mounted
  vm._isDestroyed = false  //是否已经销毁的组件标志
  vm._isBeingDestroyed = false  //是否已经销毁的组件标志 如果为true 则不触发 beforeDestroy 钩子函数 和destroyed 钩子函数
}
//初始化vue 更新 销毁 函数
export function lifecycleMixin(Vue: Class<Component>) {

  //更新数据函数
  Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
    const vm: Component = this
    const prevEl = vm.$el   //获取 vue 的el节点
    //vue 的标准 vnode
    const prevVnode = vm._vnode //标志上一个 vonde
    const restoreActiveInstance = setActiveInstance(vm)
    vm._vnode = vnode
    // Vue.prototype.__patch__ is injected in entry points   注入入口点
    // based on the rendering backend used. 基于所使用的呈现后端
    //如果这个prevVnode不存在表示上一次没有创建过vnode，这个组件或者new Vue 是第一次进来
    if (!prevVnode) {
      // initial render   起始指令
      // 创建dmo 虚拟dom

      vm.$el = vm.__patch__(
        vm.$el, //真正的dom
        vnode,  //vnode
        hydrating,  // 空
        false /* removeOnly */)
    } else {//如果这个prevVnode存在，表示vno的已经创建过，只是更新数据而已
      // updates 更新  上一个旧的节点prevVnode 更新虚拟dom
      vm.$el = vm.__patch__(prevVnode, vnode)
    }
    restoreActiveInstance()
    // update __vue__ reference
    if (prevEl) {
      prevEl.__vue__ = null
    }
    if (vm.$el) {  //更新 __vue__
      vm.$el.__vue__ = vm
    }
    // if parent is an HOC, update its $el as well
    // 如果parent是一个HOC，那么也要更新它的$el
    if (vm.$vnode && vm.$parent && vm.$vnode === vm.$parent._vnode) {
      vm.$parent.$el = vm.$el
    }
    // updated hook is called by the scheduler to ensure that children are
    // 调度器调用update hook以确保子节点是
    // updated in a parent's updated hook.
    // 在父类的更新钩子中更新.
  }
  // 更新数据 观察者数据
  Vue.prototype.$forceUpdate = function () {
    const vm: Component = this
    // 如果_watcher 观察者在就更新数据
    if (vm._watcher) {
      vm._watcher.update() //更新观察者数据
    }
  }
  //销毁组建周期函数
  Vue.prototype.$destroy = function () {
    const vm: Component = this
    //如果是已经销毁过则不会再执行
    if (vm._isBeingDestroyed) {
      return
    }
    //触发生命周期beforeDestroy 钩子函数
    callHook(vm, 'beforeDestroy')
    vm._isBeingDestroyed = true
    // remove self from parent
    // 从父节点移除self
    const parent = vm.$parent
    // 删除父节点
    if (parent && !parent._isBeingDestroyed && !vm.$options.abstract) {
      remove(parent.$children, vm)
    }
    // teardown watchers  拆卸观察者
    if (vm._watcher) {
      vm._watcher.teardown()
    }
    //获取观察者的长度
    let i = vm._watchers.length
    while (i--) {
      vm._watchers[i].teardown()
    }
    // remove reference from data ob
    // 从数据ob中删除引用
    // frozen object may not have observer.
    // 被冻结的对象可能没有观察者。
    if (vm._data.__ob__) {
      vm._data.__ob__.vmCount--
    }
    // call the last hook...
    // 调用最后一个钩子…
    vm._isDestroyed = true
    // invoke destroy hooks on current rendered tree
    // 调用当前渲染树上的销毁钩子
    vm.__patch__(vm._vnode, null)
    // fire destroyed hook
    // 销毁组建
    callHook(vm, 'destroyed')
    // turn off all instance listeners.
    //销毁事件监听器
    vm.$off()
    // remove __vue__ reference
    //删除vue 参数
    if (vm.$el) {
      vm.$el.__vue__ = null
    }
    // release circular reference (#6759)
    //释放循环引用 销毁父节点
    if (vm.$vnode) {
      vm.$vnode.parent = null
    }
  }
}

// 组件挂载核心方法 

// 1.调用render 方法产生虚拟DOM
// 2.根据虚拟DOM 产生真实DOM
// 3.插入el元素中
export function mountComponent(
  vm: Component, //vnode
  el: ?Element, //dom
  hydrating?: boolean
): Component {
  // 上一步模板编译解析生成了render函数
  // 下一步就是执行vm._render()方法 调用生成的render函数 生成虚拟dom
  // 最后使用vm._update()方法把虚拟dom渲染到页面

  // 真实的el选项赋值给实例的$el属性 为之后虚拟dom产生的新的dom替换老的dom做铺垫
  vm.$el = el
  //如果参数中没有渲染
  if (!vm.$options.render) { //实例化vm的渲染函数，虚拟dom调用参数的渲染函数
    //创建一个空的组件
    vm.$options.render = createEmptyVNode
    if (process.env.NODE_ENV !== 'production') {
      /* istanbul ignore if */
      //如果参数中的模板第一个不为# 号则会 警告
      if ((vm.$options.template && vm.$options.template.charAt(0) !== '#') ||
        vm.$options.el || el) {
        warn(
          'You are using the runtime-only build of Vue where the template ' +
          'compiler is not available. Either pre-compile the templates into ' +
          'render functions, or use the compiler-included build.',
          vm
        )
      } else {
        warn(
          'Failed to mount component: template or render function not defined.',
          vm
        )
      }
    }
  }
  //执行生命周期函数 beforeMount
  callHook(vm, 'beforeMount')
  //更新组件
  let updateComponent
  /* istanbul ignore if */
  //如果开发环境
  if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
    updateComponent = () => {
      const name = vm._name
      const id = vm._uid
      const startTag = `vue-perf-start:${id}`
      const endTag = `vue-perf-end:${id}`

      mark(startTag) //插入一个名称 并且记录插入名称的时间
      const vnode = vm._render()
      mark(endTag)
      measure(`vue ${name} render`, startTag, endTag)

      mark(startTag) //浏览器 性能时间戳监听
      //更新组件
      vm._update(vnode, hydrating)
      mark(endTag)
      measure(`vue ${name} patch`, startTag, endTag)
    }
  } else {
    // 用户$mount()时，定义updateComponent
    updateComponent = () => {
      // _update和._render方法都是挂载在Vue原型的方法  类似_init
      //直接更新view试图
      vm._update(
        /*
           render 是  虚拟dom，需要执行的编译函数 类似于这样的函数
           (function anonymous( ) {
           with(this){return _c('div',{attrs:{"id":"app"}},[_c('input',{directives:[{name:"info",rawName:"v-info"},{name:"data",rawName:"v-data"}],attrs:{"type":"text"}}),_v(" "),_m(0)])}
           })
           */
        vm._render(),//先执行_render,返回vnode
        hydrating)
    }
  }

  // we set this to vm._watcher inside the watcher's constructor
  // since the watcher's initial patch may call $forceUpdate (e.g. inside child
  // component's mounted hook), which relies on vm._watcher being already defined
  // 我们将其设置为vm。在观察者的构造函数中
  // 因为观察者的初始补丁可能调用$forceUpdate(例如inside child)
  // 组件的挂载钩子)，它依赖于vm。_watcher已经定义
  // 创建观察者

  // 了解 组件，Watcher,渲染函数和更新函数之间的关系
  new Watcher(
    vm,  //vm vode
    updateComponent,  //数据绑定完之后回调该函数。更新组件函数 更新 view试图
    noop,//回调函数
    {
      before() {
        if (vm._isMounted && !vm._isDestroyed) {
          callHook(vm, 'beforeUpdate')
        }
      }
    }, true /* isRenderWatcher */)
  hydrating = false

  // manually mounted instance, call mounted on self
  // mounted is called for render-created child components in its inserted hook
  //手动挂载实例，调用挂载在self上
  // 在插入的钩子中为呈现器创建的子组件调用// mount
  if (vm.$vnode == null) {
    vm._isMounted = true
    //执行生命周期函数mounted
    callHook(vm, 'mounted')
  }
  return vm
}

//更新子组件 循环props 把他们添加到观察者中 ，更新事件
export function updateChildComponent(
  vm: Component, // 虚拟dom vonde
  propsData: ?Object,  //props 数据属性
  listeners: ?Object, //事件
  parentVnode: MountedComponentVNode, //父亲 虚拟dom vonde
  renderChildren: ?Array<VNode>  //子节点
) {
  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = true //标志 是否已经更新过了子组件
  }

  // determine whether component has slot children
  // we need to do this before overwriting $options._renderChildren.
  // 确定组件是否具有插槽子项
  // 我们需要在覆盖$options._renderChildren之前执行此操作。

  // check if there are dynamic scopedSlots (hand-written or compiled but with
  // dynamic slot names). Static scoped slots compiled from template has the
  // "$stable" marker.
  // 检查是否有动态作用域槽（手写或编译，但具有动态槽名）。从模板编译的静态范围槽具有“$stable”标记

  const newScopedSlots = parentVnode.data.scopedSlots
  const oldScopedSlots = vm.$scopedSlots
  const hasDynamicScopedSlot = !!(
    (newScopedSlots && !newScopedSlots.$stable) ||
    (oldScopedSlots !== emptyObject && !oldScopedSlots.$stable) ||
    (newScopedSlots && vm.$scopedSlots.$key !== newScopedSlots.$key)
  )

  // Any static slot children from the parent may have changed during parent's
  // update. Dynamic scoped slots may also have changed. In such cases, a forced
  // update is necessary to ensure correctness.
  // 父级的任何静态插槽子级可能在父级更新期间已更改。
  // 动态作用域槽也可能已更改。
  // 在这种情况下，必须强制更新以确保正确性。
  const needsForceUpdate = !!(
    renderChildren || // has new static slots
    vm.$options._renderChildren || // has old static slots
    hasDynamicScopedSlot
  )

  vm.$options._parentVnode = parentVnode  //父亲 虚拟dom vonde
  vm.$vnode = parentVnode // update vm's placeholder node without re-render 无需重新渲染即可更新vm的占位符节点

  if (vm._vnode) { // update child tree's parent  更新子树的父树
    vm._vnode.parent = parentVnode
  }
  vm.$options._renderChildren = renderChildren //子节点

  // update $attrs and $listeners hash
  // these are also reactive so they may trigger child update if the child
  // used them during render
  // 更新$attrs和$listener散列
  // 它们也是反应性的，因此如果子进程更新，它们可能触发子进程更新
  // 渲染时使用它们
  vm.$attrs = parentVnode.data.attrs || emptyObject  //虚拟dom的属性
  vm.$listeners = listeners || emptyObject //虚拟dom的 事件

  // update props 更新props 属性
  if (propsData && vm.$options.props) {
    toggleObserving(false) // 标志是否禁止还是添加到观察者模式
    const props = vm._props //获取属性对象
    const propKeys = vm.$options._propKeys || [] // 获取属性的prop的key
    for (let i = 0; i < propKeys.length; i++) { // 循环props属性
      const key = propKeys[i] // 取props 单个 属性的key
      const propOptions: any = vm.$options.props // wtf flow?
      /*
        验证支柱  验证 prosp 是否是规范数据 并且为props 添加 value.__ob__  属性，把prosp添加到观察者中
        *  校验 props 参数 就是组建 定义的props 类型数据，校验类型
        *
        * 判断prop.type的类型是不是Boolean或者String，如果不是他们两类型，调用getPropDefaultValue获取默认值并且把value添加到观察者模式中
        */
      props[key] = validateProp(key, propOptions, propsData, vm)
    }
    toggleObserving(true)
    // keep a copy of raw propsData
    // 保留原始propsData的副本
    vm.$options.propsData = propsData
  }

  // update listeners  更新事件
  listeners = listeners || emptyObject
  const oldListeners = vm.$options._parentListeners //旧的事件
  vm.$options._parentListeners = listeners  //新的事件
  //更新组件事件
  updateComponentListeners(vm, listeners, oldListeners)

  // resolve slots + force update if has children
  //解决插槽+强制更新如果有 子节点
  if (needsForceUpdate) {
    //判断children 有没有分发式插槽 并且过滤掉空的插槽,并且收集插槽
    vm.$slots = resolveSlots(renderChildren, parentVnode.context)
    //更新数据 观察者数据
    vm.$forceUpdate()
  }

  if (process.env.NODE_ENV !== 'production') {
    isUpdatingChildComponent = false
  }
}

//循环父树层 如果有不活跃的则返回真
function isInInactiveTree(vm) {  //活动中的树
  while (vm && (vm = vm.$parent)) { //循环父节点如果父节点有_inactive 则返回true
    if (vm._inactive) {//不活跃
      return true
    }
  }
  return false
}

//判断是否有不活跃的组件 禁用他 如果有活跃组件则触发钩子函数activated
export function activateChildComponent(
  vm: Component,  // 虚拟dom vode
  direct?: boolean //布尔值
) {
  if (direct) {
    vm._directInactive = false
    if (isInInactiveTree(vm)) {//如果有不活跃的树，或者被禁用组件
      return
    }
  } else if (vm._directInactive) { //单个不活跃的
    return
  }
  if (vm._inactive || vm._inactive === null) { //如果 _inactive=true 不活跃组件 或者 vm._inactive === null
    vm._inactive = false
    for (let i = 0; i < vm.$children.length; i++) { //循环禁止子组件
      activateChildComponent(vm.$children[i])  //递归循环 禁用子组件
    }
    callHook(vm, 'activated') //触发activated 生命周期钩子函数
  }
}

// 循环子组件 和父组件  判断是否有禁止的组件 如果有活跃组件则执行生命后期函数deactivated
export function deactivateChildComponent(vm: Component, direct?: boolean) {
  if (direct) {
    vm._directInactive = true
    if (isInInactiveTree(vm)) {
      return
    }
  }
  if (!vm._inactive) {  //如果该组件是活跃的  
    vm._inactive = true  //设置活动中的树
    for (let i = 0; i < vm.$children.length; i++) {
      deactivateChildComponent(vm.$children[i])
    }
    //执行生命周期函数deactivated
    callHook(vm, 'deactivated')
  }
}

//触发钩子函数
export function callHook
  (
    vm: Component, //虚拟dom  vonde
    hook: string //钩子函数的key
  ) {
  // #7573 disable dep collection when invoking lifecycle hooks
  // 调用生命周期钩子时禁用dep集合
  // Dep.target = _target; //存储
  pushTarget()
  //在vm 中添加声明周期函数
  const handlers = vm.$options[hook]
  const info = `${hook} hook`
  if (handlers) { //数组
    for (let i = 0, j = handlers.length; i < j; i++) {
      invokeWithErrorHandling(handlers[i], vm, null, vm, info)
    }
  }
  if (vm._hasHookEvent) {
    vm.$emit('hook:' + hook)
  }
  popTarget()
}
