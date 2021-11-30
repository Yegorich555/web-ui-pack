/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const path = require("path");

[
  "./package.json", //
  "./package-lock.json",
  "./.npmignore",
  "./README.md",
  "./LICENSE.md",
].forEach((f) => {
  fs.copyFileSync(f, path.resolve("./dist", f));
});
