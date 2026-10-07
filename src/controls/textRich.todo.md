1. change behavior on selection like it works in VSCode, WebStorm etc.

    select text and type "
    actual: text is cleared and " is typed
    expected: selected text wrapped into brackets "{selected text here}"

    note: same behavior for other similar chars etc.
    add browser test for this (if possible otherwise use jest test)

2. Tool.dropdown - remove option, if Tool.values is array - then show in dropdown, otherwise it's single button
   Also simplify WUP.TextRich.Tool via reducing options. For example create and ask could be merged into create. So if create returns promise - then it's ask inside etc. Suggest other possible ways
