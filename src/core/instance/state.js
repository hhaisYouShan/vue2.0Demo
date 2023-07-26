/* @flow */

import config from "../config";
import Watcher from "../observer/watcher";
import Dep, { pushTarget, popTarget } from "../observer/dep";
import { isUpdatingChildComponent } from "./lifecycle";

import {
	set,
	del,
	observe,
	defineReactive,
	toggleObserving,
} from "../observer/index";

import {
	warn,
	bind,
	noop,
	hasOwn,
	hyphenate,
	isReserved,
	handleError,
	nativeWatch,
	validateProp,
	isPlainObject,
	isServerRendering,
	isReservedAttribute,
} from "../util/index";

const sharedPropertyDefinition = {
	enumerable: true,
	configurable: true,
	get: noop,
	set: noop,
};
// 数据代理
export function proxy(target: Object, sourceKey: string, key: string) {
	sharedPropertyDefinition.get = function proxyGetter() {
		return this[sourceKey][key];
	};
	sharedPropertyDefinition.set = function proxySetter(val) {
		this[sourceKey][key] = val;
	};
	Object.defineProperty(target, key, sharedPropertyDefinition);
}

// 初始化状态 注意这里的顺序 比如我经常面试会问到 是否能在data里面直接使用prop的值 为什么？
// 这里初始化的顺序依次是 prop>methods>data>computed>watch
//  其中 computed 中的 key 不能和 props、data 中的 key 重复，methods 不影响
export function initState(vm: Component) {
	vm._watchers = [];
	const opts = vm.$options;
	// 处理 options.props的成员 一般定义组件的时候，用于定义对外的成员，
	// 处理 props 对象，为 props 对象的每个属性设置响应式，并将其代理到 vm 实例上
	if (opts.props) initProps(vm, opts.props);
	// 处理options.methods的成员 处理方法成员
	if (opts.methods) initMethods(vm, opts.methods);
	// data处理 响应化处理
	if (opts.data) {
		initData(vm); // 初始化data
	} else {
		observe((vm._data = {}), true /* asRootData */);
	}
	// 处理options.computed 计算属性
	if (opts.computed) initComputed(vm, opts.computed);
	// 处理options.watch 
	if (opts.watch && opts.watch !== nativeWatch) {
		initWatch(vm, opts.watch);
	}
}
// 处理 props 对象，为 props 对象的每个属性设置响应式，并将其代理到 vm 实例上
function initProps(vm: Component, propsOptions: Object) {
	const propsData = vm.$options.propsData || {};
	const props = (vm._props = {});
	// cache prop keys so that future props updates can iterate using Array
	// instead of dynamic object key enumeration.
	// 缓存 props 的每个 key，性能优化
	const keys = (vm.$options._propKeys = []);
	const isRoot = !vm.$parent;
	// root instance props should be converted
	if (!isRoot) {
		toggleObserving(false);
	}
	// 遍历 props 对象
	for (const key in propsOptions) {
		// 缓存key
		keys.push(key);
		// 获取 props[key] 的默认值
		const value = validateProp(key, propsOptions, propsData, vm);
		/* istanbul ignore else */
		if (process.env.NODE_ENV !== "production") {
			const hyphenatedKey = hyphenate(key);
			if (
				isReservedAttribute(hyphenatedKey) ||
				config.isReservedAttr(hyphenatedKey)
			) {
				warn(
					`"${hyphenatedKey}" is a reserved attribute and cannot be used as component prop.`,
					vm
				);
			}
			defineReactive(props, key, value, () => {
				if (!isRoot && !isUpdatingChildComponent) {
					warn(
						`Avoid mutating a prop directly since the value will be ` +
						`overwritten whenever the parent component re-renders. ` +
						`Instead, use a data or computed property based on the prop's ` +
						`value. Prop being mutated: "${key}"`,
						vm
					);
				}
			});
		} else {
			// 转换为响应式
			defineReactive(props, key, value);
		}
		// static props are already proxied on the component's prototype
		// during Vue.extend(). We only need to proxy props defined at
		// instantiation here.
		if (!(key in vm)) {
			// 将_props 上的成员映射到vue实例上，
			// this._props.key ==> this.key
			proxy(vm, `_props`, key);
		}
	}
	toggleObserving(true);
}

