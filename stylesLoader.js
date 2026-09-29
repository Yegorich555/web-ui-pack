/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("fs");
const path = require("path");
const sass = require("sass");
const postcss = require("postcss");
const { plugins } = require("./postcss.config");

/** `node ./stylesLoader.js --compress`: injected css is minified; otherwise it's formatted as in scss (webpack loader as well) */
const compressStyles = process.argv.includes("--compress");

// For development styles are defined in `{fileName}.scss`; the built result gets them compiled inside `{fileName}.ts`:
// `static get $styleRoot()` returns rules defined in `:root {...}`, `static get $style()` returns other rules
// string `"@wup-include someMixin"` in `{fileName}.ts` is replaced with css compiled from mixin defined in `{fileName}.scss`

/** Matches strings `"@wup-include someMixin"` in the code */
const includeRegex = /(["'`])@wup-include\s+([\w-]+);?\1/g;
/** Separates css of each `@include` in the single compilation */
const includeSplitter = "/*! wup-include */";

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

/** Processes css compiled by sass in the same way as webpack does it via postcss-loader & removes comments */
async function processCss(css, from) {
  const result = await postcss(plugins).process(css, { from });
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
  return root;
}

const toCss = (container) => container.nodes.join(compressStyles ? "" : "\n"); // raws.before of moved nodes isn't reliable

/** Compiles scss into css in the same way as webpack does it via sass-loader + postcss-loader
 * @param includes mixin names to compile separately: `@include someMixin`
 * @returns styles per getter, css per mixin & files included into compilation */
async function compileStyles(scssPath, includes) {
  const outputStyle = compressStyles ? "compressed" : "expanded";
  const { css, stats } = sass.renderSync({ file: scssPath, outputStyle });
  const root = await processCss(css.toString(), scssPath);
  const rootRules = postcss.root();
  extractRootRules(root, rootRules);

  const mixins = {};
  if (includes.length) {
    // single compilation for all mixins: `@import "file"; /*! splitter */ @include a; /*! splitter */ @include b;`
    const data = [`@import "${path.basename(scssPath)}";`, ...includes.map((name) => `@include ${name};`)];
    const parts = sass
      .renderSync({ data: data.join(`\n${includeSplitter}\n`), includePaths: [path.dirname(scssPath)], outputStyle })
      .css.toString()
      .split(includeSplitter);
    await Promise.all(
      includes.map(async (name, i) => {
        mixins[name] = toCss(await processCss(parts[i + 1], scssPath)); // WARN: `:root {...}` isn't extracted here
      })
    );
  }

  return {
    styles: { $styleRoot: toCss(rootRules), $style: toCss(root) },
    mixins,
    files: stats.includedFiles,
  };
}

/** Returns unique mixin names pointed in the code via strings `"@wup-include someMixin"` */
function findIncludes(code) {
  return [...new Set(Array.from(code.matchAll(includeRegex), (m) => m[2]))];
}

/** Returns code where strings `"@wup-include someMixin"` are replaced with compiled css */
function injectIncludes(code, mixins) {
  return code.replace(includeRegex, (_, _q, name) => JSON.stringify(mixins[name]));
}

/** Returns code where `static get $style() { return ""; }` & `static get $styleRoot() { return ""; }` return pointed styles;
 * `return super.$style;` gets pointed styles appended: `return super.$style + "\n...";`
 * `` return `${super.$style}...`; `` gets pointed styles inserted after super: `` return `${super.$style}${"\n..."}...`; `` */
function injectStyles(code, styles, filePath) {
  const injected = new Set();
  const result = code.replace(
    /(static\s+get\s+(\$style(?:Root)?)\s*\(\)[^{;]*\{(?:\s|\/\/.*|\/\*[\s\S]*?\*\/)*return\s*)(?:""|''|``|(super\.\2(?![\w$]))|(`\$\{\s*super\.\2\s*\}))/g,
    (_, head, name, superCall, superTemplate) => {
      if (injected.has(name)) {
        throw new Error(`${filePath}: getter ${name} is defined several times`);
      }
      injected.add(name);
      const css = styles[name] && JSON.stringify(`\n${styles[name]}`);
      if (superCall) {
        return head + (css ? `${superCall} + ${css}` : superCall);
      }
      if (superTemplate) {
        return head + superTemplate + (css ? `\${${css}}` : "");
      }
      return head + JSON.stringify(styles[name]);
    }
  );
  Object.keys(styles).forEach((name) => {
    if (styles[name] && !injected.has(name)) {
      throw new Error(
        `${filePath}: getter 'static get ${name}() { return ""; }', 'return super.${name};' or 'return \`\${super.${name}}...\`;' is required to inject styles`
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
      const code = fs.readFileSync(jsPath, "utf8");
      const { styles, mixins } = await compileStyles(scssPath, findIncludes(code));
      fs.writeFileSync(jsPath, injectIncludes(injectStyles(code, styles, jsPath), mixins));
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
  compileStyles(scssPath, findIncludes(code))
    .then(({ styles, mixins, files }) => {
      files.forEach((f) => this.addDependency(f));
      return injectIncludes(injectStyles(code, styles, this.resourcePath), mixins);
    })
    .then((result) => done(null, result), done);
};

if (require.main === module) {
  injectIntoDist().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
