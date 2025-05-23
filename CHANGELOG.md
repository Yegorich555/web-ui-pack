<!-- markdownlint-disable MD024 -->

# Changelog

## 1.2.4 (May 23, 2025)

### Fixes & Improvements

- helper [objectToFormData](src/helpers/objectToFormData.ts). Added option bracket-notation (use for NodeJS) and dot-notation (use for .NET)
- [PopupElement](src/popup/popupElement.ts). Fixed _rendered out of viewport on custom fitElement and scrollable parent_

---

## 1.2.3 (Mar 5, 2025)

### Fixes & Improvements

- helper [objectToFormData](src/helpers/objectToFormData.ts). Fixed nulls and files in nested props are not handled on .NET due to wrong serialization

---

## 1.2.2 (Dec 20, 2024)

### New Features

- helper [objectToFormData](src/helpers/objectToFormData.ts)

### Fixes & Improvements

- Fixed namespace for JSX/TSX **React v19+**
- [NotifyElement](src/notifyElement.ts)
  - Fixed _changing $options doesn't clear related attributes_
- **Controls (Date, Time, Number)**
  - Fixed _Validation **required** shows instead of **Invalid value** OR **Incomplete value**_
- Helper [stringPrettify](src/helpers/stringPrettify.ts)
  - Fixed behavior with abbreviations like `reminderSMS` => `Reminder SMS` (was `Reminder S M S`)
  - Improved performance up to 3 times (rewritten Regex to for-cycle). [See benchmark here](https://measurethat.net/Benchmarks/ShowResult/575117)

---

## 1.2.1 (Sep 24, 2024)

### New Features

- [NotifyElement](src/notifyElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/notify) - **EXPERIMENTAL** (not test-covered yet)

### Fixes & Improvements

- [Form](src/formElement.ts)
  - Added skip-validation (by default) for `readonly/disabled/hidden` controls. **BREAKING:** changed enum `SubmitActions` & `FormElement.$defaults.submitActions`
- [SelectManyControl](src/controls/selectMany.ts). Fixed behavior for sorting (drag/drop) when item moved between lines
- [PopupElement](src/popup/popupElement.ts).
  - Reduced opacity for tooltip background `0.8` => `0.9`
  - Fixed _Typescript shows error on children inside wup-popup_
- [CircleElement](src/circleElement.ts)
  - Set `minWidth: 100px` & `minHeight: 50px` to avoid init size 0 for some cases
  - Add defined color for tooltip function `item.tooltip = (itemResult, popup) => console.warn(itemResult.color)`
  - Handled case with custom label: so `<wup-circle><strong>Custom label</strong></wup-circle>` works in a proper way now
  - Extended default colors to 8 items
  - Added auto definition for half-size (radar-charts without whole circle) based on `$options.from` & `$options.to`
- [helpers](README.md#helpers)
  - [isIntoView](src/helpers/isIntoView.ts), [findScrollParentAll](src/helpers/findScrollParent.ts), [findScrollParent](src/helpers/findScrollParent.ts). Fixed `calling helpers triggers scroll events`
  - [onScroll](src/helpers/onScroll.ts). Added event to option skip: `{ skip?: (ev: WheelEvent | TouchEvent, isTouchAction: boolean) => boolean; }`

---

## 1.1.0 (Jan 18, 2024)

### New Features

- **BREAKING**. **Controls**. Renamed `valueToUrl/valueFromUrl` to `valueToStorage/valueFromStorage`
- **Combobox controls (Select, SelectMany, Date, Time)**. Added method `.renderPopup()` to have ability to override popup options
- [SelectControl](src/controls/select.ts). [SelectManyControl](src/controls/selectMany.ts). [RadioControl](src/controls/radio.ts).
  - Allowed to use mixed types in `$options.items`. Improved JSDoc (added example)
  - Allowed to prevent closing menu via **ev.preventDefault** => `$options.items = [{value: 1, text: (v, li) => {... li.onclick = (e) => e.preventDefault();... } }]`
  - Allowed to use complex values with saving to storage (refactored methods `valueToStorage/valueFromStorage`)

### Fixes

- **HTML**. Fixed intellisense (html.json was missed in the package)
- **Styles**. Textbased controls. Added `opacity: 1` for `button[clear]/prefix/postfix` as fix when controls in a flex-row and it resizes on hover
- **Combobox controls (Select, SelectMany, Date, Time)**. _Memory leak: menu is closed but not removed when click on body outside control_

---

## 1.0.4 (Dec 29, 2023)

### New Features

- [WUPTimeObject](src/objects/timeObject.ts). Add init by date to constructor
- [DateControl](src/controls/date.ts). Add sync with [TimeControl](src/controls/time.ts) (value, min, max)

---

## 1.0.3 (Dec 9, 2023)

### New Features

- **Helpers**. Deprecate `mathSumFloat` in favor of `mathFixFP`
- **Styles**.
  - Moved all icons to single `./styles.ts const WUPcssIconSet` to allow re-use it
  - Added init root styles on script run (to allow re-use css variables before any WUP component is appended)
- **Modal**
  - Allow to prevent auto closing via `form.$onSubmitEnd = (e) => e.preventDefault()`
  - Allow to prevent auto closing via `form.$onSubmit = (e) => e.preventDefault()`
- **Controls**. Added css-animation for box-shadow/borders
- [RadioControl](src/controls/radio.ts). Added comparison by item.id to allow use cloned items/value
- [NumberControl](src/controls/number.ts). New options `scale` & `offset`
- [Form](src/formElement.ts)
  - Added `form.$validate(...)` for manual triggering validations
  - Changed spinner to custom friendly looked

### Fixes

- **Global**. _Custom event callbacks like $onChange(e) have `e.target: null`_
- **Controls**
  - _Wrong TS-type on **$onChange()** callback_
- [Form](src/formElement.ts)
  - _Focus lost on pending (because every active element is disabled)_. Refactored pending state: elements changes to `readonly` + applied css-style [busy] + added attribute `aria-busy` to form
  - _Possible to submit by Enter key in pending state_
- [ModalElement](src/modalElement.ts.ts). _button[close] is overlayed by header_

---

## 1.0.2 (Nov 21, 2023)

### New Features

- **Global**
  - Added Preact tsx/jsx support
- **Controls**
  - Added `text-align: start` by default to avoid unexpected inheritance
  - [RadioControl](src/controls/radio.ts). Added attribute `[checked]` to re-style whole item

---

## 1.0.1 (Nov 17, 2023)

### Fixes

- [ModalElement](src/modalElement.ts.ts). _Wrong behavior on confirmModal + replace: true + click outside on previous/hidden modal_
- [PopupElement](src/popup/popupElement.ts). _Popup blinks on fast open+close_
- **Controls**
  - _Missed css-var `--base-margin`_
  - _Missed style `flex: 1` for switch/checkbox_ controls

---

## 1.0.0 (Nov 13, 2023)

### New Features

- [ModalElement](src/modalElement.ts.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/modal)
- **Global**
  - Added multi language support: override `window.__wupln` (to dynamic change) or global `__wupln` during the compilation (for static change)
  - Added css variable `--base-margin` to unify margins for all elements
  - Added support HTML intellisense for WebStorm (no action required from developer/user side)
- helper [focusFirst](src/helpers/focusFirst.ts). Added option `isFocusLast` & static querySelector (possible to get from `focusFirst.$selector`)
- [FormElement](src/formElement.ts)
  - Increased height of `button[type=submit]`
  - Added callback `$onSubmitEnd` & event `$submitEnd`
  - Added public method `$submit()` for manual calling
  - Web Accessibility: auto-tie with closest heading via aria-labelledby
- **Text based controls**
  - Added css variable `--ctrl-label-active-pos` to simplify customization of label position
- [SelectControl](src/controls/select.ts). [SelectManyControl](src/controls/selectMany.ts). Improved handling promise rejection in `$options.items`
- [SelectManyControl](src/controls/selectMany.ts). Added scrolling style & restricted max-height by default

### Fixes

- helper [findScrollParent](src/helpers/findScrollParent.ts). _Returns parent despite on parent.child with position-fixed_
- helper [promiseWait](src/helpers/promiseWait.ts). _Throws error twice instead of 1 time_
- [PopupElement](src/popup/popupElement.ts). _Popup hidden if target inside content with position: fixed and target.parent.parent is scrollable_
- [DropdownElement](src/dropdownElement.ts). _Target button is overflowed by menu in animation-stack_
- [PasswordControl](src/controls/password.ts). _Input height is changed on button[eye] click_
- **Text based controls**
  - _Sometimes weird blink & poor render during the animation on focus_
  - _Button clear changes control size on hover if parent is flexbox_
- [SelectControl](src/controls/select.ts). [SelectManyControl](src/controls/selectMany.ts). _storageKey + items as Promise don't work together_
- [CircleElement](src/circleElement.ts). _Update options/items colors triggers animated re-render with blink_

### BREAKING CHANGES

- **Global**.

  - Added static `.$use()`. Call it before using element: `WUPTextControl.$use()` (_self-registration by import_ works now and will be removed in the future)
  - Renamed css-vars:

    - `--ctrl-select-menu-hover` >>> `--menu-hover-bg`
    - `--anim-time` >>> `--anim-t`
    - `--popup` >>> `popup-text`
    - `--popup-anim` >>> `popup-anim-t`
    - `--tooltip` >>> `tooltip-text`
    - `--spin-speed` >>> `spin-t`
    - `--btn-submit` >>> `--btn-submit-text`
    - `--ctrl` >>> `--ctrl-text`
    - `--ctrl-clr-width` >>> `--ctrl-clr-w`
    - `--ctrl-select-item` >>> `--ctrl-select-item-text`
    - `--ctrl-time-off` >>> `--ctrl-time-off-text`
    - `--ctrl-select-menu-hover` >>> `--menu-hover-bg`

  - Refactored & unified custom events. Now every event contains detail as object: `e.detail = { ... }`

- [PopupElement](src/popup/popupElement.ts)
  - **z-index** is changed from `90000` to `8000`
  - Renamed `show/hide` to `open/close` (the same for [DropdownElement](src/dropdownElement.ts)):
    - enum `ShowCases` >>> `PopupShowCases`
    - enum `HideCases` >>> `PopupHideCases`
    - option `showCase` >>> `openCase`
    - method `$show()` >>> `$open()`
    - method `$hide()` >>> `$close()`
    - state-prop `$isShown` >>> `$isOpened`
    - event `$onShown` >>> `$onOpened`
    - etc.
  - Refactored/normalized enum PopupShowCases
- **Combobox controls (Select, SelectMany, Date, Time)**
  - Renamed `show/hide` to `open/close`:
    - enum `ShowCases` >>> `MenuShowCases`
    - enum `HideCases` >>> `MenuHideCases`
    - event `$showMenu` >>> `$openMenu`
    - event `$hideMenu` >>> `$closeMenu`
      etc.

---

---

---

## 0.10.2 (Oct 11, 2023)

**Fixes**:

- [SelectControl](src/controls/select.ts). [SelectManyControl](src/controls/selectMany.ts). _Error message in console if `$options.items = new Promise` & `$initValue = ...`_

---

## 0.10.1 (Oct 10, 2023)

**BREAKING CHANGES**:

- **Controls**. Renamed some css-vars (this is last big breaking change)
- [FormElement](src/formElement.ts). Option `autoSave` renamed to `autoStore`

**Fixes**:

- **TypeScript**. Updated CustomEvents `$onWillShow`, `$onWillHide`, `$onChange`
- **Text based controls**
  - _Label doesn't go to top on browser autofill_
  - _Value missed & undo/redo failed on browser autofill_
- [SelectManyControl](src/controls/selectMany.ts)
  - _Showing button[clear] on hover changes height_
  - _Focus sometimes is wrong when user removes item & reverts changes via click on button[clear=back]_

**New/Features**:

- Added built-in colors for darkMode. _Append attr `[wupdark]` to body to use it. Don't forget to define general text & background colors yourself_

---

## 0.9.1 (Sep 28, 2023)

**BREAKING CHANGES**:

- **Internals** (**Note:** Skip this if you haven't created custom Elements inherited from WUP...)
  - Added auto-mapping between attributes <=> options based on key-values in `$defaults`
  - TypeScript. Removed interface `Defaults`. Merged with interface `Options` and now contains all fields as required
  - Now removing attributes/options always rollbacks to value defined in `$defaults`
  - Method `getAttr` changed to `parseAttr`
- **Global**
  - All attributes refactored and starts with `w-...` (attrs `[readonly]` & `[disabled]` without changes)
  - Style rules changed from `[reverse]` to `[w-reverse]` for [RadioControl](src/controls/radio.ts), [SwitchControl](src/controls/switch.ts), [CheckControl](src/controls/check.ts) & [PasswordControl](src/controls/password.ts)
- **Controls**
  - Option `skey` renamed to `storageKey`
  - Option `storageKey` changes `$value` instead of `$initValue` and now triggers `$onChange` event on init (added enum-key `SetValueReasons.storage`)
  - Removed css `maxHeight` for [error] popup
  - Changing `$initValue` isn't fired `$onChange` event anymore
- [CircleElement](src/circleElement.ts). Renamed option _min**s**ize_ to _min**S**ize_
- [SpinElement](src/spinElement.ts)
  - Defaults `fit` & `overflowTarget` = `auto` (was `null`)
  - Attribute `w-overflowtarget` expects `auto` or `querySelector` string (previously expected global-ref `window.someObj`)

**Fixes**:

- **TypeScript**
  - Updated version & types
  - Refactored & fixed some types
- helper [observer](src/helpers/observer.ts). _excludeNested doesn't exclude when re-assign nested properties_
- [RadioControl](src/controls/radio.ts). _autoFocus makes focused 1st but not active input when `form.$options.autoFocus=true`_
- [SelectControl](src/controls/select.ts). _Wrong error `Not found in items` when re-assign `items` & `initValue` after a time_
- [SelectManyControl](src/controls/selectMany.ts)
  - _Wrong error `Not found in items` when re-assign `items` & `initValue` after a time_
  - _Removing item from value affects on `$initValue`_
  - _$isChanged is wrong if user removed then added same value_
- [DateControl](src/controls/date.ts)
  - _Validations `min`, `max`, `exclude` don't exclude time in comparison_
  - _Validations messages `min` & `max` isn't formatted according to `utc`_
  - _Error message doesn't appear for invalid input by pressing Enter_
  - _Validation `_parse` doesn't work when added extra char and another char auto-removed (shifted & removed)_
  - _History undo works wrong is select all + type new + Ctrl-Z_
- [TimeControl](src/controls/time.ts)
  - _Validation `_parse` doesn't work when added extra char and another char auto-removed (shifted & removed)_
  - _Error message doesn't appear for invalid input by pressing Enter_
- [CalendarControl](src/controls/calendar.ts). Removed useless background for button month in the header

**New/Features**:

- **Global**. Added support HTML intellisense in VSCode: follow [instructions](README.md#installing--usage) to use this
- **Controls**
  - `button[clear]` not hidden anymore for required controls (user must have ability to clear all at once & put new text). To rollback it use css-rule `wup-text[required] button[clear] { display: none; }`
  - `button[clear]` visible only on focus & hover. To rollback it use css `wup-text button[clear] { display: block!important; }`
  - updated hover & focus styles
- **Combobox controls (Select, Date, Time)**
  - Now menu is hidden by default when `autoFocus` enabled. To revert to previous behavior use `WUPSelectControl.$defaults.showCase |= ShowCases.onFocusAuto`
- [SelectControl](src/controls/select.ts).[SelectManyControl](src/controls/selectMany.ts).
  - Added validationRules `minCount` & `maxCount`
  - Updated hover style for menu items. User css-var `--ctrl-select-menu-hover` to change

---

## 0.8.1 (Aug 29, 2023)

**BREAKING CHANGES**:

- **Internals** (**Note:** If you haven't created custom Elements inherited from WUP... - don't pay attention on it).
  - Refactored `$options` initialization. So all inherited Elements must override only `$defaults` and use `TOptions` as generic instead of overriding $options like it was before.
  - Deprecated static property **nameUnique**
  - **Controls**. Disable `maxWidthByTarget` for error-popup
  - **Global**. Improved styles performance via refactoring selectors

**Fixes**:

- **Text based controls**
  - _$initValue + click on button[clear] + Ctrl+Z => history undo does't work_
  - _button[clear] isn't updated on `$initValue` or `$options.clearActions` changing_
  - _wrong behavior_when user removes/inserts text in the start_
- [SelectControl](src/controls/select.ts)
  - _clearing input + click outside doesn't clear value_
  - _`$options.readOnlyInput=7` must be ignored when `allowNewValue` enabled_
  - improved input delete behavior for `$options.multiple`
  - _menu isn't refreshed after button-clear click_
  - _selected menu-item isn't into view sometimes with 1st opening popup_
- **Combobox controls (Select, Date, Time)**. _Popup shows/hides when user select text with mouseUp on label (outside input)_
- [CalendarControl](src/controls/calendar.ts). _`$value=undefined` doesn't reset selected_
- [NumberControl](src/controls/number.ts).
  - _Alt+MouseWheel changes ±0.1 when decimal isn't allowed_
  - _Alt+MouseWheel changes ±0.1 but Alt-keyUp moves focus to browser panel_
- [CircleElement](src/circleElement.ts).
  - _wrong tooltip position when segment is half of circle_
  - _wrong console.error when `items=[{value:2}]`_
  - \*wrong label-value when item value < option **minsize\***
  - _edges of small segment are not rounded according to corner_
- [TimeControl](src/controls/time.ts).
  - _menu items with wrong sizes and text not aligned_
  - _extra pixel when scrolled if content size is decimal h=239.7_

**New/Features**:

- **Controls**. Event `$change` and callback `$onChange` has prop `SetValueReason.initValue` now
- **Internals**. Improved memory consumption & performance via excluding nested props of $options to be observed
- **Text based controls**
  - History undo/redo (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z). Refactored, fixed & optimized via storing only changes
- [PopupElement](src/popup/popupElement.ts). Added showCase **alwaysOff** (popup hidden by default)
- [CircleElement](src/circleElement.ts). Added percentage for tooltips
- [TimeControl](src/controls/time.ts). Added option `menuButtonsOff` to hide buttons

---

## 0.7.1 (Jul 24, 2023)

**BREAKING CHANGES**:

- **Controls**. `$options.clearAction` => refactored enum-names & improved behavior/dynamic-icon for `button[clear]`

**Fixes**:

- [SelectControl](src/controls/select.ts).[SelectManyControl](src/controls/selectMany.ts)
  - _menu scrolled to 1st selected item if even select last one (when multiple is allowed)_
  - _$options.items[0] !== items[0] because wrapped to observer_
  - _Unable to clear value with Backspace+Enter_
- [SelectManyControl](src/controls/selectMany.ts). _Menu hides when user selects all items - but it's maybe wrong_
- [RadioControl](src/controls/radio.ts)
  - _$options.items[0] !== items[0] because wrapped to observer_
  - _`$options.readOnly` doesn't work - user able to change value_
- [CalendarControl](src/controls/calendar.ts)
  - _Wrong size of monthPicker if previously scroll dayPicker to min/max date_
  - _User can't scroll when `$initValue` > `$options.max`_
- [DateControl](src/controls/date.ts). _Menu isn't closed if click on the selected date_
- [TextareaControl](src/controls/textarea.ts)
  - _Exception when try to clear empty control_
  - _`Ctrl + Z` doesn't revert changes_
- [NumberControl](src/controls/number.ts). _option `format` isn't applied on init_
- **Text based controls**. **Mask**. _Wrong behavior_when user removes/inserts text in the middle_
- **Text based controls** - Improved undo/redo overall
  - _Ctrl+Z sometimes is wrong_
  - _Ctrl+Я doesn't work. Need support for different languages_
  - _Press Escape, Ctrl+Z => no undo-action_
  - _No undo-action when shake iPhone_
- **Controls.Styles**. _button[clear] has shifted icon when mouse hover_

**New/Features**:

- helper [observer](src/helpers/observer.ts). Added option `excludeNested` to exclude some nested properties from observer
- [SelectControl](src/controls/select.ts).[SelectManyControl](src/controls/selectMany.ts). `$options.readOnlyInput` can be number X to enable autoMode where input.readOnly = items.length < X.
- **Combobox controls (Select, Date, Time)**. _readOnlyInput moved to $defaults_
- **Controls.Global**
  - Improved value comparison (static method `$isEqual`) to compare by `.id`. So now don't need to worry about complex objects with **id's** (mostly related to `SelectControl.$options.items` & `RadioControl.$options.items`)
  - Added readonly property `$isRequired` based on `$options.validations.required`
- [CalendarControl](src/controls/calendar.ts). [DateControl](src/controls/date.ts). `$options.startWith` can be string-date

---

## 0.6.1 (Jun 26, 2023)

**Fixes**:

- **Controls**. _`$initValue` overrides `$value` when it set before_
- **Combobox controls (Select, SelectMany Date, Time)**. _Menu border is blue when invalid + hover_
- **Combobox controls (Select, SelectMany, Date, Time)**. _Sometimes menu not scrolled to selected item by opening_
- [SwitchControl](src/controls/switch.ts). [CheckControl](src/controls/check.ts). _form.$initModel is ignored_
- [RadioControl](src/controls/radio.ts). _`$options.items` with object-values doesn't work_
- [RadioControl](src/controls/radio.ts). _set in a row `$options.items=...` and `$value=...` doesn't work_
- [SelectControl](src/controls/select.ts).[SelectManyControl](src/controls/selectMany.ts). _Set in a row `$options.items=...` and `$value=...` doesn't work_
- [SelectControl](src/controls/select.ts).[SelectManyControl](src/controls/selectMany.ts). _Arrow changes control size during rotation_
- [PopupElement](src/popup/popupElement.ts). _Wrong position if target inside body and html is scrollable instead of body_
- [NumberControl](src/controls/number.ts). _Pattern `0.#` and value `2` shows error `Incomplete value`_
- helper [observer](src/helpers/observer.ts). _Exception on promise-property_
- **Global**. _Sometimes some css-vars not appended to styles in production (as result black Circle)_
- [CalendarControl](src/controls/calendar.ts). _Wrong autoscroll to top page after 1st focus_
- [TimeControl](src/controls/time.ts). _Scrollbar is visible when menu opens to top_

**New/Features**:

- [FormElement](src/formElement.ts). Added option `autoSave` to prevent losing not-submitted data
- **Controls**
  - Internal `setValue` has argument `reason` now
  - Event `$change` and callback `$onChange` has prop `detail: SetValueReason` now
  - Added `$defaults.storage` and `$options.skey` to store/get value in different storages `local/session/url`
  - Extended custom validation to `(value, control, reason) => false | string`. Was `(value) => false | string`
  - Hide `button[clear]` by default for disabled/readonly/required
- **Global**. Added JSDoc comments for `jsx/tsx` files (previously hovering on `<wup-text>` showed nothing)

---

## 0.6.0 (May 19, 2023)

**BREAKING CHANGES**:

- helper **animateDropdown** moved into [web-ui-pack/helpers/animateDropdown](src/helpers/animateDropdown.ts)
- [PopupElement](src/popup/popupElement.ts). Fixed typo `$isHidding` to `$isHiding`

**Fixes**:

- helper [animateDropdown](src/helpers/animate.ts). _Wrong for left,right,top directions_
- [PopupElement](src/popup/popupElement.ts). _Popup hides by mouseenter if was opened by target.mouseenter_
- [PopupElement](src/popup/popupElement.ts). _Popup impossible to hide by click if opened by hover_
- [NumberControl](src/controls/number.ts).
  - _`-234` showed as `-,234`_
  - _error message min/max is not formatted as input_
  - _useless inline style 'overflow' on focus_
- **Controls**. _Asterisk is visible on empty label when value is required_

**New/Features**:

- [DropdownElement](src/dropdownElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/dropdown)
- Added ability to reuse built-in styles (scroll,button['submit'] etc.). See [FAQ/sharedStyles](https://yegorich555.github.io/web-ui-pack/faq#shared-styles)
- [SelectManyControl](src/controls/selectMany.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/selectMany). Added ability to sort/order items via drag&drop OR Arrows + Shift
- Added helper [**animateStack**](src/helpers/animate.ts)
- [PopupElement](src/popup/popupElement.ts)
  - Added option **animation: Animations.stack**
  - Added support for attribute **[animation]** ("stack","drawer","") : `<wup-popup animation="stack">...</wup-popup>`
  - Extended attribute **placement**. Now it has predefined opposite rules (so `right-middle` means `[right-middle, left-middle]`)
  - Reduced memory consumption via significant refactoring listeners & callback
  - Popup **always closed by keydown Escape** if wasn't prevented (if was opened via default listener)
  - Popup **always closed by focusLost of target & popup** for accessibility purpose (if was opened via default listener)
  - Ability to call **\$show()** and **\$hide()** with working listeners (previously manual call of **$show()** removed all listeners)
  - **Controls**. Able to setup `$defaults.validations` (like `WUPNumberControl.$validations = {min: 0}` etc.)
- **Global**. Added custom callbacks for events. So event `popup.addEventListener("$show",e=>...)` equal to `popup.$onShow = (e)=>...`

---

## 0.5.2 (Mar 29, 2023)

**Fixes**:

- **Controls**. _Need to add border by default otherwise it's invisible on the white body_
- [CircleElement](src/circleElement.ts). _Wrong tooltip position when segment is half of circle_

---

## 0.5.0 (Mar 27, 2023)

**BREAKING CHANGES**:

- **Internals**. Methods `getNumAttr`, `getRefAttr`, `getBoolAttr` is refactored to single `getAttr`
- [SelectControl](src/controls/select.ts). Simplified menu styling
- [PopupElement](src/popup/popupElement.ts). Prop `$isOpen` deprecated in favor of `$isShown`

**New**:

- [SelectManyControl](src/controls/selectMany.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/selectMany)
- [SelectControl](src/controls/select.ts). Added option `multiple` (attribute \[multiple] & $options.multiple)
- [PopupElement](src/popup/popupElement.ts)
  - Option `target` can be SVGElement
  - Option `offset` can be function
  - Added properties `$isShown, $isHidden, $isShowing, $isHidding`
  - Added rule: popup can't be more than `window.innerWidth & window.innerHeight`. The rule impossible to disable!
  - Calling `$show() & $hide()` possible several times at once without re-rendering
  - Events `$willShow & $willHide` have properties `detail.showCase & detail.hideCase`
- [CircleElement](src/circleElement.ts)
  - Added option `minsize` (attribute \[minsize] & $options.minsize)
  - Added option `tooltip` per item ($options.items[0].tooltip)

**Fixes**:

- **Global**. _Sometimes events are not disposed_. Fix for helper onEvent (need to remove events with options as is)
- helper [onFocusLost](src/helpers/onFocusLost.ts). _Isn't fired if stopPropagation is called_
- [TimeControl](src/controls/time.ts). _Extra margin for menu-buttons on Safari_
- [SwitchControl](src/controls/switch.ts). [CheckControl](src/controls/check.ts). _Attribute `initvalue=''` sets value to `true` (expected `false`)_
- [TextareaControl](src/controls/textarea.ts). _`Ctrl + B` makes text bold but it's unexpected for plain textarea_
- **Controls**. _Hover effect on Android devices (expected: no-hover on touch-screens)_
- **Controls**. _Focus frame isn't rounded on Safari_
- **Controls**. _Attributes `initvalue,min,max` for controls Date & Calendar doesn't work on Safari (Date.parse(yyyy-MM-dd) doesn't work by default)_
- **Controls**. _Controls are not rendered if parsing initvalue is wrong_
- **Controls**. _Unexpected autofocus on mask-inputs on Safari_
- **Controls**. _Annoying autoselect on touchscreens._ Now $options.selectOnFocus is disabled by default
- **Combobox controls (Select, Date, Time)**. Now popup isn't opened if user clears control and gets focus at the same time
- **Combobox controls (Select, Date, Time)**. _Click on disabled item throws console.error_
- **Combobox controls (Select, Date, Time)**. _Focus goes to menu-list by keydown 'Tab' in Firefox_
- [SelectControl](src/controls/select.ts). _Sometimes popup isn't not scrolled to selected item during the opening_
- [SpinElement](src/spinElement.ts). _Animation for TwinDualRing doesn't work on Safari 14-_
- [SpinElement](src/spinElement.ts). _Wrong render on option `fit` on Safari 14-_
- [PopupElement](src/popup/popupElement.ts). _Animation for opacity doesn't work on Safari 14-_
- [PopupElement](src/popup/popupElement.ts). _Animation affects on bluring text if user scroll body during the animation_
- [PopupElement](src/popup/popupElement.ts). _Wrong position during dropdownAnimation and several show/hide at once_
- [PopupElement](src/popup/popupElement.ts). Allow to show/hide on double-click (because on some browsers double-click works with huge delay)
- [PopupElement](src/popup/popupElement.ts). _2nd $show() has predefined maxSize & position can be different_
- [PopupElement](src/popup/popupElement.ts). _Popup could be > 100vw_. Now popup has max size 100vw & 100vh (by default)
- [PopupElement](src/popup/popupElement.ts). _No-updates on screensize changes._ Now popup position & size changes with device-rotation
- [PopupElement](src/popup/popupElement.ts). _No popup if mousedown>move>up>click on target_
- [CircleElement](src/circleElement.ts). _Items **color** doesn't work (because attr `[fill]` can't override css-rule)_

---

## 0.4.1 (Jan 27, 2023)

**New**:

- [SpinElement](src/spinElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/spin). Added type **hash**
- [CircleElement](src/circleElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/circle)

**Fixes**:

- [CalendarControl](src/controls/calendar.ts). Different pickers height after scrolling
- helper [WUPScrolled](src/helpers/scrolled.ts). maxHeight left after scrolling finished
- helper [WUPScrolled](src/helpers/scrolled.ts). goto previous sometimes scrolls through the whole range

---

## 0.4.0 (Jan 26, 2023)

**BREAKING CHANGES**:

- Namespaces `WUP...` is refactored from `WUPPopup` to `WUP.Popup` etc. So re-export enums `ShowCases, HideCases, Animations` without prefix now
- helper **animateDropdown** moved into [web-ui-pack/helpers/animate](src/helpers/animate.ts)
- helper **localeInfo** moved into [web-ui-pack/objects/localeInfo](src/objects/localeInfo.ts)
- helper **scrollCarousel** refactored to [WUPScrolled](src/helpers/scrolled.ts) class
- helper **mathSumFloat** moved into [web-ui-pack/helpers/math](src/helpers/math.ts)
- helper **stringUpperCount** moved into [web-ui-pack/helpers/string](src/helpers/string.ts)
- helper **stringLowerCount** moved into [web-ui-pack/helpers/string](src/helpers/string.ts)
- helper **stringPrettify** moved into [web-ui-pack/helpers/string](src/helpers/string.ts)
- [DateControl](src/controls/date.ts). Changed validation message from `This date is disabled` to `This value is disabled`

**New**:

- [WUPTimeObject](src/objects/timeObject.ts) => `Ordinary class Time with hours & minutes`
- [TimeControl](src/controls/time.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/time)
- helper [mathScaleValue](src/helpers/mathScaleValue)
- **Text based controls**. **Mask** supports letters also (previously only digits can be variabled)

**Fixes**:

- helper [localeInfo](src/objects/localeInfo.ts). `AM/PM parsed to 'a' but expected 'A'`
- helper [dateFromString](src/helpers/dateFromString.ts). `12:00 PM throws Error but expected 12:00`
- Icon **check**. Reduced thickness to fit other texts & icons
- [PopupElement](src/popup/popupElement.ts). Changing content size doesn't re-calc popup position
- [PopupElement](src/popup/popupElement.ts). Wrong position if parent has style transform.translate
- [PopupElement](src/popup/popupElement.ts). Content is blured if transform.translate with float values
- [DateControl](src/controls/date.ts). Clearing input doesn't reset $value
- [DateControl](src/controls/date.ts). Required asterisk is removed by opening menu

---

## 0.3.0 (Dec 27, 2022)

**BREAKING CHANGES**:

- [DateControl](src/controls/date.ts):
  - Was
    - changing `$options.format` & attr `[format]` related to all date-strings: attributes `initvalue/min/max`.
    - default value `YYYY-MM-DD`
  - Now
    - changing `$options.format` & attr `[format]` related only to displayed text. All attributes must be pointed in universal format `YYYY-MM-DD`
    - default value depends on user localization; see [locale](src/objects/localeInfo.ts)
    - `$options.firstWeekDay` - default value depends on user localization; see [locale](src/objects/localeInfo.ts)
- [CalendarControl](src/controls/calendar.ts):
  - deprecated static getters `$namesDayShort, $namesMonth, $namesMonthShort` in favor of [localeInfo](src/objects/localeInfo.ts) helper
  - `$options.firstDayOfWeek` is renamed to `firstWeekDay`
  - `$options.firstWeekDay` - default value depends on user localization; see [locale](src/objects/localeInfo.ts)

**New**:

- Helpers [dateToString](src/helpers/dateToString.ts), [dateFromString](src/helpers/dateFromString.ts). Added support **MMM** format
- **Text based controls**. Added `$options` `prefix` & `postfix`
- Controls **Number, Date, Calendar** are locale based and depends on [localeInfo](src/objects/localeInfo.ts) helper
- Added elements
  - [NumberControl](src/controls/number.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/number)
  - [TextareaControl](src/controls/textarea.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/textarea)
- Added [helpers](README.md#helpers)
  - [onScroll](src/helpers/onScroll.ts)
  - [localeInfo](src/objects/localeInfo.ts)
  - [mathSumFloat](src/helpers/mathSumFloat.ts)

**Fixes**:

- helper [promiseWait](src/helpers/promiseWait.ts). _Callback called before time end_
- [PopupElement](src/popup/popupElement.ts) with arrow. _Firefox bug: css filter `drop-shadow` works wrong with angle 180.0_
- [SpinElement](src/spinElement.ts). _Impossible to override color via applying css-var to body `--spin-2`_

---

## 0.2.0 (Dec 09, 2022)

**New**:

- **Controls** throws error if attr [validations] has object-key to undefined value
- Added [mask](http://localhost:8015/control/text) for text based controls
- Added elements
  - [CalendarControl](src/controls/calendar.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/calendar)
  - [DateControl](src/controls/date.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/date)
- Added [helpers](README.md#helpers)
  - [dateCopyTime](src/helpers/dateCopyTime.ts)
  - [dateFromString](src/helpers/dateFromString.ts)
  - [dateToString](src/helpers/dateToString.ts)
  - [onScrollStop](src/helpers/onScrollStop.ts)
  - [scrollCarousel](src/helpers/scrollCarousel.ts)

**Fixes**:

- **Controls**. [Blue highlight blink on tap action](https://stackoverflow.com/questions/25704650/disable-blue-highlight-when-touch-press-object-with-cursorpointer)
- **Controls**. _Click on button `Clear` throws console.error_
- **Controls**. _Validation gets undefined value but must be skipped in this case (value is undefined only for messages or validations.required)_
- [SelectControl](src/controls/select.ts). _Click on custom list-item with nested span doesn't call click-event_
- [SelectControl](src/controls/select.ts). _No scroll to selected element at first opening_
- [SelectControl](src/controls/select.ts). _Sometimes menu isn't opened_
- [SelectControl](src/controls/select.ts). _`noItems` appeared on 2nd menu opening when user created a new value_
- helper [observer](src/helpers/observer.ts). _onChange fired even date.setHours didn't change value_

---

## 0.1.2 (Oct 4, 2022)

- Hotfix: gotReady() calls gotChanges() when element disconnected (possible in React)

---

## 0.1.0 (Sep 14, 2022)

**BREAKING CHANGES**:

- helpers reorganized to WUPHelpers (`WUPHelpers.isEqual`, `WUPHelpers.focusFirst` etc.)
- [PopupElement](src/popup/popupElement.ts). Renamed `$arrowElement` to `$refArrow`

**New**:

- Optimized for webpack (via [sideEffects](https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free))
- Optimized memory consumption (removed auto-bind functions)
- Added [helpers](README.md#helpers)
  - [animateDropdown](src/helpers/animateDropdown.ts)
  - [findScrollParentAll](src/helpers/findScrollParent.ts)
  - [objectClone](src/helpers/objectClone.ts)
  - [isIntoView](src/helpers/isIntoView.ts)
  - [scrollIntoView](src/helpers/scrollIntoView.ts)
  - [stringLowerCount](src/helpers/stringCaseCount.ts)
  - [stringUpperCount](src/helpers/stringCaseCount.ts)
  - [onSpy](src/helpers/onSpy.ts)
- Added elements
  - [SpinElement](src/spinElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/spin)
  - [FormElement](src/formElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/controls)
  - [TextControl](src/controls/text.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/text)
  - [PasswordControl](src/controls/password.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/password)
  - [SwitchControl](src/controls/switch.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/switch)
  - [CheckControl](src/controls/check.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/check)
  - [RadioControl](src/controls/radio.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/radio)
  - [SelectControl](src/controls/select.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/select)
- helper [nestedProperty](src/helpers/nestedProperty.ts): added option `out.hasProp`
- helper [promiseWait](src/helpers/promiseWait.ts): added option `smartOrCallback` to prevent useless pending on already resolved promises

- [PopupElement](src/popup/popupElement.ts)
  - Renamed $arrowElement to $refArrow
  - Added $refresh() - to force update/re-calc position when nested content is changed
  - Added option **animation** with animation-drawer
  - Added option **maxWidthByTarget**
  - Added option **offsetFitElement**
  - Added promise-result for \$hide() and \$show() (resolved by animation time)
  - Allowed to use other inline transform styles
  - Improved listener (filter mouse-move, double-click, mouse-right-click etc.)

---

## 0.0.5 (Apr 4, 2022)

- Fixed helper [onFocusLost](src/helpers/onFocusLost.ts): missed callback when user clicks several times fast
- [PopupElement](src/popup/popupElement.ts)
  - Fixed behavior on target-remove
  - Deprecated shadow mode
  - Fixed half-pixel issue on arrow

---

## 0.0.4 (Apr 1, 2022)

- [PopupElement](src/popup/popupElement.ts)
  - Fixed $options.offset
  - Fixed behavior on target-remove
- Added helper [onSpy](src/helpers/onSpy.ts) to spy on method-call

---

## 0.0.3 (Mar 29, 2022)

- Added [PopupElement](src/popup/popupElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/popup)
- Added [helpers](README.md#helpers)
  - [stringPrettify](src/helpers/stringPrettify.ts)
  - [onEvent](src/helpers/onEvent.ts)
  - [onFocusGot](src/helpers/onFocusGot.ts)
  - [onFocusLost](src/helpers/onFocusLost.ts)
  - [observer](src/helpers/observer.ts)
  - [findScrollParent](src/helpers/findScrollParent.ts)
- Removed helper `detectFocusLeft` in favor `onFocusLost`

---

## 0.0.2 (Nov 30, 2021)

- Added [helpers](README.md#helpers)
  - `detectFocusLeft`
  - [focusFirst](src/helpers/focusFirst.ts)
  - [nestedProperty.set/get](src/helpers/nestedProperty.ts)
  - [promiseWait](src/helpers/promiseWait.ts)
