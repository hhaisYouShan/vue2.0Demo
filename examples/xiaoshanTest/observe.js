// /**
//  * 观察者模式
//  * lhs
//  */

// // 创建对象
// var targetObj = {
//   name: '小李'
// }
// var targetObj2 = {
//   name: '小李'
// }
// // 定义值改变时的处理函数（观察者）
// function observer(oldVal, newVal) {

//   targetObj2.name = newVal
//   console.info('targetObj2的name属性的值改变为 ' + newVal);
// }

// // 定义name属性及其set和get方法（name属性为被观察者）
// Object.defineProperty(targetObj, 'name', {
//   enumerable: true,
//   configurable: true,
//   get: function () {
//     console.log("name", name)
//     return name;
//   },
//   set: function (val) {
//     name = val
//     // console.log("setName", name)
//     //调用处理函数
//     observer(name, val)

//   }
// });

// targetObj.name = '张三';
// targetObj.name = '李四';
// // observer("李四", "张三")
// console.log("targetObj2.name", targetObj2.name)

// // console.log("123")
