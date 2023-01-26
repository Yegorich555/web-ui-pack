import { mathSumFloat } from "web-ui-pack/helpers/math";

describe("helper.mathSumFloat", () => {
  test("both float", () => {
    expect(mathSumFloat(10.53, 0.1)).toBe(10.63);
    expect(mathSumFloat(-10.53, -0.1)).toBe(-10.63);
    expect(mathSumFloat(-10.53, 0.1)).toBe(-10.43);
    expect(mathSumFloat(10.53, -0.1)).toBe(10.43);
    expect(mathSumFloat(10.53, 0.5)).toBe(11.03);
    expect(mathSumFloat(10.53, 1.62)).toBe(12.15);
  });
  test("both int", () => {
    expect(mathSumFloat(10, 1)).toBe(11);
    expect(mathSumFloat(2566, -123)).toBe(2566 - 123);
    expect(mathSumFloat(-2566, 123)).toBe(-2566 + 123);
    expect(mathSumFloat(-2566, -123)).toBe(-2566 - 123);
  });
  test("one of float", () => {
    expect(mathSumFloat(10.53, 6)).toBe(16.53);
    expect(mathSumFloat(10.53, -6)).toBe(4.53);
    expect(mathSumFloat(-10.53, 6)).toBe(-4.53);
    expect(mathSumFloat(-10.53, -6)).toBe(-16.53);

    expect(mathSumFloat(10, 6.33)).toBe(16.33);
    expect(mathSumFloat(10, -6.33)).toBe(3.67);
    expect(mathSumFloat(-10, 6.33)).toBe(-3.67);
    expect(mathSumFloat(-10, -6.33)).toBe(-16.33);
  });
});
