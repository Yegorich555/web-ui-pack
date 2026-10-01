# Issues

- [notifyElement.ts:116-117](src/notifyElement.ts#L116-L117). `pauseOnHover` & `pauseOnWinBlur` missed in `observedOptions` => attrs `w-pauseOnHover/w-pauseOnWinBlur` (declared in JSXProps :62-63) are silently ignored
- [select.ts:924](src/controls/select.ts#L924) & [baseCombo.ts:159](src/controls/baseCombo.ts#L159). `readOnlyInput` as number (auto-mode) is treated as plain truthy (skips `", "` delimiter, drops `aria-autocomplete`) even when input is editable
- [popupElement.ts:15](src/popup/popupElement.ts#L15). `attachLst` is strong `Map` cleared only by `detach()` => leaks if target removed without `detach()` (JSDoc of `$attach` claims it's not required). Consider `WeakMap` as in sortElement.ts:19
- [popupElement.ts:288](src/popup/popupElement.ts#L288). `if (!popup.goOpen.call(popup, v, e))`: `goOpen` returns `Promise<boolean>` (always truthy) => the branch that removes a just-created popup when opening is rejected never runs
- [dateFromString.ts:25-27](src/helpers/dateFromString.ts#L25-L27). `throwOutOfRange` default `true` works only when `options` omitted: `dateFromString("2022-02-31", "YYYY-MM-DD", {})` returns `null`. Merge defaults or document it
