/* @flow */
//render 函数转化成虚拟 dom 核心方法 _render

import {
	warn,
	nextTick,
	emptyObject,
	handleError,
	defineReactive
} from '../util/index'

import { createElement } from '../vdom/create-element'
import { installRenderHelpers } from './render-helpers/index'
import { resolveSlots } from './render-helpers/resolve-slots'
import { normalizeScopedSlots } from '../vdom/helpers/normalize-scoped-slots'
import VNode, { createEmptyVNode } from '../vdom/vnode'

import { isUpdatingChildComponent } from './lifecycle'
/*
 * 初始化渲染
 *
 */
export function initRender(vm: Component) {
	vm._vnode = null // the root of the child tree  上一个 vonde
	vm._staticTrees = null // v-once cached trees v-once缓存的树
	const options = vm.$options //获取参数
	const parentVnode = vm.$vnode = options._parentVnode // the placeholder node in parent tree 父树中的占位符节点
	const renderContext = parentVnode && parentVnode.context // this 上下文
	//判断children 有没有分发式插槽 并且过滤掉空的插槽,并且收集插槽
	vm.$slots = resolveSlots(options._renderChildren, renderContext)
	vm.$scopedSlots = emptyObject
	// bind the createElement fn to this instance
	// so that we get proper render context inside it.
	// args order: tag, data, children, normalizationType, alwaysNormalize
	// internal version is used by render functions compiled from templates
	//将createElement fn绑定到这个实例
	//这样我们就得到了合适的渲染上下文。
	// args order: tag, data, children, normalizationType, alwaysNormalize
	//内部版本由模板编译的呈现函数使用
	//创建虚拟dom的数据结构
	//这就是render(h)里面的 h 虚拟dom 入口点
	vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false) // 系统创建元素的方法
	// normalization is always applied for the public version, used in
	//的公共版本总是应用规范化
	// user-written render functions.
	//用户编写的渲染功能。
	vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true) // 用户提供了render属性时 创建元素的方法

	// $attrs & $listeners are exposed for easier HOC creation.
	// they need to be reactive so that HOCs using them are always updated
	// $attrs和$listener将被公开，以便更容易地进行临时创建。
	//它们需要是反应性的，以便使用它们的HOCs总是更新的
	const parentData = parentVnode && parentVnode.data

	/* istanbul ignore else */
	if (process.env.NODE_ENV !== 'production') {
		defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, () => {
			!isUpdatingChildComponent && warn(`$attrs is readonly.`, vm)
		}, true)
		defineReactive(vm, '$listeners', options._parentListeners || emptyObject, () => {
			!isUpdatingChildComponent && warn(`$listeners is readonly.`, vm)
		}, true)
	} else {
		// 通过defineProperty的set方法去通知notify()订阅者subscribers有新的值修改
		defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, null, true)
		defineReactive(vm, '$listeners', options._parentListeners || emptyObject, null, true)
	}
}

export let currentRenderingInstance: Component | null = null

// for testing only
export function setCurrentRenderingInstance(vm: Component) {
	currentRenderingInstance = vm
}

export function renderMixin(Vue: Class<Component>) {
	// install runtime convenience helpers
	// 安装渲染助手
	installRenderHelpers(Vue.prototype)

	Vue.prototype.$nextTick = function (fn: Function) {
		// 为callbacks 收集队列cb 函数 并且根据 pending 状态是否要触发callbacks 队列函数
		return nextTick(fn, this)
	}
	// 渲染函数
	Vue.prototype._render = function (): VNode {
		const vm: Component = this
		// 获取模板编译生成的render方法
		/*
			render 是  虚拟dom，需要执行的编译函数 类似于这样的函数
			(function anonymous( ) {
									with(this){return _c('div',{attrs:{"id":"app"}},[_c('input',{directives:[{name:"info",rawName:"v-info"},{name:"data",rawName:"v-data"}],attrs:{"type":"text"}}),_v(" "),_m(0)])}
			})
			*/
		const { render, _parentVnode } = vm.$options
		// 判断是否有parentVnode
		if (_parentVnode) {
			// data.scopedSlots = {default: children[0]};  //获取插槽
			vm.$scopedSlots = normalizeScopedSlots(
				_parentVnode.data.scopedSlots,
				vm.$slots,
				vm.$scopedSlots
			)
		}

		// set parent vnode. this allows render functions to have access
		// 设置父vnode。这允许呈现函数具有访问权限
		// to the data on the placeholder node.
		// 到占位符节点上的数据。

		//把父层的Vnode 赋值的到$vnode
		vm.$vnode = _parentVnode
		// render self
		let vnode
		try {
			// There's no need to maintain a stack because all render fns are called
			// separately from one another. Nested component's render fns are called
			// when parent component is patched.

			// 无需维护堆栈，因为所有渲染 fn 都是彼此分开调用的。嵌套组件的渲染 fns 在修补父组件时调用。

			//创建一个空的组件
			// vm.$options.render = createEmptyVNode;
			//_renderProxy 代理拦截
			/*
			 render 是  虚拟dom，需要执行的编译函数 类似于这样的函数
			 (function anonymous(
			 ) {

									with(this){return _c('div',{attrs:{"id":"app"}},[_c('input',{directives:[{name:"info",rawName:"v-info"},{name:"data",rawName:"v-data"}],attrs:{"type":"text"}}),_v(" "),_m(0),_v(" "),_c('div',[_v("\n        "+_s(message)+"\n    ")])])}
			 })
			 */
			currentRenderingInstance = vm
			// 生成vnode--虚拟dom
			vnode = render.call(
				vm._renderProxy,  //this指向 其实就是vm
				vm.$createElement //这里虽然传参进去但是没有接收参数
			)
		} catch (e) {
			//收集错误信息 并抛出
			handleError(e, vm, `render`)
			// return error render result,
			// or previous vnode to prevent render error causing blank component
			//返回错误渲染结果，
			//或以前的vnode，以防止渲染错误导致空白组件
			/* istanbul ignore else */
			if (process.env.NODE_ENV !== 'production' && vm.$options.renderError) {
				try {
					vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e)
				} catch (e) {
					handleError(e, vm, `renderError`)
					vnode = vm._vnode
				}
			} else {

				vnode = vm._vnode
			}
		} finally {
			currentRenderingInstance = null
		}
		// if the returned array contains only a single node, allow it
		if (Array.isArray(vnode) && vnode.length === 1) {
			vnode = vnode[0]
		}
		// return empty vnode in case the render function errored out
		if (!(vnode instanceof VNode)) {
			if (process.env.NODE_ENV !== 'production' && Array.isArray(vnode)) {
				warn(
					'Multiple root nodes returned from render function. Render function ' +
					'should return a single root node.',
					vm
				)
			}
			//创建一个节点 为注释节点 空的vnode
			vnode = createEmptyVNode()
		}
		// set parent
		vnode.parent = _parentVnode  //设置父vnode
		return vnode
	}
}
