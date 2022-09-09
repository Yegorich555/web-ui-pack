import { WUPHelpers } from "web-ui-pack";

afterEach(() => {
  jest.clearAllMocks();
});

describe("helper.isEqual", () => {
  test("default behavior", () => {
    expect(WUPHelpers.isEqual(1, 1)).toBe(true);
    expect(WUPHelpers.isEqual(1, 2)).toBe(false);
    expect(WUPHelpers.isEqual("1", "1")).toBe(true);
    expect(WUPHelpers.isEqual("1", 1)).toBe(false);
    expect(WUPHelpers.isEqual(true, true)).toBe(true);
    expect(WUPHelpers.isEqual(true, false)).toBe(false);
    expect(WUPHelpers.isEqual(null, null)).toBe(true);
    expect(WUPHelpers.isEqual(undefined, undefined)).toBe(true);
    expect(WUPHelpers.isEqual(null, undefined)).toBe(false);
  });

  test("objects with valueOf", () => {
    expect(WUPHelpers.isEqual({}, {})).toBe(false);
    expect(WUPHelpers.isEqual({ valueOf: () => 1 }, { valueOf: () => 1 })).toBe(true);
    expect(WUPHelpers.isEqual(new Date(12345678), new Date(12345678))).toBe(true);
    expect(WUPHelpers.isEqual(new Date(123), new Date())).toBe(false);
  });

  test("NaN", () => {
    expect(WUPHelpers.isEqual(new Date("12345678"), null)).toBe(false);
    expect(WUPHelpers.isEqual(new Date("ab"), new Date("cd"))).toBe(true); // both isNan
  });
});
