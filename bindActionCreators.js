/**
 * 给每一个action绑定一个dispatch
 * 那么下一次使用的时候就能直接调用
 * 不需要显式的去dispatch
 * 这样做的好处是让开发更纯粹,
 * 可以理解成面向的是抽象的事件, 细节redux在背后帮我们处理了
 */
function bindActionCreator(actionCreator, dispatch) {
    return (...args) => dispatch(actionCreator(...args))
}

/**
 * 其实也就是一个组合的action对象
 * 遍历对象中的方法, 然后给他们包一层dispatch
 */
export default function bindActionCreators(actionCreators, dispatch) {
    /**
     * 如果是一个函数,
     * 直接调用包一层dispatch
     */
    if (typeof actionCreators === 'function') {
        return bindActionCreator(actionCreators, dispatch)
    }

    /**
     * 如果是对象, 报警
     */
    if (typeof actionCreators !== 'object' || actionCreators === null) {
        throw new Error(
            `bindActionCreators expected an object or a function, instead received ${actionCreators === null ? 'null' : typeof actionCreators}. ` +
            `Did you write "import ActionCreators from" instead of "import * as ActionCreators from"?`
        )
    }

    var keys = Object.keys(actionCreators)
    var boundActionCreators = {}
    /**
     * 遍历对象的所有属性(方法), 包裹一层dispatch
     */
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i]
        var actionCreator = actionCreators[key]
        if (typeof actionCreator === 'function') {
            boundActionCreators[key] = bindActionCreator(actionCreator, dispatch)
        }
    }
    return boundActionCreators
}
