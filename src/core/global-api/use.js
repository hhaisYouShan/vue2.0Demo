/* @flow */

import {
  toArray
} from '../util/index'

/*
 * 定义Vue.use  负责为Vue安装插件，做了以下两件事
 *  1.判断是否已经安装过了
 *  2.安装插件执行install 方法
 */
export function initUse(Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    // 限制了自定义组建的类型 已经安装过的插件列表
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    // 保存注册组件的数组，不存在及创建
    if (installedPlugins.indexOf(plugin) > -1) {
      // 判断该组件是否注册过，存在return Vue对象
      return this
    }

    // additional parameters
    // 调用`toArray`方法
    // 将Vue 构造函数放在第一个参数位置 然后将这些参数传递给install 方法
    const args = toArray(arguments, 1) // 这啥意思
    args.unshift(this)
    //将Vue对象拼接到数组头部
    if (typeof plugin.install === 'function') {
      //plugin是对象，且提供install方法，调用install方法将参数数组传入，改变`this`指针为该组件
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      //plugin是函数，这直接调用，安装插件 但是此时的`this`指针只想为`null` 
      plugin.apply(null, args)
    }
    //在保存注册组件的数组中添加 即在插件列表中 添加新安装的插件
    installedPlugins.push(plugin)
    return this
  }
}
