import findScrollParent, { findScrollParentAll } from "web-ui-pack/helpers/findScrollParent";

afterEach(() => {
  document.body.innerHTML = "";
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

function lockScroll(el, opts = { x: true, y: true }) {
  const o = { x: true, y: true, ...opts };
  o.y && jest.spyOn(el, "scrollTop", "set").mockImplementation(() => 0);
  o.x && jest.spyOn(el, "scrollLeft", "set").mockImplementation(() => 0);
}

function unLockScroll(el) {
  jest.spyOn(el, "scrollTop", "set").mockRestore();
  jest.spyOn(el, "scrollLeft", "set").mockRestore();
}

beforeEach(() => {
  // default scenario when no items places
  lockScroll(document.body);
  lockScroll(document.body.parentElement);
});

describe("helper.findScrollParent", () => {
  test("default behavior", () => {
    const el = document.body.appendChild(document.createElement("div"));
    expect(findScrollParent(el)).toBeNull();
    expect(findScrollParent(document.body)).toBeNull();

    jest.restoreAllMocks(); // to allow change scrollTop for body
    const onScroll = jest.fn();
    const onScroll2 = jest.fn();
    document.body.onscroll = onScroll;
    document.body.addEventListener("scroll", onScroll2);
    expect(findScrollParent(el) === document.body).toBe(true);
    expect(onScroll).not.toBeCalled();
    expect(onScroll2).not.toBeCalled();

    document.body.scrollLeft = 2; // cover case when item is scrolled
    expect(findScrollParent(el) === document.body).toBe(true);
    document.body.scrollLeft = 0;

    lockScroll(document.body, { x: false });
    expect(findScrollParent(el) === document.body).toBe(true); // because scrollLeft possible

    // when component with fixed position
    jest.restoreAllMocks(); // to allow change scroll
    document.body.innerHTML = `
      <main>
        <div></div>
      </main>
    `;
    const main = document.body.querySelector("main");
    const div = document.body.querySelector("div");
    expect(findScrollParent(div)?.tagName.toLowerCase()).toBe("main");

    main.style.position = "fixed";
    expect(findScrollParent(div)?.tagName.toLowerCase()).toBe("main");

    lockScroll(main);
    expect(findScrollParent(div)?.tagName.toLowerCase()).toBeFalsy(); // despite body is scrollable but main with fixed position

    // again when position-fixed added via classNames
    main.style.position = "";
    // simulate defaults
    const orig = window.getComputedStyle;
    jest.spyOn(window, "getComputedStyle").mockImplementation((elem) => {
      if (elem === main) {
        /** @type CSSStyleDeclaration */
        return { position: "fixed" };
      }
      return orig(elem);
    });
    expect(findScrollParent(div)?.tagName.toLowerCase()).toBeFalsy(); // despite body is scrollable but main with fixed position
  });

  test("helper.findScrollParentAll", () => {
    let el = document.body.appendChild(document.createElement("div"));
    expect(findScrollParentAll(el)).toBeNull();
    expect(findScrollParentAll(document.body)).toBeNull();

    unLockScroll(document.body);
    expect(findScrollParentAll(el)).toEqual([document.body]);

    // move element to nested
    document.body.innerHTML = `
      <main>
        <div></div>
      </main>
    `;
    const main = document.body.querySelector("main");
    el = document.body.querySelector("div");
    expect(findScrollParentAll(el).map((a) => a.tagName.toLowerCase())).toEqual(["main", "body"]); // because scrollTop possible now
    // check when main without scroll
    lockScroll(main);
    expect(findScrollParentAll(el).map((a) => a.tagName.toLowerCase())).toEqual(["body"]);

    unLockScroll(main);
    lockScroll(main, { x: false }); // for checking scrollLeft
    expect(findScrollParentAll(el).map((a) => a.tagName.toLowerCase())).toEqual(["main", "body"]); // in reality it's impossible but for simlation it's ok

    // when component with fixed position
    main.style.position = "fixed";
    expect(findScrollParentAll(el).map((a) => a.tagName.toLowerCase())).toEqual(["main"]);
  });
});
