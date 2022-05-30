/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index'
import { mark, measure } from 'core/util/perf' // 调试用工具

import Vue from './runtime/index'
import { query } from './util/index'
import { compileToFunctions } from './compiler/index' // 用来render的工具方法
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat'

const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

// 将原始的$mount存储起来，然后 实现新的 $moute
// 然后再调用$mount 就是在扩展原有的$mount方法

// 就是生成render,在调用 系统的 原有的 $mount 函数

const mount = Vue.prototype.$mount

// 扩展挂载
//flow 语法
Vue.prototype.$mount = function (
  el ?: string | Element,
  hydrating ?: boolean
): Component {
  el = el && query(el)

  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }
  // 处理el 和 template
  const options = this.$options

  // resolve template/el and convert to render function
  // render 不存在时 才考虑el和template
  if (!options.render) {
     // 如果存在template属性
    let template = options.template
    if (template) {
      if (typeof template === 'string') {
        //template 是选择器的情况
        if (template.charAt(0) === '#') {
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      }
      //template 是dom元素
      else if (template.nodeType) {
        // 如果不存在render和template 但是存在el属性 直接将模板赋值到el所在的外层html结构（就是el本身 并不是父元素）
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    }
    // el 作为模版 
    else if (el) {
      // 如果不存在render和template 但是存在el属性 直接将模板赋值到el所在的外层html结构（就是el本身 并不是父元素）
      template = getOuterHTML(el)
    }
    //挂载过程
    if (template) {
      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }
      // 将template字符串转换为render函数
      const {
        render,
        staticRenderFns
      } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML(el: Element): string {
  if (el.outerHTML) {
    // console.log("el.outerHTML", el.outerHTML)
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    // console.log("el.outerHTML", container)
    container.appendChild(el.cloneNode(true))
    return container.innerHTML

  }
}

Vue.compile = compileToFunctions

export default Vue
