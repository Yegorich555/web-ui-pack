import { getBoundingInternalRect, px2Number, styleTransform } from "web-ui-pack/helpers/styleHelpers";

/** @type HTMLElement */
let el;
beforeEach(() => {
  el = document.body.appendChild(document.createElement("div"));
});

afterEach(() => {
  jest.clearAllMocks();
  document.body.innerHTML = "";
});

describe("helper.styleHelpers", () => {
  test("styleTransform", () => {
    el.style.transform = "smt(2) translate(-10px, 20%) scaleY(120%)";
    styleTransform(el, "translate", "1.2");
    expect(el.style.transform).toBe("smt(2) translate(1.2) scaleY(120%)");

    el.style.transform = "smt(2) translate(-10px, 20%) scaleY(120%)";
    styleTransform(el, "translate", "");
    expect(el.style.transform).toBe("smt(2) scaleY(120%)");
    el.style.transform = "translate(20%)";
    styleTransform(el, "translate", null);
    expect(el.style.transform).toBe("");

    styleTransform(el, "translate", `12px, 50px`);
    expect(el.style.transform).toBe("translate(12px, 50px)");
    styleTransform(el, "translate", `1px, 5px`);
    expect(el.style.transform).toBe("translate(1px, 5px)");

    el.style.transform = "scaleY(120%)";
    styleTransform(el, "translate", `23%`);
    expect(el.style.transform).toBe("scaleY(120%) translate(23%)");

    styleTransform(el, "scaleY", 15);
    expect(el.style.transform).toBe("scaleY(15) translate(23%)");
    styleTransform(el, "scaleY", 0);
    expect(el.style.transform).toBe("scaleY(0) translate(23%)");

    el.style.transform = "";
    styleTransform(el, "translate", `12px, 50px`);
    expect(el.style.transform).toBe("translate(12px, 50px)");

    el.style.transform = "translate(190px, 100px) scaleY(0)";
    styleTransform(el, "scaleY", "");
    expect(el.style.transform).toBe("translate(190px, 100px)");

    el.style.transform = "scaleY(0) translate(190px, 100px)";
    styleTransform(el, "scaleY", "");
    expect(el.style.transform).toBe("translate(190px, 100px)");
  });

  test("px2Number", () => {
    expect(px2Number("23px")).toBe(23);
  });

  test("getBoundingInternalRect", () => {
    // just for coverage
    expect(getBoundingInternalRect(el)).toMatchInlineSnapshot(`
        Object {
          "bottom": 0,
          "height": 0,
          "left": 0,
          "right": 0,
          "top": 0,
          "width": 0,
        }
      `);
    expect(getBoundingInternalRect(el, { ignoreCache: true })).toBeDefined();
    expect(getBoundingInternalRect(el)).toBeDefined();
  });
});
