/**
 *
 * 其实compose在这里运用了函数式的一个思想,
 * return的结果还是一个函数, 也就是说交给后面处理
 * 执行顺序从右到左, 目的只是为了表示下面这个函数表达式
 * 或者说初衷数学(...args) => f(g(h(...args)))
 * 也就是说 h作用于...args, 返回结果交给g继续让g作用...
 */

export default function compose(...funcs) {
    /**
     * 如果参数function为空, 返回 return function args(){return args}
     * 在这里arg就是store.dispatch
     * 在外部会传入一个store.dispatch, 意思就是如果没有中间件
     * 直接选用默认的store.dispatch返回
     */
    if (funcs.length === 0) {
        return arg => arg
    }

    /**
     * 如果只有一个参数, 直接返回这个参数函数
     * 也就是直接返回这个中间件
     */
    if (funcs.length === 1) {
        return funcs[0]
    }

    /**
     * 假如传入参数一共4个
     * [func0,func1,func2,func3]
     */

    /**
     * 指向最后一个中间件函数
     * last=func3
     */
    const last = funcs[funcs.length - 1]
    /**
     * 获取除了最后一个的所有参数函数
     * rest=[func0,func1,func2]
     */
    const rest = funcs.slice(0, -1)

    /**
     * 函数式, 相当于:
     * return function(...args) {
     *     return func0(func1(func2(func3(...args))))
     * }
     * 注意: 这里最终返回func0
     */
    return (...args) => rest.reduceRight((composed, f) => f(composed), last(...args))
}
