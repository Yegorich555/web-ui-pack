1. Tool.dropdown - remove option, if Tool.values is array - then show in dropdown, otherwise it's single button
   Also simplify WUP.TextRich.Tool via reducing options. For example create and ask could be merged into create. So if create returns promise - then it's ask inside etc. Suggest other possible ways

2. Tool.icon
   Instead of it there will be 2 options:
   Tool.className - applied class on related toolbarButton/dropdown
   Tool.classNameTag - applied class on related appended tag, - suggest better naming
