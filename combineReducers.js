import {ActionTypes} from "./createStore";
import isPlainObject from "lodash/isPlainObject";
import warning from "./utils/warning";


/**
 * 获得undefined state错误信息
 */
function getUndefinedStateErrorMessage(key, action) {
    var actionType = action && action.type
    var actionName = actionType && `"${actionType.toString()}"` || 'an action'

    return (
        `Given action ${actionName}, reducer "${key}" returned undefined. ` +
        `To ignore an action, you must explicitly return the previous state.`
    )
}

/**
 * 获得未知状态警告信息
 */
function getUnexpectedStateShapeWarningMessage(inputState/*状态树*/, reducers, action, unexpectedKeyCache) {
    /**
     * 获取reducers的reducer名
     */
    var reducerKeys = Object.keys(reducers)

    var argumentName = action && action.type === ActionTypes.INIT ?
        'preloadedState argument passed to createStore' :
        'previous state received by the reducer'

    /**
     * 如果没有设置任何的reducers
     */
    if (reducerKeys.length === 0) {
        return (
            'Store does not have a valid reducer. Make sure the argument passed ' +
            'to combineReducers is an object whose values are reducers.'
        )
    }

    /**
     * 如果状态树不是纯对象
     */
    if (!isPlainObject(inputState)) {
        return (
            `The ${argumentName} has unexpected type of "` +
            ({}).toString.call(inputState).match(/\s([a-z|A-Z]+)/)[1] +
            `". Expected argument to be an object with the following ` +
            `keys: "${reducerKeys.join('", "')}"`
        )
    }

    /**
     * 检查当前总状态有没有子reducers
     */
    var unexpectedKeys = Object.keys(inputState).filter(key =>
        !reducers.hasOwnProperty(key) && !unexpectedKeyCache[key]
    )

    /**
     * 修改传入的unexpectedKeyCache,
     * 在这个对象内标识非法的子节点名
     * 例如:
     * unexpectedKeyCache:{
   *    reducer1:true,
   *    reducer2:true,
   *    reducer3:true,
   * }
     *
     * reducer1, reducer2, reducer3都是非法节点
     */
    unexpectedKeys.forEach(key => {
        unexpectedKeyCache[key] = true
    })

    /**
     * 存在非法子状态
     */
    if (unexpectedKeys.length > 0) {
        return (
            `Unexpected ${unexpectedKeys.length > 1 ? 'keys' : 'key'} ` +
            `"${unexpectedKeys.join('", "')}" found in ${argumentName}. ` +
            `Expected to find one of the known reducer keys instead: ` +
            `"${reducerKeys.join('", "')}". Unexpected keys will be ignored.`
        )
    }
}

/**
 * 断言reducer是正常的
 */
function assertReducerSanity(reducers) {
    /**
     * 遍历所有的reducers
     */
    Object.keys(reducers).forEach(key => {
        var reducer = reducers[key]
        /**
         * 获取reducer的默认状态
         */
        var initialState = reducer(undefined, {type: ActionTypes.INIT})

        /**
         * 如果默认状态未定义, 说白了, 传一个`非法`state
         * 报警
         */
        if (typeof initialState === 'undefined') {
            throw new Error(
                `Reducer "${key}" returned undefined during initialization. ` +
                `If the state passed to the reducer is undefined, you must ` +
                `explicitly return the initial state. The initial state may ` +
                `not be undefined.`
            )
        }

        /**
         * 创建一个随机action类型
         */
        var type = '@@redux/PROBE_UNKNOWN_ACTION_' + Math.random().toString(36).substring(7).split('').join('.')

        /**
         * 如果默认状态未定义, 说白了, 传一个`非法`action类型
         */
        if (typeof reducer(undefined, {type}) === 'undefined') {
            throw new Error(
                `Reducer "${key}" returned undefined when probed with a random type. ` +
                `Don't try to handle ${ActionTypes.INIT} or other actions in "redux/*" ` +
                `namespace. They are considered private. Instead, you must return the ` +
                `current state for any unknown actions, unless it is undefined, ` +
                `in which case you must return the initial state, regardless of the ` +
                `action type. The initial state may not be undefined.`
            )
        }
    })
}

/**
 * 把多个reducers合并成一个对象
 * 所有的子reducer都会被遍历, 并获得一个状态对象
 *
 * @returns {Function} 这里最终会返回一个状态, 状态名会与reducer的名字一致
 */
