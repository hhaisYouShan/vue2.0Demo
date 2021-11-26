/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import {
  def
} from '../util/index'

const arrayProto = Array.prototype

export const arrayMethods = Object.create(arrayProto)


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
methodsToPatch.forEach(function (method) {
  // console.log("执行了array 内方法",methodsToPatch)
  // cache original method
  // 数组的原型方法
  const original = arrayProto[method]
  // 添加额外行为
  def(arrayMethods, method, function mutator(...args) {
    // 执行原先的任务
    const result = original.apply(this, args)
    //额外任务 通知更新
    const ob = this.__ob__
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

    if (inserted) ob.observeArray(inserted)
    // notify change
    // 通知更新
    ob.dep.notify()
    return result
  })
})
