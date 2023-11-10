/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */
const fs = require("fs");
const htmlTypes = require("./types.html.json");

try {
  const tags = htmlTypes.tags.sort((a, b) => a.name.localeCompare(b.name));
  tags.forEach((tag) => {
    console.warn(`Proccessed <${tag.name}>`);
    const exclude = new Set(["disabled", "readonly"]);
    tag.attributes.forEach((a) => {
      a.name = a.name.toLowerCase();
      if (!exclude.has(a.name) && !a.name.startsWith("w-")) {
        a.name = `w-${a.name}`;
      }
      console.warn(`   [${a.name}]`);
    });
  });
  fs.writeFileSync("./types.html.json", JSON.stringify(htmlTypes, null, "\t"));
} catch (err) {
  console.error(err);
}

/** Run this script to update types.html.json. cmd> node ./types.html.update.js */

// NiceToHave add types.css.json: prop [wupdark] + css-variables: but it's not supported now
// https://github.com/microsoft/vscode-extension-samples/blob/main/custom-data-sample/css.css-data.json
// https://github.com/microsoft/vscode-css-languageservice/blob/main/docs/customData.md
