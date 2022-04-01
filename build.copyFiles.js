/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const path = require("path");

const out = "./dist/";

fs.rmdirSync(out, {
  recursive: true,
});
fs.mkdirSync(out);

[
  "./package.json", //
  // "./package-lock.json",
  "./.npmignore",
  "./README.md",
  "./LICENSE.md",
].forEach((f) => {
  fs.copyFileSync(f, path.resolve(out, f));
});
