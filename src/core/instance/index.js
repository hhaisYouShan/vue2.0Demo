import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// vue 的构造函数
function Vue (options) {
    // 提示
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
 // 构造函数仅执行了_init (初始化)
 // options 一般带有 watcher data el 等对象
  this._init(options)
}

initMixin(Vue)  // 实现init函数 挂载初始化方法（_init）
stateMixin(Vue)  // 状态相关api $data,$props,$set,$delete,$watch    挂载 状态处理方法
eventsMixin(Vue)  // 事件相关api $on,$once,$off,$emit               挂载 事件的方法
// 混入_update
lifecycleMixin(Vue) // 生命周期api _update,$forceUpdate,$destroy    挂载 生命周期方法
// 混入_render
renderMixin(Vue) // 渲染api _render,$nextTick                      挂载与渲染有关的方法

export default Vue
