/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const terser = require("terser");

const code = fs.readFileSync(require.resolve("./code.js"), "utf8");
const result = terser.minify(code, {
  toplevel: true,
  output: { beautify: true },
  mangle: false
});

if (result.code && result.code.includes("deadCode")) {
  console.error("deadCode is not excluded");
} else {
  console.warn(result);
}
