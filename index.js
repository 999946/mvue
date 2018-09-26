import camelcase from 'camelcase';
import set from 'lodash.set';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) {
  return typeof obj;
} : function (obj) {
  return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
};

var classCallCheck = function (instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
};

var createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var defineProperty = function (obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
};

var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var objectWithoutProperties = function (obj, keys) {
  var target = {};

  for (var i in obj) {
    if (keys.indexOf(i) >= 0) continue;
    if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
    target[i] = obj[i];
  }

  return target;
};

/**
 * Make a map and return a function for checking if a key
 * is in that map.
 */
function makeMap(str, expectsLowerCase) {
    var map = Object.create(null);
    var list = str.split(',');
    for (var i = 0; i < list.length; i++) {
        map[list[i]] = true;
    }
    return expectsLowerCase ? function (val) {
        return map[val.toLowerCase()];
    } : function (val) {
        return map[val];
    };
}

/**
 * Check if a tag is a built-in tag.
 */
var isBuiltInTag = makeMap('slot,component', true);

/**
 * Check if a attribute is a reserved attribute.
 */
var isReservedAttribute = makeMap('key,ref,slot,is');

/**
 * 封装小程序原生的 triggerEvent 方法，
 * @param {String} eventName 自定义事件名称
 * @param {Event} event 小程序原生事件
 * @param {Object} options 小程序原生触发事件的选项
 */
var $emit = function $emit(eventName, detail, options) {
  // console.log('emit --- > ', eventName, camelcase(eventName), detail)
  // 小程序中triggerEvent 名称'foo-bar' 需转换为 'fooBar'才能正常触发
  this.triggerEvent(camelcase(eventName), {
    __emit: true,
    detail: detail
  }, options);
};

// 小程序内部属性的判断正则
var innerAttrRe = /^__.*__$/;

// Vue 还多支持了 Function 和 Symbol 类型
var TYPES = [String, Number, Boolean, Object, Array, null];

var COMMON_PROP = {
    enumerable: true,
    configurable: true
};

var _toString$1 = Object.prototype.toString;

// 每个对象上挂载自己路径前缀的 key
var __TUA_PATH__ = '__TUA_PATH__';

// 每个对象上挂载自己的依赖对象
var __dep__ = '__dep__';

// 被框架占用的关键字，在 data 和 computed 中如果使用这些关键字，将会抛出错误
var reservedKeys = ['$data', '$emit', '$computed', __TUA_PATH__];

var isFn = function isFn(fn) {
    return typeof fn === 'function';
};

var hasProtoInObj = function hasProtoInObj(obj) {
    return '__proto__' in obj;
};

var isNotInnerAttr = function isNotInnerAttr(key) {
    return !innerAttrRe.test(key);
};

var toRawType = function toRawType(value) {
    return _toString$1.call(value).slice(8, -1);
};

var isPlainObject$1 = function isPlainObject(value) {
    return _toString$1.call(value) === '[object Object]';
};

// 根据路径前缀和 key 得到当前路径
var getPathByPrefix = function getPathByPrefix(prefix, key) {
    return prefix === '' ? key : prefix + '.' + key;
};

/**
 * 将 source 上的属性代理到 target 上
 * @param {Object} source 被代理对象
 * @param {Object} target 被代理目标
 */
var proxyData = function proxyData(source, target) {
    Object.keys(source).forEach(function (key) {
        Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key));
    });
};

/**
 * 将对象属性路径字符串转换成路径数组
 * @param {String} str
 * @returns {Array}
 */
var pathStr2Arr = function pathStr2Arr(str) {
    return str.split('.').map(function (x) {
        return x.split(/\[(.*?)\]/).filter(function (x) {
            return x;
        });
    }).reduce(function (acc, cur) {
        return acc.concat(cur);
    }, []);
};

/**
 * 根据 path 获取目标对象 obj 上的值
 * @param {Object} obj 目标对象
 * @param {String} path 路径字符串
 * @returns {Any} obj
 */
var getValByPath = function getValByPath(obj) {
    return function (path) {
        return pathStr2Arr(path).reduce(function (acc, cur) {
            return acc[cur];
        }, obj);
    };
};

/**
 * 根据 path 将目标值 val 设置到目标对象 obj 上
 * @param {Object} obj 目标对象
 * @param {String} path 路径字符串
 * @param {any} val 目标值
 * @param {Boolean} isCheckDef 是否检查属性已定义
 */
var setObjByPath = function setObjByPath(_ref) {
    var obj = _ref.obj,
        path = _ref.path,
        val = _ref.val,
        _ref$isCheckDef = _ref.isCheckDef,
        isCheckDef = _ref$isCheckDef === undefined ? false : _ref$isCheckDef;
    return pathStr2Arr(path).reduce(function (acc, cur, idx, arr) {
        // 在调用 setData 时，有的属性可能没定义
        if (isCheckDef && acc[cur] === undefined) {
            var parentStr = arr.slice(0, idx).reduce(function (acc, cur) {
                return (/\d/.test(cur) ? acc + '[' + cur + ']' : acc + '.' + cur
                );
            }, 'this');

            error('Property "' + cur + '" is not found in "' + parentStr + '": ' + 'Make sure that this property has initialized in the data option.');
        }

        if (idx === arr.length - 1) {
            acc[cur] = val;
            return;
        }

        // 当前中间属性在目标对象上并不存在
        if (!acc[cur]) {
            acc[cur] = /\d/.test(cur) ? [] : {};
        }

        return acc[cur];
    }, obj);
};

/**
 * 使用函数的名称字符串来检查内置的类型
 * 因为简单的相等检查，在不同的 vms 或 iframes 中运行时会判断错误
 */
var getType = function getType(fn) {
    var match = fn && fn.toString().match(/^\s*function (\w+)/);

    return match ? match[1] : '';
};

/**
 * 断言值的类型是否匹配
 * @param {any} value 值
 * @param {Function} type 类型函数
 */
var assertType = function assertType(value, type) {
    var valid = void 0;
    var expectedType = getType(type);

    if (/(String|Number|Boolean)/.test(expectedType)) {
        var t = typeof value === 'undefined' ? 'undefined' : _typeof(value);
        valid = t === expectedType.toLowerCase();

        // 例如 new Number(1)
        if (!valid && t === 'object') {
            valid = value instanceof type;
        }
    } else if (expectedType === 'Object') {
        valid = isPlainObject$1(value);
    } else if (expectedType === 'Array') {
        valid = Array.isArray(value);
    } else {
        valid = value instanceof type;
    }

    return { valid: valid, expectedType: expectedType };
};

/**
 * 统一的日志输出函数，在测试环境时不输出
 * @param {String} type 输出类型 log|warn|error
 * @param {any} out 输出的内容
 */
var logByType = function logByType(type) {
    return function () {
        var _console;

        /* istanbul ignore next */
        (_console = console)[type].apply(_console, arguments);
    };
};

var log = logByType('log');
var warn$1 = logByType('warn');
var error = logByType('error');

// reserved keys
var isReservedKeys = function isReservedKeys(str) {
    return reservedKeys.indexOf(str) !== -1;
};
var getObjHasReservedKeys = function getObjHasReservedKeys(obj) {
    return Object.keys(obj).filter(isReservedKeys);
};