// 初始化data 数据
/**
 * 做了三件事
 *   1、判重处理，data 对象上的属性不能和 props、methods 对象上的属性相同
 *   2、代理 data 对象上的属性到 vm 实例
 *   3、为 data 对象的上数据设置响应式 
 */
function initData(vm: Component) {
	// 得到的对象
	let data = vm.$options.data;
	// 如果data 是函数，则执行之并将结果作为data选项的值  
	// data  实例_data的属性给data
	data = vm._data = typeof data === "function" ? getData(data, vm) : data || {};
	// console.log("data", data)

	if (!isPlainObject(data)) {
		data = {};
		process.env.NODE_ENV !== "production" && warn("data functions should return an object:\n" + "https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function", vm);
	}
	// proxy data on instance
	/**
	 * 两件事
	 *   1、判重处理，data 对象上的属性不能和 props、methods 对象上的属性相同
	 *   2、代理 data 对象上的属性到 vm 实例
	 */
	const keys = Object.keys(data);
	const props = vm.$options.props;
	const methods = vm.$options.methods;
	let i = keys.length;
	while (i--) {
		const key = keys[i];
		if (process.env.NODE_ENV !== "production") {
			if (methods && hasOwn(methods, key)) {
				warn(
					`Method "${key}" has already been defined as a data property.`,
					vm
				);
			}
		}
		if (props && hasOwn(props, key)) {
			process.env.NODE_ENV !== "production" &&
				warn(
					`The data property "${key}" is already declared as a prop. ` +
					`Use prop default value instead.`,
					vm
				);
		} else if (!isReserved(key)) {
			// 把data数据代理到vm 也就是Vue实例上面 我们可以使用this.a来访问this._data.a
			proxy(vm, `_data`, key);
		}
	}
	// observe data 数据遍历开始 核心代码
	observe(data, true /* asRootData */);
}

export function getData(data: Function, vm: Component): any {
	// #7573 disable dep collection when invoking data getters
	// 由于此时式Vue的初始化 还没有进行模版渲染，所以不需要进行依赖收集，在pushTarget 的时候传入 空
	// 就将全局的Watcher 设置为 undefined, 依赖收集的时候有一个判断式Dep.target存在的时候才收集
	pushTarget();
	try {
		return data.call(vm, vm);
	} catch (e) {
		handleError(e, vm, `data()`);
		return {};
	} finally {
		popTarget();
	}
}

const computedWatcherOptions = {
	lazy: true
};

/**
 * 三件事：
 *   1、为 computed[key] 创建 watcher 实例，默认是懒执行
 *   2、代理 computed[key] 到 vm 实例
 *   3、判重，computed 中的 key 不能和 data、props 中的属性重复
 * @param {*} computed = {
 *   key1: function() { return xx },
 *   key2: {
 *     get: function() { return xx },
 *     set: function(val) {}
 *   }
 * }
 */
function initComputed(vm: Component, computed: Object) {
	// $flow-disable-line
	const watchers = (vm._computedWatchers = Object.create(null));
	// computed properties are just getters during SSR
	const isSSR = isServerRendering();

	// 遍历 computed 对象
	for (const key in computed) {
		// 获取 key 对应的值，即 getter 函数
		const userDef = computed[key];
		const getter = typeof userDef === "function" ? userDef : userDef.get;
		if (process.env.NODE_ENV !== "production" && getter == null) {
			warn(`Getter is missing for computed property "${key}".`, vm);
		}

		if (!isSSR) {
			// create internal watcher for the computed property.
			// 为 computed 属性创建 watcher 实例
			watchers[key] = new Watcher(
				vm,
				getter || noop,
				noop,
				// 配置项，computed 默认是懒执行
				computedWatcherOptions
			);
		}

		// component-defined computed properties are already defined on the
		// component prototype. We only need to define computed properties defined
		// at instantiation here.
		if (!(key in vm)) {
			// 代理 computed 对象中的属性到 vm 实例
			// 这样就可以使用 vm.computedKey 访问计算属性了
			defineComputed(vm, key, userDef);
		}
		else if (process.env.NODE_ENV !== "production") {
			// 非生产环境有一个判重处理，computed 对象中的属性不能和 data、props 中的属性相同
			if (key in vm.$data) {
				warn(`The computed property "${key}" is already defined in data.`, vm);
			} else if (vm.$options.props && key in vm.$options.props) {
				warn(
					`The computed property "${key}" is already defined as a prop.`,
					vm
				);
			}
		}
	}
}

