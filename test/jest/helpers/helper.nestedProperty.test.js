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
  test("set nested with array", () => {
    const obj = {};

    expect(nestedProperty.set(obj, "items[0].id", 423)).toEqual({ items: [{ id: 423 }] });
    expect(nestedProperty.set(obj, "items[0].name", "Kale")).toEqual({ items: [{ id: 423, name: "Kale" }] });
    expect(nestedProperty.set(obj, "items[1].id", 1267)).toEqual({
      items: [{ id: 423, name: "Kale" }, { id: 1267 }],
    });
    expect(nestedProperty.set(obj, "ids[0]", 148)).toEqual({
      items: [{ id: 423, name: "Kale" }, { id: 1267 }],
      ids: [148],
    });
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
  test("get nested with array", () => {
    const obj = {
      items: [{ id: 423, name: "Kale" }, { id: 1267 }],
      ids: [148],
    };

    expect(nestedProperty.get(obj, "items[0].id")).toBe(423);
    expect(nestedProperty.get(obj, "items[0].name")).toBe("Kale");
    expect(nestedProperty.get(obj, "items[1].id")).toBe(1267);
    expect(nestedProperty.get(obj, "ids[0]")).toBe(148);
  });
  test("with wrong empty path", () => {
    const obj = { id: 1 };

    expect(nestedProperty.get(obj, "")).toBe(undefined);
    expect(nestedProperty.set(obj, "")).toEqual({ id: 1 });
  });

  test("set - prototype pollution is not allowed", () => {
    const paths = [
      "__proto__.ppBullseye",
      "constructor.prototype.ppBullseye",
      "addr.__proto__.ppBullseye",
      "addr.constructor.prototype.ppBullseye",
      "items[0].__proto__.ppBullseye",
      "__proto__",
      "constructor",
      "prototype",
    ];
    paths.forEach((path) => {
      expect(() => nestedProperty.set({}, path, "polluted")).toThrow();
      expect({}.ppBullseye).toBe(undefined); // the main point: Object.prototype must stay clean
    });
    expect(Object.prototype.ppBullseye).toBe(undefined);
    expect({}.constructor).toBe(Object);
  });

  test("set - inherited props are not mutated", () => {
    class Model {}
    Model.prototype.addr = { street: "st" };
    const obj = new Model();

    nestedProperty.set(obj, "addr.house", 5);
    expect(Object.prototype.hasOwnProperty.call(obj, "addr")).toBe(true); // own prop created instead of changing prototype
    expect(obj.addr).toEqual({ house: 5 });
    expect(Model.prototype.addr).toEqual({ street: "st" }); // prototype isn't touched
  });

  test("get - prototype chain isn't reachable", () => {
    const out = { hasProp: null };
    expect(nestedProperty.get({}, "__proto__")).toBe(undefined);
    expect(nestedProperty.get({}, "__proto__.toString")).toBe(undefined);
    expect(nestedProperty.get({}, "constructor")).toBe(undefined);
    expect(nestedProperty.get({}, "constructor.constructor")).toBe(undefined); // otherwise it's possible to get Function
    expect(nestedProperty.get({ addr: {} }, "addr.__proto__.toString")).toBe(undefined);

    expect(nestedProperty.get({}, "__proto__", out)).toBe(undefined);
    expect(out.hasProp).toBe(false);
  });
});
