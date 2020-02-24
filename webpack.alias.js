/* eslint-disable @typescript-eslint/no-var-requires */
const path = require("path");

const srcPath = path.resolve(__dirname, "./src/");

// MUST HAVE: sync aliases in .vscode/settings.json, tsconfig.json

module.exports = {
  "@": srcPath, // alias is '@/[name]' for js
  "web-ui-pack": path.resolve(__dirname, "lib/index")
};