/**
 * 代理 computed 对象中的 key 到 target（vm）上
 */
export function defineComputed(
	target: any,
	key: string,
	userDef: Object | Function
) {
	const shouldCache = !isServerRendering();
	// 构造属性描述符(get、set)
	if (typeof userDef === "function") {
		sharedPropertyDefinition.get = shouldCache ?
			createComputedGetter(key) :
			createGetterInvoker(userDef);
		sharedPropertyDefinition.set = noop;
	} else {
		sharedPropertyDefinition.get = userDef.get ?
			shouldCache && userDef.cache !== false ?
				createComputedGetter(key) :
				createGetterInvoker(userDef.get) :
			noop;
		sharedPropertyDefinition.set = userDef.set || noop;
	}
	if (
		process.env.NODE_ENV !== "production" &&
		sharedPropertyDefinition.set === noop
	) {
		sharedPropertyDefinition.set = function () {
			warn(
				`Computed property "${key}" was assigned to but it has no setter.`,
				this
			);
		};
	}
	// 拦截对 target.key 的访问和设置
	Object.defineProperty(target, key, sharedPropertyDefinition);
}

/**
 * @returns 返回一个函数，这个函数在访问 vm.computedProperty 时会被执行，然后返回执行结果
 */
function createComputedGetter(key) {
	// computed 属性值会缓存的原理也是在这里结合 watcher.dirty、watcher.evalaute、watcher.update 实现的
	return function computedGetter() {
		const watcher = this._computedWatchers && this._computedWatchers[key];
		if (watcher) {
			// 计算 key 对应的值，通过执行 computed.key 的回调函数来得到
			// watcher.dirty 属性就是大家常说的 computed 计算结果会缓存的原理
			// <template>
			//   <div>{{ computedProperty }}</div>
			//   <div>{{ computedProperty }}</div>
			// </template>
			// 像这种情况下，在页面的一次渲染中，两个 dom 中的 computedProperty 只有第一个
			// 会执行 computed.computedProperty 的回调函数计算实际的值，
			// 即执行 watcher.evalaute，而第二个就不走计算过程了，
			// 因为上一次执行 watcher.evalute 时把 watcher.dirty 置为了 false，
			// 待页面更新后，wathcer.update 方法会将 watcher.dirty 重新置为 true，
			// 供下次页面更新时重新计算 computed.key 的结果
			if (watcher.dirty) {
				watcher.evaluate();
			}
			if (Dep.target) {
				watcher.depend();
			}
			return watcher.value;
		}
	};
}

/**
 * 功能同 createComputedGetter 一样
 */
function createGetterInvoker(fn) {
	return function computedGetter() {
		return fn.call(this, this);
	};
}

/**
 * 做了以下三件事，其实最关键的就是第三件事情
 *   1、校验 methoss[key]，必须是一个函数
 *   2、判重
 *         methods 中的 key 不能和 props 中的 key 相同
 *         methos 中的 key 与 Vue 实例上已有的方法重叠，一般是一些内置方法，比如以 $ 和 _ 开头的方法
 *   3、将 methods[key] 放到 vm 实例上，得到 vm[key] = methods[key]
 */
function initMethods(vm: Component, methods: Object) {
	// console.log("initvm",vm)
	// console.log("initMethodsmethods",methods)
	const props = vm.$options.props;
	for (const key in methods) {
		if (process.env.NODE_ENV !== "production") {
			if (typeof methods[key] !== "function") {
				warn(
					`Method "${key}" has type "${typeof methods[
					key
					]}" in the component definition. ` +
					`Did you reference the function correctly?`,
					vm
				);
			}
			if (props && hasOwn(props, key)) {
				warn(`Method "${key}" has already been defined as a prop.`, vm);
			}
			if (key in vm && isReserved(key)) {
				warn(
					`Method "${key}" conflicts with an existing Vue instance method. ` +
					`Avoid defining component methods that start with _ or $.`
				);
			}
		}
		vm[key] = typeof methods[key] !== "function" ? noop : bind(methods[key], vm);
		// 将methods 属性中的方法 绑定上下文后 挂载到vue 实例上
	}
}


