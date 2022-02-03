# web-ui-pack

Web package with custom high scalable WebComponents and helpers

[![npm version](https://img.shields.io/npm/v/web-ui-pack.svg?style=flat-square)](https://www.npmjs.com/package/web-ui-pack)
[![code coverage](https://coveralls.io/repos/github/Yegorich555/web-ui-pack/badge.svg?style=flat-square)](https://coveralls.io/github/Yegorich555/web-ui-pack)
[![install size](https://packagephobia.now.sh/badge?p=web-ui-pack)](https://packagephobia.now.sh/result?p=web-ui-pack)
[![npm downloads](https://img.shields.io/npm/dm/web-ui-pack.svg?style=flat-square)](http://npm-stat.com/charts.html?package=web-ui-pack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- Possible to use **with/without** any frameworks like Angular, React, Vue etc. (because it's js-native logic)
- Focus on accessibility (best practices)
- Focus on scalability (every component is developed to easy inherit and redefine/extend default logic)
- Built-in css-variables to use custom color-themes
- Optimized for webpack (in build included only in-use components and helpers)
- Zero dependancy (we don't need to wait for bug-fixing of another packages)
- Always 100% test coverage via e2e and unit tests (it's must-have and always will be so)

## Installing

Using npm:

```npm
npm install web-ui-pack
```

### UI Components

Coming soon

### Helpers

use `import focusFirst from "web-ui-pack/helpers/focusFirst"` etc.
or `import { focusFirst } from "web-ui-pack"`

- [**focusFirst**(element: HTMLElement)](#helpers) ⇒ `Set focus on parent itself or first possible element inside`
- [**nestedProperty.set**](#helpers) ⇒ `nestedProperty.set(obj, "value.nestedValue", 1) sets obj.value.nestedValue = 1`
- [**nestedProperty.get**](#helpers) ⇒ `nestedProperty.get(obj, "nestedValue1.nestVal2") returns value from obj.nestedValue1.nestVal2`
- [**observer**](#observer) ⇒ `converts object to observable (via Proxy) to allow listen for changes`
- **onEvent**([...args](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener)) ⇒ `More strict (for Typescript) wrapper of addEventListener() that returns callback with removeListener()`
- [**onFocusGot**(element: HTMLElement, listener: (ev) => void, {debounceMs: 100, once: false, ...})](#helpers) ⇒ `Fires when element/children takes focus once (fires again after onFocusLost on element)`
- [**onFocusLost**(element: HTMLElement, listener: (ev) => void, {debounceMs: 100, once: false, ...})](#helpers) ⇒ `Fires when element/children completely lost focus`
- [**promiseWait**(promise: Promise, ms: number)](#helpers) ⇒ `Produce Promise during for "no less than pointed time"; it helps for avoding spinner blinking during the very fast api-request in case: pending > waitResponse > resetPending`
- [**stringPrettify**(text: string, changeKebabCase = false)](#helpers) ⇒ `Changes camelCase, snakeCase, kebaCase text to user-friendly`

#### Helpers.Observer

Usage

```js
import observer from "web-ui-pack/helpers/observer";

const rawNestedObj = { val: 1 };
const raw = { date: new Date(), period: 3, nestedObj: rawNestedObj, arr: ["a"] };
const obj = observer.make(raw);
const removeListener = observer.onPropChanged(obj, (e) => console.warn("prop changed", e)); // calls per each changing
const removeListener2 = observer.onChanged(obj, (e) => console.warn("object changed", e)); // calls once after changing of bunch props
obj.period = 5; // fire onPropChanged
obj.date.setHours(0, 0, 0, 0); // fire onPropChanged
obj.nestedObj.val = 2; // fire onPropChanged
obj.arr.push("b"); // fire onPropChanged

obj.nestedObj = rawNestedObj; // fire onPropChanged
obj.nestedObj = rawNestedObj; // WARNING: it fire events again because rawNestedObj !== obj.nestedObj

removeListener(); // unsubscribe
removeListener2(); // unsubscribe

// before timeout will be fired onChanged (single time)
setTimeout(() => {
  console.warn("WARNING: raw vs observable", {
    equal: raw === obj,
    isRawObserved: observer.isObserved(raw),
    isObjObserved: observer.isObserved(obj),
  });
  // because after assigning to observable it converted to observable also
  console.warn("WARNING: rawNestedObj vs observable",  {
    equal: rawNestedObj === obj.nestedObj,
    isRawObserved: observer.isObserved(rawNestedObj),
    isNestedObserved: observer.isObserved(obj.nestedObj),
  });
});
```

##### Troubleshooting & Rules

- Every object assigned to `observed` is converted to `observed` also
- When you change array in most cases you get changing `length`; also `sort`/`reverse` triggers events
- WeakMap and WeakSet isn't supported
- All objects compares by `valueOf()`