// 检查在 data、computed、methods 中是否使用了保留字
var checkReservedKeys = function checkReservedKeys(data, computed, methods) {
    var reservedKeysInVm = getObjHasReservedKeys(data).concat(getObjHasReservedKeys(computed)).concat(getObjHasReservedKeys(methods)).join(', ');

    if (reservedKeysInVm) {
        throw Error('\u8BF7\u52FF\u5728 data\u3001computed\u3001methods ' + ('\u4E2D\u4F7F\u7528\u4E0B\u5217\u4FDD\u7559\u5B57:\n ' + reservedKeysInVm));
    }
};

/**
 * 在对象上定义属性
 * @param {String} key 属性名
 * @param {any} value 值
 * @param {Object} target 对象
 */
var def = function def(key) {
    return function (_ref2) {
        var value = _ref2.value,
            _ref2$enumerable = _ref2.enumerable,
            enumerable = _ref2$enumerable === undefined ? false : _ref2$enumerable,
            _ref2$configurable = _ref2.configurable,
            configurable = _ref2$configurable === undefined ? true : _ref2$configurable,
            rest = objectWithoutProperties(_ref2, ['value', 'enumerable', 'configurable']);
        return function (target) {
            Object.defineProperty(target, key, _extends({
                value: value,
                enumerable: enumerable,
                configurable: configurable
            }, rest));
        };
    };
};
var defDep = def(__dep__);
var defTuaPath = def(__TUA_PATH__);

/**
 * 断言 prop 的值是否有效
 * ps 小程序就没有 required 的概念
 * @param {Object} prop 定义
 * @param {Array|Function|null} prop.type 定义类型
 * @param {String} name 属性名称
 * @param {any} value 实际值
 * @return {Boolean} 是否有效
 */
var assertProp = function assertProp(_ref) {
    var prop = _ref.prop,
        name = _ref.name,
        value = _ref.value;

    if (value == null) return true;

    var expectedTypes = [];
    var type = prop.type;

    var valid = !type;

    if (type) {
        var typeList = !Array.isArray(type) ? [type] : type;

        typeList.forEach(function (type) {
            var _assertType = assertType(value, type),
                newValid = _assertType.valid,
                expectedType = _assertType.expectedType;

            expectedTypes.push(expectedType);
            valid = newValid;
        });
    }

    if (!valid) {
        warn$1('Invalid prop: type check failed for prop "' + name + '".' + (' Expected ' + expectedTypes.join(', ')) + (', got ' + toRawType(value) + '.'));
    }

    return valid;
};

/**
 * 生成组件的 observer 函数
 * @param {String} name 名称
 * @param {Object} prop 类型定义对象（透传给 assertProp）
 * @param {Array|Function|null} prop.type 定义类型
 */
var getObserver = function getObserver(name) {
    return function (prop) {
        return function observer(value) {
            var _this = this;

            // 触发 setter
            Promise.resolve().then(function () {
                _this[name] = value;
            });

            var valid = assertProp({ prop: prop, name: name, value: value });
            var validator = prop.validator;


            if (validator && !validator(value)) {
                warn$1('Invalid prop: custom validator check failed for prop "' + name + '".');
                return false;
            }

            return valid;
        };
    };
};

/**
 * 生成完整单个 prop 对象
 * @param {String} name 名称
 * @param {String|Number|Boolean|Object|Array|null} type 类型
 * @param {any} value 值
 * @param {Object} propObj 类型定义对象（透传给 assertProp）
 * @param {Array|Function|null} propObj.type 定义类型
 */
var getPropObj = function getPropObj(_ref2) {
    var name = _ref2.name,
        type = _ref2.type,
        value = _ref2.value,
        propObj = _ref2.propObj;
    return defineProperty({}, name, {
        type: type,
        value: value,
        observer: getObserver(name)(propObj)
    });
};

/**
 * 将 Vue 风格的 props 改写成小程序原生的 properties
 * @param {Array|Object} props
 */
var getPropertiesFromProps = function getPropertiesFromProps(props) {
    // 输入数组则转译成接受任意数据类型的 null
    if (Array.isArray(props)) {
        return props.map(function (name) {
            return getPropObj({
                name: name,
                type: null,
                propObj: { type: null }
            });
        }).reduce(function (acc, cur) {
            return _extends({}, acc, cur);
        }, {});
    }

    return Object.keys(props).map(function (name) {
        var prop = props[name];

        // 基本类型的直接返回
        if (TYPES.indexOf(prop) !== -1) {
            return getPropObj({
                name: name,
                type: prop,
                propObj: { type: prop }
            });
        }

        // 数组形式的 prop
        // 测试了下不支持直接简写或 type 是数组，只能手动检查了
        if (Array.isArray(prop)) {
            return getPropObj({
                name: name,
                type: null,
                propObj: { type: prop }
            });
        }

        // 对象形式的 prop
        return getPropObj({
            name: name,
            type: prop.type || null,
            value: isFn(prop.default) ? prop.default() : prop.default,
            propObj: prop
        });
    }).reduce(function (acc, cur) {
        return _extends({}, acc, cur);
    }, {});
};

var hackSetData = function hackSetData(vm) {
    if (vm.__setData__) return;

    var originalSetData = vm.setData;

    Object.defineProperties(vm, {
        'setData': {
            get: function get() {
                return function (newVal, cb) {
                    Object.keys(newVal).forEach(function (path) {
                        // 针对 vm 上的属性赋值
                        setObjByPath({ obj: vm, path: path, val: newVal[path], isCheckDef: true });

                        // 针对 vm.data 上的属性赋值
                        setObjByPath({ obj: vm.data, path: path, val: newVal[path] });
                    });

                    isFn(cb) && Promise.resolve().then(cb);
                };
            }
        },
        '__setData__': { get: function get() {
                return originalSetData;
            } }
    });
};

var version = "0.8.0";

var emptyObject = Object.freeze({});

/**
 * Get the raw type string of a value e.g. [object Object]
 */
var _toString$2 = Object.prototype.toString;

function toRawType$1(value) {
  return _toString$2.call(value).slice(8, -1);
}

/**
 * Strict object type check. Only returns true
 * for plain JavaScript objects.
 */
function isPlainObject$2(obj) {
  return _toString$2.call(obj) === '[object Object]';
}

/**
 * Make a map and return a function for checking if a key
 * is in that map.
 */
function makeMap$1(str, expectsLowerCase) {
  var map = Object.create(null);
  var list = str.split(',');
  for (var i = 0; i < list.length; i++) {
    map[list[i]] = true;
  }
  return expectsLowerCase ? function (val) {
    return map[val.toLowerCase()];
  } : function (val) {
    return map[val];
  };
}

/**
 * Check if a tag is a built-in tag.
 */
var isBuiltInTag$1 = makeMap$1('slot,component', true);

/**
 * Check if a attribute is a reserved attribute.
 */
var isReservedAttribute$1 = makeMap$1('key,ref,slot,slot-scope,is');

/**
 * Check whether the object has the property.
 */
var hasOwnProperty$1 = Object.prototype.hasOwnProperty;
function hasOwn$1(obj, key) {
  return hasOwnProperty$1.call(obj, key);
}

/**
 * Create a cached version of a pure function.
 */
function cached$1(fn) {
  var cache = Object.create(null);
  return function cachedFn(str) {
    var hit = cache[str];
    return hit || (cache[str] = fn(str));
  };
}

