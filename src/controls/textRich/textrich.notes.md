# TextRich todo

End-user review (2026-10-20): Chrome 154 vs Google Docs, Notion, Slack, GitHub, CKEditor 5, TipTap, Quill

## copyPasteFormatted

Re-check (2026-10-23, Chrome 155; Firefox & Safari aren't checked). Expected behavior vs current:

| Source => wup-textrich                 | Ctrl+V: expected / current         | Ctrl+Shift+V: expected / current |
| -------------------------------------- | ---------------------------------- | -------------------------------- |
| `false`: other content                 | plain / plain ✅                   | formatted / plain ❌             |
| `true`: other content                  | formatted / formatted ✅           | plain / plain ✅                 |
| another wup-textrich (or the same one) | formatted (any option) / option ❌ | plain / plain ✅                 |

1. Ctrl+Shift+V gives plain text already: Chrome fires `paste` & `beforeinput` with the same `insertFromPaste` but `dataTransfer` has `text/plain` only (custom types set on copy are dropped too), so `replaceInput` falls back to plain lines
2. Copy-paste between wup-textrich isn't supported: there is no `copy`/`cut`/`dragstart` handler, browser copies html with page styles (`<span style="color: rgb(…); font-family: Arial; font-size: 14px; …">` around every text) and without a mark of the source. With `false` (default) bold word copied & pasted in the same editor becomes plain; formatted text moved via drag & drop inside the editor loses formats (test `paste` asserts it for drop)
3. `false` + Ctrl+Shift+V => formatted isn't possible via events: Ctrl+Shift+V & copy from Notepad give the same event (`text/plain` only). The only way: keydown Ctrl/Cmd+Shift+V => preventDefault => `navigator.clipboard.read()`: Chrome asks permission, Firefox & Safari show native `Paste` button on every paste, secure context only; context menu `Paste as plain text` stays plain anyway. Suggestion: drop it, Ctrl+Shift+V is plain text always (browsers, Docs, Slack, Notion)

Suggested logic:

- mark of wup content inside `text/html`: `<div data-wup-textrich>…</div>`. Checked: it's kept on copy event (`setData`) & on `navigator.clipboard.write` (copy button) => Ctrl+V. Custom type `application/x-wup-textrich` works for copy event only: `web application/x-…` written by `navigator.clipboard.write` isn't visible for paste events
- `copy`/`cut`/`dragstart` of editor: `text/html` = marked `Html.fromEditor` of selected content, `text/plain` = `sel.toString()`, preventDefault (copy, cut). WARN: `range.cloneContents()` inside `<b>` gives text only: wrap it by inline parents (`Formats.parents`) like Chrome does. Prevented cut doesn't delete: `changeContent(() => deleteSelection())` if editable (readonly: copy only)
- `replaceInput`: `((isOwn || this._isFormatted?.()) && rich) || <plain lines> || rich` where `isOwn = rich?.includes("data-wup-textrich")`; Ctrl+Shift+V gives `text/plain` only, so it stays plain
- copy button (`copyValue`): add the same mark
- update docs of option (textRich.ts, types.html.json) & test `paste` (drop)
- side effect: other apps (Word, Gmail) get clean html of value instead of html with page styles

Open: should other apps get plain text only with `false`? Then mark must be a custom type of copy event instead of `text/html` (copy button can't keep formats between wup-textrich)

## NiceToHave

Won't be fixed: copy-paste from other editors isn't supported

1. Paste from Google Docs: everything becomes bold & headings/lists are flattened into one line with `<br>`. Docs wraps content into `<b style="font-weight:normal" id="docs-internal-guid-…">`; its bold/italic/underline are `<span style="font-weight:700 | font-style:italic | text-decoration:underline">` and they're ignored
2. Paste of list from MS Word (`mso-list`): items become paragraphs with literal `·` bullet (marker `<span style="mso-list:Ignore">`); real list type is defined in `<style>` (`@list l0:level1`) only

## API review (2026-10-28)

Developer (package consumer) side: statics, options, `$format`/`$ask`, types `Tool`/`FormatContext`, editor via `ctx.editor`/`$refInput`.
✔ - reproduced in installed Chrome (puppeteer over `test/browser/srv/bundle.js`) or via `tsc` on a scratch file.
TextRich isn't released yet (npm latest 1.2.9 is from 2026-10-02): renames & signature changes are free now

### API: hard use cases

1. **Values loaded at runtime or different per control ✔**. `values` is taken on toolbar render: replaced `$tools.mention.values` isn't used (menu shows old items), mutated array is. 2 editors with different users need subclass & new tag
   - `values` like `items` of SelectControl: `ToolValue[] | ((control) => ToolValue[] | Promise<…>)` resolved on menu opening; for menus only (hotkeys & `recognize` of values need static array)
   - minimal: docs "mutate array, don't replace it"

### API: naming & docs

1. `Tool.placeholder` (text inserted via `/` command) clashes with demo tool `placeholder` (`$tools.placeholder.placeholder` is valid) & with html `placeholder` (hint): rename to `example`
2. `Tool.label` is tool name by default (`codeInline` in aria-label), `ToolValue.label` is prettified value: prettify both
3. `ask(target, control, current)` is positional, `format(ctx)` gets object (open since 2026-10-07)
4. Class JSDoc: most of `Rules` are end-user keyboard details & they hide API rules in IDE hint => move them to demo features list
5. `$format`: positional boolean is unreadable (`$format("list", "ordered", false)`) => `{ toggle: true }`; returns `void`: with `Promise<boolean>` caller can wait for asked value (link url, image picker)
