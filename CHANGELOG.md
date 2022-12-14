# Changelog

## 0.3.0 (\_\_\_)

**BREAKING CHANGES**:

- DateControl:
  - Was
    - changing `$options.format` & attr `[format]` related to all date-strings: attributes `initvalue/min/max`.
    - default value `YYYY-MM-DD`
  - Now
    - changing `$options.format` & attr `[format]` related only to displayed text. All attributes must be pointed in universal format `YYYY-MM-DD`
    - default value depends on user localization; see [locale](src/helpers/localeInfo.ts)

**Features**:

- Added [helpers](README.md#helpers)
  - [`onScroll`](src/helpers/onScroll.ts)
  - [`localeInfo`](src/helpers/localeInfo.ts)
  - [`mathSumFloat`](src/helpers/mathSumFloat.ts)

## 0.2.0 (Dec 09, 2022)

**Fixes**:

- Controls. [Blue highlight blink on tap action](https://stackoverflow.com/questions/25704650/disable-blue-highlight-when-touch-press-object-with-cursorpointer)
- Controls. Click on button `Clear` throws console.error
- Controls. Validation gets undefined value but must be skipped in this case (value is undefined only for messages or validations.required)
- SelectControl. Click on custom list-item with nested span doesn't call click-event
- SelectControl. No scroll to selected element at first opening
- SelectControl. Sometimes menu isn't opened
- SelectControl. Fix `noItems` appeared on 2nd menu opening when user created a new value
- Helper. observer. Fix onChange fired even date.setHours didn't change value

**Features**:

- Controls throws error if attr [validations] has object-key to undefined value
- Added [mask](http://localhost:8015/control/text) for text based controls
- Added elements
  - [CalendarControl](src/controls/calendar.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/calendar)
  - [DateControl](src/controls/date.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/date)
- Added [helpers](README.md#helpers)
  - [`dateCopyTime`](src/helpers/dateCopyTime.ts)
  - [`dateFromString`](src/helpers/dateFromString.ts)
  - [`dateToString`](src/helpers/dateToString.ts)
  - [`onScrollStop`](src/helpers/onScrollStop.ts)
  - [`scrollCarousel`](src/helpers/scrollCarousel.ts)

## 0.1.2 (Oct 4, 2022)

- Hotfix: gotReady() calls gotChanges() when element disconnected (possible in React)

## 0.1.0 (Sep 14, 2022)

**BREAKING CHANGES**:

- helpers reorganized to WUPHelpers (`WUPHelpers.isEqual`, `WUPHelpers.focusFirst` etc.)
- PopupElement. Renamed $arrowElement to $refArrow

**Features**:

- Optimized for webpack (via [sideEffects](https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free))
- Optimized memory consumption (removed auto-bind functions)
- Added [helpers](README.md#helpers)
  - [`animateDropdown`](src/helpers/animateDropdown.ts)
  - [`findScrollParentAll`](src/helpers/findScrollParent.ts)
  - [`objectClone`](src/helpers/objectClone.ts)
  - [`isIntoView`](src/helpers/isIntoView.ts)
  - [`scrollIntoView`](src/helpers/scrollIntoView.ts)
  - [`stringLowerCount`](src/helpers/stringCaseCount.ts)
  - [`stringUpperCount`](src/helpers/stringCaseCount.ts)
  - [`onSpy`](src/helpers/onSpy.ts)
- Added elements
  - [SpinElement](src/spinElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/spin)
  - [FormElement](src/formElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/controls)
  - [TextControl](src/controls/text.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/text)
  - [PasswordControl](src/controls/password.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/password)
  - [SwitchControl](src/controls/switch.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/switch)
  - [CheckControl](src/controls/check.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/check)
  - [RadioControl](src/controls/radio.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/radio)
  - [SelectControl](src/controls/select.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/control/select)
- Helper [nestedProperty](src/helpers/nestedProperty.ts): added option `out.hasProp`
- Helper [promiseWait](src/helpers/promiseWait.ts): added option `smartOrCallback` to prevent useless pending on already resolved promises

- [`PopupElement`](src/popup/popupElement.ts)
  - Renamed $arrowElement to $refArrow
  - Added $refresh() - to force update/recalc position when nested content is changed
  - Added option **animation** with animation-drawer
  - Added option **maxWidthByTarget**
  - Added option **offsetFitElement**
  - Added promise-result for \$hide() and \$show() (resolved by animation time)
  - Allowed to use other inline transform styles
  - Improved listener (filter mouse-move, double-click, mouse-right-click etc.)

## 0.0.5 (Apr 4, 2022)

- Fixed helper [`onFocusLost`](src/helpers/onFocusLost.ts): missed callback when user clicks several times fast
- [`PopupElement`](src/popup/popupElement.ts)
  - Fixed behavior on target-remove
  - Deprecated shadow mode
  - Fixed half-pixel issue on arrow

## 0.0.4 (Apr 1, 2022)

- [`PopupElement`](src/popup/popupElement.ts)
  - Fixed $options.offset
  - Fixed behavior on target-remove
- Added helper [`onSpy`](src/helpers/onSpy.ts) to spy on method-call

## 0.0.3 (Mar 29, 2022)

- Added [`PopupElement`](src/popup/popupElement.ts) [**demo**](https://yegorich555.github.io/web-ui-pack/popup)
- Added [helpers](README.md#helpers)
  - [`stringPrettify`](src/helpers/stringPrettify.ts)
  - [`onEvent`](src/helpers/onEvent.ts)
  - [`onFocusGot`](src/helpers/onFocusGot.ts)
  - [`onFocusLost`](src/helpers/onFocusLost.ts)
  - [`observer`](src/helpers/observer.ts)
  - [`findScrollParent`](src/helpers/findScrollParent.ts)
- Removed helper `detectFocusLeft` in favor `onFocusLost`

## 0.0.2 (Nov 30, 2021)

- Added [helpers](README.md#helpers)
  - `detectFocusLeft`
  - [`focusFirst`](src/helpers/focusFirst.ts)
  - [`nestedProperty.set/get`](src/helpers/nestedProperty.ts)
  - [`promiseWait`](src/helpers/promiseWait.ts)
