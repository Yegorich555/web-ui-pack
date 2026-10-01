# Issues

Audit of JSDoc (`src/**`), [README.md](README.md), [CHANGELOG.md](CHANGELOG.md), [CODESTYLE.md](CODESTYLE.md) against the code (Oct 1, 2026). Line numbers are as of commit `72ab5f8b`.

## Code bugs (found during docs audit)

- [ ] [observer.ts:282-294](src/helpers/observer.ts#L282-L294). Trap `deleteProperty` fires the event but never deletes the prop (no `Reflect.deleteProperty`) => after `delete obj.x` the prop is still in raw object
- [ ] [password.ts:127](src/controls/password.ts#L127). Rule `special` ignores `setV.min`: fails only when count of special chars is 0 => `{ min: 2 }` passes `"a-b"`
- [ ] [radio.ts:316](src/controls/radio.ts#L316). `valueToStrCompare` returns number for numeric `id` (select.ts wraps with `.toString()`) => `valueFromStorage` (`=== str`) never matches. Fix: `((a.value as any).id ?? a.value).toString()`
- [ ] [notifyElement.ts:116-117](src/notifyElement.ts#L116-L117). `pauseOnHover` & `pauseOnWinBlur` missed in `observedOptions` => attrs `w-pauseOnHover/w-pauseOnWinBlur` (declared in JSXProps :62-63) are silently ignored
- [ ] [baseControl.ts:579](src/controls/baseControl.ts#L579). `hasAttribute("initvalue")` must be `"w-initvalue"` (always false now)
- [ ] [popupElement.ts:61](src/popup/popupElement.ts#L61). Preact `IntrinsicElements["wup-popup"]` uses `WUP.Modal.JSXProps` (copy-paste) => Preact gets modal attrs (`w-autoClose`, modal `w-placement`) and loses `w-animation`. React (:40) uses `WUP.BaseModal.JSXProps & WUP.Popup.Attributes`
- [ ] [number.ts:28](src/controls/number.ts#L28). `WUP.Number.ValidityMap extends WUP.Text.ValidityMap` exposes `email`, but runtime rules have only `required/min/max` => `validations={{ email: true }}` compiles & throws `Validation rule [email] is not found`. Fix: `Omit<..., "email">` (as baseCombo does)
- [ ] [selectMany.ts:17](src/controls/selectMany.ts#L17). `ValidityMap extends WUP.BaseCombo.ValidityMap` instead of `WUP.Select.ValidityMap` => `minCount/maxCount` missed in TS though inherited at runtime
- [ ] [select.ts:924](src/controls/select.ts#L924) & [baseCombo.ts:159](src/controls/baseCombo.ts#L159). `readOnlyInput` as number (auto-mode) is treated as plain truthy (skips `", "` delimiter, drops `aria-autocomplete`) even when input is editable
- [ ] [scrolled.ts:217](src/helpers/scrolled.ts#L217). `Math.min(pi, p.total)` allows `pi === total`; with `cycled` `goTo(total)` from 0 does nothing. Must be `total - 1`
- [ ] [string.ts:1-4](src/helpers/string.ts#L1-L4). `isSpecialSymbol` uses `c > 123` => `{` counted as letter: `stringLowerCount("a{b") === 3`. Must be `c > 122`
- [ ] [popupElement.ts:15](src/popup/popupElement.ts#L15). `attachLst` is strong `Map` cleared only by `detach()` => leaks if target removed without `detach()` (docs claim it's not required; see JSDoc section). Consider `WeakMap` as in sortElement.ts:19
- [ ] [dateFromString.ts:25-27](src/helpers/dateFromString.ts#L25-L27). `throwOutOfRange` default `true` works only when `options` omitted: `dateFromString("2022-02-31", "YYYY-MM-DD", {})` returns `null`. Merge defaults or document it
- [ ] [types.d.ts:1-6](src/types.d.ts#L1-L6). `ObjectKeys<T>`: arrays match `T extends object` first => `Object.keys(arr)` typed as `(keyof T[])[]` instead of `string[]`

## README.md

- [ ] [L74](README.md#L74). `WUPModal.$useConfirmHook` => `WUPModalElement.$useConfirmHook`
- [ ] [L88](README.md#L88). Double slash in link `src/controls//text.mask.ts`
- [ ] [L125](README.md#L125). `<wup-spin inline />` => `<wup-spin w-inline />`
- [ ] [L148](README.md#L148). `PopupOpenCases` isn't exported from `web-ui-pack/popup/popupElement` (it's in `web-ui-pack/popup/popupElement.types`)
- [ ] [L170](README.md#L170). `;` inside array literal (syntax error)
- [ ] [L171](README.md#L171). Mismatched quotes `'ignore align to fit layout\``
- [ ] [L192-198](README.md#L192-L198). `original(...arguments)` loses `this` => `original.apply(this, arguments)`; returns `null` but `goOpen` returns `Promise<boolean>`
- [ ] [L204](README.md#L204). `goOpen(openCase: PopupOpenCases): boolean` doesn't match `goOpen(openCase, ev): Promise<boolean>` => TS override error
- [ ] [L239](README.md#L239). Unclosed quote `"web-ui-pack;`. Also root exports helpers only via namespace `WUPHelpers`, so `import { focusFirst } from "web-ui-pack"` doesn't exist
- [ ] [L244](README.md#L244). `animateStack` links to `animateDropdown.ts`
- [ ] [L281](README.md#L281). `onScroll` links to `onScrollStop.ts`
- [ ] [L15](README.md#L15). `npm i & npm start` => `npm i && npm start`
- [ ] [L294](README.md#L294). Typo "avoding"
- [ ] [L296](README.md#L296). Typo "Plane time object" => "Plain"
- [ ] [Helpers](README.md#L236). Exported but not listed: `animate`, `isEqual`

## CHANGELOG.md

- [ ] Broken link `src/modalElement.ts.ts` at [L24](CHANGELOG.md#L24), [L86](CHANGELOG.md#L86), [L213](CHANGELOG.md#L213), [L233](CHANGELOG.md#L233), [L245](CHANGELOG.md#L245)
- [ ] [L74](CHANGELOG.md#L74). Unclosed link `(src/controls/selectMany.ts.`
- [ ] [L127](CHANGELOG.md#L127), [L826](CHANGELOG.md#L826). `src/helpers/stringPrettify.ts` => `src/helpers/string.ts`
- [ ] [L45](CHANGELOG.md#L45). `-**Combobox controls**` missed space => not a list item, sub-items render wrong
- [ ] [L316-320](CHANGELOG.md#L316-L320). Triple `---`
- [ ] Missed `---` between versions 1.2.8/1.2.7, 1.2.6/1.2.5, 1.2.5/1.2.4
- [ ] (optional) Links to renamed/removed files in old versions: [L670](CHANGELOG.md#L670) `mathScaleValue`, [L714](CHANGELOG.md#L714) `mathSumFloat.ts`, [L738](CHANGELOG.md#L738) `scrollCarousel.ts`, [L776-777](CHANGELOG.md#L776-L777) `stringCaseCount.ts`
- [ ] (optional) 1.2.9: merge [L15](CHANGELOG.md#L15) & [L18](CHANGELOG.md#L18) (SelectMany), [L16](CHANGELOG.md#L16) & [L17](CHANGELOG.md#L17) (Select & SelectMany); [L22](CHANGELOG.md#L22) Form `$onChange` is a new feature but placed in Fixes

## CODESTYLE.md

- [ ] [L126](CODESTYLE.md#L126), [L134](CODESTYLE.md#L134). `P` is undefined => `Props`
- [ ] [L163-175](CODESTYLE.md#L163-L175). `{/*... form here*/}` before `<>` inside `return (` (JSX syntax error)
- [ ] [L135](CODESTYLE.md#L135). `Object.assign($options, nextProps, ...)` also puts `onChange/value/initValue/className` into `$options`
- [ ] [L7](CODESTYLE.md#L7). Typo "desides"

## JSDoc. Controls

### baseControl.ts

- [ ] [:115-118](src/controls/baseControl.ts#L115-L118). `focusDebounceMs` documented for onFocusLost, but it's passed only to `onFocusGot` (:643); `onFocusLostEv` (:632) uses helper default 100ms
- [ ] [:173 vs :178](src/controls/baseControl.ts#L173-L178). `storageKey`: "empty string or `true` to inherit from name" vs "emptyString (means `false`)". Code: `""` => off. Remove "empty string or" from :173
- [ ] [:159-160](src/controls/baseControl.ts#L159-L160). `validationCase` default mentions `onSubmit` that doesn't exist in `ValidationCases` (actual: `onChangeSmart | onFocusLost | onFocusWithValue`)
- [ ] [:162](src/controls/baseControl.ts#L162). `validateDebounceMs` "summarized with $options.debounce": no such option (Text option is `debounceMs`)
- [ ] [:181](src/controls/baseControl.ts#L181). `@see {@link WUP.BaseControl.Options.storekey}` => `storageKey`
- [ ] [:203](src/controls/baseControl.ts#L203). `w-readonly` deprecated "use [disabled] instead" => `[readonly]`
- [ ] [:211-214](src/controls/baseControl.ts#L211-L214). `w-focusDebounceMs` & `w-validationRules` point to `$defaults.validationCase` => `focusDebounceMs` / `validationRules`
- [ ] [:222](src/controls/baseControl.ts#L222). `w-validations` `@defaultValue [4,4]` => `null`
- [ ] [:230](src/controls/baseControl.ts#L230). Attr `required` "@deprecated Use [required] for styling" deprecates itself; probably `@readonly` (as `invalid`)
- [ ] [:128](src/controls/baseControl.ts#L128). Example isn't a function: `isNumber = (v === undefined || ...) && "..."` => `(v) => (...) && "..."`
- [ ] [:149](src/controls/baseControl.ts#L149). `un\defined` in example
- [ ] [:153](src/controls/baseControl.ts#L153). Tip "use el.validations getter instead" but `validations` is `protected` (:693); "doesn't affect $options.validations" is misleading (real difference is merge with `$defaults.validations`)
- [ ] [:871](src/controls/baseControl.ts#L871). `goShowError` "point null to show all validation rules": falsy `err` throws `Error message missed` (:873-875)
- [ ] [:112](src/controls/baseControl.ts#L112), [formElement.ts:75](src/formElement.ts#L75). `readOnly` "Disallow copy value": readonly allows copying
- [ ] [:84](src/controls/baseControl.ts#L84). Mismatched quotes `'This field is required\`` (same in text.ts:17,19,21, number.ts:29,31)
- [ ] [:148](src/controls/baseControl.ts#L148). `$default.validationRules` => `$defaults`
- [ ] [:167](src/controls/baseControl.ts#L167). Sentence ends with dangling "OR"
- [ ] [:386](src/controls/baseControl.ts#L386). "comparisson"; "static.isEqual option" => `static $isEqual` method
- [ ] [:927](src/controls/baseControl.ts#L927). `valueFromStorage` says "serialize" => "deserialize"
- [ ] [:1098](src/controls/baseControl.ts#L1098). Public `clearValue()` uses `/*` instead of `/**`

### baseCombo.ts

- [ ] [:53](src/controls/baseCombo.ts#L53). `MenuOpenCases.inputClick` / `MenuOpenCases.click` don't exist => `onClickInput` / `onClick`
- [ ] [:14](src/controls/baseCombo.ts#L14). Option `autofocus` => `autoFocus`
- [ ] [:137](src/controls/baseCombo.ts#L137). "resolved resolved"

### text.ts / text.mask.ts / text.history.ts

- [ ] [text.ts:36-38](src/controls/text.ts#L36-L38). `mask` "enables validation 'mask'": no rule `mask` exists (incomplete mask => `_inputError = $errorMask` via internal `_invalidInput`); also applies to any mask, not only numeric
- [ ] [text.ts:268](src/controls/text.ts#L268). `renderPostfix` doc says "prefix"
- [ ] [text.ts:386](src/controls/text.ts#L386). `gotInput` "called on focusGot, focusLost": nothing calls it on focus; only from input event
- [ ] [text.ts:447](src/controls/text.ts#L447). "proccess"
- [ ] [text.mask.ts:220](src/controls/text.mask.ts#L220). "carret"
- [ ] [text.mask.ts:326](src/controls/text.mask.ts#L326), [:350](src/controls/text.mask.ts#L350). `/*` instead of `/**`
- [ ] [text.history.ts:219](src/controls/text.history.ts#L219). "timetout"

### textarea.ts / textarea.input.ts

- [ ] [textarea.ts:66](src/controls/textarea.ts#L66). innerHTML tutorial shows `<span contenteditable>`; real is `<wup-areainput contenteditable="true" role="textbox" aria-multiline="true">`
- [ ] [textarea.input.ts:59](src/controls/textarea.input.ts#L59). `value` "get/set (br converted into '\n')": only getter converts; setter writes raw `innerHTML`
- [ ] [textarea.input.ts:49](src/controls/textarea.input.ts#L49). `/*` instead of `/**`

### password.ts

- [ ] [:17](src/controls/password.ts#L17). `special` doc says count < min (see code bug above)
- [ ] [:106](src/controls/password.ts#L106). `$ariaDescription` doc "input cleared" (copy-paste); actual `"press Alt + V to show/hide password"`
- [ ] [:23 vs :29](src/controls/password.ts#L23-L29). Options omit `mask|maskholder|storageKey|storage`; JSXProps omit `mask|maskholder|prefix|postfix` => JSX offers unsupported `w-storageKey/w-storage`, hides working `w-prefix/w-postfix`
- [ ] [:19](src/controls/password.ts#L19). `confirm` "previous sibling wup-pwd": actually previous `wup-pwd` in document order; typo "siblint"
- [ ] [:90-97](src/controls/password.ts#L90-L97). innerHTML tutorial misses `<button eye/>`

### number.ts

- [ ] [:42-44](src/controls/number.ts#L42-L44). `offset` example is backwards: `offset: 20` + typed `100` => stored `80` (`parseInput` does `v -= offset`)
- [ ] [:29-32](src/controls/number.ts#L29-L32). `max` "If $value < pointed" => `>`; messages are "Min value is {x}" / "Max value is {x}"
- [ ] [:20-22](src/controls/number.ts#L20-L22). `maxDecimal` default 0, but in `$format` it's `maxDecimal ?? minDecimal ?? 0`
- [ ] [:23](src/controls/number.ts#L23). "Minimun"

### select.ts / selectMany.ts / select.example.ts

- [ ] [select.ts:48-51](src/controls/select.ts#L48-L51). `maxCount` copy of `minCount` ("Count of minimal values"); both refer to option `multi` => `multiple`
- [ ] [select.ts:67-70](src/controls/select.ts#L67-L70). `readOnlyInput` number: doesn't mention it's ignored with `allowNewValue` (:385); see code bug above
- [ ] [select.ts:59-60](src/controls/select.ts#L59-L60). `* * @defaultValue false` (stray `*`, tag not parsed)
- [ ] [select.ts:16-33](src/controls/select.ts#L16-L33). `MenuItem.text` example: `<button class='delete'><button>` not closed; `control.$closeMenu()` doesn't exist on `WUPBaseControl`
- [ ] [select.ts:75](src/controls/select.ts#L75), [radio.ts:28](src/controls/radio.ts#L28). `{@link MenuItems}` / `WUP.Select.MenuItems` => `WUP.Select.MenuItem`
- [ ] [select.ts:300-301](src/controls/select.ts#L300-L301), [radio.ts:341-342](src/controls/radio.ts#L341-L342). `valueToStorage` "if item.text isn't function stores text": stores `value.id ?? value` when `value != null`, `text` only when `value == null`
- [ ] [select.ts:139-145](src/controls/select.ts#L139-L145), [selectMany.ts:95-111](src/controls/selectMany.ts#L95-L111). innerHTML tutorials put `<wup-popup menu>` inside `<label>` (it's a sibling, baseCombo.ts:265); SelectMany `<strong>` is label's first child, not after `<input/>`
- [ ] [select.ts:187](src/controls/select.ts#L187). `$filterMenuItem` `inputValue` "(trimStart + lowercase)": full `.trim()`; with `multiple` only the chunk after last comma
- [ ] [select.ts:709-710](src/controls/select.ts#L709-L710). `focusMenuItemByIndex` "or reset is index is null": `index: number`, no null branch
- [ ] [selectMany.ts:22](src/controls/selectMany.ts#L22). `sortable` "Shift/Ctrl/Meta + arrows": only Shift + ArrowLeft/ArrowRight on focused item
- [ ] [selectMany.ts:32](src/controls/selectMany.ts#L32). "SelectManControl"
- [ ] [select.example.ts:21-22](src/controls/select.example.ts#L21-L22). Custom validators without `undefined` guard (throw on empty value / `validationShowAll`); `$initValue = "Some value"` without items => "Not found in items"

### date.ts / time.ts / calendar.ts

- [ ] [time.ts:36](src/controls/time.ts#L36). `menuButtonsOff` "Set `false` to hide": `true` hides (:423)
- [ ] [time.ts:64-70](src/controls/time.ts#L64-L70). `w-exclude` example uses array, but option expects `{ test: (v, c) => boolean }`; nested `/** ... /**` comment
- [ ] [calendar.ts:96-97](src/controls/calendar.ts#L96-L97). Same nested `/** ... /**` comment
- [ ] [time.ts:119](src/controls/time.ts#L119). Class example invalid: `min=new WUPTimeObject(01,05)` (`=` in object literal, octal literals), unfinished `exclude=`
- [ ] [date.ts:21-26](src/controls/date.ts#L21-L26), [time.ts:17-20](src/controls/time.ts#L17-L20). Messages 'Min date is'/'Max date is'/'This date is disabled'/'Min time is' => real 'Min value is'/'Max value is'/'This value is disabled'; `max` says "Enabled if option [min]"
- [ ] [date.ts:112](src/controls/date.ts#L112), [calendar.ts:152](src/controls/calendar.ts#L152). `el.$initValue = "1990-10-24"`: typed `Date`, setter doesn't parse strings
- [ ] [date.ts:195-197](src/controls/date.ts#L195-L197). Note "'yyyy-mm-dd' correct is 'yyyy-MM-dd'" outdated (`format.toUpperCase()` is used)
- [ ] [date.ts:38-40](src/controls/date.ts#L38-L40). `sync` tutorial ends mid-sentence "* Option \`"; "TimControl", "selected data" => "date"
- [ ] [date.ts:68](src/controls/date.ts#L68). `w-sync` "(id, `next` or `false`)": id needs `#id`; `prev` is supported too
- [ ] [time.ts:114](src/controls/time.ts#L114). `var(--ctrl-time-icon-img-lg)` doesn't exist => `--wup-icon-time-lg`
- [ ] [time.ts:60,62](src/controls/time.ts#L60-L62). `w-min/w-max` "User can't select date" => "time"
- [ ] [calendar.ts:825](src/controls/calendar.ts#L825). `selectItem` "(set aria-selected and focus)": doesn't focus
- [ ] [calendar.ts:452-454](src/controls/calendar.ts#L452-L454). JSDoc for `getDayPicker()` attached to private field `#isDayWeeksAdded`
- [ ] [calendar.ts:856](src/controls/calendar.ts#L856). `normalizeToUTC` "@returns new object-date": same object when `utc`
- [ ] [calendar.ts:254](src/controls/calendar.ts#L254). "re-rended"

### radio.ts / switch.ts

- [ ] [radio.ts:312-320](src/controls/radio.ts#L312-L320). "Returns string for storage" (see code bug above)
- [ ] [radio.ts:11-17](src/controls/radio.ts#L11-L17). Proxy tutorial outdated (`excludeNested: true` => `el.$options.items === items` is `true`); syntax errors `[text: "1", ...]`, `)},1)`
- [ ] [radio.ts:32](src/controls/radio.ts#L32). `<wup-radio ...></wup-circle>`
- [ ] [switch.ts:18](src/controls/switch.ts#L18). `defaultChecked` "use `initValue`" => `w-initValue`

## JSDoc. Elements

- [ ] [formElement.ts:60](src/formElement.ts#L60). `submitActions` default misses `validateChangeable`
- [ ] [formElement.ts:92](src/formElement.ts#L92). `w-readonly` "use [disabled] instead" => `[readonly]`
- [ ] [formElement.ts:207](src/formElement.ts#L207). `$tryConnect` "apply initModel": only registers control (initModel applied in baseControl.ts:581)
- [ ] [formElement.ts:154-157](src/formElement.ts#L154-L157). `<button type="submit">Submit</submit>`; self-closing `<wup-text ... />`
- [ ] [formElement.ts:172-182](src/formElement.ts#L172-L182). React example: `<button>` inside unclosed `<wup-text ref=...`
- [ ] [formElement.ts:300](src/formElement.ts#L300), [:317](src/formElement.ts#L317). `{@link BaseControl.prototype...}` => `WUPBaseControl` (not imported)
- [ ] [formElement.ts:44](src/formElement.ts#L44), [dropdownElement.ts:105](src/dropdownElement.ts#L105). `* * @tutorial` breaks tag
- [ ] [formElement.ts:63,67](src/formElement.ts#L63-L67). `@defaultValue false` twice; `@see{@link` without space
- [ ] [circleElement.ts:57-58](src/circleElement.ts#L57-L58). `width` default 10 => 14; "perecentage"
- [ ] [circleElement.ts:46](src/circleElement.ts#L46). `percentage` "100% is SUM or difference max-min for single item": always value/SUM; [:21](src/circleElement.ts#L21), [:72-77](src/circleElement.ts#L72-L77) `min/max` ignored for >1 items (:237-239)
- [ ] [circleElement.ts:493](src/circleElement.ts#L493). `gotRender` "Called on every changeEvent": once on init
- [ ] [circleElement.ts:84-85](src/circleElement.ts#L84-L85). `hoverOpenTimeout` "inherited from WUPPopupElement.$defaults": one-time copy at load (:184)
- [ ] [circleElement.ts:94](src/circleElement.ts#L94). JSXProps omit `w-hoverOpenTimeout/w-hoverCloseTimeout` though they're observed & parsed
- [ ] [circleElement.ts:32-37](src/circleElement.ts#L32-L37). Tooltip example misses `}`; [:30](src/circleElement.ts#L30) trailing `_`
- [ ] [popupElement.types.ts:93](src/popup/popupElement.types.ts#L93), [dropdownElement.ts:38](src/dropdownElement.ts#L38). `minHeightByTarget` "100% of targetWidth" => target height
- [ ] [popupElement.ts:226,241](src/popup/popupElement.ts#L226). `$attach`: "detach() not required if target removed" (see code bug above)
- [ ] [popupElement.types.ts:153](src/popup/popupElement.types.ts#L153). `AttachOptions` "`target` & `openCase` are defined by the hook itself" (copy from `TooltipOptions`)
- [ ] [popupElement.types.ts:141-142](src/popup/popupElement.types.ts#L141-L142), [popupElement.ts:104](src/popup/popupElement.ts#L104). Popup never sets attr `hide` (uses `[show]`); stale attr type & tutorial
- [ ] [popupElement.ts:102](src/popup/popupElement.ts#L102). "because $options.target cleared": never cleared
- [ ] [popupElement.ts:239](src/popup/popupElement.ts#L239). `openCase.always` doesn't exist
- [ ] [popupElement.ts:350](src/popup/popupElement.ts#L350). `init()` "called after gotReady() and $open()": called from `gotReady` & `gotChanges`
- [ ] [popupElement.ts:388](src/popup/popupElement.ts#L388). `defineTarget` "@returns Element | Error": throws
- [ ] [popupElement.ts:90](src/popup/popupElement.ts#L90). Stray `'` after `$attach(...)`
- [ ] [popupElement.ts:236](src/popup/popupElement.ts#L236). `el.class` => `el.className`
- [ ] [popupElement.ts:106](src/popup/popupElement.ts#L106). "transfrom"
- [ ] [popupElement.types.ts:100](src/popup/popupElement.types.ts#L100). `{@link WUPPopupElement.$refArrow)` => `}`
- [ ] [popupElement.types.ts:137](src/popup/popupElement.types.ts#L137). "attr `target` has hire priority" => `w-target`, "higher"
- [ ] [popupElement.types.ts:65](src/popup/popupElement.types.ts#L65). "to to"
- [ ] [popupPlacements.ts:241](src/popup/popupPlacements.ts#L241). "bellow"
- [ ] [baseModal.ts:86](src/baseModal.ts#L86). `$isClosing` "Returns if element is opening"
- [ ] [modalElement.ts:23](src/modalElement.ts#L23). `ModalCloseCases.onSubmitEnd` uses `/*`
- [ ] [modalElement.ts:317](src/modalElement.ts#L317), [notifyElement.ts:224](src/notifyElement.ts#L224). `gotRender` "Called once on opening": called on every open
- [ ] [notifyElement.ts:121](src/notifyElement.ts#L121). "use as observable to unify parse logic" (see code bug above)
- [ ] [notifyElement.ts:74,87](src/notifyElement.ts#L74). JSX doc "Modal element" (copy-paste)
- [ ] [notifyElement.ts:184](src/notifyElement.ts#L184). "whethere"
- [ ] [dropdownElement.ts:125](src/dropdownElement.ts#L125). `$refTitle` "tied with $options.label": no such option
- [ ] [spinElement.ts:42-43](src/spinElement.ts#L42-L43). `<div id="me"></wup-spin>`; stray quote `<wup-spin "w-overflowTarget="#me">`
- [ ] [sortElement.ts:26](src/sortElement.ts#L26). `{@link WUPSelectManyControl}` not imported
- [ ] [baseElement.ts:151](src/baseElement.ts#L151). `observedOptions` "return undefined to observe all": code uses `null` (:154, :221); [:152](src/baseElement.ts#L152) stray backtick
- [ ] [baseElement.ts:578-580,585-587,615-617](src/baseElement.ts#L578-L617). `includes/includesTarget/itsMe` "false if position fixed/absolute": `Node.contains` ignores CSS
- [ ] [baseElement.ts:22](src/baseElement.ts#L22) "realted", [:98](src/baseElement.ts#L98) "inheritted"
- [ ] [formElement.ts:34](src/formElement.ts#L34). "that that"

## JSDoc. Helpers & objects

- [ ] [exportToExcel.ts:1809](src/helpers/files/exportToExcel.ts#L1809). `getCellValue` example `(h, v) => ({ type, value })`: real signature `(v) => IExcelCellValue` with field `stringVal`
- [ ] [exportToExcel.ts:47](src/helpers/files/exportToExcel.ts#L47). `verticalAlign` default "top": `$defaults.style` sets `"center"` (:1792); [:72](src/helpers/files/exportToExcel.ts#L72) header default misses `verticalAlign: "center"`, `isSorted: true`
- [ ] [csv.ts:65-66](src/helpers/files/csv.ts#L65-L66). `mapping` documented as optional with raw prop-name headers: it's required (`csvFromData(items)` throws) and headers go via `stringPrettify` (describes deferred mapping API)
- [ ] [observer.ts:352](src/helpers/observer.ts#L352). "events are fired after 1ms": `onPropChanged` is sync, only `onChanged` deferred (`setTimeout(0)`); example removes listeners immediately so `onChanged` never fires
- [ ] [observer.md:16-22](src/helpers/observer.md#L16-L22). Reassigning `obj.nestedObj = rawNestedObj` fires nothing (same proxy); "onChanged (single time)" never happens (listeners removed before timeout)
- [ ] [dateFromString.ts:17](src/helpers/dateFromString.ts#L17), [dateToString.ts:27](src/helpers/dateToString.ts#L27). Tip `'hh:mm, d/m/yyyy A'`: `m` is minutes => `d/M/yyyy`
- [ ] [dateFromString.ts:8](src/helpers/dateFromString.ts#L8). `"yyyy-MM-dd hh:mm:ss.fff aZ" => "2022-04-23 04:09:12 pm"` returns `null` (no `.fff` in value)
- [ ] [dateFromString.ts:13](src/helpers/dateFromString.ts#L13). `"MMM d/yyyy, hh:mm A" => "Apr 23, 04:09 PM"` returns `null` (needs `"Apr 23/2022, 04:09 PM"`)
- [ ] [dateFromString.ts:25-27](src/helpers/dateFromString.ts#L25-L27). `throwOutOfRange` default (see code bug above)
- [ ] [dateToString.ts:19,21](src/helpers/dateToString.ts#L19-L21). `"...ss.fff aZ"` outputs `"... 04:09:12.234 pm"`; `"...fff Z"` outputs trailing space
- [ ] [zip.ts:848-849](src/helpers/files/zip.ts#L848-L849). `mtime: 0` "to avoid revealing date" fails with "date not in range 1980-2099" (from fflate)
- [ ] [zip.ts:645](src/helpers/files/zip.ts#L645). `stop()` "callback will not be called": false when all entries deflated inline (no Worker / small files)
- [ ] [animateStack.ts:9](src/helpers/animateStack.ts#L9). "set attribute position=top/bottom/left/right" (copy from animateDropdown); direction comes from `isVertical`
- [ ] [animateDropdown.ts:6,12-14](src/helpers/animateDropdown.ts#L6-L14). "`Promise<isFinished>`": `ms = 0` resolves `false`, `ms` 1..9 resolves `true`
- [ ] [localeInfo.ts:239](src/objects/localeInfo.ts#L239). Doc `['Mon','Tue',...]`, default `["Mo","Tu",...]` until `refresh()`
- [ ] [localeInfo.ts:263](src/objects/localeInfo.ts#L263). "no way to define firstWeekDay" contradicts `firstWeekDay` doc (:66-69) & `refresh()` (`Intl.Locale.weekInfo`)
- [ ] [string.ts:38](src/helpers/string.ts#L38). kebab-case example works only with `handleKebabCase=true` (default `false` => `"Some-prop-value"`); param undocumented
- [ ] [objectToFormData.ts:11-12](src/helpers/objectToFormData.ts#L11-L12). `items[0]Id = "1"` matches no output (bracket => `items[0][Id]`); [:7](src/helpers/objectToFormData.ts#L7) missed closing backtick
- [ ] [nestedProperty.ts:41,75](src/helpers/nestedProperty.ts#L41). `@param object` => `obj`; [:5](src/helpers/nestedProperty.ts#L5) `parsePath` returns `[keys, isArray]`, example `nestedValues` vs path `nestedValue`; [:77](src/helpers/nestedProperty.ts#L77) "extrachecking"
- [ ] [styleHelpers.ts:26](src/helpers/styleHelpers.ts#L26). `el.style.transform('...')` => `el.style.transform = '...'`; [:89](src/helpers/styleHelpers.ts#L89) `parseMsTime` returns `200` not `'200'`
- [ ] [scrolled.ts:32,37](src/helpers/scrolled.ts#L32-L37). `before` & `after` have identical descriptions; [:14](src/helpers/scrolled.ts#L14) `@index` isn't a tag, `NextStateRender` unused, "page the will be added"
- [ ] [imageConvert.ts:46](src/helpers/files/imageConvert.ts#L46). "`0.92` (the browser default)" likely wrong for `webp` (Chrome ~0.8). Not verified in browser
- [ ] [findScrollParent.ts:12](src/helpers/findScrollParent.ts#L12). Unclosed code fence
- [ ] [onFocusGot.ts:4,7](src/helpers/onFocusGot.ts#L4-L7). "Depsite"; `OnFocusLostOptions` => `onFocusLostOptions`
- [ ] Typos: [animate.ts:10](src/helpers/animate.ts#L10) "archive" => "achieve", [onEvent.ts:3](src/helpers/onEvent.ts#L3) "removineListener", [observer.ts:58](src/helpers/observer.ts#L58) "obsserved", [observer.ts:72](src/helpers/observer.ts#L72) "Set,MapSet", [csv.ts:53](src/helpers/files/csv.ts#L53) & [exportToExcel.ts:167](src/helpers/files/exportToExcel.ts#L167) "extacted", [timeObject.ts:8](src/objects/timeObject.ts#L8) "Plane", [isOverlap.ts:1](src/helpers/isOverlap.ts#L1) "whether to elements" => "two"
