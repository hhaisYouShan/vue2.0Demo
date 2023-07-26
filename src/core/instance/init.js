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
/**
 * 初始化vue
 * @param {*} Vue  vue的构造函数
 */
export function initMixin(Vue: Class<Component>) {
	//Vue 原型添加了方法 初始化函数
	Vue.prototype._init = function (options?: Object) {
		console.log("Vue", Vue)
		//vue 实例
		const vm: Component = this
		// a uid
		// 唯一biao shi
		// 每个 vue 实例都有一个 _uid，并且是依次递增的
		vm._uid = uid++

		let startTag, endTag  // 测试性能
		/* istanbul ignore if */
		// 看见这个  想到测试
		if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
			startTag = `vue-perf-start:${vm._uid}`
			endTag = `vue-perf-end:${vm._uid}`
			mark(startTag)
		}

		// a flag to avoid this being observed  一个避免被观察到的标志
		vm._isVue = true

		// merge options
		// 合并选项
		if (options && options._isComponent) {
			// optimize internal component instantiation // 优化内部组件实例化
			// since dynamic options merging is pretty slow, and none of the
			// internal component options needs special treatment.  由于动态选项合并非常慢，并且没有一个内部组件选项需要特殊处理。

			// 初始化内部组件 针对组件
			/**
			* 每个子组件初始化时走这里，这里只做了一些性能优化
			* 将组件配置对象上的一些深层次属性放到 vm.$options 选项中，以提高代码的执行效率
			*/
			initInternalComponent(vm, options)
		} else {
			//根实例
			/**
			* 初始化根组件时走这里，合并 Vue 的全局配置到根组件的局部配置，比如 Vue.component 注册的全局组件会合并到 根实例的 components 选项中
			* 至于每个子组件的选项合并则发生在两个地方：
			*   1、Vue.component 方法注册的全局组件在注册时做了选项合并
			*   2、{ components: { xx } } 方式注册的局部组件在执行编译器生成的 render 函数时做了选项合并，包括根组件中的 components 配置
			*/
			vm.$options = mergeOptions(
				resolveConstructorOptions(vm.constructor),
				options || {},
				vm
			)
		}
		/* istanbul ignore else */
		if (process.env.NODE_ENV !== 'production') {
			// 设置代理，将 vm 实例上的属性代理到 vm._renderProxy
			initProxy(vm)
		} else {
			vm._renderProxy = vm
		}
		// expose real self
		vm._self = vm // _self 啥意思 
		// 初始化组件实例关系属性，比如 $parent、$children、$root、$refs 等
		initLifecycle(vm) // $parent,$root,$children,$refs 初始化       初始化生命周期的 一些状态变量
		/**
		* 初始化自定义事件，这里需要注意一点，所以我们在 <comp @click="handleClick" /> 上注册的事件，监听者不是父组件，
		* 而是子组件本身，也就是说事件的派发和监听者都是子组件本身，和父组件无关
		*/
		initEvents(vm) // 事件监听：处理父组件传递的监听器                  初始化事件的 容器
		// 解析组件的插槽信息，得到 vm.$slot，处理渲染函数，得到 vm.$createElement 方法，即 h 函数
		initRender(vm) // $slots,$scopedSlots,_c,$createElement         初始化渲染标记用到的变量
		callHook(vm, 'beforeCreate')                 //                 调用生命周期函数
		// 初始化组件的 inject 配置项，得到 result[key] = val 形式的配置对象，然后对结果数据进行响应式处理，并代理每个 key 到 vm 实例
		initInjections(vm) // resolve injections before data/props      获取注入数据  
		// 数据响应式的重点，处理 props、methods、data、computed、watch
		initState(vm)  // 初始化props，methods，data，computed，watch     初始化状态数据  响应式
		// 解析组件配置项上的 provide 对象，将其挂载到 vm._provided 属性上
		initProvide(vm) // resolve provide after data/props             提供数据注入 
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

/**
 * 初始化内部组件 
 * 
 * @param {*} vm  vue实列    
 * @param {*} options  选项参数
 */
export function initInternalComponent(vm: Component, options: InternalComponentOptions) {
	const opts = vm.$options = Object.create(vm.constructor.options) //vm的参数
	// doing this because it's faster than dynamic enumeration.   这样做是因为它比动态枚举快。
	// var options = {
	//     _isComponent: true, //是否是组件
	//     parent: parent, //组件的父节点
	//     _parentVnode: vnode, //组件的 虚拟vonde 父节点
	//     _parentElm: parentElm || null, //父节点的dom el
	//     _refElm: refElm || null //当前节点 el
	// }
	const parentVnode = options._parentVnode
	opts.parent = options.parent  // 组件的父节点
	opts._parentVnode = parentVnode //组件的 虚拟vonde 父节点

	const vnodeComponentOptions = parentVnode.componentOptions  //组件参数
	opts.propsData = vnodeComponentOptions.propsData  //组件数据
	opts._parentListeners = vnodeComponentOptions.listeners   //组件 事件
	opts._renderChildren = vnodeComponentOptions.children  //组件子节点
	opts._componentTag = vnodeComponentOptions.tag //组件的标签
	// 渲染函数
	if (options.render) {
		opts.render = options.render // 渲染函数
		opts.staticRenderFns = options.staticRenderFns  // 静态渲染函数
	}
}

/**
 * 从组件构造函数中解析配置对象 options，并合并基类选项
 * @param {*} Ctor 
 * @returns 
 */
export function resolveConstructorOptions(Ctor: Class<Component>) {
	// 配置项目
	let options = Ctor.options

	if (Ctor.super) {
		// 存在基类，递归解析基类构造函数的选项
		const superOptions = resolveConstructorOptions(Ctor.super)
		const cachedSuperOptions = Ctor.superOptions
		if (superOptions !== cachedSuperOptions) {
			// super option changed,
			// need to resolve new options.
			// 说明基类构造函数选项已经发生改变，需要重新设置
			Ctor.superOptions = superOptions
			// check if there are any late-modified/attached options (#4976)
			// 检查 Ctor.options 上是否有任何后期修改/附加的选项（＃4976）
			const modifiedOptions = resolveModifiedOptions(Ctor)
			// update base extend options
			// 如果存在被修改或增加的选项，则合并两个选项
			if (modifiedOptions) {
				extend(Ctor.extendOptions, modifiedOptions)
			}
			// 选项合并，将合并结果赋值为 Ctor.options
			options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
			if (options.name) {
				options.components[options.name] = Ctor
			}
		}
	}
	return options
}
/**
 * 解析构造函数选项中后续被修改或者增加的选项
 */
function resolveModifiedOptions(Ctor: Class<Component>): ?Object {
	let modified
	// 构造函数选项
	const latest = Ctor.options
	// 密封的构造函数选项，备份
	const sealed = Ctor.sealedOptions
	// 对比两个选项，记录不一致的选项
	for (const key in latest) {
		if (latest[key] !== sealed[key]) {
			if (!modified) modified = {}
			modified[key] = latest[key]
		}
	}
	return modified
}
