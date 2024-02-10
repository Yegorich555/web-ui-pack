/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const path = require("path");
const { cwd } = require("process");
const ts = require("typescript");

const out = "./dist/";
/** @type string[] */
const allFiles = fs.readdirSync(out, { recursive: true });

// remove any comments in js via ts-compiler
function removeComments() {
  // https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
  console.log("Removing comments...");
  const fileNames = [allFiles.filter((f) => f.endsWith(".js"))[0]].map((f) => path.join(out, f));
  const { config } = ts.readConfigFile("./tsconfig.json", (p) => fs.readFileSync(p, { encoding: "utf-8" }));
  const program = ts.createProgram(fileNames, {
    ...config.compilerOptions,
    allowJs: true,
    removeComments: true,
    outDir: "./distTest/",
    strict: false,
    allowUnusedLabels: true,
    allowUnreachableCode: true,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  });
  const emitResult = program.emit();

  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start);
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    }
  });

  console.log(`Removing comments. Done`);
  // const exitCode = emitResult.emitSkipped ? 1 : 0;
  // process.exit(exitCode);
}
removeComments();
