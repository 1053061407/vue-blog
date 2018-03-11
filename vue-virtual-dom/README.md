## 首先理解VNode对象
一个VNode的实例对象包含了以下属性,参见源码[src/vdom/vnode.js](https://github.com/vuejs/vue/blob/dev/src/core/vdom/vnode.js#L4-L65)
```
constructor (
    tag?: string,
    data?: VNodeData,
    children?: ?Array<VNode>,
    text?: string,
    elm?: Node,
    context?: Component,
    componentOptions?: VNodeComponentOptions,
    asyncFactory?: Function
  ) {
    this.tag = tag
    this.data = data
    this.children = children
    this.text = text
    this.elm = elm
    this.ns = undefined
    this.context = context
    this.fnContext = undefined
    this.fnOptions = undefined
    this.fnScopeId = undefined
    this.key = data && data.key
    this.componentOptions = componentOptions
    this.componentInstance = undefined
    this.parent = undefined
    this.raw = false
    this.isStatic = false
    this.isRootInsert = true
    this.isComment = false
    this.isCloned = false
    this.isOnce = false
    this.asyncFactory = asyncFactory
    this.asyncMeta = undefined
    this.isAsyncPlaceholder = false
  }

  // DEPRECATED: alias for componentInstance for backwards compat.
  /* istanbul ignore next */
  get child (): Component | void {
    return this.componentInstance
  }
```
其中几个比较重要的属性:
*   `tag`: 当前节点的标签名
*   `data`: 当前节点的数据对象，具体包含哪些字段可以参考vue源码`types/vnode.d.ts`中对`VNodeData`的定义
*   `children`: 数组类型，包含了当前节点的子节点
*   `text`: 当前节点的文本，一般文本节点或注释节点会有该属性
*   `elm`: 当前虚拟节点对应的真实的dom节点
*   `key`: 节点的key属性，用于作为节点的标识，有利于patch的优化

比如，定义一个vnode，它的数据结构是:
```
    {
        tag: 'div'
        data: {
            id: 'app',
            class: 'page-box'
        },
        children: [
            {
                tag: 'p',
                text: 'this is demo'
            }
        ]
    }
```
通过一定的渲染函数，最后渲染出的实际的dom结构就是:
```
   <div id="app" class="page-box">
       <p>this is demo</p>
   </div>
```
*VNode对象是JS用对象模拟的DOM节点，通过渲染这些对象即可渲染成一棵dom树。*
## patch
*我对patch的理解就是对内容已经变更的节点进行修改的过程*

当model中的响应式的数据发生了变化，这些响应式的数据所维护的dep数组便会调用dep.notify()方法完成所有依赖遍历执行的工作，这里面就包括了视图的更新即updateComponent方法。
```
updateComponent = () => {
  vm._update(vm._render(), hydrating)
}
```
完成视图的更新工作事实上就是调用了vm._update方法，这个方法接收的第一个参数是刚生成的Vnode(vm._render()会生成一个新的Vnode)
vm._update方法主要调用了vm.\__patch\__() 方法，这也是整个virtaul-dom当中最为核心的方法，主要完成了prevVnode和vnode的diff过程并根据需要操作的vdom节点打patch，最后生成新的真实dom节点并完成视图的更新工作。
```
   function patch (oldVnode, vnode, hydrating, removeOnly, parentElm, refElm) {
        // 当oldVnode不存在时
        if (isUndef(oldVnode)) {
            // 创建新的节点
            createElm(vnode, insertedVnodeQueue, parentElm, refElm)
        } else {
            const isRealElement = isDef(oldVnode.nodeType)
            if (!isRealElement && sameVnode(oldVnode, vnode)) {
            // patch existing root node
            patchVnode(oldVnode, vnode, insertedVnodeQueue, removeOnly)
      } 
        }
    }
```
**在当oldVnode不存在的时候，这个时候是root节点初始化的过程，因此调用了createElm(vnode, insertedVnodeQueue, parentElm, refElm)方法去创建一个新的节点。而当oldVnode是vnode且sameVnode(oldVnode, vnode)2个节点的基本属性相同，那么就进入了2个节点的patch以及diff过程。
(在对oldVnode和vnode类型判断中有个sameVnode方法，这个方法决定了是否需要对oldVnode和vnode进行diff及patch的过程。如果2个vnode的基本属性存在不一致的情况，那么就会直接跳过diff的过程，进而依据vnode新建一个真实的dom，同时删除老的dom节点)**
```
function sameVnode (a, b) {
  return (
    a.key === b.key &&
    a.tag === b.tag &&
    a.isComment === b.isComment &&
    isDef(a.data) === isDef(b.data) &&
    sameInputType(a, b)
  )
}
```
patch过程主要调用了`patchVnode`([src/core/vdom/patch.js](https://github.com/vuejs/vue/blob/dev/src/core/vdom/patch.js#L441))方法进行的:
```
if (isDef(data) && isPatchable(vnode)) {
      // cbs保存了hooks钩子函数: 'create', 'activate', 'update', 'remove', 'destroy'
      // 取出cbs保存的update钩子函数，依次调用，更新attrs/style/class/events/directives/refs等属性
      for (i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode)
      if (isDef(i = data.hook) && isDef(i = i.update)) i(oldVnode, vnode)
    }
```
更新真实dom节点的data属性，相当于对dom节点进行了预处理的操作
接下来:
```
    ...
    const elm = vnode.elm = oldVnode.elm
    const oldCh = oldVnode.children
    const ch = vnode.children
    // 如果vnode没有文本节点
    if (isUndef(vnode.text)) {
      // 如果oldVnode的children属性存在且vnode的属性也存在
      if (isDef(oldCh) && isDef(ch)) {
        // updateChildren，对子节点进行diff
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)
      } else if (isDef(ch)) {
        // 如果oldVnode的text存在，那么首先清空text的内容
        if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, '')
        // 然后将vnode的children添加进去
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
      } else if (isDef(oldCh)) {
        // 删除elm下的oldchildren
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)
      } else if (isDef(oldVnode.text)) {
        // oldVnode有子节点，而vnode没有，那么就清空这个节点
        nodeOps.setTextContent(elm, '')
      }
    } else if (oldVnode.text !== vnode.text) {
      // 如果oldVnode和vnode文本属性不同，那么直接更新真是dom节点的文本元素
      nodeOps.setTextContent(elm, vnode.text)
    }
```
这个patch的过程又分为几种情况：
1.当`vnode`的text为空，即不是文本节点时。
  * 如果`oldVnode`和新节点`vnode`都有子节点。
则调用updateChildren( )，对子节点进行diff
* 如果只有新节点`vnode`有子节点
则判断`oldVnode`是否是文本节点，如果是文本节点，则首先清空真实节点的text的内容。然后把新节点的children添加到elm中。
* 如果只有`oldVnode`有子节点时
则调用removeVnodes()删除elm下的`oldVnode`的children。
* 如果`oldVnode`和新节点`vnode`都没有子节点，且`oldVnode`是文本节点
则清空真实节点的text的内容。

2.当`vnode`的text存在，即是文本节点时
则设置真实节点的text内容为`vnode`的text内容。
## diff过程
我对diff的理解就是遍历两棵不同的虚拟树，如果其中有的节点不同，则进行patch。

上个函数的`updateChildren`([src/core/vdom/patch.js](https://github.com/vuejs/vue/blob/dev/src/core/vdom/patch.js#L366-L366))方法就是diff过程，它也是整个`diff`过程中最重要的环节:
```
function updateChildren (parentElm, oldCh, newCh, insertedVnodeQueue, removeOnly) {
    // 为oldCh和newCh分别建立索引，为之后遍历的依据
    let oldStartIdx = 0
    let newStartIdx = 0
    let oldEndIdx = oldCh.length - 1
    let oldStartVnode = oldCh[0]
    let oldEndVnode = oldCh[oldEndIdx]
    let newEndIdx = newCh.length - 1
    let newStartVnode = newCh[0]
    let newEndVnode = newCh[newEndIdx]
    let oldKeyToIdx, idxInOld, elmToMove, refElm
    
    // 直到oldCh或者newCh被遍历完后跳出循环
    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (isUndef(oldStartVnode)) {
        oldStartVnode = oldCh[++oldStartIdx] // Vnode has been moved left
      } else if (isUndef(oldEndVnode)) {
        oldEndVnode = oldCh[--oldEndIdx]
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue)
        oldStartVnode = oldCh[++oldStartIdx]
        newStartVnode = newCh[++newStartIdx]
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue)
        oldEndVnode = oldCh[--oldEndIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue)
        canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
        oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue)
        // 插入到老的开始节点的前面
        canMove && nodeOps.insertBefore(parentElm, oldEndVnode.elm, oldStartVnode.elm)
        oldEndVnode = oldCh[--oldEndIdx]
        newStartVnode = newCh[++newStartIdx]
      } else {
        // 如果以上条件都不满足，那么这个时候开始比较key值，首先建立key和index索引的对应关系
        if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
        idxInOld = isDef(newStartVnode.key) ? oldKeyToIdx[newStartVnode.key] : null
        // 如果idxInOld不存在
        // 1. newStartVnode上存在这个key,但是oldKeyToIdx中不存在
        // 2. newStartVnode上并没有设置key属性
        if (isUndef(idxInOld)) { // New element
          // 创建新的dom节点
          // 插入到oldStartVnode.elm前面
          // 参见createElm方法
          createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm)
          newStartVnode = newCh[++newStartIdx]
        } else {
          elmToMove = oldCh[idxInOld]
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !elmToMove) {
            warn(
              'It seems there are duplicate keys that is causing an update error. ' +
              'Make sure each v-for item has a unique key.'
            )
          
          // 将找到的key一致的oldVnode再和newStartVnode进行diff
          if (sameVnode(elmToMove, newStartVnode)) {
            patchVnode(elmToMove, newStartVnode, insertedVnodeQueue)
            oldCh[idxInOld] = undefined
            // 移动node节点
            canMove && nodeOps.insertBefore(parentElm, newStartVnode.elm, oldStartVnode.elm)
            newStartVnode = newCh[++newStartIdx]
          } else {
            // same key but different element. treat as new element
            // 创建新的dom节点
            createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm)
            newStartVnode = newCh[++newStartIdx]
          }
        }
      }
    }
    // 如果最后遍历的oldStartIdx大于oldEndIdx的话
    if (oldStartIdx > oldEndIdx) {        // 如果是老的vdom先被遍历完
      refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
      // 添加newVnode中剩余的节点到parentElm中
      addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
    } else if (newStartIdx > newEndIdx) { // 如果是新的vdom先被遍历完，则删除oldVnode里面所有的节点
      // 删除剩余的节点
      removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
    }
}
```
代码中，oldStartIdx，oldEndIdx是遍历`oldCh(oldVnode的子节点)`的索引
newStartIdx，newEndIdx是遍历`newCh(vnode的子节点)`的索引

### *diff遍历的过程如下：*  （节点属性中不带key的情况）
**遍历完的条件就是oldCh或者newCh的startIndex >= endIndex**
首先先判断`oldCh`的起始节点`oldStartVnode`和末尾节点`oldEndVnode`是否存在，如果不存在，则`oldCh`的起始节点向后移动一位，末尾节点向前移动一位。

如果存在，则每一轮diff都进行比较如下比较：
 1. `sameVnode(oldStartVnode, newStartVnode)`
判断老节点的初节点和新节点的初节点是否是同一类型，如果是，则对它们两个进行patchVnode(patch过程).两个节点初节点分别向后移动一位。
2. 如果1不满足，`sameVnode(oldEndVnode, newEndVnode)`
判断老节点的尾节点和新节点的尾节点是否是同一类型，如果是，则对它们两个进行patchVnode(patch过程).两个节点尾节点分别向前移动一位。
3. 如果2也不满足，则sameVnode(oldStartVnode, newEndVnode)
判断老节点的初节点和新节点的尾节点是否是同一类型，如果是，则对它们两个进行patchVnode(patch过程).老节点的初节点向后移动一位，新节点尾节点向前移动一位。
4. 如果3也不满足，则sameVnode(oldEndVnode, newStartVnode)
判断老节点的尾节点和新节点的初节点是否是同一类型，如果是，则对它们两个进行patchVnode(patch过程).老节点的尾节点向前移动一位，新节点初节点向后移动一位。
5.如果以上都不满足，则创建新的dom节点,newCh的startVnode被添加到oldStartVnode的前面，同时newStartIndex后移一位；

用图来描述就是
![第一轮diff](http://upload-images.jianshu.io/upload_images/3185709-bf65aa3b5289b52f.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
![第二轮diff](http://upload-images.jianshu.io/upload_images/3185709-3efce6989475dea0.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
![第三轮diff](http://upload-images.jianshu.io/upload_images/3185709-df8fe784e01eb288.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
![第四轮diff](http://upload-images.jianshu.io/upload_images/3185709-722a6a0f8358c086.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
![第五轮diff](http://upload-images.jianshu.io/upload_images/3185709-1eb1fb5dc13beecc.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

**遍历的过程结束后，newStartIdx > newEndIdx，说明此时oldCh存在多余的节点，那么最后就需要将oldCh的多余节点从parentElm中删除。
如果oldStartIdx > oldEndIdx，说明此时newCh存在多余的节点，那么最后就需要将newCh的多余节点添加到parentElm中。**

### *diff遍历的过程如下：*  （节点属性中带key的情况）
前四步还和上面的一样
第五步：如果前四步都不满足，则首先建立`oldCh` key和index索引的对应关系。
* 如果newStartVnode上存在这个key,但是oldKeyToIdx中不存在
则创建新的dom节点,newCh的startVnode被添加到oldStartVnode的前面，同时newStartIndex后移一位；
* 如果找到与`newStartVnode` key一致的`oldVnode`
则先将这两个节点进行patchVnode(patch过程)，然后将`newStartVnode`移到`oldStartVnode`的前面，并在oldCh中删除与`newStartVnode` key一致的`oldVnode`，然后新节点初节点向后移动一位。再进行遍历。


用图来描述就是
![第一轮diff](https://upload-images.jianshu.io/upload_images/3185709-ef7db7215a24be7f.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
![第二轮diff](http://upload-images.jianshu.io/upload_images/3185709-c6c5bb6c402efcb6.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
![第三轮diff](http://upload-images.jianshu.io/upload_images/3185709-bca2051872f4dbe0.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
![第四轮diff](http://upload-images.jianshu.io/upload_images/3185709-7d2e64727ec47bb4.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
![第五轮diff](https://user-images.githubusercontent.com/9695264/27948742-7dbc0114-632d-11e7-9ff9-b8a1a3f88eb3.jpeg)

最后，由于newStartIndex>newEndIndex,所以`newCh`剩余的节点会被添加到parentElm中

## 总结

Virtual DOM 算法主要是实现上面三个概念：VNode，diff，patch
总结下来就是

**1. 通过构造VNode构建虚拟DOM**

 **2.  通过虚拟DOM构建真正的DOM**

 **3.  生成新的虚拟DOM**

**4. 比较两棵虚拟DOM树的不同.从根节点开始比较，diff过程**

 **5.  在真正的DOM元素上应用变更,patch**

其中patch的过程中遇到两个节点有子节点，则对其子节点进行diff。
而diff的过程又会调用patch。

参考链接：
[知乎：如何理解虚拟DOM?](https://www.zhihu.com/question/29504639)
 [Vue原理解析之Virtual Dom](https://segmentfault.com/a/1190000008291645)
[Vue 2.0 的 virtual-dom 实现简析 ](https://github.com/DDFE/DDFE-blog/issues/18)
