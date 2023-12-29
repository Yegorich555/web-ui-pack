const { TestEnvironment } = require("jest-environment-jsdom");

/**
 * @typedef { import("@jest/environment").JestEnvironmentConfig } JestEnvironmentConfig
 * @typedef { import("@jest/environment").EnvironmentContext } EnvironmentContext
 */

// jest issue: https://github.com/facebook/jest/issues/9856
// otherwise impossible to change timezone on the fly in jest: https://github.com/facebook/jest/issues/9264#issuecomment-1053662344
module.exports = class TimeZoneEnv extends TestEnvironment {
  /**
   * @param {JestEnvironmentConfig} cfg
   * @param {EnvironmentContext} ctx
   */
  constructor(cfg, ctx) {
    super(cfg, ctx);

    const tz = cfg.projectConfig.testEnvironmentOptions.timezone;
    if (tz) {
      process.env.TZ = tz;
      this.global.TZ = tz; // otherwise local process.env.TZ is empty
    }
    // ctx.console.warn({ tz });
  }
};
