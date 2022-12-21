import promiseWait from "web-ui-pack/helpers/promiseWait";

describe("helper.promiseWait", () => {
  // watchfix: jest.fakeTimers bug: https://github.com/facebook/jest/issues/9719
  /* test("jest bug", async () => {
    jest.useFakeTimers();
    const fn = jest.fn();

    const mainPromise = Promise.resolve(5);
    const waitPromise = new Promise(resolve => setTimeout(() => resolve(mainPromise), 100));
    //const waitPromise = new Promise(resolve => setTimeout(() => resolve(5), 100)).then(fn);
    waitPromise.then(fn);

    expect(setTimeout).toBeCalled(); // it works
    jest.advanceTimersToNextTimer();
    await Promise.resolve(); // wait for previous promiseThen exectution
    expect(fn).toBeCalled(); // it doesn't work
  }); */

  test("resolves value", async () => {
    // jest.useFakeTimers();
    const fnNested = jest.fn();
    const fn = jest.fn();

    promiseWait(
      Promise.resolve(5).then((v) => {
        fnNested(v);
        return v;
      }),
      1
    ).then(fn);

    // expect(setTimeout).toBeCalled();
    await Promise.resolve();
    expect(fn).not.toBeCalled();
    expect(fnNested).toBeCalled();
    // jest.advanceTimersToNextTimer();
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(fn).toBeCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(5);
  });

  test("rejects value", async () => {
    // jest.useFakeTimers();
    const fn = jest.fn();
    promiseWait(Promise.reject("error"), 1, false).catch(fn);

    // expect(setTimeout).toBeCalled();
    await Promise.resolve();
    expect(fn).not.toBeCalled();
    // jest.advanceTimersToNextTimer();
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(fn).toBeCalledTimes(1);
    expect(fn).toBeCalledWith("error");
  });

  test("no-wait if resolved before (enable smart-option)", async () => {
    const fn = jest.fn();
    promiseWait(Promise.resolve(), 2, true).then(fn);
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(fn).toBeCalledTimes(1); // because Promise is already resolved

    fn.mockClear();
    promiseWait(Promise.resolve(), 2, fn);
    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(fn).not.toBeCalled(); // because Promise is already resolved
  });

  test("wait if not resolved before (enable smart-option)", async () => {
    const fn = jest.fn();
    const fnFinally = jest.fn();
    const fnThen = jest.fn();
    const mainPromise = new Promise((resolve) => setTimeout(() => resolve("Some data here"), 2));
    promiseWait(mainPromise, 500, (wait) => fn(wait))
      .then(fnThen)
      .finally(fnFinally);
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(fnFinally).toBeCalledTimes(0);
    expect(fn).toBeCalledTimes(1);
    expect(fn).lastCalledWith(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(fnThen).lastCalledWith("Some data here");
    expect(fnFinally).toBeCalledTimes(1);
    expect(fn).toBeCalledTimes(2);
    expect(fn).lastCalledWith(false);
  });

  test("wait if resolved before (disable smart-option)", async () => {
    const fn = jest.fn();
    const fnNested = jest.fn();
    const mainPromise = new Promise((resolve) => setTimeout(resolve, 1)).then(fnNested);
    promiseWait(mainPromise, 5, false).then(fn);

    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(fnNested).toBeCalled();
    expect(fn).not.toBeCalled();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(fn).toBeCalled();
  });

  test("no-wait more if time exceeded", async () => {
    const fn = jest.fn();
    const fnNested = jest.fn();
    const mainPromise = new Promise((resolve) => setTimeout(resolve, 5)).then(fnNested);
    promiseWait(mainPromise, 1).then(fn);

    await new Promise((resolve) => setTimeout(resolve, 1));
    expect(fnNested).not.toBeCalled();
    expect(fn).not.toBeCalled();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(fn).toBeCalled();
    expect(fnNested).toBeCalled();
  });
});
