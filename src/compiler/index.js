/* @flow */
//新建 compiler 文件夹 表示编译相关功能 核心导出 compileToFunctions 函数 
//主要有三个步骤
// 1.生成 ast
// 2.优化静态节点
// 3.根据 ast 生成 render 函数

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'
import { createCompilerCreator } from './create-compiler'

// `createCompilerCreator` allows creating compilers that use alternative
// parser/optimizer/codegen, e.g the SSR optimizing compiler.
// Here we just export a default compiler using the default parts.
// 对模版进行编译
export const createCompiler = createCompilerCreator(function baseCompile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 我们需将html字符串变成render函数
  // 1. 把html代码转成ast语法树  ast用来描述代码本身形成树结构 不仅以描述html 也能描述css以及js语法
  // 很多库都运用到了ast 比如 webpack babel eslint等等
  const ast = parse(template.trim(), options)
  // 2.优化静态节点
  if (options.optimize !== false) {
    optimize(ast, options)
  }

  // 3.通过ast 重新生成代码
  // 我们最后生成的代码需要和render函数一样
  // 类似_c('div',{id:"app"},_c('div',undefined,_v("hello"+_s(name)),_c('span',undefined,_v("world"))))
  // _c代表创建元素 _v代表创建文本 _s代表文Json.stringify--把对象解析成文本
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
})
