# CheckTree: browser performance review

Hover, focus and ArrowDown in a big CheckTree are now cheap. In an 11,110-row tree (10×10×10×10, all expanded) they took 150–370 ms each and now take about 1–9 ms. First render went from about 450 ms to about 100 ms.

## What was slow

The hover/focus rules `checkTree.scss` inherits from Check (`@include wup-iconHover("[icon]")` at the `:host` level) matched every icon in the tree. So when the pointer or focus entered or left the control, the browser restyled all rows and re-laid out every icon (`position: relative` was toggled on all of them). The old `content: none` rules hid the effect but not the work.

A JS bug also made every ArrowDown pay that cost twice: `setActive` removed `tabindex` from the focused row before focusing the next one, so focus fell to `<body>` and `:focus-within` of the whole control was toggled twice.

## What changed

1. **`check.scss`:** the hover/focus rule and the checked-icon rule now apply only to the main label's icon (`> label > [icon]`), not to every `[icon]` in the control.
2. **`checkTree.scss`:**
   - Hover/focus is added per row only (`[item]:not([disabled])` for hover, `[role="treeitem"]:focus > [item]` for focus). The rules that cancelled and restored the inherited effect are gone, along with the `> label > strong { pointer-events: auto }` workaround and all three `no-descending-specificity` disables.
   - `content-visibility: auto` on `[role="group"]` makes the browser skip style, layout and paint for off-screen rows. This one rule gives most of the speed-up.
   - `overflow-clip-margin` stops the first row's hover circle from being clipped by the paint containment that `content-visibility` brings.
   - `> label:has(> [expand]:hover) > [icon]:before { content: none }` keeps the arrow's hover from lighting the main checkbox (`[expand]` is placed inside the label).
   - Smaller cleanups: the clickable-row condition uses row attributes (`[aria-checked]`, `[aria-expanded]`) instead of host ones, `[aria-disabled]` matches by presence, and the mixed-state dash is centred with `display: grid; place-items: center`.
3. **`checkTree.ts` `setActive`:** the old row's `tabindex` is removed after focusing the new row.
4. The stored CSS snapshots for Check and CheckTree were updated.

Hover and focus were checked with screenshots in normal and collapsible modes: they look the same as before, with no clipping.

| Event (11,110 rows)  | Before    | After    |
| -------------------- | --------- | -------- |
| Host hover enter     | ~260 ms   | ~1 ms    |
| Host hover leave     | ~220 ms   | ~1 ms    |
| Focus                | ~270 ms   | ~9 ms    |
| ArrowDown            | ~370 ms   | ~4–9 ms  |
| Initial render       | ~450 ms   | ~100 ms  |

## Behaviour changes

- In `wup-check`, the icon now lights only when the label is hovered. Hovering elsewhere in the control, such as the error message, no longer lights it.
- `contain-intrinsic-size: auto 300px` is a guessed height for groups not yet scrolled into view. The scrollbar may shift a little the first time a far-away group comes into view.
- Not checked in Safari, which may not support `overflow-clip-margin`. If it doesn't, the top of the first nested row's hover circle may be cut off by about 0.4em there.

## Open issues (skipped)

- **Dropping the `[role=…]` qualifiers in favour of plain `ul`/`li`:** no speed gain, and it would also match lists inside custom item HTML.
- **A `[focused]` attribute instead of `:focus`:** focusing a parent row still restyles its nested rows. `content-visibility` now limits this to the rows on screen.
- **Per-icon `transform-style: preserve-3d` and per-row transitions:** each icon gets its own paint layer, and "check all" starts a transition per row. Both are now limited to the rows on screen.
- **Moving `[expand]` out of the main label:** a bigger change to the markup and layout. The `:has()` rule covers it for now.
- **Switch's `label`/`strong` rules** also apply to labels inside custom item HTML; they could be scoped to `> label`.
- **A shared disabled-look mixin** (`opacity: 0.6; cursor: not-allowed; user-select: none` is copied from `baseControl.scss`) and **inlining `--ctrl-checktree-mixed`**, which only aliases `--ctrl-check-on`.
- **`display: grid` per row** in collapsible mode: not measured.

## How to measure

Puppeteer against the demo dev server (`http://localhost:8015/control/checkTree`), timing with CDP `Performance.getMetrics` (`RecalcStyleDuration`, `LayoutDuration`, `TaskDuration`). In headless Chrome, `(hover: hover) and (pointer: fine)` is false by default, so enable it before taking hover screenshots:

```js
await cdp.send("Emulation.setEmulatedMedia", {
  features: [
    { name: "hover", value: "hover" },
    { name: "pointer", value: "fine" },
  ],
});
```
