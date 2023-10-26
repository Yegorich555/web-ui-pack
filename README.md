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

- Possible to use **with any frameworks** like Angular, React, Vue etc. **or even directly with HTML & JS** (because it's js-native logic that doesn't required anything extrernal)
- Form/controls are ready to use and has built-in completed validation logic for any case that you can imagine (see [demo/controls](https://yegorich555.github.io/web-ui-pack/controls))
- Focus on accessibility best practices, most of popular packages has low-accessibility support
- High scalable and easy customizable (every component is developed to easy inherit and redefine/extend default logic)
- Built-in css-variables to use custom color-themes with native ordinary styling (css, scss etc.)
- Built-in dark color scheme. To use need to add attr `wupdark` (`<body wupdark>`) and define general background & text colors
- Built-in Typescript (coverage types 100%)
- Built-in `.jsx/.tsx` support (for React/Vue)
- Supports different locales (based on [localeInfo](src/objects/localeInfo.ts) helper). For changing built-in messages override global function `window.__wupln` (detials you can see in your editor via built-in entellisense)
- Well documented via JSDoc (use intellisense power of your editor to get details about each property/option/usage)
- Optimized for webpack (build includes only used components and helpers via **side-effects** option)
- Zero dependancy (don't need to wait for bug-fixing of other packages)
- Always 100% test coverage via e2e and unit tests (it's must-have and always will be so)
- Focus on performance (it's important to have low-memory consumption and fastest initialization)

## Why the package is so big

It's developed with [Typescript](https://www.typescriptlang.org/) and has huge built-in documentation (JSDoc). Every method,property,event is documented well so you don't need extra resource to take an example to implement or configure elements. In build-result without comments you will see that it's small-enough

## Installing & usage

1. Install with npm `npm install web-ui-pack`
2. Add `import WUPPopupElement from "web-ui-pack";` into main.js file
3. For usage with React see [CODESTYLE.md](CODESTYLE.md)
4. For usage with HTML + VSCode extend VSCode settings

   ```json
   // .vscode/settings.json
   {
     // ...
     "html.customData": ["node_modules/web-ui-pack/types.html.json"]
   }
   ```

5. Type `<wup w-` to see suggestions (if it doesn't work reload VSCode). More details below

## TODO

- [x] [Helpers](#helpers)
- [x] [PopupElement](#example) [**demo**](https://yegorich555.github.io/web-ui-pack/popup)
  - [ ] Tooltip
- [x] [SpinElement](src/spinElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/spin)
- [x] [CircleElement](src/circleElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/circle)
- [x] [FormElement](src/formElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/controls)
  - [x] [TextControl](src/controls/text.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/text)
    - [x] [Mask/pattern for controls](src/controls//text.mask.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/text)
  - [x] [PasswordControl](src/controls/password.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/password)
  - [x] [SwitchControl (Toggler)](src/controls/switch.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/switch)
  - [x] [CheckControl (Checkbox)](src/controls/check.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/check)
    - [ ] CheckTreeControl
  - [x] [RadioControl (RadioGroup)](src/controls/radio.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/radio)
    - [ ] Full customized items
  - [x] [SelectControl (ComboBox)](src/controls/select.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/select)
    - [ ] Full customized menu
  - [x] [SelectManyControl (MultiSelect)](src/controls/selectMany.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/selectMany)
  - [x] [CalendarControl](src/controls/calendar.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/calendar)
  - [x] [DateControl](src/controls/date.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/date)
    - [ ] option `multiSelect`
    - [ ] DateRangeControl
  - [x] [TimeControl](src/controls/time.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/time)
  - [ ] DateTimeControl
  - [x] [TextareaControl](src/controls/textarea.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/textarea)
    - [ ] TextRichControl
  - [x] [NumberControl](src/controls/number.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/number)
  - [ ] SliderControl (progress bar)
  - [ ] FileControl
  - [ ] SearchControl
  - [ ] ImageControl (AvatarEditor)
  - [ ] ColorControl (ColorPicker) ?
- [x] [DropdownElement](src/dropdownElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/dropdown)
- [ ] MediaPlayer (Video player)
- [x] [ModalElement](src/modalElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/modal)
  - [ ] Built-in form support
  - [ ] ConfirmModalElement
- [ ] InfiniteScroll
- [ ] VirtualScroll
- [ ] CarouselElement (Slide show)
- [ ] TableElement

## Components

**Common rules**:

1. **Naming**
   - All components named as `WUP..Element`, `WUP..Control` and has `<wup-...>` html-tags
   - Public properties/options/events/methods startsWith `$...` (events `$onShow`, `$onHide`, methods `$show`, `$hide`, props like `$isShown` etc.)
   - Every component/class has static `$defaults` (common options for current class) and personal `$options` (per each component). See details in [example](#example)
   - `$options` are observed. So changing options affects on component immediately after empty timeout (every component has static `observedOptions` as set of watched options)
   - all custom `attributes` updates `$options` automatically. So `document.querySelector('wup-spin').$options.inline` equal to `<wup-spin inline />`
2. **Usage**
   - For webpack [sideEffects](https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free) switched on (for optimization). But **if you don't use webpack** don't import from `web-ui-pack` directly (due to tree-shaking can be not smart enough). Instead use `web-ui-pack/path-to-element`
   - Every component has a good JSDoc so go ahead and read details directly during the coding
   - Library compiled into ESNext. To avoid unexpected issues include this package into babel (use `exclude: /node_modules\/(?!(web-ui-pack)\/).*/` for babel-loader)
3. **Limitations**
   - In `jsx/tsx` instead of `className` use `class` attribute (React issue)
   - If you change custom html-attributes it will update `$options`, but if you change some option it removes related attribute (for performance reasons). Better to avoid usage attributes at all
4. **Inheritance**
   - Components are developed to be easy customized and inherited. Use ...$defaults of every class to configure behavior You can rewrite everything that you can imagine without digging a lot in a code. To be sure don't hesitate to take a look on \*.d.ts or source code (there are enough comments to clarify even weird/difficult cases)
   - All Components inherited from [WUPBaseElement](src/baseElement.ts) that extends default HTMLElement
   - All internal event-callbacks startsWith `got...` (gotReady, gotRemoved)
   - To redefine component just extend it and register with new html tag OR redefine default behavior via prototype functions (if $defaults are not included something). See details in [example](#example)
   - **Inheritance Tree**
     - [_HTMLElement_](https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement)
       - [_BaseElement_](src/baseElement.ts)
         - [PopupElement](src/popupElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/popup)
         - [DropdownElement](src/dropdownElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/dropdown)
         - [SpinElement](src/spinElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/spin)
         - [CircleElement](src/circleElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/circle)
         - [FormElement](src/formElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/controls)
         - [_BaseControl_](src/controls/baseControl.ts)
           - [SwitchControl](src/controls/switch.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/switch)
             - [CheckControl](src/controls/check.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/check)
           - [RadioControl](src/controls/radio.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/radio)
           - [TextControl](src/controls/text.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/text)
             - [TextareaControl](src/controls/textarea.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/textarea)
             - [PasswordControl](src/controls/password.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/password)
             - [NumberControl](src/controls/number.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/number)
             - [_BaseComboControl_](src/controls/baseCombo.ts)
               - [SelectControl](src/controls/select.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/select)
                 - [SelectManyControl](src/controls/selectMany.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/selectMany)
               - [DateControl](src/controls/date.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/date)
               - [TimeControl](src/controls/time.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/time)
           - [CalendarControl](src/controls/calendar.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/calendar)

---

### Example

More details you can find in [CODESTYLE.md](/CODESTYLE.md) and [FAQ](#faq)

Typescript

```typescript
import WUPPopupElement, { ShowCases } from "web-ui-pack/popup/popupElement";

WUPPopupElement.$use(); // call it to register in the system
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
<wup-popup w-target="#btn1" w-placement="top-start">Some content here</wup-popup>
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

- [**animateDropdown**](src/helpers/animateDropdown.ts) ⇒ `Animate (show/hide) element as dropdown via scale and counter-scale for children`
- [**animateStack**](src/helpers/animateDropdown.ts) ⇒ `Animate (show/hide) every element via moving from target to own position`
- [**dateCompareWithoutTime**](src/helpers/dateCompareWithoutTime.ts) ⇒ `Compare by Date-values without Time`
- [**dateCopyTime**](src/helpers/dateCopyTime.ts) ⇒ `Copy hh:mm:ss.fff part from B to A`
- [**dateFromString**](src/helpers/dateFromString.ts) ⇒ `Returns parsed date from string based on pointed format`
- [**dateToString**](src/helpers/dateToString.ts) ⇒ `Returns a string representation of a date-time according to pointed format`
- [**findScrollParent**](src/helpers/findScrollParent.ts) ⇒ `Find first parent with active scroll X/Y`
- [**findScrollParentAll**](src/helpers/findScrollParent.ts) ⇒ `Find all parents with active scroll X/Y`
- [**focusFirst**](src/helpers/focusFirst.ts) ⇒ `Set focus on element or first possible nested element`
- [**isIntoView**](src/helpers/isIntoView.ts) ⇒ `Check if element is visible in scrollable parents`
- [**mathSumFloat**](src/helpers/math.ts) ⇒ `Sum without float-precision-issue`
- [**mathScaleValue**](src/helpers/math.ts) ⇒ `Scale value from one range to another`
- [**nestedProperty.set**](src/helpers/nestedProperty.ts) ⇒ `nestedProperty.set(obj, "value.nestedValue", 1) sets obj.value.nestedValue = 1`
- [**nestedProperty.get**](src/helpers/nestedProperty.ts) ⇒ `nestedProperty.get(obj, "nested.val2", out?: {hasProp?: boolean} ) returns value from obj.nested.val2`
- [**objectClone**](src/helpers/objectClone.ts) ⇒ `deep cloning object`
- [**observer**](src/helpers/observer.md) ⇒ `converts object to observable (via Proxy) to allow listen for changes`
- [**onEvent**](src/helpers/onEvent.ts) ⇒ `More strict (for Typescript) wrapper of addEventListener() that returns callback with removeListener()`
- [**onFocusGot**](src/helpers/onFocusGot.ts) ⇒ `Fires when element/children takes focus once (fires again after onFocusLost on element)`
- [**onScroll**](src/helpers/onScrollStop.ts) ⇒ `Handles wheel & touch events for custom scrolling`
- [**onScrollStop**](src/helpers/onScrollStop.ts) ⇒ `Returns callback when scrolling is stopped (via checking scroll position every frame-render)`
- [**onFocusLost**](src/helpers/onFocusLost.ts) ⇒ `Fires when element/children completely lost focus`
- [**onSpy**](src/helpers/onSpy.ts) ⇒ `Spy on method-call of object`
- [**promiseWait**](src/helpers/promiseWait.ts) ⇒ `Produce Promise during for "no less than pointed time"; it helps for avoding spinner blinking during the very fast api-request in case: pending > waitResponse > resetPending`
- [**scrollIntoView**](src/helpers/scrollIntoView.ts) ⇒ `Scroll the HTMLElement's parent container such that the element is visible to the user and return promise by animation end`
- [class **WUPScrolled**](src/helpers/scrolled.ts) ⇒ `Class makes pointed element scrollable and implements carousel-scroll behavior (appends new items during the scrolling). Supports swipe/pageUp/pageDown/mouseWheel events.`
- [**stringLowerCount**](src/helpers/string.ts) ⇒ `Returns count of chars in lower case (for any language with ignoring numbers, symbols)`
- [**stringUpperCount**](src/helpers/string.ts) ⇒ `Returns count of chars in upper case (for any language with ignoring numbers, symbols)`
- [**stringPrettify**](src/helpers/string.ts) ⇒ `Changes camelCase, snakeCase, kebaCase text to user-friendly`

### Objects

- [**localeInfo**](src/objects/localeInfo.ts) ⇒ `Locale-object with definitions related to user-locale`
- [**TimeObject**](src/objects/timeObject.ts) ⇒ `Plane time object without date`

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

> It's possible if you missed import or it was removed by optimizer of wepback etc. To fix this you need to force import at least once and don't forget to call `.$use()`
>
> ```js
> import { WUPSelectControl, WUPTextControl } from "web-ui-pack";
>
> WUPTextControl.$use(); // register element
> WUPSelectControl.$use(); // register element
> // or
> WUPTextControl.$defaults.validateDebounceMs = 500;
> WUPSelectControl.$defaults.validateDebounceMs = 500;
> // etc.
> ```

### FAQ

see [demo/faq](https://yegorich555.github.io/web-ui-pack/faq)
