const Env = require("jest-environment-jsdom");

class JsdomEnvironment extends Env {
  async setup() {
    await super.setup();
    // extend global.page here

    let spyFn;
    const unhandledReject = (err) => (spyFn ? spyFn(err) : console.error(err));
    unhandledReject.spy = (spy) => {
      spyFn = (resolve, reject) => {
        try {
          spy(resolve, reject);
        } catch (err) {
          console.error(err);
        }
      };
      return spy;
    };
    unhandledReject.reset = () => (spyFn = undefined);
    // https://stackoverflow.com/questions/68287660/mocking-a-function-in-a-jest-environment-file
    this.global.unhandledReject = unhandledReject;

    this.global.PromiseOrig = this.global.Promise;
    const Orig = this.global.Promise;
    // redefine default promise to handle exceptions
    const Promise = function promiseHandler(fnArg) {
      const fn = (resolve, reject) => {
        try {
          return fnArg(resolve, reject);
        } catch (err) {
          // todo such wrapper affects on Promise chaining p.then.catch (catch will never fired but should)
          return unhandledReject(err);
        }
      };
      // todo such wrapper affects on Promise chaining p.then.catch (catch will never fired but should)
      return new Orig(fn); // .catch((err) => unhandledReject(err));
    };

    const excl = new Set(["name", "length"]);
    const oldProto = {};
    Object.getOwnPropertyNames(this.global.Promise).forEach((k) => {
      if (!excl.has(k)) {
        oldProto[k] = this.global.Promise[k];
      }
    });

    Object.assign(Promise, oldProto);
    this.global.Promise = Promise;
  }
}

module.exports = JsdomEnvironment;
