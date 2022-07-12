import objectClone from "web-ui-pack/helpers/objectClone";

function getObj() {
  return {
    v: 1,
    s: "text",
    dt: new Date(Date.parse("2018-10-20")),
    arr: [23, 11, 9],
    fn: (arg1) => arg1,
    empty1: null,
    empty2: "",
    empty3: 0,
    empty4: undefined,
    nested: {
      vn: 2,
      dtn: new Date(Date.parse("2000-10-22")),
      arr: ["jpg", "txt", "png"],
      fn2: (arg2) => arg2,
      nempty1: null,
      nempty2: "",
      nempty3: 0,
      nempty4: undefined,
      next: {
        name: "some name",
        dtn: new Date(Date.parse("1998-05-02")),
        arr: ["jpg", "txt", "png"],
        fn3: (arg3) => arg3,
        nnempty1: null,
        nnempty2: "",
        nnempty3: 0,
        nnempty4: undefined,
      },
    },
  };
}

let v = getObj();
beforeEach(() => {
  v = getObj();
});

describe("helper.objectClone", () => {
  test("without extra options", () => {
    const cloned = objectClone(v);

    expect(cloned).toEqual(v);
    expect(cloned.dt).toBeInstanceOf(Date);
    expect(v.dt !== cloned.dt).toBeTruthy();
    expect(v.arr !== cloned.arr).toBeTruthy();
    expect(v.nested !== cloned.nested).toBeTruthy();
    expect(v.nested.dtn !== cloned.nested.dtn).toBeTruthy();
    expect(v.nested.arr !== cloned.nested.arr).toBeTruthy();
    expect(v.nested.next !== cloned.nested.next).toBeTruthy();
    expect(v.nested.next.dtn !== cloned.nested.next.dtn).toBeTruthy();
    expect(v.nested.next.arr !== cloned.nested.next.arr).toBeTruthy();

    expect(cloned.empty4).toBeUndefined();
    expect(cloned.nested.nempty4).toBeUndefined();
    expect(cloned.nested.next.nnempty4).toBeUndefined();
  });

  test("with option skipUndefined", () => {
    const cloned = objectClone(v, { skipUndefined: true });

    expect(Object.prototype.hasOwnProperty.call(v, "empty4")).toBeTruthy();
    expect(Object.prototype.hasOwnProperty.call(v.nested, "nempty4")).toBeTruthy();
    expect(Object.prototype.hasOwnProperty.call(v.nested.next, "nnempty4")).toBeTruthy();

    expect(Object.prototype.hasOwnProperty.call(cloned, "empty4")).toBeFalsy();
    expect(Object.prototype.hasOwnProperty.call(cloned.nested, "nempty4")).toBeFalsy();
    expect(Object.prototype.hasOwnProperty.call(cloned.nested.next, "nnempty4")).toBeFalsy();
    expect(cloned).toEqual(v);
  });

  test("with option skipEmptyObjects", () => {
    v.emptyObj = {};
    v.nested.emptyObj2 = {
      empt: undefined,
    };
    const cloned = objectClone(v, { skipEmptyObjects: true, skipUndefined: true });

    expect(Object.prototype.hasOwnProperty.call(cloned, "emptyObj")).toBeFalsy();
    expect(Object.prototype.hasOwnProperty.call(cloned, "emptyObj2")).toBeFalsy();
    expect(cloned).not.toEqual(v);
    delete v.emptyObj;
    delete v.nested.emptyObj2;
    expect(cloned).toEqual(v);
  });

  test("with nested HTMLElement", () => {
    v.el = document.createElement("span");

    const cloned = objectClone(v);
    expect(v.el === cloned.el).toBeTruthy();
    expect(cloned).toEqual(v);
  });
});
