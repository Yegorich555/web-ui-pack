# ![logo](/demo/src/assets/logo-small.png) web-ui-pack

Web package with high scalable [WebComponents](#components) and [helpers](#helpers)

[![npm version](https://img.shields.io/npm/v/web-ui-pack.svg?style=flat-square)](https://www.npmjs.com/package/web-ui-pack)
[![code coverage](https://coveralls.io/repos/github/Yegorich555/web-ui-pack/badge.svg?style=flat-square)](https://coveralls.io/github/Yegorich555/web-ui-pack)
[![install size](https://packagephobia.now.sh/badge?p=web-ui-pack)](https://packagephobia.now.sh/result?p=web-ui-pack)
[![npm downloads](https://img.shields.io/npm/dm/web-ui-pack.svg?style=flat-square)](http://npm-stat.com/charts.html?package=web-ui-pack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- Possible to use **with/without** any frameworks like Angular, React, Vue etc. (because it's js-native logic)
- Focus on accessibility (best practices)
- High scalable and easy customizable (every component is developed to easy inherit and redefine/extend default logic)
- Built-in css-variables to use custom color-themes
- Built-in Typescript (coverage types 100%)
- Built-in `.jsx/.tsx` support
- Optimized for webpack (in build included only in-use components and helpers)
- Zero dependancy (don't need to wait for bug-fixing of another packages)
- Always 100% test coverage via e2e and unit tests (it's must-have and always will be so)
- Focus on performance (it's important to have low-memory consumption)

## Installing

Using npm:

```npm
npm install web-ui-pack
```

## TODO

- [x] [Basic helpers](#helpers)
- [x] [Helper.Observer](#helpersobserver)
- [x] [PopupElement](#popupelement)
- [ ] TitleElement ?
- [ ] FormElement, TextControl
- [ ] PasswordControl
- [ ] CheckControl
- [ ] RadioControl
- [ ] ComboControl, DropdownControl
- [ ] Calendar
- [ ] DateControl
- [ ] TimeControl ?
- [ ] DateTimeControl ?
- [ ] ModalElement
- [ ] ConfirmModalElement
- [ ] FormModalElement
- [ ] FileControl
- [ ] ImageControl
- [ ] SearchControl ?
- [ ] TableElement ?

## Demo

_comming soon..._

## Components

**Common rules**:

1. **Naming**
   - All components named as `WUP....Element` and `<wup-...>` (for html-tags)
   - Public properties/options/events/methods startsWith `$...` (events `$onShow`, `$onHide`, methods `$show`, `$hide`, props like `$isOpened` etc.)
   - Every component has at least static `$defaults` (common options for current class) and personal `$options` (per each component). See details in [example](#popupelement)
   - `$options` are observed. So changing options affects on component immediately (every component has static `observedOptions` as set of watched options)
2. **Usage**
   - Since tree-shaking sometimes is not smart enough don't import from `web-ui-pack` directly. Instead use `web-ui-pack/path-to-element` or setup [sideEffects](https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free) in package.json (for webpack)
   - Every component has a good JSDoc so go ahead and read details directly during the coding
3. **Limitations**
   - In `jsx/tsx` instead of `className` use `class` attribute (React issue)
   - If you change custom attributes it will update $options, but if you change some option it doesn't update related attribute (for performance reasons). Better to avoid customAttributes at all
4. **Inheritance**
   - Components are developed to be easy customized and inherrited. Every rule/option/method is developed to be customized if defaultOptions are not enough. You can rewrite everything that you can imagine without digging a lot in a code. To be sure don't hesitate to take a look on \*.d.ts or source code (there are enough comments to clarify even weird/difficult cases)
   - All Components inherrited from [WUPBaseElement](src/baseElement.ts) that extends default HTMLElement
   - All internal event-callbacks startsWith `got...` (gotReady, gotRemoved)
   - To redefine component just extend it and register with new html tag. See details in [example](#popupelement)
   - **Inherritance Tree**
     - [_HTMLElement_](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)
       - [BaseElement](src/baseElement.ts)
         - [PopupElement](src/popupElement.ts)

### PopupElement

[WUPPopupElement](src/popupElement.ts), `<wup-popup />`

Typescript

```typescript
import WUPPopupElement, { ShowCases } from "web-ui-pack/popupElement";

// redefine some defaults; WARN: you can change placement rules here without changing $options per each element!!!
WUPPopupElement.$defaults.offset = [2, 2];
WUPPopupElement.$defaults.minWidthByTarget = true;

// create element
const el = document.createElement("wup-popup");
// WARN el.$options is a observable-clone of WUPPopupElement.$defaults
// WARN: ShowCases is const enum and import ShowCases available only in Typescript
el.$options.showCase = ShowCases.onClick | ShowCases.onFocus; // show popup by target.click and/or target.focus events
el.$options.target = document.querySelector("button");
/*
  Placement can be $top, $right, $bottom, $left (top - above at the target etc.)
  every placement has align options: $start, $middle, $end (left - to align at start of target)
  also you can set $adjust to allow Reduce popup to fit layout
*/
el.$options.placement = [
  WUPPopupElement.$placements.$top.$middle; // place at the top of target and align by vertical line
  WUPPopupElement.$placements.$bottom.$middle, // place at the bottom of target and align by vertical line
  WUPPopupElement.$placements.$bottom.$middle.$adjust, // adjust means 'Reduce popup to fit layout`
]
document.body.append(el);
```

HTML, JSX, TSX

```html
<button id="btn1">Target</button>
<!-- You can skip pointing attribute 'target' if popup appended after target -->
<wup-popup target="#btn1" placement="top-start">Some content here</wup-popup>
```

How to extend/override

```typescript
/// popup.ts

class Popup extends WUPPopupElement {
  // take a look on definition of WUPPopupElement and you will find internals
  protected override canShow(showCase: WUPPopup.ShowCases): boolean {
    if (showCase === WUPPopup.ShowCases.onHover) {
      return false;
    }
    return true;
  }
}

const tagName = "ext-popup";
customElements.define(tagName, Popup);
// That's it. New Popup with custom tag 'ext-popup' is ready

// add for intellisense (for *.ts only)
declare global {
  // add element to document.createElement
  interface HTMLElementTagNameMap {
    [tagName]: Popup;
  }

  // add element for tsx/jsx intellisense
  namespace JSX {
    interface IntrinsicElements {
      [tagName]: IntrinsicElements["wup-popup"];
    }
  }
}
```

### Helpers

use `import focusFirst from "web-ui-pack/helpers/focusFirst"` etc.
**WARN**: don't use `import {focusFirst} from "web-ui-pack;` because in this case the whole web-ui-pack module traps in compilation of dev-bundle and increases time of compilation

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

##### Troubleshooting & Rules

- Every object assigned to `observed` is converted to `observed` also
- When you change array in most cases you get changing `length`; also `sort`/`reverse` triggers events
- WeakMap, WeakSet, HTMLElement are not supported (not observed)
- All objects compares by `valueOf()` so you maybe interested in custom valueOf to avoid unexpected issues
