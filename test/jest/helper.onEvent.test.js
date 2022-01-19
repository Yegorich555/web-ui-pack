import onEvent from "web-ui-pack/helpers/onEvent";

describe("helper.onEvent", () => {
  test("ordinary behavior", () => {
    const fn = jest.fn();
    onEvent(document, "click", fn);
    const e = new Event("click");
    document.dispatchEvent(e);
    expect(fn).toBeCalledTimes(1);
    expect(fn.mock.calls[0][0] === e).toBeTruthy();
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
    const spyOn = jest.spyOn(document, "addEventListener").mockClear();
    const spyOff = jest.spyOn(document, "removeEventListener").mockClear();
    const remove = onEvent(document, "click", fn, { once: true });

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
    expect(fn).not.toHaveBeenCalled();
  });
});