/**
 * Camelize a hyphen-delimited string.
 */
var camelizeRE$1 = /-(\w)/g;
var camelize$1 = cached$1(function (str) {
  return str.replace(camelizeRE$1, function (_, c) {
    return c ? c.toUpperCase() : '';
  });
});

/**
 * Simple bind polyfill for environments that do not support it... e.g.
 * PhantomJS 1.x. Technically we don't need this anymore since native bind is
 * now more performant in most browsers, but removing it would be breaking for
 * code that was able to run in PhantomJS 1.x, so this must be kept for
 * backwards compatibility.
 */

/* istanbul ignore next */
function polyfillBind(fn, ctx) {
  function boundFn(a) {
    var l = arguments.length;
    return l ? l > 1 ? fn.apply(ctx, arguments) : fn.call(ctx, a) : fn.call(ctx);
  }

  boundFn._length = fn.length;
  return boundFn;
}

function nativeBind(fn, ctx) {
  return fn.bind(ctx);
}

var bind$1 = Function.prototype.bind ? nativeBind : polyfillBind;

/**
 * Convert an Array-like object to a real Array.
 */
function toArray$2(list, start) {
  start = start || 0;
  var i = list.length - start;
  var ret = new Array(i);
  while (i--) {
    ret[i] = list[i + start];
  }
  return ret;
}

/**
 * Mix properties into target object.
 */
function extend$2(to, _from) {
  for (var _key in _from) {
    to[_key] = _from[_key];
  }
  return to;
}

/**
 * Perform no operation.
 * Stubbing args to make Flow happy without leaving useless transpiled code
 * with ...rest (https://flow.org/blog/2017/05/07/Strict-Function-Call-Arity/)
 */
function noop$1(a, b, c) {}

var warn$2 = noop$1;
var generateComponentTrace = noop$1; // work around flow check
var formatComponentName = noop$1;

{
  var classifyRE = /(?:^|[-_])(\w)/g;
  var classify = function classify(str) {
    return str.replace(classifyRE, function (c) {
      return c.toUpperCase();
    }).replace(/[-_]/g, '');
  };

  warn$2 = function warn(msg, vm) {
    var trace = vm ? generateComponentTrace(vm) : '';

    // if (config.warnHandler) {
    //   config.warnHandler.call(null, msg, vm, trace)
    // } else if (hasConsole && (!config.silent)) {
    console.error('[Vue warn]: ' + msg + trace);
    // }
  };

  formatComponentName = function formatComponentName(vm, includeFile) {
    if (vm.$root === vm) {
      return '<Root>';
    }
    var options = typeof vm === 'function' && vm.cid != null ? vm.options : vm._isVue ? vm.$options || vm.constructor.options : vm || {};
    var name = options.name || options._componentTag;
    var file = options.__file;
    if (!name && file) {
      var match = file.match(/([^/\\]+)\.vue$/);
      name = match && match[1];
    }

    return (name ? '<' + classify(name) + '>' : '<Anonymous>') + (file && includeFile !== false ? ' at ' + file : '');
  };

  var repeat = function repeat(str, n) {
    var res = '';
    while (n) {
      if (n % 2 === 1) res += str;
      if (n > 1) str += str;
      n >>= 1;
    }
    return res;
  };

  generateComponentTrace = function generateComponentTrace(vm) {
    if (vm._isVue && vm.$parent) {
      var tree = [];
      var currentRecursiveSequence = 0;
      while (vm) {
        if (tree.length > 0) {
          var last = tree[tree.length - 1];
          if (last.constructor === vm.constructor) {
            currentRecursiveSequence++;
            vm = vm.$parent;
            continue;
          } else if (currentRecursiveSequence > 0) {
            tree[tree.length - 1] = [last, currentRecursiveSequence];
            currentRecursiveSequence = 0;
          }
        }
        tree.push(vm);
        vm = vm.$parent;
      }
      return '\n\nfound in\n\n' + tree.map(function (vm, i) {
        return '' + (i === 0 ? '---> ' : repeat(' ', 5 + i * 2)) + (Array.isArray(vm) ? formatComponentName(vm[0]) + '... (' + vm[1] + ' recursive calls)' : formatComponentName(vm));
      }).join('\n');
    } else {
      return '\n\n(found in ' + formatComponentName(vm) + ')';
    }
  };
}

var ASSET_TYPES = ['component', 'directive', 'filter'];

var LIFECYCLE_HOOKS = ['beforeCreate', 'created', 'beforeMount', 'mounted', 'beforeUpdate', 'updated', 'beforeDestroy', 'destroyed', 'activated', 'deactivated', 'onLoad', 'onReady', 'onShow', 'onHide', 'onUnload', 'onPullDownRefresh', 'onReachBottom', 'onShareAppMessage', 'onPageScroll', 'onTabItemTap'];

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 */
var strats = Object.create(null); // config.optionMergeStrategies

/**
 * Options with restrictions
 */
{
  strats.el = strats.propsData = function (parent, child, vm, key) {
    if (!vm) {
      warn$2('option "' + key + '" can only be used during instance ' + 'creation with the `new` keyword.');
    }
    return defaultStrat(parent, child);
  };
}

/**
 * Helper that recursively merges two data objects together.
 */
function mergeData(to, from) {
  if (!from) return to;
  var key = void 0;
  var keys = Object.keys(from);
  for (var i = 0; i < keys.length; i++) {
    key = keys[i];
    // 这里比较暴力，直接覆盖
    to[key] = from[key];

    // toVal = to[key]
    // fromVal = from[key]
    // if (!hasOwn(to, key)) {
    //   set(to, key, fromVal)
    // } else if (isPlainObject(toVal) && isPlainObject(fromVal)) {
    //   mergeData(toVal, fromVal)
    // }
  }
  return to;
}

/**
 * Data
 */
