// const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");
const path = require("path");

/** @type {import('webpack').Configuration} */
module.exports = {
  mode: "none",
  stats: {
    children: false, // disable console.info for node_modules/*
    modules: false,
    errors: true,
    errorDetails: true,
  },
  entry: path.join(__dirname, "./entry.jsx"),
  output: {
    path: __dirname,
    filename: "bundle.js",
  },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"], // using import without file-extensions
    alias: {
      "web-ui-pack": path.resolve(__dirname, "../../../dist/"),
    },
    // todo somehow it doesn't work
    // plugins: [
    //   new TsconfigPathsPlugin({
    //     configFile: path.resolve(__dirname, "../../tsconfig.json"),
    //     logLevel: "INFO",
    //   }),
    // ], // plugin makes mapping from tsconfig.json to weback:alias
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          "babel-loader", // transpile *.js, *.jsx, *.ts, *.tsx to result according to .browserlistrc and babel.config.js files
          {
            loader: "ts-loader", // transpile *.ts to *.js, despite babel-loader deals with typeScript without restrictions but doesn't have .browserlist support
            options: {
              transpileOnly: true, // we don't type checking during the compilation - it's task for CodeEditor
            },
          },
        ],
      },
    ],
  },
};
