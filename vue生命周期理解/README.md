由于暑假团队用vue做项目时，用到的钩子函数也只有mounted，主要是用来向后台请求数据。  其他的也没用到，而且当初对vue的生命周期也不理解，所以最近看了一些相关的文档，总结一下自己的收获，方便日后再次查阅。


首先放上vue官方的描述生命周期的一张图。
![image.png](http://upload-images.jianshu.io/upload_images/3185709-0c4c1273466a44f0.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
总结起来就是分为如下几个阶段（vue 2.0）

![image.png](http://upload-images.jianshu.io/upload_images/3185709-ecd1fdb0a42c6679.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
了解了这些之后，我就试着用代码测试一下各个钩子函数的执行。
```
<div id="app-15">
        <p>{{ a }}</p>
        <button @click="change">点我更新</button>
</div>


new Vue({
  el: '#app-15',
  data: {
      a: 'haha'
  },
  methods: {
    change: function () {
      this.a='xixi';
    }
  },
  beforeCreate: function() {
    console.log("创建前")
    console.log(this.a)
    console.log(this.$el)
  },
  created: function() {
    console.log("创建之后");
    console.log(this.a)
    console.log(this.$el)
  },
  beforeMount: function() {
    console.log("mount之前")
    console.log(this.a)
    console.log(this.$el)
  },
  mounted: function() {
    console.log("mount之后")
    console.log(this.a)
    console.log(this.$el)
  },
  beforeUpdate: function() {
    console.log("更新前");
    console.log(this.a)
    console.log(this.$el)
  },
  updated: function() {
    console.log("更新完成");
    console.log(this.a);
    console.log(this.$el)
  },
  beforeDestroy: function() {
    console.log("销毁前");
    console.log(this.a)
    console.log(this.$el)
    console.log(this.$el)
  },
  destroyed: function() {
    console.log("已销毁");
    console.log(this.a)
    console.log(this.$el)
  }
})
```
##一. create 和 mounted 相关
运行之后，输出如下。

![](http://upload-images.jianshu.io/upload_images/3185709-eba5784374324c9d.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

由结果可以看出

**beforeCreate：el 和 data 并未初始化 
created:完成了 data 数据的初始化，el没有
beforeMount：完成了 el 和 data 初始化 ，但el中的{{ a }}的值还没有渲染
mounted ：完成挂载，{{ a }}渲染成haha。**.

## 二. update相关
点击按钮。内容由haha变为xixi，从而触发update操作。

![](http://upload-images.jianshu.io/upload_images/3185709-3413290efdf282ee.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
![](http://upload-images.jianshu.io/upload_images/3185709-0342da6bfb58c5cd.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

输出如下，由此可见，在更新视图时，beforeUpdate和updated钩子函数已经执行。
![](http://upload-images.jianshu.io/upload_images/3185709-5485b4660fa03328.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

## 三. destory相关
在终端输入 app15.$destory()
输出如下
![](http://upload-images.jianshu.io/upload_images/3185709-ff73f23562192dc5.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
销毁完成后，我们再重新改变a的值，vue不再对此动作进行响应了。但是原先生成的dom元素还存在，可以这么理解，执行了destroy操作，后续就不再受vue控制了。

##四.生命周期总结
网上提供了一些钩子函数的用法
**beforecreate : 可以在这加个loading事件 
created ：在这结束loading，还做一些初始化，实现函数自执行 
mounted ： 在这发起后端请求，拿回数据，配合路由钩子做一些事情（这个用法在项目中比较常见，用的较多）
beforeDestory： 可以弹出一个警告框，用于警告 
destoryed ：当前组件已被销毁，清空相关内容**
