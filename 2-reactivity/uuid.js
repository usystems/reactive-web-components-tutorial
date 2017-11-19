'use strict';

export default (() => {
    let nextId = 0;
    const map = new WeakMap();
    return object => {
        if (!map.has(object)) {
            map.set(object, nextId++);
        }
        return map.get(object);
    };
})();
