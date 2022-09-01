# Changelog

## 0.1.0 (\_\_\_)

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
  - Improved listener (filter mouse-move, double-click etc.)

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
