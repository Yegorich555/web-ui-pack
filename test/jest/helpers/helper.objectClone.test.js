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
      arr: ["jpg", "txt", "png", undefined],
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
    expect(v.dt !== cloned.dt).toBe(true);
    expect(v.arr !== cloned.arr).toBe(true);
    expect(v.nested !== cloned.nested).toBe(true);
    expect(v.nested.dtn !== cloned.nested.dtn).toBe(true);
    expect(v.nested.arr !== cloned.nested.arr).toBe(true);
    expect(v.nested.next !== cloned.nested.next).toBe(true);
    expect(v.nested.next.dtn !== cloned.nested.next.dtn).toBe(true);
    expect(v.nested.next.arr !== cloned.nested.next.arr).toBe(true);

    expect(cloned.empty4).toBeUndefined();
    expect(cloned.nested.nempty4).toBeUndefined();
    expect(cloned.nested.next.nnempty4).toBeUndefined();
  });

  test("with option skipUndefined", () => {
    const cloned = objectClone(v, { skipUndefined: true });
    expect(cloned).toMatchInlineSnapshot(`
      {
        "arr": [
          23,
          11,
          9,
        ],
        "dt": 2018-10-20T00:00:00.000Z,
        "empty1": null,
        "empty2": "",
        "empty3": 0,
        "fn": [Function],
        "nested": {
          "arr": [
            "jpg",
            "txt",
            "png",
          ],
          "dtn": 2000-10-22T00:00:00.000Z,
          "fn2": [Function],
          "nempty1": null,
          "nempty2": "",
          "nempty3": 0,
          "next": {
            "arr": [
              "jpg",
              "txt",
              "png",
            ],
            "dtn": 1998-05-02T00:00:00.000Z,
            "fn3": [Function],
            "name": "some name",
            "nnempty1": null,
            "nnempty2": "",
            "nnempty3": 0,
          },
          "vn": 2,
        },
        "s": "text",
        "v": 1,
      }
    `);

    expect(Object.prototype.hasOwnProperty.call(v, "empty4")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(v.nested, "nempty4")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(v.nested.next, "nnempty4")).toBe(true);

    expect(Object.prototype.hasOwnProperty.call(cloned, "empty4")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(cloned.nested, "nempty4")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(cloned.nested.next, "nnempty4")).toBe(false);
    expect(cloned).toEqual(v);
  });

  test("with option skipEmptyObjects", () => {
    v.emptyObj = {};
    v.nested.emptyObj2 = {
      empt: undefined,
    };
    const cloned = objectClone(v, { skipEmptyObjects: true, skipUndefined: true });

    expect(Object.prototype.hasOwnProperty.call(cloned, "emptyObj")).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(cloned, "emptyObj2")).toBe(false);
    expect(cloned).not.toEqual(v);
    delete v.emptyObj;
    delete v.nested.emptyObj2;
    expect(cloned).toEqual(v);
  });

  test("with nested HTMLElement", () => {
    v.el = document.createElement("span");

    const cloned = objectClone(v);
    expect(v.el === cloned.el).toBe(true);
    expect(cloned).toEqual(v);
  });
});
