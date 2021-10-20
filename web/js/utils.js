
export function forEachContiguousPair(array, fn) {
    "use strict";
    console.assert(array.length >= 2);
    for (let i=0; i<array.length-1; i++) {
        fn(array[i], array[i+1]);
    }
}

export function buildEventTarget() {
    "use strict";
    const eventTarget = new EventTarget();

    return {
        trigger(eventName, eventData) {
            const event = new Event(eventName);
            event.data = eventData;
            eventTarget.dispatchEvent(event);
        },
        on(eventName, eventHandler) {
            eventTarget.addEventListener(eventName, event => {
                eventHandler(event.data);
            });
        }
    };
}
