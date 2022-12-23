import onScrollStop from "web-ui-pack/helpers/onScrollStop";
import * as h from "../../testHelper";

let next = (n = 5) => Promise.resolve(n);

const bodySize = {
  width: 400,
  height: 600,
};

beforeEach(() => {
  jest.useFakeTimers();
  const na = h.useFakeAnimation().nextFrame;
  next = async (n) => {
    for (let i = 0; i < n; ++i) {
      await na();
    }
    return n;
  };
  document.body.appendChild(document.createElement("div"));
  jest.spyOn(document.body, "clientHeight", "get").mockImplementation(() => bodySize.height);
  jest.spyOn(document.body, "clientWidth", "get").mockImplementation(() => bodySize.width);
  jest.spyOn(document.body, "scrollHeight", "get").mockImplementation(() => document.body.clientHeight + 30);
  jest.spyOn(document.body, "scrollWidth", "get").mockImplementation(() => document.body.clientWidth + 30);
});

afterEach(() => {
  document.body.innerHTML = "";
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe("helper.onScrollStop", () => {
  test("default behavior", async () => {
    const fn = jest.fn();
    onScrollStop(document.body, fn);
    await next(5);
    expect(fn).toBeCalledTimes(0);

    fn.mockClear();
    let i = 0;
    const scrollTop = jest.spyOn(document.body, "scrollTop", "get");
    scrollTop.mockImplementation(() => ++i); // simulate scrolling

    await next(5);
    expect(fn).toBeCalledTimes(0);
    scrollTop.mockRestore();
    await next(5);
    expect(fn).toBeCalledTimes(1);

    fn.mockClear();
    await next(5);
    expect(fn).toBeCalledTimes(0);

    const scrollLeft = jest.spyOn(document.body, "scrollLeft", "get");
    scrollLeft.mockImplementation(() => ++i); // simulate scrolling
    await next(5);
    expect(fn).toBeCalledTimes(0);
    scrollLeft.mockRestore();
    await next(5);
    expect(fn).toBeCalledTimes(1);
  });

  test("options.once", async () => {
    const fn = jest.fn();
    onScrollStop(document.body, fn, { once: true });

    let i = 0;
    const scrollTop = jest.spyOn(document.body, "scrollTop", "get").mockImplementation(() => i);
    await next(5);
    expect(fn).toBeCalledTimes(0);
    scrollTop.mockImplementation(() => ++i); // simulate scrolling
    await next(1);
    scrollTop.mockRestore();
    await next(5);
    expect(fn).toBeCalledTimes(1);

    fn.mockClear();
    scrollTop.mockImplementation(() => ++i); // simulate scrolling
    await next(1);
    scrollTop.mockRestore();
    await next(5);
    expect(fn).toBeCalledTimes(0);
  });

  test("options.onceNotStarted", async () => {
    const fn = jest.fn();
    onScrollStop(document.body, fn, { onceNotStarted: true });
    await next(5);
    expect(fn).toBeCalledTimes(1); // scroll wasn't started but callback fired
    await next(5);
    expect(fn).toBeCalledTimes(1);
  });

  test("removing listener", async () => {
    const fn = jest.fn();
    const remove = onScrollStop(document.body, fn);
    const scrollTop = jest.spyOn(document.body, "scrollTop", "get").mockImplementation(() => 1);
    await next(1);
    scrollTop.mockRestore();

    remove();

    await next(5);
    expect(fn).toBeCalledTimes(0); // because listener was removed before
  });
});
