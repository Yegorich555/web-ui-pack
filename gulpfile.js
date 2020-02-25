/* eslint-disable global-require */
/* eslint-disable import/no-dynamic-require */
/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-var-requires */
const gulp = require("gulp");
const stream = require("stream");
const fs = require("fs");
const sass = require("node-sass");
const postcss = require("postcss");
const postcssConfig = require("./postcss.config");

const transformSCSS = new stream.Transform({
  objectMode: true,
  transform: function transformer(file, encoding, cb) {
    if (file.isNull()) {
      // return empty file
      cb(null, file);
    }
    if (file.isBuffer()) {
      const scss = file.contents.toString(encoding);
      // compile scss
      let result = sass.renderSync({ data: scss, sourceComments: false, sourceMap: false, outputStyle: "expanded" });

      // postcss changing
      const plugins = Object.keys(postcssConfig.plugins).map(key => require(key));
      result = postcss(plugins).process(result.css);

      file.contents = Buffer.from(result.css, encoding);
      // replace extension
      file.extname = ".css";
    }
    if (file.isStream()) {
      console.warn("isStream", file.contents);
      throw new Error("Sass stream is not supported");
    }
    console.log("STYLES:", file.path);
    cb(null, file);
  }
});

exports.default = function compile() {
  // remove styles folder
  fs.rmdirSync("lib/styles", {
    recursive: true
  });

  return gulp
    .src("./src/styles/*.scss")
    .pipe(transformSCSS)
    .pipe(gulp.dest("./lib/styles"));
};
