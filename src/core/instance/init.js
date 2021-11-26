/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

// Vue的源码中每一个类型的实例 都会有一个 唯一标识 
let uid = 0

export function initMixin (Vue: Class<Component>) {
  //Vue 原型添加了方法
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    // 唯一biao shi
    vm._uid = uid++

    let startTag, endTag  // 测试性能
    /* istanbul ignore if */
    // 看见这个  想到测试
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) { 
      startTag = `vue-perf-start:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    vm._isVue = true
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      
      // 初始化内部组件 针对组件
      initInternalComponent(vm, options)
    } else {
        // 合并
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
    //
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    vm._self = vm
    initLifecycle(vm) // $parent,$root,$children,$refs 初始化       初始化生命周期的 一些状态变量
    initEvents(vm) // 事件监听：处理父组件传递的监听器                  初始化事件的 容器
    initRender(vm) // $slots,$scopedSlots,_c,$createElement         初始化渲染标记用到的变量
    callHook(vm, 'beforeCreate')                        //          调用生命周期函数
    initInjections(vm) // resolve injections before data/props  //  获取注入数据  
    initState(vm)  // 初始化props，methods，data，computed，watch     初始化状态数据
    initProvide(vm) // resolve provide after data/props  // 提供数据注入 
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`vue ${vm._name} init`, startTag, endTag)
    }
    // 如果存在el宿主，则自动执行挂载，不需要手动挂载
    if (vm.$options.el) {
      vm.$mount(vm.$options.el) // 组件挂载 将组件挂载到el描述的元素上
      // 会先调用 扩展的 那个 $mount 方法，生成render
      // 再调用 原始的 $mount 方法  获得元素，再调用mountComponent方法
      // 这两个方法都定义在platforms/web 里面
    }
  }
}

export function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // doing this because it's faster than dynamic enumeration.
  const parentVnode = options._parentVnode
  opts.parent = options.parent
  opts._parentVnode = parentVnode

  const vnodeComponentOptions = parentVnode.componentOptions
  opts.propsData = vnodeComponentOptions.propsData
  opts._parentListeners = vnodeComponentOptions.listeners
  opts._renderChildren = vnodeComponentOptions.children
  opts._componentTag = vnodeComponentOptions.tag

  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}

function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = latest[key]
    }
  }
  return modified
}
