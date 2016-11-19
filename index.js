import createStore from "./redux/src/createStore";
import combineReducers from "./redux/src/combineReducers";
import bindActionCreators from "./redux/src/bindActionCreators";
import applyMiddleware from "./redux/src/applyMiddleware";
import compose from "./redux/src/compose";
import warning from "./redux/src/utils/warning";

/*
 * 只能说作者很贴心,
 * Redux内部模块使用了一些process.env.NODE_ENV !== 'production'
 * 在这些地方, redux检查action, reducer, 操作store等是否合法,
 * 同时报错, 让开发者知道他们这样使用action或者reducer是非常且违反redux初衷的.
 *
 * 但是在发布环境下, 这些信息不需要, 因为开发阶段已经确保一切正常,
 * 所以当项目正式发布的时候, 一般来说非对象内部方法的方法名都会被压缩,
 * 而且下面代码很机智的检查用户是否有按照redux的要求在发布时设置项目node运行变量为'production',
 * 因为如果没有的话<isCrushed>会变压缩变成别的名字, 但redux却找不到预期的运行变量'production'
 * 那么内部模块不会被最优压缩!
 */


/**
 * 随意定义一个函数,
 * 目的标识是否处于发布状态
 */
function isCrushed() {
}

/**
 * 如果:
 * node运行变量NODE_ENV是production,
 * 而且
 * isCrushed.name是字符串类型, (这里本人有点疑惑, 觉得这句话没有必要, 估计是我没想到作者考虑的场景)
 * 而且
 * isCrushed.name !== 'isCrushed' (因为压缩后, isCrushed命名改变, 所以可以根据这个判断是否压缩)
 */
if (
    process.env.NODE_ENV !== 'production' &&
    typeof isCrushed.name === 'string' &&
    isCrushed.name !== 'isCrushed'
) {
    warning(
        'You are currently using minified code outside of NODE_ENV === \'production\'. ' +
        'This means that you are running a slower development build of Redux. ' +
        'You can use loose-envify (https://github.com/zertosh/loose-envify) for browserify ' +
        'or DefinePlugin for webpack (http://stackoverflow.com/questions/30030031) ' +
        'to ensure you have the correct code for your production build.'
    )
}

/**
 * redux所以对外方法在这里暴露
 */
export {
    createStore,
    combineReducers,
    bindActionCreators,
    applyMiddleware,
    compose
}
