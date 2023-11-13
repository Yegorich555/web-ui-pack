/**
 * Run this script to update types.html.json. cmd>>>
 * node ./types.html.update.js
 * */

/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable global-require */
const fs = require("fs");
const htmlTypes = require("./types.html.json");
const htmlWsTypes = require("./types.html.webstorm.json");

try {
  const vscodeTags = htmlTypes.tags.sort((a, b) => a.name.localeCompare(b.name));
  vscodeTags.forEach((tag) => {
    console.warn(`Proccessed <${tag.name}>`);
    const exclude = new Set(["disabled", "readonly", "menu", "tooltip"]);
    tag.attributes.forEach((a) => {
      a.name = a.name.toLowerCase().trim();
      if (!exclude.has(a.name) && !a.name.startsWith("w-")) {
        a.name = `w-${a.name}`;
      }
      a.description = a.description.trim();
      console.warn(`   [${a.name}]`);
    });
  });
  fs.writeFileSync("./types.html.json", JSON.stringify(htmlTypes, null, "\t"));

  // update WebStorm: https://plugins.jetbrains.com/docs/intellij/websymbols-web-types.html#including-web-types
  htmlWsTypes.version = require("./package.json").version;
  const arrRead = htmlWsTypes.contributions.html.elements;
  let arrWrite = arrRead;
  arrWrite = [];
  vscodeTags.forEach((tag) => {
    console.warn(`Proccessed <${tag.name}>`);
    const htmlDescr = {
      name: tag.name,
      description: tag.description,
    };
    const urlDoc = tag.references?.length && tag.references[0].url;
    if (urlDoc) {
      htmlDescr["doc-url"] = urlDoc;
    }
    htmlDescr.attributes = tag.attributes.map((a) => {
      const wsAttr = {
        name: a.name,
        description: a.description,
      };
      if (a.values?.length) {
        wsAttr.value = { kind: "plain", type: a.values.map((av) => `'${av.name}'`).join(" | ") };
      }
      // NiceToHave: add css-vars here
      return wsAttr;
    });

    arrWrite.push(htmlDescr);
  });
  htmlWsTypes.contributions.html.elements = arrWrite;
  fs.writeFileSync("./types.html.webstorm.json", JSON.stringify(htmlWsTypes, null, "\t"));
} catch (err) {
  console.error(err);
}

// watchfix: VSCode built-in support: https://github.com/WICG/webcomponents/issues/776
// watchfix: VSCode css support: https://github.com/microsoft/vscode-custom-data/issues/82

// NiceToHave add types.css.json: prop [wupdark] + css-variables: but it's not supported now
// https://github.com/microsoft/vscode-extension-samples/blob/main/custom-data-sample/css.css-data.json
// https://github.com/microsoft/vscode-css-languageservice/blob/main/docs/customData.md
