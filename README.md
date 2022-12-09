# ![logo](/demo/src/assets/logo-small.png) web-ui-pack

Web package with high scalable [WebComponents](#components) and [helpers](#helpers)

[![npm version](https://img.shields.io/npm/v/web-ui-pack.svg?style=flat-square)](https://www.npmjs.com/package/web-ui-pack)
[![code coverage](https://coveralls.io/repos/github/Yegorich555/web-ui-pack/badge.svg?style=flat-square)](https://coveralls.io/github/Yegorich555/web-ui-pack)
[![install size](https://packagephobia.now.sh/badge?p=web-ui-pack)](https://packagephobia.now.sh/result?p=web-ui-pack)
[![npm downloads](https://img.shields.io/npm/dm/web-ui-pack.svg?style=flat-square)](http://npm-stat.com/charts.html?package=web-ui-pack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Demo

You can see demo [here](https://yegorich555.github.io/web-ui-pack) or just clone repo and run `npm i & npm start`

## Features

- Possible to use **with/without** any frameworks like Angular, React, Vue etc. (because it's js-native logic)
- Form/controls are ready to use and has built-in completed validation logic for any case that you can imagine (see [demo/controls](https://yegorich555.github.io/web-ui-pack/controls))
- Focus on accessibility (best practices), other packages has low-accessibility support
- High scalable and easy customizable (every component is developed to easy inherit and redefine/extend default logic)
- Built-in css-variables to use custom color-themes with native ordinary styling (css, scss etc.)
- Built-in Typescript (coverage types 100%)
- Built-in `.jsx/.tsx` support (for React/Vue)
- Well documented via JSDoc (use intellisense power of your editor to get details about each property/option/usage)
- Optimized for webpack (build includes only used components and helpers via **side-effects** option)
- Zero dependancy (don't need to wait for bug-fixing of other packages)
- Always 100% test coverage via e2e and unit tests (it's must-have and always will be so)
- Focus on performance (it's important to have low-memory consumption and fastest initialization)

## Why the package is so big

It's developed with [Typescript](https://www.typescriptlang.org/) and has huge built-in documentation (JSDoc). Every method,property,event is documented well so you don't need extra resource to take an example to implement or configure elements. In build-result without comments you will see that it's small-enough

## Installing

Using npm:

```npm
npm install web-ui-pack
```

## TODO

- [x] [Helpers](#helpers)
- [x] [Helper.Observer](#helpersobserver)
- [x] [PopupElement](#example) [**demo**](https://yegorich555.github.io/web-ui-pack/popup)
- [x] [SpinElement](src/spinElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/spin)
- [x] [FormElement](src/formElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/controls)
- [x] [TextControl](src/controls/text.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/text)
- [x] [Mask/pattern for controls](src/controls//text.mask.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/text)
- [x] [PasswordControl](src/controls/password.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/password)
- [x] [SwitchControl (Toggler)](src/controls/switch.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/switch)
- [x] [CheckControl (Checkbox)](src/controls/check.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/check)
- [ ] CheckTreeControl
- [x] [RadioControl (RadioGroup)](src/controls/radio.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/radio)
- [x] [SelectControl (ComboBox, Dropdown)](src/controls/select.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/select)
- [ ] SelectManyControl (MultiSelect)
- [x] [CalendarControl](src/controls/calendar.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/calendar)
- [x] DateControl
- [ ] TextareaControl
- [ ] NumberControl
- [ ] FileControl
- [ ] TimeControl
- [ ] DateTimeControl ?
- [ ] ImageControl (AvatarEditor)
- [ ] SearchControl ?
- [ ] ModalElement
- [ ] ConfirmModalElement
- [ ] FormModalElement
- [ ] InfiniteScroll
- [ ] VirtualScroll
- [ ] CarouselElement (Slide)
- [ ] TableElement ?

## Components

**Common rules**:

1. **Naming**
   - All components named as `WUP..Element`, `WUP..Control` and has `<wup-...>` html-tags
   - Public properties/options/events/methods startsWith `$...` (events `$onShow`, `$onHide`, methods `$show`, `$hide`, props like `$isOpen` etc.)
   - Every component/class has static `$defaults` (common options for current class) and personal `$options` (per each component). See details in [example](#example)
   - `$options` are observed. So changing options affects on component immediately after empty timeout (every component has static `observedOptions` as set of watched options)
2. **Usage**
   - For webpack [sideEffects](https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free) switched on (it's for optimization). But **if you don't use webpack** don't import from `web-ui-pack` directly (due to tree-shaking can be not smart enough). Instead use `web-ui-pack/path-to-element`
   - Every component has a good JSDoc so go ahead and read details directly during the coding
   - Library compiled into ESNext. To avoid unexpected issues include this package into babel (use `exclude: /node_modules\/(?!(web-ui-pack)\/).*/` for babel-loader)
3. **Limitations**
   - In `jsx/tsx` instead of `className` use `class` attribute (React issue)
   - If you change custom html-attributes it will update `$options`, but if you change some option it removes related attribute (for performance reasons). Better to avoid usage attributes at all
4. **Inheritance**
   - Components are developed to be easy customized and inherrited. Use ...$defaults of every class to configure behavior You can rewrite everything that you can imagine without digging a lot in a code. To be sure don't hesitate to take a look on \*.d.ts or source code (there are enough comments to clarify even weird/difficult cases)
   - All Components inherrited from [WUPBaseElement](src/baseElement.ts) that extends default HTMLElement
   - All internal event-callbacks startsWith `got...` (gotReady, gotRemoved)
   - To redefine component just extend it and register with new html tag OR redefine default behavior via prototype functions (if $defaults are not included something). See details in [example](#example)
   - **Inherritance Tree**
     - [_HTMLElement_](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)
       - [_BaseElement_](src/baseElement.ts)
         - [PopupElement](src/popupElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/popup)
         - [SpinElement](src/spinElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/spin)
         - [FormElement](src/formElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/controls)
         - [_BaseControl_](src/controls/baseControl.ts)
           - [SwitchControl](src/controls/switch.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/switch)
             - [CheckControl](src/controls/check.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/check)
           - [RadioControl](src/controls/radio.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/radio)
           - [TextControl](src/controls/text.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/text)
             - [PasswordControl](src/controls/password.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/password)
             - [BaseComboControl](src/controls/baseCombo.ts)
               - [SelectControl](src/controls/select.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/select)
               - [DateControl](src/controls/date.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/date)
           - [CalendarControl](src/controls/calendar.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/calendar)

---

### Example

Check how you can use every element/control (popupElement for example)

Typescript

```typescript
import WUPPopupElement, { ShowCases } from "web-ui-pack/popup/popupElement";

// redefine some defaults; WARN: you can change placement rules here without changing $options per each element!!!
WUPPopupElement.$defaults.offset = [2, 2];
WUPPopupElement.$defaults.minWidthByTarget = true;
WUPPopupElement.$defaults.arrowEnable = true;

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
  WUPPopupElement.$placements.$bottom.$middle.$adjust, // adjust means 'ignore align to fit layout`
  WUPPopupElement.$placements.$bottom.$middle.$adjust.$resizeHeight, // resize means 'allow to resize to fit layout'
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

// you can override via prototypes
const original = WUPPopupElement.prototype.goShow;
WUPPopupElement.prototype.goShow = function customGoShow() {
  if (window.isBusy) {
    return null;
  }
  return original(...arguments);
};

/*** OR create extended class ***/

class Popup extends WUPPopupElement {
  // take a look on definition of WUPPopupElement and you will find internals
  protected override goShow(showCase: WUPPopup.ShowCases): boolean {
    if (showCase === WUPPopup.ShowCases.onHover) {
      return false;
    }
    return super.goShow(showCase);
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

---

### Helpers

use `import focusFirst from "web-ui-pack/helpers/focusFirst"` etc.
**WARN**: don't use `import {focusFirst} from "web-ui-pack;` because in this case the whole web-ui-pack module traps in compilation of dev-bundle and increases time of compilation

- [**animateDropdown**(el: HTMLElement, timeMs=300, isClose=false)](src/helpers/animateDropdown.ts) ⇒ `Animate (open/close) element as dropdown via scale and counter-scale for children`
- [**dateCopyTime**(to:Date ,from:Date, utc:bool)](src/helpers/dateCopyTime.ts) ⇒ `Copy hh:mm:ss.fff part from B to A`
- [**dateFromString**(v:string, format="yyyy-MM-dd hh:mm:ss AZ", options)](src/helpers/dateFromString.ts) ⇒ `Returns parsed date from string based on pointed format`
- [**dateToString**(v:Date, format="yyyy-MM-dd hh:mm:ss AZ")](src/helpers/dateToString.ts) ⇒ `Returns a string representation of a date-time according to pointed format`
- [**findScrollParent**(el: HTMLElement)](src/helpers/findScrollParent.ts) ⇒ `Find first parent with active scroll X/Y`
- [**findScrollParentAll**(e: HTMLElement)](src//helpers/findScrollParent.ts) ⇒ `Find all parents with active scroll X/Y`
- [**focusFirst**(el: HTMLElement)](src//helpers/focusFirst.ts) ⇒ `Set focus on element or first possible nested element`
- [**isIntoView**(el: HTMLElement)](src//helpers/isIntoView.ts) ⇒ `Check if element is visible in scrollable parents`
- [**nestedProperty.set**](src/helpers/nestedProperty.ts) ⇒ `nestedProperty.set(obj, "value.nestedValue", 1) sets obj.value.nestedValue = 1`
- [**nestedProperty.get**](src/helpers/nestedProperty.ts) ⇒ `nestedProperty.get(obj, "nested.val2", out?: {hasProp?: boolean} ) returns value from obj.nested.val2`
- [**objectClone**(obj, opts: CloneOptions)](src/helpers/objectClone.ts) ⇒ `converts object to observable (via Proxy) to allow listen for changes`
- [**observer**](#helpersobserver) ⇒ `converts object to observable (via Proxy) to allow listen for changes`
- [**onEvent**(...args)](src/helpers/onEvent.ts) ⇒ `More strict (for Typescript) wrapper of addEventListener() that returns callback with removeListener()`
- [**onFocusGot**(el: HTMLElement, listener: (ev) => void, {debounceMs: 100, once: false, ...})](src/helpers/onFocusGot.ts) ⇒ `Fires when element/children takes focus once (fires again after onFocusLost on element)`
- [**onScrollStop**(el: HTMLElement, listener: (this: HTMLElement) => void), {once: false, ...}](src/helpers/onScrollStop.ts) ⇒ `Returns callback when scrolling is stopped (via checking scroll position every frame-render)`
- [**onFocusLost**(el: HTMLElement, listener: (ev) => void, {debounceMs: 100, once: false, ...})](src/helpers/onFocusLost.ts) ⇒ `Fires when element/children completely lost focus`
- [**onSpy**(object: {}, method: string, listener: (...args) => void](src/helpers/onSpy.ts) ⇒ `Spy on method-call of object`
- [**promiseWait**(promise: Promise, ms: number, smartOrCallback: boolean | Function) => Promise](src/helpers/promiseWait.ts) ⇒ `Produce Promise during for "no less than pointed time"; it helps for avoding spinner blinking during the very fast api-request in case: pending > waitResponse > resetPending`
- [**scrollIntoView**(el: HTMLElement, options: WUPScrollOptions) => Promise](src/helpers/scrollIntoView.ts) ⇒ `Scroll the HTMLElement's parent container such that the element is visible to the user and return promise by animation end`
- [**scrollCarousel**(el: HTMLElement, next: (direction: -1 | 1) => HTMLElement[] | null, options: ScrollOptions) => ScrollResult](src/helpers/scrollCarousel.ts) ⇒ `Function makes pointed element scrollable and implements carousel-scroll behavior (appends new items during the scrolling). Supports swipe/pageUp/pageDown/mouseWheel events.`
- [**stringLowerCount**(text: string, stopWith?: number)](src/helpers/stringCaseCount.ts) ⇒ `Returns count of chars in lower case (for any language with ignoring numbers, symbols)`
- [**stringUpperCount**(text: string, stopWith?: number)](src/helpers/stringCaseCount.ts) ⇒ `Returns count of chars in upper case (for any language with ignoring numbers, symbols)`
- [**stringPrettify**(text: string, changeKebabCase = false)](src/helpers/stringPrettify.ts) ⇒ `Changes camelCase, snakeCase, kebaCase text to user-friendly`

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

---

### Troubleshooting

Be sure that you familiar with [common rules](#components)

#### Library doesn't work in some browsers

> web-ui-pack is compiled to ESNext. So some features maybe don't exist in browsers. To resolve it include the lib into babel-loader (for webpack check module.rules...exclude sections
>
> ```js
> // webpack.config.js
>   {
>       test: /\.(js|jsx)$/,
>       exclude: (() => {
>         // these packages must be included to change according to browserslist
>         const include = ["web-ui-pack"];
>         return (v) => v.includes("node_modules") && !include.some((lib) => v.includes(lib));
>       })(),
>       use: [ "babel-loader", ],
>     },
> ```

#### UI doesn't recognize html tags like `<wup-popup />` etc

> It's possible if you missed import or it was removed by optimizer of wepback etc. To fix this you need to force import at least once
>
> ```js
> import { WUPSelectControl, WUPTextControl } from "web-ui-pack";
>
> // this force webpack not ignore imports (if imported used only as html-tags without direct access)
> const sideEffect = WUPTextControl && WUPSelectControl;
> !sideEffect && console.error("Missed"); // It's required otherwise import is ignored by webpack
> // or
> WUPTextControl.$defaults.validateDebounceMs = 500;
> WUPSelectControl.$defaults.validateDebounceMs = 500;
> // etc.
> ```
