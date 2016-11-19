import compose from "./compose";

export default function applyMiddleware(...middlewares) {
    return (createStore) => (reducer, preloadedState, enhancer) => {
        /**
         * 核心对象, 涵盖一下方法
         * dispatch: 分发方法
         * getState: 获取根状态树
         * replaceReducer: 替换reducer
         * subscribe: 订阅方法, 观察者模式用于广播
         */
        var store = createStore(reducer, preloadedState, enhancer);

        /**
         * 分发函数, 用于分发action
         */
        var dispatch = store.dispatch;
        var chain = [];

        /**
         * 定义一个中间件接口参数
         * 这里我们可以借鉴一下,
         * 大多数情况下中间件尽可能的独立, 但是为了适配复杂的业务场景
         * 作者在这里传入getState让开发者可以通过这个参数拿到状态树对象
         *
         * 在这里, 作者做了一个小技巧的优化吧,
         * getState的类型实际上是function, 并非状态树对象本身
         * 为了减少对状态树的过多直接索引从而优化内存,
         * 所以只有当真的需要获取状态树的时候才去执行getState(),
         * 但大多数情况下不需要状态树对象, 所以这里设计有点懒加载(懒引用)的思路
         */
        var middlewareAPI = {getState: store.getState, dispatch: (action) => dispatch(action)}

        /**
         * 作者加工了所有的中间件(Middleware),
         * 传入了一个对象: {getState, dispatch}
         * 所以所有的中间件能直接使用getState和dispatch参数
         *
         * 注意: 这里的中间件只是运行了第一层函数, 并传入middlewareAPI
         */
        chain = middlewares.map(middleware => middleware(middlewareAPI))

        /**
         * 这里有点坑, 我觉得store.dispatch可以简写成dispatch(因为第9行定义了)
         * 这里执行了中间件第二层函数, 并传入dispatch分发函数
         *
         * 注意这里返回的是<左边>的中间件
         */
        dispatch = compose(...chain)(store.dispatch);

        /**
         * 替换一个新的state,
         * 更新dispatch, 使用最左边那个middleware (因为函数式)
         */
        return {
            ...store,
            dispatch
        }
    }
}