function mergeDataOrFn(parentVal, childVal, vm) {
  if (!vm) {
    // in a Vue.extend merge, both should be functions
    if (!childVal) {
      return parentVal;
    }
    if (!parentVal) {
      return childVal;
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    return function mergedDataFn() {
      return mergeData(typeof childVal === 'function' ? childVal.call(this, this) : childVal, typeof parentVal === 'function' ? parentVal.call(this, this) : parentVal);
    };
  } else {
    return function mergedInstanceDataFn() {
      // instance merge
      var instanceData = typeof childVal === 'function' ? childVal.call(vm, vm) : childVal;
      var defaultData = typeof parentVal === 'function' ? parentVal.call(vm, vm) : parentVal;
      if (instanceData) {
        return mergeData(instanceData, defaultData);
      } else {
        return defaultData;
      }
    };
  }
}

strats.data = function (parentVal, childVal, vm) {
  // if (!vm) {
  //   if (childVal && typeof childVal !== 'function') {
  //     "development" !== 'production' && warn(
  //       'The "data" option should be a function ' +
  //       'that returns a per-instance value in component ' +
  //       'definitions.',
  //       vm
  //     )
  //
  //     return parentVal
  //   }
  //   return mergeDataOrFn(parentVal, childVal)
  // }
  //
  // return mergeDataOrFn(parentVal, childVal, vm)

  return mergeDataOrFn.call(this, parentVal, childVal);
};

/**
 * Hooks and props are merged as arrays.
 */
function mergeHook(parentVal, childVal) {
  return childVal ? parentVal ? parentVal.concat(childVal) : Array.isArray(childVal) ? childVal : [childVal] : parentVal;
}

LIFECYCLE_HOOKS.forEach(function (hook) {
  strats[hook] = mergeHook;
});

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 */
function mergeAssets(parentVal, childVal, vm, key) {
  var res = Object.create(parentVal || null);
  if (childVal) {
    assertObjectType(key, childVal, vm);
    return extend$2(res, childVal);
  } else {
    return res;
  }
}

ASSET_TYPES.forEach(function (type) {
  strats[type + 's'] = mergeAssets;
});

/**
 * Watchers.
 *
 * Watchers hashes should not overwrite one
 * another, so we merge them as arrays.
 */
strats.watch = function (parentVal, childVal, vm, key) {
  // work around Firefox's Object.prototype.watch...
  // if (parentVal === nativeWatch) parentVal = undefined
  // if (childVal === nativeWatch) childVal = undefined
  /* istanbul ignore if */
  if (!childVal) return Object.create(parentVal || null);
  {
    assertObjectType(key, childVal, vm);
  }
  if (!parentVal) return childVal;
  var ret = {};
  extend$2(ret, parentVal);
  for (var _key in childVal) {
    var parent = ret[_key];
    var child = childVal[_key];
    if (parent && !Array.isArray(parent)) {
      parent = [parent];
    }
    ret[_key] = parent ? parent.concat(child) : Array.isArray(child) ? child : [child];
  }
  return ret;
};

/**
 * Other object hashes.
 */
strats.props = strats.methods = strats.inject = strats.computed = function (parentVal, childVal, vm, key) {
  if (childVal && "development" !== 'production') {
    assertObjectType(key, childVal, vm);
  }
  if (!parentVal) return childVal;
  var ret = Object.create(null);
  extend$2(ret, parentVal);
  if (childVal) extend$2(ret, childVal);
  return ret;
};
strats.provide = mergeDataOrFn;

/**
 * Default strategy.
 */
var defaultStrat = function defaultStrat(parentVal, childVal) {
  return childVal === undefined ? parentVal : childVal;
};

/**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 */
function normalizeProps(options, vm) {
  var props = options.props;
  if (!props) return;
  var res = {};
  var i = void 0,
      val = void 0,
      name = void 0;
  if (Array.isArray(props)) {
    i = props.length;
    while (i--) {
      val = props[i];
      if (typeof val === 'string') {
        name = camelize$1(val);
        res[name] = { type: null };
      } else {
        warn$2('props must be strings when using array syntax.');
      }
    }
  } else if (isPlainObject$2(props)) {
    for (var key in props) {
      val = props[key];
      name = camelize$1(key);
      res[name] = isPlainObject$2(val) ? val : { type: val };
    }
  } else {
    warn$2('Invalid value for option "props": expected an Array or an Object, ' + ('but got ' + toRawType$1(props) + '.'), vm);
  }
  options.props = res;
}

/**
 * Normalize all injections into Object-based format
 */
function normalizeInject(options, vm) {
  var inject = options.inject;
  if (!inject) return;
  var normalized = options.inject = {};
  if (Array.isArray(inject)) {
    for (var i = 0; i < inject.length; i++) {
      normalized[inject[i]] = { from: inject[i] };
    }
  } else if (isPlainObject$2(inject)) {
    for (var key in inject) {
      var val = inject[key];
      normalized[key] = isPlainObject$2(val) ? extend$2({ from: key }, val) : { from: val };
    }
  } else {
    warn$2('Invalid value for option "inject": expected an Array or an Object, ' + ('but got ' + toRawType$1(inject) + '.'), vm);
  }
}

/**
 * Normalize raw function directives into object format.
 */
function normalizeDirectives(options) {
  var dirs = options.directives;
  if (dirs) {
    for (var key in dirs) {
      var def = dirs[key];
      if (typeof def === 'function') {
        dirs[key] = { bind: def, update: def };
      }
    }
  }
}

function assertObjectType(name, value, vm) {
  if (!isPlainObject$2(value)) {
    warn$2('Invalid value for option "' + name + '": expected an Object, ' + ('but got ' + toRawType$1(value) + '.'), vm);
  }
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 */
function mergeOptions(parent, child, vm) {
  // if ("development" !== 'production') {
  //   checkComponents(child)
  // }

  if (typeof child === 'function') {
    child = child.options;
  }

  normalizeProps(child, vm);
  normalizeInject(child, vm);
  normalizeDirectives(child);
  var extendsFrom = child.extends;
  if (extendsFrom) {
    parent = mergeOptions(parent, extendsFrom, vm);
  }
  if (child.mixins) {
    for (var i = 0, l = child.mixins.length; i < l; i++) {
      parent = mergeOptions(parent, child.mixins[i], vm);
    }
  }
  var options = {};
  var key = void 0;
  for (key in parent) {
    mergeField(key);
  }
  for (key in child) {
    if (!hasOwn$1(parent, key)) {
      mergeField(key);
    }
  }
  function mergeField(key) {
    var strat = strats[key] || defaultStrat;
    options[key] = strat(parent[key], child[key], vm, key);
  }
  return options;
}

var _arguments = arguments;
// export * from './debug'
// export * from './props'
// export * from './error'
// export * from './next-tick'
// export { defineReactive } from '../observer/index'

var nonSupport = function nonSupport() {
  console.warn('Function nonsupport. <' + _arguments.callee.name + '>');
};

var uid = 0;

function initMixin(Vue) {
  Vue.options = {};
  Vue.prototype._init = function (options) {
    var vm = this;
    // a uid
    vm._uid = uid++;

    // let startTag, endTag
    // /* istanbul ignore if */
    // if ("development" !== 'production' && config.performance && mark) {
    //   startTag = `vue-perf-start:${vm._uid}`
    //   endTag = `vue-perf-end:${vm._uid}`
    //   mark(startTag)
    // }

    // a flag to avoid this being observed
    vm._isVue = true;
    options = mergeOptions(resolveConstructorOptions(vm.constructor), options, vm);

    delete options.mixins;
    delete options.extends;

    LIFECYCLE_HOOKS.forEach(function (v) {
      if (typeof options[v] !== 'function' && Array.isArray(options[v])) {
        // console.log('options[v]',v, options[v])
        options['$' + v] = options[v];
        options[v] = function () {
          var _this = this;

          for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
            args[_key] = arguments[_key];
          }

          options['$' + v].forEach(function (F) {
            return F.apply(_this, args);
          });
        };
      }
    });

    vm.options = options;

    // console.log('return mergeOptions options -- > ', options);
  };
}

function resolveConstructorOptions(Ctor) {
  var options = Ctor.options;
  if (Ctor.super) {
    var superOptions = resolveConstructorOptions(Ctor.super);
    var cachedSuperOptions = Ctor.superOptions;
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions;
      // check if there are any late-modified/attached options (#4976)
      var modifiedOptions = resolveModifiedOptions(Ctor);
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions);
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions);
      if (options.name) {
        options.components[options.name] = Ctor;
      }
    }
  }
  return options;
}

function resolveModifiedOptions(Ctor) {
  var modified = void 0;
  var latest = Ctor.options;
  var extended = Ctor.extendOptions;
  var sealed = Ctor.sealedOptions;
  for (var key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {};
      modified[key] = dedupe(latest[key], extended[key], sealed[key]);
    }
  }
  return modified;
}

