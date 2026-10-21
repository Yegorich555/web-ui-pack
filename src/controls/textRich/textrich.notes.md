# TextRich todo

End-user review (2026-10-20): Chrome 154 vs Google Docs, Notion, Slack, GitHub, CKEditor 5, TipTap, Quill

## UI

 2. [textRich.scss:292](src/controls/textRich/textRich.scss#L292). Height is fixed between 8em & 16em: no auto-grow & no resize handle, long text is cramped - probably it's wrong since we have $options.autoHeight

## NiceToHave

Won't be fixed: copy-paste from other editors isn't supported

1. Paste from Google Docs: everything becomes bold & headings/lists are flattened into one line with `<br>`. Docs wraps content into `<b style="font-weight:normal" id="docs-internal-guid-…">`; its bold/italic/underline are `<span style="font-weight:700 | font-style:italic | text-decoration:underline">` and they're ignored
2. Paste of list from MS Word (`mso-list`): items become paragraphs with literal `·` bullet (marker `<span style="mso-list:Ignore">`); real list type is defined in `<style>` (`@list l0:level1`) only
