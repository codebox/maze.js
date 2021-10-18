
export function forEachContiguousPair(array, fn) {
    "use strict";
    console.assert(arr.length >= 2);
    for (let i=0; i<array.length-1; i++) {
        fn(array[i], array[i+1]);
    }
}

export function shuffleArray(array) {
    let i = array.length, r;

    while (i) {
        const r = randomInt(i--);
        [array[i], array[r]] = [array[r], array[i]];
    }

    return array;
}