function dedupe(latest, extended, sealed) {
  // compare latest and sealed to ensure lifecycle hooks won't be duplicated
  // between merges
  if (Array.isArray(latest)) {
    var res = [];
    sealed = Array.isArray(sealed) ? sealed : [sealed];
    extended = Array.isArray(extended) ? extended : [extended];
    for (var i = 0; i < latest.length; i++) {
      // push original options and not sealed options to exclude duplicated options
      if (extended.indexOf(latest[i]) >= 0 || sealed.indexOf(latest[i]) < 0) {
        res.push(latest[i]);
      }
    }
    return res;
  } else {
    return latest;
  }
}

/**
 * 根据 vm 生成 key
 * @param {String} __wxWebviewId__ webview 的 id
 * @param {String} __wxExparserNodeId__ 组件的 id
 */
var getKeyFromVM = function getKeyFromVM(_ref) {
    var wId = _ref.__wxWebviewId__,
        _ref$__wxExparserNode = _ref.__wxExparserNodeId__,
        nId = _ref$__wxExparserNode === undefined ? 'wxExparserNodeId' : _ref$__wxExparserNode;
    return wId + '_' + nId;
};

/**
 * 判断 deep watch 的 key 是否是当前变化值的 key 的前缀
 * @param {String} key 当前变化值的 key
 * @param {String} dKey deep watch 的 key
 * @return {Boolean} 是不是前缀
 */
var isDeepWatchMatched = function isDeepWatchMatched(key) {
    return function (dKey) {
        return new RegExp('^' + dKey + '(\\.|\\[)').test(key);
    };
};

var getWatchFnArrByVm = function getWatchFnArrByVm(vm) {
    return function (watchObj) {
        return isFn(watchObj)
        // 直接写的函数，或是数组
        ? watchObj : watchObj && watchObj.handler ? isFn(watchObj.handler)
        // 函数写在 handler 中
        ? watchObj.handler
        // handler 是字符串
        : vm[watchObj.handler]
        // 直接写的字符串
        : vm[watchObj];
    };
};

/**
 * 这个类负责管理 vm 的状态，在更新数据时保存状态，
 * 然后异步地进行更新，并且触发相关 watch 函数
 */

var VmStatus = function () {
    function VmStatus() {
        classCallCheck(this, VmStatus);

        // 根据 key 保存 vm
        this.VM_MAP = Object.create(null);

        // 缓存各个 vm 下一个状态的数据
        this.newStateByVM = Object.create(null);

        // 缓存各个 vm 传给 asyncSetData 的 oldVal 值
        // 以便在触发 watch 时获取
        this.oldStateByVM = Object.create(null);
    }

    /**
     * 更新状态
     * @param {Page|Component} vm Page 或 Component 实例
     * @param {Object} watch 侦听器对象
     * @param {Object} deepWatch 深度侦听器对象
     * @param {String} path 属性的路径
     * @param {any} newVal 新值
     * @param {any} oldVal 旧值
     */


    createClass(VmStatus, [{
        key: 'updateState',
        value: function updateState(_ref2) {
            var vm = _ref2.vm,
                watch = _ref2.watch,
                deepWatch = _ref2.deepWatch,
                path = _ref2.path,
                newVal = _ref2.newVal,
                oldVal = _ref2.oldVal;

            var key = getKeyFromVM(vm);

            this.newStateByVM = _extends({}, this.newStateByVM, defineProperty({}, key, _extends({}, this.newStateByVM[key], defineProperty({}, path, newVal))));
            this.oldStateByVM = _extends({}, this.oldStateByVM, defineProperty({}, key, _extends(defineProperty({}, path, oldVal), this.oldStateByVM[key])));

            // 缓存 vm 和 watch
            if (!this.VM_MAP[key]) {
                this.VM_MAP[key] = { vm: vm, watch: watch, deepWatch: deepWatch };
            }
        }

        /**
         * 刷新状态，调用 vm.setData 向小程序提交数据
         * 并触发相关 watch
         */

    }, {
        key: 'flushState',
        value: function flushState() {
            var _this = this;

            var vmKeys = Object.keys(this.newStateByVM);

            vmKeys.filter(function (vmKey) {
                return _this.VM_MAP[vmKey];
            }).forEach(function (vmKey) {
                var _VM_MAP$vmKey = _this.VM_MAP[vmKey],
                    vm = _VM_MAP$vmKey.vm,
                    watch = _VM_MAP$vmKey.watch,
                    deepWatch = _VM_MAP$vmKey.deepWatch;

                var newState = _this.newStateByVM[vmKey];
                var oldState = _this.oldStateByVM[vmKey];
                var getWatchFnArr = getWatchFnArrByVm(vm);

                var setData = vm.__setData__ ? vm.__setData__ : vm.setData;

                vm.beforeUpdate && vm.beforeUpdate();
                // 更新数据
                vm.updated ? setData.call(vm, newState, vm.updated) : setData.call(vm, newState);

                // 触发 watch
                Object.keys(newState).map(function (key) {
                    var newVal = newState[key];
                    var oldVal = oldState[key];
                    var watchFnArr = watch[key] && watch[key].map(getWatchFnArr);

                    return { key: key, newVal: newVal, oldVal: oldVal, watchFnArr: watchFnArr };
                }).forEach(function (_ref3) {
                    var key = _ref3.key,
                        newVal = _ref3.newVal,
                        oldVal = _ref3.oldVal,
                        watchFnArr = _ref3.watchFnArr;

                    // 触发自身的 watch
                    if (watchFnArr) {
                        watchFnArr.forEach(function (fn) {
                            return fn.call(vm, newVal, oldVal);
                        });
                    }

                    // deep watch
                    Object.keys(deepWatch).filter(isDeepWatchMatched(key)).forEach(function (dKey) {
                        var deepVal = getValByPath(vm)(dKey);

                        deepWatch[dKey].map(getWatchFnArr)
                        // 新旧值相同
                        .forEach(function (fn) {
                            return fn.call(vm, deepVal, deepVal);
                        });
                    });
                });
            });

            this.newStateByVM = Object.create(null);
            this.oldStateByVM = Object.create(null);
        }
    }, {
        key: 'deleteVm',
        value: function deleteVm(vm) {
            var _this2 = this;

            var key = getKeyFromVM(vm);

            // 异步删除，不然可能造成 flushState 时没有该对象
            Promise.resolve().then(function () {
                delete _this2.VM_MAP[key];
            });
        }
    }]);
    return VmStatus;
}();

var vmStatus = new VmStatus();

/**
 * 异步 setData 提高性能 builder
 * @param {Page|Component} vm Page 或 Component 实例
 * @param {Object} watchObj 侦听器对象
 *
 * @return AsyncSetDataFn 异步 setData 提高性能方法
 * @param {String} path 属性的路径
 * @param {any} newVal 新值
 * @param {any} oldVal 旧值
 * @param {Boolean} isArrDirty 数组下标发生变化
 */
