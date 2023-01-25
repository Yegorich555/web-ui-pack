import { mathScaleValue } from "web-ui-pack/helpers/math";

describe("helper.mathScaleValue", () => {
  test("ordinary behvioar", () => {
    expect(mathScaleValue(50, 0, 100, 0, 100)).toBe(50);
    expect(mathScaleValue(50, 0, 50, 0, 100)).toBe(100);
    expect(mathScaleValue(12, 4, 20, 0, 100)).toBe(50);
    expect(mathScaleValue(50, 0, 100, 0, 360)).toBe(180);

    expect(mathScaleValue(15, 10, 20, -90, 90)).toBe(0);
    expect(mathScaleValue(20, 10, 20, -90, 90)).toBe(90);
    expect(mathScaleValue(18, 10, 20, -90, 90)).toBe(54);

    expect(mathScaleValue(-90, -90, 90, 0, 100)).toBe(0);
    expect(mathScaleValue(-45, -90, 90, 0, 100)).toBe(25);
    expect(mathScaleValue(0, -90, 90, 0, 100)).toBe(50);
    expect(mathScaleValue(45, -90, 90, 0, 100)).toBe(75);
    expect(mathScaleValue(90, -90, 90, 0, 100)).toBe(100);

    expect(mathScaleValue(-45, -90, 90, -100, 100)).toBe(-50);
    expect(mathScaleValue(45, -90, 90, -100, 100)).toBe(50);
  });
});
