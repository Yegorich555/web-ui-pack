import { WUPHelpers } from "web-ui-pack";

beforeAll(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe("helper.onSpy", () => {
  test("default behavior", () => {
    const obj = {
      v: 1,
      show: () => "Im OK",
    };
    const fn = jest.fn();
    const remove = WUPHelpers.onSpy(obj, "show", fn);

    expect(obj.show()).toBe("Im OK");
    expect(fn).toBeCalledTimes(1);

    expect(obj.show(1, "ok", true)).toBe("Im OK");
    expect(fn).toBeCalledTimes(2);
    expect(fn).lastCalledWith(1, "ok", true);

    fn.mockClear();
    remove();
    expect(obj.show()).toBe("Im OK");
    expect(fn).not.toBeCalled();
  });
});