var getAsyncSetData = function getAsyncSetData(vm, watchObj) {
    return function (_ref) {
        var path = _ref.path,
            newVal = _ref.newVal,
            oldVal = _ref.oldVal,
            _ref$isArrDirty = _ref.isArrDirty,
            isArrDirty = _ref$isArrDirty === undefined ? false : _ref$isArrDirty;

        // 统一转成数组
        var watch = Object.keys(watchObj).map(function (key) {
            return Array.isArray(watchObj[key]) ? defineProperty({}, key, watchObj[key]) : defineProperty({}, key, [watchObj[key]]);
        }).reduce(function (acc, cur) {
            return _extends({}, acc, cur);
        }, {});

        var deepWatch = Object.keys(watch).filter(function (key) {
            return watch[key].some(function (w) {
                return w.deep;
            });
        }).map(function (key) {
            return defineProperty({}, key, watch[key].filter(function (w) {
                return w.deep;
            }));
        }).reduce(function (acc, cur) {
            return _extends({}, acc, cur);
        }, {});

        vmStatus.updateState({ vm: vm, watch: watch, deepWatch: deepWatch, path: path, newVal: newVal, oldVal: oldVal });

        // 数组下标发生变化，同步修改数组
        if (isArrDirty) {
            setObjByPath({ obj: vm, val: newVal, path: path });
        }

        Promise.resolve().then(vmStatus.flushState.bind(vmStatus));
    };
};

/**
 * 在页面 onUnload 或组件 detached 后，
 * 将 vm 从 VM_MAP 中删除
 */
var deleteVm = vmStatus.deleteVm.bind(vmStatus);

var arrayProto = Array.prototype;
var methodsToPatch = ['pop', 'push', 'sort', 'shift', 'splice', 'unshift', 'reverse'];

/**
 * 改写数组原始的可变方法
 * @param {function} observeDeep 递归观察函数
 * @param {function} asyncSetData 绑定了 vm 的异步 setData 函数
 */
var getArrayMethods = function getArrayMethods(_ref) {
    var observeDeep = _ref.observeDeep,
        asyncSetData = _ref.asyncSetData;

    var arrayMethods = Object.create(arrayProto);

    methodsToPatch.forEach(function (method) {
        var original = arrayProto[method];

        arrayMethods[method] = function () {
            var oldVal = this;
            var path = this[__TUA_PATH__];

            for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
                args[_key] = arguments[_key];
            }

            var result = original.apply(this, args);

            if (method === 'pop') {
                asyncSetData({ path: path, newVal: this, oldVal: oldVal });
            } else {
                var newVal = observeDeep(this, path);

                asyncSetData({ path: path, newVal: newVal, oldVal: oldVal, isArrDirty: true });
                oldVal = newVal;
            }

            return result;
        };
    });

    return arrayMethods;
};

/**
 * 劫持数组的可变方法
 * @param {Array} arr 原始数组
 * @param {function} arrayMethods 改写后的可变方法
 * @return {Array} 被劫持方法后的数组
 */
var patchMethods2Array = function patchMethods2Array(_ref2) {
    var arr = _ref2.arr,
        arrayMethods = _ref2.arrayMethods;

    // 优先挂原型链上，否则劫持原方法
    if (Object.setPrototypeOf) {
        Object.setPrototypeOf(arr, arrayMethods);
    } else if (hasProtoInObj(arr)) {
        /* eslint-disable no-proto */
        arr.__proto__ = arrayMethods;
        /* eslint-enable no-proto */
    } else {
        proxyData(arrayMethods, arr);
    }

    return arr;
};

var Dep = function () {
    function Dep() {
        classCallCheck(this, Dep);

        this.subs = [];
    }

    createClass(Dep, [{
        key: "addSub",
        value: function addSub(sub) {
            if (this.subs.indexOf(sub) > -1) return;

            this.subs.push(sub);
        }
    }, {
        key: "notify",
        value: function notify() {
            this.subs.forEach(function (sub) {
                return sub();
            });
        }
    }]);
    return Dep;
}();


Dep.targetCb = null;

