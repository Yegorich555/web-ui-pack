# Issues

- [popupElement.ts:15](src/popup/popupElement.ts#L15). `attachLst` is strong `Map` cleared only by `detach()` => leaks if target removed without `detach()` (JSDoc of `$attach` claims it's not required). Consider `WeakMap` as in sortElement.ts:19
- [popupElement.ts:288](src/popup/popupElement.ts#L288). `if (!popup.goOpen.call(popup, v, e))`: `goOpen` returns `Promise<boolean>` (always truthy) => the branch that removes a just-created popup when opening is rejected never runs
