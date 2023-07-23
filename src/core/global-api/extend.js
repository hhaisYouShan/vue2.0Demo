/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { defineComputed, proxy } from '../instance/state'
import { extend, mergeOptions, validateComponentName } from '../util/index'

export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   */

  /**
   * 基于Vue扩展子类，该子类同样支持进一步的扩展
   * 扩展时可以传递一些默认配置，就像Vue也会有一些默认配置
   * 默认配置如果和基类有冲突则会进行合并选项（mergeOptions）
   * @param {*} extendOptions 
   * @returns 
   */
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    const Super = this
    const SuperId = Super.cid
    /**
     * 利用缓存，如果存在则直接返回缓存中的构造函数
     *  什么情况下可以利用到这个缓存？
     * 即当你在多次调用Vue.extend 时 使用了同一个配置项（extendOptions）,这时就会启用该缓存
     */
    const cachedCtors = extendOptions._Ctor || (extendOptions._Ctor = {})
    if (cachedCtors[SuperId]) {
      return cachedCtors[SuperId]
    }

    const name = extendOptions.name || Super.options.name
    if (process.env.NODE_ENV !== 'production' && name) {
      validateComponentName(name)
    }
    //创建了一个vueComponent类
    //Sub vue子类 和Vue 构造函数一样
    const Sub = function VueComponent (options) {
      // 初始化
      this._init(options)
    }
    //继承于Vue类 原型继承
    Sub.prototype = Object.create(Super.prototype)
    Sub.prototype.constructor = Sub
    Sub.cid = cid++
    // 选项合并， 合并Vue的配置项到自己的配置项上来
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    // 记录自己的基类
    Sub['super'] = Super

    // For props and computed properties, we define the proxy getters on
    // the Vue instances at extension time, on the extended prototype. This
    // avoids Object.defineProperty calls for each instance created.
    
    // 初始化props，将props配置代理到Sub.prototype._props 对象上
    // 在组件内通过 this._props方式可以访问
    if (Sub.options.props) {
      initProps(Sub)
    }
    // 初始化 computed,将computed 配置代理到Sub.prototype对象上
    // 在组件内可以通过 this.computedKey的方式访问
    if (Sub.options.computed) {
      initComputed(Sub)
    }

    // allow further extension/mixin/plugin usage
    // 定义 extend、mixin、use 这三个静态方法，允许在Sub基础上再进一步构造子类
    Sub.extend = Super.extend
    Sub.mixin = Super.mixin
    Sub.use = Super.use

    // create asset registers, so extended classes
    // can have their private assets too.
    // 定义 component、filter、directive 三个静态方法
    ASSET_TYPES.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    // 递归组件的原理，如果组件设置了name属性，则将自己注册到自己的components 选项中
    if (name) {
      Sub.options.components[name] = Sub
    }

    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    
    // 在扩展时保留对基类选项的引用
    // 稍后在实例化时，我们可以检查Super的选项是否具有更新
    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    Sub.sealedOptions = extend({}, Sub.options)

    // cache constructor
    // 缓存
    cachedCtors[SuperId] = Sub
    return Sub
  }
}

function initProps (Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}

function initComputed (Comp) {
  const computed = Comp.options.computed
  for (const key in computed) {
    defineComputed(Comp.prototype, key, computed[key])
  }
}
