
export function forEachContiguousPair(array, fn) {
    "use strict";
    console.assert(array.length >= 2);
    for (let i=0; i<array.length-1; i++) {
        fn(array[i], array[i+1]);
    }
}

