# Vue 双向绑定
# MVC模式
![MVC模式](http://upload-images.jianshu.io/upload_images/3185709-28a74ff6028d8ee3.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

以往的MVC模式是单向绑定，即Model绑定到View，当我们用JavaScript代码更新Model时，View就会自动更新
# MVVM模式
MVVM模式就是Model–View–ViewModel模式。它实现了View的变动，自动反映在 ViewModel，反之亦然。
我对于双向绑定的理解，就是用户更新了View，Model的数据也自动被更新了，这种情况就是双向绑定。再说细点，就是在单向绑定的基础上给可输入元素（input、textare等）添加了change(input)事件,(change事件触发，View的状态就被更新了)来动态修改model。
![MVVM模式](http://upload-images.jianshu.io/upload_images/3185709-b9138c159a986522.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
# 双向绑定原理
vue数据双向绑定是通过数据劫持结合发布者-订阅者模式的方式来实现的。
我们已经知道实现数据的双向绑定，首先要对数据进行劫持监听，所以我们需要设置一个监听器Observer，用来监听所有属性。如果属性发上变化了，就需要告诉订阅者Watcher看是否需要更新。因为订阅者是有很多个，所以我们需要有一个消息订阅器Dep来专门收集这些订阅者，然后在监听器Observer和订阅者Watcher之间进行统一管理的。接着，我们还需要有一个指令解析器Compile，对每个节点元素进行扫描和解析，将相关指令（如v-model，v-on）对应初始化成一个订阅者Watcher，并替换模板数据或者绑定相应的函数，此时当订阅者Watcher接收到相应属性的变化，就会执行对应的更新函数，从而更新视图。因此接下去我们执行以下3个步骤，实现数据的双向绑定：

1.实现一个监听器Observer，用来劫持并监听所有属性，如果有变动的，就通知订阅者。

2.实现一个订阅者Watcher，每一个Watcher都绑定一个更新函数，watcher可以收到属性的变化通知并执行相应的函数，从而更新视图。

3.实现一个解析器Compile，可以扫描和解析每个节点的相关指令（v-model，v-on等指令），如果节点存在v-model，v-on等指令，则解析器Compile初始化这类节点的模板数据，使之可以显示在视图上，然后初始化相应的订阅者（Watcher）。
## 1.实现一个Observer 
Observer是一个数据监听器，其实现核心方法就是Object.defineProperty( )。如果要对所有属性都进行监听的话，那么可以通过递归方法遍历所有属性值，并对其进行Object.defineProperty( )处理
如下代码实现了一个Observer。
```
function Observer(data) {
    this.data = data;
    this.walk(data);
}

Observer.prototype = {
    walk: function(data) {
        var self = this;
        //这里是通过对一个对象进行遍历，对这个对象的所有属性都进行监听
        Object.keys(data).forEach(function(key) {
            self.defineReactive(data, key, data[key]);
        });
    },
    defineReactive: function(data, key, val) {
        var dep = new Dep();
      // 递归遍历所有子属性
        var childObj = observe(val);
        Object.defineProperty(data, key, {
            enumerable: true,
            configurable: true,
            get: function getter () {
                if (Dep.target) {
                  // 在这里添加一个订阅者
                  console.log(Dep.target)
                    dep.addSub(Dep.target);
                }
                return val;
            },
           // setter，如果对一个对象属性值改变，就会触发setter中的dep.notify(),通知watcher（订阅者）数据变更，执行对应订阅者的更新函数，来更新视图。
            set: function setter (newVal) {
                if (newVal === val) {
                    return;
                }
                val = newVal;
              // 新的值是object的话，进行监听
                childObj = observe(newVal);
                dep.notify();
            }
        });
    }
};

function observe(value, vm) {
    if (!value || typeof value !== 'object') {
        return;
    }
    return new Observer(value);
};

// 消息订阅器Dep，订阅器Dep主要负责收集订阅者，然后在属性变化的时候执行对应订阅者的更新函数
function Dep () {
    this.subs = [];
}
Dep.prototype = {
  /**
   * [订阅器添加订阅者]
   * @param  {[Watcher]} sub [订阅者]
   */
    addSub: function(sub) {
        this.subs.push(sub);
    },
  // 通知订阅者数据变更
    notify: function() {
        this.subs.forEach(function(sub) {
            sub.update();
        });
    }
};
Dep.target = null;
```
**在Observer中，当初我看别人的源码时，我有一点不理解的地方就是Dep.target是从哪里来的，相信有些人和我会有同样的疑问。这里不着急，当写到Watcher的时候，你就会发现，这个Dep.target是来源于Watcher。**
## 2.实现一个Watcher
Watcher就是一个订阅者。用于将Observer发来的update消息处理，执行Watcher绑定的更新函数。
如下代码实现了一个Watcher
```
function Watcher(vm, exp, cb) {
    this.cb = cb;
    this.vm = vm;
    this.exp = exp;
    this.value = this.get();  // 将自己添加到订阅器的操作
}

Watcher.prototype = {
    update: function() {
        this.run();
    },
    run: function() {
        var value = this.vm.data[this.exp];
        var oldVal = this.value;
        if (value !== oldVal) {
            this.value = value;
            this.cb.call(this.vm, value, oldVal);
        }
    },
    get: function() {
        Dep.target = this;  // 缓存自己
        var value = this.vm.data[this.exp]  // 强制执行监听器里的get函数
        Dep.target = null;  // 释放自己
        return value;
    }
};
```
在我研究代码的过程中，我觉得最复杂的就是理解这些函数的参数，后来在我输出了这些参数之后，函数的这些功能也容易理解了。vm，就是之后要写的SelfValue对象，相当于Vue中的new Vue的一个对象。exp是node节点的v-model或v-on：click等指令的属性值。如v-model="name"，exp就是"name"。cb，就是Watcher绑定的更新函数。
上面的代码中就可以看出来，在Watcher的getter函数中，Dep.target指向了自己，也就是Watcher对象。在getter函数中，
```
var value = this.vm.data[this.exp]  // 强制执行监听器里的get函数。
```
这里获取vm.data[this.exp] 时，会调用Observer中Object.defineProperty中的get函数
```
get: function getter () {
                if (Dep.target) {
                  // 在这里添加一个订阅者
                  console.log(Dep.target)
                    dep.addSub(Dep.target);
                }
                return val;
            },
```
从而把watcher添加到了订阅器中，也就解决了上面Dep.target是哪里来的这个问题。
## 3.实现一个Compile
![new SelfVue 绑定的dom节点](http://upload-images.jianshu.io/upload_images/3185709-32f0470de525fc28.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

Compile主要的作用是把new SelfVue 绑定的dom节点，（也就是el标签绑定的id）遍历该节点的所有子节点，找出其中所有的v-指令
1.如果子节点含有v-指令，即是元素节点，则对这个元素添加监听事件。（如果是v-on，则node.addEventListener('click'），如果是v-model，则node.addEventListener('input'))。接着初始化模板元素，创建一个Watcher绑定这个元素节点。

```
2.如果子节点是文本节点，即 {{ data }} ,则用正则表达式取出 {{ data }} 中的data，然后var initText = this.vm[exp]，用initText去替代其中的data。
```

具体代码参见
## 4.实现一个MVVM
可以说MVVM是Observer，Compile以及Watcher的“boss”了，他需要安排给Observer，Compile以及Watche做的事情如下

a、Observer实现对MVVM自身model数据劫持，监听数据的属性变更，并在变动时进行notify
b、Compile实现指令解析，初始化视图，并订阅数据变化，绑定好更新函数
c、Watcher一方面接收Observer通过dep传递过来的数据变化，一方面通知Compile进行view update。
最后，把这个MVVM抽象出来，就是vue中Vue的构造函数了，可以构造出一个vue实例。
# 最后写一个html测试一下我们的功能

```
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>self-vue</title>
</head>
<style>
    #app {
        text-align: center;
    }
</style>
<body>
    <div id="app">
        <h2>{{title}}</h2>
        <input v-model="name">
        <h1>{{name}}</h1>
        <button v-on:click="clickMe">click me!</button>
    </div>
</body>
<script src="js/observer.js"></script>
<script src="js/watcher.js"></script>
<script src="js/compile.js"></script>
<script src="js/mvvm.js"></script>
<script type="text/javascript">

     var app = new SelfVue({
        el: '#app',
        data: {
            title: 'hello world',
            name: 'canfoo'
        },
        methods: {
            clickMe: function () {
                this.title = 'hello world';
            }
        },
        mounted: function () {
            window.setTimeout(() => {
                this.title = '你好';
            }, 1000);
        }
    });

</script>
</html>
```

先执行mvvm中的new SelfVue(...)，在mvvm.js中，
```
observe(this.data);
new Compile(options.el, this);
```

先初始化一个监听器Observer，用于监听该对象data属性的值。
然后初始化一个解析器Compile，绑定这个节点，并解析其中的

```
v-，{{ }}指令
```

（每一个指令对应一个Watcher）并初始化模板数据以及初始化相应的订阅者，并把订阅者添加到订阅器中（Dep）。这样就实现双向绑定了。
如果v-model绑定的元素，

```
<input v-model="name">
```

即输入框的值发生变化，就会触发Compile中的

```
node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }
            self.vm[exp] = newValue;
            val = newValue;
        });
```

self.vm[exp] = newValue;这个语句会触发mvvm中SelfValue的setter，以及触发Observer对该对象name属性的监听，即Observer中的Object.defineProperty（）中的setter。setter中有通知订阅者的函数dep.notify,Watcher收到通知后就会执行绑定的更新函数。
最后的最后就是效果图啦：

![双向绑定](http://upload-images.jianshu.io/upload_images/3185709-88ac3b89e1e30ec9.gif?imageMogr2/auto-orient/strip)

相关参考链接:
[vue-MVVM原理实现]https://github.com/canfoo/self-vue

