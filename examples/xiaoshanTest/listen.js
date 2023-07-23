// /**
//  * 发布订阅模式123
//  * 
//  */


// let shoeObj = {}; // 定义发布者
// shoeObj.list = []; // 缓存列表 存放订阅者回调函数
// // 增加订阅者
// shoeObj.listen = function (key, fn) {
//   if (!this.list[key]) {
//     // 如果还没有订阅过此类消息，给该类消息创建一个缓存列表
//     this.list[key] = [];
//   }
//   this.list[key].push(fn); // 订阅消息添加到缓存列表
// }

// // 发布消息
// shoeObj.trigger = function () {
//   var key = Array.prototype.shift.call(arguments); // 取出消息类型名称
//   var fns = this.list[key]; // 取出该消息对应的回调函数的集合

//   // 如果没有订阅过该消息的话，则返回
//   if (!fns || fns.length === 0) {
//     return;
//   }
//   for (var i = 0, fn; fn = fns[i++];) {
//     fn.apply(this, arguments); // arguments 是发布消息时附送的参数
//   }
// };

// // 小红订阅如下消息
// shoeObj.listen("red", function (size) {
//   console.log("小红尺码是：" + size);
// });

// // 小花订阅如下消息
// shoeObj.listen("block", function (size) {
//   console.log("小花再次打印尺码是：" + size);
// });
// shoeObj.trigger("red", 40);
// shoeObj.trigger("block", 42);
