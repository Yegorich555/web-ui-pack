import onEvent from "web-ui-pack/helpers/onEvent";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("helper.onEvent", () => {
  test("ordinary behavior", () => {
    const fn = jest.fn();
    onEvent(document, "click", fn);
    const e = new Event("click");
    document.dispatchEvent(e);
    expect(fn).toBeCalledTimes(1);
    expect(fn.mock.calls[0][0] === e).toBe(true);
  });

  test("add/removeListener", () => {
    const fn = jest.fn();
    const spyOn = jest.spyOn(document, "addEventListener");
    const spyOff = jest.spyOn(document, "removeEventListener");
    const remove = onEvent(document, "click", fn);

    expect(spyOn).toBeCalledTimes(1);
    expect(spyOff).toBeCalledTimes(0);
    remove();
    expect(spyOn).toBeCalledTimes(1);
    expect(spyOff).toBeCalledTimes(1);
    // checking if eventListener is removed properly
    const e = new Event("click");
    document.dispatchEvent(e);
    expect(fn).not.toHaveBeenCalled();
  });

  test("option.once", () => {
    const fn = jest.fn();
    const spyOn = jest.spyOn(document, "addEventListener");
    const spyOff = jest.spyOn(document, "removeEventListener");
    const opts = { once: true };
    const remove = onEvent(document, "click", fn, opts);

    document.dispatchEvent(new Event("click"));
    expect(spyOn).toBeCalledTimes(1);
    expect(spyOff).toBeCalledTimes(1);
    expect(fn).toBeCalledTimes(1);

    // checking if eventListener is removed properly
    fn.mockClear();
    document.dispatchEvent(new Event("click"));
    expect(fn).not.toHaveBeenCalled();

    remove();
    expect(spyOn).toBeCalledTimes(1);
    expect(spyOff).toBeCalledTimes(2);
    expect(spyOff.mock.lastCall[0]).toBe("click");
    expect(spyOff.mock.lastCall[2]).toBe(opts);
    expect(spyOff.mock.lastCall[2]).toEqual({ once: true, passive: true });
    expect(fn).not.toHaveBeenCalled();
  });

  test("other options", () => {
    const fn = jest.fn();
    const spyOn = jest.spyOn(document, "addEventListener");
    let remove = onEvent(document, "click", fn, { passive: true });

    document.dispatchEvent(new MouseEvent("click"));
    expect(spyOn).toBeCalledTimes(1);
    expect(fn).toBeCalledTimes(1);
    remove();

    jest.clearAllMocks();
    remove = onEvent(document, "click", fn, true);
    document.dispatchEvent(new MouseEvent("click"));
    expect(spyOn).toBeCalledTimes(1);
    expect(fn).toBeCalledTimes(1);
    remove();

    let opts = { passive: false };
    const spyOff = jest.spyOn(document, "removeEventListener");
    remove = onEvent(document, "click", fn, opts);
    expect(opts.passive).toBe(false);
    remove();
    expect(spyOff.mock.lastCall[2]).toBe(opts);

    opts = { passive: false, once: true };
    remove = onEvent(document, "click", fn, opts);
    expect(opts).toEqual({ passive: false, once: true });
    remove();
    expect(spyOff.mock.lastCall[2]).toBe(opts);
  });
});
