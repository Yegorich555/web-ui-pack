# TextRich todo

End-user review (2026-10-20): Chrome 154 vs Google Docs, Notion, Slack, GitHub, CKEditor 5, TipTap, Quill

## Bugs

7. [textRich.ts:1045](src/controls/textRich/textRich.ts#L1045). Toolbar click (Bold) while editor isn't focused, then typing: text is inserted at the start of editor as a new line (`<b>Q</b><div>abc</div>`). Expected: caret at the last position or at the end
8. Paste of list from MS Word (`mso-list`): items become paragraphs with literal `·` bullet

## Editing behavior

9. Backspace at the start of list item merges it into the previous line (bullet disappears with text joined); at the start of the 1st line (list, heading, quote) it does nothing, so format can be removed via toolbar only. Expected (Docs, Notion, Quill, CKEditor, TipTap): 1st Backspace turns block into paragraph, 2nd one merges lines
10. Enter on empty quote line doesn't leave quote: every quote line is a separate `<blockquote>` and Enter adds one more. Expected: Enter on empty line goes out of quote
11. Enter in code block only adds lines: it can be left via ArrowRight at the end of the last block only. Expected (TipTap, Notion): 2 Enters on empty lines at the end or ArrowDown at the last line goes out
12. Markdown shortcuts: only `1. ` & `- `. Expected (Notion, Slack, GitHub, CKEditor, TipTap): `# `…`### `, `> `, ```` ``` ````, `**bold**`, `_italic_`, `` `code` ``, `~~strike~~` (line ones via `ToolValue.recognize`)
13. Paste of url over selected text replaces text. Expected (Notion, Slack, GitHub, CKEditor): selected text becomes link
14. Pasted urls & emails aren't recognized (typed ones are)
15. No inline code tool (Slack, Notion, GitHub, Teams): pasted `<code>` is lost

## UI

16. Hover popup of link is text field over toolbar: opening link is Ctrl+Click only (no hint, impossible on touch), removing - clearing field. Expected (Google Docs): small chip `example.com ↗ · Copy · Edit · Unlink`; it opens when caret enters link too (keyboard users)
17. [textRich.scss:111](src/controls/textRich/textRich.scss#L111). Toolbar is aligned right (`justify-content: flex-end`) & groups have no separators; at 340px width it takes 3 rows with clear button alone in the last one. Expected: aligned left, thin separators, overflow menu `⋯` on narrow width (CKEditor 5)
18. Clear content `✕` is next to Clear formatting `Tx`: misclick risk (Restore helps). Move it away or exclude from default toolbar
19. Dropdowns `Normal` (heading) & `Default` (size) look the same: use icon `Aa` or label `Size` for size
20. [textRich.ts:1205](src/controls/textRich/textRich.ts#L1205). Slash menu: no icons & groups, Heading 1-6 + `Heading: Normal` take the first 7 items. Expected: icons of toolbar, common items first (text, H1-H3, lists, quote, code, link), H4-H6 shown on filtering only
21. Empty editor has no placeholder: `/` & markdown shortcuts aren't discoverable. Expected (Notion): `Type / for commands`
22. [textRich.scss:292](src/controls/textRich/textRich.scss#L292). Height is fixed between 8em & 16em: no auto-grow & no resize handle, long text is cramped
23. [textRich.scss:236](src/controls/textRich/textRich.scss#L236). Readonly shows toolbar with 50% opacity: hide it as in other editors
24. Consecutive quote lines are rendered as separate bars with gaps (`margin: 5px 0` per `<blockquote>`)
