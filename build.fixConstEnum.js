/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");

// todo watchfix: https://github.com/microsoft/TypeScript/issues/35701 and remove after ts got fixed
function fixReExportConstEnum(from, str) {
  const txt = fs
    .readFileSync(from, { encoding: "utf8" }) //
    .replace("import", `${str}\nimport`);

  fs.writeFileSync(from, txt, { encoding: "utf8" });
}

fixReExportConstEnum("./dist/popup/popupElement.js", 'import { WUPPopup } from "./popupElement.types";');
