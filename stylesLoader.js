/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const path = require("path");
const sass = require("sass");
const postcss = require("postcss");
const { plugins } = require("./postcss.config");

/** Switch it manually: `true` - injected css is minified, `false` - formatted as in scss */
const compressStyles = false;

// For development styles are defined in `{fileName}.scss`; the built result gets them compiled inside `{fileName}.ts`:
// `static get $styleRoot()` returns rules defined in `:root {...}`, `static get $style()` returns other rules

/** Moves rules defined in `:root {...}` from `from` into `to`; at-rules (`@media` etc.) are split between both */
function extractRootRules(from, to) {
  from.each((node) => {
    if (node.type === "rule") {
      if (node.selectors.every((s) => /^:root(?![\w-])/.test(s))) {
        // nested rules are global as before: `:root { [wupdark] {...} }` => `[wupdark] {...}` instead of `:root [wupdark] {...}`
        node.selectors = node.selectors.map((s) => s.replace(/^:root\s+(?![>+~])/, ""));
        to.append(node);
      }
    } else if (node.nodes) {
      const at = node.clone({ nodes: [] });
      extractRootRules(node, at);
      at.nodes.length && to.append(at);
      !node.nodes.length && node.remove();
    }
  });
}

/** Compiles scss into css in the same way as webpack does it via sass-loader + postcss-loader
 * @returns styles per getter & files included into compilation */
async function compileStyles(scssPath) {
  const { css, stats } = sass.renderSync({ file: scssPath, outputStyle: compressStyles ? "compressed" : "expanded" });
  const result = await postcss(plugins).process(css.toString(), { from: scssPath });
  result.warnings().forEach((w) => console.warn(w.toString()));
  const { root } = result;
  root.walkAtRules("charset", (n) => n.remove()); // sass adds it for non-ASCII chars but it's useless inside <style>
  // remove comments & rules that contain only comments: `:host { /* nothing here right now */ }`
  root.walkComments((n) => {
    let { parent } = n;
    n.remove();
    while (parent !== root && !parent.nodes.length) {
      const next = parent.parent;
      parent.remove();
      parent = next;
    }
  });
  if (compressStyles) {
    root.walkDecls((n) => {
      n.raws.between = ":"; // sass doesn't compress custom properties: `--a: 1 ` => `--a:1`
      n.value = n.value.trim();
    });
    root.walk((n) => {
      n.nodes && (n.raws.semicolon = true); // keep the last `;` in blocks since demo/src/helpers/parseCssVars.ts expects it
    });
  }

  const rootRules = postcss.root();
  extractRootRules(root, rootRules);
  const toCss = (container) => container.nodes.join(compressStyles ? "" : "\n"); // raws.before of moved nodes isn't reliable
  return {
    styles: { $styleRoot: toCss(rootRules), $style: toCss(root) },
    files: stats.includedFiles,
  };
}

/** Returns code where `static get $style() { return ""; }` & `static get $styleRoot() { return ""; }` return pointed styles;
 * `return super.$style;` gets pointed styles appended: `return super.$style + "\n...";` */
function injectStyles(code, styles, filePath) {
  const injected = new Set();
  const result = code.replace(
    /(static\s+get\s+(\$style(?:Root)?)\s*\(\)[^{;]*\{(?:\s|\/\/.*|\/\*[\s\S]*?\*\/)*return\s*)(?:""|''|``|(super\.\2(?![\w$])))/g,
    (_, head, name, superCall) => {
      if (injected.has(name)) {
        throw new Error(`${filePath}: getter ${name} is defined several times`);
      }
      injected.add(name);
      if (superCall) {
        return head + (styles[name] ? `${superCall} + ${JSON.stringify(`\n${styles[name]}`)}` : superCall);
      }
      return head + JSON.stringify(styles[name]);
    }
  );
  Object.keys(styles).forEach((name) => {
    if (styles[name] && !injected.has(name)) {
      throw new Error(
        `${filePath}: getter 'static get ${name}() { return ""; }' or 'return super.${name};' is required to inject styles`
      );
    }
  });
  return result;
}

/** Injects styles into the built result: for each `dist/{fileName}.js` compiles `src/{fileName}.scss` if it exists */
async function injectIntoDist() {
  const srcDir = path.resolve(__dirname, "src");
  const distDir = path.resolve(__dirname, "dist");
  const files = fs.readdirSync(distDir, { recursive: true }).filter((f) => f.endsWith(".js"));
  await Promise.all(
    files.map(async (f) => {
      const scssPath = path.join(srcDir, f.replace(/\.js$/, ".scss"));
      if (!fs.existsSync(scssPath)) {
        return;
      }
      const jsPath = path.join(distDir, f);
      const { styles } = await compileStyles(scssPath);
      fs.writeFileSync(jsPath, injectStyles(fs.readFileSync(jsPath, "utf8"), styles, jsPath));
      console.log(`Styles injected: ${path.relative(__dirname, scssPath)} => ${path.relative(__dirname, jsPath)}`);
    })
  );
}

/** Webpack loader: injects styles from `{fileName}.scss` into `{fileName}.ts` if scss-file exists */
module.exports = function stylesLoader(code) {
  const done = this.async();
  const scssPath = this.resourcePath.replace(/\.ts$/, ".scss");
  if (!fs.existsSync(scssPath)) {
    done(null, code);
    return;
  }
  this.addDependency(scssPath); // before compiling to re-compile after fixing scss-errors
  compileStyles(scssPath)
    .then(({ styles, files }) => {
      files.forEach((f) => this.addDependency(f));
      return injectStyles(code, styles, this.resourcePath);
    })
    .then((result) => done(null, result), done);
};

if (require.main === module) {
  injectIntoDist().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
