之前用Vue开发单页应用，发现不管路由怎么变化，浏览器地址栏总是会有一个'#'号。
![](https://upload-images.jianshu.io/upload_images/3185709-52cb00df1a8cb6c3.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
![image.png](https://upload-images.jianshu.io/upload_images/3185709-419e3159df3d181d.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

当时检查自己的代码，没有发现请求的地址带'#'，当时也很纳闷，但是由于没有影响页面的渲染以及向后台发送请求，当时也没有在意。最近看了一下vue-router的实现原理，才逐渐揭开了这个谜题。

## vue-router 的两种方式（浏览器环境下）

### 1. Hash （对应HashHistory）
hash（“#”）符号的本来作用是加在URL中指示网页中的位置：
```
http://www.example.com/index.html#print
```
\#符号本身以及它后面的字符称之为hash(也就是我之前为什么地址栏都会有一个‘#’)，可通过window.location.hash属性读取。它具有如下特点：
1. hash虽然出现在URL中，但不会被包括在HTTP请求中。它是用来指导浏览器动作的，对服务器端完全无用，因此，改变hash不会重新加载页面

2.可以为hash的改变添加监听事件：
```
window.addEventListener("hashchange", funcRef, false)
```

3. 每一次改变hash（window.location.hash），都会在浏览器的访问历史中增加一个记录

利用hash的以上特点，就可以来实现前端路由“更新视图但不重新请求页面”的功能了。


### 2. History  （对应HTML5History）
[History接口](https://developer.mozilla.org/en-US/docs/Web/API/History)是浏览器历史记录栈提供的接口，通过back(), forward(), go()等方法，我们可以读取浏览器历史记录栈的信息，进行各种跳转操作。

从HTML5开始，History interface提供了两个新的方法：pushState(), replaceState()使得我们可以对浏览器历史记录栈进行修改：
```
window.history.pushState(stateObject, title, URL)
window.history.replaceState(stateObject, title, URL)
```
stateObject: 当浏览器跳转到新的状态时，将触发popState事件，该事件将携带这个stateObject参数的副本
title: 所添加记录的标题
URL: 所添加记录的URL

这两个方法有个共同的特点：当调用他们修改浏览器历史记录栈后，虽然当前URL改变了，但浏览器不会刷新页面，这就为单页应用前端路由“更新视图但不重新请求页面”提供了基础。
浏览器历史记录可以看作一个「栈」。栈是一种后进先出的结构，可以把它想象成一摞盘子，用户每点开一个新网页，都会在上面加一个新盘子，叫「入栈」。用户每次点击「后退」按钮都会取走最上面的那个盘子，叫做「出栈」。而每次浏览器显示的自然是最顶端的盘子的内容。


## vue-router 的作用
vue-router的作用就是通过改变URL，在不重新请求页面的情况下，更新页面视图。简单的说就是，虽然地址栏的地址改变了，但是并不是一个全新的页面，而是之前的页面某些部分进行了修改。
```
export default new Router({
  // mode: 'history', //后端支持可开
  routes: constantRouterMap
})
```
这是Vue项目中常见的一段初始化vue-router的代码，之前没仔细研究过vue-router，不知道还有一个mode属性，后来看了相关文章后了解到，mode属性用来指定vue-router使用哪一种模式。在没有指定mode的值，则使用hash模式。

##  源码分析
首先看一下vue-router的构造函数
```
constructor (options: RouterOptions = {}) {
    this.app = null
    this.apps = []
    this.options = options
    this.beforeHooks = []
    this.resolveHooks = []
    this.afterHooks = []
    this.matcher = createMatcher(options.routes || [], this)

    let mode = options.mode || 'hash'
    this.fallback = mode === 'history' && !supportsPushState && options.fallback !== false
    if (this.fallback) {
      mode = 'hash'
    }
    if (!inBrowser) {
      mode = 'abstract'
    }
    this.mode = mode

    switch (mode) {
      case 'history':
        this.history = new HTML5History(this, options.base)
        break
      case 'hash':
        this.history = new HashHistory(this, options.base, this.fallback)
        break
      case 'abstract':   //非浏览器环境下
        this.history = new AbstractHistory(this, options.base) 
        break
      default:
        if (process.env.NODE_ENV !== 'production') {
          assert(false, `invalid mode: ${mode}`)
        }
    }
  }

```
主要是先获取mode的值，如果mode的值为`history`但是浏览器不支持`history`模式,那么就强制设置mode值为`hash`。如果支持则为`history`。接下来，根据mode的值，来选择vue-router使用哪种模式。
```
case 'history':
        this.history = new HTML5History(this, options.base)
        break
case 'hash':
        this.history = new HashHistory(this, options.base, this.fallback)
        break
```
这样就有了两种模式。确定好了vue-router使用哪种模式后，就到了init。
先来看看router 的 init 方法就干了哪些事情，在 [src/index.js](https://github.com/vuejs/vue-router/blob/dev/src/index.js) 中
```
init (app: any /* Vue component instance */) {
// ....
    const history = this.history

    if (history instanceof HTML5History) {
      history.transitionTo(history.getCurrentLocation())
    } else if (history instanceof HashHistory) {
      const setupHashListener = () => {
        history.setupListeners()
      }
      history.transitionTo(
        history.getCurrentLocation(),
        setupHashListener,
        setupHashListener
      )
    }

    history.listen(route => {
      this.apps.forEach((app) => {
        app._route = route
      })
    })
  }
// ....
// VueRouter类暴露的以下方法实际是调用具体history对象的方法
  push (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    this.history.push(location, onComplete, onAbort)
  }

  replace (location: RawLocation, onComplete?: Function, onAbort?: Function) {
    this.history.replace(location, onComplete, onAbort)
  }
}
```
如果是HTML5History，则执行
```
history.transitionTo(history.getCurrentLocation())
```
如果是Hash模式，则执行
```
const setupHashListener = () => {
        history.setupListeners()
      }
      history.transitionTo(
        history.getCurrentLocation(),
        setupHashListener,
        setupHashListener
      )
```
可以看出，两种模式都执行了transitionTo( )函数。
接下来看一下两种模式分别是怎么执行的，首先看一下Hash模式
### HashHistory.push()
我们来看HashHistory中的push()方法：
```
push (location: RawLocation, onComplete?: Function, onAbort?: Function) {
  this.transitionTo(location, route => {
    pushHash(route.fullPath)
    onComplete && onComplete(route)
  }, onAbort)
}

function pushHash (path) {
  window.location.hash = path
}
```
transitionTo()方法是父类中定义的是用来处理路由变化中的基础逻辑的，push()方法最主要的是对window的hash进行了直接赋值：

window.location.hash = route.fullPath
hash的改变会自动添加到浏览器的访问历史记录中。

那么视图的更新是怎么实现的呢，我们来看父类History中transitionTo()方法的这么一段：
```
transitionTo (location: RawLocation, onComplete?: Function, onAbort?: Function) {
  // 调用 match 得到匹配的 route 对象
  const route = this.router.match(location, this.current)
  this.confirmTransition(route, () => {
    this.updateRoute(route)
    ...
  })
}
updateRoute (route: Route) {
  this.cb && this.cb(route)
}
listen (cb: Function) {
  this.cb = cb
}
```
可以看到，当路由变化时，调用了History中的this.cb方法，而this.cb方法是通过History.listen(cb)进行设置的。回到VueRouter类定义中，找到了在init()方法中对其进行了设置：
```
init (app: any /* Vue component instance */) {
    
  this.apps.push(app)

  history.listen(route => {
    this.apps.forEach((app) => {
      app._route = route
    })
  })
}
```
**代码中的app指的是Vue的实例，._route本不是本身的组件中定义的内置属性，而是在Vue.use(Router)加载vue-router插件的时候，通过Vue.mixin()方法，全局注册一个混合，影响注册之后所有创建的每个 Vue 实例，该混合在beforeCreate钩子中通过Vue.util.defineReactive()定义了响应式的[_route]((https://router.vuejs.org/zh-cn/api/route-object.html))。所谓响应式属性，即当_route值改变时，会自动调用Vue实例的render()方法，更新视图。vm.render()是根据当前的[_route](https://router.vuejs.org/zh-cn/api/route-object.html)的path，name等属性，来将路由对应的组件渲染到<router-view></router-view>.**
**所以总结下来，从路由改变到视图的更新流程如下：**
```
this.$router.push(path)
 -->  
HashHistory.push() 
--> 
History.transitionTo() 
--> 
const  route = this.router.match(location, this.current)会进行地址匹配，得到一个对应当前地址的route(路由信息对象)
-->
History.updateRoute(route) 
 -->
 app._route=route (Vue实例的_route改变)   由于_route属性是采用vue的数据劫持，当_route的值改变时，会执行响应的render( )
-- >
vm.render()   具体是在<router-view></router-view> 中render
 -->
window.location.hash = route.fullpath (浏览器地址栏显示新的路由的path)
``` 

### HashHistory.replace()
说完了HashHistory.push()，该说HashHistory.replace()了。
```
replace (location: RawLocation, onComplete?: Function, onAbort?: Function) {
  this.transitionTo(location, route => {
    replaceHash(route.fullPath)
    onComplete && onComplete(route)
  }, onAbort)
}
  
function replaceHash (path) {
  const i = window.location.href.indexOf('#')
  window.location.replace(
    window.location.href.slice(0, i >= 0 ? i : 0) + '#' + path
  )
}

```
可以看出来，HashHistory.replace它与push()的实现结构上基本相似，不同点在于它不是直接对window.location.hash进行赋值，而是调用window.location.replace方法将路由进行替换。这样不会将新路由添加到浏览器访问历史的栈顶，而是替换掉当前的路由。
### 监听地址栏
可以看出来，上面的过程都是在代码内部进行路由的改变的，比如项目中常见的this.$router.push(), <router-link to=''>等方法。然后将浏览器的地址栏置为新的hash值。那么如果直接在地址栏中输入URL从而改变路由呢，例如
![](https://upload-images.jianshu.io/upload_images/3185709-6187b15b5a308e61.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
我将dashboadr删除，然后置为article/hotSpot，然后回车，vue又是如何处理的呢？
```
setupListeners () {
  window.addEventListener('hashchange', () => {
    if (!ensureSlash()) {
      return
    }
    this.transitionTo(getHash(), route => {
      replaceHash(route.fullPath)
    })
  })
}
```
该方法设置监听了浏览器事件hashchange，调用的函数为replaceHash，即在浏览器地址栏中直接输入路由相当于代码调用了replace()方法.后面的步骤自然与HashHistory.replace()相同，一样实现页面渲染。

### HTML5History
HTML5History模式的vue-router 代码结构以及更新视图的逻辑与hash模式基本类似，和HashHistory的步骤基本一致，只是HashHistory的push和replace()变成了HTML5History.pushState()和HTML5History.replaceState()

在HTML5History中添加对修改浏览器地址栏URL的监听是直接在构造函数中执行的，对HTML5History的popstate 事件进行监听：
```
constructor (router: Router, base: ?string) {
  
  window.addEventListener('popstate', e => {
    const current = this.current
    this.transitionTo(getLocation(this.base), route => {
      if (expectScroll) {
        handleScroll(router, route, current, true)
      }
    })
  })
}
```
以上就是vue-router hash模式与history模式不同模式下处理逻辑的分析了。


### 两种模式比较
hash模式 会在浏览器的URL中加入'#'，而HTM5History就没有'#'号，URL和正常的URL一样。
另外：
history.pushState()相比于直接修改hash主要有以下优势：
1. pushState设置的新URL可以是与当前URL同源的任意URL；而hash只可修改#后面的部分，故只可设置与当前同文档的URL
2. pushState设置的新URL可以与当前URL一模一样，这样也会把记录添加到栈中；而hash设置的新值必须与原来不一样才会触发记录添加到栈中
3. pushState通过stateObject可以添加任意类型的数据到记录中；而hash只可添加短字符串
4. pushState可额外设置title属性供后续使用

相关参考链接：
[从vue-router看前端路由的两种实现](https://zhuanlan.zhihu.com/p/27588422)
[vue-router源码分析-整体流程](https://github.com/DDFE/DDFE-blog/issues/9)
[利用 History API 无刷新更改地址栏](https://www.renfei.org/blog/html5-introduction-3-history-api.html)

