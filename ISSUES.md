# Issues

Audit of JSDoc (`src/**`), [README.md](README.md), [CHANGELOG.md](CHANGELOG.md), [CODESTYLE.md](CODESTYLE.md) against the code (Oct 1, 2026). Line numbers are as of commit `72ab5f8b`.

## Code bugs (found during docs audit)

Docs (README, CHANGELOG, CODESTYLE, JSDoc) are fixed; JSDoc for the items below describes the intended behavior.

- [ ] [radio.ts:316](src/controls/radio.ts#L316). `valueToStrCompare` returns number for numeric `id` (select.ts wraps with `.toString()`) => `valueFromStorage` (`=== str`) never matches. Fix: `((a.value as any).id ?? a.value).toString()`
- [ ] [notifyElement.ts:116-117](src/notifyElement.ts#L116-L117). `pauseOnHover` & `pauseOnWinBlur` missed in `observedOptions` => attrs `w-pauseOnHover/w-pauseOnWinBlur` (declared in JSXProps :62-63) are silently ignored
- [ ] [baseControl.ts:579](src/controls/baseControl.ts#L579). `hasAttribute("initvalue")` must be `"w-initvalue"` (always false now)
- [ ] [popupElement.ts:61](src/popup/popupElement.ts#L61). Preact `IntrinsicElements["wup-popup"]` uses `WUP.Modal.JSXProps` (copy-paste) => Preact gets modal attrs (`w-autoClose`, modal `w-placement`) and loses `w-animation`. React (:40) uses `WUP.BaseModal.JSXProps & WUP.Popup.Attributes`
- [ ] [number.ts:28](src/controls/number.ts#L28). `WUP.Number.ValidityMap extends WUP.Text.ValidityMap` exposes `email`, but runtime rules have only `required/min/max` => `validations={{ email: true }}` compiles & throws `Validation rule [email] is not found`. Fix: `Omit<..., "email">` (as baseCombo does)
- [ ] [circleElement.ts:94](src/circleElement.ts#L94). JSXProps omit `w-hoverOpenTimeout/w-hoverCloseTimeout` though they're observed & parsed as numbers
- [ ] [popupElement.types.ts:141-142](src/popup/popupElement.types.ts#L141-L142). Readonly attr `hide` is declared but popup never sets it (uses `[show]`/`[open]`)
- [ ] [selectMany.ts:17](src/controls/selectMany.ts#L17). `ValidityMap extends WUP.BaseCombo.ValidityMap` instead of `WUP.Select.ValidityMap` => `minCount/maxCount` missed in TS though inherited at runtime
- [ ] [select.ts:924](src/controls/select.ts#L924) & [baseCombo.ts:159](src/controls/baseCombo.ts#L159). `readOnlyInput` as number (auto-mode) is treated as plain truthy (skips `", "` delimiter, drops `aria-autocomplete`) even when input is editable
- [ ] [popupElement.ts:15](src/popup/popupElement.ts#L15). `attachLst` is strong `Map` cleared only by `detach()` => leaks if target removed without `detach()` (JSDoc of `$attach` claims it's not required). Consider `WeakMap` as in sortElement.ts:19
- [ ] [popupElement.ts:288](src/popup/popupElement.ts#L288). `if (!popup.goOpen.call(popup, v, e))`: `goOpen` returns `Promise<boolean>` (always truthy) => the branch that removes a just-created popup when opening is rejected never runs
- [ ] [dateFromString.ts:25-27](src/helpers/dateFromString.ts#L25-L27). `throwOutOfRange` default `true` works only when `options` omitted: `dateFromString("2022-02-31", "YYYY-MM-DD", {})` returns `null`. Merge defaults or document it
- [ ] [types.d.ts:1-6](src/types.d.ts#L1-L6). `ObjectKeys<T>`: arrays match `T extends object` first => `Object.keys(arr)` typed as `(keyof T[])[]` instead of `string[]`
