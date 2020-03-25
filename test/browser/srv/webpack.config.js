/* eslint-disable global-require */

module.exports = {
  mode: "development",
  stats: "errors-only",
  entry: require("path").join(__dirname, "./entry.jsx"),
  output: {
    path: __dirname,
    filename: "bundle.js"
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          "babel-loader" // transpile *.js, *.jsx, *.ts, *.tsx to result according to .browserlistrc and babel.config.js files
        ]
      }
    ]
  }
};
