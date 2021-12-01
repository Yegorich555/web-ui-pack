/* eslint-disable @typescript-eslint/no-var-requires */
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CaseSensitivePathsPlugin = require("case-sensitive-paths-webpack-plugin");
const path = require("path");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

const srcPath = path.resolve(__dirname, "./src/");
const destPath = path.resolve(__dirname, "./build/"); // ('../Api/wwwroot')
const assetsPath = "./public";
const filesThreshold = 8196; // (bytes) threshold for compression, url-loader plugins

/* eslint-disable func-names */
module.exports = function (env, argv) {
  const isDevServer = env.WEBPACK_SERVE;
  const mode = argv.mode || (isDevServer ? "development" : "production");
  const isDevMode = mode !== "production";

  process.env.NODE_ENV = mode; // it resolves issues in postcss.config.js (since Define plugin is loaded only after reading config-files)

  /** @type {import('webpack').Configuration} */
  const result = {
    stats: {
      children: false, // disable console.info for node_modules/*
      modules: false,
      errors: true,
      errorDetails: true,
    },
    // entryPoint for webpack; it can be object with key-value pairs for multibuild (https://webpack.js.org/concepts/entry-points/)
    entry: path.resolve(srcPath, "main.tsx"),

    output: {
      path: destPath,
      filename: "[name].js",
      chunkFilename: "[name].js",
      publicPath: "/", // url that should be used for providing assets
      clean: true,
    },
    resolve: {
      extensions: [".js", ".jsx", ".ts", ".tsx"], // using import without file-extensions
      plugins: [new TsconfigPathsPlugin({ configFile: path.resolve(__dirname, "./tsconfig.json") })], // plugin makes mapping from tsconfig.json to weback:alias
    },
    module: {
      rules: [
        // rule for js, jsx files
        {
          test: /\.(ts|tsx)$/,
          exclude: /node_modules/,
          use: [
            "babel-loader", // transpile *.js, *.jsx, *.ts, *.tsx to result according to .browserlistrc and babel.config.js files
            {
              loader: "ts-loader", // transpile *.ts to *.js, despite babel-loader deals with typeScript without restrictions but doesn't have .browserlist support
              options: {
                transpileOnly: true, // we don't type checking during the compilation - it's task for CodeEditor
              },
            },
            // optional: "ifdef-loader" // prodives conditinal compilation: https://github.com/nippur72/ifdef-loader
            // optional: "eslint-loader" //provides lint-errors into wepback output
          ],
        },
        // rules for style-files
        {
          test: /\.css$|\.scss$/,
          use: [
            isDevServer
              ? "style-loader" // it extracts style directly into html (MiniCssExtractPlugin works incorrect with hmr and modules architecture)
              : MiniCssExtractPlugin.loader, // it extracts styles into file *.css
            {
              loader: "css-loader", // it interprets @import and url() like import/require() and it resolves them (you can use [import *.css] into *.js).
              options: {
                modules: {
                  auto: /\.module\.\w+$/, // enable css-modules option for files *.module*.
                },
              },
            },
            {
              loader: "sass-loader", // it compiles Sass to CSS, using Node Sass by default
              options: {
                // additionalData: '@import "variables";', // inject this import by default in each scss-file
                sassOptions: {
                  includePaths: [path.resolve(__dirname, "src/styles")], // using pathes as root
                },
              },
            },
            "postcss-loader", // it provides adding vendor prefixes to CSS rules using values from Can I Use (see postcss.config.js in the project)
          ],
        },
      ],
    },
    plugins: [
      new webpack.WatchIgnorePlugin({ paths: [/\.d\.ts$/] }), // ignore d.ts files in --watch mode
      new webpack.IgnorePlugin({ resourceRegExp: /^\.\/locale$/, contextRegExp: /moment$/ }), // it adds force-ignoring unused parts of modules like moment/locale/*.js
      new webpack.DefinePlugin({
        // it adds custom Global definition to the project like BASE_URL for index.html
        "process.env": {
          NODE_ENV: JSON.stringify(mode),
          BASE_URL: '"/"',
        },
      }),
      new CaseSensitivePathsPlugin(), // it fixes bugs between OS in caseSensitivePaths (since Windows isn't CaseSensitive but Linux is)
      new HtmlWebpackPlugin({
        // it creates *.html with injecting js and css into template
        template: path.resolve(srcPath, "index.html"),
        minify: isDevMode
          ? false
          : {
              removeComments: true,
              collapseWhitespace: true,
              removeAttributeQuotes: true,
              collapseBooleanAttributes: true,
              removeScriptTypeAttributes: true,
            },
      }),
      new MiniCssExtractPlugin({
        // it extracts css-code from js into splitted file
        filename: isDevMode ? "[name].css" : "[name].[contenthash].css",
        chunkFilename: isDevMode ? "[id].css" : "[id].[contenthash].css",
      }),
      // it copies files like images, fonts etc. from 'public' path to 'destPath' (since not every file will be injected into css and js)
      new webpack.ProgressPlugin(), // it shows progress of building
      new webpack.ProvidePlugin({
        React: "react", // optional: react. it adds [import React from 'react'] as ES6 module to every file into the project
      }),
    ],
  };

  return result;
};

module.exports.filesThreshold = filesThreshold;
module.exports.assetsPath = assetsPath;
