import nestedProperty from "web-ui-pack/helpers/nestedProperty";

describe("helper.nestedProperty", () => {
  test("set plain", () => {
    const obj = {};
    nestedProperty.set(obj, "name", "t");
    expect(obj).toEqual({ name: "t" });
  });
  test("set nested", () => {
    const obj = {};
    nestedProperty.set(obj, "addr.street", "st");
    expect(obj).toEqual({ addr: { street: "st" } });
    nestedProperty.set(obj, "addr.house", 5);
    expect(obj).toEqual({ addr: { street: "st", house: 5 } });
  });
  test("set nested - override existed", () => {
    const obj = { name: "Janet" };
    nestedProperty.set(obj, "name", "Paul");
    expect(obj).toEqual({ name: "Paul" });
    expect(() => nestedProperty.set(obj, "name.first", "Lara")).toThrow(); // because property is already defined as string and can be converted into object
  });
  test("get plain", () => {
    expect(nestedProperty.get({ val: 5 }, "val")).toBe(5);
    expect(nestedProperty.get({ val: null }, "val")).toBe(null);
    expect(nestedProperty.get({ val: undefined }, "val")).toBe(undefined);
    expect(nestedProperty.get({}, "val")).toBe(undefined);
    expect(nestedProperty.get({ val: 5 }, "name")).toBe(undefined);
  });
  test("get nested", () => {
    const obj = { addr: { street: "st", v2: null, v3: undefined } };
    expect(nestedProperty.get(obj, "addr.street")).toBe("st");
    expect(nestedProperty.get(obj, "addr.house")).toBe(undefined);
    expect(nestedProperty.get(obj, "DOB.date")).toBe(undefined);
    expect(nestedProperty.get(obj, "addr.v2")).toBe(null);
    expect(nestedProperty.get(obj, "addr.v3")).toBe(undefined);
  });
  test("get nested with out.hasProp", () => {
    const obj = { addr: { street: "st", v2: null, v3: undefined } };
    const out = { hasProp: null };
    expect(nestedProperty.get(obj, "addr.house", out)).toBe(undefined);
    expect(out.hasProp).toBe(false);

    expect(nestedProperty.get(obj, "DOB.date", out)).toBe(undefined);
    expect(out.hasProp).toBe(false);

    expect(nestedProperty.get(obj, "addr.v2", out)).toBe(null);
    expect(out.hasProp).toBe(true);

    expect(nestedProperty.get(obj, "addr.v3", out)).toBe(undefined);
    expect(out.hasProp).toBe(true);

    expect(nestedProperty.get(obj, "v1", out)).toBe(undefined);
    expect(out.hasProp).toBe(false);
  });
});
