/* eslint-disable */
const merge = require("webpack-merge");
const CleanPlugin = require("clean-webpack-plugin");
const dev = require("./webpack.dev");
const assets = require("./webpack.common").assetsPath;

module.exports = (env, argv) => {
  const devConfig = dev(env, argv);

  function remove(searchFunction) {
    devConfig.plugins.splice(devConfig.plugins.findIndex(searchFunction), 1);
  }
  // remove plugins because these aren't required for devServer
  remove(a => a instanceof CleanPlugin.CleanWebpackPlugin);

  const result = merge(devConfig, {
    devServer: {
      historyApiFallback: {
        // provide index.html instead of 404:not found error (for SPA app)
        rewrites: [
          { from: /favicon.ico/, to: "test/favicon.ico" } // provide favicon
        ]
      }, // it enables HTML5 mode: https://developer.mozilla.org/en-US/docs/Web/API/History
      stats: {
        children: false // disable console.info for node_modules/*
      },
      contentBase: assets, // folder with static content
      watchContentBase: true // enable hot-reload by changes in contentBase folder
    }
  });

  return result;
};