/**
 * 处理 watch 对象的入口，做了两件事：
 *   1、遍历 watch 对象
 *   2、调用 createWatcher 函数
 * @param {*} watch = {
 *   'key1': function(val, oldVal) {},
 *   'key2': 'this.methodName',
 *   'key3': {
 *     handler: function(val, oldVal) {},
 *     deep: true
 *   },
 *   'key4': [
 *     'this.methodNanme',
 *     function handler1() {},
 *     {
 *       handler: function() {},
 *       immediate: true
 *     }
 *   ],
 *   'key.key5' { ... }
 * }
 */
function initWatch(vm: Component, watch: Object) {
	// 遍历 watch 对象
	for (const key in watch) {
		const handler = watch[key];
		if (Array.isArray(handler)) {
			// handler 为数组，遍历数组，获取其中的每一项，然后调用 createWatcher
			for (let i = 0; i < handler.length; i++) {
				createWatcher(vm, key, handler[i]);
			}
		} else {
			createWatcher(vm, key, handler);
		}
	}
}

/**
 * 两件事：
 *   1、兼容性处理，保证 handler 肯定是一个函数
 *   2、调用 $watch 
 * @returns 
 */
function createWatcher(
	vm: Component,
	expOrFn: string | Function,
	handler: any,
	options?: Object
) {
	// 如果 handler 为对象，则获取其中的 handler 选项的值
	if (isPlainObject(handler)) {
		options = handler;
		handler = handler.handler;
	}
	// 如果 hander 为字符串，则说明是一个 methods 方法，获取 vm[handler]
	if (typeof handler === "string") {
		handler = vm[handler];
	}
	return vm.$watch(expOrFn, handler, options);
}

export function stateMixin(Vue: Class<Component>) {
	// flow somehow has problems with directly declared definition object
	// when using Object.defineProperty, so we have to procedurally build up
	// the object here.
	// data
	const dataDef = {};
	dataDef.get = function () {
		return this._data;
	};
	// props
	const propsDef = {};
	propsDef.get = function () {
		return this._props;
	};
	if (process.env.NODE_ENV !== "production") {
		dataDef.set = function () {
			warn(
				"Avoid replacing instance root $data. " +
				"Use nested data properties instead.",
				this
			);
		};
		propsDef.set = function () {
			warn(`$props is readonly.`, this);
		};
	}

	Object.defineProperty(Vue.prototype, "$data", dataDef);
	Object.defineProperty(Vue.prototype, "$props", propsDef);

	Vue.prototype.$set = set;
	Vue.prototype.$delete = del;

	/**
 * 创建 watcher，返回 unwatch，共完成如下 5 件事：
 *   1、兼容性处理，保证最后 new Watcher 时的 cb 为函数
 *   2、标示用户 watcher
 *   3、创建 watcher 实例
 *   4、如果设置了 immediate，则立即执行一次 cb
 *   5、返回 unwatch
 * @param {*} expOrFn key
 * @param {*} cb 回调函数
 * @param {*} options 配置项，用户直接调用 this.$watch 时可能会传递一个 配置项
 * @returns 返回 unwatch 函数，用于取消 watch 监听
 */
	Vue.prototype.$watch = function (
		expOrFn: string | Function,
		cb: any,
		options?: Object
	): Function {
		const vm: Component = this;
		// 兼容性处理，因为用户调用 vm.$watch 时设置的 cb 可能是对象
		if (isPlainObject(cb)) {
			return createWatcher(vm, expOrFn, cb, options);
		}
		// options.user 表示用户 watcher，还有渲染 watcher，即 updateComponent 方法中实例化的 watcher
		options = options || {};
		options.user = true;
		const watcher = new Watcher(vm, expOrFn, cb, options);
		// 如果用户设置了 immediate 为 true，则立即执行一次回调函数
		if (options.immediate) {
			try {
				cb.call(vm, watcher.value);
			} catch (error) {
				handleError(
					error,
					vm,
					`callback for immediate watcher "${watcher.expression}"`
				);
			}
		}
		// 返回一个 unwatch 函数，用于解除监听
		return function unwatchFn() {
			watcher.teardown();
		};
	};
}
