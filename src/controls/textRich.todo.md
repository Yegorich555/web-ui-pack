1. improve handling clean formatted content

    ```
    <div>Text with <b>bold</b>,</div>
    ```

    clean formatting of selected block

    actual:

    ```
    <div>
    "Text with "
    "bold"
    ", "
    </div>
    ```

    expected: ```<div>Text with bold</div>```
    add browser test for this (if possible otherwise use jest test)

    we must join text nodes - does it make sense, any benefits here ?

2. change behavior on selection like it works in VSCode, WebStorm etc.

    select text and type "
    actual: text is cleared and " is typed
    expected: selected text wrapped into brackets "{selected text here}"

    note: same behavior for other similar chars etc.
    add browser test for this (if possible otherwise use jest test)

3. Preferred Object instead of new Map<string, any> where it's possible, with object init is faster and TS handles this better

4. ToolValues: rename 'code-block' into 'code', 'clean-format' into 'clean', 'clear' into 'btnClear'

5. Tool.dropdown - remove option, if Tool.values is array - then show in dropdown, otherwise it's single button
   Also simplify WUP.TextRich.Tool via reducing options. For example create and ask could be merged into create. So if create returns promise - then it's ask inside etc. Suggest other possible ways