export default function combineReducers(reducers) {
    /**
     * reducers总个数
     */
    var reducerKeys = Object.keys(reducers)
    var finalReducers = {}


    /**
     * 这个循环的目的为了过滤提取出合法的reducers
     */
    for (var i = 0; i < reducerKeys.length; i++) {
        var key = reducerKeys[i]

        /**
         * 在开发环境下使用redux能得到相应的, 这里也劝诫开发者使用production的node环境变量来发布
         */

        /**
         * 如果是发布环境
         */
        if (process.env.NODE_ENV !== 'production') {
            if (typeof reducers[key] === 'undefined') {
                warning(`No reducer provided for key "${key}"`)
            }
        }

        /**
         * 如果当前reducer是function, 即合法的reducer
         * 加入finalReducers对象中
         */
        if (typeof reducers[key] === 'function') {
            finalReducers[key] = reducers[key]
        }
    }

    /**
     * 合法reducers所有对象名,
     * 例如:
     *     {
   *        reducer1: function(state,action){...}
   *        reducer2: function(state,action){...}
   *     }
     *
     * Object.keys(<上面对象>)返回['reducer1','reducer2']
     * 返回array的数组名
     */
    var finalReducerKeys = Object.keys(finalReducers)

    /**
     * 在开发环境下初始化unexpectedKeyCache对象,
     * 这里萌萌哒的定义了一个变量,
     * 作用域在combineReducers(reducers)下, 且变量提前,
     * unexpectedKeyCache变量外部可以在函数下都能访问
     */
    if (process.env.NODE_ENV !== 'production') {
        var unexpectedKeyCache = {}
    }
    /**
     * 合法错误
     */
    var sanityError
    try {
        /**
         * 断言判定reducer内是否存在不合法的reducer
         */
        assertReducerSanity(finalReducers)
    } catch (e) {
        /**
         * 合法错误赋值给sanityError
         */
        sanityError = e
    }

    /**
     * 返回一个组合函数
     */
    return function combination(state = {}, action) {
        /**
         * 如果任意reducer存在异常
         */
        if (sanityError) {
            /**
             * 继续向上层抛异常
             */
            throw sanityError
        }

        /**
         * 在开发环境下
         * 检查是否有非法状态形态,
         * 如果存在报警告信息
         */
        if (process.env.NODE_ENV !== 'production') {
            /**
             * 获取警告信息
             */
            var warningMessage = getUnexpectedStateShapeWarningMessage(state, finalReducers, action, unexpectedKeyCache)
            if (warningMessage) {
                warning(warningMessage)
            }
        }

        /**
         * 定义变量hasChanged, 表示是否发生变更 TODO:什么是否变更
         */
        var hasChanged = false

        /**
         * 记录下一个状态的变量 TODO:什么
         */
        var nextState = {}


        /**
         * combineReducers的核心代码,
         * 状态树下的子节点即为reducer的名字
         * 状态树结构如下: (子节点使用reducer名, 类型实际是对象)
         * <图例1>
         * state
         * ---------reducer1
         * ---------reducer2
         * --------------------reducer2.1
         * --------------------reducer2.2
         * ---------reducer3
         * ---------reducer4
         * ...
         */

        /**
         * 遍历合法reducers
         */
        for (var i = 0; i < finalReducerKeys.length; i++) {
            /**
             * reducer对象名
             */
            var key = finalReducerKeys[i]
            /**
             * 当前reducer
             */
            var reducer = finalReducers[key]

            /**
             * previousStateForKey相当于图例上的reducer1
             */
            var previousStateForKey = state[key]

            /**
             * 执行开发者编写的reducer, 并会获得新的reducer1对象, 即获得新的状态对象
             */
            var nextStateForKey = reducer(previousStateForKey, action)
            /**
             * 判断新的状态对象
             */
            if (typeof nextStateForKey === 'undefined') {
                /**
                 * 由于状态对象是空, 获取警告信息
                 */
                var errorMessage = getUndefinedStateErrorMessage(key, action)
                /**
                 *  向上抛异常
                 */
                throw new Error(errorMessage)
            }
            /**
             * 赋值到新的state中
             */
            nextState[key] = nextStateForKey

            /**
             * 是否有存在变更
             * 其中一个判断条件检查这一轮的action有没有修改状态
             * 换句话说action是否有弄脏该数据
             */
            hasChanged = hasChanged || nextStateForKey !== previousStateForKey
        }
        /**
         * 如果是脏数据, 返回新的状态树, 反之继续使用之前的状态
         */
        return hasChanged ? nextState : state
    }
}
