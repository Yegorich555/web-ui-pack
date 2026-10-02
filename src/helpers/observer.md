# Helpers.Observer

```js
import observer from "web-ui-pack/helpers/observer";

const rawNestedObj = { val: 1 };
const raw = { date: new Date(), period: 3, nestedObj: rawNestedObj, arr: ["a"] };
const obj = observer.make(raw);
const removeListener = observer.onPropChanged(obj, (e) => console.warn("prop changed", e)); // calls per each changing
const removeListener2 = observer.onChanged(obj, (e) => console.warn("object changed", e)); // calls once per bunch of changes (after timeout)
obj.period = 5; // fire onPropChanged
obj.date.setHours(0, 0, 0, 0); // fire onPropChanged
obj.nestedObj.val = 2; // fire onPropChanged
obj.arr.push("b"); // fire onPropChanged

obj.nestedObj = rawNestedObj; // nothing: rawNestedObj is already converted to the same observed obj.nestedObj

// before timeout will be fired onChanged: once per observed object => 4 times (obj, obj.date, obj.nestedObj, obj.arr)
setTimeout(() => {
  removeListener(); // unsubscribe
  removeListener2(); // unsubscribe
  console.warn("WARNING: raw vs observable", {
    equal: raw === obj,
    equalByValueOf: raw.valueOf() === obj.valueOf(),
    isRawObserved: observer.isObserved(raw),
    isObjObserved: observer.isObserved(obj),
  });
  // because after assigning to observable it converted to observable also
  console.warn("WARNING: rawNestedObj vs observable", {
    equal: rawNestedObj === obj.nestedObj,
    equalByValueOf: rawNestedObj.valueOf() === obj.nestedObj.valueOf(),
    isRawObserved: observer.isObserved(rawNestedObj),
    isNestedObserved: observer.isObserved(obj.nestedObj),
  });
});
```

## Troubleshooting & Rules

- Every object assigned to `observed` is converted to `observed` also
- When you change array in most cases you get changing `length`; also `sort`/`reverse` triggers events
- WeakMap, WeakSet, HTMLElement are not supported (not observed)
- All objects compares by `valueOf()` so you maybe interested in custom valueOf to avoid unexpected issues