var addSubDeep = function addSubDeep(_ref, k) {
    var obj = _ref.obj,
        targetCb = _ref.targetCb;


    if (Array.isArray(obj)) {
        obj.map(function (item) {
            item && item[__dep__] && item[__dep__].addSub(targetCb);
            return item;
        }).map(function (obj) {
            return { obj: obj, targetCb: targetCb };
        }).forEach(addSubDeep);
        return;
    }

    if (obj !== null && (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object') {
        Object.keys(obj).map(function (key) {
            var item = obj[key];
            item && item[__dep__] && item[__dep__].addSub(targetCb);
            return key;
        }).map(function (key) {
            return { obj: obj[key], targetCb: targetCb };
        }).forEach(addSubDeep);
    }
};

/**
 * 观察 obj[key]，当触发 setter 时调用 asyncSetData 更新数据
 * @param {Object} obj 被观察对象
 * @param {String} key 被观察对象的属性
 * @param {any} val 被观察对象的属性的值
 * @param {function} observeDeep 递归观察函数
 * @param {function} asyncSetData 绑定了 vm 的异步 setData 函数
 */
var defineReactive = function defineReactive(_ref2) {
    var obj = _ref2.obj,
        key = _ref2.key,
        val = _ref2.val,
        observeDeep = _ref2.observeDeep,
        asyncSetData = _ref2.asyncSetData;

    var dep = obj[__dep__] || new Dep();

    defDep({ value: dep })(obj);

    Object.defineProperty(obj, key, _extends({}, COMMON_PROP, {
        get: function get$$1() {
            // 正在依赖收集
            if (Dep.targetCb) {
                // 当前属性被依赖
                dep.addSub(Dep.targetCb);

                // 同时子属性也被依赖
                if (Array.isArray(val)) {
                    val.map(function (obj) {
                        return { obj: obj, targetCb: Dep.targetCb };
                    }).forEach(addSubDeep);

                    val[__dep__] = dep;
                }
            }

            return val;
        },
        set: function set$$1(newVal) {
            var oldVal = val;
            var prefix = obj[__TUA_PATH__] || '';
            var path = getPathByPrefix(prefix, key);

            var isNeedInheritDep = newVal && oldVal && oldVal[__dep__] && (typeof newVal === 'undefined' ? 'undefined' : _typeof(newVal)) === 'object' && !newVal[__dep__];

            // 继承依赖
            if (isNeedInheritDep) {
                defDep({ value: oldVal[__dep__] })(newVal);
            }

            // 重新观察
            val = observeDeep(newVal, path);

            asyncSetData({ path: path, newVal: newVal, oldVal: oldVal });

            // 触发依赖回调
            dep.notify();
        }
    }));
};

/**
 * 得到递归观察对象
 * @param {function} asyncSetData 绑定了 vm 的异步 setData 函数
 * @return {function} observeDeep 递归观察函数
 */
var getObserveDeep = function getObserveDeep(asyncSetData) {
    /**
     * 递归观察函数
     * @param {Object} obj 待观察对象
     * @param {String} prefix 路径前缀
     * @return {Object} 被观察后的对象
     */
    return function observeDeep(obj) {
        var prefix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : '';

        if (Array.isArray(obj)) {
            var arr = obj.map(function (item, idx) {
                var isNeedInheritDep = item && (typeof item === 'undefined' ? 'undefined' : _typeof(item)) === 'object' && !item[__dep__] && obj[__dep__];

                // 继承依赖
                if (isNeedInheritDep) {
                    item[__dep__] = obj[__dep__];
                }

                return observeDeep(item, prefix + '[' + idx + ']');
            });

            // 继承依赖
            arr[__dep__] = obj[__dep__];

            // 每个数组挂载自己的路径
            arr[__TUA_PATH__] = prefix;

            // 不缓存数组可变方法，因为 vm 可能不同
            var arrayMethods = getArrayMethods({
                observeDeep: observeDeep,
                asyncSetData: asyncSetData
            });

            return patchMethods2Array({ arr: arr, arrayMethods: arrayMethods });
        }

        if (obj !== null && (typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) === 'object') {
            // 将路径前缀挂在父节点上
            defTuaPath({ value: prefix })(obj);

            Object.keys(obj)
            // 过滤 __wxWebviewId__ 等内部属性
            .filter(isNotInnerAttr).map(function (key) {
                var item = obj[key];
                var isNeedInheritDep = item && (typeof item === 'undefined' ? 'undefined' : _typeof(item)) === 'object' && !item[__dep__] && obj[__dep__];

                // 继承依赖
                if (isNeedInheritDep) {
                    defDep({ value: obj[__dep__] })(item);
                }

                return key;
            }).map(function (key) {
                return {
                    obj: obj,
                    key: key,
                    val: observeDeep(obj[key], getPathByPrefix(prefix, key)),
                    observeDeep: observeDeep,
                    asyncSetData: asyncSetData
                };
            }).forEach(defineReactive);

            return obj;
        }

        // 其他属性直接返回
        return obj;
    };
};

/**
 * 遍历观察 vm.data 中的所有属性，并将其直接挂到 vm 上
 * @param {Page|Component} vm Page 或 Component 实例
 * @param {Object} data 传入的默认值对象
 * @param {function} observeDeep 递归观察函数
 */
var bindData = function bindData(vm, data, observeDeep) {
    var $data = observeDeep(data);
    vm.$data = $data;

    // 代理 $data 到 vm 上
    proxyData($data, vm);
};

/**
 * 将
 * Object.defineProperty(Vue.prototype, ...)
 * 产生的属性挂载到 vm 上
 *
 * @param vm {Page|Component} vm Page 或 Component 实例
 * @param vueInstance {Vue} Vue实例
 */
var bindVueInstance = function bindVueInstance(vm, vueInstance) {
    var $propertys = Object.create(null);
    Object.keys(vueInstance.__proto__).forEach(function (key) {
        var property = typeof vueInstance[key] === 'function' ? vueInstance[key].bind(vm) : vueInstance[key];
        if (key != '_init') {
            $propertys[key] = property;
        }
    });

    proxyData($propertys, vm);
};

/**
 * 遍历观察 computed，绑定 watch 回调并将定义的新属性挂到 vm 上
 * @param {Page|Component} vm Page 或 Component 实例
 * @param {Object} computed 计算属性对象
 * @param {function} asyncSetData 绑定了 vm 的异步 setData 函数
 */
var bindComputed = function bindComputed(vm, computed, asyncSetData) {
    var $computed = Object.create(null);
    Object.keys(computed).forEach(function (key) {
        var dep = new Dep();
        var getVal = typeof computed[key] === 'function' ? computed[key].bind(vm) : computed[key].get.bind(vm);

        var oldVal = void 0;
        var oldValStr = void 0;
        var isInit = true;

        Object.defineProperty($computed, key, _extends({}, COMMON_PROP, {
            get: function get$$1() {
                // 正在依赖收集
                if (Dep.targetCb) {
                    // 当前属性被依赖
                    dep.addSub(Dep.targetCb);
                }

                if (!isInit) return oldVal;

                // 开始依赖收集
                Dep.targetCb = function () {
                    var newVal = getVal(vm);
                    var newValStr = JSON.stringify(newVal);

                    if (newValStr === oldValStr) return;

                    asyncSetData({ path: key, newVal: newVal, oldVal: oldVal });

                    // 重置 oldVal
                    oldVal = newVal;
                    oldValStr = newValStr;

                    dep.notify();
                };
                Dep.targetCb.key = key;

                // 重置 oldVal
                oldVal = getVal(vm);
                oldValStr = JSON.stringify(oldVal);

                // 依赖收集完毕
                Dep.targetCb = null;
                isInit = false;

                return oldVal;
            },
            set: function set$$1() {
                if (typeof computed[key].set === 'undefined') {
                    warn$1('Computed property "' + key + '" was assigned to but it has no setter.');
                } else {
                    var setVal = computed[key].set.bind(vm);
                    setVal.apply(undefined, arguments);
                }
            }
        }));
    });

    // 挂在 vm 上，在 data 变化时重新 setData
    vm.$computed = $computed;

    // 代理 $computed 到 vm 上
    proxyData($computed, vm);

    // 初始化 computed 的数据
    vm.setData($computed);
};

/**
 * 初始化时触发 immediate 的 watch
 * @param {Page|Component} vm Page 或 Component 实例
 * @param {Object} watch 侦听器对象
 */
var triggerImmediateWatch = function triggerImmediateWatch(vm, watch) {
    return Object.keys(watch).forEach(function (key) {
        var initialVal = getValByPath(vm)(key);

        if (Array.isArray(watch[key])) {
            watch[key].filter(function (w) {
                return w.immediate;
            }).forEach(function (_ref) {
                var handler = _ref.handler;

                var watchFn = isFn(handler) ? handler : vm[handler];

                watchFn.call(vm, initialVal);
            });
            return;
        }

        if (!watch[key].immediate) return;

        var watchFn = isFn(watch[key].handler) ? watch[key].handler : vm[watch[key].handler];

        watchFn.call(vm, initialVal);
    });
};

function handleProxy(event) {
  var type = event.type,
      currentTarget = event.currentTarget,
      target = event.target,
      detail = event.detail;

  var _ref = currentTarget || target,
      dataset = _ref.dataset;

  var method = dataset[type];
  var model = dataset['model'];
  var modelEvent = dataset['modelEvent'];
  var attr = dataset[type + 'Attr'] || [];
  // console.log('handleProxy event -- > ', event, 'method: ', method, 'attr: ', attr)
  if (model && type === modelEvent) {
    // TODO 对于列表循环、计算属性不支持
    set(this, model, event.detail.value);
  }
  if (method) {
    if (this[method]) {
      var payload = detail && Object.keys(detail).length > 0 && detail['__emit'] ? detail.detail : event;
      var args = attr.length > 0 ? attr.map(function (v) {
        return v == '$event' ? payload : v;
      }) : [payload];
      this[method].apply(this, args);
    } else {
      warn$1('does not have a method "' + method + '"');
    }
  }
}

/**
 * 适配 Vue 风格代码，生成小程序原生组件
 * @param {Object|Function} data 组件的内部数据
 * @param {Object|Function|Null} props 组件的对外属性
 * @param {Object} watch 侦听器对象
 * @param {Object} methods 组件的方法，包括事件响应函数和任意的自定义方法
 * @param {Object} computed 计算属性
 * @param {Object|Function|Null} properties 小程序原生的组件的对外属性
 */
var TuaComp = function TuaComp(_ref) {
  var vueInstance = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var _ref$data = _ref.data,
      rawData = _ref$data === undefined ? {} : _ref$data,
      _ref$props = _ref.props,
      props = _ref$props === undefined ? {} : _ref$props,
      _ref$watch = _ref.watch,
      watch = _ref$watch === undefined ? {} : _ref$watch,
      _ref$methods = _ref.methods,
      methods = _ref$methods === undefined ? {} : _ref$methods,
      _ref$computed = _ref.computed,
      computed = _ref$computed === undefined ? {} : _ref$computed,
      _ref$properties = _ref.properties,
      properties = _ref$properties === undefined ? {} : _ref$properties,
      rest = objectWithoutProperties(_ref, ['data', 'props', 'watch', 'methods', 'computed', 'properties']);

  return Component(_extends({}, rest, {
    methods: _extends({}, methods, {
      $emit: $emit,
      handleProxy: handleProxy
    }),
    properties: _extends({}, properties, getPropertiesFromProps(props)),
    created: function created() {
      bindVueInstance(this, vueInstance);

      for (var _len = arguments.length, options = Array(_len), _key = 0; _key < _len; _key++) {
        options[_key] = arguments[_key];
      }

      rest.beforeCreate && rest.beforeCreate.apply(this, options);
      rest.created && rest.created.apply(this, options);
    },
    attached: function attached() {
      for (var _len2 = arguments.length, options = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        options[_key2] = arguments[_key2];
      }

      rest.beforeMount && rest.beforeMount.apply(this, options);

      var data = isFn(rawData) ? rawData() : rawData;
      var asyncSetData = getAsyncSetData(this, watch);
      var observeDeep = getObserveDeep(asyncSetData);

      // 检查是否使用了保留字
      checkReservedKeys(data, computed, methods);

      // 初始化数据
      // 去除掉undefined的值
      data && Object.keys(data).forEach(function (key) {
        if (data[key] == undefined) {
          delete data[key];
        }
      });
      this.setData(data);

      // 遍历递归观察 data
      bindData(this, _extends({}, this.data, data), observeDeep);

      // 遍历观察 computed
      bindComputed(this, computed, asyncSetData);

      // 触发 immediate watch
      triggerImmediateWatch(this, watch);

      // hack 原生 setData
      hackSetData(this);

      rest.attached && rest.attached.apply(this, options);
    },
    ready: function ready() {
      for (var _len3 = arguments.length, options = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        options[_key3] = arguments[_key3];
      }

      rest.ready && rest.ready.apply(this, options);
      rest.mounted && rest.mounted.apply(this, options);
    },
    detached: function detached() {
      for (var _len4 = arguments.length, options = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
        options[_key4] = arguments[_key4];
      }

      rest.beforeDestroy && rest.beforeDestroy.apply(this, options);

      // 从 VM_MAP 中删除自己
      deleteVm(this);

      rest.detached && rest.detached.apply(this, options);
      rest.destroyed && rest.destroyed.apply(this, options);
    }
  }));
};

/**
 * 适配 Vue 风格代码，生成小程序页面
 * @param {Object|Function} data 页面组件的内部数据
 * @param {Object} watch 侦听器对象
 * @param {Object} methods 页面组件的方法，包括事件响应函数和任意的自定义方法
 * @param {Object} computed 计算属性
 */
var TuaPage = function TuaPage(_ref) {
  var vueInstance = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var _ref$data = _ref.data,
      rawData = _ref$data === undefined ? {} : _ref$data,
      _ref$watch = _ref.watch,
      watch = _ref$watch === undefined ? {} : _ref$watch,
      _ref$methods = _ref.methods,
      methods = _ref$methods === undefined ? {} : _ref$methods,
      _ref$computed = _ref.computed,
      computed = _ref$computed === undefined ? {} : _ref$computed,
      rest = objectWithoutProperties(_ref, ['data', 'watch', 'methods', 'computed']);

  return Page(_extends({}, rest, methods, {
    onLoad: function onLoad() {
      bindVueInstance(this, vueInstance);

      for (var _len = arguments.length, options = Array(_len), _key = 0; _key < _len; _key++) {
        options[_key] = arguments[_key];
      }

      rest.beforeCreate && rest.beforeCreate.apply(this, options);
      var data = isFn(rawData) ? rawData.apply(this) : rawData;
      var asyncSetData = getAsyncSetData(this, watch);
      var observeDeep = getObserveDeep(asyncSetData);

      // 检查是否使用了保留字
      checkReservedKeys(data, computed, methods);

      // 初始化数据
      // 去除掉undefined的值
      data && Object.keys(data).forEach(function (key) {
        if (data[key] == undefined) {
          delete data[key];
        }
      });
      this.setData(data);

      // 遍历递归观察 data
      bindData(this, data, observeDeep);

      // 遍历观察 computed
      bindComputed(this, computed, asyncSetData);

      // 触发 immediate watch
      triggerImmediateWatch(this, watch);

      // hack 原生 setData
      hackSetData(this);

      rest.onLoad && rest.onLoad.apply(this, options);
      rest.created && rest.created.apply(this, options);
    },
    onReady: function onReady() {
      for (var _len2 = arguments.length, options = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        options[_key2] = arguments[_key2];
      }

      rest.beforeMount && rest.beforeMount.apply(this, options);
      rest.onReady && rest.onReady.apply(this, options);
      rest.mounted && rest.mounted.apply(this, options);
    },
    onUnload: function onUnload() {
      for (var _len3 = arguments.length, options = Array(_len3), _key3 = 0; _key3 < _len3; _key3++) {
        options[_key3] = arguments[_key3];
      }

      rest.beforeDestroy && rest.beforeDestroy.apply(this, options);

      // 从 VM_MAP 中删除自己
      deleteVm(this);

      rest.onUnload && rest.onUnload.apply(this, options);
      rest.destroyed && rest.destroyed.apply(this, options);
    },

    handleProxy: handleProxy
  }));
};

function Vue(options) {
  if (!(this instanceof Vue)) {
    warn('Vue is a constructor and should be called with the `new` keyword');
  }
  this._init(options);

  // console.log('this =====>> ', this)
  // console.log('this.options =====>> ', this.options)
  // console.log('this.options.data =====>> ', this.options.data)
  // console.log('this.options.mounted =====>> ', this.options.computed)


  // 执行小程序 Page、Component 方法
  if (this.options.type === 'page' || this.options.type === undefined) {
    TuaPage(this.options, this);
  }
  if (this.options.type === 'component') {
    TuaComp(this.options, this);
  }

  return this.options;
}

initMixin(Vue);

// console.log('utils --------- > ', utils, utils.toArray)

function initUse(Vue) {
  Vue.use = function (plugin) {

    var installedPlugins = this._installedPlugins || (this._installedPlugins = []);
    if (installedPlugins.indexOf(plugin) > -1) {
      return this;
    }

    // additional parameters
    var args = toArray$2(arguments, 1);
    args.unshift(this);
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args);
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args);
    }
    installedPlugins.push(plugin);
    return this;
  };
}

function initMixin$1(Vue) {
  Vue.mixin = function (mixin) {
    this.options = mergeOptions(this.options || {}, mixin);
    return this;
  };
}

function initGlobalAPI(Vue) {

  Vue.set = nonSupport;
  Vue.delete = nonSupport;
  Vue.nextTick = nonSupport;

  initUse(Vue);
  initMixin$1(Vue);
}

// import TuaComp from '../TuaComp'

initGlobalAPI(Vue);

log('Version ' + version);

export default Vue;
export { TuaComp, TuaPage };
