/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */
/**
 * 定义 arrayMethods 对象，用于增强 Array.prototype
 * 当访问 arrayMethods 对象上的那七个方法时会被拦截，以实现数组响应式
 */

import {
  def
} from '../util/index'
// 先保留数组原型
const arrayProto = Array.prototype

// 然后将arrayMethods继承自数组原型
// 这里是面向切片编程思想（AOP）--不破坏封装的前提下，动态的扩展功能
export const arrayMethods = Object.create(arrayProto)

// 操作数组的七个方法，这七个方法可以改变数组自身
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * Intercept mutating methods and emit events
 */
/**
 * 拦截变异方法并触发事件
 */
methodsToPatch.forEach(function (method) {
  // cache original method
  // 数组的原型方法
  // 缓存原生方法，比如 push
  const original = arrayProto[method]
  // 添加额外行为
  // def 就是 Object.defineProperty，拦截 arrayMethods.method 的访问
  def(arrayMethods, method, function mutator(...args) {
    // 执行原先的任务
    // 保留原型方法的执行结果
    const result = original.apply(this, args)
    //额外任务 通知更新
    // this代表的就是数据本身 比如数据是{a:[1,2,3]} 那么我们使用a.push(4) 
    // this就是a  ob就是a.__ob__ 这个属性就是上段代码增加的 代表的是该数据已经被响应式观察过了指向Observer实例
    const ob = this.__ob__
    // 这里的标志就是代表数组有新增操作
    let inserted
    // 以下 三个操作需要额外响应化处理
    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }
  // 如果有新增的元素 inserted是一个数组 调用Observer实例的observeArray对数组每一项进行观测
    if (inserted) ob.observeArray(inserted)
    // notify change
    // 通知更新
    ob.dep.notify()
    // 之后咱们还可以在这里检测到数组改变了之后从而触发视图更新的操作
    return result
  })
})
