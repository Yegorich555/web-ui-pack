# Issues

Audit of JSDoc (`src/**`), [README.md](README.md), [CHANGELOG.md](CHANGELOG.md), [CODESTYLE.md](CODESTYLE.md) against the code (Oct 1, 2026). Line numbers are as of commit `72ab5f8b`.

## Code bugs (found during docs audit)

Docs (README, CHANGELOG, CODESTYLE, JSDoc) are fixed; JSDoc for the items below describes the intended behavior.

- [ ] [observer.ts:282-294](src/helpers/observer.ts#L282-L294). Trap `deleteProperty` fires the event but never deletes the prop (no `Reflect.deleteProperty`) => after `delete obj.x` the prop is still in raw object
- [ ] [password.ts:127](src/controls/password.ts#L127). Rule `special` ignores `setV.min`: fails only when count of special chars is 0 => `{ min: 2 }` passes `"a-b"`
- [ ] [radio.ts:316](src/controls/radio.ts#L316). `valueToStrCompare` returns number for numeric `id` (select.ts wraps with `.toString()`) => `valueFromStorage` (`=== str`) never matches. Fix: `((a.value as any).id ?? a.value).toString()`
- [ ] [notifyElement.ts:116-117](src/notifyElement.ts#L116-L117). `pauseOnHover` & `pauseOnWinBlur` missed in `observedOptions` => attrs `w-pauseOnHover/w-pauseOnWinBlur` (declared in JSXProps :62-63) are silently ignored
- [ ] [baseControl.ts:579](src/controls/baseControl.ts#L579). `hasAttribute("initvalue")` must be `"w-initvalue"` (always false now)
- [ ] [popupElement.ts:61](src/popup/popupElement.ts#L61). Preact `IntrinsicElements["wup-popup"]` uses `WUP.Modal.JSXProps` (copy-paste) => Preact gets modal attrs (`w-autoClose`, modal `w-placement`) and loses `w-animation`. React (:40) uses `WUP.BaseModal.JSXProps & WUP.Popup.Attributes`
- [ ] [number.ts:28](src/controls/number.ts#L28). `WUP.Number.ValidityMap extends WUP.Text.ValidityMap` exposes `email`, but runtime rules have only `required/min/max` => `validations={{ email: true }}` compiles & throws `Validation rule [email] is not found`. Fix: `Omit<..., "email">` (as baseCombo does)
- [ ] [password.ts:23 vs :29](src/controls/password.ts#L23-L29). Options omit `mask|maskholder|storageKey|storage`; JSXProps omit `mask|maskholder|prefix|postfix` => JSX offers unsupported `w-storageKey/w-storage`, hides working `w-prefix/w-postfix`
- [ ] [circleElement.ts:94](src/circleElement.ts#L94). JSXProps omit `w-hoverOpenTimeout/w-hoverCloseTimeout` though they're observed & parsed as numbers
- [ ] [popupElement.types.ts:141-142](src/popup/popupElement.types.ts#L141-L142). Readonly attr `hide` is declared but popup never sets it (uses `[show]`/`[open]`)
- [ ] [selectMany.ts:17](src/controls/selectMany.ts#L17). `ValidityMap extends WUP.BaseCombo.ValidityMap` instead of `WUP.Select.ValidityMap` => `minCount/maxCount` missed in TS though inherited at runtime
- [ ] [select.ts:924](src/controls/select.ts#L924) & [baseCombo.ts:159](src/controls/baseCombo.ts#L159). `readOnlyInput` as number (auto-mode) is treated as plain truthy (skips `", "` delimiter, drops `aria-autocomplete`) even when input is editable
- [ ] [scrolled.ts:217](src/helpers/scrolled.ts#L217). `Math.min(pi, p.total)` allows `pi === total`; with `cycled` `goTo(total)` from 0 does nothing. Must be `total - 1`
- [ ] [observer.ts:325](src/helpers/observer.ts#L325). `valueOf` defined as `() => obj.valueOf` returns the function, not the object => `x.valueOf() === y.valueOf()` is `true` for any 2 observed records; assigning a new object with the same content still fires `onPropChanged`
- [ ] [scrolled.ts:14](src/helpers/scrolled.ts#L14). Type `NextStateRender` is unused
- [ ] [string.ts:1-4](src/helpers/string.ts#L1-L4). `isSpecialSymbol` uses `c > 123` => `{` counted as letter: `stringLowerCount("a{b") === 3`. Must be `c > 122`
- [ ] [popupElement.ts:15](src/popup/popupElement.ts#L15). `attachLst` is strong `Map` cleared only by `detach()` => leaks if target removed without `detach()` (JSDoc of `$attach` claims it's not required). Consider `WeakMap` as in sortElement.ts:19
- [ ] [popupElement.ts:288](src/popup/popupElement.ts#L288). `if (!popup.goOpen.call(popup, v, e))`: `goOpen` returns `Promise<boolean>` (always truthy) => the branch that removes a just-created popup when opening is rejected never runs
- [ ] [dateFromString.ts:25-27](src/helpers/dateFromString.ts#L25-L27). `throwOutOfRange` default `true` works only when `options` omitted: `dateFromString("2022-02-31", "YYYY-MM-DD", {})` returns `null`. Merge defaults or document it
- [ ] [types.d.ts:1-6](src/types.d.ts#L1-L6). `ObjectKeys<T>`: arrays match `T extends object` first => `Object.keys(arr)` typed as `(keyof T[])[]` instead of `string[]`
