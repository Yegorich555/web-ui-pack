import { mathFixFP } from "web-ui-pack/helpers/math";

describe("helper.mathFixFP", () => {
  test("both float", () => {
    expect(mathFixFP(10.53 + 0.1)).toBe(10.63);
    expect(mathFixFP(-10.53 - 0.1)).toBe(-10.63);
    expect(mathFixFP(-10.53 + 0.1)).toBe(-10.43);
    expect(mathFixFP(10.53 - 0.1)).toBe(10.43);
    expect(mathFixFP(10.53 + 0.5)).toBe(11.03);
    expect(mathFixFP(10.53 + 1.62)).toBe(12.15);
  });
  test("both int", () => {
    expect(mathFixFP(10 + 1)).toBe(11);
    expect(mathFixFP(2566 - 123)).toBe(2566 - 123);
    expect(mathFixFP(-2566 + 123)).toBe(-2566 + 123);
    expect(mathFixFP(-2566 - 123)).toBe(-2566 - 123);
  });
  test("one of float", () => {
    expect(mathFixFP(10.53 + 6)).toBe(16.53);
    expect(mathFixFP(10.53 - 6)).toBe(4.53);
    expect(mathFixFP(-10.53 + 6)).toBe(-4.53);
    expect(mathFixFP(-10.53 - 6)).toBe(-16.53);

    expect(mathFixFP(10 + 6.33)).toBe(16.33);
    expect(mathFixFP(10 - 6.33)).toBe(3.67);
    expect(mathFixFP(-10 + 6.33)).toBe(-3.67);
    expect(mathFixFP(-10 - 6.33)).toBe(-16.33);

    expect(95 * 0.01).toBe(0.9500000000000001);
    expect(mathFixFP(95 * 0.01)).toBe(0.95);
  });
});
