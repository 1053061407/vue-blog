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

// 消息订阅器Dep，订阅器Dep主要负责收集订阅者，然后再属性变化的时候执行对应订阅者的更新函数
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
