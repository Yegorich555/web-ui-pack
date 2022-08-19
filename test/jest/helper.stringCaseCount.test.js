import { stringLowerCount, stringUpperCount } from "web-ui-pack/indexHelpers";

describe("helper.stringCaseCount", () => {
  test("stringLowerCount", () => {
    expect(stringLowerCount("WeLLDoNE")).toBe(2);
    expect(stringLowerCount("ХоРОшО СДЕЛАнО")).toBe(3);

    expect(stringLowerCount("wellDone", 3)).toBe(3);
    expect(stringLowerCount("wellDone")).toBeGreaterThan(3);
    expect(stringLowerCount("хорошо Сделано", 4)).toBe(4);
    expect(stringLowerCount("хорошо Сделано")).toBeGreaterThan(4);
  });
  test("stringLowerCount with special symbols", () => {
    expect(stringLowerCount("w.,\\'\"~!@ #R")).toBe(1);
  });

  test("stringUpperCount", () => {
    expect(stringUpperCount("wEllDone")).toBe(2);
    expect(stringUpperCount("Хорошо Сделано")).toBe(2);

    expect(stringUpperCount("Well Done", 1)).toBe(1);
    expect(stringUpperCount("Well Done")).toBeGreaterThan(1);
    expect(stringUpperCount("ХорошО Сделано", 2)).toBe(2);
    expect(stringUpperCount("ХорошО Сделано")).toBeGreaterThan(2);
  });
  test("stringUpperCount with special symbols", () => {
    expect(stringUpperCount("W.,\\'\"~!@ #r")).toBe(1);
  });
});
