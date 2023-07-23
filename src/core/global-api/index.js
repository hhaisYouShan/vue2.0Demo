/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend' 
import { initAssetRegisters } from './assets' 
import { set, del } from '../observer/index' 
import { ASSET_TYPES } from 'shared/constants' 
import builtInComponents from '../components/index' 
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'
/**
 * 初始化Vue的全局API,比如
 * 默认配置 vue.config
 * 工具类方法 vue.util.xxx
 * vue.set vue.delete vue.nextTick vue.observable
 * vue.options.components vue.options.directives vue.options.filters vue.options._base
 * vue.use vue.extend vue.mixin vue.component vue.directives vue.filter
 * 
 */
export function initGlobalAPI(Vue: GlobalAPI) {
  // config
  const configDef = {}
  // Vue 的众多默认配置项
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  //Vue.config
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  /**
   * 暴露一些工具方法，轻易不要使用这些工具方法，除非你很清楚这些工具方法，以及知道使用的风险
   */
  Vue.util = {
    // 警告日志
    warn,
    // 类似选项合并
    extend,
    // 合并选项
    mergeOptions,
    // 设置响应式
    defineReactive
  }

  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  // Vue.observable = < T > (obj: T): T => {
  //   observe(obj)
  //   return obj
  // }

 // 响应式方法
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach( type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.

  // Vue.options.components/directives/filter
  Vue.options._base = Vue

  extend(Vue.options.components, builtInComponents)
  // Vue.use
  initUse(Vue)
   // Vue.mixin
  initMixin(Vue)
   // Vue.extent
  initExtend(Vue)
   // Vue.component/directive/filter
  initAssetRegisters(Vue)
}
