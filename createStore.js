import isPlainObject from "lodash/isPlainObject";
import $$observable from "symbol-observable";

/**
 * Redux的私有action types, 这个目的是为了让所有reducer(状态树的子节点)
 */
export var ActionTypes = {
    INIT: '@@redux/INIT'
}

/**
 * 创建一个redux store去保存状态树
 * 只能通过dispatch去改变store的数据
 *
 * 整一个App只能有一个state
 * 状态树通过combineReducers方法合并多个reducers
 * 这里的多个reducers就是store状态树的子节点
 *
 * 这是初始化的状态树, (可选参数), 这里目的说白了是为了允许服务端渲染, 也就是说开发者可以
 * 保存整个状态树到localStorage或者服务端, 这样的话用户在刷新页面以后也能恢复之前的页面状态
 *
 * todo: enhancer 是 applyMiddleware的结果
 */
export default function createStore(reducer, preloadedState, enhancer) {
    /**
     * 这个部分的写法为了方法重载,
     * 即: createStore(reducer, enhancer)
     */
    if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
        enhancer = preloadedState
        preloadedState = undefined
    }

    /**
     * 如果满足下面条件, 则方法重载成这样:
     * createStore(reducer, enhancer)
     */
    if (typeof enhancer !== 'undefined') {
        if (typeof enhancer !== 'function') {
            throw new Error('Expected the enhancer to be a function.')
        }

        /**
         * enhancer装饰增强createStore
         * 其实只是一个依赖反转的写法
         */
        return enhancer(createStore)(reducer, preloadedState)
    }

    /**
     * 如果程序执行到这个部分, 重载成如下方法
     * createStore(reducer, preloadedState), 也就是服务端渲染好的store
     */
    if (typeof reducer !== 'function') {
        throw new Error('Expected the reducer to be a function.')
    }

    /**
     * 初始化内部变量, 后续只使用这里定义的变量
     */
    var currentReducer = reducer
    var currentState = preloadedState
    var currentListeners = []
    var nextListeners = currentListeners
    var isDispatching = false

    function ensureCanMutateNextListeners() {
        if (nextListeners === currentListeners) {
            nextListeners = currentListeners.slice()
        }
    }

    /**
     * 获取当前redux的根state
     */
    function getState() {
        return currentState
    }

    /**
     * 当开发者dispatch一个action的时候, 监听函数会被触发.
     * 状态树潜在被修改的可能
     * TODO: listener的第一个参数会是getState()
     * 这样可以读取当前状态树

     *
     * 开发者可以在监听函数中调用dispatch
     * You may call `dispatch()` from a change listener, with the following
     * caveats:
     *
     * 1. The subscriptions are snapshotted just before every `dispatch()` call.
     * If you subscribe or unsubscribe while the listeners are being invoked, this
     * will not have any effect on the `dispatch()` that is currently in progress.
     * However, the next `dispatch()` call, whether nested or not, will use a more
     * recent snapshot of the subscription list.
     *
     * 2. The listener should not expect to see all state changes, as the state
     * might have been updated multiple times during a nested `dispatch()` before
     * the listener is called. It is, however, guaranteed that all subscribers
     * registered before the `dispatch()` started will be called with the latest
     * state by the time it exits.
     *
     * @param {Function} listener A callback to be invoked on every dispatch.
     * @returns {Function} A function to remove this change listener.
     */

    /**
     * 订阅函数, 当dispatch action的时候被触发
     * 有点柯里化的味道
     */
    function subscribe(listener) {
        /**
         * 如果订阅函数不是function,
         * 报警
         */
        if (typeof listener !== 'function') {
            throw new Error('Expected listener to be a function.')
        }

        /**
         * 标识订阅函数调用中,
         * 因为在某些情况. 开发者可能重复unsubscribe从而要么浪费再次寻找剔除监听列表
         * 要么容易报错
         */
        var isSubscribed = true

        /**
         * TODO: WHY
         */
        ensureCanMutateNextListeners()

        /**
         * 把订阅函数放到监听函数队列中
         */
        nextListeners.push(listener)

        /**
         * 这里返回去掉订阅,
         * 这种方式非常常见
         * 提供了一个钩子让开发者可以根据场景去掉订阅
         * 需求: 加入日志, 记录用户姓名变更的事件
         * 例子:
         *
         * let currentValue;
         * const unsubscribeLogger = store.subscribe(function loggerListener(){
         *      //赋值之前的值
         *      const previousValue = currentValue;
         *      //获取当前用用户姓名
         *      currentValue = store.getState().person.name;
         *      //比较是否发生变更
         *      if (previousValue !== currentValue) {
         *        console.log('用户名变更了, 从${previousValue}更新成${currentValue})
         *      }
         * })
         *
         */
        return function unsubscribe() {
            /**
             * 如果当前订阅函数的状态是取消订阅
             * 当开发者重复调用当前函数这样判断有必要
             * 直接退出函数
             */
            if (!isSubscribed) {
                return
            }

            /**
             * 订阅状态改成取消订阅
             */
            isSubscribed = false

            /**
             * TODO:
             */
            ensureCanMutateNextListeners()

            /**
             * 在订阅函数的队列中移除当前订阅函数
             */
            var index = nextListeners.indexOf(listener)
            nextListeners.splice(index, 1)
        }
    }

    /**
     * dispatch分发一个action, 这是修改状态树的唯一途径
     *
     * 这里的底层实现只支持纯对象, 如果你想dispatch分发一个promise, Observable等,
     * 想深入更多可以参考redux-thunk中间件,
     * 这个中间件最终会dispatch一个纯对象
     *
     * 以上说的纯对象仅仅只是默认情况, 大多数来说, 都会被中间件覆盖从而替换下面的dispatch方法
     *
     */
    function dispatch(action) {
        /**
         * 如果参数action不是纯对象,
         * 报警
         */
        if (!isPlainObject(action)) {
            throw new Error(
                'Actions must be plain objects. ' +
                'Use custom middleware for async actions.'
            )
        }
        /**
         * 如果action未定义,
         * 报警
         */
        if (typeof action.type === 'undefined') {
            throw new Error(
                'Actions may not have an undefined "type" property. ' +
                'Have you misspelled a constant?'
            )
        }

        /**
         * 如果当前处于dispatching状态, 也就是分发中, 报警
         * 这个的原因我也小小的纠结了一下, 其实这里是为了防止reducer内再次dispatch
         * 一旦允许reducer内dispatch, 将进入死循环
         */
        if (isDispatching) {
            throw new Error('Reducers may not dispatch actions.')
        }

        /**
         * 遍历执行reducer,
         * 这里用finally是为了容错,即使报异常, dispatch也能重置回false
         */
        try {
            /**
             * 设置dispatch状态为true
             */
            isDispatching = true
            currentState = currentReducer(currentState, action)
        } finally {
            /**
             * 重置dispatch状态
             */
            isDispatching = false
        }

        var listeners = currentListeners = nextListeners


        /**
         * 执行所有的listener, 这样开发者只要发生dispatch, 且state更新后就能或者通知
         */
        for (var i = 0; i < listeners.length; i++) {
            listeners[i]()
        }

        return action
    }

    /**
     * 这个不常见, 但是主要目的是为了按需加载
     * 在按需加载的情况下, reducer可以通过按需替换新的reducer
     * 替换之后, 让新的reducer, 子state分支获取初始化的值
     */
    function replaceReducer(nextReducer) {
        if (typeof nextReducer !== 'function') {
            throw new Error('Expected the nextReducer to be a function.')
        }

        currentReducer = nextReducer
        /**
         * 初始化新的reducer的状态
         */
        dispatch({type: ActionTypes.INIT})
    }

    /**
     * 新的ECMAScript观察模式,
     * 新增未使用, 暂不注释
     * https://github.com/zenparsing/es-observable
     */
    function observable() {
        var outerSubscribe = subscribe
        return {
            /**
             * The minimal observable subscription method.
             * @param {Object} observer Any object that can be used as an observer.
             * The observer object should have a `next` method.
             * @returns {subscription} An object with an `unsubscribe` method that can
             * be used to unsubscribe the observable from the store, and prevent further
             * emission of values from the observable.
             */
            subscribe(observer) {
                if (typeof observer !== 'object') {
                    throw new TypeError('Expected the observer to be an object.')
                }

                function observeState() {
                    if (observer.next) {
                        observer.next(getState())
                    }
                }

                observeState()
                var unsubscribe = outerSubscribe(observeState)
                return {unsubscribe}
            },

            [$$observable]() {
                return this
            }
        }
    }

    /**
     * 在创建store的使用, 初始化state, 让state树
     */
    dispatch({type: ActionTypes.INIT})

    return {
        dispatch,
        subscribe,
        getState,
        replaceReducer,
        [$$observable]: observable
    }
}
