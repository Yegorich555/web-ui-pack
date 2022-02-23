import * as h from "../testHelper";

class BaseClass {
  constructor() {
    this.boundFn = this.boundFn.bind(this);
  }

  get getterValue() {
    return 5;
  }

  set setterSet(v) {
    this._value = v;
  }

  options = {};
  arrowFn = () => "someResult";

  notBoundFn() {
    return "notBoundFn result";
  }

  boundFn() {
    return "notBoundFn result";
  }
}

class SecondClass extends BaseClass {
  constructor() {
    super();
    this.boundFn2 = this.boundFn2.bind(this);
  }

  get getterValue2() {
    return 5;
  }

  set setterSet2(v) {
    this._value = v;
  }

  options2 = {};
  arrowFn2 = () => "someResult2";

  notBoundFn2() {
    return "notBoundFn2 result";
  }

  boundFn2() {
    return "notBoundFn2 result";
  }
}

describe("testHelper", () => {
  test("findAllFunctions", () => {
    const a = h.findAllFunctions(new BaseClass());
    expect(a.names.sort()).toEqual(["arrowFn", "notBoundFn", "boundFn"].sort());

    expect(a.arrow).toEqual(["arrowFn"]);
    expect(a.notBound).toEqual(["notBoundFn"]);
    expect(a.bound).toEqual(["boundFn"]);

    expect(a.all).toHaveLength(3);
    expect(a.all).toContainEqual({ name: "arrowFn", isBound: true, isArrow: true });
    expect(a.all).toContainEqual({ name: "notBoundFn", isBound: false, isArrow: false });
    expect(a.all).toContainEqual({ name: "boundFn", isBound: true, isArrow: false });
  });

  test("findAllFunctions_inherit", () => {
    const a = h.findAllFunctions(new SecondClass());
    expect(a.names.sort()).toEqual(["arrowFn", "notBoundFn", "boundFn", "arrowFn2", "notBoundFn2", "boundFn2"].sort());

    expect(a.arrow.sort()).toEqual(["arrowFn", "arrowFn2"].sort());
    expect(a.notBound.sort()).toEqual(["notBoundFn", "notBoundFn2"].sort());
    expect(a.bound.sort()).toEqual(["boundFn", "boundFn2"].sort());

    expect(a.all).toHaveLength(6);
    expect(a.all).toContainEqual({ name: "arrowFn", isBound: true, isArrow: true });
    expect(a.all).toContainEqual({ name: "arrowFn2", isBound: true, isArrow: true });
    expect(a.all).toContainEqual({ name: "notBoundFn", isBound: false, isArrow: false });
    expect(a.all).toContainEqual({ name: "notBoundFn2", isBound: false, isArrow: false });
    expect(a.all).toContainEqual({ name: "boundFn", isBound: true, isArrow: false });
    expect(a.all).toContainEqual({ name: "boundFn2", isBound: true, isArrow: false });
  });
});
