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
    expect(nestedProperty.get({ val: 5 }, "name")).toBeUndefined();
  });
  test("get nested", () => {
    const obj = { addr: { street: "st" } };
    expect(nestedProperty.get(obj, "addr.street")).toBe("st");
    expect(nestedProperty.get(obj, "addr.house")).toBeUndefined();
    expect(nestedProperty.get(obj, "DOB.date")).toBeUndefined();
  });
});
