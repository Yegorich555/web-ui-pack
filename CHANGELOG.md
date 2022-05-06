# Changelog

## 0.0.6 (___)

- [`FormControls`](README.md#controls)

- [`PopupElement`](README.md#popupelement)
  - Added option maxWidthByTarget
  - Added promise-result for $hide()

## 0.0.5 (Apr 4, 2022)

- Fixed helper [`onFocusLost`](<(README.md#helpers)>): missed callback when user clicks several times fast
- [`PopupElement`](README.md#popupelement)
  - Fixed behavior on target-remove
  - Deprecated shadow mode
  - Fixed half-pixel issue on arrow

## 0.0.4 (Apr 1, 2022)

- [`PopupElement`](README.md#popupelement)
  - Fixed $options.offset
  - Fixed behavior on target-remove
- Added helper [`onSpy`](README.md#helpers) to spy on method-call

## 0.0.3 (Mar 29, 2022)

- Added [`popupElement`](README.md#popupelement)
- Added [helpers](README.md#helpers)
  - `stringPrettify`
  - `onEvent`
  - `onFocusGot`
  - `onFocusLost`
  - `observer`
  - `findScrollParent`
- Removed helper `detectFocusLeft` in favor `onFocusLost`

## 0.0.2 (Nov 30, 2021)

- Added [helpers](README.md#helpers)
  - `detectFocusLeft`
  - `focusFirst`
  - `nestedProperty.set/get`
  - `promiseWait`
