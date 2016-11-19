/**
 * 这个中间件的目的是处理异步函数,
 * 为了保证函数最后dispatch的action是纯对象
 * 也就是说reducer拿到的action必须纯粹!!!
 */

/**
 * 创建中间件thunk
 */
function createThunkMiddleware(extraArgument) {
    /**
     * 这里可能对于新手来说, 有点绕, 我直接修改了一下源码, 去掉了箭头, 但是执行过程一毛一样
     *
     * 第一层function会被applyMiddleware作为参数调用, 并传入 {dispatch, getState}
     * dispatch是分发函数
     * getState可以获得总的状态树对象
     */
    return ({dispatch, getState}) => {



        return (next) => {
            /**
             * 这里获得的action其实就是开发者写的一个action
             * 下面代码根据action的特征, 例如: 是一个function则再次调用该方法
             */
            return (action) => {
                /**
                 * 判断如果当前是function,那么
                 * 执行function
                 */
                if (typeof action === 'function') {
                    return action(dispatch, getState, extraArgument);
                }
                return next(action);
            }
        }
    }
}

const thunk = createThunkMiddleware();
thunk.withExtraArgument = createThunkMiddleware;

export default thunk;
