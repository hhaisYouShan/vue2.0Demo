/* @flow */
/**
 * 组件定义
 */

 import { ASSET_TYPES } from 'shared/constants'
 import { isPlainObject, validateComponentName } from '../util/index'
 
 export function initAssetRegisters (Vue: GlobalAPI) {
   /**
    * Create asset registration methods.
    */
   // 
   
   /** 
    * 定义 Vue.components、Vue.filter、Vue.directive 方法
    * 这三个方法所做的事情是类似的，就是在this.options.components.compName=组件构造函数
    * 
    * ASSET_TYPES ==['compont','filter','directive']
   */
 
   ASSET_TYPES.forEach(type => {
     /**
      * 比如： Vue.components(name,definition)
      * @param {*} id name
      * @param {*} definition 组件构造函数或配置对象
      * @returns 返回组件构造函数
      */
     Vue[type] = function (
       id: string,
       definition: Function | Object
     ): Function | Object | void {
       if (!definition) {
         return this.options[type + 's'][id]
       } else {
         /* istanbul ignore if */
         if (process.env.NODE_ENV !== 'production' && type === 'component') {
           validateComponentName(id)
         }
         // def 对象
         if (type === 'component' && isPlainObject(definition)) {
           // 定义组件name 如果组件中有name 则直接使用id
           definition.name = definition.name || id
           // extend创建组件构造函数，def变成了构造函数
           // extend 就是 Vue.extend 所以这时的 definition 就变成了组件构造函数，使用时可直接new Definition()
           definition = this.options._base.extend(definition)
         }
         if (type === 'directive' && typeof definition === 'function') {
           definition = { bind: definition, update: definition }
         }
         // 注册 this.options[components][comp]=Ctor
         // this.options.components.id=definition
         // 在实例化通过mergeOptions 将全局注册的组件合并到每个组件的配置对象components 中
         this.options[type + 's'][id] = definition
         return definition
       }
     }
   })
 }
 