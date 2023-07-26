/* @flow */

import {
  tip,
  toArray,
  hyphenate,
  formatComponentName,
  invokeWithErrorHandling
} from '../util/index'
import {
  updateListeners
} from '../vdom/helpers/index'

/*
 * 初始化事件
 */
export function initEvents(vm: Component) {
  // console.log("执行了initEvents")
  // 储放各种事件
  vm._events = Object.create(null)
  vm._hasHookEvent = false
  // init parent attached events  初始化 父亲事件

  const listeners = vm.$options._parentListeners // 前提 
  // console.log("，listeners",listeners) 
  if (listeners) {
    //更新组件事件
    updateComponentListeners(vm, listeners)
  }
}

let target: any
/**
  * 添加事件
  * event 添加事件名称
  * fn 函数
  *
  *  */
function add(event, fn) {
  //第一个参数是事件类型，第二个参数是事件的函数
  target.$on(event, fn)
}
//解绑事件
function remove(event, fn) {
  target.$off(event, fn)
}

function createOnceHandler(event, fn) {
  const _target = target
  return function onceHandler() {
    const res = fn.apply(null, arguments)
    if (res !== null) {
      _target.$off(event, onceHandler)
    }
  }
}

//更新组件事件 
export function updateComponentListeners(
  vm: Component,    // 虚拟dom
  listeners: Object,    // 新的数据队列
  oldListeners: ?Object  // 旧的事件数据队列
) {
  target = vm
  //更新数据源 并且为新的值 添加函数 旧的值删除函数等功能
  updateListeners(listeners, oldListeners || {}, add, remove, createOnceHandler, vm)
  target = undefined
}

/*
  初始化事件绑定方法
  *
  */
export function eventsMixin(Vue: Class<Component>) {
  const hookRE = /^hook:/  //开头是^hook: 的字符串
  /*
     * 添加绑定事件
     * vm._events[event]
     * */
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    //如果事件是数组
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        //绑定事件
        vm.$on(event[i], fn)
      }
    } else {
      //把所有事件拆分存放到_events 数组中
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      //如果是 hook: 开头的标记为vue vue系统内置钩子函数 比如vue 生命周期函数等
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }

  /*
  *  添加事件
  * */
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this

    function on() {
      //解绑事件
      vm.$off(event, on)
      //执行事件
      fn.apply(vm, arguments)
    }
    on.fn = fn
    //添加事件
    vm.$on(event, on)
    return vm
  }


  /*
   *  vue把事件添加到一个数组队列里面，通过删除该数组事件队列，而达到解绑事件
   */
  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // all  如果没有参数的情况下 返回 this vm
    if (!arguments.length) {
      // 创建一个事件对象
      vm._events = Object.create(null)
      return vm
    }
    // array of events 如果事件是数组事件 则循环回调递归
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn)
      }
      return vm
    }
    // specific event 特定的事件 如果事件不存在则返回vm
    const cbs = vm._events[event]
    if (!cbs) {
      return vm
    }
    if (!fn) {
      // 如果函数不存在则清空函数对象属性
      vm._events[event] = null
      return vm
    }
    // specific handler
    //如果函数存在 并且事件cbs是一个数组
    let cb
    let i = cbs.length
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        //清空事件数组
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }

  //触发事件
  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    if (process.env.NODE_ENV !== 'production') {
      const lowerCaseEvent = event.toLowerCase() //转成小写
      //如果事件转成小写之后并不相等以前字符串，并且是不存在_events 事件队列中
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        //然后根据组件追踪发出一个警告
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }
    //获取事件值
    let cbs = vm._events[event]
    if (cbs) {
      //如果长度大于1 将它变成一个真正的数组
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      //将参数变成一个真正数组
      const args = toArray(arguments, 1)
      const info = `event handler for "${event}"`
      //循环事件
      for (let i = 0, l = cbs.length; i < l; i++) {
        // 执行触发事件 错误则发出报错警告
        invokeWithErrorHandling(cbs[i], vm, args, vm, info)
      }
    }
    return vm
  }
}
